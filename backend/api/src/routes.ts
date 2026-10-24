import { Router } from "express";
import { pool } from "./db";
import { ValidationError, optionalString, optionalPhone, optionalEmail, optionalEnum, optionalNumber, requiredString, requiredEnum } from "./validate";
import { optionalAuth, currentUserId, requireAuth, requireTeacher, requireAdmin, isDemoMode, AuthError } from "./auth";
import { registerAuthRoutes } from "./authRoutes";
import { accountRouter } from "./account";
import { productionRouter, launchGate, invalidateReadiness } from "./production";
import { putFile, getFileStream, removeFile } from "./storage";
import { registerTeacherApplicationRoutes } from "./teacherApplications";
import { registerTeacherProfileRoutes, computeProfileCompletion } from "./teacherProfile";
import { registerNeedsRoutes, registerAdminNeedsRoutes, parseDurationHours } from "./needs";
import { registerCourseLifecycleRoutes, progressForUser } from "./courseLifecycle";
import { registerFinanceRoutes, teacherEarnings } from "./finance";
import { actorFromResponse, assertSlotFree, courseEvent, dateLabels, futureDate, requireOnlineEnabled, snapshotCommission, inTransaction, lockCourse } from "./courseOperations";
import {
  loadOtpSettings,
  maskOtpSettings,
  mergeOtpSettingsBody,
  saveOtpSettings,
  runOtpIntegrationTest,
} from "./otp";
import {
  initiateMobileCharge,
  submitPaymentOtp,
  getPaymentStatus,
  PaymentUnavailableError,
  PAYMENT_PROVIDERS,
} from "./payments";

export const api = Router();

// Résout la session vérifiée, sans repli vers un autre compte.
api.use(optionalAuth);
api.use(productionRouter);
api.use(launchGate);
api.use(accountRouter);

const OTP_CHANNELS = ["whatsapp", "email"] as const;

const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) =>
  fn(req, res).catch((e: any) => {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: "validation_error", field: e.field, message: e.message });
      return;
    }
    if (e instanceof AuthError || e instanceof PaymentUnavailableError) {
      res.status(e.statusCode).json({ error: e.code, message: e.message });
      return;
    }
    // Détail consigné côté serveur, jamais renvoyé au client (pas de fuite interne).
    console.error(`[${req.method} ${req.originalUrl}]`, e);
    res.status(500).json({ error: "internal_error", message: "erreur interne" });
  });

// Authentification publique ; toute autre route est privée sauf catalogue explicite.
registerAuthRoutes(api);
const PUBLIC_READ = /^\/(?:subjects|levels|programs|teachers(?:\/[^/]+)?|groups(?:\/[^/]+)?|resources|files\/[^/]+|legal(?:\/[^/]+\/file)?|settings|subscription\/plans)\/?$/;
api.use((req, res, next) => {
  const publicRead = (req.method === "GET" || req.method === "HEAD") && PUBLIC_READ.test(req.path);
  const publicSubmission = req.method === "POST" && ["/needs/public", "/teacher-applications"].includes(req.path.replace(/\/$/, ""));
  if (publicRead || publicSubmission) { next(); return; }
  res.setHeader("Cache-Control", "no-store");
  requireAuth(req, res, next);
});
api.use("/teacher", requireTeacher);

api.get("/me", wrap(async (_req, res) => {
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [currentUserId(res)]);
  res.json(r.rows[0]);
}));

// -------------------------------------------------------------------- Matières
api.get("/subjects", wrap(async (_req, res) => {
  const r = await pool.query("SELECT slug, name, icon, accent FROM subjects ORDER BY id");
  res.json(r.rows);
}));

// -------------------------------------------------------------------- Niveaux
api.get("/levels", wrap(async (_req, res) => {
  const r = await pool.query("SELECT slug, name FROM levels ORDER BY ord, id");
  res.json(r.rows);
}));

// ------------------------------------------------------------------ Programmes
// Programmes scolaires (jusqu'en Terminale) : standard (ivoirien) + français.
api.get("/programs", wrap(async (_req, res) => {
  const r = await pool.query("SELECT slug, name FROM programs ORDER BY ord, id");
  res.json(r.rows);
}));

// --------------------------------------------------------- Paramètres plateforme
// Clés connues (réseaux sociaux + contact) gérées par l'admin et lues
// publiquement (vitrine web + apps). Toute autre clé est ignorée à l'écriture.
const SETTING_KEYS = [
  "social_facebook", "social_instagram", "social_tiktok", "social_whatsapp",
  "social_linkedin", "social_x", "social_youtube", "contact_email", "contact_phone",
  "commission_pct",
] as const;

// Paramètres publics : objet { clé: valeur } (valeurs vides comprises).
api.get("/settings", wrap(async (_req, res) => {
  const r = await pool.query("SELECT key, value FROM app_settings");
  const out: Record<string, string> = {};
  for (const k of SETTING_KEYS) out[k] = "";
  for (const row of r.rows) if (SETTING_KEYS.includes(row.key)) out[row.key] = row.value;
  res.json(out);
}));

// ----------------------------------------------------- Ressources pédagogiques
const RESOURCE_TYPES = ["course", "homework", "exercise"] as const;
const RESOURCE_PROGRAM_OTHER = "other";

function resolveResourceProgram(body: any): string {
  const p = optionalString(body, "program", { max: 80 });
  return (p && p.trim()) ? p.trim() : "standard";
}

// Liste les ressources (métadonnées seulement, sans le contenu du fichier).
api.get("/resources", wrap(async (req, res) => {
  const params: any[] = [];
  const where: string[] = [];
  for (const f of ["type", "level"] as const) {
    if (req.query[f]) { params.push(req.query[f]); where.push(`${f} = $${params.length}`); }
  }
  if (req.query.subject) { params.push(req.query.subject); where.push(`subject_slug = $${params.length}`); }
  const prog = typeof req.query.program === "string" ? req.query.program.trim() : "";
  if (prog === RESOURCE_PROGRAM_OTHER) {
    where.push(`program NOT IN ('standard', 'francais')`);
  } else if (prog) {
    params.push(prog);
    where.push(`program = $${params.length}`);
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(title ILIKE $${params.length} OR COALESCE(description, '') ILIKE $${params.length})`);
  }
  const sql = `SELECT id, type, subject_slug, level, program, title, description,
                      file_name, mime_type, size_bytes, created_at
               FROM resources ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY created_at DESC, id DESC`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

// Télécharge le fichier d'une ressource (flux binaire avec son type MIME).
// Sert un fichier stocké (objet MinIO/S3, sinon repli BYTEA). `row` doit porter
// file_name, mime_type, content, storage_key.
async function serveFile(res: any, row: any): Promise<void> {
  const mime = String(row.mime_type ?? "application/octet-stream").toLowerCase();
  const safeInline = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);
  const fileName = String(row.file_name ?? "fichier").replace(/[^\x20-\x7e]|["\\/]/g, "_").slice(0, 180);
  res.setHeader("Content-Type", safeInline ? mime : "application/octet-stream");
  res.setHeader("Content-Disposition", `${safeInline ? "inline" : "attachment"}; filename="${fileName}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  res.setHeader("Cache-Control", "no-store");
  if (row.storage_key) {
    const stream = await getFileStream(row.storage_key);
    stream.on("error", () => { if (!res.headersSent) res.status(502).json({ error: "storage_error" }); else res.destroy(); });
    stream.pipe(res);
    return;
  }
  res.send(row.content); // repli BYTEA
}

api.get("/files/:id", wrap(async (req, res) => {
  const r = await pool.query(
    "SELECT file_name, mime_type, content, storage_key FROM resources WHERE id=$1",
    [req.params.id]
  );
  const row = r.rows[0];
  if (!row || (!row.content && !row.storage_key)) { res.status(404).json({ error: "not_found" }); return; }
  await serveFile(res, row);
}));

// ------------------------------------------------------------ Documents légaux
// Liste publique des documents légaux (CGU, confidentialité, mentions légales).
api.get("/legal", wrap(async (_req, res) => {
  const r = await pool.query(
    `SELECT slug, title, version, file_name, size_bytes, updated_at,
            (storage_key IS NOT NULL OR content IS NOT NULL) AS "hasFile"
     FROM legal_documents ORDER BY slug`
  );
  res.json(r.rows);
}));

// Téléchargement public du PDF d'un document légal.
api.get("/legal/:slug/file", wrap(async (req, res) => {
  const r = await pool.query(
    "SELECT file_name, mime_type, content, storage_key FROM legal_documents WHERE slug=$1",
    [req.params.slug]
  );
  const row = r.rows[0];
  if (!row || (!row.content && !row.storage_key)) { res.status(404).json({ error: "not_found" }); return; }
  await serveFile(res, row);
}));

// ------------------------------------------------------------------ Professeurs
api.get("/teachers", wrap(async (req, res) => {
  const { format, level } = req.query;
  const params: any[] = [];
  const where: string[] = ["archived_at IS NULL", "verified=TRUE", "EXISTS (SELECT 1 FROM users u WHERE u.teacher_id=teachers.id AND u.role='teacher' AND u.deleted_at IS NULL)",
    "NOT EXISTS (SELECT 1 FROM users u JOIN account_deletion_requests d ON d.user_id=u.id AND d.status='pending' WHERE u.teacher_id=teachers.id)"];
  if (format) { params.push(format); where.push(`$${params.length} = ANY(formats)`); }
  if (level)  { params.push(level);  where.push(`$${params.length} = ANY(levels)`); }
  const sql = `SELECT id, initials, name, subjects, rating, reviews_count, location,
                      price_per_hour, distance_km, accent, verified, special_bepc, formats,
                      programs, negotiable, needs_confirmed
               FROM teachers ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY rating DESC`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

api.get("/teachers/:id", wrap(async (req, res) => {
  const t = await pool.query(`SELECT * FROM teachers WHERE id=$1 AND archived_at IS NULL AND verified=TRUE
    AND EXISTS (SELECT 1 FROM users u WHERE u.teacher_id=teachers.id AND u.role='teacher' AND u.deleted_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM users u JOIN account_deletion_requests d ON d.user_id=u.id AND d.status='pending' WHERE u.teacher_id=teachers.id)`, [req.params.id]);
  if (!t.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const reviews = await pool.query(
    "SELECT author_initials, author_name, rating, time_ago, text FROM reviews WHERE teacher_id=$1 ORDER BY id",
    [req.params.id]
  );
  res.json({ ...t.rows[0], reviews: reviews.rows });
}));

// ------------------------------------------------------------------------ Cours
api.get("/courses", wrap(async (req, res) => {
  const status = req.query.status as string | undefined;
  const teacher = res.locals.userRole === "teacher";
  const params: any[] = [currentUserId(res), teacher ? res.locals.teacherId ?? null : null];
  let sql = `SELECT c.*, u.full_name AS parent_name, ch.name AS student_name,
    CASE WHEN c.user_id=$1 THEN 'parent' ELSE 'teacher' END AS participant_role
    FROM courses c JOIN users u ON u.id=c.user_id
    LEFT JOIN course_needs n ON n.course_id=c.id
    LEFT JOIN children ch ON ch.id=n.child_id
    WHERE (c.user_id=$1 OR (c.teacher_id=$2::int AND c.accepted=TRUE))`;
  if (status) { params.push(status); sql += ` AND c.status=$${params.length}`; }
  sql += " ORDER BY c.starts_at NULLS LAST,c.id";
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

api.post("/bookings", wrap(async (req, res) => {
  const b = req.body ?? {};
  const teacherId = optionalNumber(b, "teacherId", { min: 1 });
  if (!Number.isSafeInteger(teacherId)) throw new ValidationError("teacherId", "professeur requis");
  // Champ historique accepté/validé mais jamais utilisé comme autorité de prix.
  optionalNumber(b, "price", { min: 0 });
  const format = optionalEnum(b, "format", ["home", "online"]) ?? "home";
  requireOnlineEnabled(format);
  const subject = optionalString(b, "subject", { max: 80 });
  const level = optionalString(b, "level", { max: 40 }) ?? "Non précisé";
  const location = optionalString(b, "location", { max: 200 });
  const privateAddress = optionalString(b, "privateAddress", { max: 1000 });
  const duration = optionalString(b, "duration", { max: 20 }) ?? "1h30";
  const minutes = Math.round(parseDurationHours(duration) * 60);
  const startAt = optionalString(b, "startAt", { max: 40 });
  if (!startAt && !isDemoMode()) throw new ValidationError("startAt", "date et heure du cours requises");
  const startsAt = futureDate(startAt ?? new Date(Date.now() + 86_400_000).toISOString());
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = (await client.query("SELECT id,teacher_id FROM users WHERE id=$1 AND deleted_at IS NULL FOR SHARE", [currentUserId(res)])).rows[0];
    if (!user) throw new AuthError(401, "account_unavailable", "Compte indisponible");
    if ((await client.query("SELECT 1 FROM account_deletion_requests WHERE user_id=$1 AND status='pending'", [user.id])).rowCount)
      throw new AuthError(409,"account_closing","Annulez votre demande de fermeture de compte avant une nouvelle réservation");
    if (user.teacher_id === teacherId) throw new ValidationError("teacherId", "vous ne pouvez pas réserver votre propre cours");
    const teacher = (await client.query("SELECT * FROM teachers WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [teacherId])).rows[0];
    if (!teacher) throw new ValidationError("teacherId", "professeur introuvable");
    if (!teacher.verified) throw new ValidationError("teacherId", "professeur non validé");
    if (!(await client.query("SELECT id FROM users WHERE teacher_id=$1 AND role='teacher' AND deleted_at IS NULL", [teacherId])).rowCount) {
      throw new ValidationError("teacherId", "ce professeur ne dispose pas d'un compte actif");
    }
    if ((await client.query("SELECT 1 FROM users u JOIN account_deletion_requests d ON d.user_id=u.id AND d.status='pending' WHERE u.teacher_id=$1", [teacherId])).rowCount)
      throw new AuthError(409,"teacher_unavailable","Ce professeur n'accepte plus de nouvelles réservations");
    if (Array.isArray(teacher.formats) && !teacher.formats.includes(format)) throw new ValidationError("format", "modalité non proposée par ce professeur");
    const price = Math.round(Number(teacher.price_per_hour) * minutes / 60);
    if (!Number.isSafeInteger(price) || price <= 0 || price > 20_000_000) throw new ValidationError("teacherId", "tarif professeur indisponible");
    await assertSlotFree(client, { teacher_id: teacherId, duration_minutes: minutes }, startsAt);
    const { dayLabel, dayNum, time } = dateLabels(startsAt);
    const commission = await snapshotCommission(client, price);
    const r = await client.query(
      `INSERT INTO courses (user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,location,price,status,badge,accepted,payment_status,starts_at,duration_minutes,
       commission_pct,commission_amount,teacher_net_amount,private_address,lifecycle_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'upcoming','En attente',FALSE,'pending',$13,$14,$15,$16,$17,$18,'requested') RETURNING *`,
      [currentUserId(res),teacherId,teacher.name,subject?.trim() || teacher.subjects,level,dayLabel,dayNum,time,
        `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`, format,location ?? teacher.location,price,startsAt,minutes,
        commission.pct,commission.commission,commission.net,privateAddress?.trim() || null],
    );
    await courseEvent(client, r.rows[0].id, actorFromResponse(res), "booking_requested", { startAt: startsAt.toISOString(), price, commissionPct: commission.pct });
    await client.query("COMMIT");
    res.status(201).json({ reference: "AKW-" + (2000 + r.rows[0].id), course: r.rows[0] });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}));

registerNeedsRoutes(api, { serveFile });

// ----------------------------------------------------------------- Notifications
api.get("/notifications", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT icon, accent, text, time_ago, unread, section FROM notifications WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json(r.rows);
}));

// Compteur de notifications non lues (pour la pastille de l'icône cloche).
api.get("/notifications/unread", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND unread=TRUE",
    [currentUserId(res)]
  );
  res.json({ count: r.rows[0].count });
}));

// « Tout lire » : marque toutes les notifications de l'utilisateur comme lues.
api.post("/notifications/read", wrap(async (_req, res) => {
  const r = await pool.query(
    "UPDATE notifications SET unread=FALSE WHERE user_id=$1 AND unread=TRUE",
    [currentUserId(res)]
  );
  res.json({ ok: true, updated: r.rowCount });
}));

// ------------------------------------------------------------------ Portefeuille
api.get("/wallet", wrap(async (_req, res) => {
  const accounts = await pool.query(
    `SELECT provider, number, color, is_default AS "isDefault"
     FROM payment_accounts WHERE user_id=$1 ORDER BY ord, id`,
    [currentUserId(res)]
  );
  const tx = await pool.query(
    "SELECT id, payment_id, title, subtitle, amount, credit FROM transactions WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json({ accounts: accounts.rows, transactions: tx.rows });
}));

// ------------------------------------------------------------------ Paiements (Paystack Mobile Money)
api.post("/payments/charge-mobile", wrap(async (req, res) => {
  const b = req.body ?? {};
  const courseId = optionalNumber(b, "courseId", { min: 1 });
  if (courseId === undefined) throw new ValidationError("courseId", "courseId requis");
  const provider = optionalEnum(b, "provider", PAYMENT_PROVIDERS);
  if (!provider) throw new ValidationError("provider", "provider requis (orange, mtn, wave)");
  const phone = optionalPhone(b);
  try {
    const result = await initiateMobileCharge({
      courseId,
      provider: provider as (typeof PAYMENT_PROVIDERS)[number],
      phone: phone ?? "",
      userId: currentUserId(res),
    });
    res.json(result);
  } catch (e: any) {
    if (e instanceof ValidationError || e instanceof PaymentUnavailableError) throw e;
    res.status(502).json({
      error: "payment_error",
      message: String(e?.message ?? "échec du paiement").slice(0, 300),
    });
  }
}));

api.post("/payments/submit-otp", wrap(async (req, res) => {
  const b = req.body ?? {};
  const paymentId = optionalNumber(b, "paymentId", { min: 1 });
  if (paymentId === undefined) throw new ValidationError("paymentId", "paymentId requis");
  const otp = optionalString(b, "otp", { max: 10 });
  if (!otp) throw new ValidationError("otp", "code OTP requis");
  try {
    const result = await submitPaymentOtp({
      paymentId,
      otp,
      userId: currentUserId(res),
    });
    res.json(result);
  } catch (e: any) {
    if (e instanceof ValidationError || e instanceof PaymentUnavailableError) throw e;
    res.status(502).json({
      error: "payment_error",
      message: String(e?.message ?? "échec validation OTP").slice(0, 300),
    });
  }
}));

api.get("/payments/:id/status", wrap(async (req, res) => {
  const paymentId = Number(req.params.id);
  if (!Number.isFinite(paymentId) || paymentId < 1) {
    throw new ValidationError("paymentId", "identifiant invalide");
  }
  res.json(await getPaymentStatus(paymentId, currentUserId(res)));
}));

// ----------------------------------------------------------------- Cours groupe
api.get("/groups", wrap(async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const r = kind
    ? await pool.query("SELECT * FROM group_courses WHERE kind = $1 ORDER BY id", [kind])
    : await pool.query("SELECT * FROM group_courses ORDER BY id");
  res.json(r.rows);
}));

api.get("/groups/:id", wrap(async (req, res) => {
  const r = await pool.query("SELECT * FROM group_courses WHERE id=$1", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const prog = await pool.query(
    "SELECT line FROM group_programs WHERE group_id=$1 ORDER BY ord, id",
    [req.params.id]
  );
  res.json({ ...r.rows[0], program: prog.rows.map((p) => p.line) });
}));

// ------------------------------------------------------------------ Abonnement
api.get("/subscription/plans", wrap(async (_req, res) => {
  const r = await pool.query("SELECT name, detail, price, popular, suffix FROM subscription_plans ORDER BY price");
  res.json(r.rows);
}));

api.get("/subscription/mine", wrap(async (_req, res) => {
  const r = await pool.query(
    `SELECT plan, status, detail,
            next_charge AS "nextCharge", next_amount AS "nextAmount", used, total
     FROM user_subscriptions WHERE user_id=$1 ORDER BY id DESC LIMIT 1`,
    [currentUserId(res)]
  );
  res.json(r.rows[0] ?? {
    plan: "Aucun abonnement", status: "inactive", detail: "Aucun abonnement actif",
    nextCharge: "—", nextAmount: 0, used: 0, total: 0,
  });
}));

// --------------------------------------------------------------------- Progrès
api.get("/progress", wrap(async (_req, res) => {
  res.json(await progressForUser(currentUserId(res)));
}));

// --------------------------------------------------------------- Espace prof
/** La garde requireTeacher a déjà vérifié le rôle et le lien utilisateur/professeur. */
async function currentTeacherId(res: any): Promise<number> {
  const id = res.locals.teacherId;
  if (!Number.isSafeInteger(id) || id < 1) throw new AuthError(403, "forbidden", "Profil professeur requis");
  return id;
}

api.get("/teacher/dashboard", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  const t = (await pool.query(
    "SELECT name, negotiable, location, price_per_hour, experience, subjects, levels, formats, programs, needs_confirmed FROM teachers WHERE id=$1",
    [teacherId],
  )).rows[0];
  if (!t) { res.status(404).json({ error: "not_found" }); return; }
  const earnings = await teacherEarnings(teacherId);
  const stats = (await pool.query(
    `SELECT count(*) FILTER (WHERE lifecycle_status='scheduled' AND starts_at>=date_trunc('week',now()) AND starts_at<date_trunc('week',now())+interval '1 week')::int AS week,
      count(DISTINCT user_id) FILTER (WHERE lifecycle_status='completed')::int AS students FROM courses WHERE teacher_id=$1`, [teacherId],
  )).rows[0];
  const rating = (await pool.query("SELECT round(avg(rating),1) AS rating FROM reviews WHERE teacher_id=$1", [teacherId])).rows[0]?.rating;
  const needsConfirmed = Boolean(t.needs_confirmed);
  const oppCount = needsConfirmed
    ? (await pool.query(
        "SELECT count(*)::int AS n FROM course_needs WHERE status = 'published' AND teacher_id IS NULL",
      )).rows[0].n
    : 0;
  const legacyCount = (await pool.query(
    "SELECT count(*)::int AS n FROM courses WHERE teacher_id = $1 AND accepted = FALSE AND status = 'upcoming'",
    [teacherId],
  )).rows[0].n;
  res.json({
    name: t.name, revenue: earnings.summary.due, trend: "—",
    stats: [
      { value: String(stats.week), label: "cours cette semaine" },
      { value: rating == null ? "—" : String(rating), label: "note moyenne" },
      { value: String(stats.students), label: "élèves accompagnés" },
    ],
    pendingRequests: oppCount + legacyCount,
    needsConfirmed,
    profileCompletion: computeProfileCompletion(
      t,
      (await pool.query(
        "SELECT * FROM teacher_applications WHERE teacher_id=$1 ORDER BY created_at DESC LIMIT 1",
        [teacherId],
      )).rows[0] ?? null,
    ),
  });
}));

api.get("/teacher/requests", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  const needsConfirmed = Boolean((await pool.query(
    "SELECT needs_confirmed FROM teachers WHERE id=$1",
    [teacherId],
  )).rows[0]?.needs_confirmed);
  // Offres publiées (besoins parents) — gains nets affichés au prof.
  const opportunities = needsConfirmed
    ? await pool.query(
    `SELECT n.id AS "needId", n.id AS "courseId", n.level AS student, n.subject, n.level,
            NULL::text AS location, n.format, n.frequency, n.duration,
            n.net_teacher_amount AS price, n.net_teacher_hourly AS "netHourly",
            n.start_date AS "startDate", n.availability_week AS "availabilityWeek",
            n.availability_weekend AS "availabilityWeekend",
            n.availability_holidays AS "availabilityHolidays",
            n.has_cat AS "hasCat", n.has_dog AS "hasDog",
            NULL::numeric AS lat, NULL::numeric AS lng,
            'nouveau' AS ago,
            CASE n.format WHEN 'online' THEN 'En ligne' ELSE 'À domicile · coordonnées après acceptation' END AS slot
     FROM course_needs n
     LEFT JOIN children c ON c.id = n.child_id
     WHERE n.status = 'published' AND n.teacher_id IS NULL
     ORDER BY n.id DESC`,
  )
    : { rows: [] as any[] };
  // Réservations legacy encore en attente pour ce prof.
  const live = await pool.query(
    `SELECT c.id AS "courseId", NULL::int AS "needId", u.initials, 'green' AS accent, u.full_name AS name,
            'nouveau' AS ago, COALESCE(c.teacher_net_amount,c.price) AS price, c.level AS student, c.subject,
            (c.day_label || ' ' || c.day_num || ' · ' || c.time) AS slot,
            CASE c.format WHEN 'online' THEN 'En ligne'
                          ELSE COALESCE(c.location, 'À domicile') END AS format
     FROM courses c JOIN users u ON u.id = c.user_id
     WHERE c.teacher_id = $1 AND c.accepted = FALSE AND c.status = 'upcoming'
     ORDER BY c.id DESC`,
    [teacherId]
  );
  const mapOpp = (row: any) => ({
    courseId: row.courseId ?? row.needId,
    needId: row.needId ?? null,
    initials: row.initials ?? "BE",
    accent: row.accent ?? "green",
    name: row.name ?? row.location ?? row.slot ?? "Offre",
    ago: row.ago ?? "nouveau",
    price: row.price,
    netHourly: row.netHourly ?? null,
    student: row.student ?? row.level,
    subject: row.subject,
    slot: row.slot,
    format: row.format,
    frequency: row.frequency ?? null,
    duration: row.duration ?? null,
    startDate: row.startDate ?? null,
    availabilityWeek: row.availabilityWeek ?? true,
    availabilityWeekend: row.availabilityWeekend ?? false,
    availabilityHolidays: row.availabilityHolidays ?? false,
    hasCat: Boolean(row.hasCat),
    hasDog: Boolean(row.hasDog),
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    isOpportunity: row.needId != null,
  });
  res.json([...opportunities.rows.map(mapOpp), ...live.rows.map(mapOpp)]);
}));

// Notifie le parent (auteur de la réservation) qu'une décision a été prise.
async function notifyParent(userId: number, icon: string, accent: string, text: string): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, icon, accent, text, time_ago, unread, section)
     VALUES ($1,$2,$3,$4,'à l''instant',TRUE,'today')`,
    [userId, icon, accent, text]
  );
}

// Cette route ne traite que les réservations. Les besoins ont leur route /opportunities/:id/accept.
api.post("/teacher/requests/:id/accept", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const course = await lockCourse(client, Number(req.params.id), actorFromResponse(res));
    if (course.teacher_id !== teacherId || course.accepted || course.lifecycle_status !== "requested") { await client.query("ROLLBACK"); res.status(404).json({ error: "not_found" }); return; }
    if (course.starts_at) {
      if (new Date(course.starts_at).getTime() <= Date.now()) throw new AuthError(409, "slot_expired", "Ce créneau est passé");
      await assertSlotFree(client, course, new Date(course.starts_at));
    }
    await client.query("UPDATE courses SET accepted=TRUE,badge=$2,lifecycle_status=$3,updated_at=now() WHERE id=$1",
      [course.id,course.starts_at ? "Confirmé" : "À planifier",course.starts_at ? "scheduled" : "awaiting_schedule"]);
    await courseEvent(client, course.id, actorFromResponse(res), "teacher_accepted");
    await client.query(
      `INSERT INTO notifications(user_id,icon,accent,text,time_ago,unread,section)
       VALUES ($1,'seal','green',$2,'à l''instant',TRUE,'today')`,
      [course.user_id,`Votre demande de cours${course.subject ? ` de ${course.subject}` : ""} a été acceptée`],
    );
    await client.query("COMMIT");
    res.json({ ok: true, courseId: course.id });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}));

// Refus d'une demande réelle : le prof décline la réservation (status='refused').
api.post("/teacher/requests/:id/refuse", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  const c = await inTransaction(async client => {
    const course = await lockCourse(client, Number(req.params.id), actorFromResponse(res));
    if (course.teacher_id !== teacherId || course.accepted || course.lifecycle_status !== "requested") throw new AuthError(404,"not_found","Cours introuvable");
    await client.query("UPDATE courses SET status='refused',lifecycle_status='refused',badge='Refusé',updated_at=now() WHERE id=$1", [course.id]);
    await courseEvent(client, course.id, actorFromResponse(res), "teacher_refused");
    return course;
  });
  await notifyParent(c.user_id, "calendar", "orange",
    `Votre demande de cours${c.subject ? ` de ${c.subject}` : ""} n'a pas été retenue`);
  res.json({ ok: true, courseId: c.id });
}));

api.get("/teacher/earnings", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  res.json(await teacherEarnings(teacherId));
}));

registerTeacherProfileRoutes(api, { wrap, currentTeacherId, currentUserId });

// ============================================================================ *
// ESPACE ADMINISTRATION (réservé au rôle `admin`)
// Gestion du catalogue (matières, niveaux) et des ressources pédagogiques.
// ============================================================================ *
const admin = Router();
admin.use(requireAdmin);
registerCourseLifecycleRoutes(api, admin);
registerFinanceRoutes(api, admin);

// --- Matières (permet d'ajouter musique, langues autres que FR/EN, etc.) ---
admin.post("/subjects", wrap(async (req, res) => {
  const slug = requiredString(req.body, "slug", { max: 40 });
  const name = requiredString(req.body, "name", { max: 60 });
  const icon = optionalString(req.body, "icon", { max: 40 }) ?? "more";
  const accent = optionalEnum(req.body, "accent", ["green", "orange"]) ?? "green";
  const r = await pool.query(
    `INSERT INTO subjects (slug, name, icon, accent) VALUES ($1,$2,$3,$4)
     ON CONFLICT (slug) DO NOTHING RETURNING slug, name, icon, accent`,
    [slug, name, icon, accent]
  );
  if (!r.rows[0]) { res.status(409).json({ error: "conflict", message: "slug déjà utilisé" }); return; }
  res.status(201).json(r.rows[0]);
}));

admin.put("/subjects/:slug", wrap(async (req, res) => {
  const name = optionalString(req.body, "name", { max: 60 });
  const icon = optionalString(req.body, "icon", { max: 40 });
  const accent = optionalEnum(req.body, "accent", ["green", "orange"]);
  const r = await pool.query(
    `UPDATE subjects SET name = COALESCE($2, name), icon = COALESCE($3, icon),
            accent = COALESCE($4, accent) WHERE slug = $1 RETURNING slug, name, icon, accent`,
    [req.params.slug, name ?? null, icon ?? null, accent ?? null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json(r.rows[0]);
}));

admin.delete("/subjects/:slug", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM subjects WHERE slug=$1 RETURNING slug", [req.params.slug]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

// --- Niveaux (permet d'ajouter le supérieur / universitaire, etc.) ---
admin.post("/levels", wrap(async (req, res) => {
  const slug = requiredString(req.body, "slug", { max: 40 });
  const name = requiredString(req.body, "name", { max: 60 });
  const ord = optionalNumber(req.body, "ord", { min: 0, max: 999 }) ?? 0;
  const r = await pool.query(
    `INSERT INTO levels (slug, name, ord) VALUES ($1,$2,$3)
     ON CONFLICT (slug) DO NOTHING RETURNING slug, name, ord`,
    [slug, name, ord]
  );
  if (!r.rows[0]) { res.status(409).json({ error: "conflict", message: "slug déjà utilisé" }); return; }
  res.status(201).json(r.rows[0]);
}));

admin.delete("/levels/:slug", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM levels WHERE slug=$1 RETURNING slug", [req.params.slug]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

// --- Programmes (programme standard, programme français, etc.) ---
admin.post("/programs", wrap(async (req, res) => {
  const slug = requiredString(req.body, "slug", { max: 40 });
  const name = requiredString(req.body, "name", { max: 60 });
  const ord = optionalNumber(req.body, "ord", { min: 0, max: 999 }) ?? 0;
  const r = await pool.query(
    `INSERT INTO programs (slug, name, ord) VALUES ($1,$2,$3)
     ON CONFLICT (slug) DO NOTHING RETURNING slug, name, ord`,
    [slug, name, ord]
  );
  if (!r.rows[0]) { res.status(409).json({ error: "conflict", message: "slug déjà utilisé" }); return; }
  res.status(201).json(r.rows[0]);
}));

admin.delete("/programs/:slug", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM programs WHERE slug=$1 RETURNING slug", [req.params.slug]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

// --- Ressources pédagogiques (cours, devoirs, exercices) + fichier ---
admin.post("/resources", wrap(async (req, res) => {
  const b = req.body ?? {};
  const type = requiredEnum(b, "type", RESOURCE_TYPES);
  const title = requiredString(b, "title", { max: 160 });
  const program = resolveResourceProgram(b);
  const subjectSlug = optionalString(b, "subjectSlug", { max: 40 });
  const level = optionalString(b, "level", { max: 40 });
  const description = optionalString(b, "description", { max: 2000 });
  const fileName = optionalString(b, "fileName", { max: 200 });
  const mimeType = optionalString(b, "mimeType", { max: 100 });
  const contentBase64 = optionalString(b, "contentBase64", { max: 20_000_000 });
  const buffer = contentBase64 ? Buffer.from(contentBase64, "base64") : null;

  // Téléverse sur le stockage objet si possible ; sinon, repli sur BYTEA en base.
  let storageKey: string | null = null;
  let content: Buffer | null = buffer;
  if (buffer) {
    storageKey = await putFile(buffer, mimeType ?? null, fileName ?? null);
    if (storageKey) content = null; // stocké hors-base : pas de duplication en BYTEA
  }

  const r = await pool.query(
    `INSERT INTO resources (type, subject_slug, level, program, title, description,
                            file_name, mime_type, size_bytes, content, storage_key, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, type, subject_slug, level, program, title, description, file_name, mime_type, size_bytes, created_at`,
    [type, subjectSlug ?? null, level ?? null, program, title, description ?? null,
     fileName ?? null, mimeType ?? null, buffer?.length ?? null, content, storageKey, currentUserId(res)]
  );
  res.status(201).json(r.rows[0]);
}));

admin.put("/resources/:id", wrap(async (req, res) => {
  const b = req.body ?? {};
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "bad_id" }); return; }

  const cur = await pool.query(
    "SELECT id, storage_key, file_name, mime_type, size_bytes, content FROM resources WHERE id=$1",
    [id]
  );
  if (!cur.rows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const type = requiredEnum(b, "type", RESOURCE_TYPES);
  const title = requiredString(b, "title", { max: 160 });
  const program = resolveResourceProgram(b);
  const subjectSlug = optionalString(b, "subjectSlug", { max: 40 }) ?? null;
  const level = optionalString(b, "level", { max: 40 }) ?? null;
  const description = optionalString(b, "description", { max: 2000 }) ?? null;
  const fileName = optionalString(b, "fileName", { max: 200 });
  const mimeType = optionalString(b, "mimeType", { max: 100 });
  const contentBase64 = optionalString(b, "contentBase64", { max: 20_000_000 });
  const buffer = contentBase64 ? Buffer.from(contentBase64, "base64") : null;

  let storageKey = cur.rows[0].storage_key as string | null;
  let content: Buffer | null = cur.rows[0].content;
  let outFileName = cur.rows[0].file_name;
  let outMimeType = cur.rows[0].mime_type;
  let sizeBytes = cur.rows[0].size_bytes;

  if (buffer) {
    const uploaded = await putFile(buffer, mimeType ?? null, fileName ?? null);
    await removeFile(storageKey);
    storageKey = uploaded;
    content = uploaded ? null : buffer;
    sizeBytes = buffer.length;
    outFileName = fileName ?? null;
    outMimeType = mimeType ?? null;
  }

  const r = await pool.query(
    `UPDATE resources SET
        type = $2, subject_slug = $3, level = $4, program = $5, title = $6, description = $7,
        file_name = $8, mime_type = $9, size_bytes = $10, content = $11, storage_key = $12
     WHERE id = $1
     RETURNING id, type, subject_slug, level, program, title, description, file_name, mime_type, size_bytes, created_at`,
    [id, type, subjectSlug, level, program, title, description, outFileName, outMimeType, sizeBytes, content, storageKey]
  );
  res.json(r.rows[0]);
}));

admin.delete("/resources/:id", wrap(async (req, res) => {
  const cur = await pool.query("SELECT storage_key FROM resources WHERE id=$1", [req.params.id]);
  const r = await pool.query("DELETE FROM resources WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  await removeFile(cur.rows[0]?.storage_key);
  res.status(204).end();
}));

// --- Documents légaux : l'admin téléverse/remplace le PDF d'un document existant ---
admin.put("/legal/:slug", wrap(async (req, res) => {
  const b = req.body ?? {};
  const title = optionalString(b, "title", { max: 160 });
  const version = optionalString(b, "version", { max: 40 });
  const fileName = optionalString(b, "fileName", { max: 200 });
  const mimeType = optionalString(b, "mimeType", { max: 100 });
  const contentBase64 = optionalString(b, "contentBase64", { max: 20_000_000 });

  if (version !== undefined && !version.trim()) throw new ValidationError("version", "version non vide requise");
  let file: Buffer | null = null;
  if (contentBase64 !== undefined) {
    const encoded = contentBase64.replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new ValidationError("contentBase64", "fichier base64 invalide");
    file = Buffer.from(encoded, "base64");
    if (file.length < 8 || file.length > 8 * 1024 * 1024 || file.subarray(0,5).toString("ascii") !== "%PDF-") {
      throw new ValidationError("contentBase64", "document PDF non vide de 8 Mo maximum requis");
    }
    if (mimeType && mimeType !== "application/pdf") throw new ValidationError("mimeType", "un PDF est requis pour un document légal");
  }
  let uploadedKey: string | null = null;
  try {
    const result = await inTransaction(async client => {
      const existing = (await client.query("SELECT * FROM legal_documents WHERE slug=$1 FOR UPDATE", [req.params.slug])).rows[0];
      if (!existing) throw new AuthError(404, "not_found", "Document introuvable");
      if (file) uploadedKey = await putFile(file, "application/pdf", fileName ?? `${req.params.slug}.pdf`, "legal");
      const row = (await client.query(
        `UPDATE legal_documents SET title=COALESCE($2,title),version=COALESCE($3,version),updated_at=now(),updated_by=$4,
         file_name=CASE WHEN $5 THEN $6 ELSE file_name END,mime_type=CASE WHEN $5 THEN 'application/pdf' ELSE mime_type END,
         size_bytes=CASE WHEN $5 THEN $7::int ELSE size_bytes END,content=CASE WHEN $5 THEN $8::bytea ELSE content END,
         storage_key=CASE WHEN $5 THEN $9::text ELSE storage_key END WHERE slug=$1
         RETURNING slug,title,version,revision_id,file_name,size_bytes,updated_at`,
        [req.params.slug,title?.trim() ?? null,version?.trim() ?? null,currentUserId(res),Boolean(file),fileName ?? `${req.params.slug}.pdf`,
          file?.length ?? null,uploadedKey ? null : file,uploadedKey],
      )).rows[0];
      // Le trigger de révision invalide la revue seulement si le document change.
      return row;
    });
    invalidateReadiness();
    res.json(result);
  } catch (error) {
    if (uploadedKey) await removeFile(uploadedKey);
    throw error;
  }
}));

admin.get("/legal/:slug/versions", wrap(async (req, res) => {
  const rows = (await pool.query(`SELECT slug,revision_id,title,version,file_name,size_bytes,published_at,published_by
    FROM legal_document_versions WHERE slug=$1 ORDER BY published_at DESC`, [req.params.slug])).rows;
  res.json(rows);
}));
admin.get("/legal/:slug/versions/:revision/file", wrap(async (req, res) => {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(req.params.revision)) throw new ValidationError("revision", "révision invalide");
  const row = (await pool.query("SELECT * FROM legal_document_versions WHERE slug=$1 AND revision_id=$2::uuid", [req.params.slug,req.params.revision])).rows[0];
  if (!row || (!row.content && !row.storage_key)) throw new AuthError(404,"not_found","Document introuvable");
  await serveFile(res,row);
}));

// --- Paramètres plateforme : réseaux sociaux + contact (mise à jour groupée) ---
// Corps = objet { clé: valeur } ; seules les clés connues sont prises en compte.
admin.put("/settings", wrap(async (req, res) => {
  const b = req.body ?? {};
  const updates: [string, string][] = [];
  for (const key of SETTING_KEYS) {
    const v = optionalString(b, key, { max: 300 });
    if (v !== undefined) {
      if (key === "commission_pct" && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(v.trim()) || Number(v) > 100)) {
        throw new ValidationError("commission_pct", "pourcentage explicite entre 0 et 100, avec au plus deux décimales");
      }
      updates.push([key, v.trim()]);
    }
  }
  await inTransaction(async client => {
    let sensitiveChanged = false;
    for (const [key, value] of updates) {
      const changed = await client.query(
      `INSERT INTO app_settings (key, value, updated_at, updated_by)
       VALUES ($1,$2,now(),$3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
         updated_at = now(), updated_by = EXCLUDED.updated_by
       WHERE app_settings.value IS DISTINCT FROM EXCLUDED.value RETURNING key`,
      [key, value, currentUserId(res)]
      );
      if (changed.rowCount && ["commission_pct","contact_email","contact_phone"].includes(key)) sensitiveChanged = true;
    }
    if (sensitiveChanged) {
      await client.query("DELETE FROM production_checks WHERE check_key IN ('provider_e2e','legal_review')");
    }
  });
  invalidateReadiness();
  const r = await pool.query("SELECT key, value FROM app_settings");
  const out: Record<string, string> = {};
  for (const k of SETTING_KEYS) out[k] = "";
  for (const row of r.rows) if (SETTING_KEYS.includes(row.key as any)) out[row.key] = row.value;
  res.json(out);
}));

// --- OTP : WhatsApp (OpenWA) + e-mail (SMTP) ---
admin.get("/otp-settings", wrap(async (_req, res) => {
  res.json(maskOtpSettings(await loadOtpSettings()));
}));

admin.put("/otp-settings", wrap(async (req, res) => {
  const current = await loadOtpSettings();
  const updates = mergeOtpSettingsBody(req.body ?? {}, current);
  await saveOtpSettings(updates, currentUserId(res));
  res.json(maskOtpSettings(await loadOtpSettings()));
}));

admin.post("/otp-settings/test", wrap(async (req, res) => {
  const b = req.body ?? {};
  const channel = optionalEnum(b, "channel", OTP_CHANNELS);
  if (!channel) throw new ValidationError("channel", "channel requis (whatsapp ou email)");
  const phone = optionalPhone(b);
  const email = optionalEmail(b);
  const formSettings =
    b.settings && typeof b.settings === "object" && !Array.isArray(b.settings)
      ? (b.settings as Record<string, unknown>)
      : undefined;
  try {
    const result = await runOtpIntegrationTest({
      channel: channel as "whatsapp" | "email",
      phone,
      email,
      formSettings,
    });
    res.json(result);
  } catch (e: any) {
    if (e instanceof ValidationError || e instanceof PaymentUnavailableError) throw e;
    res.status(502).json({
      error: "provider_error",
      message: String(e?.message ?? "échec de l'envoi de test").slice(0, 300),
    });
  }
}));

// --- Professeurs : création / modification / suppression ---
// Champs texte ; `subjects` est une chaîne libre (« Maths · Physique »),
// `levels`/`formats` des listes de chaînes (formats : home | online).
function strArray(body: any, field: string): string[] | undefined {
  const v = body?.[field];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
    throw new ValidationError(field, `${field} doit être une liste de chaînes`);
  return v;
}

admin.get("/teachers", wrap(async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const rows = (await pool.query(`SELECT t.*,
    EXISTS(SELECT 1 FROM users u WHERE u.teacher_id=t.id AND u.role='teacher' AND u.deleted_at IS NULL) AS "hasActiveAccount"
    FROM teachers t WHERE ($1 OR t.archived_at IS NULL) ORDER BY t.id DESC`, [includeArchived])).rows;
  res.json(rows);
}));

admin.post("/teachers", wrap(async (req, res) => {
  const b = req.body ?? {};
  const name = requiredString(b, "name", { max: 120 });
  const subjects = requiredString(b, "subjects", { max: 200 });
  const location = optionalString(b, "location", { max: 120 }) ?? "Abidjan";
  const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 }) ?? 4000;
  // Les notes ne sont créées que par des avis de cours réellement réalisés.
  const rating = 0;
  const reviewsCount = 0;
  const accent = optionalEnum(b, "accent", ["green", "orange"]) ?? "green";
  const experience = optionalString(b, "experience", { max: 40 });
  const students = optionalString(b, "students", { max: 40 });
  const bacSuccess = optionalString(b, "bacSuccess", { max: 40 });
  const bio = optionalString(b, "bio", { max: 2000 });
  const levels = strArray(b, "levels") ?? [];
  const formats = strArray(b, "formats") ?? ["home", "online"];
  const programs = strArray(b, "programs") ?? ["standard"];
  const distanceKm = optionalNumber(b, "distanceKm", { min: 0, max: 99 });
  const verified = b.verified === false || b.verified === "false" ? false : true;
  const specialBepc = b.specialBepc === true || b.specialBepc === "true";
  const negotiable = b.negotiable === true || b.negotiable === "true";
  const needsConfirmed = b.needsConfirmed === true || b.needsConfirmed === "true";
  const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const r = await pool.query(
    `INSERT INTO teachers (initials,name,subjects,rating,reviews_count,location,price_per_hour,
        experience,students,bac_success,bio,levels,formats,programs,distance_km,accent,verified,special_bepc,negotiable,needs_confirmed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [initials, name, subjects, rating, reviewsCount, location, pricePerHour,
     experience ?? null, students ?? null, bacSuccess ?? null, bio ?? null,
     levels, formats, programs, distanceKm ?? null, accent, verified, specialBepc, negotiable, needsConfirmed]
  );
  res.status(201).json(r.rows[0]);
}));

admin.put("/teachers/:id", wrap(async (req, res) => {
  const b = req.body ?? {};
  const name = optionalString(b, "name", { max: 120 });
  const subjects = optionalString(b, "subjects", { max: 200 });
  const location = optionalString(b, "location", { max: 120 });
  const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 });
  const rating = null;
  const reviewsCount = null;
  const accent = optionalEnum(b, "accent", ["green", "orange"]);
  const experience = optionalString(b, "experience", { max: 40 });
  const students = optionalString(b, "students", { max: 40 });
  const bacSuccess = optionalString(b, "bacSuccess", { max: 40 });
  const bio = optionalString(b, "bio", { max: 2000 });
  const levels = strArray(b, "levels");
  const formats = strArray(b, "formats");
  const programs = strArray(b, "programs");
  const distanceKm = optionalNumber(b, "distanceKm", { min: 0, max: 99 });
  const verified = b.verified === undefined ? undefined : (b.verified === true || b.verified === "true");
  const specialBepc = b.specialBepc === undefined ? undefined : (b.specialBepc === true || b.specialBepc === "true");
  const negotiable = b.negotiable === undefined ? undefined : (b.negotiable === true || b.negotiable === "true");
  const needsConfirmed = b.needsConfirmed === undefined
    ? undefined
    : (b.needsConfirmed === true || b.needsConfirmed === "true");
  const r = await pool.query(
    `UPDATE teachers SET
        name = COALESCE($2,name), subjects = COALESCE($3,subjects), location = COALESCE($4,location),
        price_per_hour = COALESCE($5,price_per_hour), rating = COALESCE($6,(SELECT COALESCE(round(avg(rating),1),0) FROM reviews WHERE teacher_id=teachers.id)),
        reviews_count = COALESCE($7,(SELECT count(*) FROM reviews WHERE teacher_id=teachers.id)), accent = COALESCE($8,accent),
        experience = COALESCE($9,experience), students = COALESCE($10,students),
        bac_success = COALESCE($11,bac_success), bio = COALESCE($12,bio),
        levels = COALESCE($13,levels), formats = COALESCE($14,formats),
        distance_km = COALESCE($15,distance_km), verified = COALESCE($16,verified),
        special_bepc = COALESCE($17,special_bepc),
        programs = COALESCE($18,programs), negotiable = COALESCE($19,negotiable),
        needs_confirmed = COALESCE($20, needs_confirmed)
     WHERE id = $1 RETURNING *`,
    [req.params.id, name ?? null, subjects ?? null, location ?? null, pricePerHour ?? null,
     rating ?? null, reviewsCount ?? null, accent ?? null, experience ?? null, students ?? null,
     bacSuccess ?? null, bio ?? null, levels ?? null, formats ?? null, distanceKm ?? null,
     verified ?? null, specialBepc ?? null, programs ?? null, negotiable ?? null, needsConfirmed ?? null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json(r.rows[0]);
}));

admin.delete("/teachers/:id", wrap(async (req, res) => {
  const r = await pool.query("UPDATE teachers SET archived_at=now(),verified=FALSE WHERE id=$1 AND archived_at IS NULL RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

admin.post("/teachers/:id/confirm-needs", wrap(async (req, res) => {
  const b = req.body ?? {};
  const confirmed = b.confirmed === false || b.confirmed === "false" ? false : true;
  const r = await pool.query(
    "UPDATE teachers SET needs_confirmed=$2 WHERE id=$1 RETURNING id, needs_confirmed",
    [req.params.id, confirmed],
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ id: r.rows[0].id, needsConfirmed: Boolean(r.rows[0].needs_confirmed) });
}));

// --- Cours de groupe (ateliers, prépa BEPC/BAC collectifs) ---
admin.post("/groups", wrap(async (req, res) => {
  const b = req.body ?? {};
  const tag = requiredString(b, "tag", { max: 40 });
  const tagAccent = optionalEnum(b, "tagAccent", ["green", "orange"]) ?? "green";
  const price = optionalNumber(b, "price", { min: 0, max: 1_000_000 }) ?? 0;
  const title = requiredString(b, "title", { max: 160 });
  const detail = requiredString(b, "detail", { max: 200 });
  const teacherInitials = optionalString(b, "teacherInitials", { max: 4 });
  const teacherName = optionalString(b, "teacherName", { max: 120 });
  const teacherAccent = optionalEnum(b, "teacherAccent", ["green", "orange"]) ?? "green";
  const enrolled = optionalNumber(b, "enrolled", { min: 0 });
  const capacity = optionalNumber(b, "capacity", { min: 0 });
  const placesLeft = optionalNumber(b, "placesLeft", { min: 0 });
  const kind = optionalEnum(b, "kind", ["regular", "stage"]) ?? "regular";
  const startDate = optionalString(b, "startDate", { max: 20 });
  const endDate = optionalString(b, "endDate", { max: 20 });
  const r = await pool.query(
    `INSERT INTO group_courses (tag,tag_accent,price,title,detail,teacher_initials,teacher_name,teacher_accent,enrolled,capacity,places_left,kind,start_date,end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14::date) RETURNING *`,
    [tag, tagAccent, price, title, detail, teacherInitials ?? null, teacherName ?? null,
     teacherAccent, enrolled ?? null, capacity ?? null, placesLeft ?? null,
     kind, startDate ?? null, endDate ?? null]
  );
  res.status(201).json(r.rows[0]);
}));

admin.put("/groups/:id", wrap(async (req, res) => {
  const b = req.body ?? {};
  const tag = optionalString(b, "tag", { max: 40 });
  const tagAccent = optionalEnum(b, "tagAccent", ["green", "orange"]);
  const price = optionalNumber(b, "price", { min: 0, max: 1_000_000 });
  const title = optionalString(b, "title", { max: 160 });
  const detail = optionalString(b, "detail", { max: 200 });
  const teacherInitials = optionalString(b, "teacherInitials", { max: 4 });
  const teacherName = optionalString(b, "teacherName", { max: 120 });
  const teacherAccent = optionalEnum(b, "teacherAccent", ["green", "orange"]);
  const enrolled = optionalNumber(b, "enrolled", { min: 0 });
  const capacity = optionalNumber(b, "capacity", { min: 0 });
  const placesLeft = optionalNumber(b, "placesLeft", { min: 0 });
  const kind = optionalEnum(b, "kind", ["regular", "stage"]);
  const startDate = optionalString(b, "startDate", { max: 20 });
  const endDate = optionalString(b, "endDate", { max: 20 });
  const r = await pool.query(
    `UPDATE group_courses SET
        tag = COALESCE($2,tag), tag_accent = COALESCE($3,tag_accent), price = COALESCE($4,price),
        title = COALESCE($5,title), detail = COALESCE($6,detail),
        teacher_initials = COALESCE($7,teacher_initials), teacher_name = COALESCE($8,teacher_name),
        teacher_accent = COALESCE($9,teacher_accent), enrolled = COALESCE($10,enrolled),
        capacity = COALESCE($11,capacity), places_left = COALESCE($12,places_left),
        kind = COALESCE($13,kind), start_date = COALESCE($14::date,start_date), end_date = COALESCE($15::date,end_date)
     WHERE id = $1 RETURNING *`,
    [req.params.id, tag ?? null, tagAccent ?? null, price ?? null, title ?? null, detail ?? null,
     teacherInitials ?? null, teacherName ?? null, teacherAccent ?? null,
     enrolled ?? null, capacity ?? null, placesLeft ?? null,
     kind ?? null, startDate ?? null, endDate ?? null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json(r.rows[0]);
}));

admin.delete("/groups/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM group_courses WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

registerAdminNeedsRoutes(admin, { serveFile });
registerTeacherApplicationRoutes(api, admin, { wrap, serveFile });

api.use("/admin", admin);

// -------------------------------------------------------------------- Parrainage
api.get("/referral", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT code, referred, earned FROM referrals WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
    [currentUserId(res)]
  );
  res.json({ ...(r.rows[0] ?? { code: "", referred: 0, earned: 0 }), available: false });
}));
