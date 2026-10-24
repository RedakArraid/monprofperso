import type { Router } from "express";
import { pool } from "./db";
import { AuthError } from "./auth";
import { optionalString, requiredEnum, requiredString, ValidationError } from "./validate";
import { getCourseFinance, operationDto } from "./finance";
import {
  Actor, actorFromResponse, businessWrap, courseParty, inTransaction, integer, futureDate,
  dateLabels, lockCourse, assertSlotFree, courseEvent, notifyCourseParties, snapshotCommission,
} from "./courseOperations";

function endsAt(course: any): number {
  if (!course.starts_at || !course.duration_minutes) return NaN;
  return new Date(course.starts_at).getTime() + course.duration_minutes * 60_000;
}

function courseEditable(course: any) {
  if (!["requested", "awaiting_schedule", "scheduled"].includes(course.lifecycle_status)) throw new AuthError(409, "course_state", "Ce cours n'est plus modifiable dans cet état");
}

export async function courseDetail(courseId: number, actor: Actor) {
  const course = (await pool.query(
    `SELECT c.*,u.full_name AS parent_name,ch.name AS student_name FROM courses c JOIN users u ON u.id=c.user_id
      LEFT JOIN course_needs n ON n.course_id=c.id LEFT JOIN children ch ON ch.id=n.child_id WHERE c.id=$1`, [courseId],
  )).rows[0];
  if (!course) throw new AuthError(404, "not_found", "Cours introuvable");
  const party = courseParty(course, actor);
  course.participant_role = party;
  const visible = party !== "teacher" || course.accepted;
  const contact = visible ? (await pool.query(
    `SELECT u.phone AS parent_phone,(SELECT phone FROM users WHERE teacher_id=$2 AND role='teacher' AND deleted_at IS NULL ORDER BY id LIMIT 1) AS teacher_phone
      FROM users u WHERE u.id=$1`, [course.user_id, course.teacher_id],
  )).rows[0] : null;
  if (!visible) { course.private_address = null; course.meeting_url = null; course.access_notes = null; }
  const scheduleRequests = (await pool.query(
    `SELECT id,starts_at AS "startAt",status,proposed_by AS "proposedBy",reason,created_at AS "createdAt"
      FROM course_schedule_requests WHERE course_id=$1 ORDER BY id DESC`, [courseId],
  )).rows;
  const reports = (await pool.query(
    `SELECT id,actor_id AS "actorId",actor_role AS "actorRole",outcome,note,progress_summary AS "progressSummary",created_at AS "createdAt"
      FROM course_reports WHERE course_id=$1 ORDER BY id`, [courseId],
  )).rows;
  const events = (await pool.query(
    `SELECT id::int,event_type AS type,actor_role AS "actorRole",created_at AS "createdAt",details
      FROM course_events WHERE course_id=$1 ORDER BY id DESC LIMIT 100`, [courseId],
  )).rows;
  const finance = await getCourseFinance(courseId);
  const operations = (await pool.query(
    `SELECT o.* FROM finance_operations o WHERE o.course_id=$1
      OR ($2 AND o.id IN (SELECT operation_id FROM finance_payout_allocations WHERE course_id=$1)) ORDER BY o.id DESC`,
    [courseId, party !== "parent"],
  )).rows;
  const review = (await pool.query("SELECT id,rating,text,created_at FROM reviews WHERE course_id=$1", [courseId])).rows[0] ?? null;
  const payments = party === "admin" ? (await pool.query(
    `SELECT id,amount,provider,paystack_reference,status,verification_source,funds_verified_at,created_at,last_reconcile_error
      FROM payments WHERE course_id=$1 ORDER BY id DESC`, [courseId],
  )).rows : undefined;
  const permissions: string[] = [];
  const editable = ["requested", "awaiting_schedule", "scheduled"].includes(course.lifecycle_status);
  const notStarted = !course.starts_at || new Date(course.starts_at).getTime() > Date.now();
  if (editable && visible) permissions.push("edit_details");
  if (course.accepted && editable && notStarted) {
    permissions.push("schedule");
    if (scheduleRequests.some(r => r.status === "pending" && (r.proposedBy !== actor.id || party === "admin"))) permissions.push("respond_schedule");
  }
  if (editable && (notStarted || party === "admin")) permissions.push("cancel");
  if (party !== "admin" && course.accepted && endsAt(course) <= Date.now()
      && ["scheduled", "completion_pending", "disputed"].includes(course.lifecycle_status)
      && !reports.some(r => r.actorRole === party)) permissions.push("report");
  if (party === "parent" && course.lifecycle_status === "completed" && !review) permissions.push("review");
  if (party !== "teacher" && finance.capturedAmount > finance.refundAmount && !finance.refundPendingAmount) permissions.push("request_refund");
  return {
    course, contacts: { parentPhone: contact?.parent_phone ?? null, teacherPhone: course.accepted ? contact?.teacher_phone ?? null : null },
    scheduleRequests, reports, events, finance, financialOperations: operations.map(operationDto), payments, review, permissions,
  };
}

export async function updateCourseDetails(courseId: number, actor: Actor, body: any) {
  return inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    const party = courseParty(course, actor);
    courseEditable(course);
    if (party === "teacher" && !course.accepted) throw new AuthError(403, "forbidden", "Acceptez le cours avant de partager les informations privées");
    const address = optionalString(body, "privateAddress", { max: 1000 });
    const meeting = optionalString(body, "meetingUrl", { max: 2000 });
    const notes = optionalString(body, "accessNotes", { max: 2000 });
    if (address !== undefined && party === "teacher") throw new AuthError(403, "forbidden", "Le lieu est renseigné par le parent");
    if (meeting !== undefined && party === "parent") throw new AuthError(403, "forbidden", "Le lien est renseigné par le professeur");
    if (meeting?.trim()) {
      let url: URL;
      try { url = new URL(meeting); } catch { throw new ValidationError("meetingUrl", "lien HTTPS valide requis"); }
      if (url.protocol !== "https:" || url.username || url.password) throw new ValidationError("meetingUrl", "lien HTTPS sans identifiants requis");
    }
    await client.query(
      `UPDATE courses SET private_address=CASE WHEN $2::text IS NULL THEN private_address ELSE NULLIF(trim($2),'') END,
       meeting_url=CASE WHEN $3::text IS NULL THEN meeting_url ELSE NULLIF(trim($3),'') END,
       access_notes=CASE WHEN $4::text IS NULL THEN access_notes ELSE NULLIF(trim($4),'') END,updated_at=now() WHERE id=$1`,
      [courseId, address ?? null, meeting ?? null, notes ?? null],
    );
    await courseEvent(client, courseId, actor, "details_updated", { fields: Object.keys(body).filter(k => ["privateAddress", "meetingUrl", "accessNotes"].includes(k)) });
  });
}

export async function proposeSchedule(courseId: number, actor: Actor, body: any) {
  const start = futureDate(body.startAt);
  const reason = requiredString(body, "reason", { max: 1000 });
  await inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    courseEditable(course);
    if (!course.accepted) throw new AuthError(409, "not_accepted", "L'acceptation du professeur est nécessaire");
    if (course.starts_at && new Date(course.starts_at).getTime() <= Date.now()) throw new AuthError(409, "course_started", "Déclarez la réalisation ou un incident pour un cours déjà commencé");
    await assertSlotFree(client, course, start);
    const existing = (await client.query("SELECT * FROM course_schedule_requests WHERE course_id=$1 AND status='pending'", [courseId])).rows[0];
    if (existing && existing.proposed_by === actor.id && new Date(existing.starts_at).getTime() === start.getTime()) return;
    if (existing) throw new AuthError(409, "schedule_pending", "Répondez à la proposition existante avant d'en créer une autre");
    const request = (await client.query(
      "INSERT INTO course_schedule_requests(course_id,starts_at,proposed_by,reason) VALUES($1,$2,$3,$4) RETURNING id", [courseId, start, actor.id, reason],
    )).rows[0];
    await courseEvent(client, courseId, actor, "schedule_proposed", { proposalId: request.id, startAt: start.toISOString(), reason });
    await notifyCourseParties(client, course, `Un créneau est proposé pour le cours de ${course.subject}. Votre réponse est attendue.`, actor.id);
  });
}

export async function respondSchedule(courseId: number, proposalId: number, actor: Actor, body: any) {
  const decision = requiredEnum(body, "decision", ["accept", "decline"]);
  const reason = optionalString(body, "reason", { max: 1000 }) ?? "";
  await inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    courseEditable(course);
    const request = (await client.query("SELECT * FROM course_schedule_requests WHERE id=$1 AND course_id=$2 FOR UPDATE", [proposalId, courseId])).rows[0];
    if (!request) throw new AuthError(404, "not_found", "Proposition introuvable");
    if (request.proposed_by === actor.id && actor.role !== "admin") throw new AuthError(403, "self_approval", "L'autre partie doit accepter votre proposition");
    if (request.status === (decision === "accept" ? "accepted" : "declined") && request.responded_by === actor.id) return;
    if (request.status !== "pending") throw new AuthError(409, "proposal_closed", "Cette proposition a déjà été traitée");
    if (decision === "accept") {
      const start = futureDate(new Date(request.starts_at).toISOString());
      if (!course.accepted) throw new AuthError(409, "not_accepted", "Cours non accepté");
      if (course.starts_at && new Date(course.starts_at).getTime() <= Date.now()) throw new AuthError(409, "course_started", "Le créneau précédent a commencé ; une revue est requise");
      await assertSlotFree(client, course, start);
      const labels = dateLabels(start);
      await client.query(
        `UPDATE courses SET starts_at=$2,day_label=$3,day_num=$4,time=$5,lifecycle_status='scheduled',badge='Confirmé',updated_at=now() WHERE id=$1`,
        [courseId, start, labels.dayLabel, labels.dayNum, labels.time],
      );
    }
    await client.query(
      "UPDATE course_schedule_requests SET status=$2,responded_by=$3,response_reason=$4,responded_at=now() WHERE id=$1",
      [proposalId, decision === "accept" ? "accepted" : "declined", actor.id, reason],
    );
    await courseEvent(client, courseId, actor, decision === "accept" ? "schedule_accepted" : "schedule_declined",
      { proposalId, startAt: new Date(request.starts_at).toISOString(), reason });
    await notifyCourseParties(client, course, `La proposition de créneau du cours de ${course.subject} a été ${decision === "accept" ? "acceptée" : "refusée"}.`, actor.id);
  });
}

export async function cancelCourse(courseId: number, actor: Actor, body: any) {
  const reason = requiredString(body, "reason", { max: 2000 });
  await inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    if (course.lifecycle_status === "cancelled") return;
    courseEditable(course);
    if (actor.role !== "admin" && course.starts_at && new Date(course.starts_at).getTime() <= Date.now()) throw new AuthError(409, "course_started", "Signalez l'absence ou l'incident pour ce cours déjà commencé");
    await client.query("UPDATE courses SET status='cancelled',lifecycle_status='cancelled',badge='Annulé',cancelled_at=now(),updated_at=now() WHERE id=$1", [courseId]);
    await client.query("UPDATE course_schedule_requests SET status='superseded',responded_at=now() WHERE course_id=$1 AND status='pending'", [courseId]);
    await client.query("UPDATE course_settlements SET release_enabled=FALSE WHERE course_id=$1", [courseId]);
    await client.query("UPDATE course_needs SET status='cancelled',updated_at=now() WHERE course_id=$1", [courseId]);
    await courseEvent(client, courseId, actor, "cancelled", { reason, financialReview: true });
    await notifyCourseParties(client, course, `Le cours de ${course.subject} est annulé. Tout remboursement ou règlement sera examiné par l'équipe.`, actor.id);
  });
}

export async function reportCourse(courseId: number, actor: Actor, body: any) {
  const outcome = requiredEnum(body, "outcome", ["completed", "teacher_absent", "student_absent", "disputed"]);
  const note = requiredString(body, "note", { max: 2000 });
  const summary = optionalString(body, "progressSummary", { max: 4000 });
  await inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    const party = courseParty(course, actor);
    if (party === "admin") throw new AuthError(409, "use_resolution", "L'administrateur statue via la résolution du cours");
    if (summary !== undefined && party !== "teacher") throw new AuthError(403, "forbidden", "Le bilan pédagogique est rédigé par le professeur");
    const old = (await client.query("SELECT * FROM course_reports WHERE course_id=$1 AND actor_role=$2", [courseId, party])).rows[0];
    if (old) {
      if (old.outcome === outcome && old.note === note && (old.progress_summary ?? "") === (summary?.trim() ?? "")) return;
      throw new AuthError(409, "report_exists", "Votre déclaration est déjà enregistrée ; contactez l'équipe pour rectification");
    }
    if (!course.accepted || !["scheduled", "completion_pending", "disputed"].includes(course.lifecycle_status)
        || !Number.isFinite(endsAt(course)) || endsAt(course) > Date.now()) throw new AuthError(409, "course_not_finished", "La déclaration est disponible après la fin du créneau confirmé");
    await client.query("INSERT INTO course_reports(course_id,actor_id,actor_role,outcome,note,progress_summary) VALUES($1,$2,$3,$4,$5,$6)",
      [courseId, actor.id, party, outcome, note, summary?.trim() || null]);
    const reports = (await client.query("SELECT outcome FROM course_reports WHERE course_id=$1", [courseId])).rows;
    const state = reports.some(r => r.outcome !== "completed") ? "disputed" : reports.length === 2 ? "completed" : "completion_pending";
    await client.query(
      `UPDATE courses SET lifecycle_status=$2,status=CASE WHEN $2='completed' THEN 'done' ELSE status END,
       badge=$3,completed_at=CASE WHEN $2='completed' THEN now() ELSE completed_at END,updated_at=now() WHERE id=$1`,
      [courseId, state, state === "completed" ? "Réalisé" : state === "disputed" ? "À examiner" : "Réalisation à confirmer"],
    );
    if (state === "disputed") await client.query("UPDATE course_settlements SET release_enabled=FALSE WHERE course_id=$1", [courseId]);
    await courseEvent(client, courseId, actor, "attendance_reported", { outcome, state });
    await notifyCourseParties(client, course, `Une déclaration de séance est disponible pour le cours de ${course.subject}.`, actor.id);
  });
}

export async function resolveCourse(courseId: number, actor: Actor, body: any) {
  if (actor.role !== "admin") throw new AuthError(403, "forbidden", "Administrateur requis");
  const outcome = requiredEnum(body, "outcome", ["completed", "cancelled"]);
  const reason = requiredString(body, "reason", { max: 2000 });
  await inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    if (outcome === "completed" && (!Number.isFinite(endsAt(course)) || endsAt(course) > Date.now() || !course.accepted)) {
      throw new AuthError(409, "course_not_finished", "Un cours ne peut être déclaré réalisé avant son créneau confirmé");
    }
    const finances = await getCourseFinance(courseId, client);
    if (finances.teacherPaid || finances.teacherReserved) throw new AuthError(409, "financial_operations_open", "Traiter les montants déjà réservés ou versés avant une nouvelle résolution");
    await client.query(
      `UPDATE courses SET lifecycle_status=$2,status=$3,badge=$4,updated_at=now(),
        completed_at=CASE WHEN $2='completed' THEN COALESCE(completed_at,now()) ELSE completed_at END,
        cancelled_at=CASE WHEN $2='cancelled' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END WHERE id=$1`,
      [courseId, outcome, outcome === "completed" ? "done" : "cancelled", outcome === "completed" ? "Réalisé" : "Annulé"],
    );
    await client.query("UPDATE course_settlements SET release_enabled=FALSE WHERE course_id=$1", [courseId]);
    await client.query("UPDATE course_schedule_requests SET status='superseded',responded_at=now() WHERE course_id=$1 AND status='pending'", [courseId]);
    await courseEvent(client, courseId, actor, "admin_resolved", { outcome, reason });
    await notifyCourseParties(client, course, `L'équipe a statué sur le cours de ${course.subject} : ${outcome === "completed" ? "réalisé" : "annulé"}.`);
  });
}

export async function reviewCourse(courseId: number, actor: Actor, body: any) {
  const rating = integer(body.rating, "rating", 1, 5);
  const text = requiredString(body, "text", { max: 2000 });
  return inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    if (courseParty(course, actor) !== "parent") throw new AuthError(403, "forbidden", "L'avis est réservé au parent ayant réservé");
    if (course.lifecycle_status !== "completed") throw new AuthError(409, "course_not_completed", "Un avis est possible après réalisation confirmée");
    const old = (await client.query("SELECT id,rating,text,created_at FROM reviews WHERE course_id=$1", [courseId])).rows[0];
    if (old) {
      if (old.rating === rating && old.text === text) return old;
      throw new AuthError(409, "review_exists", "Un avis existe déjà pour ce cours");
    }
    const user = (await client.query("SELECT full_name,initials FROM users WHERE id=$1", [actor.id])).rows[0];
    const review = (await client.query(
      `INSERT INTO reviews(teacher_id,author_initials,author_name,rating,time_ago,text,course_id,user_id)
       VALUES($1,$2,$3,$4,'récent',$5,$6,$7) RETURNING id,rating,text,created_at`,
      [course.teacher_id, user.initials, user.full_name, rating, text, courseId, actor.id],
    )).rows[0];
    await client.query(
      `UPDATE teachers SET rating=(SELECT COALESCE(round(avg(rating),1),0) FROM reviews WHERE teacher_id=$1),
       reviews_count=(SELECT count(*) FROM reviews WHERE teacher_id=$1) WHERE id=$1`, [course.teacher_id],
    );
    await courseEvent(client, courseId, actor, "review_created", { reviewId: review.id, rating });
    return review;
  });
}

export async function progressForUser(userId: number) {
  const entries = (await pool.query(
    `SELECT c.id AS "courseId",c.subject,c.teacher_name AS "teacherName",ch.name AS "studentName",
      c.completed_at AS "completedAt",r.progress_summary AS summary
      FROM course_reports r JOIN courses c ON c.id=r.course_id LEFT JOIN course_needs n ON n.course_id=c.id
      LEFT JOIN children ch ON ch.id=n.child_id WHERE c.user_id=$1 AND c.lifecycle_status='completed'
      AND r.actor_role='teacher' AND r.progress_summary IS NOT NULL ORDER BY c.completed_at DESC,c.id DESC LIMIT 200`, [userId],
  )).rows;
  return { student: "Suivi des progrès", average: "—", trend: "—", goal: entries.length ? "Bilans des séances réalisées" : "Aucun bilan pédagogique enregistré", subjects: [], entries };
}

export function registerCourseLifecycleRoutes(api: Router, admin: Router) {
  api.get("/courses/:id", businessWrap(async (req, res) => { res.json(await courseDetail(integer(req.params.id, "courseId"), actorFromResponse(res))); }));
  const action = (method: "post" | "put", path: string, fn: (id: number, actor: Actor, body: any, req: any) => Promise<any>) => {
    api[method](path, businessWrap(async (req, res) => {
      const id = integer(req.params.id, "courseId"), actor = actorFromResponse(res);
      await fn(id, actor, req.body ?? {}, req);
      res.json(await courseDetail(id, actor));
    }));
  };
  action("put", "/courses/:id/details", updateCourseDetails);
  action("post", "/courses/:id/schedule", proposeSchedule);
  action("post", "/courses/:id/schedule/:proposalId/respond", (id, actor, body, req) => respondSchedule(id, integer(req.params.proposalId, "proposalId"), actor, body));
  action("post", "/courses/:id/cancel", cancelCourse);
  action("post", "/courses/:id/report", reportCourse);
  api.post("/courses/:id/review", businessWrap(async (req, res) => {
    res.status(201).json(await reviewCourse(integer(req.params.id, "courseId"), actorFromResponse(res), req.body ?? {}));
  }));
  admin.post("/courses/:id/resolve", businessWrap(async (req, res) => {
    const id = integer(req.params.id, "courseId"), actor = actorFromResponse(res);
    await resolveCourse(id, actor, req.body ?? {}); res.json(await courseDetail(id, actor));
  }));
  // Reprise d'un historique : l'opérateur indique les termes documentés. Aucun
  // pourcentage historique ni créneau ne sont reconstruits à partir d'une supposition.
  admin.post("/courses/:id/historical-terms", businessWrap(async (req, res) => {
    const id = integer(req.params.id, "courseId"), actor = actorFromResponse(res), body = req.body ?? {};
    const reason = requiredString(body, "reason", { max: 2000 });
    const pct = Number(body.commissionPct);
    if (body.commissionPct == null || !Number.isFinite(pct) || pct < 0 || pct > 100) throw new ValidationError("commissionPct", "commission documentée requise entre 0 et 100");
    const duration = integer(body.durationMinutes, "durationMinutes", 15, 1440);
    await inTransaction(async client => {
      const course = await lockCourse(client, id, actor);
      if (course.commission_pct != null) throw new AuthError(409, "snapshot_exists", "Les termes financiers sont déjà fixés");
      const snapshot = await snapshotCommission(client, course.price, pct);
      await client.query("UPDATE courses SET commission_pct=$2,commission_amount=$3,teacher_net_amount=$4,duration_minutes=$5,updated_at=now() WHERE id=$1",
        [id, snapshot.pct, snapshot.commission, snapshot.net, duration]);
      await courseEvent(client, id, actor, "historical_terms_documented", { commissionPct: pct, durationMinutes: duration, reason });
    });
    res.json(await courseDetail(id, actor));
  }));
}
