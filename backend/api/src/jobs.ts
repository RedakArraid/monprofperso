import { pool } from "./db";
import { reconcilePendingPayments } from "./payments";
import { reconcileFinanceOperations } from "./finance";
import { processAccountDeletions, processStorageDeletions } from "./account";
import { createCourseReminders, deliverQueuedNotifications } from "./notifications";

let running: Promise<void> | undefined;
let stopping = false;

/** One elected worker per database. Provider calls only reconcile or send opted-in service alerts. */
export async function runOperationsCycle(): Promise<void> {
  const db = await pool.connect();
  let locked = false;
  try {
    locked = Boolean((await db.query("SELECT pg_try_advisory_lock(hashtext('monprofperso:operations-worker')) AS acquired")).rows[0].acquired);
    if (!locked) return;
    await db.query(`INSERT INTO worker_heartbeats(worker,last_started_at) VALUES('operations',now())
      ON CONFLICT(worker) DO UPDATE SET last_started_at=now()`);
    const names = ["payments", "finance", "storage_cleanup", "account_closure", "course_reminders", "notifications",
      "auth_expiry", "otp_expiry", "quota_expiry"];
    const results = await Promise.allSettled([
      reconcilePendingPayments(5), reconcileFinanceOperations(5), processStorageDeletions(5),
      processAccountDeletions(10), createCourseReminders(), deliverQueuedNotifications(5),
      pool.query("DELETE FROM auth_challenges WHERE expires_at<now()-interval '24 hours'"),
      pool.query("DELETE FROM otp_codes WHERE expires_at<now()-interval '24 hours'"),
      pool.query("DELETE FROM public_form_quotas WHERE window_start<now()-interval '24 hours'"),
    ]);
    const errors = results.flatMap((r, index) => r.status === "rejected" || (r.status === "fulfilled"
      && typeof r.value === "object" && r.value !== null && (("errors" in r.value && Number(r.value.errors)>0)
        || ("failed" in r.value && Number(r.value.failed)>0))) ? [names[index]] : []);
    if (errors.length) {
      await db.query("UPDATE worker_heartbeats SET last_error=$1 WHERE worker='operations'", [`failed:${errors.join(",")}`]);
      console.error(`[operations] Traitements à reprendre : ${errors.join(", ")}.`);
    } else {
      await db.query("UPDATE worker_heartbeats SET last_success_at=now(),last_error=NULL WHERE worker='operations'");
    }
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock(hashtext('monprofperso:operations-worker'))").catch(() => {});
    db.release();
  }
}

export function startOperationsWorker(): () => Promise<void> {
  if (process.env.WORKER_ENABLED === "false" || (process.env.NODE_ENV !== "production" && process.env.WORKER_ENABLED !== "true")) return async () => {};
  const tick = () => {
    if (stopping || running) return;
    running = runOperationsCycle().catch(() => console.error("[operations] Cycle indisponible.")).finally(() => { running = undefined; });
  };
  tick();
  const timer = setInterval(tick, 60_000); timer.unref();
  return async () => { stopping = true; clearInterval(timer); await running; };
}
