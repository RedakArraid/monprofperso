import path from "path";
import migrate from "node-pg-migrate";
import type { Pool, PoolClient } from "pg";
import { pool } from "./db";
import { isDemoMode } from "./auth";

/** One connection carries the explicit fixture flag through every migration. */
export async function applyMigrations(database: Pick<Pool, "connect"> = pool): Promise<void> {
  const client = await database.connect();
  try {
    await client.query("SELECT set_config('mpp.demo_seed',$1,false)", [String(isDemoMode())]);
    const applied = await migrate({
      dbClient: client as PoolClient,
      dir: path.join(__dirname, "..", "migrations"),
      direction: "up", count: Infinity, migrationsTable: "pgmigrations",
    });
    console.log(applied.length ? `${applied.length} migration(s) appliquée(s).` : "Base à jour.");
  } finally {
    await client.query("RESET mpp.demo_seed").catch(() => {});
    client.release();
  }
}
