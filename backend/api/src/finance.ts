import type { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { AuthError, requireRecentAuth } from "./auth";
import { requiredString, requiredEnum, ValidationError } from "./validate";
import { paystackRead, normalizeCiPhone, toPaystackAmount, reconcilePendingPayments, reconcilePaymentById } from "./payments";
import {
  Actor, Queryable, actorFromResponse, businessWrap, courseParty, inTransaction,
  integer, idempotencyKey, lockCourse, courseEvent,
} from "./courseOperations";

type FinanceSummary = {
  grossAmount: number; commissionPct: number | null; commissionAmount: number | null;
  teacherNetAmount: number | null; capturedAmount: number; refundAmount: number;
  refundPendingAmount: number; teacherDue: number | null; teacherReleasable: number;
  teacherReserved: number; teacherPaid: number; reviewRequired: boolean; platformLossAcceptedAmount: number;
};

/** Les états anciens « paid » et les simulations ne constituent pas un actif.
 * Une preuve fournisseur relue ou signée est nécessaire pour compter des fonds. */
export async function getCourseFinance(courseId: number, db: Queryable = pool): Promise<FinanceSummary> {
  const row = (await db.query(
    `SELECT c.price,c.commission_pct,c.commission_amount,c.teacher_net_amount,c.lifecycle_status,
      s.teacher_due_amount,s.release_enabled,
      COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.course_id=c.id
        AND p.status='success' AND p.funds_verified_at IS NOT NULL AND p.verification_source='provider'),0)::int AS captured,
      COALESCE((SELECT sum(o.amount) FROM finance_operations o WHERE o.course_id=c.id AND o.kind='refund' AND o.status='verified'),0)::int AS refunded,
      COALESCE((SELECT sum(o.amount) FROM finance_operations o WHERE o.course_id=c.id AND o.kind='refund' AND o.status IN ('requested','approved')),0)::int AS refund_pending,
      COALESCE((SELECT sum(o.platform_loss_amount) FROM finance_operations o WHERE o.course_id=c.id AND o.kind='refund' AND o.status IN ('approved','verified')),0)::int AS accepted_loss,
      COALESCE((SELECT sum(a.amount) FROM finance_payout_allocations a JOIN finance_operations o ON o.id=a.operation_id
        WHERE a.course_id=c.id AND o.status IN ('requested','approved')),0)::int AS reserved,
      COALESCE((SELECT sum(a.amount) FROM finance_payout_allocations a JOIN finance_operations o ON o.id=a.operation_id
        WHERE a.course_id=c.id AND o.status='verified'),0)::int AS paid,
      EXISTS(SELECT 1 FROM finance_operations o WHERE o.needs_review AND
        (o.course_id=c.id OR o.id IN (SELECT operation_id FROM finance_payout_allocations WHERE course_id=c.id))) AS operation_review
     FROM courses c LEFT JOIN course_settlements s ON s.course_id=c.id WHERE c.id=$1`, [courseId],
  )).rows[0];
  if (!row) throw new AuthError(404, "not_found", "Cours introuvable");
  const terminal = ["completed", "cancelled"].includes(row.lifecycle_status);
  const review = row.operation_review || row.refund_pending > 0 || row.lifecycle_status === "disputed"
    || Math.max(row.teacher_due_amount ?? 0,row.paid+row.reserved) > row.captured-row.refunded+row.accepted_loss
    || (row.captured > 0 && (row.teacher_due_amount == null || row.commission_pct == null
      || row.captured - row.refunded > row.price));
  return {
    grossAmount: row.price, commissionPct: row.commission_pct, commissionAmount: row.commission_amount,
    teacherNetAmount: row.teacher_net_amount, capturedAmount: row.captured, refundAmount: row.refunded,
    refundPendingAmount: row.refund_pending, teacherDue: row.teacher_due_amount ?? null,
    teacherReleasable: terminal && row.release_enabled && !review
      ? Math.max(0, Math.min(row.teacher_due_amount ?? 0, row.captured - row.refunded) - row.reserved - row.paid) : 0,
    teacherReserved: row.reserved, teacherPaid: row.paid, reviewRequired: Boolean(review),
    platformLossAcceptedAmount: row.accepted_loss,
  };
}

export function operationDto(row: any) {
  return {
    id: row.id, kind: row.kind, courseId: row.course_id, teacherId: row.teacher_id,
    amount: row.amount, status: row.status, reason: row.reason, provider: row.provider,
    beneficiaryPhone: row.beneficiary_phone, providerReference: row.provider_reference,
    createdAt: row.created_at, verifiedAt: row.verified_at, needsReview: row.needs_review,
    decisionReason: row.decision_reason ?? null,
    platformLossAmount: row.platform_loss_amount ?? 0,
  };
}

async function financeEvent(db: Queryable, operationId: number | null, courseId: number | null, actorId: number | null, type: string, details: any = {}) {
  await db.query("INSERT INTO finance_events(operation_id,course_id,actor_id,event_type,details) VALUES($1,$2,$3,$4,$5)",
    [operationId, courseId, actorId, type, JSON.stringify(details)]);
}

async function replay(db: Queryable, actor: Actor, kind: string, key: string, amount: number, courseId?: number, provider?: string) {
  const row = (await db.query("SELECT * FROM finance_operations WHERE requested_by=$1 AND kind=$2 AND idempotency_key=$3", [actor.id, kind, key])).rows[0];
  if (row && (row.amount !== amount || (courseId !== undefined && row.course_id !== courseId) || (provider && row.provider !== provider))) {
    throw new AuthError(409, "idempotency_conflict", "Cette clé correspond à une autre opération");
  }
  return row;
}

export async function requestRefund(courseId: number, actor: Actor, body: any) {
  const amount = integer(body.amount, "amount");
  const reason = requiredString(body, "reason", { max: 2000 });
  const key = idempotencyKey(body);
  return inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    if (courseParty(course, actor) === "teacher") throw new AuthError(403, "forbidden", "Le remboursement est demandé par le payeur ou un administrateur");
    const previous = await replay(client, actor, "refund", key, amount, courseId);
    if (previous) return operationDto(previous);
    const totals = await getCourseFinance(courseId, client);
    if (totals.refundPendingAmount) throw new AuthError(409, "refund_pending", "Une demande de remboursement est déjà en cours");
    if (amount > totals.capturedAmount - totals.refundAmount) throw new AuthError(409, "insufficient_captured_funds", "Montant supérieur aux encaissements vérifiés restants");
    const payment = (await client.query(
      `SELECT p.* FROM payments p WHERE p.course_id=$1 AND p.status='success' AND p.funds_verified_at IS NOT NULL AND p.verification_source='provider'
        AND p.amount-COALESCE((SELECT sum(o.amount) FROM finance_operations o WHERE o.payment_id=p.id AND o.status='verified'),0)>=$2
        ORDER BY p.id LIMIT 1`, [courseId, amount],
    )).rows[0];
    if (!payment) throw new AuthError(409, "refund_split_required", "Le remboursement doit être ventilé par paiement par un opérateur");
    const row = (await client.query(
      `INSERT INTO finance_operations(kind,course_id,payment_id,requested_by,idempotency_key,amount,reason,provider)
        VALUES('refund',$1,$2,$3,$4,$5,$6,'paystack') RETURNING *`, [courseId, payment.id, actor.id, key, amount, reason],
    )).rows[0];
    await client.query("UPDATE course_settlements SET release_enabled=FALSE WHERE course_id=$1", [courseId]);
    await financeEvent(client, row.id, courseId, actor.id, "refund_requested", { amount });
    await courseEvent(client, courseId, actor, "refund_requested", { operationId: row.id, amount });
    return operationDto(row);
  });
}

export async function decideSettlement(courseId: number, actor: Actor, body: any) {
  if (actor.role !== "admin") throw new AuthError(403, "forbidden", "Administrateur requis");
  const due = integer(body.teacherDueAmount, "teacherDueAmount", 0);
  if (typeof body.release !== "boolean") throw new ValidationError("release", "décision explicite true ou false requise");
  const reason = requiredString(body, "reason", { max: 2000 });
  return inTransaction(async (client) => {
    const course = await lockCourse(client, courseId, actor);
    const totals = await getCourseFinance(courseId, client);
    if (!["completed", "cancelled"].includes(course.lifecycle_status)) throw new AuthError(409, "course_unresolved", "La réalisation ou l'annulation doit être établie avant le règlement");
    if (course.teacher_net_amount == null && due !== 0) throw new AuthError(409, "historical_commission_review", "La commission historique doit être établie avant un règlement positif");
    if (!totals.capturedAmount && due !== 0) throw new AuthError(409, "unverified_funds", "Aucun encaissement fournisseur vérifié");
    if (due > course.teacher_net_amount || due > totals.capturedAmount - totals.refundAmount
      || due < totals.teacherPaid + totals.teacherReserved) throw new AuthError(409, "settlement_out_of_bounds", "Le dû doit respecter le net convenu, les fonds disponibles et les montants déjà réservés ou versés");
    if (body.release && totals.refundPendingAmount) throw new AuthError(409, "refund_pending", "Traitez le remboursement avant de libérer les fonds");
    await client.query(
      `INSERT INTO course_settlements(course_id,teacher_due_amount,release_enabled,reason,decided_by)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(course_id) DO UPDATE SET teacher_due_amount=EXCLUDED.teacher_due_amount,
       release_enabled=EXCLUDED.release_enabled,reason=EXCLUDED.reason,decided_by=EXCLUDED.decided_by,decided_at=now()`,
      [courseId, due, body.release, reason, actor.id],
    );
    await financeEvent(client, null, courseId, actor.id, "settlement_decided", { teacherDueAmount: due, release: body.release, reason });
    await courseEvent(client, courseId, actor, "settlement_decided", { teacherDueAmount: due, release: body.release, reason });
    return getCourseFinance(courseId, client);
  });
}

export async function requestPayout(actor: Actor, body: any) {
  if (actor.role !== "teacher" || !actor.teacherId) throw new AuthError(403, "forbidden", "Professeur validé requis");
  const amount = integer(body.amount, "amount");
  const provider = requiredEnum(body, "provider", ["orange", "mtn", "wave"]);
  const key = idempotencyKey(body);
  return inTransaction(async (client) => {
    const user = (await client.query("SELECT phone,phone_verified_at,deleted_at FROM users WHERE id=$1 FOR SHARE", [actor.id])).rows[0];
    if (!user || user.deleted_at) throw new AuthError(403, "forbidden", "Compte indisponible");
    if (!user.phone_verified_at) throw new AuthError(409, "verified_phone_required", "Prouvez la possession de votre téléphone par connexion OTP avant une demande de reversement");
    await client.query("SELECT id FROM teachers WHERE id=$1 FOR UPDATE", [actor.teacherId]);
    const previous = await replay(client, actor, "payout", key, amount, undefined, provider);
    if (previous) return operationDto(previous);
    const phone = "+225" + normalizeCiPhone(user.phone);
    const courses = (await client.query("SELECT id FROM courses WHERE teacher_id=$1 ORDER BY id FOR UPDATE", [actor.teacherId])).rows;
    let remaining = amount;
    const allocations: Array<{ id: number; amount: number }> = [];
    for (const course of courses) {
      const available = (await getCourseFinance(course.id, client)).teacherReleasable;
      if (available > 0 && remaining > 0) {
        const part = Math.min(remaining, available);
        allocations.push({ id: course.id, amount: part }); remaining -= part;
      }
    }
    if (remaining > 0) throw new AuthError(409, "insufficient_releasable_balance", "Montant supérieur au solde libérable");
    const row = (await client.query(
      `INSERT INTO finance_operations(kind,teacher_id,requested_by,idempotency_key,amount,reason,provider,beneficiary_phone)
       VALUES('payout',$1,$2,$3,$4,'Demande de reversement professeur',$5,$6) RETURNING *`,
      [actor.teacherId, actor.id, key, amount, provider, phone],
    )).rows[0];
    for (const allocation of allocations) await client.query(
      "INSERT INTO finance_payout_allocations(operation_id,course_id,amount) VALUES($1,$2,$3)", [row.id, allocation.id, allocation.amount]);
    await financeEvent(client, row.id, null, actor.id, "payout_requested", { amount, allocations });
    return operationDto(row);
  });
}

async function lockOperation(client: PoolClient, operationId: number): Promise<any> {
  const initial = (await client.query("SELECT * FROM finance_operations WHERE id=$1", [operationId])).rows[0];
  if (!initial) throw new AuthError(404, "not_found", "Opération introuvable");
  if (initial.kind === "refund") await lockCourse(client, initial.course_id);
  else {
    await client.query("SELECT id FROM teachers WHERE id=$1 FOR UPDATE", [initial.teacher_id]);
    await client.query("SELECT c.id FROM courses c JOIN finance_payout_allocations a ON a.course_id=c.id WHERE a.operation_id=$1 ORDER BY c.id FOR UPDATE OF c", [operationId]);
  }
  return (await client.query("SELECT * FROM finance_operations WHERE id=$1 FOR UPDATE", [operationId])).rows[0];
}

async function validateReservedOperation(client: PoolClient, operation: any) {
  if (operation.kind === "refund") {
    const totals = await getCourseFinance(operation.course_id, client);
    if (operation.amount > totals.capturedAmount - totals.refundAmount) {
      throw new AuthError(409, "insufficient_captured_funds", "Un remboursement ne peut dépasser l'encaissement restant vérifié");
    }
    if (operation.amount > totals.capturedAmount - totals.refundAmount + totals.platformLossAcceptedAmount - Math.max(totals.teacherDue ?? 0, totals.teacherPaid + totals.teacherReserved)) {
      throw new AuthError(409, "refund_requires_settlement_review", "Réviser le dû et traiter les reversements réservés avant ce remboursement");
    }
  } else {
    const allocations = (await client.query("SELECT * FROM finance_payout_allocations WHERE operation_id=$1 ORDER BY course_id", [operation.id])).rows;
    if (allocations.reduce((n, a) => n + a.amount, 0) !== operation.amount) throw new AuthError(409, "allocation_invalid", "Ventilation comptable incohérente");
    for (const allocation of allocations) {
      const totals = await getCourseFinance(allocation.course_id, client);
      const settlement = (await client.query("SELECT release_enabled FROM course_settlements WHERE course_id=$1", [allocation.course_id])).rows[0];
      if (totals.reviewRequired || !settlement?.release_enabled || totals.teacherPaid + totals.teacherReserved > (totals.teacherDue ?? 0)) {
        throw new AuthError(409, "payout_held", "Un cours de ce reversement nécessite une revue ; le versement reste réservé");
      }
    }
  }
}

/** Une preuve relue doit résoudre sa propre anomalie. Ne pas réinjecter le
 * drapeau d'une opération voisine : cela rendrait deux alertes impossibles à
 * clôturer. Les blocages agrégés du cours continuent d'interdire sa libération. */
async function operationBalancesConsistent(client: PoolClient, operation: any): Promise<boolean> {
  const affected = operation.course_id ? [operation.course_id]
    : (await client.query("SELECT course_id FROM finance_payout_allocations WHERE operation_id=$1", [operation.id])).rows.map(r => r.course_id);
  for (const courseId of affected) {
    const totals = await getCourseFinance(courseId, client);
    if (totals.refundAmount > totals.capturedAmount || totals.capturedAmount - totals.refundAmount + totals.platformLossAcceptedAmount
      < Math.max(totals.teacherDue ?? 0, totals.teacherPaid + totals.teacherReserved)) return false;
  }
  return true;
}

export async function decideOperation(operationId: number, actor: Actor, approve: boolean, body: any) {
  if (actor.role !== "admin") throw new AuthError(403, "forbidden", "Administrateur requis");
  const reason = requiredString(body, "reason", { max: 2000 });
  return inTransaction(async (client) => {
    const operation = await lockOperation(client, operationId);
    if (operation.status === (approve ? "approved" : "rejected")) return operationDto(operation);
    const confirmedNotExecuted = !approve && operation.status === "approved" && (
      (!operation.provider_reference && body.notExecutedConfirmed === true)
      || (operation.provider_reference && ["failed", "abandoned", "reversed"].includes(operation.provider_evidence?.status)));
    if (operation.status !== "requested" && !confirmedNotExecuted) throw new AuthError(409, "operation_state", "Cette décision n'est plus possible sans preuve d'échec ou confirmation explicite d'absence d'exécution");
    let acceptedLoss = 0;
    if (approve) {
      if (operation.kind === "refund") {
        const totals = await getCourseFinance(operation.course_id, client);
        if (operation.amount > totals.capturedAmount - totals.refundAmount) throw new AuthError(409, "insufficient_captured_funds", "Remboursement supérieur aux encaissements vérifiés restants");
        acceptedLoss = Math.max(0, operation.amount + totals.refundAmount + Math.max(totals.teacherDue ?? 0, totals.teacherPaid + totals.teacherReserved)
          - totals.capturedAmount - totals.platformLossAcceptedAmount);
        if (acceptedLoss > 0) {
          if (totals.teacherReserved > 0 || (totals.teacherDue ?? 0) > totals.teacherPaid || acceptedLoss > operation.amount) {
            throw new AuthError(409, "refund_requires_settlement_review", "Ce remboursement nécessite un dû professeur déjà réglé, aucune réservation de versement et l'acceptation explicite de la perte par la plateforme");
          }
          if (body.acceptPlatformLoss !== true) throw Object.assign(new AuthError(409, "platform_loss_approval_required",
            `La plateforme doit accepter explicitement une perte de ${acceptedLoss} XOF, le professeur ayant déjà été versé.`), { platformLossAmount: acceptedLoss });
        } else await validateReservedOperation(client, operation);
      } else await validateReservedOperation(client, operation);
    }
    const row = (await client.query(
      `UPDATE finance_operations SET status=$2,decided_by=$3::int,decision_reason=$4,decided_at=now(),updated_at=now(),
       platform_loss_amount=$5::int,platform_loss_accepted_at=CASE WHEN $5::int>0 THEN now() ELSE NULL END,
       platform_loss_accepted_by=CASE WHEN $5::int>0 THEN $3::int ELSE NULL END,needs_review=FALSE WHERE id=$1 RETURNING *`,
      [operationId, approve ? "approved" : "rejected", actor.id, reason, acceptedLoss],
    )).rows[0];
    await financeEvent(client, operationId, operation.course_id, actor.id, approve ? "approved" : "rejected", { reason, platformLossAcceptedAmount: acceptedLoss });
    return operationDto(row);
  });
}

function providerDomain(): string { return process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test"; }
function evidenceError(message = "La preuve du prestataire ne correspond pas à cette opération") {
  return new AuthError(409, "provider_evidence_mismatch", message);
}

function storedEvidence(data: any) {
  return {
    id: data.id ?? null, reference: data.reference ?? null, status: data.status,
    domain: data.domain, currency: data.currency, amount: data.amount,
    transaction: typeof data.transaction === "object" ? data.transaction?.id : data.transaction ?? null,
    createdAt: data.createdAt ?? data.created_at ?? null,
    recipientCode: typeof data.recipient === "string" ? data.recipient : data.recipient?.recipient_code ?? null,
    recipientPhone: data.recipient?.details?.account_number ?? null,
    recipientProvider: data.recipient?.details?.bank_name ?? null,
  };
}

/** Sources : https://paystack.com/docs/api/refund/ et /docs/api/transfer/.
 * Lecture GET seulement. Le client ne fournit jamais la preuve ni le statut. */
async function fetchEvidence(operation: any, reference: string) {
  if (!/^[A-Za-z0-9._=-]{1,100}$/.test(reference)) throw new ValidationError("providerReference", "référence prestataire invalide");
  if (operation.kind === "refund") {
    if (!/^\d+$/.test(reference)) throw new ValidationError("providerReference", "identifiant numérique du remboursement Paystack requis");
    const payment = (await pool.query("SELECT * FROM payments WHERE id=$1", [operation.payment_id])).rows[0];
    if (!payment?.funds_verified_at || payment.verification_source !== "provider") throw evidenceError("L'encaissement original doit être vérifié");
    const data = await paystackRead(`/refund/${encodeURIComponent(reference)}`);
    const transaction = await paystackRead(`/transaction/verify/${encodeURIComponent(payment.paystack_reference)}`);
    const transactionId = typeof data.transaction === "object" ? data.transaction?.id : data.transaction;
    if (String(data.id) !== reference || data.domain !== providerDomain() || data.currency !== "XOF"
        || Number(data.amount) !== toPaystackAmount(operation.amount)
        || transaction.reference !== payment.paystack_reference || transaction.domain !== providerDomain()
        || transaction.currency !== "XOF" || Number(transaction.amount) !== toPaystackAmount(payment.amount)
        || transaction.id == null || String(transactionId) !== String(transaction.id)) throw evidenceError();
    return { data, confirmed: data.status === "processed", reversed: false };
  }
  const data = await paystackRead(`/transfer/verify/${encodeURIComponent(reference)}`);
  let recipient = data.recipient;
  if (!recipient?.details?.account_number) {
    const code = typeof recipient === "string" ? recipient : recipient?.recipient_code;
    if (typeof code !== "string" || !/^[A-Za-z0-9_]+$/.test(code)) throw evidenceError("Bénéficiaire du reversement absent");
    recipient = await paystackRead(`/transferrecipient/${encodeURIComponent(code)}`);
  }
  let destination: string;
  try { destination = "+225" + normalizeCiPhone(recipient?.details?.account_number ?? ""); }
  catch { throw evidenceError("Le destinataire du reversement n'est pas le téléphone du professeur"); }
  const bank = String(recipient?.details?.bank_name ?? "").toLowerCase();
  const created = new Date(data.createdAt ?? data.created_at ?? "").getTime();
  if (data.reference !== reference || data.domain !== providerDomain() || data.currency !== "XOF"
      || Number(data.amount) !== toPaystackAmount(operation.amount) || recipient.type !== "mobile_money"
      || recipient.currency !== "XOF" || destination !== operation.beneficiary_phone
      || !bank.includes(operation.provider) || !Number.isFinite(created)
      || created < new Date(operation.created_at).getTime() - 300_000) throw evidenceError();
  return { data: { ...data, recipient }, confirmed: data.status === "success", reversed: data.status === "reversed" };
}

export async function verifyOperation(operationId: number, actor: Actor | null, reference: string) {
  if (actor && actor.role !== "admin") throw new AuthError(403, "forbidden", "Administrateur requis");
  const before = (await pool.query("SELECT * FROM finance_operations WHERE id=$1", [operationId])).rows[0];
  if (!before) throw new AuthError(404, "not_found", "Opération introuvable");
  if (!["approved", "verified", "reversed"].includes(before.status)) throw new AuthError(409, "operation_state", "Approuver la demande avant de vérifier sa preuve");
  if (before.provider_reference && before.provider_reference !== reference) throw new AuthError(409, "reference_locked", "Une référence prestataire est déjà rattachée à cette opération");
  const evidence = await fetchEvidence(before, reference);
  return inTransaction(async (client) => {
    const operation = await lockOperation(client, operationId);
    if (operation.provider_reference && operation.provider_reference !== reference) throw new AuthError(409, "reference_locked", "La référence de cette opération a changé");
    if (!["approved", "verified", "reversed"].includes(operation.status)) throw new AuthError(409, "operation_state", "État modifié pendant la vérification");
    if (operation.status === "reversed") {
      if (!evidence.reversed) throw evidenceError("Le prestataire ne confirme plus l'inversion ; cette anomalie doit être examinée");
      const review = !(await operationBalancesConsistent(client, operation));
      const row = (await client.query("UPDATE finance_operations SET needs_review=$2,last_checked_at=now(),provider_evidence=$3 WHERE id=$1 RETURNING *",
        [operationId, review, JSON.stringify(storedEvidence(evidence.data))])).rows[0];
      if (operation.needs_review && !review) await financeEvent(client, operationId, operation.course_id, actor?.id ?? null, "reversal_review_resolved", { reference });
      return operationDto(row);
    }
    if (evidence.reversed && operation.kind === "payout" && operation.status === "verified") {
      const row = (await client.query(
        `UPDATE finance_operations SET status='reversed',provider_evidence=$2,last_checked_at=now(),needs_review=FALSE,updated_at=now() WHERE id=$1 RETURNING *`,
        [operationId, JSON.stringify(storedEvidence(evidence.data))],
      )).rows[0];
      await client.query(
        `INSERT INTO transactions(user_id,title,subtitle,amount,credit,finance_reversal_id)
         VALUES($1,'Reversement inversé par le prestataire',$2,$3,FALSE,$4) ON CONFLICT(finance_reversal_id) WHERE finance_reversal_id IS NOT NULL DO NOTHING`,
        [operation.requested_by, reference, -operation.amount, operationId],
      );
      await financeEvent(client, operationId, null, actor?.id ?? null, "provider_reversed", { reference });
      const review = !(await operationBalancesConsistent(client, row));
      const fresh = (await client.query("UPDATE finance_operations SET needs_review=$2 WHERE id=$1 RETURNING *", [operationId, review])).rows[0];
      if (operation.needs_review && !review) await financeEvent(client, operationId, null, actor?.id ?? null, "reversal_review_resolved", { reference });
      return operationDto(fresh);
    }
    if (!evidence.confirmed) {
      // Ne jamais inventer de succès ; conserver la réservation et la référence
      // pour la réconciliation. Un état final inattendu après succès est à revoir.
      const row = (await client.query(
        `UPDATE finance_operations SET provider_reference=$2,provider_evidence=$3,last_checked_at=now(),
         needs_review=needs_review OR status='verified',updated_at=now() WHERE id=$1 RETURNING *`,
        [operationId, reference, JSON.stringify(storedEvidence(evidence.data))],
      )).rows[0];
      await financeEvent(client, operationId, operation.course_id, actor?.id ?? null, "provider_pending", { reference, status: evidence.data.status });
      return operationDto(row);
    }
    if (operation.status === "verified") {
      await client.query("UPDATE finance_operations SET last_checked_at=now(),needs_review=FALSE,provider_evidence=$2 WHERE id=$1", [operationId, JSON.stringify(storedEvidence(evidence.data))]);
      const stillNeedsReview = !(await operationBalancesConsistent(client, operation));
      const fresh = (await client.query("UPDATE finance_operations SET needs_review=$2 WHERE id=$1 RETURNING *", [operationId, stillNeedsReview])).rows[0];
      if (operation.needs_review && !stillNeedsReview) await financeEvent(client, operationId, operation.course_id, actor?.id ?? null, "review_resolved_by_verification", { reference });
      return operationDto(fresh);
    }
    // Une preuve d'argent réellement versé reste enregistrable même lorsqu'un
    // litige est arrivé après l'approbation. Elle sera signalée à l'opérateur.
    let review = false;
    await client.query("UPDATE finance_operations SET needs_review=FALSE WHERE id=$1", [operationId]);
    try { await validateReservedOperation(client, operation); } catch (error) {
      if (!(error instanceof AuthError)) throw error;
      review = true;
    }
    const row = (await client.query(
      `UPDATE finance_operations SET status='verified',provider_reference=$2,provider_evidence=$3,
       verified_by=$4,verified_at=now(),last_checked_at=now(),needs_review=$5,updated_at=now() WHERE id=$1 RETURNING *`,
      [operationId, reference, JSON.stringify(storedEvidence(evidence.data)), actor?.id ?? null, review],
    )).rows[0];
    const userId = operation.kind === "refund"
      ? (await client.query("SELECT user_id FROM courses WHERE id=$1", [operation.course_id])).rows[0].user_id
      : operation.requested_by;
    await client.query(
      `INSERT INTO transactions(user_id,title,subtitle,amount,credit,finance_operation_id)
       VALUES($1,$2,$3,$4,TRUE,$5) ON CONFLICT(finance_operation_id) WHERE finance_operation_id IS NOT NULL DO NOTHING`,
      [userId, operation.kind === "refund" ? "Remboursement confirmé par le prestataire" : "Reversement professeur confirmé", reference, operation.amount, operationId],
    );
    if (operation.kind === "refund") {
      const totals = await getCourseFinance(operation.course_id, client);
      await client.query("UPDATE courses SET payment_status=$2,updated_at=now() WHERE id=$1",
        [operation.course_id, totals.refundAmount >= totals.capturedAmount ? "refunded" : "partially_refunded"]);
    }
    await financeEvent(client, operationId, operation.course_id, actor?.id ?? null, "provider_verified", { reference, amount: operation.amount, needsReview: review });
    return operationDto(row);
  });
}

export async function teacherEarnings(teacherId: number) {
  const courses = (await pool.query("SELECT id,lifecycle_status,duration_minutes FROM courses WHERE teacher_id=$1 ORDER BY id", [teacherId])).rows;
  const summary = { expected: 0, due: 0, releasable: 0, reserved: 0, paid: 0 };
  for (const course of courses) {
    const finance = await getCourseFinance(course.id);
    if (finance.capturedAmount > 0) summary.expected += finance.teacherNetAmount ?? 0;
    summary.due += finance.teacherDue ?? 0; summary.releasable += finance.teacherReleasable;
    summary.reserved += finance.teacherReserved; summary.paid += finance.teacherPaid;
  }
  const operations = (await pool.query("SELECT * FROM finance_operations WHERE teacher_id=$1 ORDER BY id DESC LIMIT 200", [teacherId])).rows;
  const completed = courses.filter(c => c.lifecycle_status === "completed");
  const hours = completed.reduce((n, c) => n + (c.duration_minutes ?? 0) / 60, 0);
  return {
    total: summary.due, trend: "—", weeks: [], summary,
    stats: [{ value: String(completed.length), label: "cours réalisés" }, { value: `${hours.toLocaleString("fr-FR")} h`, label: "enseignées" },
      { value: hours ? String(Math.round(summary.due / hours)) : "—", label: "F / h décidé" }],
    payouts: operations.filter(o => o.status === "verified").map(o => ({ provider: o.provider, date: o.verified_at, amount: o.amount, color: "green" })),
    payoutRequests: operations.map(operationDto),
  };
}

export async function reconcileFinanceOperations(limit = 20) {
  const ids = (await pool.query(
    `WITH selected AS (SELECT id FROM finance_operations WHERE provider_reference IS NOT NULL
       AND status IN ('approved','verified') AND (last_checked_at IS NULL OR last_checked_at<now()-interval '1 hour')
       ORDER BY last_checked_at NULLS FIRST,id FOR UPDATE SKIP LOCKED LIMIT $1)
     UPDATE finance_operations o SET last_checked_at=now() FROM selected s WHERE o.id=s.id RETURNING o.id,o.provider_reference`, [Math.min(50, Math.max(1, limit))],
  )).rows;
  let checked = 0, errors = 0;
  for (const row of ids) {
    try { await verifyOperation(row.id, null, row.provider_reference); checked++; }
    catch { errors++; await pool.query("UPDATE finance_operations SET needs_review=TRUE WHERE id=$1", [row.id]); }
  }
  return { checked, errors };
}

export function registerFinanceRoutes(api: Router, admin: Router) {
  admin.use("/finance", (req, res, next) => { if (req.method === "POST") requireRecentAuth(req, res, next); else next(); });
  api.post("/courses/:id/refund-requests", businessWrap(async (req, res) => {
    res.status(201).json(await requestRefund(integer(req.params.id, "courseId"), actorFromResponse(res), req.body ?? {}));
  }));
  api.post("/teacher/payout-requests", requireRecentAuth, businessWrap(async (req, res) => {
    res.status(201).json(await requestPayout(actorFromResponse(res), req.body ?? {}));
  }));
  admin.get("/finance", businessWrap(async (req, res) => {
    const limit = integer(req.query.limit ?? 100, "limit", 1, 200);
    const before = integer(req.query.before ?? 2147483647, "before", 1, 2147483647);
    const rows = (await pool.query("SELECT * FROM courses WHERE id<$1 ORDER BY id DESC LIMIT $2", [before, limit])).rows;
    const courses = [];
    for (const course of rows) courses.push({ course, finance: await getCourseFinance(course.id) });
    const operations = (await pool.query("SELECT * FROM finance_operations ORDER BY id DESC LIMIT 200")).rows;
    res.json({ courses, operations: operations.map(operationDto), nextBefore: rows.length === limit ? rows[rows.length - 1].id : null });
  }));
  admin.get("/finance/operations", businessWrap(async (req, res) => {
    const limit = integer(req.query.limit ?? 100, "limit", 1, 200);
    const before = integer(req.query.before ?? 2147483647, "before", 1, 2147483647);
    const status = req.query.status == null ? null : requiredEnum(req.query, "status", ["requested", "approved", "verified", "rejected", "reversed"]);
    const rows = (await pool.query("SELECT * FROM finance_operations WHERE id<$1 AND ($2::text IS NULL OR status=$2) ORDER BY id DESC LIMIT $3", [before, status, limit])).rows;
    res.json({ operations: rows.map(operationDto), nextBefore: rows.length === limit ? rows[rows.length - 1].id : null });
  }));
  admin.post("/finance/courses/:id/settlement", businessWrap(async (req, res) => {
    res.json(await decideSettlement(integer(req.params.id, "courseId"), actorFromResponse(res), req.body ?? {}));
  }));
  for (const decision of ["approve", "reject"] as const) admin.post(`/finance/operations/:id/${decision}`, businessWrap(async (req, res) => {
    res.json(await decideOperation(integer(req.params.id, "operationId"), actorFromResponse(res), decision === "approve", req.body ?? {}));
  }));
  admin.post("/finance/operations/:id/verify", businessWrap(async (req, res) => {
    res.json(await verifyOperation(integer(req.params.id, "operationId"), actorFromResponse(res), requiredString(req.body, "providerReference", { max: 100 })));
  }));
  admin.post("/finance/operations/:id/resolve-review", businessWrap(async (req, res) => {
    const id = integer(req.params.id, "operationId"), actor = actorFromResponse(res);
    const reason = requiredString(req.body, "reason", { max: 2000 });
    const operation = (await pool.query("SELECT * FROM finance_operations WHERE id=$1", [id])).rows[0];
    if (!operation?.provider_reference) throw new AuthError(409, "provider_reference_required", "Une référence vérifiable est nécessaire pour clôturer cette anomalie");
    const result = await verifyOperation(id, actor, operation.provider_reference);
    if (result.needsReview) throw new AuthError(409, "review_unresolved", "La preuve ou les soldes demandent encore une résolution ; aucune anomalie n'a été masquée");
    await financeEvent(pool, id, operation.course_id, actor.id, "operator_review_resolved", { reason });
    res.json(result);
  }));
  admin.post("/finance/reconcile", businessWrap(async (_req, res) => {
    res.json({ payments: await reconcilePendingPayments(20), operations: await reconcileFinanceOperations(20) });
  }));
  admin.post("/finance/payments/:id/reconcile", businessWrap(async (req, res) => {
    res.json(await reconcilePaymentById(integer(req.params.id, "paymentId")));
  }));
  admin.post("/finance/courses/:id/mark-uncollected", businessWrap(async (req, res) => {
    const id = integer(req.params.id, "courseId"), actor = actorFromResponse(res);
    const reason = requiredString(req.body, "reason", { max: 2000 });
    await inTransaction(async client => {
      const course = await lockCourse(client, id, actor);
      const paymentRows = (await client.query("SELECT * FROM payments WHERE course_id=$1 FOR UPDATE", [id])).rows;
      if (paymentRows.some(p => p.funds_verified_at || ["pending", "otp_required"].includes(p.status)
        || (p.status === "success" && p.provider_response?.mock !== true && p.verification_source !== "simulation"))) {
        throw new AuthError(409, "provider_review_required", "Vérifier les références prestataire existantes avant de déclarer l'absence d'encaissement");
      }
      if ((await client.query("SELECT id FROM finance_operations WHERE course_id=$1 OR id IN (SELECT operation_id FROM finance_payout_allocations WHERE course_id=$1)", [id])).rowCount) {
        throw new AuthError(409, "finance_history_exists", "Une opération financière est rattachée à ce cours");
      }
      await client.query("UPDATE courses SET payment_status='uncollected',updated_at=now() WHERE id=$1", [id]);
      await courseEvent(client, id, actor, "historical_uncollected", { reason, previousStatus: course.payment_status });
      await financeEvent(client, null, id, actor.id, "historical_uncollected", { reason, previousStatus: course.payment_status });
    });
    res.json({ ok: true, finance: await getCourseFinance(id) });
  }));
}
