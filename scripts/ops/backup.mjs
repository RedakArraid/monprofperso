import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { assertReleaseEnv, atomicJson, composeArguments, environment, exists, invariant, json, loadEnv, loadComposeEnv, lock, repository, run, sha, waitFor } from "./common.mjs";

export function validateBackupDestination(env, localTest) {
  invariant(env.RESTIC_REPOSITORY, "RESTIC_REPOSITORY requis.", 64);
  invariant(env.RESTIC_PASSWORD_FILE && !env.RESTIC_PASSWORD_COMMAND, "Un RESTIC_PASSWORD_FILE protégé est requis, sans commande de shell.", 64);
  if (!localTest) {
    invariant(/^(s3|sftp|rest|azure|b2|gs|swift):/.test(env.RESTIC_REPOSITORY),
      "La sauvegarde exposée exige un dépôt restic externe ; un chemin local ne constitue pas une copie externe.", 64);
    invariant(!/(?:localhost|127\.0\.0\.1|\[::1\]|example\.(?:invalid|com))/.test(env.RESTIC_REPOSITORY), "Dépôt externe réel requis.", 64);
  }
}

async function context(options, inherited) {
  const localTest = options["local-test"] === true;
  const mode = environment(options.environment ?? inherited.MPP_ENVIRONMENT ?? "prod");
  const stateDir = path.resolve(options["state-dir"] ?? inherited.MPP_STATE_DIR ?? `/srv/monprofperso/state/${mode}`);
  const current = await exists(path.join(stateDir, "current.json")) ? await json(path.join(stateDir, "current.json")) : null;
  const releaseDir = path.resolve(options["release-dir"] || inherited.MPP_RELEASE_DIR || current?.releaseDir || repository);
  const apiDir = path.resolve(options["api-dir"] ?? path.join(releaseDir, "backend/api"));
  const envFile = path.resolve(options["app-env"] ?? inherited.MPP_ENV_FILE ?? path.join(releaseDir, "backend", mode === "prod" ? ".env.production" : ".env.staging"));
  const env = localTest ? await loadEnv(options["app-env"] ?? inherited.MPP_ENV_FILE,inherited) : await loadComposeEnv(envFile,inherited);
  if(!localTest) await assertReleaseEnv(releaseDir,mode,envFile);
  if (localTest) {
    invariant(env.NODE_ENV === "test" && ["localhost", "127.0.0.1", "::1"].includes(env.PGHOST),
      "Le mode local-test est réservé à une base PostgreSQL locale avec NODE_ENV=test.", 64);
  }
  if (!env.RELEASE_SHA && current?.sha) env.RELEASE_SHA = current.sha;
  if (!env.BACKUP_SOURCE_SHA && current?.sha) env.BACKUP_SOURCE_SHA = current.sha;
  const compose = composeArguments(releaseDir, mode, envFile);
  const docker = env.DOCKER_BIN || "docker";
  const restic = env.RESTIC_BIN || "restic";
  async function files(command, directory, extra = []) {
    if (localTest) return run(process.execPath, [path.join(apiDir, "dist/backupFiles.js"), command, directory, ...extra], { env, capture: true });
    return run(docker, [...compose, "run", "--rm", "--no-deps", "--user", `${process.getuid()}:${process.getgid()}`,
      "-v", `${directory}:/backup`, "api", "node", "dist/backupFiles.js", command, "/backup", ...extra], { env, capture: true });
  }
  return { env, mode, localTest, releaseDir, apiDir, envFile, compose, docker, restic, stateDir, files };
}

/** The dump and the object reference list share one PostgreSQL MVCC snapshot. */
export async function backup(options, inherited = process.env) {
  const ctx = await context(options, inherited);
  validateBackupDestination(ctx.env, ctx.localTest);
  await fs.access(ctx.env.RESTIC_PASSWORD_FILE);
  const revision = options.sha ?? ctx.env.RELEASE_SHA;
  if (revision) { sha(revision); ctx.env.RELEASE_SHA = revision; }
  if (options["source-sha"]) { sha(options["source-sha"]); ctx.env.BACKUP_SOURCE_SHA = options["source-sha"]; }
  return lock(path.join(ctx.stateDir, "backup.lock"), async () => {
    const temporaryRoot = path.resolve(ctx.env.BACKUP_TEMP_DIR || (ctx.localTest ? os.tmpdir() : "/var/lib/monprofperso/backup-tmp"));
    invariant(ctx.localTest || !/^\/(?:tmp|var\/tmp)(?:\/|$)/.test(temporaryRoot), "Le backup Docker exige un répertoire partagé hors /tmp et /var/tmp (PrivateTmp systemd).", 64);
    await fs.mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
    const directory = await fs.mkdtemp(path.join(temporaryRoot, "mpp-backup-"));
    await fs.chmod(directory, 0o700);
    const controller = new AbortController();
    const container = `mpp-backup-${process.pid}-${randomUUID().slice(0,8)}`;
    let exporterError, exporterFinished = false;
    const command = ctx.localTest ? process.execPath : ctx.docker;
    const args = ctx.localTest ? [path.join(ctx.apiDir, "dist/backupFiles.js"), "snapshot", directory] :
      [...ctx.compose, "run", "--rm", "--no-deps", "--name", container, "--user", `${process.getuid()}:${process.getgid()}`,
        "-e", `BACKUP_SOURCE_SHA=${ctx.env.BACKUP_SOURCE_SHA || ""}`, "-v", `${directory}:/backup`, "api", "node", "dist/backupFiles.js", "snapshot", "/backup"];
    const exporter = run(command, args, { env: ctx.env, cwd: ctx.apiDir, capture: true, timeout: 3_660_000, signal: controller.signal })
      .then(() => { exporterFinished = true; }).catch(error => { exporterError = error; exporterFinished = true; });
    try {
      await waitFor(async () => {
        if (exporterError) throw exporterError;
        return exists(path.join(directory, "snapshot.txt"));
      }, { timeout: 60_000, message: "L'exporteur n'a pas ouvert son snapshot PostgreSQL." });
      const snapshot = (await fs.readFile(path.join(directory, "snapshot.txt"), "utf8")).trim();
      invariant(/^[0-9A-Fa-f-]+$/.test(snapshot), "Identifiant du snapshot PostgreSQL invalide.");
      const output = await fs.open(path.join(directory, "database.dump"), "wx", 0o600);
      const dumpArgs = ["--format=custom", "--no-owner", "--no-acl", `--snapshot=${snapshot}`];
      try {
        if (ctx.localTest) await run(ctx.env.PG_DUMP_BIN || "pg_dump", dumpArgs, { env: ctx.env, stdout: output.fd, timeout: 3_600_000 });
        else await run(ctx.docker, [...ctx.compose, "exec", "-T", "db", "pg_dump", ...dumpArgs,
          "--username", ctx.env.POSTGRES_USER || "monprofperso", "--dbname", ctx.env.POSTGRES_DB || (ctx.mode === "prod" ? "monprofperso" : "monprofperso_staging")],
        { env: ctx.env, stdout: output.fd, timeout: 3_600_000 });
      } finally { await output.close(); }
      await fs.writeFile(path.join(directory, "database.done"), "complete\n", { mode: 0o600 });
      await exporter;
      if (exporterError) throw exporterError;
      await ctx.files("verify", directory);
      const release = await json(path.join(directory, "release.json"));
      const result = await run(ctx.restic, ["backup", "--json", "--stdin-from-command", "--stdin-filename", "monprofperso.tar",
        "--host", `monprofperso-${ctx.mode}`, "--tag", "monprofperso", "--tag", `env:${ctx.mode}`,
        "--tag", ctx.localTest ? "local-rehearsal" : "external-backup", "--tag", `sha:${revision || "unknown"}`,
        "--", ctx.env.TAR_BIN || "tar", "--create", "--file", "-", "--directory", directory, "database.dump", "release.json", "objects"],
      { env: ctx.env, capture: true, timeout: 3_600_000 });
      const summary = result.stdout.split("\n").filter(Boolean).map(line => JSON.parse(line)).find(line => line.message_type === "summary");
      invariant(summary?.snapshot_id && /^[a-f0-9]{8,64}$/.test(summary.snapshot_id), "Restic n'a pas confirmé une sauvegarde complète.");
      const proof = { completedAt: new Date().toISOString(), snapshotId: summary.snapshot_id, environment: ctx.mode,
        external: !ctx.localTest, sourceRevision: release.sourceRevision, exporterRevision: release.exporterRevision,
        databaseSha256: release.databaseSha256, objectCount: release.objectCount, migrations: release.migrations };
      await atomicJson(ctx.env.BACKUP_STATE_FILE || path.join(ctx.stateDir, "backup-state.json"), proof);
      return proof;
    } finally {
      if (!exporterFinished) controller.abort();
      if (!ctx.localTest && !exporterFinished) await run(ctx.docker, ["rm", "-f", container], { capture: true, allowFailure: true, timeout: 30_000 });
      await exporter;
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
}

// Archives emitted by the backup command have only these regular files and one
// directory. Reject links, extra paths and duplicate entries before extraction.
export async function verifyTar(archive) {
  const handle = await fs.open(archive, "r");
  try {
    const stat = await handle.stat(); let offset = 0; const names = new Set(); let terminated = false;
    while (offset + 512 <= stat.size) {
      const header = Buffer.alloc(512); await handle.read(header, 0, 512, offset);
      if (header.every(byte => byte === 0)) { terminated = true; break; }
      const string = (from, length) => header.subarray(from, from + length).toString("utf8").replace(/\0.*$/s, "");
      const name = string(0, 100), prefix = string(345, 155), type = String.fromCharCode(header[156]);
      invariant(!prefix && ["0", "\0", "5"].includes(type), "Archive contenant un type de fichier interdit.");
      invariant(type === "5" ? name === "objects/" : ["database.dump", "release.json", "objects/manifest.json"].includes(name) || /^objects\/[a-f0-9]{64}$/.test(name),
        "Chemin interdit dans l'archive.");
      invariant(!names.has(name), "Entrée dupliquée dans l'archive."); names.add(name);
      const checksum = parseInt(string(148, 8).trim(), 8);
      const calculated = header.reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0);
      invariant(checksum === calculated, "En-tête tar corrompu.");
      const rawSize = header.subarray(124, 136);
      const size = rawSize[0] & 0x80 ? Number(rawSize.reduce((sum, byte, i) => sum * 256n + BigInt(i ? byte : byte & 0x7f), 0n)) : parseInt(string(124,12).trim() || "0", 8);
      invariant(Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= stat.size, "Taille tar invalide.");
      offset += 512 + Math.ceil(size / 512) * 512;
    }
    invariant(terminated && ["database.dump", "release.json", "objects/manifest.json"].every(name => names.has(name)), "Sauvegarde incomplète.");
    return [...names];
  } finally { await handle.close(); }
}

export async function restoreArchive(options, inherited = process.env) {
  const ctx = await context(options, inherited); validateBackupDestination(ctx.env, ctx.localTest);
  invariant(/^[a-f0-9]{8,64}$/.test(options.snapshot ?? ""), "Identifiant restic explicite requis ; latest est interdit pour une restauration.", 64);
  invariant(options.target, "Répertoire de restauration neuf requis (--target).", 64);
  const target = path.resolve(options.target);
  invariant(!await exists(target), "La cible de restauration existe déjà ; choisir un nouveau répertoire.", 64);
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  const archive = path.join(target, "monprofperso.tar"), file = await fs.open(archive, "wx", 0o600);
  try { await run(ctx.restic, ["dump", options.snapshot, "/monprofperso.tar"], { env: ctx.env, stdout: file.fd, timeout: 3_600_000 }); }
  finally { await file.close(); }
  await verifyTar(archive);
  await run(ctx.env.TAR_BIN || "tar", ["--extract", "--file", archive, "--directory", target, "--no-same-owner", "--no-same-permissions", "--keep-old-files"], { env: ctx.env });
  await ctx.files("verify", target);
  await fs.rm(archive);
  const release = await json(path.join(target, "release.json"));
  const proof = { verifiedAt: new Date().toISOString(), snapshotId: options.snapshot, target, external: !ctx.localTest,
    databaseSha256: release.databaseSha256, objectCount: release.objectCount, sourceRevision: release.sourceRevision };
  await atomicJson(path.join(target, "archive-proof.json"), proof);
  return proof;
}

export async function restoreDatabase(options, inherited = process.env) {
  const ctx = await context(options, inherited);
  invariant(options["confirm-new-database"] === true, "Confirmation --confirm-new-database requise.", 64);
  const target = options["target-database"];
  invariant(/^mpp_restore_[a-z0-9_]{1,40}$/.test(target ?? "") && target !== ctx.env.PGDATABASE && target !== ctx.env.POSTGRES_DB,
    "Cible isolée attendue : mpp_restore_... ; aucune base active n'est restaurée par cet outil.", 64);
  invariant(options["backup-dir"], "Répertoire --backup-dir requis.", 64);
  const directory = path.resolve(options["backup-dir"]); await ctx.files("verify", directory);
  const release = await json(path.join(directory, "release.json"));
  const pgEnv = { ...ctx.env, PGDATABASE: "postgres" };
  const psql = ctx.env.PSQL_BIN || "psql";
  const sql = async (statement, database = "postgres") => {
    const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", statement];
    const result = ctx.localTest ? await run(psql,args,{env:{...pgEnv,PGDATABASE:database},capture:true,timeout:60_000}) :
      await run(ctx.docker,[...ctx.compose,"exec","-T","db","psql","--username",ctx.env.POSTGRES_USER||"monprofperso","--dbname",database,...args],{env:ctx.env,capture:true,timeout:60_000});
    return result.stdout.trim();
  };
  invariant(await sql(`SELECT 1 FROM pg_database WHERE datname='${target}'`) === "", "La base cible existe déjà ; aucune modification effectuée.", 64);
  await sql(`CREATE DATABASE "${target}" TEMPLATE template0`);
  const restoreArgs = ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "--dbname", target];
  if(ctx.localTest) await run(ctx.env.PG_RESTORE_BIN || "pg_restore", [...restoreArgs,path.join(directory,"database.dump")],{env:pgEnv,timeout:3_600_000});
  else {
    const input=await fs.open(path.join(directory,"database.dump"),"r");
    try { await run(ctx.docker,[...ctx.compose,"exec","-T","db","pg_restore","--username",ctx.env.POSTGRES_USER||"monprofperso",...restoreArgs],{env:ctx.env,stdin:input.fd,timeout:3_600_000}); }
    finally { await input.close(); }
  }
  const allowed = new Set(["users", "teachers", "courses", "payments", "transactions", "course_needs", "teacher_applications", "finance_operations"]);
  const counts = {};
  for (const [table, expected] of Object.entries(release.counts ?? {})) {
    invariant(allowed.has(table) && Number.isSafeInteger(expected) && expected >= 0, "Inventaire des tables de sauvegarde invalide.");
    counts[table] = Number(await sql(`SELECT count(*) FROM ${table}`, target));
    invariant(counts[table] === expected, `Le nombre de lignes restaurées diffère : ${table}.`);
  }
  const hasMigrations = await sql("SELECT to_regclass('public.pgmigrations') IS NOT NULL", target);
  const migrations = hasMigrations === "t" ? JSON.parse(await sql("SELECT COALESCE(json_agg(name ORDER BY id),'[]'::json) FROM pgmigrations", target)) : [];
  invariant(JSON.stringify(migrations) === JSON.stringify(release.migrations), "L'historique des migrations restauré diffère.");
  const proof = { restoredAt: new Date().toISOString(), targetDatabase: target, databaseSha256: release.databaseSha256,
    sourceRevision: release.sourceRevision, counts, migrations, objectsRestored: false,
    note: "Base isolée vérifiée. Les objets externes doivent être restaurés séparément dans un bucket vide." };
  await atomicJson(path.join(directory, "database-proof.json"), proof);
  return proof;
}
