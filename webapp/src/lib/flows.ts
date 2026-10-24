/** Shared HTTP contracts for authentication and payments. No browser side effects. */
export type OtpChallenge = {
  otpRequired: true;
  challengeId: string;
  channel: "whatsapp" | "email";
  destination: string;
  expiresInMinutes: number;
  sent: boolean;
  demo: false;
};

export function isOtpChallenge(value: unknown): value is OtpChallenge {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<OtpChallenge>;
  return r.otpRequired === true && typeof r.challengeId === "string" && r.challengeId.length > 0
    && (r.channel === "whatsapp" || r.channel === "email")
    && typeof r.destination === "string" && r.destination.length > 0
    && typeof r.expiresInMinutes === "number" && Number.isFinite(r.expiresInMinutes) && r.expiresInMinutes > 0
    && r.sent === true && r.demo === false;
}

export type PaymentStatus = "pending" | "otp_required" | "success" | "failed";
export type PaymentResult = { paymentId: number; status: PaymentStatus; message?: string; amount?: number };

export function paymentStep(value: unknown): PaymentStatus {
  const result = value as Partial<PaymentResult> | null;
  if (!result || !Number.isInteger(result.paymentId) || Number(result.paymentId) < 1
    || !["pending", "otp_required", "success", "failed"].includes(String(result.status))) {
    throw new Error("Le statut du paiement est indisponible. Vérifiez-le avant de recommencer.");
  }
  return result.status as PaymentStatus;
}

export function isConfirmedPayment(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const result = value as { status?: string; paid?: boolean };
  return result.status === "success" && result.paid === true;
}

export function canPayCourse(course: { accepted?: boolean; payment_status?: string; status?: string } | null | undefined): boolean {
  return course?.accepted === true && course.status === "upcoming"
    && typeof course.payment_status === "string" && course.payment_status !== "paid";
}

export function normalizeCiPhone(raw: string): string {
  const phone = String(raw ?? "").trim().replace(/[\s.()-]/g, "");
  if (/^0\d{9}$/.test(phone)) return "+225" + phone;
  if (/^225\d{10}$/.test(phone)) return "+" + phone;
  return phone;
}

export function needFields(form: FormData) {
  const child = String(form.get("childId") || "");
  return {
    childId: child ? Number(child) : undefined,
    subject: String(form.get("subject") || "").trim(),
    level: String(form.get("level") || "").trim(),
    format: String(form.get("format") || "home"),
    location: String(form.get("location") || "").trim(),
    description: String(form.get("description") || "").trim(),
  };
}
