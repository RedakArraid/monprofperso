// Prestataire simulé en mémoire ; aucun appel réseau Paystack ni véritable débit.
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

process.env.NODE_ENV = "test";
process.env.PAYSTACK_MOCK = "false";
process.env.PAYSTACK_SECRET_KEY = "sk_test_local_fixture_no_external_service";
const require = createRequire(import.meta.url);
const { pool } = require("../dist/db.js");
const payments = require("../dist/payments.js");
const originalFetch = globalThis.fetch;
let userId;
let next = 0;
const noNetwork = async () => { throw new Error("Appel externe non prévu par le test"); };
globalThis.fetch = noNetwork;

before(async () => {
  userId = (await pool.query("INSERT INTO users (full_name,phone) VALUES ('Payment fixture',$1) RETURNING id", ["+999" + crypto.randomInt(100000000,999999999)])).rows[0].id;
});
afterEach(() => { globalThis.fetch = noNetwork; process.env.NODE_ENV = "test"; process.env.PAYSTACK_MOCK = "false"; });
after(async () => { globalThis.fetch = originalFetch; await pool.query("DELETE FROM users WHERE id=$1", [userId]); await pool.end(); });

async function course() {
  return (await pool.query(`INSERT INTO courses
    (user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,price,status,accepted,payment_status)
    VALUES ($1,1,'Fixture','Maths','Lycée','LUN',$2,'12h00','1h30','online',4500,'upcoming',TRUE,'pending') RETURNING *`, [userId,String(++next)])).rows[0];
}
const options = (row) => ({ courseId: row.id, userId, phone: "+2250758421903", provider: "mtn" });
const response = (data) => new Response(JSON.stringify({ status: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
function webhook(data, signature) {
  const body = Buffer.from(JSON.stringify({ event: "charge.success", data }));
  const sig = signature ?? crypto.createHmac("sha512",process.env.PAYSTACK_SECRET_KEY).update(body).digest("hex");
  return payments.handlePaystackWebhook(body, sig);
}

test("paiement réel : clé manquante ne déclenche jamais un paiement simulé", async () => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  try {
    assert.equal(payments.isMockMode(), false);
    await assert.rejects(payments.initiateMobileCharge({ courseId: 1, userId, provider: "mtn", phone: "+2250758421903" }), { statusCode: 503 });
  } finally { process.env.PAYSTACK_SECRET_KEY = key; }
  process.env.NODE_ENV = "production";
  process.env.PAYSTACK_MOCK = "true";
  assert.equal(payments.isMockMode(), false);
  assert.throws(payments.validatePaymentConfiguration, /interdit/);
  process.env.PAYSTACK_MOCK = "false";
  assert.throws(payments.validatePaymentConfiguration, /live requise/);
  process.env.APP_ENV = "staging";
  assert.doesNotThrow(payments.validatePaymentConfiguration);
  delete process.env.APP_ENV;
});

test("paiement réel : dix initiations simultanées n'émettent qu'un débit, montant XOF et téléphone exacts", async () => {
  const row = await course();
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.paystack.co/charge");
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.amount, 450000);
    assert.equal(body.currency, "XOF");
    assert.equal(body.mobile_money.phone, "0758421903");
    assert.match(body.reference, /^[a-zA-Z0-9.=-]+$/);
    return response({ status: "pay_offline", reference: body.reference, display_text: "Confirmez sur votre téléphone" });
  };
  const results = await Promise.all(Array.from({ length: 10 }, () => payments.initiateMobileCharge(options(row))));
  assert.equal(new Set(results.map((r) => r.paymentId)).size, 1);
  assert.ok(results.every((r) => r.status === "pending"));
  assert.equal(calls, 1);
  const count = await pool.query("SELECT count(*)::int AS count FROM payments WHERE course_id=$1", [row.id]);
  assert.equal(count.rows[0].count, 1);
});

test("paiement réel : délai réseau inconnu ne provoque pas un second débit", async () => {
  const row = await course();
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("réponse perdue après émission"); };
  const first = await payments.initiateMobileCharge(options(row));
  const second = await payments.initiateMobileCharge(options(row));
  assert.equal(first.status, "pending");
  assert.equal(second.paymentId, first.paymentId);
  assert.equal(calls, 1);
});

test("paiement réel : un refus explicite initial permet une nouvelle tentative", async () => {
  const row = await course();
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    if (calls === 1) return new Response(JSON.stringify({ status: false, message: "Invalid key" }), { status: 401 });
    return response({ status: "pay_offline", reference: JSON.parse(init.body).reference });
  };
  const refused = await payments.initiateMobileCharge(options(row));
  assert.equal(refused.status, "failed");
  const retried = await payments.initiateMobileCharge(options(row));
  assert.equal(retried.status, "pending");
  assert.notEqual(retried.paymentId, refused.paymentId);
  assert.equal(calls, 2);
});

test("paiement réel : refus de vérification après charge reçue ne permet pas un nouveau débit", async () => {
  const row = await course();
  let charges = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/charge")) {
      charges++;
      return response({ status: "success", reference: JSON.parse(init.body).reference });
    }
    return new Response(JSON.stringify({ status: false }), { status: 401 });
  };
  const first = await payments.initiateMobileCharge(options(row));
  const retry = await payments.initiateMobileCharge(options(row));
  assert.equal(first.status, "pending");
  assert.equal(first.paymentId, retry.paymentId);
  assert.equal(charges, 1);
});

test("paiement réel : un succès annoncé sans montant vérifié reste impayé", async () => {
  const row = await course();
  let reference;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/charge")) {
      reference = JSON.parse(init.body).reference;
      return response({ status: "success", reference });
    }
    return response({ status: "success", domain: "test", reference, currency: "XOF", amount: 1 });
  };
  const result = await payments.initiateMobileCharge(options(row));
  const state = await payments.getPaymentStatus(result.paymentId, userId);
  assert.equal(state.paid, false);
  assert.equal(state.status, "pending");
});

test("paiement réel : un OTP demandé reste disponible lors d'une vérification pending", async () => {
  const row = await course();
  let reference;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/charge")) {
      reference = JSON.parse(init.body).reference;
      return response({ status: "send_otp", reference });
    }
    return response({ status: "pending", reference });
  };
  const charge = await payments.initiateMobileCharge(options(row));
  assert.equal(charge.status, "otp_required");
  await pool.query("UPDATE payments SET created_at=now()-interval '30 seconds' WHERE id=$1", [charge.paymentId]);
  const state = await payments.getPaymentStatus(charge.paymentId, userId);
  assert.equal(state.status, "otp_required");
  assert.equal(state.paid, false);
});

test("paiement réel : réponse OTP perdue récupérée sans second débit et polls concurrents bornés", async () => {
  const row = await course();
  let reference, charges = 0, checks = 0, verifications = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (url.endsWith("/charge")) {
      charges++;
      reference = JSON.parse(init.body).reference;
      throw new Error("Réponse send_otp perdue");
    }
    if (url.includes("/transaction/verify/")) {
      verifications++;
      return response({ reference, status: "success", domain: "test", currency: "XOF", amount: 450000 });
    }
    if (url.endsWith("/charge/submit_otp")) return response({ reference, status: "success" });
    checks++;
    return response({ reference, status: "send_otp" });
  };
  const initial = await payments.initiateMobileCharge(options(row));
  assert.equal(initial.status, "pending");
  await payments.getPaymentStatus(initial.paymentId, userId);
  assert.equal(checks, 0, "respect des 10 secondes initiales");
  await pool.query("UPDATE payments SET created_at=now()-interval '30 seconds' WHERE id=$1", [initial.paymentId]);
  await Promise.all(Array.from({ length: 10 }, () => payments.getPaymentStatus(initial.paymentId,userId)));
  assert.equal(checks, 1, "un seul contrôle prestataire pour des polls concurrents");
  assert.equal((await payments.getPaymentStatus(initial.paymentId,userId)).status, "otp_required");
  const completed = await payments.submitPaymentOtp({ paymentId: initial.paymentId, userId, otp: "123456" });
  assert.equal(completed.status, "success");
  assert.equal((await payments.getPaymentStatus(initial.paymentId,userId)).paid, true);
  assert.equal(charges, 1);
  assert.equal(verifications, 1, "preuve finale vérifiée avant comptabilisation");
});

test("paiement réel : une confirmation téléphone explicite remplace un ancien écran OTP", async () => {
  const row = await course();
  let reference;
  globalThis.fetch = async (url, init = {}) => {
    if (url.endsWith("/charge")) {
      reference = JSON.parse(init.body).reference;
      return response({ reference, status: "send_otp" });
    }
    return response({ reference, status: url.includes("/transaction/verify/") ? "pending" : "pay_offline" });
  };
  const initial = await payments.initiateMobileCharge(options(row));
  assert.equal(initial.status, "otp_required");
  await pool.query("UPDATE payments SET created_at=now()-interval '30 seconds' WHERE id=$1", [initial.paymentId]);
  const state = await payments.getPaymentStatus(initial.paymentId,userId);
  assert.equal(state.status, "pending");
  assert.equal(state.paid, false);
});

test("webhook : signature, montant et devise contrôlés, confirmation répétée idempotente", async () => {
  const row = await course();
  globalThis.fetch = async (_url, init) => response({ status: "pay_offline", reference: JSON.parse(init.body).reference });
  const payment = await payments.initiateMobileCharge(options(row));
  const evidence = { reference: payment.reference, status: "success", domain: "test", currency: "XOF", amount: 450000 };
  await assert.rejects(webhook(evidence, "a".repeat(128)), { statusCode: 401 });
  await assert.rejects(webhook({ ...evidence, amount: 1 }), { statusCode: 400 });
  await assert.rejects(webhook({ ...evidence, currency: "NGN" }), { statusCode: 400 });
  await assert.rejects(webhook({ ...evidence, domain: "live" }), { statusCode: 400 });
  await assert.rejects(webhook({ ...evidence, status: "pending" }), { statusCode: 400 });
  assert.equal((await pool.query("SELECT payment_status FROM courses WHERE id=$1", [row.id])).rows[0].payment_status, "pending");
  const before = Number((await pool.query("SELECT count(*) FROM notifications WHERE user_id=$1", [userId])).rows[0].count);
  await Promise.all([webhook(evidence),webhook(evidence),webhook(evidence)]);
  const ledger = await pool.query("SELECT * FROM transactions WHERE payment_id=$1", [payment.paymentId]);
  assert.equal(ledger.rows.length, 1);
  assert.equal(ledger.rows[0].amount, -4500);
  assert.equal(Number((await pool.query("SELECT count(*) FROM notifications WHERE user_id=$1", [userId])).rows[0].count), before+1);
  const state = await payments.getPaymentStatus(payment.paymentId, userId);
  assert.equal(state.paid, true);
  assert.equal(state.status, "success");
  await assert.rejects(payments.getPaymentStatus(payment.paymentId, userId+100000), /introuvable/);
});

test("webhook historique : un paiement déjà comptabilisé avant migration n'est pas débité deux fois", async () => {
  const row = await course();
  const reference = `legacy-${crypto.randomUUID()}`;
  const payment = (await pool.query(`INSERT INTO payments
    (user_id,course_id,amount,provider,phone,paystack_reference,status,integrity_version)
    VALUES ($1,$2,4500,'mtn','0758421903',$3,'success',1) RETURNING id`, [userId,row.id,reference])).rows[0];
  await pool.query("UPDATE courses SET payment_status='paid' WHERE id=$1", [row.id]);
  await pool.query("INSERT INTO transactions (user_id,title,subtitle,amount,credit) VALUES ($1,'Historique','Ancien débit',-4500,FALSE)", [userId]);
  const before = (await pool.query("SELECT count(*)::int AS n FROM transactions WHERE user_id=$1", [userId])).rows[0].n;
  await Promise.all([1,2].map(() => webhook({ reference, status: "success", domain: "test", currency: "XOF", amount: 450000 })));
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE user_id=$1", [userId])).rows[0].n, before);
  assert.equal((await payments.getPaymentStatus(payment.id,userId)).paid, true);
});
