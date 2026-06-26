import { Router } from "express";
import { pool } from "./db";
import { ValidationError, optionalString, optionalPhone, optionalEnum, optionalNumber, requiredString, requiredEnum } from "./validate";
import { optionalAuth, currentUserId, signJwt, requireAdmin, DEMO_USER } from "./auth";

export const api = Router();

// Résout l'utilisateur courant (token JWT) ou retombe sur DEMO_USER (rétrocompat).
api.use(optionalAuth);

const ROLES = ["parent", "student", "teacher"] as const;

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
  const initials = (fullName ?? "Aya Koné").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const r = await pool.query(
    `INSERT INTO users (full_name, phone, role, initials) VALUES ($1,$2,$3,$4)
     ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING *`,
    [fullName ?? "Aya Koné", phone ?? "+2250758421903", role ?? "parent", initials]
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
  const sql = `SELECT id, type, subject_slug, level, title, description,
                      file_name, mime_type, size_bytes, created_at
               FROM resources ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY created_at DESC, id DESC`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

// Télécharge le fichier d'une ressource (flux binaire avec son type MIME).
api.get("/files/:id", wrap(async (req, res) => {
  const r = await pool.query("SELECT file_name, mime_type, content FROM resources WHERE id=$1", [req.params.id]);
  const row = r.rows[0];
  if (!row || !row.content) { res.status(404).json({ error: "not_found" }); return; }
  res.setHeader("Content-Type", row.mime_type ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${row.file_name ?? "fichier"}"`);
  res.send(row.content);
}));

// ------------------------------------------------------------------ Professeurs
api.get("/teachers", wrap(async (req, res) => {
  const { format, level } = req.query;
  const params: any[] = [];
  const where: string[] = [];
  if (format) { params.push(format); where.push(`$${params.length} = ANY(formats)`); }
  if (level)  { params.push(level);  where.push(`$${params.length} = ANY(levels)`); }
  const sql = `SELECT id, initials, name, subjects, rating, reviews_count, location,
                      price_per_hour, distance_km, accent, verified, special_bepc, formats
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
  const r = await pool.query(
    `INSERT INTO courses (user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,location,price,status,badge)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'upcoming',$13) RETURNING *`,
    [currentUserId(res), teacherId ?? 1, teacherName ?? "Koffi N'Guessan", subject ?? "Maths", level ?? "3ᵉ",
     dayLabel ?? "SAM", dayNum ?? "22", time ?? "16h00", duration ?? "1h30",
     format ?? "home", location ?? "À domicile, Cocody", price ?? 6000, "Nouveau"]
  );
  res.status(201).json({ reference: "AKW-" + (2000 + r.rows[0].id), course: r.rows[0] });
}));

// ----------------------------------------------------------------- Notifications
api.get("/notifications", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT icon, accent, text, time_ago, unread, section FROM notifications WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json(r.rows);
}));

// ------------------------------------------------------------------ Portefeuille
api.get("/wallet", wrap(async (_req, res) => {
  const tx = await pool.query(
    "SELECT title, subtitle, amount, credit FROM transactions WHERE user_id=$1 ORDER BY id",
    [currentUserId(res)]
  );
  res.json({
    accounts: [
      { provider: "Orange Money", number: "07 ** ** ** 42", color: "orange", isDefault: true },
      { provider: "Wave", number: "05 ** ** ** 11", color: "wave", isDefault: false },
    ],
    transactions: tx.rows,
  });
}));

// ----------------------------------------------------------------- Cours groupe
api.get("/groups", wrap(async (_req, res) => {
  const r = await pool.query("SELECT * FROM group_courses ORDER BY id");
  res.json(r.rows);
}));

api.get("/groups/:id", wrap(async (req, res) => {
  const r = await pool.query("SELECT * FROM group_courses WHERE id=$1", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({
    ...r.rows[0],
    program: ["Fonctions, limites & continuité", "Probabilités & suites", "Annales & sujets type BAC"],
  });
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
    goal: "Objectif BEPC : 14/20 — vous y êtes presque !",
    subjects: subs.rows,
  });
}));

// --------------------------------------------------------------- Espace prof
api.get("/teacher/dashboard", wrap(async (_req, res) => {
  res.json({
    name: "Koffi N'Guessan", revenue: 184000, trend: "+12%",
    stats: [{ value: "14", label: "cours / semaine" }, { value: "4,9", label: "note moyenne" }, { value: "3", label: "nouveaux élèves" }],
    pendingRequests: 3,
  });
}));

api.get("/teacher/requests", wrap(async (_req, res) => {
  res.json([
    { initials: "FB", accent: "green", name: "Fatou Bamba", ago: "il y a 1 h", price: 6000, student: "Awa · 2nde", subject: "Mathématiques", slot: "Sam. 28 juin · 15h00", format: "À domicile · Marcory" },
    { initials: "YK", accent: "orange", name: "Yao Kouamé", ago: "il y a 3 h", price: 4000, student: "Junior · 3ᵉ", subject: "Physique-Chimie", slot: "Dim. 29 juin · 10h00", format: "En ligne" },
  ]);
}));

api.get("/teacher/earnings", wrap(async (_req, res) => {
  res.json({
    total: 184000, trend: "+12%",
    weeks: [{ label: "S1", f: 0.48 }, { label: "S2", f: 0.66 }, { label: "S3", f: 0.58 }, { label: "S4", f: 0.88 }],
    stats: [{ value: "38", label: "cours donnés" }, { value: "52 h", label: "enseignées" }, { value: "3 800", label: "F / h moyen" }],
    payouts: [
      { provider: "Retrait Wave", date: "15 juin", amount: 60000, color: "wave" },
      { provider: "Retrait Orange Money", date: "1 juin", amount: 80000, color: "orange" },
    ],
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
  const content = contentBase64 ? Buffer.from(contentBase64, "base64") : null;
  const r = await pool.query(
    `INSERT INTO resources (type, subject_slug, level, title, description,
                            file_name, mime_type, size_bytes, content, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, type, subject_slug, level, title, description, file_name, mime_type, size_bytes, created_at`,
    [type, subjectSlug ?? null, level ?? null, title, description ?? null,
     fileName ?? null, mimeType ?? null, content?.length ?? null, content, currentUserId(res)]
  );
  res.status(201).json(r.rows[0]);
}));

admin.delete("/resources/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM resources WHERE id=$1 RETURNING id", [req.params.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).end();
}));

api.use("/admin", admin);

// -------------------------------------------------------------------- Parrainage
api.get("/referral", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT code, referred, earned FROM referrals WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
    [currentUserId(res)]
  );
  res.json(r.rows[0] ?? { code: "AYA2026", referred: 0, earned: 0 });
}));
