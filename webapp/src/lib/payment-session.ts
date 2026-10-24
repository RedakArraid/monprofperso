export type PaymentSession = { userId: number; courseId: number; amount: number; paymentId?: number };
const KEY = "mpp_payment_session";

export function readPaymentSession(userId: number | undefined): PaymentSession | null {
  if (!Number.isInteger(userId) || Number(userId) < 1) return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(KEY) || "null") as PaymentSession | null;
    if (!data || data.userId !== userId || !Number.isInteger(data.courseId) || data.courseId < 1
      || !Number.isFinite(data.amount) || data.amount <= 0
      || (data.paymentId !== undefined && (!Number.isInteger(data.paymentId) || data.paymentId < 1))) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePaymentSession(session: PaymentSession) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}
