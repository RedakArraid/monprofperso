import type { PoolClient } from "pg";
import { pool } from "./db";
import { AuthError, currentUserId } from "./auth";
import { ValidationError, requiredString } from "./validate";

export type Actor = { id: number; role: string; teacherId: number | null };
export type Queryable = Pick<PoolClient, "query">;
export const TERMINAL_COURSE_STATES = ["completed", "cancelled", "refused"];

export function actorFromResponse(res: any): Actor {
  return { id: currentUserId(res), role: res.locals.userRole, teacherId: res.locals.teacherId ?? null };
}

export function integer(value: unknown, field: string, min = 1, max = 20_000_000): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new ValidationError(field, `${field} doit être un entier entre ${min} et ${max}`);
  return n;
}

export function futureDate(value: unknown, field = "startAt"): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new ValidationError(field, "date et heure ISO avec fuseau requises");
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new ValidationError(field, "le créneau doit être futur");
  return date;
}

export function dateLabels(date: Date) {
  const timeZone = "Africa/Abidjan";
  return {
    dayLabel: new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone }).format(date).replace(".", "").toUpperCase(),
    dayNum: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone }).format(date),
    time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date),
  };
}

export async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function courseParty(course: any, actor: Actor): "admin" | "parent" | "teacher" {
  if (actor.role === "admin") return "admin";
  if (course.user_id === actor.id) return "parent";
  if (actor.role === "teacher" && actor.teacherId === course.teacher_id) return "teacher";
  throw new AuthError(404, "not_found", "Cours introuvable");
}

/** Tous les workflows métier prennent le verrou professeur avant le cours.
 * Ce même ordre sérialise planning, règlement, remboursements et reversements. */
export async function lockCourse(client: PoolClient, id: number, actor?: Actor): Promise<any> {
  if (actor) {
    const user = (await client.query("SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR SHARE", [actor.id])).rows[0];
    if (!user) throw new AuthError(401, "account_unavailable", "Compte indisponible");
  }
  const initial = (await client.query("SELECT teacher_id FROM courses WHERE id=$1", [id])).rows[0];
  if (!initial) throw new AuthError(404, "not_found", "Cours introuvable");
  if (initial.teacher_id) await client.query("SELECT id FROM teachers WHERE id=$1 FOR UPDATE", [initial.teacher_id]);
  const course = (await client.query("SELECT * FROM courses WHERE id=$1 FOR UPDATE", [id])).rows[0];
  if (!course) throw new AuthError(404, "not_found", "Cours introuvable");
  if (actor) courseParty(course, actor);
  return course;
}

export async function assertSlotFree(client: PoolClient, course: any, start: Date): Promise<void> {
  const duration = integer(course.duration_minutes, "durationMinutes", 15, 1440);
  const conflict = await client.query(
    `SELECT id FROM courses WHERE teacher_id=$1 AND id<>$2 AND accepted=TRUE
      AND lifecycle_status IN ('scheduled','completion_pending','disputed')
      AND starts_at < $3::timestamptz + ($4 * interval '1 minute')
      AND starts_at + (COALESCE(duration_minutes,90) * interval '1 minute') > $3::timestamptz LIMIT 1`,
    [course.teacher_id, course.id ?? 0, start, duration],
  );
  if (conflict.rowCount) throw new AuthError(409, "slot_unavailable", "Ce créneau est déjà réservé pour ce professeur");
}

export async function snapshotCommission(client: Queryable, amount: number, agreedPct?: number | null) {
  const configured = agreedPct == null ? (await client.query("SELECT value FROM app_settings WHERE key='commission_pct'")).rows[0]?.value : String(agreedPct);
  const stored = configured == null || !String(configured).trim() ? NaN : Number(configured);
  if (!Number.isFinite(stored) || stored < 0 || stored > 100 || Math.round(stored * 100) / 100 !== stored) {
    throw new AuthError(409, "commission_unconfigured", "La commission doit être configurée avant de proposer un prix");
  }
  const pct = Math.round(stored * 100) / 100;
  const net = Math.round(amount * (1 - pct / 100));
  return { pct, commission: amount - net, net };
}

export async function courseEvent(client: Queryable, courseId: number, actor: Actor | null, type: string, details: Record<string, unknown> = {}) {
  await client.query(
    "INSERT INTO course_events(course_id,actor_id,actor_role,event_type,details) VALUES ($1,$2,$3,$4,$5)",
    [courseId, actor?.id ?? null, actor?.role ?? "system", type, JSON.stringify(details)],
  );
}

export async function notifyCourseParties(client: Queryable, course: any, message: string, exceptUserId?: number) {
  await client.query(
    `INSERT INTO notifications(user_id,icon,accent,text,time_ago,unread,section)
      SELECT u.id,'calendar','green',$3,'à l''instant',TRUE,'today' FROM users u
      WHERE (u.id=$1 OR (u.teacher_id=$2 AND u.role='teacher')) AND u.id<>$4`,
    [course.user_id, course.teacher_id, message, exceptUserId ?? 0],
  );
}

export function idempotencyKey(body: any): string {
  const key = requiredString(body, "idempotencyKey", { max: 100 });
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new ValidationError("idempotencyKey", "clé stable de 8 à 100 lettres, chiffres, tirets requise");
  return key;
}

export function requireOnlineEnabled(format: string): void {
  if (format === "online" && process.env.ONLINE_COURSES_ENABLED !== "true") {
    throw new AuthError(409, "online_courses_unavailable", "Les cours en ligne ne sont pas ouverts actuellement");
  }
}

export const businessWrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) => {
  fn(req, res).catch((error: any) => {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "validation_error", field: error.field, message: error.message }); return;
    }
    if (error instanceof AuthError || (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600)) {
      const amount = Number.isSafeInteger(error.platformLossAmount) ? { platformLossAmount: error.platformLossAmount } : {};
      res.status(error.statusCode).json({ error: error.code ?? "operation_failed", message: error.message, ...amount }); return;
    }
    if (error.code === "23505") {
      res.status(409).json({ error: "conflict", message: "Une opération identique existe déjà ; rechargez son état" }); return;
    }
    console.error(`[${req.method} ${req.path}]`, error);
    res.status(500).json({ error: "internal_error", message: "Erreur interne" });
  });
};
