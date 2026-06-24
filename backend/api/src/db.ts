import { Pool, types } from "pg";

// Postgres renvoie les colonnes NUMERIC sous forme de chaîne par défaut.
// On les parse en nombres JS pour que le JSON soit décodé proprement
// côté iOS (JSONDecoder strict) comme côté Android.
types.setTypeParser(1700, (v: string | null) => (v === null ? null : parseFloat(v)));

export const pool = new Pool({
  host: process.env.PGHOST ?? "db",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "monprofperso",
  password: process.env.PGPASSWORD ?? "monprofperso",
  database: process.env.PGDATABASE ?? "monprofperso",
});

/** Attend que Postgres soit prêt (le conteneur API démarre souvent avant la DB). */
export async function waitForDb(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error("Base de données indisponible après plusieurs tentatives.");
}
