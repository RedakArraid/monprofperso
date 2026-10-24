import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { parseEnv, parseComposeEnv, repository, lock } from "../ops/common.mjs";
import { checkCi, REQUIRED_JOBS, validateCiRun } from "../ops/ci.mjs";
import { requireSameSchema } from "../ops/deploy.mjs";
import { validateBackupDestination, verifyTar } from "../ops/backup.mjs";
import { smoke } from "../ops/smoke.mjs";
import { monitor } from "../ops/monitor.mjs";

const revision = "a".repeat(40);
const green = { id: 1, head_sha: revision, path: ".github/workflows/ci.yml", status: "completed", conclusion: "success" };
const jobs = REQUIRED_JOBS.map((name,id) => ({ id, name, head_sha: revision, status: "completed", conclusion: "success" }));

test("configuration : dotenv littéral, aucune substitution de commande et héritage limité", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mpp-env-test-"));
  try {
    const marker = path.join(folder,"must-not-exist");
    const value = `$(touch ${marker}) $HOME \`echo interdit\``;
    assert.equal(parseEnv(`LITERAL='${value}'\nHASH='a#b'\nEMPTY=\n`).LITERAL, value);
    assert.equal(parseEnv("HASH='a#b' # commentaire\n").HASH, "a#b");
    assert.throws(() => parseEnv("NODE_OPTIONS=--require=/tmp/payload.js"));
    const config = path.join(folder,"input.env"); await fs.writeFile(config, `LITERAL='${value}'\n`);
    const result = spawnSync(process.execPath, [path.join(repository,"scripts/run-env.mjs"), config, "--", process.execPath, "-e", "process.stdout.write(process.env.LITERAL)"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, value);
    await assert.rejects(fs.access(marker), { code: "ENOENT" });
  } finally { await fs.rm(folder,{recursive:true,force:true}); }
});

test("CI : SHA exact, workflow attendu et quatre jobs réellement réussis sont obligatoires", () => {
  assert.equal(validateCiRun(revision,green,jobs).sha, revision);
  for (const [run, entries] of [
    [{...green,head_sha:"b".repeat(40)},jobs], [{...green,status:"in_progress"},jobs],
    [{...green,path:".github/workflows/other.yml"},jobs], [green,jobs.slice(1)],
    [green,[...jobs.slice(0,3),{...jobs[3],conclusion:"skipped"}]], [green,[...jobs.slice(0,3),jobs[0]]],
  ]) assert.throws(() => validateCiRun(revision,run,entries), {exitCode:65});
});

test("configuration Docker : les formes réinterprétées par Compose sont refusées avant livraison", () => {
  assert.throws(()=>parseComposeEnv('OTP_WHATSAPP_API_KEY="abc$TOKEN"'),{exitCode:64});
  assert.throws(()=>parseComposeEnv('OTP_SMTP_PASS="abc\\nxyz"'),{exitCode:64});
  assert.throws(()=>parseComposeEnv('OTP_WHATSAPP_API_KEY=abc$TOKEN'),{exitCode:64});
  assert.equal(parseComposeEnv("OTP_WHATSAPP_API_KEY='abc$TOKEN'").OTP_WHATSAPP_API_KEY,"abc$TOKEN");
  assert.equal(parseComposeEnv("OTP_SMTP_PASS='abc\\nxyz'").OTP_SMTP_PASS,"abc\\nxyz");
  assert.equal(parseComposeEnv("OTP_SMTP_PASS='abc\\\\xyz'").OTP_SMTP_PASS,"abc\\\\xyz");
});

test("CI : un ancien run vert ne masque pas une relance plus récente en cours", async () => {
  const command = async (_command,args) => ({stdout:JSON.stringify(args.at(-1).includes("/jobs") ? {total_count:4,jobs} : {workflow_runs:[
    {...green,run_number:1}, {...green,id:2,run_number:2,status:"in_progress",conclusion:null} ]})});
  await assert.rejects(checkCi(revision,{command}), {exitCode:65});
});

test("CLI : SHA abrégé ou manquant et options inconnues échouent avant tout Git/Docker", () => {
  for (const args of [["deploy","--environment","prod","--sha","abc","--confirm","--app-env","/does/not/exist"],
    ["ci-check","--sha","latest"], ["ci-check","--sha",revision,"--skip-ci"]]) {
    const result = spawnSync(process.execPath,[path.join(repository,"scripts/operations.mjs"),...args],{encoding:"utf8"});
    assert.equal(result.status,64,result.stderr);
    assert.doesNotMatch(result.stderr,/ENOENT.*docker|fatal:.*git/i);
  }
});

test("retour code : tout écart de migrations bloque avec un code explicite", () => {
  requireSameSchema(["001","002"],["001","002"]);
  assert.throws(() => requireSameSchema(["001","002","003"],["001","002"]), {exitCode:78});
  assert.throws(() => requireSameSchema(["002","001"],["001","002"]), {exitCode:78});
});

test("sauvegarde : dépôt local interdit en exploitation, preuve locale explicitement distincte", () => {
  const env = {RESTIC_REPOSITORY:"/var/backups/mpp",RESTIC_PASSWORD_FILE:"/private/password"};
  assert.throws(() => validateBackupDestination(env,false), {exitCode:64});
  validateBackupDestination(env,true);
  assert.throws(() => validateBackupDestination({...env,RESTIC_REPOSITORY:"s3:https://s3.example.invalid/bucket"},false));
  assert.throws(() => validateBackupDestination({...env,RESTIC_REPOSITORY:"sftp:localhost:/backup"},false));
  validateBackupDestination({...env,RESTIC_REPOSITORY:"s3:https://s3.backups-operator.net/private-bucket"},false);
});

test("restauration : archive incomplète ou contenant un lien refusée avant extraction", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(),"mpp-tar-test-"));
  try {
    await fs.mkdir(path.join(folder,"objects"));
    await fs.writeFile(path.join(folder,"database.dump"),"fixture");
    await fs.writeFile(path.join(folder,"release.json"),"{}");
    const archive = path.join(folder,"archive.tar");
    const tar = names => { const r=spawnSync("tar",["-cf",archive,"-C",folder,...names],{encoding:"utf8"});assert.equal(r.status,0,r.stderr); };
    tar(["database.dump","release.json","objects"]);
    await assert.rejects(verifyTar(archive),/incomplète/);
    await fs.writeFile(path.join(folder,"objects/manifest.json"),"{\"version\":1,\"files\":[]}");
    tar(["database.dump","release.json","objects"]);
    assert.ok((await verifyTar(archive)).includes("database.dump"));
    await fs.symlink("/etc/passwd",path.join(folder,"objects", "b".repeat(64)));
    tar(["database.dump","release.json","objects"]);
    await assert.rejects(verifyTar(archive),/type de fichier interdit/);
  } finally { await fs.rm(folder,{recursive:true,force:true}); }
});

test("manifest : une base modifiée après sauvegarde échoue au contrôle SHA256", async () => {
  const require=createRequire(import.meta.url);
  const {verifyBackup}=require("../../backend/api/dist/backupFiles.js");
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),"mpp-checksum-test-"));
  try {
    await fs.mkdir(path.join(folder,"objects"));
    await fs.writeFile(path.join(folder,"database.dump"),"original");
    await fs.writeFile(path.join(folder,"objects/manifest.json"),JSON.stringify({version:1,files:[]}));
    await fs.writeFile(path.join(folder,"release.json"),JSON.stringify({formatVersion:1,databaseSha256:createHash("sha256").update("original").digest("hex"),objectCount:0}));
    await verifyBackup(folder);
    await fs.writeFile(path.join(folder,"database.dump"),"altéré");
    await assert.rejects(verifyBackup(folder),/database_checksum_mismatch/);
  } finally { await fs.rm(folder,{recursive:true,force:true}); await require("../../backend/api/dist/db.js").pool.end(); }
});

test("verrou d'exploitation : deux sauvegardes/déploiements concurrents ne commencent pas ensemble", async () => {
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),"mpp-lock-test-"));
  let release,entered; const barrier=new Promise(resolve=>{entered=resolve;});
  const pending=lock(path.join(folder,"lock"),async()=>{entered();await new Promise(resolve=>{release=resolve;});});
  await barrier;
  await assert.rejects(lock(path.join(folder,"lock"),async()=>{}),{exitCode:75});
  release();await pending;await fs.rm(folder,{recursive:true,force:true});
});

test("smoke : version fermée vérifiée, readiness indisponible ou mauvais SHA bloquent l'ouverture", async () => {
  let ready=false, responseSha=revision;
  const server=http.createServer((req,res)=>{
    res.setHeader("Content-Type","application/json");
    if(req.url==="/health")return res.end(JSON.stringify({status:"ok"}));
    if(req.url==="/ready"){res.statusCode=ready?200:503;return res.end(JSON.stringify({status:ready?"ready":"not_ready",revision:responseSha}));}
    if(req.url==="/api/auth/otp-channels")return res.end(JSON.stringify({demo:false}));
    if(req.url==="/api/capabilities")return res.end(JSON.stringify({serviceOpen:ready}));
    if(["/api/me","/api/courses","/api/teacher/profile","/api/teacher-applications/status"].includes(req.url))res.statusCode=401;
    if(req.url==="/api/auth/login")res.statusCode=400;
    res.end("{}");
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const web=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await smoke({web,revision,prepared:true,localTest:true})).mode,"prepared_closed");
    await assert.rejects(smoke({web,revision,localTest:true}),{exitCode:69});
    ready=true;assert.equal((await smoke({web,revision,localTest:true})).mode,"live");
    responseSha="b".repeat(40);await assert.rejects(smoke({web,revision,localTest:true}),{exitCode:69});
    const state=await fs.mkdtemp(path.join(os.tmpdir(),"mpp-monitor-test-"));
    try {
      const report=await monitor({environment:"prod",web,"local-test":true,"state-dir":state},{MONITOR_ALERTS_ENABLED:"false"});
      assert.equal(report.ok,false);assert.equal(report.alertSent,false);assert.equal(report.checks.find(c=>c.key==="external_backup").ok,false);
    } finally {await fs.rm(state,{recursive:true,force:true});}
  } finally {await new Promise(resolve=>server.close(resolve));}
});
