import { Router } from "express";
import { pool } from "./db";
import { ValidationError, optionalString, optionalNumber, optionalEnum, requiredString, requiredEnum } from "./validate";
import { currentUserId } from "./auth";

const NEED_STATUSES = ["submitted", "priced", "published", "matched", "cancelled"] as const;
const FORMATS = ["home", "online"] as const;
const GENDERS = ["garcon", "fille"] as const;

export async function getCommissionPct(): Promise<number> {
  const r = await pool.query("SELECT value FROM app_settings WHERE key = 'commission_pct'");
  const v = parseFloat(r.rows[0]?.value ?? "15");
  return Number.isFinite(v) ? v : 15;
}

export function parseDurationHours(duration: string | null | undefined): number {
  if (!duration) return 1;
  const m = String(duration).match(/(\d+(?:[.,]\d+)?)\s*h/i);
  if (m) return Math.max(0.25, parseFloat(m[1].replace(",", ".")));
  if (/30\s*min/i.test(duration)) return 0.5;
  return 1;
}

export function computeNetAmounts(parentPrice: number, commissionPct: number, duration: string | null | undefined) {
  const netTeacherAmount = Math.round(parentPrice * (1 - commissionPct / 100));
  const hours = parseDurationHours(duration);
  const netTeacherHourly = Math.round(netTeacherAmount / hours);
  return { netTeacherAmount, netTeacherHourly, commissionPct };
}

function needRef(id: number): string {
  return `BES-${2000 + id}`;
}

function mapChild(row: any) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    gender: row.gender,
    school: row.school,
    program: row.program,
    createdAt: row.created_at,
  };
}

function mapNeed(row: any, child?: any) {
  return {
    id: row.id,
    reference: needRef(row.id),
    childId: row.child_id,
    child: child ?? null,
    subject: row.subject,
    level: row.level,
    format: row.format,
    location: row.location,
    frequency: row.frequency,
    duration: row.duration,
    availabilityWeek: row.availability_week,
    availabilityWeekend: row.availability_weekend,
    availabilityHolidays: row.availability_holidays,
    description: row.description,
    parentPrice: row.parent_price,
    commissionPct: row.commission_pct != null ? Number(row.commission_pct) : null,
    netTeacherAmount: row.net_teacher_amount,
    netTeacherHourly: row.net_teacher_hourly,
    status: row.status,
    teacherId: row.teacher_id,
    courseId: row.course_id,
    startDate: row.start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentName: row.parent_name ?? null,
    parentPhone: row.parent_phone ?? null,
    childName: row.child_name ?? child?.name ?? null,
    childGender: row.child_gender ?? child?.gender ?? null,
  };
}

function mapOpportunity(row: any) {
  return {
    needId: row.id,
    reference: needRef(row.id),
    location: row.location ?? (row.format === "online" ? "En ligne" : "À domicile"),
    subject: row.subject,
    level: row.level,
    student: row.child_name ? `${row.child_name} · ${row.level}` : row.level,
    gender: row.child_gender,
    frequency: row.frequency,
    duration: row.duration,
    format: row.format === "online" ? "En ligne" : row.location ?? "À domicile",
    netAmount: row.net_teacher_amount,
    netHourly: row.net_teacher_hourly,
    availabilityWeek: row.availability_week,
    availabilityWeekend: row.availability_weekend,
    availabilityHolidays: row.availability_holidays,
    startDate: row.start_date,
    description: row.description,
    ago: "nouveau",
  };
}

async function loadNeed(id: number) {
  const r = await pool.query(
    `SELECT n.*, u.full_name AS parent_name, c.name AS child_name, c.gender AS child_gender
       FROM course_needs n
       LEFT JOIN users u ON u.id = n.user_id
       LEFT JOIN children c ON c.id = n.child_id
      WHERE n.id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
}

async function notifyUser(userId: number, icon: string, accent: string, text: string): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, icon, accent, text, time_ago, unread, section)
     VALUES ($1,$2,$3,$4,'à l''instant',TRUE,'today')`,
    [userId, icon, accent, text],
  );
}

const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) =>
  fn(req, res).catch((e: any) => {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: "validation_error", field: e.field, message: e.message });
      return;
    }
    console.error(`[${req.method} ${req.originalUrl}]`, e);
    res.status(500).json({ error: "internal_error", message: "erreur interne" });
  });

export async function acceptNeedForTeacher(needId: number, teacherId: number): Promise<{ needId: number; courseId: number } | null> {
  const teacher = (await pool.query(
    "SELECT name, needs_confirmed FROM teachers WHERE id=$1",
    [teacherId],
  )).rows[0];
  if (!teacher || !teacher.needs_confirmed) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const needR = await client.query(
      `SELECT * FROM course_needs
        WHERE id = $1 AND status = 'published' AND teacher_id IS NULL
        FOR UPDATE`,
      [needId],
    );
    const need = needR.rows[0];
    if (!need) {
      await client.query("ROLLBACK");
      return null;
    }

    const courseR = await client.query(
      `INSERT INTO courses (
         user_id, teacher_id, teacher_name, subject, level,
         day_label, day_num, time, duration, format, location,
         price, status, badge, accepted, payment_status
       ) VALUES ($1,$2,$3,$4,$5,'—','—','—',$6,$7,$8,$9,'upcoming','Confirmé',TRUE,'pending')
       RETURNING id`,
      [need.user_id, teacherId, teacher.name, need.subject, need.level,
        need.duration ?? "1h30", need.format, need.location, need.parent_price],
    );
    const courseId = courseR.rows[0].id;

    await client.query(
      `UPDATE course_needs
          SET status = 'matched', teacher_id = $2, course_id = $3, matched_at = now(), updated_at = now()
        WHERE id = $1`,
      [need.id, teacherId, courseId],
    );
    await client.query("COMMIT");

    await notifyUser(need.user_id, "seal", "green",
      `Un professeur a accepté votre besoin en ${need.subject}. Réf. ${needRef(need.id)}`);

    return { needId: need.id, courseId };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function registerNeedsRoutes(api: Router): void {
  // --- Enfants (parent) ---
  api.get("/children", wrap(async (_req, res) => {
    const r = await pool.query(
      "SELECT * FROM children WHERE user_id = $1 ORDER BY id",
      [currentUserId(res)],
    );
    res.json(r.rows.map(mapChild));
  }));

  api.post("/children", wrap(async (req, res) => {
    const name = requiredString(req.body, "name", { max: 120 });
    const level = requiredString(req.body, "level", { max: 40 });
    const gender = optionalEnum(req.body, "gender", GENDERS);
    const school = optionalString(req.body, "school", { max: 120 });
    const program = optionalString(req.body, "program", { max: 40 }) ?? "standard";
    const r = await pool.query(
      `INSERT INTO children (user_id, name, level, gender, school, program)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [currentUserId(res), name, level, gender ?? null, school ?? null, program],
    );
    res.status(201).json(mapChild(r.rows[0]));
  }));

  api.put("/children/:id", wrap(async (req, res) => {
    const name = requiredString(req.body, "name", { max: 120 });
    const level = requiredString(req.body, "level", { max: 40 });
    const gender = optionalEnum(req.body, "gender", GENDERS);
    const school = optionalString(req.body, "school", { max: 120 });
    const program = optionalString(req.body, "program", { max: 40 }) ?? "standard";
    const r = await pool.query(
      `UPDATE children SET name=$3, level=$4, gender=$5, school=$6, program=$7
        WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, currentUserId(res), name, level, gender ?? null, school ?? null, program],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
    res.json(mapChild(r.rows[0]));
  }));

  api.delete("/children/:id", wrap(async (req, res) => {
    const r = await pool.query(
      "DELETE FROM children WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, currentUserId(res)],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ok: true });
  }));

  // --- Besoins (parent) ---
  api.get("/needs", wrap(async (_req, res) => {
    const r = await pool.query(
      `SELECT n.*, c.name AS child_name, c.gender AS child_gender
         FROM course_needs n
         LEFT JOIN children c ON c.id = n.child_id
        WHERE n.user_id = $1
        ORDER BY n.id DESC`,
      [currentUserId(res)],
    );
    res.json(r.rows.map((row) => mapNeed(row, row.child_id ? { name: row.child_name, gender: row.child_gender } : null)));
  }));

  api.post("/needs", wrap(async (req, res) => {
    const b = req.body ?? {};
    const childId = optionalNumber(b, "childId", { min: 1 });
    const subject = requiredString(b, "subject", { max: 80 });
    const level = requiredString(b, "level", { max: 40 });
    const format = requiredEnum(b, "format", FORMATS);
    const location = optionalString(b, "location", { max: 200 });
    const frequency = optionalString(b, "frequency", { max: 60 });
    const duration = optionalString(b, "duration", { max: 20 });
    const description = optionalString(b, "description", { max: 2000 });
    const availabilityWeek = b.availabilityWeek !== false;
    const availabilityWeekend = b.availabilityWeekend === true || b.availabilityWeekend === "true";
    const availabilityHolidays = b.availabilityHolidays === true || b.availabilityHolidays === "true";

    if (childId) {
      const c = await pool.query(
        "SELECT id FROM children WHERE id=$1 AND user_id=$2",
        [childId, currentUserId(res)],
      );
      if (!c.rows[0]) throw new ValidationError("childId", "enfant introuvable");
    }

    const r = await pool.query(
      `INSERT INTO course_needs (
         user_id, child_id, subject, level, format, location, frequency, duration,
         availability_week, availability_weekend, availability_holidays, description, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'submitted')
       RETURNING *`,
      [currentUserId(res), childId ?? null, subject, level, format, location ?? null,
        frequency ?? null, duration ?? null, availabilityWeek, availabilityWeekend,
        availabilityHolidays, description ?? null],
    );
    const row = await loadNeed(r.rows[0].id);
    res.status(201).json(mapNeed(row));
  }));

  api.post("/needs/:id/accept-price", wrap(async (req, res) => {
    const r = await pool.query(
      `UPDATE course_needs
          SET status = 'published', parent_accepted_at = now(), updated_at = now()
        WHERE id = $1 AND user_id = $2 AND status = 'priced'
        RETURNING *`,
      [req.params.id, currentUserId(res)],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
    const row = await loadNeed(r.rows[0].id);
    res.json(mapNeed(row));
  }));

  api.post("/needs/:id/cancel", wrap(async (req, res) => {
    const r = await pool.query(
      `UPDATE course_needs SET status = 'cancelled', updated_at = now()
        WHERE id = $1 AND user_id = $2 AND status IN ('submitted', 'priced', 'published')
        RETURNING id`,
      [req.params.id, currentUserId(res)],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ok: true });
  }));

  // --- Offres pour les profs (gains nets affichés) ---
  api.get("/teacher/opportunities", wrap(async (_req, res) => {
    const userId = currentUserId(res);
    const u = await pool.query("SELECT teacher_id FROM users WHERE id=$1", [userId]);
    const teacherId = (u.rows[0]?.teacher_id as number | null) ?? 1;
    const t = await pool.query("SELECT needs_confirmed FROM teachers WHERE id=$1", [teacherId]);
    if (!t.rows[0]?.needs_confirmed) {
      res.json([]);
      return;
    }
    const r = await pool.query(
      `SELECT n.*, c.name AS child_name, c.gender AS child_gender
         FROM course_needs n
         LEFT JOIN children c ON c.id = n.child_id
        WHERE n.status = 'published' AND n.teacher_id IS NULL
        ORDER BY n.id DESC`,
    );
    res.json(r.rows.map(mapOpportunity));
  }));

  api.post("/teacher/opportunities/:id/accept", wrap(async (req, res) => {
    const teacherId = await (async () => {
      const r = await pool.query("SELECT teacher_id FROM users WHERE id=$1", [currentUserId(res)]);
      return (r.rows[0]?.teacher_id as number | null) ?? 1;
    })();

    const confirmed = (await pool.query(
      "SELECT needs_confirmed FROM teachers WHERE id=$1",
      [teacherId],
    )).rows[0]?.needs_confirmed;
    if (!confirmed) {
      res.status(403).json({
        error: "needs_not_confirmed",
        message: "Votre accès aux offres sera activé après validation par l'équipe.",
      });
      return;
    }

    const result = await acceptNeedForTeacher(Number(req.params.id), teacherId);
    if (!result) { res.status(404).json({ error: "not_found", message: "offre indisponible" }); return; }
    res.json({ ok: true, ...result });
  }));

  // --- Admin (monté sur le routeur /admin dans routes.ts) ---
}

export function registerAdminNeedsRoutes(admin: Router): void {
  admin.get("/needs", wrap(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const params: any[] = [];
    let sql = `SELECT n.*, u.full_name AS parent_name, u.phone AS parent_phone,
                      c.name AS child_name, c.gender AS child_gender
                 FROM course_needs n
                 JOIN users u ON u.id = n.user_id
                 LEFT JOIN children c ON c.id = n.child_id`;
    if (status) {
      params.push(status);
      sql += ` WHERE n.status = $${params.length}`;
    }
    sql += " ORDER BY n.id DESC";
    const r = await pool.query(sql, params);
    res.json(r.rows.map((row) => mapNeed(row)));
  }));

  admin.put("/needs/:id/price", wrap(async (req, res) => {
    const parentPrice = requiredNumber(req.body, "parentPrice", { min: 1000, max: 1_000_000 });
    const frequency = optionalString(req.body, "frequency", { max: 60 });
    const startDate = optionalString(req.body, "startDate", { max: 20 });
    const commissionPct = await getCommissionPct();
    const need = await loadNeed(Number(req.params.id));
    if (!need || need.status !== "submitted") {
      res.status(404).json({ error: "not_found", message: "besoin introuvable ou déjà traité" });
      return;
    }
    const duration = frequency ? need.duration : need.duration;
    const { netTeacherAmount, netTeacherHourly } = computeNetAmounts(parentPrice, commissionPct, need.duration);

    const r = await pool.query(
      `UPDATE course_needs
          SET parent_price = $2, commission_pct = $3,
              net_teacher_amount = $4, net_teacher_hourly = $5,
              frequency = COALESCE($6, frequency),
              start_date = COALESCE($7::date, start_date),
              status = 'priced', priced_at = now(), priced_by = $8, updated_at = now()
        WHERE id = $1 AND status = 'submitted'
        RETURNING *`,
      [req.params.id, parentPrice, commissionPct, netTeacherAmount, netTeacherHourly,
        frequency ?? null, startDate ?? null, currentUserId(res)],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }

    await notifyUser(r.rows[0].user_id, "tag", "orange",
      `Tarif proposé pour votre besoin ${needRef(r.rows[0].id)} : ${parentPrice.toLocaleString("fr-FR")} F/séance`);

    const row = await loadNeed(r.rows[0].id);
    res.json(mapNeed(row));
  }));
}

function requiredNumber(body: any, field: string, opts?: { min?: number; max?: number }): number {
  const v = optionalNumber(body, field, opts);
  if (v === undefined) throw new ValidationError(field, `${field} requis`);
  return v;
}
