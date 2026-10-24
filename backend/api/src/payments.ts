import crypto from "crypto";
import { pool } from "./db";
import { ValidationError } from "./validate";

export const PAYMENT_PROVIDERS = ["orange", "mtn", "wave"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export const PAYMENT_STATUSES = ["pending", "otp_required", "success", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export class PaymentUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = "payment_unavailable";
  constructor() { super("Le paiement est temporairement indisponible."); }
}

/** Une absence de clé n'est jamais une autorisation de simuler un encaissement. */
export function isMockMode(): boolean {
  return process.env.PAYSTACK_MOCK === "true" && process.env.NODE_ENV !== "production";
}

export function validatePaymentConfiguration(): void {
  if (process.env.NODE_ENV === "production" && process.env.PAYSTACK_MOCK === "true") {
    throw new Error("PAYSTACK_MOCK est interdit en production");
  }
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (key && process.env.NODE_ENV === "production") {
    const expected = process.env.APP_ENV === "staging" ? "sk_test_" : "sk_live_";
    if (!key.startsWith(expected)) throw new Error(`Clé Paystack ${expected === "sk_live_" ? "live" : "test"} requise pour cet environnement`);
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new PaymentUnavailableError();
  return key;
}

export function normalizeCiPhone(phone: string): string {
  let digits = phone.replace(/[\s()+.-]/g, "");
  if (digits.startsWith("00225")) digits = digits.slice(5);
  else if (digits.startsWith("225")) digits = digits.slice(3);
  if (!/^0[157]\d{8}$/.test(digits)) {
    throw new ValidationError("phone", "numéro Mobile Money ivoirien à 10 chiffres requis");
  }
  return digits;
}

/** Paystack exige montant XOF × 100, même si XOF n'a pas de sous-unité.
 * https://paystack.com/docs/api/#supported-currency */
export function toPaystackAmount(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 20_000_000) {
    throw new ValidationError("amount", "montant de paiement invalide");
  }
  return amount * 100;
}

export function mapPaystackChargeStatus(data: any): PaymentStatus {
  const status = String(data?.status ?? "").toLowerCase();
  if (status === "success") return "success";
  if (status === "send_otp") return "otp_required";
  if (status === "failed" || status === "abandoned") return "failed";
  // pay_offline signifie confirmation sur le téléphone, et non saisie OTP.
  return "pending";
}

type PaymentRow = {
  id: number; user_id: number; course_id: number; amount: number;
  provider: string; phone: string; status: PaymentStatus; paystack_reference: string;
};

class ProviderRejectedError extends Error {}

function paymentResponse(row: PaymentRow, message?: string) {
  return {
    paymentId: row.id, status: row.status, reference: row.paystack_reference,
    message: message ?? (row.status === "otp_required"
      ? "Saisissez le code reçu sur votre téléphone."
      : row.status === "pending" ? "Confirmez le paiement sur votre téléphone. Vérification en cours." : undefined),
  };
}

async function paystackFetch(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as any;
  if (!response.ok || result.status !== true) {
    if ([400,401,403,422].includes(response.status) && result.status === false && !result.data?.reference) {
      throw new ProviderRejectedError("Requête refusée par le prestataire");
    }
    throw new Error("Vérification du prestataire de paiement indisponible");
  }
  return result.data ?? {};
}

export function matchesPayment(data: any, payment: Pick<PaymentRow, "amount" | "paystack_reference">): boolean {
  const domain = secretKey().startsWith("sk_live_") ? "live" : "test";
  return data?.status === "success" && data?.reference === payment.paystack_reference
    && data?.domain === domain
    && data?.currency === "XOF" && Number(data?.amount) === toPaystackAmount(Number(payment.amount));
}

async function recordProviderState(payment: PaymentRow, data: any, preserveOtp = false): Promise<void> {
  const status = mapPaystackChargeStatus(data);
  // Le succès est enregistré uniquement par la transaction de finalisation.
  await pool.query(
    `UPDATE payments SET status=CASE WHEN $4 AND status='otp_required' AND $2='pending'
                                   THEN status ELSE $2 END, provider_response=$3, updated_at=now()
      WHERE id=$1 AND status <> 'success'`,
    [payment.id, status === "success" ? "pending" : status, JSON.stringify(data), preserveOtp],
  );
}

async function reconcile(payment: PaymentRow): Promise<void> {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(payment.paystack_reference)}`);
  if (data.status === "success") {
    if (!matchesPayment(data, payment)) throw new Error("Montant, devise ou référence Paystack incohérents");
    await finalizeSuccessfulPayment(payment.id, data);
  } else {
    await recordProviderState(payment, data, true);
  }
}

export async function initiateMobileCharge(opts: {
  courseId: number; provider: PaymentProvider; phone: string; userId: number;
}) {
  validatePaymentConfiguration();
  if (!isMockMode()) secretKey();
  if (!PAYMENT_PROVIDERS.includes(opts.provider)) throw new ValidationError("provider", "opérateur invalide");

  // Réserver un seul paiement sous verrou du cours, avant tout appel réseau.
  // Une réponse perdue laisse le paiement pending : une relance réutilise sa référence.
  const client = await pool.connect();
  let payment: PaymentRow;
  try {
    await client.query("BEGIN");
    const course = (await client.query(
      `SELECT c.*, u.phone AS user_phone FROM courses c JOIN users u ON u.id=c.user_id
        WHERE c.id=$1 AND c.user_id=$2 FOR UPDATE OF c`, [opts.courseId, opts.userId],
    )).rows[0];
    if (!course) throw new ValidationError("courseId", "cours introuvable");
    if (course.payment_status === "paid") throw new ValidationError("courseId", "ce cours est déjà payé");
    if (course.status !== "upcoming") throw new ValidationError("courseId", "ce cours ne peut pas être payé");
    if (!course.accepted) throw new ValidationError("courseId", "attendez l'acceptation du professeur avant de payer");
    const existing = (await client.query(
      `SELECT * FROM payments WHERE course_id=$1 AND status IN ('pending','otp_required') ORDER BY id DESC LIMIT 1`,
      [opts.courseId],
    )).rows[0] as PaymentRow | undefined;
    if (existing) {
      await client.query("COMMIT");
      return paymentResponse(existing);
    }
    const amount = Number(course.price);
    toPaystackAmount(amount);
    const phone = normalizeCiPhone(opts.phone || course.user_phone || "");
    const reference = `mpp-${opts.courseId}-${crypto.randomUUID()}`;
    payment = (await client.query(
      `INSERT INTO payments (user_id,course_id,amount,provider,phone,paystack_reference,status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [opts.userId, opts.courseId, amount, opts.provider, phone, reference],
    )).rows[0];
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }

  if (isMockMode()) {
    const needsOtp = process.env.PAYSTACK_MOCK_OTP === "true" || payment.phone.endsWith("99");
    if (needsOtp) {
      await recordProviderState(payment, { status: "send_otp", mock: true });
      payment.status = "otp_required";
    } else {
      await finalizeSuccessfulPayment(payment.id, { mock: true });
      payment.status = "success";
    }
    return paymentResponse(payment);
  }

  let chargeReceived = false;
  try {
    const data = await paystackFetch("/charge", {
      method: "POST",
      body: JSON.stringify({
        email: `user${opts.userId}@monprofperso.ci`, amount: toPaystackAmount(payment.amount),
        currency: "XOF", reference: payment.paystack_reference,
        mobile_money: { phone: payment.phone, provider: payment.provider },
      }),
    });
    chargeReceived = true;
    if (data.reference && data.reference !== payment.paystack_reference) throw new Error("Référence Paystack incohérente");
    await recordProviderState(payment, data);
    if (data.status === "success") await reconcile(payment);
    payment = (await pool.query("SELECT * FROM payments WHERE id=$1", [payment.id])).rows[0];
    return paymentResponse(payment, typeof data.display_text === "string" ? data.display_text.slice(0, 300) : undefined);
  } catch (error) {
    if (!chargeReceived && error instanceof ProviderRejectedError) {
      await pool.query("UPDATE payments SET status='failed',updated_at=now() WHERE id=$1 AND status<>'success'", [payment.id]);
      payment = (await pool.query("SELECT * FROM payments WHERE id=$1", [payment.id])).rows[0];
      return paymentResponse(payment, "Le prestataire a refusé ce paiement. Vous pouvez réessayer.");
    }
    // Ne pas lancer un second débit : le prestataire peut avoir reçu le premier.
    return paymentResponse(payment, "Le paiement est en cours de vérification. Ne lancez pas un autre paiement.");
  }
}

export async function submitPaymentOtp(opts: { paymentId: number; otp: string; userId: number }) {
  validatePaymentConfiguration();
  if (!isMockMode()) secretKey();
  const otp = opts.otp?.trim();
  if (!/^\d{4,10}$/.test(otp)) throw new ValidationError("otp", "code OTP invalide");
  let payment = (await pool.query("SELECT * FROM payments WHERE id=$1 AND user_id=$2", [opts.paymentId, opts.userId])).rows[0] as PaymentRow;
  if (!payment) throw new ValidationError("paymentId", "paiement introuvable");
  if (payment.status === "success") return paymentResponse(payment);
  if (payment.status !== "otp_required") throw new ValidationError("paymentId", "ce paiement ne demande pas de code OTP");
  if (isMockMode()) {
    await finalizeSuccessfulPayment(payment.id, { mock: true });
  } else {
    const data = await paystackFetch("/charge/submit_otp", {
      method: "POST", body: JSON.stringify({ otp, reference: payment.paystack_reference }),
    });
    if (data.reference && data.reference !== payment.paystack_reference) throw new Error("Référence Paystack incohérente");
    await recordProviderState(payment, data);
    if (data.status === "success") await reconcile(payment);
  }
  payment = (await pool.query("SELECT * FROM payments WHERE id=$1", [payment.id])).rows[0];
  return paymentResponse(payment);
}

export async function getPaymentStatus(paymentId: number, userId: number) {
  const payment = (await pool.query("SELECT * FROM payments WHERE id=$1 AND user_id=$2", [paymentId, userId])).rows[0] as PaymentRow;
  if (!payment) throw new ValidationError("paymentId", "paiement introuvable");
  if (!isMockMode() && (payment.status === "pending" || payment.status === "otp_required")) {
    // Paystack demande au moins 10 s avant de contrôler une charge incertaine.
    // Le verrou logique en base évite aussi les polls concurrents multi-clients.
    const claimed = await pool.query(`UPDATE payments SET checked_at=now()
      WHERE id=$1 AND status IN ('pending','otp_required')
        AND created_at < now()-interval '10 seconds'
        AND (checked_at IS NULL OR checked_at < now()-interval '10 seconds') RETURNING id`, [paymentId]);
    if (claimed.rowCount) {
      try {
        const data = await paystackFetch(`/charge/${encodeURIComponent(payment.paystack_reference)}`);
        if (data.reference && data.reference !== payment.paystack_reference) throw new Error("Référence Paystack incohérente");
        if (data.status === "success") await reconcile(payment);
        else {
          await recordProviderState(payment, data, data.status !== "pay_offline");
          if (mapPaystackChargeStatus(data) === "pending") await reconcile(payment);
        }
      } catch {
        // Aucune nouvelle charge : rester au dernier état connu sans preuve.
      }
    }
  }
  const row = (await pool.query(
    `SELECT p.*, c.payment_status AS course_payment_status FROM payments p
      JOIN courses c ON c.id=p.course_id WHERE p.id=$1 AND p.user_id=$2`, [paymentId, userId],
  )).rows[0];
  return {
    ...paymentResponse(row, typeof row.provider_response?.display_text === "string" ? row.provider_response.display_text.slice(0,300) : undefined), amount: row.amount, provider: row.provider,
    coursePaymentStatus: row.course_payment_status,
    paid: row.status === "success" && row.course_payment_status === "paid",
  };
}

async function finalizeSuccessfulPayment(paymentId: number, evidence: any): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const payment = (await client.query(
      `SELECT p.*, c.subject,c.teacher_name,c.day_label,c.day_num,c.payment_status AS course_payment_status
       FROM payments p JOIN courses c ON c.id=p.course_id WHERE p.id=$1 FOR UPDATE OF c,p`, [paymentId],
    )).rows[0];
    if (!payment) { await client.query("ROLLBACK"); return; }
    if (!isMockMode() && !matchesPayment(evidence, payment)) throw new Error("Preuve de paiement invalide");
    if (payment.integrity_version === 1 && payment.status === "success" && payment.course_payment_status === "paid") {
      // Le registre historique ne permet pas de relier sans ambiguïté les débits.
      // Sa réconciliation doit être faite avec les preuves, sans nouvelle dépense.
      await client.query("COMMIT");
      return;
    }
    await client.query(
      "UPDATE payments SET status='success',provider_response=$2,updated_at=now() WHERE id=$1",
      [paymentId, JSON.stringify(evidence)],
    );
    await client.query("UPDATE courses SET payment_status='paid' WHERE id=$1", [payment.course_id]);
    // Une ligne comptable par paiement, pas une déduplication par libellé/montant.
    const inserted = await client.query(
      `INSERT INTO transactions (user_id,title,subtitle,amount,credit,payment_id)
       VALUES ($1,$2,$3,$4,FALSE,$5) ON CONFLICT (payment_id) DO NOTHING RETURNING id`,
      [payment.user_id, `Cours ${payment.subject} · ${payment.teacher_name}`,
        `${payment.day_label} ${payment.day_num} · ${payment.provider}`, -payment.amount, payment.id],
    );
    if (inserted.rowCount) {
      await client.query(
        `INSERT INTO notifications (user_id,icon,accent,text,time_ago,unread,section)
         VALUES ($1,'wallet','green',$2,'à l''instant',TRUE,'today')`,
        [payment.user_id, `Paiement de ${Number(payment.amount).toLocaleString("fr-FR")} F confirmé`],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK"); throw error;
  } finally { client.release(); }
}

export function verifyPaystackSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !/^[a-fA-F0-9]{128}$/.test(signature)) return false;
  const hash = crypto.createHmac("sha512", secretKey()).update(rawBody).digest();
  return crypto.timingSafeEqual(hash, Buffer.from(signature, "hex"));
}

export async function handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  if (!verifyPaystackSignature(rawBody, signature)) {
    throw Object.assign(new Error("signature invalide"), { statusCode: 401 });
  }
  if (isMockMode()) throw new PaymentUnavailableError();
  let payload: any;
  try { payload = JSON.parse(rawBody.toString("utf8")); }
  catch { throw Object.assign(new Error("JSON invalide"), { statusCode: 400 }); }
  if (payload.event !== "charge.success") return;
  const data = payload.data ?? {};
  if (typeof data.reference !== "string") throw Object.assign(new Error("référence manquante"), { statusCode: 400 });
  const payment = (await pool.query("SELECT * FROM payments WHERE paystack_reference=$1", [data.reference])).rows[0];
  if (!payment) return;
  if (!matchesPayment(data, payment)) throw Object.assign(new Error("preuve de paiement incohérente"), { statusCode: 400 });
  await finalizeSuccessfulPayment(payment.id, data);
}
