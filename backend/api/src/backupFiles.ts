import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { pipeline } from "stream/promises";
import { pool } from "./db";
import { getFileStream, assertEmptyRestoreBucket, restoreExactFile } from "./storage";

interface ObjectEntry { key: string; file: string; sha256: string; size: number }
interface Manifest { version: number; files: ObjectEntry[] }
async function sha256(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

/** Holds one MVCC snapshot for both pg_dump --snapshot and the object-reference list. */
export async function prepareSnapshot(directory: string): Promise<void> {
  await fs.promises.mkdir(path.join(directory, "objects"), { recursive: true, mode: 0o700 });
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await db.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
    await fs.promises.writeFile(path.join(directory, "snapshot.txt"), snapshot, { mode: 0o600 });
    const deadline = Date.now() + 3_600_000;
    while (!fs.existsSync(path.join(directory, "database.done"))) {
      if (Date.now() > deadline) throw new Error("database_dump_timeout");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const sources = [["resources", "storage_key"], ["legal_documents", "storage_key"], ["legal_document_versions", "storage_key"], ["course_needs", "document_key"],
      ["teacher_applications", "id_card_storage_key"], ["teacher_applications", "diploma_storage_key"], ["teacher_applications", "photo_storage_key"]];
    const keys = new Set<string>();
    for (const [table, column] of sources) {
      const exists = (await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2", [table, column])).rowCount;
      if (!exists) continue;
      for (const row of (await db.query(`SELECT DISTINCT ${column} AS key FROM ${table} WHERE ${column} IS NOT NULL`)).rows) keys.add(row.key);
    }
    const manifest: Manifest = { version: 1, files: [] };
    for (const key of keys) {
      const file = createHash("sha256").update(key).digest("hex");
      const destination = path.join(directory, "objects", file);
      await pipeline(await getFileStream(key), fs.createWriteStream(destination, { mode: 0o600 }));
      manifest.files.push({ key, file, sha256: await sha256(destination), size: (await fs.promises.stat(destination)).size });
    }
    await fs.promises.writeFile(path.join(directory, "objects", "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    const hasMigrations = (await db.query("SELECT to_regclass('public.pgmigrations') AS name")).rows[0].name;
    const migrations = hasMigrations ? (await db.query("SELECT name FROM pgmigrations ORDER BY id")).rows.map((row: any) => row.name) : [];
    const counts: Record<string, number> = {};
    for (const table of ["users", "teachers", "courses", "payments", "transactions", "course_needs", "teacher_applications", "finance_operations"]) {
      if ((await db.query("SELECT to_regclass($1) AS name", [table])).rows[0].name)
        counts[table] = Number((await db.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
    }
    await fs.promises.writeFile(path.join(directory, "release.json"), JSON.stringify({ formatVersion: 1, createdAt: new Date().toISOString(),
      exporterRevision: process.env.RELEASE_SHA || null, sourceRevision: process.env.BACKUP_SOURCE_SHA || null,
      databaseSha256: await sha256(path.join(directory, "database.dump")), migrations, counts,
      objectCount: manifest.files.length }, null, 2), { mode: 0o600 });
    await db.query("COMMIT");
    console.log(JSON.stringify({ snapshotPrepared: true, objectCount: manifest.files.length }));
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}

export async function verifyBackup(directory: string): Promise<Manifest> {
  const release = JSON.parse(await fs.promises.readFile(path.join(directory, "release.json"), "utf8"));
  if (release.formatVersion !== 1 || !/^[a-f0-9]{64}$/.test(release.databaseSha256)) throw new Error("invalid_backup_metadata");
  if (await sha256(path.join(directory, "database.dump")) !== release.databaseSha256) throw new Error("database_checksum_mismatch");
  const manifest = JSON.parse(await fs.promises.readFile(path.join(directory, "objects", "manifest.json"), "utf8")) as Manifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== release.objectCount) throw new Error("invalid_object_manifest");
  for (const entry of manifest.files) {
    if (typeof entry.key !== "string" || !entry.key || !/^[a-f0-9]{64}$/.test(entry.file)
      || entry.file !== createHash("sha256").update(entry.key).digest("hex") || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("invalid_object_entry");
    const objectPath = path.join(directory, "objects", entry.file);
    if ((await fs.promises.lstat(objectPath)).isSymbolicLink() || (await fs.promises.stat(objectPath)).size !== entry.size
      || await sha256(objectPath) !== entry.sha256) throw new Error("object_checksum_mismatch");
  }
  return manifest;
}

async function main(): Promise<void> {
  const [command, input, confirmation] = process.argv.slice(2);
  if (!input || !["snapshot", "verify", "restore-objects"].includes(command)) throw new Error("Usage: backupFiles.js snapshot|verify|restore-objects DIRECTORY [--confirm-empty-target]");
  const directory = path.resolve(input);
  if (command === "snapshot") { await prepareSnapshot(directory); return; }
  const manifest = await verifyBackup(directory);
  if (command === "restore-objects") {
    if (confirmation !== "--confirm-empty-target") throw new Error("empty_target_confirmation_required");
    if (manifest.files.length) {
      await assertEmptyRestoreBucket();
      for (const file of manifest.files) await restoreExactFile(file.key, path.join(directory, "objects", file.file));
    }
  }
  console.log(JSON.stringify({ verified: true, objectCount: manifest.files.length, restoredObjects: command === "restore-objects" }));
}
if (require.main === module) main().catch((error) => { console.error(`[backup] ${error instanceof Error ? error.message : "backup_failed"}`); process.exitCode = 1; }).finally(() => pool.end());
