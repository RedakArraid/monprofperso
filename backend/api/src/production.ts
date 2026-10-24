import { Router, type Request, type Response, type NextFunction } from "express";
import { createHmac } from "crypto";
import { pool } from "./db";
import { currentUserId, requireAdmin, requireRecentAuth, isDemoMode, normalizeAuthPhone } from "./auth";
import { getOtpChannels, loadOtpSettings } from "./otp";
import { currentConsentVersion } from "./consent";

export const OPERATION_SETTINGS = ["company_name", "registration_number", "company_address", "privacy_email",
  "hosting_location", "retention_policy", "cancellation_policy", "refund_policy", "payout_policy"] as const;
const VALIDATION_KEYS = ["data_review", "provider_e2e", "backup_restore", "monitoring", "legal_review"] as const;
const VALIDATION_TITLES: Record<string, string> = {
  data_review: "Revue des données réelles et de l'historique",
  provider_e2e: "Recette OTP, paiement, remboursement et reversement",
  backup_restore: "Sauvegarde externe et restauration répétée",
  monitoring: "Alertes et prise en charge des incidents",
  legal_review: "Documents, règles commerciales et données personnelles validés",
};

export function capabilities() {
  return {
    individualCourses: true, needs: true, courseOperations: true, groups: false, subscriptions: false,
    messaging: false, onlineCourses: process.env.ONLINE_COURSES_ENABLED === "true", integratedVideo: false,
    agenda: true, reviews: true, progress: true, referrals: false, payouts: true,
    accountDeletion: true, accountExport: true,
  };
}

export async function operationSettings(): Promise<Record<string, string>> {
  const rows = (await pool.query("SELECT key,value FROM app_settings WHERE key=ANY($1::text[])", [OPERATION_SETTINGS.map((k) => `operations_${k}`)])).rows;
  const out: Record<string, string> = {};
  for (const key of OPERATION_SETTINGS) out[key] = rows.find((r: any) => r.key === `operations_${key}`)?.value ?? "";
  return out;
}

/** These signatures identify shipped fixtures, never authorize automatic deletion. */
export async function auditProductionData() {
  const accounts = (await pool.query(`SELECT id FROM users WHERE deleted_at IS NULL AND (
    (phone='+2250758421903' AND full_name='Aya Koné') OR
    (phone='+2250707001234' AND full_name='Koffi N''Guessan') OR
    (phone='+2250705001122' AND full_name='Ibrahim Diallo') OR phone='+2250700000001') ORDER BY id`)).rows;
  const teachers = (await pool.query(`SELECT id FROM teachers WHERE archived_at IS NULL AND (
    (name='Koffi N''Guessan' AND reviews_count=128) OR (name='Ibrahim Diallo' AND reviews_count=210)
    OR (name='Adjoua Yao' AND reviews_count=88) OR (name='Mariam Touré' AND reviews_count=74)) ORDER BY id`)).rows;
  const reviews = (await pool.query(`SELECT id FROM reviews WHERE course_id IS NULL AND
    author_name IN ('Fatou B.','Konan A.') AND time_ago IN ('il y a 2 semaines','il y a 1 mois') ORDER BY id`)).rows;
  const unknownPayments = Number((await pool.query(`SELECT count(*) FROM courses c WHERE c.payment_status='paid'
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.course_id=c.id AND p.status='success'
      AND p.funds_verified_at IS NOT NULL AND p.verification_source='provider')`)).rows[0].count);
  const origin = (await pool.query("SELECT value FROM installation_metadata WHERE key='data_origin'")).rows[0]?.value ?? "legacy";
  return { origin, demoAccountIds: accounts.map((r: any) => r.id), demoTeacherIds: teachers.map((r: any) => r.id),
    demoReviewIds: reviews.map((r: any) => r.id), unverifiedPaidCourses: unknownPayments,
    clean: accounts.length === 0 && teachers.length === 0 && reviews.length === 0 && unknownPayments === 0 };
}

interface Check { key: string; title: string; ok: boolean; detail: string; kind: "configuration" | "operator_evidence" | "runtime" }
export interface Readiness { ready: boolean; launchEnabled: boolean; environment: string; revision: string; checks: Check[]; validations: any[] }
let cached: { expires: number; value: Readiness } | undefined;
export function invalidateReadiness(): void { cached = undefined; }
const meaningful = (value: string) => value.trim().length >= 3 && !/⟨|⟩|GENERER_|à compléter|<[^>]+>|example\.(com|invalid)/i.test(value);

/** Bind operator evidence to effective configuration without returning its secrets.
 * SERVICE_OPEN is deliberately excluded: opening a validated release changes no provider.
 */
export async function configurationFingerprint(): Promise<string> {
  const keys = ["NODE_ENV", "APP_ENV", "DEMO_MODE", "PAYSTACK_MOCK", "PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY",
    "PUBLIC_WEB_URL", "CORS_ALLOWED_ORIGINS", "TRUST_PROXY", "ONLINE_COURSES_ENABLED", "WORKER_ENABLED",
    "NOTIFICATIONS_ENABLED", "S3_ENDPOINT", "S3_PORT", "S3_USE_SSL", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET",
    "PGHOST", "PGPORT", "PGUSER", "PGDATABASE"];
  const settings = (await pool.query(`SELECT key,value FROM app_settings WHERE key=ANY($1::text[]) ORDER BY key`,
    [["commission_pct", "contact_email", "contact_phone", ...OPERATION_SETTINGS.map((key) => `operations_${key}`)]])).rows;
  const legal = (await pool.query("SELECT slug,revision_id FROM legal_documents ORDER BY slug")).rows;
  const otp = Object.entries(await loadOtpSettings()).sort(([a], [b]) => a.localeCompare(b));
  return createHmac("sha256", process.env.JWT_SECRET || "local-configuration-tests")
    .update(JSON.stringify({ env: keys.map((key) => [key, process.env[key] ?? ""]), settings, legal, otp })).digest("hex");
}

export async function productionReadiness(useCache = false): Promise<Readiness> {
  if (useCache && cached && cached.expires > Date.now()) return cached.value;
  const environment = process.env.APP_ENV || "local";
  const revision = process.env.RELEASE_SHA || "unversioned";
  const checks: Check[] = [];
  const add = (key: string, title: string, ok: boolean, detail: string, kind: Check["kind"] = "configuration") =>
    checks.push({ key, title, ok, detail, kind });
  const settings = Object.fromEntries((await pool.query("SELECT key,value FROM app_settings")).rows.map((r: any) => [r.key, r.value]));
  const legal = (await pool.query(`SELECT slug,version,(content IS NOT NULL OR storage_key IS NOT NULL) AS available
    FROM legal_documents WHERE slug IN ('cgu','confidentialite','mentions-legales')`)).rows;
  const otp = await getOtpChannels(); const otpSettings = await loadOtpSettings();
  const data = await auditProductionData();
  const operations = await operationSettings();
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  add("environment", "Environnement sans simulation", process.env.NODE_ENV === "production"
    && ["staging", "production"].includes(environment) && process.env.DEMO_MODE !== "true" && process.env.PAYSTACK_MOCK !== "true",
  "NODE_ENV=production ; environnements staging/production séparés ; aucune démo ni simulation de paiement.");
  add("revision", "Révision de livraison identifiée", /^[a-f0-9]{40}$/.test(revision), "RELEASE_SHA doit contenir le SHA complet de la révision livrée.");
  add("data", "Données de production", data.clean && data.origin !== "demo",
    data.clean ? "Aucune signature connue de démonstration ni cours payé sans preuve fournisseur détecté." :
      `${data.demoAccountIds.length} compte(s), ${data.demoTeacherIds.length} professeur(s), ${data.demoReviewIds.length} avis de démo ; ${data.unverifiedPaidCourses} cours payé(s) sans preuve fournisseur.`);
  add("otp", "Authentification par téléphone configurée", otp.enabled && otp.whatsapp && !otp.demo
    && Boolean(otpSettings.otp_whatsapp_api_key.trim()), "La configuration est contrôlée ici ; la réception réelle doit être attestée lors de la recette.");
  add("notifications", "Alertes de cours et paiement activées", process.env.NOTIFICATIONS_ENABLED === "true",
    "Activer les alertes transactionnelles après la recette fournisseur ; les préférences des comptes sont respectées.");
  add("payment", "Clé Paystack de l'environnement", environment === "production" ? /^sk_live_.{10,}$/.test(secret) : /^sk_test_.{10,}$/.test(secret),
    "La clé n'est jamais renvoyée. La preuve de fonctionnement appartient à la recette prestataire.");
  add("proxy", "Reverse proxies identifiés", Boolean(process.env.TRUST_PROXY?.trim())
    && !(process.env.TRUST_PROXY ?? "").split(",").some((value) => /^(true|\*|0\.0\.0\.0\/0|::\/0)$/i.test(value.trim())),
    "Configurer les adresses ou CIDR exacts des proxies de confiance.");
  add("support", "Support joignable publié", meaningful(settings.contact_email ?? "") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email ?? "")
    && /^\+?[0-9\s().-]{8,25}$/.test(settings.contact_phone ?? ""), "Renseigner l'e-mail et le téléphone de support réels.");
  add("legal_documents", "Trois documents légaux publiés", legal.length === 3 && legal.every((r: any) => r.available && meaningful(r.version ?? "")),
    "CGU, confidentialité et mentions légales doivent disposer d'un fichier et d'une version.");
  const missing = OPERATION_SETTINGS.filter((key) => !meaningful(operations[key]));
  add("operating_policies", "Exploitant, hébergement et règles commerciales", missing.length === 0,
    missing.length ? `Champs à compléter : ${missing.join(", ")}.` : "Informations renseignées ; leur validation est une décision de l'exploitant.");
  const catalog = Number((await pool.query(`SELECT count(*) FROM teachers t WHERE t.archived_at IS NULL AND t.verified=true AND t.price_per_hour>0
    AND EXISTS(SELECT 1 FROM users u WHERE u.teacher_id=t.id AND u.role='teacher' AND u.deleted_at IS NULL)`)).rows[0].count);
  add("catalog", "Catalogue réel prêt", catalog > 0, "Au moins un professeur vérifié avec un tarif valide ; contrôle humain documenté dans la revue des données.");
  const worker = (await pool.query("SELECT last_success_at,last_error FROM worker_heartbeats WHERE worker='operations'")).rows[0];
  add("worker", "Réconciliation et tâches périodiques", Boolean(worker?.last_success_at) && !worker.last_error
    && Date.now() - new Date(worker.last_success_at).getTime() < 5 * 60_000, "Un cycle réussi doit dater de moins de cinq minutes.", "runtime");
  const cleanupFailures = Number((await pool.query("SELECT count(*) FROM storage_deletion_queue WHERE attempts>=3")).rows[0].count);
  add("privacy_cleanup", "Retrait des fichiers personnels", cleanupFailures === 0, `${cleanupFailures} suppression(s) de fichier à reprendre après plusieurs échecs.`, "runtime");
  const fingerprint = await configurationFingerprint();
  const rows = (await pool.query("SELECT check_key,evidence,revision,configuration_hash,validated_at,validated_by FROM production_checks ORDER BY check_key")).rows;
  const validations = rows.map(({ configuration_hash, ...row }: any) => ({ ...row, configurationCurrent: configuration_hash === fingerprint }));
  for (const key of VALIDATION_KEYS) {
    const row = validations.find((r: any) => r.check_key === key);
    const valid = Boolean(row && row.revision === revision && row.configurationCurrent);
    add(key, VALIDATION_TITLES[key], valid,
      valid ? `Validation déclarée par l'exploitant le ${new Date(row.validated_at).toISOString()}.`
        : "Consigner une preuve de vérification pour cette révision et la configuration actuelle.", "operator_evidence");
  }
  const result = { ready: checks.every((c) => c.ok), launchEnabled: process.env.SERVICE_OPEN === "true", environment, revision, checks, validations };
  cached = { expires: Date.now() + 5_000, value: result };
  return result;
}

/** Admin/login/account closure remain available while opening the service is blocked. */
export async function launchGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (process.env.NODE_ENV !== "production" || req.method !== "POST") { next(); return; }
  const path = req.path.toLowerCase().replace(/\/$/, "");
  if (!["/auth/signup", "/bookings", "/needs", "/needs/public", "/teacher-applications", "/payments/charge-mobile"].includes(path)) { next(); return; }
  try {
    if (res.locals.userId && ["/bookings", "/needs", "/payments/charge-mobile"].includes(path)) {
      const user = (await pool.query("SELECT consent_version,consent_at FROM users WHERE id=$1 AND deleted_at IS NULL", [res.locals.userId])).rows[0];
      if (!user?.consent_at || user.consent_version !== await currentConsentVersion()) {
        res.status(409).json({ error: "consent_required", message: "Les conditions ont été mises à jour. Relisez-les et acceptez-les dans les paramètres de votre compte avant de continuer." }); return;
      }
    }
    // A restricted rehearsal is possible before the operator attests the results.
    // This grants no session: signup still requires a successful OTP proof.
    if (await isLaunchTester(req, res)) { next(); return; }
    const report = await productionReadiness(true);
    if (!report.launchEnabled || !report.ready) {
      res.status(503).json({ error: "service_not_open", message: "Les nouvelles inscriptions et réservations sont temporairement indisponibles. Les comptes existants et le support restent accessibles." }); return;
    }
    next();
  } catch (error) { next(error); }
}

async function isLaunchTester(req: Request, res: Response): Promise<boolean> {
  const configured = (process.env.LAUNCH_TEST_PHONES ?? "").split(",").map((v) => v.trim()).filter((v) => /^\+[1-9][0-9]{7,14}$/.test(v));
  if (!configured.length) return false;
  if (res.locals.userId) {
    const row = (await pool.query("SELECT phone FROM users WHERE id=$1 AND deleted_at IS NULL", [res.locals.userId])).rows[0];
    return Boolean(row && configured.includes(normalizeAuthPhone(row.phone)));
  }
  return ["/auth/signup", "/teacher-applications"].includes(req.path.toLowerCase().replace(/\/$/, ""))
    && typeof req.body?.phone === "string" && configured.includes(normalizeAuthPhone(req.body.phone));
}

/** Persistent IP quotas are checked before parsing large public form uploads. */
export async function limitPublicForms(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== "POST" || (process.env.NODE_ENV !== "production" && process.env.PUBLIC_FORM_RATE_LIMIT_ENABLED !== "true")) { next(); return; }
  const purpose = req.path.toLowerCase().replace(/\/$/, "");
  if (!["/api/teacher-applications", "/api/needs/public"].includes(purpose)) { next(); return; }
  const windowMs = 10 * 60_000, windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const ipHash = createHmac("sha256", process.env.JWT_SECRET || "local-quota-tests")
    .update(`public-forms:${req.ip || req.socket.remoteAddress || "unknown"}`).digest("hex");
  try {
    const count = Number((await pool.query(`INSERT INTO public_form_quotas(ip_hash,purpose,window_start,count)
      VALUES($1,$2,$3,1) ON CONFLICT(ip_hash,purpose,window_start)
      DO UPDATE SET count=LEAST(public_form_quotas.count+1,1000000) RETURNING count`, [ipHash, purpose, new Date(windowStart)])).rows[0].count);
    if (count > 5) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000))));
      res.status(429).json({ error: "too_many_requests", message: "Trop de demandes. Réessayez dans quelques minutes ou contactez le support." }); return;
    }
    next();
  } catch (error) { next(error); }
}

export const productionRouter = Router();
const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store"); fn(req, res).catch(next);
};
productionRouter.get("/capabilities", wrap(async (req, res) => {
  const serviceOpen = process.env.NODE_ENV !== "production" ? true :
    process.env.SERVICE_OPEN === "true" && (await productionReadiness(true)).ready;
  res.json({ ...capabilities(), serviceOpen: serviceOpen || await isLaunchTester(req, res), demo: isDemoMode() });
}));
productionRouter.get("/service-information", wrap(async (_req, res) => { res.json(await operationSettings()); }));
productionRouter.get("/admin/operations-settings", requireAdmin, wrap(async (_req, res) => { res.json(await operationSettings()); }));
productionRouter.put("/admin/operations-settings", requireAdmin, wrap(async (req, res) => {
  for (const key of OPERATION_SETTINGS) {
    const value = req.body?.[key];
    if (value !== undefined && (typeof value !== "string" || value.length > 4000)) {
      res.status(400).json({ error: "validation_error", field: key, message: "Texte de 4000 caractères maximum requis." }); return;
    }
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    let changed = false;
    for (const key of OPERATION_SETTINGS) if (req.body?.[key] !== undefined) {
      const result = await db.query(`INSERT INTO app_settings(key,value,updated_by)
      VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=now()
      WHERE app_settings.value IS DISTINCT FROM EXCLUDED.value`,
    [`operations_${key}`, req.body[key].trim(), currentUserId(res)]);
      changed ||= Boolean(result.rowCount);
    }
    if (changed) await db.query("DELETE FROM production_checks WHERE check_key IN ('legal_review','provider_e2e')");
    await db.query("COMMIT"); invalidateReadiness();
    res.json(await operationSettings());
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));
productionRouter.get("/admin/production-readiness", requireAdmin, wrap(async (_req, res) => { res.json(await productionReadiness()); }));
productionRouter.get("/admin/production-data-audit", requireAdmin, wrap(async (_req, res) => { res.json(await auditProductionData()); }));
productionRouter.post("/admin/production-checks/:key", requireAdmin, requireRecentAuth, wrap(async (req, res) => {
  const key = String(req.params.key), evidence = req.body?.evidence;
  if (!VALIDATION_KEYS.includes(key as any) || typeof evidence !== "string" || evidence.trim().length < 20 || evidence.length > 4000) {
    res.status(400).json({ error: "validation_error", message: "Une preuve de vérification de 20 à 4000 caractères est requise." }); return;
  }
  const revision = process.env.RELEASE_SHA || "unversioned";
  if (!/^[a-f0-9]{40}$/.test(revision)) { res.status(409).json({ error: "revision_required", message: "La révision RELEASE_SHA n'est pas configurée." }); return; }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    if (key === "data_review") {
      const audit = await auditProductionData();
      if (!audit.clean) { await db.query("ROLLBACK"); res.status(409).json({ error: "data_review_blocked", message: "Résolvez les données de démonstration et paiements historiques non attestés avant validation.", audit }); return; }
      await db.query("UPDATE installation_metadata SET value='reviewed' WHERE key='data_origin'");
    }
    const fingerprint = await configurationFingerprint();
    await db.query(`INSERT INTO production_checks(check_key,evidence,revision,validated_by,configuration_hash) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(check_key) DO UPDATE SET evidence=EXCLUDED.evidence,revision=EXCLUDED.revision,
      configuration_hash=EXCLUDED.configuration_hash,validated_by=EXCLUDED.validated_by,validated_at=now()`,
    [key, evidence.trim(), revision, currentUserId(res), fingerprint]);
    await db.query("COMMIT"); invalidateReadiness();
    res.json(await productionReadiness());
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));
