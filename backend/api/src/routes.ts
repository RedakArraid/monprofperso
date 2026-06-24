import { Router } from "express";
import { pool } from "./db";
import { ValidationError, optionalString, optionalPhone, optionalEnum, optionalNumber } from "./validate";

export const api = Router();

// Utilisateur de démonstration (la maquette est mono-utilisateur).
const DEMO_USER = 1;

const ROLES = ["parent", "student", "teacher"] as const;

const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) =>
  fn(req, res).catch((e: any) => {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: "validation_error", field: e.field, message: e.message });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "internal_error", message: String(e?.message ?? e) });
  });

// ---------------------------------------------------------------- Auth (mock)
api.post("/auth/login", wrap(async (req, res) => {
  const phone = optionalPhone(req.body);
  const r = await pool.query("SELECT * FROM users WHERE phone = $1", [phone ?? "+2250758421903"]);
  const user = r.rows[0] ?? (await pool.query("SELECT * FROM users WHERE id=$1", [DEMO_USER])).rows[0];
  res.json({ token: "demo-token", user });
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
  res.json({ token: "demo-token", user: r.rows[0] });
}));

api.post("/auth/verify-otp", wrap(async (_req, res) => {
  res.json({ token: "demo-token", verified: true });
}));

api.get("/me", wrap(async (_req, res) => {
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [DEMO_USER]);
  res.json(r.rows[0]);
}));

// -------------------------------------------------------------------- Matières
api.get("/subjects", wrap(async (_req, res) => {
  const r = await pool.query("SELECT slug, name, icon, accent FROM subjects ORDER BY id");
  res.json(r.rows);
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
  const params: any[] = [DEMO_USER];
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
    [DEMO_USER, teacherId ?? 1, teacherName ?? "Koffi N'Guessan", subject ?? "Maths", level ?? "3ᵉ",
     dayLabel ?? "SAM", dayNum ?? "22", time ?? "16h00", duration ?? "1h30",
     format ?? "home", location ?? "À domicile, Cocody", price ?? 6000, "Nouveau"]
  );
  res.status(201).json({ reference: "AKW-" + (2000 + r.rows[0].id), course: r.rows[0] });
}));

// ----------------------------------------------------------------- Notifications
api.get("/notifications", wrap(async (_req, res) => {
  const r = await pool.query(
    "SELECT icon, accent, text, time_ago, unread, section FROM notifications WHERE user_id=$1 ORDER BY id",
    [DEMO_USER]
  );
  res.json(r.rows);
}));

// ------------------------------------------------------------------ Portefeuille
api.get("/wallet", wrap(async (_req, res) => {
  const tx = await pool.query(
    "SELECT title, subtitle, amount, credit FROM transactions WHERE user_id=$1 ORDER BY id",
    [DEMO_USER]
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
  res.json({
    plan: "Régulier", status: "active", detail: "2 cours par semaine · Prof attitré Koffi",
    nextCharge: "1 juil.", nextAmount: 26000, used: 5, total: 8,
  });
}));

// --------------------------------------------------------------------- Progrès
api.get("/progress", wrap(async (_req, res) => {
  const subs = await pool.query(
    "SELECT subject, grade, fraction, warn FROM progress_subjects WHERE user_id=$1 ORDER BY id",
    [DEMO_USER]
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

// -------------------------------------------------------------------- Parrainage
api.get("/referral", wrap(async (_req, res) => {
  res.json({ code: "AYA2026", referred: 3, earned: 6000 });
}));
