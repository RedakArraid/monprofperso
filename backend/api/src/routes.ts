import { Router } from "express";
import { pool } from "./db";
import { ValidationError, optionalString, optionalPhone, optionalEnum, optionalNumber, requiredString, requiredEnum } from "./validate";
import { optionalAuth, currentUserId, signJwt, requireAdmin, DEMO_USER } from "./auth";
import { putFile, getFileStream, removeFile } from "./storage";
import { registerTeacherApplicationRoutes } from "./teacherApplications";

export const api = Router();

// Résout l'utilisateur courant (token JWT) ou retombe sur DEMO_USER (rétrocompat).
api.use(optionalAuth);

const ROLES = ["parent", "student", "teacher"] as const;

// Version courante des CGU / politique de confidentialité (cf. docs/COMPLIANCE.md).
// À incrémenter à chaque révision pour re-solliciter le consentement.
const CONSENT_VERSION = "2026-06";

const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) =>
  fn(req, res).catch((e: any) => {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: "validation_error", field: e.field, message: e.message });
      return;
    }
    // Détail consigné côté serveur, jamais renvoyé au client (pas de fuite interne).
    console.error(`[${req.method} ${req.originalUrl}]`, e);
    res.status(500).json({ error: "internal_error", message: "erreur interne" });
  });

// ---------------------------------------------------------------- Auth (mock)
// GET /api/auth/login : souvent ouvert par erreur dans le navigateur (la connexion est un POST).
api.get("/auth/login", (_req, res) => {
  res.redirect(302, "https://monprofperso.com/admin/");
});

api.post("/auth/login", wrap(async (req, res) => {
  const phone = optionalPhone(req.body);
  const r = await pool.query("SELECT * FROM users WHERE phone = $1", [phone ?? "+2250758421903"]);
  const user = r.rows[0] ?? (await pool.query("SELECT * FROM users WHERE id=$1", [DEMO_USER])).rows[0];
  res.json({ token: signJwt(user.id, user.role), user });
}));

api.post("/auth/signup", wrap(async (req, res) => {
  const fullName = optionalString(req.body, "fullName", { max: 120 });
  const phone = optionalPhone(req.body);
  const role = optionalEnum(req.body, "role", ROLES);
  // Consentement (CGU + confidentialité) ; consentement parental pour les élèves.
  const consent = req.body?.consent === true || req.body?.consent === "true";
  const parentalConsent = req.body?.parentalConsent === true || req.body?.parentalConsent === "true";
  const initials = (fullName ?? "Aya Koné").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const r = await pool.query(
    `INSERT INTO users (full_name, phone, role, initials, consent_version, consent_at, parental_consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name,
       consent_version = COALESCE(EXCLUDED.consent_version, users.consent_version),
       consent_at = COALESCE(EXCLUDED.consent_at, users.consent_at),
       parental_consent = users.parental_consent OR EXCLUDED.parental_consent
     RETURNING *`,
    [fullName ?? "Aya Koné", phone ?? "+2250758421903", role ?? "parent", initials,
     consent ? CONSENT_VERSION : null, consent ? new Date() : null, parentalConsent]
  );
  const user = r.rows[0];
  res.json({ token: signJwt(user.id, user.role), user });
}));

api.post("/auth/verify-otp", wrap(async (req, res) => {
  const phone = optionalPhone(req.body);
  const r = phone
    ? await pool.query("SELECT * FROM users WHERE phone=$1", [phone])
    : { rows: [] as any[] };
  const user = r.rows[0] ?? (await pool.query("SELECT * FROM users WHERE id=$1", [DEMO_USER])).rows[0];
  res.json({ token: signJwt(user.id, user.role), verified: true });
}));

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

// Liste les ressources (métadonnées seulement, sans le contenu du fichier).
api.get("/resources", wrap(async (req, res) => {
  const params: any[] = [];
  const where: string[] = [];
  for (const f of ["type", "level"] as const) {
    if (req.query[f]) { params.push(req.query[f]); where.push(`${f} = $${params.length}`); }
  }
  if (req.query.subject) { params.push(req.query.subject); where.push(`subject_slug = $${params.length}`); }
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(title ILIKE $${params.length} OR COALESCE(description, '') ILIKE $${params.length})`);
  }
  const sql = `SELECT id, type, subject_slug, level, title, description,
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
  res.setHeader("Content-Type", row.mime_type ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${row.file_name ?? "fichier"}"`);
  if (row.storage_key) {
    const stream = await getFileStream(row.storage_key);
    stream.on("error", () => { if (!res.headersSent) res.status(502).json({ error: "storage_error" }); });
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
  const where: string[] = [];
  if (format) { params.push(format); where.push(`$${params.length} = ANY(formats)`); }
  if (level)  { params.push(level);  where.push(`$${params.length} = ANY(levels)`); }
  const sql = `SELECT id, initials, name, subjects, rating, reviews_count, location,
                      price_per_hour, distance_km, accent, verified, special_bepc, formats,
                      programs, negotiable
               FROM teachers ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY rating DESC`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

api.get("/teachers/:id", wrap(async (req, res) => {
  const t = await pool.query("SELECT * FROM teachers WHERE id=$1", [req.params.id]);
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
  const params: any[] = [currentUserId(res)];
  let sql = "SELECT * FROM courses WHERE user_id=$1";
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += " ORDER BY id";
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

api.post("/bookings", wrap(async (req, res) => {
  const b = req.body ?? {};
  const teacherId = optionalNumber(b, "teacherId", { min: 1 });
  const price = optionalNumber(b, "price", { min: 0 });
  const format = optionalEnum(b, "format", ["home", "online"]);
  const teacherName = optionalString(b, "teacherName", { max: 120 });
  const subject = optionalString(b, "subject", { max: 80 });
  const level = optionalString(b, "level", { max: 40 });
  const dayLabel = optionalString(b, "dayLabel", { max: 20 });
  const dayNum = optionalString(b, "dayNum", { max: 10 });
  const time = optionalString(b, "time", { max: 20 });
  const duration = optionalString(b, "duration", { max: 20 });
  const location = optionalString(b, "location", { max: 200 });
  // Négociation (offre « à négocier ») : le client propose un tarif et/ou une fréquence.
  const proposedPrice = optionalNumber(b, "proposedPrice", { min: 0, max: 1_000_000 });
  const proposedFrequency = optionalString(b, "proposedFrequency", { max: 60 });
  const hasProposal = proposedPrice !== undefined || proposedFrequency !== undefined;
  const negotiationStatus = hasProposal ? "proposed" : "none";
  const r = await pool.query(
    `INSERT INTO courses (user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,location,price,status,badge,accepted,
                          negotiable,proposed_price,proposed_frequency,negotiation_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'upcoming',$13,FALSE,$14,$15,$16,$17) RETURNING *`,
    [currentUserId(res), teacherId ?? 1, teacherName ?? "Koffi N'Guessan", subject ?? "Maths", level ?? "3ᵉ",
     dayLabel ?? "SAM", dayNum ?? "22", time ?? "16h00", duration ?? "1h30",
     format ?? "home", location ?? "À domicile, Cocody", price ?? 6000, "En attente",
     hasProposal, proposedPrice ?? null, proposedFrequency ?? null, negotiationStatus]
  );
  res.status(201).json({ reference: "AKW-" + (2000 + r.rows[0].id), course: r.rows[0] });
}));

// Le client accepte la contre-proposition du prof (tarif + fréquence retenus).
api.post("/courses/:id/negotiation/accept", wrap(async (req, res) => {
  const r = await pool.query(
    `UPDATE courses
        SET price = COALESCE(counter_price, price),
            accepted = TRUE, badge = 'Confirmé', negotiation_status = 'accepted'
      WHERE id = $1 AND user_id = $2 AND negotiation_status = 'countered'
      RETURNING id, teacher_id`,
    [req.params.id, currentUserId(res)]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ok: true, courseId: r.rows[0].id });
}));

// Le client refuse la contre-proposition du prof (la demande est abandonnée).
api.post("/courses/:id/negotiation/refuse", wrap(async (req, res) => {
  const r = await pool.query(
    `UPDATE courses SET status = 'refused', badge = 'Refusé', negotiation_status = 'refused'
      WHERE id = $1 AND user_id = $2 AND negotiation_status = 'countered' RETURNING id`,
    [req.params.id, currentUserId(res)]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ok: true, courseId: r.rows[0].id });
}));

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
    "SELECT title, subtitle, amount, credit FROM transactions WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json({ accounts: accounts.rows, transactions: tx.rows });
}));

// ----------------------------------------------------------------- Cours groupe
api.get("/groups", wrap(async (_req, res) => {
  const r = await pool.query("SELECT * FROM group_courses ORDER BY id");
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
    plan: "Régulier", status: "active", detail: "2 cours par semaine · Prof attitré Koffi",
    nextCharge: "1 juil.", nextAmount: 26000, used: 5, total: 8,
  });
}));

// --------------------------------------------------------------------- Progrès
api.get("/progress", wrap(async (_req, res) => {
  const subs = await pool.query(
    "SELECT subject, grade, fraction, warn FROM progress_subjects WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json({
    student: "Kouadio, 3ᵉ", average: "13,2", trend: "+1,4",
    goal: "Objectif BEPC : 14/20, vous y êtes presque !",
    subjects: subs.rows,
  });
}));

// --------------------------------------------------------------- Espace prof
// Professeur par défaut si le compte courant n'est pas relié à une fiche prof
// (repli démo : compte non-prof, ou prof fraîchement inscrit sans fiche).
const DEMO_TEACHER = 1;

/** Fiche `teachers` du compte connecté, ou le prof de démo en repli. */
async function currentTeacherId(res: any): Promise<number> {
  const r = await pool.query("SELECT teacher_id FROM users WHERE id=$1", [currentUserId(res)]);
  return (r.rows[0]?.teacher_id as number | null) ?? DEMO_TEACHER;
}

api.get("/teacher/dashboard", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  const p = (await pool.query("SELECT * FROM teacher_profiles WHERE teacher_id=$1", [teacherId])).rows[0];
  const t = (await pool.query("SELECT name, negotiable FROM teachers WHERE id=$1", [teacherId])).rows[0];
  if (!p || !t) { res.status(404).json({ error: "not_found" }); return; }
  const pending = (await pool.query(
    `SELECT ((SELECT count(*) FROM teacher_requests WHERE teacher_id=$1)
           + (SELECT count(*) FROM courses WHERE teacher_id=$1 AND accepted=FALSE AND status='upcoming'))::int AS n`,
    [teacherId]
  )).rows[0].n;
  res.json({
    name: t.name, revenue: p.revenue, trend: p.trend,
    stats: [
      { value: p.courses_per_week, label: "cours / semaine" },
      { value: p.rating_label, label: "note moyenne" },
      { value: p.new_students, label: "nouveaux élèves" },
    ],
    pendingRequests: pending,
    negotiable: t.negotiable,
  });
}));

// Le prof active/désactive l'option « à négocier » sur ses offres.
api.post("/teacher/negotiable", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  const negotiable = req.body?.negotiable === true || req.body?.negotiable === "true";
  const r = await pool.query(
    "UPDATE teachers SET negotiable=$2 WHERE id=$1 RETURNING negotiable", [teacherId, negotiable]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ok: true, negotiable: r.rows[0].negotiable });
}));

api.get("/teacher/requests", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  // Vraies réservations en attente de validation (parents -> ce prof).
  const live = await pool.query(
    `SELECT c.id AS "courseId", u.initials, 'green' AS accent, u.full_name AS name,
            'nouveau' AS ago, c.price, c.level AS student, c.subject,
            (c.day_label || ' ' || c.day_num || ' · ' || c.time) AS slot,
            CASE c.format WHEN 'online' THEN 'En ligne'
                          ELSE COALESCE(c.location, 'À domicile') END AS format,
            c.negotiable, c.proposed_price AS "proposedPrice", c.proposed_frequency AS "proposedFrequency",
            c.counter_price AS "counterPrice", c.counter_frequency AS "counterFrequency",
            c.negotiation_status AS "negotiationStatus"
     FROM courses c JOIN users u ON u.id = c.user_id
     WHERE c.teacher_id = $1 AND c.accepted = FALSE AND c.status = 'upcoming'
     ORDER BY c.id DESC`,
    [teacherId]
  );
  // Demandes de démonstration (sans cours réel rattaché : courseId nul).
  const seeded = await pool.query(
    `SELECT NULL::int AS "courseId", initials, accent, name, ago, price, student, subject, slot, format,
            FALSE AS negotiable, NULL::int AS "proposedPrice", NULL::text AS "proposedFrequency",
            NULL::int AS "counterPrice", NULL::text AS "counterFrequency", 'none' AS "negotiationStatus"
     FROM teacher_requests WHERE teacher_id=$1 ORDER BY ord, id`,
    [teacherId]
  );
  res.json([...live.rows, ...seeded.rows]);
}));

// Notifie le parent (auteur de la réservation) qu'une décision a été prise.
async function notifyParent(userId: number, icon: string, accent: string, text: string): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, icon, accent, text, time_ago, unread, section)
     VALUES ($1,$2,$3,$4,'à l''instant',TRUE,'today')`,
    [userId, icon, accent, text]
  );
}

// Validation d'une demande réelle : le prof accepte la réservation d'un parent.
api.post("/teacher/requests/:id/accept", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  // Si le client avait proposé un tarif (négociation), le prof l'accepte tel quel.
  const r = await pool.query(
    `UPDATE courses
        SET accepted = TRUE, badge = 'Confirmé',
            price = CASE WHEN negotiation_status = 'proposed' AND proposed_price IS NOT NULL
                         THEN proposed_price ELSE price END,
            negotiation_status = CASE WHEN negotiation_status = 'none' THEN 'none' ELSE 'accepted' END
      WHERE id = $1 AND teacher_id = $2 AND accepted = FALSE RETURNING id, user_id, subject`,
    [req.params.id, teacherId]
  );
  const c = r.rows[0];
  if (!c) { res.status(404).json({ error: "not_found" }); return; }
  await notifyParent(c.user_id, "seal", "green",
    `Votre demande de cours${c.subject ? ` de ${c.subject}` : ""} a été acceptée`);
  res.json({ ok: true, courseId: c.id });
}));

// Contre-proposition du prof : nouveau tarif et/ou fréquence soumis au client.
api.post("/teacher/requests/:id/counter", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  const price = optionalNumber(req.body, "price", { min: 0, max: 1_000_000 });
  const frequency = optionalString(req.body, "frequency", { max: 60 });
  if (price === undefined && frequency === undefined) {
    res.status(400).json({ error: "validation_error", message: "tarif ou fréquence requis" });
    return;
  }
  const r = await pool.query(
    `UPDATE courses
        SET counter_price = $3, counter_frequency = $4, negotiable = TRUE, negotiation_status = 'countered'
      WHERE id = $1 AND teacher_id = $2 AND accepted = FALSE AND status = 'upcoming'
      RETURNING id, user_id, subject`,
    [req.params.id, teacherId, price ?? null, frequency ?? null]
  );
  const c = r.rows[0];
  if (!c) { res.status(404).json({ error: "not_found" }); return; }
  await notifyParent(c.user_id, "wallet", "orange",
    `Le professeur vous fait une contre-proposition${c.subject ? ` pour ${c.subject}` : ""}`);
  res.json({ ok: true, courseId: c.id });
}));

// Refus d'une demande réelle : le prof décline la réservation (status='refused').
api.post("/teacher/requests/:id/refuse", wrap(async (req, res) => {
  const teacherId = await currentTeacherId(res);
  const r = await pool.query(
    `UPDATE courses SET status = 'refused', badge = 'Refusé'
     WHERE id = $1 AND teacher_id = $2 AND accepted = FALSE AND status = 'upcoming' RETURNING id, user_id, subject`,
    [req.params.id, teacherId]
  );
  const c = r.rows[0];
  if (!c) { res.status(404).json({ error: "not_found" }); return; }
  await notifyParent(c.user_id, "calendar", "orange",
    `Votre demande de cours${c.subject ? ` de ${c.subject}` : ""} n'a pas été retenue`);
  res.json({ ok: true, courseId: c.id });
}));

api.get("/teacher/earnings", wrap(async (_req, res) => {
  const teacherId = await currentTeacherId(res);
  const p = (await pool.query("SELECT * FROM teacher_profiles WHERE teacher_id=$1", [teacherId])).rows[0];
  if (!p) { res.status(404).json({ error: "not_found" }); return; }
  const weeks = (await pool.query(
    "SELECT label, fraction AS f FROM teacher_earning_weeks WHERE teacher_id=$1 ORDER BY ord, id", [teacherId]
  )).rows;
  const payouts = (await pool.query(
    `SELECT provider, payout_date AS date, amount, color
     FROM teacher_payouts WHERE teacher_id=$1 ORDER BY ord, id`, [teacherId]
  )).rows;
  res.json({
    total: p.earnings_total, trend: p.earnings_trend,
    weeks,
    stats: [
      { value: p.courses_given, label: "cours donnés" },
      { value: p.hours_taught, label: "enseignées" },
      { value: p.avg_per_hour, label: "F / h moyen" },
    ],
    payouts,
  });
}));

// ============================================================================ *
// ESPACE ADMINISTRATION (réservé au rôle `admin`)
// Gestion du catalogue (matières, niveaux) et des ressources pédagogiques.
// ============================================================================ *
const admin = Router();
admin.use(requireAdmin);

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
    `INSERT INTO resources (type, subject_slug, level, title, description,
                            file_name, mime_type, size_bytes, content, storage_key, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, type, subject_slug, level, title, description, file_name, mime_type, size_bytes, created_at`,
    [type, subjectSlug ?? null, level ?? null, title, description ?? null,
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
        type = $2, subject_slug = $3, level = $4, title = $5, description = $6,
        file_name = $7, mime_type = $8, size_bytes = $9, content = $10, storage_key = $11
     WHERE id = $1
     RETURNING id, type, subject_slug, level, title, description, file_name, mime_type, size_bytes, created_at`,
    [id, type, subjectSlug, level, title, description, outFileName, outMimeType, sizeBytes, content, storageKey]
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

  // Le document doit exister (slug connu : cgu | confidentialite | mentions-legales).
  const existing = (await pool.query("SELECT slug FROM legal_documents WHERE slug=$1", [req.params.slug])).rows[0];
  if (!existing) { res.status(404).json({ error: "not_found" }); return; }

  // Si un fichier est fourni, on le téléverse (MinIO, repli BYTEA).
  let setFile = "";
  const params: any[] = [req.params.slug, title ?? null, version ?? null];
  if (contentBase64) {
    const buffer = Buffer.from(contentBase64, "base64");
    const storageKey = await putFile(buffer, mimeType ?? null, fileName ?? null);
    const content = storageKey ? null : buffer;
    params.push(fileName ?? null, mimeType ?? null, buffer.length, content, storageKey);
    setFile = `, file_name=$4, mime_type=$5, size_bytes=$6, content=$7, storage_key=$8`;
  }
  const r = await pool.query(
    `UPDATE legal_documents
        SET title = COALESCE($2, title), version = COALESCE($3, version),
            updated_at = now(), updated_by = ${currentUserId(res)}${setFile}
      WHERE slug = $1
      RETURNING slug, title, version, file_name, size_bytes, updated_at`,
    params
  );
  res.json(r.rows[0]);
}));

// --- Paramètres plateforme : réseaux sociaux + contact (mise à jour groupée) ---
// Corps = objet { clé: valeur } ; seules les clés connues sont prises en compte.
admin.put("/settings", wrap(async (req, res) => {
  const b = req.body ?? {};
  const updates: [string, string][] = [];
  for (const key of SETTING_KEYS) {
    const v = optionalString(b, key, { max: 300 });
    if (v !== undefined) updates.push([key, v.trim()]);
  }
  for (const [key, value] of updates) {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at, updated_by)
       VALUES ($1,$2,now(),$3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
         updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [key, value, currentUserId(res)]
    );
  }
  const r = await pool.query("SELECT key, value FROM app_settings");
  const out: Record<string, string> = {};
  for (const k of SETTING_KEYS) out[k] = "";
  for (const row of r.rows) if (SETTING_KEYS.includes(row.key as any)) out[row.key] = row.value;
  res.json(out);
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

admin.post("/teachers", wrap(async (req, res) => {
  const b = req.body ?? {};
  const name = requiredString(b, "name", { max: 120 });
  const subjects = requiredString(b, "subjects", { max: 200 });
  const location = optionalString(b, "location", { max: 120 }) ?? "Abidjan";
  const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 }) ?? 4000;
  const rating = optionalNumber(b, "rating", { min: 0, max: 5 }) ?? 5.0;
  const reviewsCount = optionalNumber(b, "reviewsCount", { min: 0 }) ?? 0;
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
  const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const r = await pool.query(
    `INSERT INTO teachers (initials,name,subjects,rating,reviews_count,location,price_per_hour,
        experience,students,bac_success,bio,levels,formats,programs,distance_km,accent,verified,special_bepc,negotiable)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [initials, name, subjects, rating, reviewsCount, location, pricePerHour,
     experience ?? null, students ?? null, bacSuccess ?? null, bio ?? null,
     levels, formats, programs, distanceKm ?? null, accent, verified, specialBepc, negotiable]
  );
  res.status(201).json(r.rows[0]);
}));

admin.put("/teachers/:id", wrap(async (req, res) => {
  const b = req.body ?? {};
  const name = optionalString(b, "name", { max: 120 });
  const subjects = optionalString(b, "subjects", { max: 200 });
  const location = optionalString(b, "location", { max: 120 });
  const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 });
  const rating = optionalNumber(b, "rating", { min: 0, max: 5 });
  const reviewsCount = optionalNumber(b, "reviewsCount", { min: 0 });
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
  const r = await pool.query(
    `UPDATE teachers SET
        name = COALESCE($2,name), subjects = COALESCE($3,subjects), location = COALESCE($4,location),
        price_per_hour = COALESCE($5,price_per_hour), rating = COALESCE($6,rating),
        reviews_count = COALESCE($7,reviews_count), accent = COALESCE($8,accent),
        experience = COALESCE($9,experience), students = COALESCE($10,students),
        bac_success = COALESCE($11,bac_success), bio = COALESCE($12,bio),
        levels = COALESCE($13,levels), formats = COALESCE($14,formats),
        distance_km = COALESCE($15,distance_km), verified = COALESCE($16,verified),
        special_bepc = COALESCE($17,special_bepc),
        programs = COALESCE($18,programs), negotiable = COALESCE($19,negotiable)
     WHERE id = $1 RETURNING *`,
    [req.params.id, name ?? null, subjects ?? null, location ?? null, pricePerHour ?? null,
     rating ?? null, reviewsCount ?? null, accent ?? null, experience ?? null, students ?? null,
     bacSuccess ?? null, bio ?? null, levels ?? null, formats ?? null, distanceKm ?? null,
     verified ?? null, specialBepc ?? null, programs ?? null, negotiable ?? null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json(r.rows[0]);
}));

admin.delete("/teachers/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM teachers WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
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
  const r = await pool.query(
    `INSERT INTO group_courses (tag,tag_accent,price,title,detail,teacher_initials,teacher_name,teacher_accent,enrolled,capacity,places_left)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [tag, tagAccent, price, title, detail, teacherInitials ?? null, teacherName ?? null,
     teacherAccent, enrolled ?? null, capacity ?? null, placesLeft ?? null]
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
  const r = await pool.query(
    `UPDATE group_courses SET
        tag = COALESCE($2,tag), tag_accent = COALESCE($3,tag_accent), price = COALESCE($4,price),
        title = COALESCE($5,title), detail = COALESCE($6,detail),
        teacher_initials = COALESCE($7,teacher_initials), teacher_name = COALESCE($8,teacher_name),
        teacher_accent = COALESCE($9,teacher_accent), enrolled = COALESCE($10,enrolled),
        capacity = COALESCE($11,capacity), places_left = COALESCE($12,places_left)
     WHERE id = $1 RETURNING *`,
    [req.params.id, tag ?? null, tagAccent ?? null, price ?? null, title ?? null, detail ?? null,
     teacherInitials ?? null, teacherName ?? null, teacherAccent ?? null,
     enrolled ?? null, capacity ?? null, placesLeft ?? null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json(r.rows[0]);
}));

admin.delete("/groups/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM group_courses WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

registerTeacherApplicationRoutes(api, admin, { wrap, serveFile, consentVersion: CONSENT_VERSION });

api.use("/admin", admin);

// -------------------------------------------------------------------- Parrainage
api.get("/referral", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT code, referred, earned FROM referrals WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
    [currentUserId(res)]
  );
  res.json(r.rows[0] ?? { code: "AYA2026", referred: 0, earned: 0 });
}));
