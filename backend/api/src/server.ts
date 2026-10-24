import express from "express";
import cors from "cors";
import { applyMigrations } from "./migrations";
import { api } from "./routes";
import { pool, waitForDb } from "./db";
import { requestLogger, notFound, errorHandler } from "./http";
import { ensureBucket } from "./storage";
import { handlePaystackWebhook, validatePaymentConfiguration } from "./payments";
import { bootstrapProductionAdmin } from "./adminBootstrap";
import { productionReadiness, limitPublicForms } from "./production";
import { startOperationsWorker } from "./jobs";

const app = express();
validatePaymentConfiguration();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map((v) => v.trim()));
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || process.env.PUBLIC_WEB_URL || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean));
app.use(cors({ origin(origin, callback) {
  callback(null, !origin || process.env.NODE_ENV !== "production" || allowedOrigins.has(origin));
} }));
app.use((_req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });
app.use(requestLogger);
app.use(limitPublicForms);

// Webhook Paystack : corps brut pour vérification HMAC SHA512.
app.post(
  "/api/payments/paystack/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));
      await handlePaystackWebhook(raw, req.headers["x-paystack-signature"] as string | undefined);
      res.status(200).json({ ok: true });
    } catch (e: any) {
      const code = [400, 401, 503].includes(e?.statusCode) ? e.statusCode : 500;
      if (code === 500) console.error("[POST /api/payments/paystack/webhook]", e);
      res.status(code).json({ error: code === 401 ? "invalid_signature" : "webhook_error" });
    }
  }
);

// Limite relevée pour accepter les fichiers de ressources encodés en base64.
app.use(express.json({ limit: "15mb" }));

app.get("/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", service: "monprofperso-api" }); }
  catch { res.status(503).json({ status: "unavailable", service: "monprofperso-api" }); }
});

app.get("/ready", async (_req, res) => {
  try {
    const readiness = await productionReadiness(true);
    res.setHeader("Cache-Control", "no-store");
    res.status(readiness.ready && readiness.launchEnabled ? 200 : 503).json({
      status: readiness.ready && readiness.launchEnabled ? "ready" : "not_ready", service: "monprofperso-api", revision: readiness.revision,
    });
  } catch { res.status(503).json({ status: "unavailable", service: "monprofperso-api" }); }
});

// api.monprofperso.com sert uniquement l'API : redirige vers le site / admin si ouvert dans le navigateur.
const SITE = process.env.PUBLIC_WEB_URL || "https://www.monprofperso.com";
app.get("/", (req, res, next) => {
  if (String(req.get("host") || "").includes("api.")) {
    res.redirect(302, `${SITE}/admin/`);
    return;
  }
  next();
});
app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
  res.redirect(302, `${SITE}/admin/`);
});

app.use("/api", api);

// Toute autre route -> 404 JSON, puis filet de sécurité pour les erreurs non gérées.
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 8099);

waitForDb()
  .then(() => applyMigrations())
  .then(() => bootstrapProductionAdmin())
  .then(() => ensureBucket())
  .then(() => {
    const stopWorker = startOperationsWorker();
    const server = app.listen(PORT, process.env.HOST ?? "0.0.0.0", () => console.log(`Mon Prof Perso API à l'écoute sur le port ${PORT}`));
    const stop = () => server.close(() => { void stopWorker().then(() => pool.end()).then(() => process.exit(0)); });
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  })
  .catch((e) => {
    console.error("Démarrage impossible :", e);
    process.exit(1);
  });
