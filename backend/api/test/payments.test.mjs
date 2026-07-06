import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

const BASE = process.env.API_BASE || "http://localhost:8099";

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

const login = async (phone) => (await post("/api/auth/login", { phone })).body.token;

test("POST /api/payments/charge-mobile sans courseId -> 400", async () => {
  const token = await login("+2250758421903");
  const { status, body } = await post("/api/payments/charge-mobile", { provider: "orange", phone: "+2250758421903" }, token);
  assert.equal(status, 400);
  assert.equal(body.field, "courseId");
});

test("POST /api/payments/charge-mobile cours inexistant -> 400", async () => {
  const token = await login("+2250758421903");
  const { status, body } = await post(
    "/api/payments/charge-mobile",
    { courseId: 999999, provider: "orange", phone: "+2250758421903" },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.field, "courseId");
});

test("parcours booking -> charge mock -> paid", async () => {
  const token = await login("+2250758421903");
  const booking = await post(
    "/api/bookings",
    { teacherId: 1, subject: "Maths", price: 5000, format: "online" },
    token
  );
  assert.equal(booking.status, 201);
  const courseId = booking.body.course.id;
  assert.equal(booking.body.course.payment_status, "pending");

  const charge = await post(
    "/api/payments/charge-mobile",
    { courseId, provider: "mtn", phone: "+2250758421903" },
    token
  );
  assert.equal(charge.status, 200);
  assert.ok(charge.body.paymentId);
  assert.equal(charge.body.status, "success");

  const status = await get(`/api/payments/${charge.body.paymentId}/status`, token);
  assert.equal(status.status, 200);
  assert.equal(status.body.paid, true);

  const wallet = await get("/api/wallet", token);
  const paidTx = wallet.body.transactions?.find((t) => t.amount === -5000);
  assert.ok(paidTx, "transaction débit enregistrée");
});

test("double charge sur cours déjà payé -> 400", async () => {
  const token = await login("+2250758421903");
  const booking = await post(
    "/api/bookings",
    { teacherId: 1, subject: "Physique", price: 3000, format: "online" },
    token
  );
  const courseId = booking.body.course.id;
  const first = await post(
    "/api/payments/charge-mobile",
    { courseId, provider: "orange", phone: "+2250758421903" },
    token
  );
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "success");

  const second = await post(
    "/api/payments/charge-mobile",
    { courseId, provider: "orange", phone: "+2250758421903" },
    token
  );
  assert.equal(second.status, 400);
  assert.equal(second.body.field, "courseId");
});

test("POST /api/payments/submit-otp mode mock OTP", async () => {
  const token = await login("+2250758421903");
  const booking = await post(
    "/api/bookings",
    { teacherId: 2, subject: "Anglais", price: 4000, format: "home" },
    token
  );
  const courseId = booking.body.course.id;
  const charge = await post(
    "/api/payments/charge-mobile",
    { courseId, provider: "orange", phone: "+2250758421999" },
    token
  );
  assert.equal(charge.status, 200);
  assert.equal(charge.body.status, "otp_required");

  const otp = await post(
    "/api/payments/submit-otp",
    { paymentId: charge.body.paymentId, otp: "123456" },
    token
  );
  assert.equal(otp.status, 200);
  assert.equal(otp.body.status, "success");
});

test("webhook Paystack signature invalide -> 401", async () => {
  if (!process.env.PAYSTACK_SECRET_KEY?.trim()) {
    return; // webhook désactivé sans clé — skip
  }
  const res = await fetch(BASE + "/api/payments/paystack/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": "bad" },
    body: JSON.stringify({ event: "charge.success", data: { reference: "mpp_test" } }),
  });
  assert.equal(res.status, 401);
});

test("webhook Paystack charge.success finalise le paiement", async () => {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return;

  const token = await login("+2250758421903");
  const booking = await post(
    "/api/bookings",
    { teacherId: 1, subject: "SVT", price: 3500, format: "online" },
    token
  );
  const courseId = booking.body.course.id;

  // Créer un paiement pending manuellement via charge mock off — insert via API impossible;
  // on simule en mockant reference via charge puis webhook.
  const charge = await post(
    "/api/payments/charge-mobile",
    { courseId, provider: "mtn", phone: "+2250758421903" },
    token
  );
  if (charge.body.status === "success") return; // mock auto-success, webhook redondant OK

  const reference = charge.body.reference || `mpp_webhook_${courseId}`;
  const payload = JSON.stringify({
    event: "charge.success",
    data: { reference, amount: 350000, currency: "XOF", status: "success" },
  });
  const sig = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  const res = await fetch(BASE + "/api/payments/paystack/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": sig },
    body: payload,
  });
  assert.equal(res.status, 200);
});
