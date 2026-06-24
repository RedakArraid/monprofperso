import express from "express";
import cors from "cors";
import { api } from "./routes";
import { waitForDb } from "./db";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "monprofperso-api" }));
app.use("/api", api);

const PORT = Number(process.env.PORT ?? 8099);

waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Mon Prof Perso API à l'écoute sur le port ${PORT}`));
  })
  .catch((e) => {
    console.error("Démarrage impossible :", e);
    process.exit(1);
  });
