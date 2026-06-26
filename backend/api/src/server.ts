import express from "express";
import cors from "cors";
import path from "path";
import migrate from "node-pg-migrate";
import { api } from "./routes";
import { pool, waitForDb } from "./db";

const app = express();
app.use(cors());
// Limite relevée pour accepter les fichiers de ressources encodés en base64.
app.use(express.json({ limit: "15mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "monprofperso-api" }));
app.use("/api", api);

const PORT = Number(process.env.PORT ?? 8099);

/** Applique les migrations en attente (schéma + seed) au démarrage. */
async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    const applied = await migrate({
      dbClient: client,
      dir: path.join(__dirname, "..", "migrations"),
      direction: "up",
      count: Infinity,
      migrationsTable: "pgmigrations",
    });
    console.log(applied.length ? `Migrations appliquées : ${applied.map((m) => m.name).join(", ")}` : "Base à jour.");
  } finally {
    client.release();
  }
}

waitForDb()
  .then(runMigrations)
  .then(() => {
    app.listen(PORT, () => console.log(`Mon Prof Perso API à l'écoute sur le port ${PORT}`));
  })
  .catch((e) => {
    console.error("Démarrage impossible :", e);
    process.exit(1);
  });
