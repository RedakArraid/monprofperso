import { Router, type Request, type Response, type NextFunction } from "express";
import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { AuthError, currentUserId, requireAdmin, requireAuth, requireRecentAuth } from "./auth";
import { currentLegalConsent, validateConsentVersion } from "./consent";
import { getFileStream, deleteFileStrict } from "./storage";
import { getOtpChannels } from "./otp";

type Db = Pick<PoolClient, "query">;
export interface DeletionBlocker { code: string; message: string; count?: number }
const router = Router();
export const accountRouter = router;
const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    fn(req, res).catch((error) => {
      if (error instanceof AuthError) res.status(error.statusCode).json({ error: error.code, message: error.message });
      else next(error);
    });
  };

async function lockAccountForClosure(db: Db, userId: number) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('monprofperso:account-closure'))");
  const before = (await db.query("SELECT teacher_id FROM users WHERE id=$1", [userId])).rows[0];
  if (before?.teacher_id) await db.query("SELECT id FROM teachers WHERE id=$1 FOR UPDATE /* account-closure-teacher */", [before.teacher_id]);
  const user = (await db.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId])).rows[0];
  if (user && user.teacher_id !== before?.teacher_id)
    throw new AuthError(409, "account_changed", "Le rattachement du compte a changé. Réessayez la demande.");
  return user;
}

router.get("/account/consent", requireAuth, wrap(async (_req, res) => {
  const legal = await currentLegalConsent();
  const user = (await pool.query("SELECT consent_version,consent_at FROM users WHERE id=$1", [currentUserId(res)])).rows[0];
  res.json({ version: legal.version, documents: legal.documents, accepted: user?.consent_version === legal.version && Boolean(user?.consent_at) });
}));
router.post("/account/consent", requireAuth, wrap(async (req, res) => {
  if (req.body?.consent !== true) throw new AuthError(400, "consent_required", "Votre accord explicite est requis.");
  const version = await validateConsentVersion(req.body?.consentVersion);
  if (res.locals.userRole === "student" && req.body?.parentalConsent !== true)
    throw new AuthError(400, "parental_consent_required", "L'accord du responsable légal est requis pour le compte élève.");
  await pool.query(`UPDATE users SET consent_version=$2,consent_at=now(),parental_consent=$3
    WHERE id=$1 AND deleted_at IS NULL`, [currentUserId(res), version, req.body?.parentalConsent === true]);
  const latest = await currentLegalConsent();
  res.json({ version: latest.version, documents: latest.documents, accepted: version === latest.version });
}));

const payload = (row: any) => row ? {
  id: row.id, status: row.status, requestedAt: row.requested_at,
  completedAt: row.completed_at, cancelledAt: row.cancelled_at,
} : null;

export async function deletionBlockers(db: Db, userId: number): Promise<DeletionBlocker[]> {
  const user = (await db.query("SELECT id,role,teacher_id,deleted_at FROM users WHERE id=$1", [userId])).rows[0];
  if (!user || user.deleted_at) return [];
  const result: DeletionBlocker[] = [];
  const count = async (sql: string, args: unknown[]) => Number((await db.query(sql, args)).rows[0].count);
  if (user.role === "admin" && await count("SELECT count(*) FROM users WHERE role='admin' AND deleted_at IS NULL", []) < 2) {
    result.push({ code: "last_administrator", message: "Confiez l'administration à un autre administrateur avant de fermer ce compte." });
  }
  const courses = await count(`SELECT count(*) FROM courses WHERE (user_id=$1 OR teacher_id=$2)
    AND lifecycle_status IN ('requested','awaiting_schedule','scheduled','completion_pending','disputed')`, [userId, user.teacher_id]);
  if (courses) result.push({ code: "open_courses", count: courses, message: "Des cours doivent être terminés, annulés ou résolus avant la fermeture." });
  const payments = await count(`SELECT count(*) FROM payments p JOIN courses c ON c.id=p.course_id
    WHERE (p.user_id=$1 OR c.teacher_id=$2) AND p.status IN ('pending','otp_required')`, [userId, user.teacher_id]);
  if (payments) result.push({ code: "pending_payments", count: payments, message: "Des paiements attendent encore une confirmation du prestataire." });
  const operations = await count(`SELECT count(*) FROM finance_operations o LEFT JOIN courses c ON c.id=o.course_id
    WHERE (c.user_id=$1 OR o.teacher_id=$2)
    AND (o.status IN ('requested','approved') OR COALESCE((to_jsonb(o)->>'needs_review')::boolean,false))`, [userId, user.teacher_id]);
  if (operations) result.push({ code: "open_finance_operations", count: operations, message: "Un remboursement ou un reversement doit encore être traité." });
  const unresolvedCancellation = await count(`SELECT count(*) FROM courses c JOIN payments p ON p.course_id=c.id
    LEFT JOIN course_settlements s ON s.course_id=c.id WHERE c.user_id=$1 AND c.lifecycle_status IN ('cancelled','refused')
    AND p.status='success' AND p.funds_verified_at IS NOT NULL AND p.verification_source='provider' AND s.course_id IS NULL`, [userId]);
  if (unresolvedCancellation) result.push({ code: "cancelled_course_settlement", count: unresolvedCancellation,
    message: "La décision de remboursement ou de règlement d'un cours annulé doit être enregistrée." });
  if (user.teacher_id) {
    const unpaid = await count(`SELECT count(*) FROM courses c
      JOIN payments p ON p.course_id=c.id AND p.status='success' AND p.funds_verified_at IS NOT NULL AND p.verification_source='provider'
      LEFT JOIN course_settlements s ON s.course_id=c.id
      WHERE c.teacher_id=$1 AND (s.course_id IS NULL OR s.teacher_due_amount > COALESCE((
        SELECT sum(a.amount) FROM finance_payout_allocations a JOIN finance_operations o ON o.id=a.operation_id
        WHERE a.course_id=c.id AND o.status='verified'),0))`, [user.teacher_id]);
    if (unpaid) result.push({ code: "teacher_balance", count: unpaid, message: "Le règlement de vos cours doit être clôturé avant la fermeture." });
  }
  return result;
}

async function latest(db: Db, userId: number) {
  return (await db.query("SELECT * FROM account_deletion_requests WHERE user_id=$1 ORDER BY id DESC LIMIT 1", [userId])).rows[0] ?? null;
}

/** Preserve accounting references and amounts, remove profile, child and document data. */
async function anonymize(db: Db, userId: number, requestId: number, actorId: number): Promise<void> {
  const user = (await db.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId])).rows[0];
  if (!user || user.deleted_at) return;
  const applicationRows = (await db.query(`SELECT id,id_card_storage_key,diploma_storage_key,photo_storage_key
    FROM teacher_applications WHERE user_id=$1 OR phone=$2 OR (teacher_id=$3 AND $3::int IS NOT NULL) FOR UPDATE`,
  [userId, user.phone, user.teacher_id])).rows;
  const needRows = (await db.query("SELECT id,document_key FROM course_needs WHERE user_id=$1 FOR UPDATE", [userId])).rows;
  const keys = new Set<string>();
  for (const row of applicationRows) for (const key of [row.id_card_storage_key, row.diploma_storage_key, row.photo_storage_key]) if (key) keys.add(key);
  for (const row of needRows) if (row.document_key) keys.add(row.document_key);
  for (const key of keys) await db.query(`INSERT INTO storage_deletion_queue(storage_key,account_request_id)
    VALUES($1,$2) ON CONFLICT(storage_key) DO NOTHING`, [key, requestId]);

  await db.query("DELETE FROM auth_challenges WHERE user_id=$1 OR phone=$2", [userId, user.phone]);
  await db.query("DELETE FROM otp_codes WHERE destination=$1 OR destination=$2", [user.phone, user.email]);
  await db.query("DELETE FROM payment_accounts WHERE user_id=$1", [userId]);
  await db.query("DELETE FROM notifications WHERE user_id=$1", [userId]);
  await db.query("DELETE FROM referrals WHERE user_id=$1", [userId]);
  await db.query("DELETE FROM progress_subjects WHERE user_id=$1", [userId]);
  await db.query("DELETE FROM user_subscriptions WHERE user_id=$1", [userId]);
  await db.query("DELETE FROM children WHERE user_id=$1", [userId]);
  await db.query(`UPDATE course_needs SET location=NULL,frequency=NULL,description=NULL,
    document_key=NULL,document_content=NULL,document_name=NULL,document_mime_type=NULL,
    recommended_note=NULL,lat=NULL,lng=NULL,has_cat=false,has_dog=false,
    status=CASE WHEN course_id IS NULL THEN 'cancelled' ELSE status END,updated_at=now() WHERE user_id=$1`, [userId]);
  await db.query(`UPDATE teacher_applications SET full_name='Compte supprimé',phone=$2,email=NULL,bio=NULL,
    location='',experience=NULL,subjects='',levels='{}',formats='{}',programs='{}',
    rejection_reason=NULL,interview_at=NULL,interview_notes=NULL,test_result=NULL,test_notes=NULL,
    id_card_file_name=NULL,id_card_mime_type=NULL,id_card_storage_key=NULL,id_card_content=NULL,
    diploma_file_name=NULL,diploma_mime_type=NULL,diploma_storage_key=NULL,diploma_content=NULL,
    photo_file_name=NULL,photo_mime_type=NULL,photo_storage_key=NULL,photo_content=NULL,
    status='rejected' WHERE id=ANY($1::int[])`, [applicationRows.map((r: any) => r.id), `deleted:${userId}:${randomUUID()}`]);
  await db.query(`UPDATE courses SET location=NULL,private_address=NULL,meeting_url=NULL,access_notes=NULL
    WHERE user_id=$1 OR teacher_id=$2`, [userId, user.teacher_id]);
  await db.query(`UPDATE course_reports SET note='',progress_summary=NULL WHERE course_id IN
    (SELECT id FROM courses WHERE user_id=$1) OR actor_id=$1`, [userId]);
  await db.query(`UPDATE course_schedule_requests SET reason='Données supprimées',response_reason=NULL
    WHERE course_id IN (SELECT id FROM courses WHERE user_id=$1)`, [userId]);
  await db.query(`UPDATE course_events SET details='{}' WHERE course_id IN (SELECT id FROM courses WHERE user_id=$1)`, [userId]);
  await db.query("UPDATE reviews SET author_initials='—',author_name='Ancien utilisateur',text='' WHERE user_id=$1", [userId]);
  if (user.teacher_id) {
    await db.query(`UPDATE teachers SET archived_at=now(),name='Ancien professeur',initials='—',subjects='',location='',bio=NULL,
      experience=NULL,students=NULL,bac_success=NULL,formats='{}',levels='{}',programs='{}',verified=false,needs_confirmed=false
      WHERE id=$1`, [user.teacher_id]);
    await db.query("UPDATE courses SET teacher_name='Ancien professeur' WHERE teacher_id=$1", [user.teacher_id]);
    await db.query("DELETE FROM teacher_requests WHERE teacher_id=$1", [user.teacher_id]);
  }
  await db.query(`UPDATE users SET full_name='Compte supprimé',phone=$2,email=NULL,email_verified_at=NULL,
    initials='—',deleted_at=now(),parental_consent=false,phone_verified_at=NULL,
    notifications_whatsapp=false,notifications_email=false WHERE id=$1`, [userId, `deleted:${userId}:${randomUUID()}`]);
  await db.query(`UPDATE account_deletion_requests SET status='completed',completed_at=now(),completed_by=$2 WHERE id=$1`, [requestId, actorId]);
}

async function preferences(userId: number) {
  const user = (await pool.query("SELECT phone_verified_at,email_verified_at,notifications_whatsapp,notifications_email FROM users WHERE id=$1", [userId])).rows[0];
  const channels = await getOtpChannels();
  return { notificationsWhatsapp: user.notifications_whatsapp, notificationsEmail: user.notifications_email,
    whatsappAvailable: Boolean(user.phone_verified_at && channels.whatsapp), emailAvailable: Boolean(user.email_verified_at && channels.email) };
}
router.get("/account/preferences", requireAuth, wrap(async (_req, res) => { res.json(await preferences(currentUserId(res))); }));
router.put("/account/preferences", requireAuth, wrap(async (req, res) => {
  const current = await preferences(currentUserId(res));
  for (const key of ["notificationsWhatsapp", "notificationsEmail"]) if (req.body?.[key] !== undefined && typeof req.body[key] !== "boolean") {
    res.status(400).json({ error: "validation_error", message: "Les préférences doivent être des booléens." }); return;
  }
  if ((req.body?.notificationsWhatsapp === true && !current.whatsappAvailable)
    || (req.body?.notificationsEmail === true && !current.emailAvailable)) {
    res.status(409).json({ error: "channel_unavailable", message: "Ce canal doit être configuré et votre destination vérifiée avant activation." }); return;
  }
  await pool.query(`UPDATE users SET notifications_whatsapp=$2,notifications_email=$3 WHERE id=$1 AND deleted_at IS NULL`,
    [currentUserId(res), req.body?.notificationsWhatsapp ?? current.notificationsWhatsapp, req.body?.notificationsEmail ?? current.notificationsEmail]);
  res.json(await preferences(currentUserId(res)));
}));

router.get("/account/deletion-request", requireAuth, wrap(async (_req, res) => {
  const id = currentUserId(res);
  res.json({ request: payload(await latest(pool, id)), blockers: await deletionBlockers(pool, id) });
}));

router.post("/account/deletion-request", requireRecentAuth, wrap(async (req, res) => {
  if (req.body?.confirmation !== "SUPPRIMER") { res.status(400).json({ error: "confirmation_required", message: "Confirmez la suppression avec SUPPRIMER." }); return; }
  const id = currentUserId(res);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('monprofperso:account-closure'))");
    const user = await lockAccountForClosure(db, id);
    if (!user || user.deleted_at) { await db.query("ROLLBACK"); res.status(401).json({ error: "unauthorized" }); return; }
    let request = await latest(db, id);
    if (!request || request.status !== "pending") request = (await db.query(
      "INSERT INTO account_deletion_requests(user_id) VALUES($1) RETURNING *", [id])).rows[0];
    const blockers = await deletionBlockers(db, id);
    if (!blockers.length) await anonymize(db, id, request.id, id);
    const updated = await latest(db, id);
    const cleanupPending = Number((await db.query("SELECT count(*) FROM storage_deletion_queue WHERE account_request_id=$1", [request.id])).rows[0].count) > 0;
    await db.query("COMMIT");
    res.status(updated.status === "completed" ? 200 : 202).json({ request: payload(updated), blockers, cleanupPending });
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));

router.delete("/account/deletion-request", requireAuth, wrap(async (_req, res) => {
  const id = currentUserId(res);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('monprofperso:account-closure'))");
    await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [id]);
    await db.query("UPDATE account_deletion_requests SET status='cancelled',cancelled_at=now() WHERE user_id=$1 AND status='pending'", [id]);
    const request = await latest(db, id);
    await db.query("COMMIT");
    res.json({ request: payload(request), blockers: [] });
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));

router.get("/account/export", requireRecentAuth, wrap(async (_req, res) => {
  const id = currentUserId(res);
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const user = (await db.query("SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL", [id])).rows[0];
    if (!user) { await db.query("ROLLBACK"); res.status(401).json({ error: "unauthorized" }); return; }
    const rows = async (sql: string, args: unknown[] = [id]) => (await db.query(sql, args)).rows;
    const data = {
      formatVersion: 1, exportedAt: new Date().toISOString(), account: user,
      children: await rows("SELECT * FROM children WHERE user_id=$1 ORDER BY id"),
      needs: await rows(`SELECT to_jsonb(n)-'document_content'-'document_key'-'recommended_note' AS data
        FROM course_needs n WHERE user_id=$1 ORDER BY id`),
      courses: await rows(`SELECT id,subject,level,starts_at,duration_minutes,format,location,price,status,lifecycle_status,payment_status
        FROM courses WHERE user_id=$1 OR teacher_id=$2 ORDER BY id`, [id, user.teacher_id]),
      reports: await rows(`SELECT r.id,r.course_id,r.outcome,r.note,r.progress_summary,r.created_at
        FROM course_reports r JOIN courses c ON c.id=r.course_id WHERE c.user_id=$1 OR r.actor_id=$1 ORDER BY r.id`),
      payments: await rows(`SELECT id,course_id,amount,provider,phone,paystack_reference,status,created_at,updated_at
        FROM payments WHERE user_id=$1 ORDER BY id`),
      transactions: await rows("SELECT * FROM transactions WHERE user_id=$1 ORDER BY id"),
      paymentAccounts: await rows("SELECT * FROM payment_accounts WHERE user_id=$1 ORDER BY id"),
      subscriptions: await rows("SELECT * FROM user_subscriptions WHERE user_id=$1 ORDER BY id"),
      referrals: await rows("SELECT * FROM referrals WHERE user_id=$1 ORDER BY id"),
      progress: await rows("SELECT * FROM progress_subjects WHERE user_id=$1 ORDER BY id"),
      financeOperations: await rows(`SELECT o.id,o.kind,o.course_id,o.amount,o.currency,o.status,o.reason,o.provider,
        o.provider_reference,o.created_at,o.verified_at FROM finance_operations o LEFT JOIN courses c ON c.id=o.course_id
        WHERE c.user_id=$1 OR o.teacher_id=$2 ORDER BY o.id`, [id,user.teacher_id]),
      notifications: await rows("SELECT * FROM notifications WHERE user_id=$1 ORDER BY id"),
      applications: await rows(`SELECT id,full_name,phone,email,subjects,location,price_per_hour,bio,experience,
        levels,formats,programs,status,created_at,id_card_file_name,diploma_file_name,photo_file_name
        FROM teacher_applications WHERE user_id=$1 OR phone=$2 ORDER BY id`, [id, user.phone]),
      reviews: await rows("SELECT id,course_id,teacher_id,rating,text,created_at FROM reviews WHERE user_id=$1 ORDER BY id"),
      consentReceipts: await rows("SELECT consent_version,accepted_at,parental_consent,legal_revisions FROM account_consent_receipts WHERE user_id=$1 ORDER BY id"),
      privacyRequests: await rows("SELECT id,status,requested_at,cancelled_at,completed_at FROM account_deletion_requests WHERE user_id=$1 ORDER BY id"),
      teacherProfile: user.teacher_id ? (await rows("SELECT * FROM teachers WHERE id=$1", [user.teacher_id]))[0] : null,
      documentAccess: "Les pièces originales sont accessibles avec votre session sur /api/account/documents/need/:id ou /api/account/documents/id_card|diploma|photo/:applicationId.",
      retainedAfterDeletion: "Les références, montants et justificatifs nécessaires au suivi des paiements et aux obligations comptables sont conservés conformément à la politique publiée. Les profils, données des enfants et pièces du dossier sont supprimés.",
    };
    await db.query("COMMIT");
    res.setHeader("Content-Disposition", 'attachment; filename="monprofperso-donnees.json"');
    res.json(data);
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));

router.get("/account/documents/:kind/:id", requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id), kind = String(req.params.kind), userId = currentUserId(res);
  if (!Number.isSafeInteger(id) || id < 1 || !["need", "id_card", "diploma", "photo"].includes(kind)) {
    res.status(404).json({ error: "not_found" }); return;
  }
  const row = kind === "need"
    ? (await pool.query("SELECT document_key AS key,document_content AS content,document_name AS name FROM course_needs WHERE id=$1 AND user_id=$2", [id, userId])).rows[0]
    : (await pool.query(`SELECT a.${kind}_storage_key AS key,a.${kind}_content AS content,a.${kind}_file_name AS name
      FROM teacher_applications a JOIN users u ON u.id=$2
      WHERE a.id=$1 AND (a.user_id=u.id OR a.phone=u.phone)`, [id, userId])).rows[0];
  if (!row || (!row.key && !row.content)) { res.status(404).json({ error: "not_found" }); return; }
  const name = String(row.name ?? "document").replace(/[^\x20-\x7e]|["\\/]/g, "_").slice(0, 180);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
  if (!row.key) { res.send(row.content); return; }
  const stream = await getFileStream(row.key);
  stream.on("error", () => { if (!res.headersSent) res.status(502).json({ error: "storage_unavailable" }); else res.destroy(); });
  stream.pipe(res);
}));

router.get("/admin/account-deletions", requireAdmin, wrap(async (_req, res) => {
  const rows = (await pool.query(`SELECT d.*,u.full_name,u.phone,u.role FROM account_deletion_requests d
    JOIN users u ON u.id=d.user_id ORDER BY (d.status='pending') DESC,d.id DESC LIMIT 200`)).rows;
  const requests = [];
  for (const row of rows) requests.push({ ...payload(row), userId: row.user_id, userName: row.full_name,
    phone: row.phone, role: row.role, blockers: row.status === "pending" ? await deletionBlockers(pool, row.user_id) : [] });
  res.json({ requests });
}));

router.post("/admin/account-deletions/:id/complete", requireAdmin, requireRecentAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1 || req.body?.confirmation !== "SUPPRIMER") {
    res.status(400).json({ error: "confirmation_required", message: "Identifiant et confirmation SUPPRIMER requis." }); return;
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('monprofperso:account-closure'))");
    const actor = (await db.query("SELECT role,deleted_at FROM users WHERE id=$1", [currentUserId(res)])).rows[0];
    if (!actor || actor.deleted_at || actor.role !== "admin") {
      await db.query("ROLLBACK"); res.status(403).json({ error: "forbidden" }); return;
    }
    const request = (await db.query("SELECT * FROM account_deletion_requests WHERE id=$1", [id])).rows[0];
    if (!request) { await db.query("ROLLBACK"); res.status(404).json({ error: "not_found" }); return; }
    await lockAccountForClosure(db, request.user_id);
    const current = (await db.query("SELECT * FROM account_deletion_requests WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (current.status === "completed") { await db.query("COMMIT"); res.json({ status: "completed", requestId: id, deletedAt: current.completed_at }); return; }
    if (current.status !== "pending") { await db.query("ROLLBACK"); res.status(409).json({ error: "request_cancelled", message: "Cette demande a été annulée." }); return; }
    const blockers = await deletionBlockers(db, current.user_id);
    if (blockers.length) { await db.query("ROLLBACK"); res.status(409).json({ error: "account_deletion_blocked", message: "Des opérations restent à clôturer.", blockers }); return; }
    await anonymize(db, current.user_id, id, currentUserId(res));
    const updated = (await db.query("SELECT completed_at FROM account_deletion_requests WHERE id=$1", [id])).rows[0];
    await db.query("COMMIT");
    res.json({ status: "completed", requestId: id, deletedAt: updated.completed_at });
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}));

/** S3 deletion is retried durably; a temporary outage must not lose the deletion intent. */
export async function processStorageDeletions(limit = 20): Promise<{ completed: number; failed: number }> {
  const db = await pool.connect(); let completed = 0, failed = 0;
  try {
    await db.query("BEGIN");
    const rows = (await db.query(`SELECT storage_key FROM storage_deletion_queue WHERE next_attempt_at<=now()
      ORDER BY next_attempt_at LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit])).rows;
    for (const row of rows) {
      try {
        await deleteFileStrict(row.storage_key);
        await db.query("DELETE FROM storage_deletion_queue WHERE storage_key=$1", [row.storage_key]); completed++;
      } catch {
        failed++;
        await db.query(`UPDATE storage_deletion_queue SET attempts=attempts+1,
          next_attempt_at=now()+interval '15 minutes',last_error='storage_unavailable' WHERE storage_key=$1`, [row.storage_key]);
      }
    }
    await db.query("COMMIT"); return { completed, failed };
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}

/** A pending request is fulfilled automatically once its obligations are resolved. */
export async function processAccountDeletions(limit = 10): Promise<number> {
  const requests = (await pool.query("SELECT id,user_id FROM account_deletion_requests WHERE status='pending' ORDER BY id LIMIT $1", [limit])).rows;
  let completed = 0;
  for (const request of requests) {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const user = await lockAccountForClosure(db, request.user_id);
      const active = (await db.query("SELECT id FROM account_deletion_requests WHERE id=$1 AND status='pending' FOR UPDATE", [request.id])).rows[0];
      if (user && !user.deleted_at && active && !(await deletionBlockers(db, user.id)).length) {
        await anonymize(db, user.id, request.id, user.id); completed++;
      }
      await db.query("COMMIT");
    } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
  }
  return completed;
}
