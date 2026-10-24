import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_BASE || process.env.API_URL || "http://localhost:8099";
async function api(method, path, body, token) {
  const response = await fetch(BASE + path, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
const login = async (phone) => (await api("POST", "/api/auth/login", { phone })).body.token;
let slot = 100;
async function booking({ accept = true, duration = "1h30" } = {}) {
  const token = await login("+2250758421903");
  const teacherToken = await login("+2250707001234");
  const teacher = (await api("GET", "/api/teachers/1")).body;
  const result = await api("POST", "/api/bookings", {
    teacherId: 1, teacherName: "Nom falsifié", subject: "Maths", price: 1, format: "online", duration,
    startAt: new Date(Date.now() + (++slot) * 86400000).toISOString(),
  }, token);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.course.teacher_name, teacher.name);
  if (accept) {
    const accepted = await api("POST", `/api/teacher/requests/${result.body.course.id}/accept`, {}, teacherToken);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  }
  return { token, course: result.body.course, teacher };
}
const charge = (courseId, token, phone = "+2250758421903") =>
  api("POST", "/api/payments/charge-mobile", { courseId, provider: "mtn", phone }, token);

test("paiement : courseId absent ou inexistant refusé", async () => {
  const token = await login("+2250758421903");
  for (const id of [undefined, 99999999]) {
    const result = await charge(id, token);
    assert.equal(result.status, 400);
    assert.equal(result.body.field, "courseId");
  }
});

test("paiement : tarif calculé par le serveur, puis acceptation et débit du bon montant", async () => {
  const { token, course, teacher } = await booking();
  assert.equal(course.price, Math.round(teacher.price_per_hour * 1.5));
  assert.notEqual(course.price, 1, "le tarif fourni par le parent ne fait pas autorité");
  const result = await charge(course.id, token);
  assert.equal(result.status, 200);
  assert.equal(result.body.status, "success");
  const state = await api("GET", `/api/payments/${result.body.paymentId}/status`, undefined, token);
  assert.equal(state.body.paid, true);
  assert.equal(state.body.amount, course.price);
  const wallet = await api("GET", "/api/wallet", undefined, token);
  assert.ok(wallet.body.transactions.some((t) => t.payment_id === result.body.paymentId && t.amount === -course.price));
});

test("paiement : cours non accepté, annulé ou payé ne peut pas être débité", async () => {
  const pending = await booking({ accept: false });
  assert.equal((await charge(pending.course.id, pending.token)).status, 400);
  const paid = await booking();
  assert.equal((await charge(paid.course.id, paid.token)).body.status, "success");
  assert.equal((await charge(paid.course.id, paid.token)).status, 400);
});

test("paiement : le parcours OTP explicite ne confirme qu'après validation", async () => {
  const { token, course } = await booking();
  const result = await charge(course.id, token, "+2250758421999");
  assert.equal(result.body.status, "otp_required");
  assert.equal((await api("GET", `/api/payments/${result.body.paymentId}/status`, undefined, token)).body.paid, false);
  const otp = await api("POST", "/api/payments/submit-otp", { paymentId: result.body.paymentId, otp: "123456" }, token);
  assert.equal(otp.body.status, "success");
  assert.equal((await api("GET", `/api/payments/${result.body.paymentId}/status`, undefined, token)).body.paid, true);
});

test("paiement : la relance d'un paiement OTP réutilise le même paiement", async () => {
  const { token, course } = await booking();
  const first = await charge(course.id, token, "+2250758421999");
  const retry = await charge(course.id, token, "+2250758421903");
  assert.equal(first.body.paymentId, retry.body.paymentId);
  assert.equal(retry.body.status, "otp_required");
});

test("paiement : un autre compte ne peut payer ou consulter le paiement", async () => {
  const { token, course } = await booking();
  const other = await login("+2250705001122");
  assert.equal((await charge(course.id, other)).status, 400);
  const result = await charge(course.id, token, "+2250758421999");
  assert.equal((await api("GET", `/api/payments/${result.body.paymentId}/status`, undefined, other)).status, 400);
});

test("réservation : les créneaux acceptés ne peuvent pas se chevaucher", async () => {
  const { token, course } = await booking();
  const conflict = await api("POST", "/api/bookings", {
    teacherId: 1, format: "online", duration: "1h", startAt: course.starts_at,
  }, token);
  assert.equal(conflict.status, 409);
  const invalid = await api("POST", "/api/bookings", {
    teacherId: 1, format: "online", startAt: "2020-01-01T12:00:00Z",
  }, token);
  assert.equal(invalid.status, 400);
});
