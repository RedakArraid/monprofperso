import crypto from "crypto";
import { pool } from "./db";
import { ValidationError } from "./validate";

export const PAYMENT_PROVIDERS = ["orange", "mtn", "wave"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ["pending", "otp_required", "success", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const PAYSTACK_BASE = "https://api.paystack.co";

function isMockMode(): boolean {
  return process.env.PAYSTACK_MOCK === "true" || !process.env.PAYSTACK_SECRET_KEY?.trim();
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY manquant");
  return key;
}

function normalizeCiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("225") && digits.length >= 12) return "0" + digits.slice(3);
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return "0" + digits;
  return digits;
}

/** Paystack CI : orange, mtn, wave (cf. support Paystack). */
function toPaystackProvider(provider: PaymentProvider): string {
  if (provider === "orange" || provider === "mtn" || provider === "wave") {
    return provider;
  }
  throw new ValidationError("provider", "fournisseur invalide (orange, mtn, wave)");
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    orange: "Orange Money",
    mtn: "MTN MoMo",
    wave: "Wave",
    moov: "Moov",
  };
  return labels[provider] ?? provider;
}

async function paystackFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const msg = json.message || `Paystack ${res.status}`;
    throw new Error(String(msg).slice(0, 300));
  }
  return json;
}

async function getCourseForPayment(courseId: number, userId: number) {
  const r = await pool.query(
    `SELECT c.id, c.user_id, c.price, c.payment_status, c.subject, c.teacher_name,
            c.day_label, c.day_num, c.time, u.phone AS user_phone
     FROM courses c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1 AND c.user_id = $2`,
    [courseId, userId]
  );
  const row = r.rows[0];
  if (!row) throw new ValidationError("courseId", "cours introuvable");
  if (row.payment_status === "paid") {
    throw new ValidationError("courseId", "ce cours est déjà payé");
  }
  return row;
}

function mapPaystackChargeStatus(data: any): PaymentStatus {
  const st = String(data?.status ?? "").toLowerCase();
  if (st === "success") return "success";
  if (st === "send_otp" || st === "pay_offline") return "otp_required";
  if (st === "failed") return "failed";
  return "pending";
}

export async function initiateMobileCharge(opts: {
  courseId: number;
  provider: PaymentProvider;
  phone: string;
  userId: number;
}): Promise<{ paymentId: number; status: PaymentStatus; message?: string; reference?: string }> {
  const course = await getCourseForPayment(opts.courseId, opts.userId);
  const phone = normalizeCiPhone(opts.phone || course.user_phone || "");
  if (!phone || phone.length < 9) {
    throw new ValidationError("phone", "numéro Mobile Money requis");
  }

  const existing = await pool.query(
    `SELECT id, status, paystack_reference FROM payments
     WHERE course_id = $1 AND status IN ('pending', 'otp_required')
     ORDER BY created_at DESC LIMIT 1`,
    [opts.courseId]
  );
  if (existing.rows[0]?.status === "otp_required") {
    return {
      paymentId: existing.rows[0].id,
      status: "otp_required",
      reference: existing.rows[0].paystack_reference,
      message: "Saisissez le code reçu sur votre téléphone.",
    };
  }

  const amount = Number(course.price);
  const paystackProvider = toPaystackProvider(opts.provider);
  const reference = `mpp_${opts.courseId}_${Date.now()}`;

  const ins = await pool.query(
    `INSERT INTO payments (user_id, course_id, amount, provider, phone, paystack_reference, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [opts.userId, opts.courseId, amount, opts.provider, phone, reference]
  );
  const paymentId = ins.rows[0].id as number;

  if (isMockMode()) {
    const mockOtp =
      process.env.PAYSTACK_MOCK_OTP === "true" || normalizeCiPhone(phone).endsWith("99");
    const mockStatus: PaymentStatus = mockOtp ? "otp_required" : "success";
    await pool.query(
      `UPDATE payments SET status = $1, provider_response = $2, updated_at = now() WHERE id = $3`,
      [mockStatus, JSON.stringify({ mock: true }), paymentId]
    );
    if (mockStatus === "success") {
      await finalizeSuccessfulPayment(paymentId);
    }
    return {
      paymentId,
      status: mockStatus,
      reference,
      message: mockStatus === "otp_required" ? "Mode test : saisissez n'importe quel code à 6 chiffres." : undefined,
    };
  }

  const email = `user${opts.userId}@monprofperso.ci`;
  let chargeJson: any;
  try {
    chargeJson = await paystackFetch("/charge", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount,
        currency: "XOF",
        reference,
        mobile_money: { phone, provider: paystackProvider },
      }),
    });
  } catch (e: any) {
    await pool.query(
      `UPDATE payments SET status = 'failed', provider_response = $1, updated_at = now() WHERE id = $2`,
      [JSON.stringify({ error: String(e?.message ?? e) }), paymentId]
    );
    throw e;
  }

  const data = chargeJson.data ?? {};
  const status = mapPaystackChargeStatus(data);
  await pool.query(
    `UPDATE payments SET status = $1, paystack_reference = COALESCE($2, paystack_reference),
       provider_response = $3, updated_at = now() WHERE id = $4`,
    [status, data.reference ?? reference, JSON.stringify(data), paymentId]
  );

  if (status === "success") {
    await finalizeSuccessfulPayment(paymentId);
  }

  return {
    paymentId,
    status,
    reference: data.reference ?? reference,
    message:
      status === "otp_required"
        ? "Confirmez le paiement avec le code envoyé sur votre téléphone."
        : undefined,
  };
}

export async function submitPaymentOtp(opts: {
  paymentId: number;
  otp: string;
  userId: number;
}): Promise<{ paymentId: number; status: PaymentStatus; message?: string }> {
  const otp = opts.otp?.trim();
  if (!otp) throw new ValidationError("otp", "code OTP requis");

  const r = await pool.query(
    `SELECT id, user_id, course_id, paystack_reference, status FROM payments WHERE id = $1`,
    [opts.paymentId]
  );
  const row = r.rows[0];
  if (!row || row.user_id !== opts.userId) {
    throw new ValidationError("paymentId", "paiement introuvable");
  }
  if (row.status === "success") return { paymentId: row.id, status: "success" };
  if (row.status !== "otp_required" && row.status !== "pending") {
    throw new ValidationError("paymentId", "paiement non éligible à la validation OTP");
  }

  if (isMockMode()) {
    await pool.query(
      `UPDATE payments SET status = 'success', updated_at = now() WHERE id = $1`,
      [row.id]
    );
    await finalizeSuccessfulPayment(row.id);
    return { paymentId: row.id, status: "success", message: "Paiement confirmé." };
  }

  const ref = row.paystack_reference;
  let submitJson: any;
  try {
    submitJson = await paystackFetch("/charge/submit_otp", {
      method: "POST",
      body: JSON.stringify({ otp, reference: ref }),
    });
  } catch (e: any) {
    await pool.query(
      `UPDATE payments SET status = 'failed', provider_response = provider_response || $1::jsonb, updated_at = now() WHERE id = $2`,
      [JSON.stringify({ otpError: String(e?.message ?? e) }), row.id]
    );
    throw e;
  }

  const data = submitJson.data ?? {};
  const status = mapPaystackChargeStatus(data);
  await pool.query(
    `UPDATE payments SET status = $1, provider_response = $2, updated_at = now() WHERE id = $3`,
    [status, JSON.stringify(data), row.id]
  );
  if (status === "success") {
    await finalizeSuccessfulPayment(row.id);
  }
  return {
    paymentId: row.id,
    status,
    message: status === "success" ? "Paiement confirmé." : undefined,
  };
}

export async function getPaymentStatus(paymentId: number, userId: number) {
  const r = await pool.query(
    `SELECT p.id, p.status, p.amount, p.provider, p.paystack_reference, c.payment_status AS course_payment_status
     FROM payments p
     JOIN courses c ON c.id = p.course_id
     WHERE p.id = $1 AND p.user_id = $2`,
    [paymentId, userId]
  );
  const row = r.rows[0];
  if (!row) throw new ValidationError("paymentId", "paiement introuvable");

  if (!isMockMode() && row.status === "pending" && row.paystack_reference) {
    try {
      const verify = await paystackFetch(`/transaction/verify/${encodeURIComponent(row.paystack_reference)}`);
      const data = verify.data ?? {};
      if (data.status === "success") {
        await pool.query(`UPDATE payments SET status = 'success', updated_at = now() WHERE id = $1`, [paymentId]);
        await finalizeSuccessfulPayment(paymentId);
        row.status = "success";
        row.course_payment_status = "paid";
      }
    } catch {
      /* polling silencieux */
    }
  }

  return {
    paymentId: row.id,
    status: row.status as PaymentStatus,
    amount: row.amount,
    provider: row.provider,
    coursePaymentStatus: row.course_payment_status,
    paid: row.status === "success" || row.course_payment_status === "paid",
  };
}

async function finalizeSuccessfulPayment(paymentId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pr = await client.query(
      `SELECT p.id, p.user_id, p.course_id, p.amount, p.provider, p.status,
              c.subject, c.teacher_name, c.day_label, c.day_num, c.time, c.payment_status AS course_payment_status
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       WHERE p.id = $1 FOR UPDATE`,
      [paymentId]
    );
    const p = pr.rows[0];
    if (!p) return;
    if (p.status === "success" && p.course_payment_status === "paid") {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `UPDATE payments SET status = 'success', updated_at = now() WHERE id = $1`,
      [paymentId]
    );
    await client.query(
      `UPDATE courses SET payment_status = 'paid' WHERE id = $1`,
      [p.course_id]
    );

    const subtitle = providerLabel(p.provider);
    const title = `Cours ${p.subject} · ${p.teacher_name}`;
    const txSub = `${p.day_label} ${p.day_num} · ${subtitle}`;
    const dup = await client.query(
      `SELECT 1 FROM transactions WHERE user_id = $1 AND title = $2 AND subtitle = $3 AND amount = $4 LIMIT 1`,
      [p.user_id, title, txSub, -p.amount]
    );
    if (!dup.rows[0]) {
      await client.query(
        `INSERT INTO transactions (user_id, title, subtitle, amount, credit)
         VALUES ($1, $2, $3, $4, FALSE)`,
        [p.user_id, title, txSub, -p.amount]
      );
    }

    await client.query(
      `INSERT INTO notifications (user_id, icon, accent, text, time_ago, unread, section)
       VALUES ($1, 'wallet', 'green', $2, 'à l''instant', TRUE, 'today')`,
      [p.user_id, `Paiement de ${p.amount.toLocaleString("fr-FR")} F confirmé`]
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function verifyPaystackSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature?.trim()) return false;
  const hash = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature.trim()));
  } catch {
    return false;
  }
}

export async function handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  if (isMockMode()) {
    throw new Error("webhook désactivé en mode mock");
  }
  if (!verifyPaystackSignature(rawBody, signature)) {
    const err = new Error("signature invalide") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = payload.event as string;
  const data = payload.data ?? {};

  if (event !== "charge.success") return;

  const reference = data.reference as string | undefined;
  if (!reference) return;

  const r = await pool.query(`SELECT id FROM payments WHERE paystack_reference = $1`, [reference]);
  const paymentId = r.rows[0]?.id;
  if (!paymentId) return;

  await finalizeSuccessfulPayment(paymentId);
}
