#!/usr/bin/env node
// Rehearsal only: creates two disposable LOCAL databases, no external provider.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomBytes, createHash } from "node:crypto";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { backup, restoreArchive, restoreDatabase } from "../ops/backup.mjs";
import { atomicJson, invariant, loadEnv, parseArguments, repository, run, waitFor } from "../ops/common.mjs";

const options = parseArguments(process.argv.slice(2));
const input = await loadEnv(options.config);
invariant(input.NODE_ENV === "test" && ["127.0.0.1","localhost","::1"].includes(input.PGHOST), "Répétition réservée à PostgreSQL local NODE_ENV=test.", 64);
const work = await fs.mkdtemp(path.join(options["work-dir"] || os.tmpdir(), "mpp-backup-rehearsal-"));
await fs.chmod(work,0o700);
const suffix = Date.now().toString(36);
const source = `mpp_backup_test_${suffix}`, target = `mpp_restore_${suffix}`;
const apiDir = path.join(repository,"backend/api");
const env = { ...input, PGDATABASE: source, DEMO_MODE:"false", PAYSTACK_MOCK:"false", S3_ENDPOINT:"", WORKER_ENABLED:"false", NOTIFICATIONS_ENABLED:"false",
  RELEASE_SHA:"", BACKUP_SOURCE_SHA:"", RESTIC_REPOSITORY:path.join(work,"restic"), RESTIC_PASSWORD_FILE:path.join(work,"password"),
  RESTIC_CACHE_DIR:path.join(work,"cache"), BACKUP_TEMP_DIR:path.join(work,"temporary"), BACKUP_STATE_FILE:path.join(work,"state/backup-state.json") };
await fs.mkdir(env.BACKUP_TEMP_DIR);await fs.writeFile(env.RESTIC_PASSWORD_FILE,randomBytes(32).toString("hex"),{mode:0o600});
const require=createRequire(path.join(apiDir,"package.json"));
const {Pool}=require("pg");
const settings={host:env.PGHOST,port:Number(env.PGPORT),user:env.PGUSER,password:env.PGPASSWORD};
const control=new Pool({...settings,database:"postgres"});
const src=new Pool({...settings,database:source});
let destination;
try {
  await control.query(`CREATE DATABASE "${source}" TEMPLATE template0`);
  await run(process.execPath,["-e","const m=require('./dist/migrations'),d=require('./dist/db');m.applyMigrations().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>d.pool.end())"],{cwd:apiDir,env,capture:true});
  const user=(await src.query("INSERT INTO users(full_name,phone,role) VALUES('Fixture sauvegarde','+2250700998811','parent') RETURNING id")).rows[0].id;
  const original=Buffer.from([0,1,2,127,128,255,0,17]);
  const resource=(await src.query("INSERT INTO resources(type,title,file_name,mime_type,size_bytes,content,created_by) VALUES('course','Fixture BYTEA','fixture.bin','application/octet-stream',$1,$2,$3) RETURNING id",[original.length,original,user])).rows[0].id;
  for(const [version,text] of [["fixture-v1","Ancien PDF"],["fixture-v2","PDF actuel"]]){
    const pdf=Buffer.from(`%PDF-1.4\n${text}\n%%EOF`);
    await src.query("UPDATE legal_documents SET version=$1,content=$2,file_name='fixture.pdf',mime_type='application/pdf',size_bytes=$3,updated_by=$4 WHERE slug='cgu'",[version,pdf,pdf.length,user]);
  }
  const usersAtSnapshot=(await src.query("SELECT count(*)::int AS n FROM users")).rows[0].n;
  await run(env.RESTIC_BIN||"restic",["init"],{env,capture:true});
  const realDump=env.PG_DUMP_BIN||"pg_dump";
  const started=path.join(work,"dump-started"),proceed=path.join(work,"dump-proceed");
  const wrapper=path.join(work,"pg-dump-wrapper.mjs");
  await fs.writeFile(wrapper,`#!${process.execPath}\nimport fs from 'node:fs/promises';import{spawn}from'node:child_process';\nawait fs.writeFile(${JSON.stringify(started)},'ready');\nlet ready=false;for(let i=0;i<6000;i++){try{await fs.access(${JSON.stringify(proceed)});ready=true;break}catch{}await new Promise(r=>setTimeout(r,10));}if(!ready)throw new Error('rehearsal_barrier_timeout');\nconst p=spawn(${JSON.stringify(realDump)},process.argv.slice(2),{env:process.env,stdio:'inherit',shell:false});p.on('error',()=>process.exit(1));p.on('exit',code=>process.exit(code??1));\n`,{mode:0o700});
  const args={environment:"staging","local-test":true,"api-dir":apiDir,"state-dir":path.join(work,"state")};
  let backupError;
  const running=backup(args,{...env,PG_DUMP_BIN:wrapper}).catch(error=>{backupError=error;throw error;});
  running.catch(()=>{});
  await waitFor(async()=>{if(backupError)throw backupError;try{await fs.access(started);return true}catch{return false}}, {timeout:60_000});
  // This commit is deliberately AFTER pg_export_snapshot and BEFORE pg_dump.
  await src.query("UPDATE resources SET content=$1,size_bytes=$2 WHERE id=$3",[Buffer.from("AFTER SNAPSHOT"),14,resource]);
  await src.query("INSERT INTO users(full_name,phone,role) VALUES('Fixture après snapshot','+2250700998822','parent')");
  await fs.writeFile(proceed,"continue");
  const backedUp=await running;
  assert.equal(backedUp.external,false);
  await run(env.RESTIC_BIN||"restic",["check","--read-data"],{env,capture:true});
  const extracted=await restoreArchive({...args,snapshot:backedUp.snapshotId,target:path.join(work,"restored")},env);
  const restored=await restoreDatabase({...args,"backup-dir":extracted.target,"target-database":target,"confirm-new-database":true},env);
  destination=new Pool({...settings,database:target});
  const content=(await destination.query("SELECT content FROM resources WHERE id=$1",[resource])).rows[0].content;
  assert.deepEqual(content,original,"le dump doit conserver les octets du snapshot antérieur à la modification");
  assert.equal((await destination.query("SELECT count(*)::int AS n FROM users")).rows[0].n,usersAtSnapshot);
  assert.equal((await src.query("SELECT count(*)::int AS n FROM users")).rows[0].n,usersAtSnapshot+1);
  assert.equal((await destination.query("SELECT count(*)::int AS n FROM legal_document_versions WHERE slug='cgu'")).rows[0].n,2);
  const proof={ok:true,external:false,realMoneyMoved:false,createdAt:new Date().toISOString(),sourceDatabase:source,targetDatabase:target,
    snapshotId:backedUp.snapshotId,databaseSha256:restored.databaseSha256,byteaSha256:createHash("sha256").update(content).digest("hex"),
    mvccSnapshotConsistent:true,sourceUsersAfterSnapshot:usersAtSnapshot+1,restoredUsersAtSnapshot:usersAtSnapshot,legalVersions:2,migrations:restored.migrations.length,
    resticReadDataVerified:true,objectCount:backedUp.objectCount,workDirectory:work};
  await atomicJson(path.join(work,"rehearsal-proof.json"),proof);console.log(JSON.stringify(proof,null,2));
} finally {
  await src.end();await destination?.end();
  // Only the two databases created by this invocation have these names.
  await control.query(`DROP DATABASE IF EXISTS "${target}"`).catch(()=>{});
  await control.query(`DROP DATABASE IF EXISTS "${source}"`).catch(()=>{});
  await control.end();
}
