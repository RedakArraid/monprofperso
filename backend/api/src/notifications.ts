import { pool } from "./db";
import { deliverServiceNotification, type OtpChannel } from "./otp";
import { isDemoMode } from "./auth";

/** No retroactive import: only newly created transactional notifications are queued. */
export async function deliverQueuedNotifications(limit = 5): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  if (process.env.NOTIFICATIONS_ENABLED !== "true" || isDemoMode()) return result;
  const rows = (await pool.query(`WITH candidates AS (
    SELECT id FROM notification_deliveries WHERE status='queued' AND next_attempt_at<=now()
    AND (lease_until IS NULL OR lease_until<now()) ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED
  ) UPDATE notification_deliveries d SET lease_until=now()+interval '2 minutes',attempts=attempts+1
    FROM candidates c WHERE d.id=c.id RETURNING d.*`, [limit])).rows;
  for (const delivery of rows) {
    const user = (await pool.query(`SELECT phone,email,phone_verified_at,email_verified_at,notifications_whatsapp,
      notifications_email,deleted_at FROM users WHERE id=$1`, [delivery.user_id])).rows[0];
    const allowed = user && !user.deleted_at && (delivery.channel === "whatsapp"
      ? user.phone_verified_at && user.notifications_whatsapp : user.email_verified_at && user.notifications_email);
    if (!allowed) {
      await pool.query("UPDATE notification_deliveries SET status='skipped',lease_until=NULL WHERE id=$1", [delivery.id]); result.skipped++; continue;
    }
    try {
      await deliverServiceNotification(delivery.channel as OtpChannel, delivery.channel === "whatsapp" ? user.phone : user.email);
      await pool.query("UPDATE notification_deliveries SET status='sent',sent_at=now(),lease_until=NULL,last_error=NULL WHERE id=$1", [delivery.id]); result.sent++;
    } catch {
      await pool.query(`UPDATE notification_deliveries SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'queued' END,
        next_attempt_at=now()+(LEAST(60,5*attempts)*interval '1 minute'),lease_until=NULL,last_error='provider_unavailable' WHERE id=$1`, [delivery.id]);
      result.failed++;
    }
  }
  return result;
}

/** The unique marker and notification are committed together, so concurrent workers cannot duplicate reminders. */
export async function createCourseReminders(): Promise<number> {
  const db = await pool.connect(); let created = 0;
  try {
    await db.query("BEGIN");
    for (const [kind, minimum, maximum] of [["day_before", 23*60, 24*60], ["hour_before", 0, 60]] as const) {
      const targets = (await db.query(`INSERT INTO course_reminders(course_id,user_id,kind,starts_at)
        SELECT c.id,u.id,$1,c.starts_at FROM courses c JOIN users u ON u.id=c.user_id OR (u.teacher_id=c.teacher_id AND u.role='teacher')
        WHERE c.lifecycle_status='scheduled' AND c.payment_status='paid' AND c.accepted=true AND u.deleted_at IS NULL
          AND c.starts_at>now()+($2*interval '1 minute') AND c.starts_at<=now()+($3*interval '1 minute')
        ON CONFLICT DO NOTHING RETURNING course_id,user_id`, [kind, minimum, maximum])).rows;
      for (const target of targets) {
        await db.query(`INSERT INTO notifications(user_id,icon,accent,text,time_ago,unread,section)
          VALUES($1,'calendar','green',$2,'À l’instant',true,'today')`,
        [target.user_id, kind === "day_before" ? "Un cours est prévu demain. Retrouvez les informations du rendez-vous dans Mes cours." : "Votre cours commence dans moins d'une heure. Vérifiez les informations du rendez-vous dans Mes cours."]);
        created++;
      }
    }
    await db.query("COMMIT"); return created;
  } catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
}
