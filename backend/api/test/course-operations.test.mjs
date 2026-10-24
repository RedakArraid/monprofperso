// PostgreSQL réel, serveur local et preuves prestataire en mémoire uniquement.
// Le fetch prestataire refuse tout appel non déclaré ; aucun mouvement réel.
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

process.env.NODE_ENV = "test";
process.env.PAYSTACK_MOCK = "false";
process.env.PAYSTACK_SECRET_KEY = "sk_test_course_operations_no_external_service";
process.env.ONLINE_COURSES_ENABLED = "true";
const require = createRequire(import.meta.url);
const { pool } = require("../dist/db.js");
const { signJwt } = require("../dist/auth.js");
const courseApi = require("../dist/courseLifecycle.js");
const finance = require("../dist/finance.js");
const payments = require("../dist/payments.js");
const { api } = require("../dist/routes.js");
const express = require("express");
const nativeFetch = globalThis.fetch;
const noNetwork = async () => { throw new Error("Appel fournisseur interdit par ce test"); };
globalThis.fetch = noNetwork;
let actors = {}, teacherId, server, base, sequence = 0;
const courseIds = [];
const response = data => new Response(JSON.stringify({ status: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
const key = () => crypto.randomUUID();

before(async () => {
  teacherId = (await pool.query(`INSERT INTO teachers(initials,name,subjects,rating,reviews_count,location,price_per_hour,levels,formats,needs_confirmed)
    VALUES('TT','Prof opérations test','Maths',0,0,'Abidjan',6000,ARRAY['3eme'],ARRAY['home','online'],TRUE) RETURNING id`)).rows[0].id;
  for (const [name, role] of [["parent", "parent"], ["other", "parent"], ["teacher", "teacher"], ["admin", "admin"]]) {
    const phone = "+22507" + String(crypto.randomInt(10000000,99999999));
    const id = (await pool.query("INSERT INTO users(full_name,phone,phone_verified_at,role,teacher_id) VALUES($1,$2,now(),$3,$4) RETURNING id", ["Fixture " + name, phone, role, role === "teacher" ? teacherId : null])).rows[0].id;
    actors[name] = { id, role, teacherId: role === "teacher" ? teacherId : null, phone };
  }
  const app = express(); app.use(express.json()); app.use("/api", api);
  server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(() => { globalThis.fetch = noNetwork; process.env.PAYSTACK_MOCK = "false"; process.env.ONLINE_COURSES_ENABLED = "true"; });
after(async () => {
  globalThis.fetch = nativeFetch;
  await new Promise(resolve => server?.close(resolve));
  const ids = (await pool.query("SELECT id FROM courses WHERE teacher_id=$1", [teacherId])).rows.map(r => r.id);
  const operationIds = (await pool.query("SELECT id FROM finance_operations WHERE teacher_id=$1 OR course_id=ANY($2::int[])", [teacherId, ids])).rows.map(r => r.id);
  await pool.query("DELETE FROM transactions WHERE user_id=ANY($1::int[])", [Object.values(actors).map(a => a.id)]);
  await pool.query("DELETE FROM finance_events WHERE operation_id=ANY($1::int[]) OR course_id=ANY($2::int[])", [operationIds, ids]);
  await pool.query("DELETE FROM finance_payout_allocations WHERE operation_id=ANY($1::int[])", [operationIds]);
  await pool.query("DELETE FROM finance_operations WHERE id=ANY($1::int[])", [operationIds]);
  await pool.query("DELETE FROM course_settlements WHERE course_id=ANY($1::int[])", [ids]);
  await pool.query("DELETE FROM reviews WHERE teacher_id=$1", [teacherId]);
  await pool.query("DELETE FROM courses WHERE teacher_id=$1", [teacherId]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::int[])", [Object.values(actors).map(a => a.id)]);
  await pool.query("DELETE FROM teachers WHERE id=$1", [teacherId]);
  await pool.end();
});

async function http(method, path, actor, body) {
  const res = await nativeFetch(base + "/api" + path, { method,
    headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${signJwt(actor.id, actor.role)}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function makeCourse({ state = "scheduled", past = false, missingDate = false, price = 10000 } = {}) {
  const start = missingDate ? null : new Date(Date.now() + (past ? -86400000 - (++sequence) * 7200000 : (200 + (++sequence)) * 86400000));
  const row = (await pool.query(`INSERT INTO courses(user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,
    location,private_address,price,status,accepted,payment_status,starts_at,duration_minutes,lifecycle_status,commission_pct,commission_amount,teacher_net_amount)
    VALUES($1,$2,'Prof opérations test','Maths','3eme','LUN','26 oct.','16:00','1h30','home','Abidjan','Adresse privée du parent',
    $3,$4,$5,'pending',$6,90,$7,15,$8,$9) RETURNING *`,
  [actors.parent.id, teacherId, price, state === "completed" ? "done" : "upcoming", state !== "requested", start, state, price - Math.round(price * .85), Math.round(price * .85)])).rows[0];
  courseIds.push(row.id); return row;
}
async function captured(course) {
  const reference = "operation-" + key();
  const row = (await pool.query(`INSERT INTO payments(user_id,course_id,amount,provider,phone,paystack_reference,status)
    VALUES($1,$2,$3,'mtn',$4,$5,'pending') RETURNING *`, [actors.parent.id, course.id, course.price, actors.parent.phone, reference])).rows[0];
  const evidence = { id: 100000 + row.id, reference, amount: course.price * 100, currency: "XOF", status: "success", domain: "test" };
  const raw = Buffer.from(JSON.stringify({ event: "charge.success", data: evidence }));
  const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  await payments.handlePaystackWebhook(raw, sig);
  return { ...row, evidence };
}
async function closeAndRelease(course, due = course.teacher_net_amount) {
  await pool.query("UPDATE courses SET starts_at=now()-interval '3 hours' WHERE id=$1", [course.id]);
  await courseApi.reportCourse(course.id, actors.teacher, { outcome: "completed", note: "Séance faite", progressSummary: "Équations maîtrisées, réviser les fractions." });
  await courseApi.reportCourse(course.id, actors.parent, { outcome: "completed", note: "Séance confirmée" });
  await finance.decideSettlement(course.id, actors.admin, { teacherDueAmount: due, release: true, reason: "Séance confirmée, règlement convenu" });
}

test("cours privés : authentification, propriété, contacts et lien HTTPS", async () => {
  const course = await makeCourse({ state: "requested" });
  assert.equal((await http("GET", `/courses/${course.id}`)).status, 401);
  assert.equal((await http("GET", `/courses/${course.id}`, actors.other)).status, 404);
  const teacher = await http("GET", `/courses/${course.id}`, actors.teacher);
  assert.equal(teacher.body.contacts.parentPhone, null);
  assert.equal(teacher.body.course.private_address, null);
  assert.equal((await http("GET", `/courses/${course.id}`, actors.parent)).body.course.private_address, "Adresse privée du parent");
  assert.equal((await http("PUT", `/courses/${course.id}/details`, actors.teacher, { meetingUrl: "https://meeting.example.test/x" })).status, 403);
  await pool.query("UPDATE courses SET accepted=TRUE,lifecycle_status='scheduled' WHERE id=$1", [course.id]);
  assert.equal((await http("GET", `/courses/${course.id}`, actors.teacher)).body.contacts.parentPhone, actors.parent.phone);
  assert.equal((await http("PUT", `/courses/${course.id}/details`, actors.parent, { meetingUrl: "https://meeting.example.test/x" })).status, 403);
  assert.equal((await http("PUT", `/courses/${course.id}/details`, actors.teacher, { meetingUrl: "javascript:alert(1)" })).status, 400);
  assert.equal((await http("PUT", `/courses/${course.id}/details`, actors.teacher, { meetingUrl: "https://meeting.example.test/room" })).status, 200);
});

test("historique multi-rôle : un parent devenu professeur conserve ses achats et distingue ses séances enseignées", async () => {
  const purchase = await makeCourse({ state: "requested" });
  const teaching = await makeCourse();
  await pool.query("UPDATE courses SET user_id=$2 WHERE id=$1", [teaching.id, actors.other.id]);
  await pool.query("UPDATE users SET role='teacher',teacher_id=NULL WHERE id=$1", [actors.parent.id]);
  try {
    const beforeApproval = await http("GET", "/courses", actors.parent);
    assert.equal(beforeApproval.status, 200);
    assert.equal(beforeApproval.body.find(c => c.id === purchase.id)?.participant_role, "parent");
    assert.ok(!beforeApproval.body.some(c => c.id === teaching.id));
    await pool.query("UPDATE users SET teacher_id=$2 WHERE id=$1", [actors.parent.id, teacherId]);
    const afterApproval = await http("GET", "/courses", actors.parent);
    assert.equal(afterApproval.status, 200);
    assert.equal(afterApproval.body.find(c => c.id === purchase.id)?.participant_role, "parent");
    assert.equal(afterApproval.body.find(c => c.id === teaching.id)?.participant_role, "teacher");
    assert.equal(afterApproval.body.filter(c => c.id === purchase.id).length, 1);
  } finally {
    await pool.query("UPDATE users SET role='parent',teacher_id=NULL WHERE id=$1", [actors.parent.id]);
  }
});

test("fermeture en attente : retrait du catalogue et refus métier explicite des nouvelles affectations", async () => {
  const {acceptNeedForTeacher}=require("../dist/needs.js");
  const need=(await pool.query(`INSERT INTO course_needs(user_id,subject,level,format,status,parent_price,commission_pct,duration,duration_minutes)
    VALUES($1,'Maths','3eme','home','published',10000,15,'1h30',90) RETURNING id`,[actors.parent.id])).rows[0].id;
  const requests=[];
  const body={teacherId,format:"home",startAt:new Date(Date.now()+990*86400000).toISOString()};
  try {
    requests.push((await pool.query("INSERT INTO account_deletion_requests(user_id) VALUES($1) RETURNING id",[actors.teacher.id])).rows[0].id);
    assert.ok(!(await http("GET","/teachers")).body.some(t=>t.id===teacherId));
    assert.equal((await http("GET",`/teachers/${teacherId}`)).status,404);
    const teacherClosing=await http("POST","/bookings",actors.parent,body);
    assert.equal(teacherClosing.status,409);assert.equal(teacherClosing.body.error,"teacher_unavailable");
    await assert.rejects(acceptNeedForTeacher(need,teacherId),{code:"teacher_unavailable"});
    await pool.query("DELETE FROM account_deletion_requests WHERE id=$1",[requests[0]]);
    requests.push((await pool.query("INSERT INTO account_deletion_requests(user_id) VALUES($1) RETURNING id",[actors.parent.id])).rows[0].id);
    const parentClosing=await http("POST","/bookings",actors.parent,body);
    assert.equal(parentClosing.status,409);assert.equal(parentClosing.body.error,"account_closing");
    await assert.rejects(acceptNeedForTeacher(need,teacherId),{code:"account_closing"});
  } finally {
    await pool.query("DELETE FROM account_deletion_requests WHERE id=ANY($1::int[])",[requests]);
    await pool.query("DELETE FROM course_needs WHERE id=$1",[need]);
  }
});

test("documents légaux : révisions conservées, accès admin et invalidation atomique de la revue", async () => {
  const slug = "legal-test-" + key();
  const firstPdf = Buffer.from("%PDF-1.4\nPremier document test\n%%EOF");
  const nextPdf = Buffer.from("%PDF-1.4\nDocument révisé test\n%%EOF");
  const original = (await pool.query(`INSERT INTO legal_documents(slug,title,version,file_name,mime_type,size_bytes,content)
    VALUES($1,'Document test','test-v1','fixture.pdf','application/pdf',$2,$3) RETURNING revision_id`, [slug,firstPdf.length,firstPdf])).rows[0];
  try {
    assert.equal((await http("PUT", `/admin/legal/${slug}`, actors.parent, { title: "Refusé" })).status, 403);
    assert.equal((await http("PUT", `/admin/legal/${slug}`, actors.admin, { contentBase64: "" })).status, 400);
    assert.equal((await http("PUT", `/admin/legal/${slug}`, actors.admin, { contentBase64: Buffer.from("<script>invalide</script>").toString("base64") })).status, 400);
    const changed = await http("PUT", `/admin/legal/${slug}`, actors.admin, { version: "test-v2", contentBase64: nextPdf.toString("base64"), fileName: "revised.pdf" });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.notEqual(changed.body.revision_id, original.revision_id);
    const versions = await http("GET", `/admin/legal/${slug}/versions`, actors.admin);
    assert.equal(versions.body.length, 2);
    const historical = await nativeFetch(base + `/api/admin/legal/${slug}/versions/${original.revision_id}/file`, {
      headers: { Authorization: `Bearer ${signJwt(actors.admin.id,actors.admin.role)}` },
    });
    assert.equal(historical.status, 200);
    assert.equal(historical.headers.get("x-content-type-options"), "nosniff");
    assert.equal(historical.headers.get("cache-control"), "no-store");
    assert.deepEqual(Buffer.from(await historical.arrayBuffer()), firstPdf);
    assert.equal((await http("GET", `/admin/legal/${slug}/versions/${"-".repeat(36)}/file`, actors.admin)).status, 400);
    // La preuve temporaire et la publication sont annulées ensemble : aucune
    // validation partagée ne doit être créée/remplacée durablement par le test.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO production_checks(check_key,evidence,revision,validated_by)
        VALUES('legal_review','Preuve exclusivement transactionnelle de test','fixture',$1)
        ON CONFLICT(check_key) DO UPDATE SET evidence=EXCLUDED.evidence`, [actors.admin.id]);
      await client.query("UPDATE legal_documents SET title='Troisième révision transactionnelle' WHERE slug=$1", [slug]);
      assert.equal((await client.query("SELECT 1 FROM production_checks WHERE check_key='legal_review'")).rowCount, 0);
      assert.equal((await client.query("SELECT 1 FROM legal_document_versions WHERE slug=$1", [slug])).rowCount, 3);
    } finally { await client.query("ROLLBACK"); client.release(); }
    assert.equal((await pool.query("SELECT 1 FROM legal_document_versions WHERE slug=$1", [slug])).rowCount, 2);
  } finally {
    await pool.query("DELETE FROM legal_document_versions WHERE slug=$1", [slug]);
    await pool.query("DELETE FROM legal_documents WHERE slug=$1", [slug]);
  }
});

test("devis public : version juridique courante exigée, consentement du compte existant préservé", async () => {
  const { currentConsentVersion } = require("../dist/consent.js");
  const version = await currentConsentVersion();
  await pool.query("UPDATE users SET consent_version='fixture-old-consent',consent_at='2020-01-01T00:00:00Z' WHERE id=$1", [actors.other.id]);
  const payload = { parentName: "Nom public non autorisé", parentPhone: actors.other.phone, subject: "Maths", level: "3eme", format: "home", consent: true };
  const before = (await pool.query("SELECT count(*)::int AS n FROM course_needs WHERE user_id=$1", [actors.other.id])).rows[0].n;
  const stale = await http("POST", "/needs/public", undefined, { ...payload, consentVersion: "révision-inexistante" });
  assert.equal(stale.status, 409, JSON.stringify(stale.body));
  assert.equal(stale.body.error, "consent_version_changed");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM course_needs WHERE user_id=$1", [actors.other.id])).rows[0].n, before);
  const accepted = await http("POST", "/needs/public", undefined, { ...payload, consentVersion: version });
  assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
  const user = (await pool.query("SELECT full_name,consent_version,consent_at FROM users WHERE id=$1", [actors.other.id])).rows[0];
  assert.equal(user.full_name, "Fixture other");
  assert.equal(user.consent_version, "fixture-old-consent");
  assert.equal(user.consent_at.toISOString(), "2020-01-01T00:00:00.000Z");
});

test("besoin accepté : paiement interdit avant créneau bilatéral, auto-acceptation interdite", async () => {
  const course = await makeCourse({ state: "awaiting_schedule", missingDate: true });
  await assert.rejects(payments.initiateMobileCharge({ courseId: course.id, userId: actors.parent.id, provider: "mtn", phone: actors.parent.phone }), /créneau futur/);
  const date = new Date(Date.now() + 850 * 86400000).toISOString();
  await courseApi.proposeSchedule(course.id, actors.parent, { startAt: date, reason: "Premier créneau" });
  const proposal = (await courseApi.courseDetail(course.id, actors.parent)).scheduleRequests[0];
  await assert.rejects(courseApi.respondSchedule(course.id, proposal.id, actors.parent, { decision: "accept" }), { statusCode: 403 });
  await courseApi.respondSchedule(course.id, proposal.id, actors.teacher, { decision: "accept" });
  const detail = await courseApi.courseDetail(course.id, actors.parent);
  assert.equal(detail.course.lifecycle_status, "scheduled");
  assert.equal(new Date(detail.course.starts_at).toISOString(), date);
  assert.equal(detail.course.price, 10000);
});

test("planning : deux acceptations concurrentes du même créneau ne donnent qu'un cours confirmé", async () => {
  const a = await makeCourse({ state: "awaiting_schedule", missingDate: true });
  const b = await makeCourse({ state: "awaiting_schedule", missingDate: true });
  const startAt = new Date(Date.now() + 900 * 86400000).toISOString();
  await courseApi.proposeSchedule(a.id, actors.parent, { startAt, reason: "Premier choix" });
  await courseApi.proposeSchedule(b.id, actors.parent, { startAt, reason: "Second choix" });
  const proposals = (await pool.query("SELECT id,course_id FROM course_schedule_requests WHERE course_id=ANY($1::int[])", [[a.id,b.id]])).rows;
  const results = await Promise.allSettled(proposals.map(p => courseApi.respondSchedule(p.course_id, p.id, actors.teacher, { decision: "accept" })));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.code, "slot_unavailable");
  const count = (await pool.query("SELECT count(*)::int AS n FROM courses WHERE id=ANY($1::int[]) AND lifecycle_status='scheduled'", [[a.id,b.id]])).rows[0].n;
  assert.equal(count, 1);
});

test("réservation : commission snapshot et prix serveur ; les avis administratifs sont ignorés", async () => {
  const result = await http("POST", "/bookings", actors.parent, { teacherId, subject: "Maths", format: "home", duration: "1h30",
    startAt: new Date(Date.now() + 950 * 86400000).toISOString(), price: 1 });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.course.price, 9000);
  assert.equal(result.body.course.teacher_net_amount + result.body.course.commission_amount, 9000);
  assert.equal(result.body.course.commission_pct, 15);
  const modified = await http("PUT", `/admin/teachers/${teacherId}`, actors.admin, { rating: 5, reviewsCount: 999 });
  assert.equal(modified.status, 200);
  assert.equal(modified.body.rating, 0);
  assert.equal(modified.body.reviews_count, 0);
  process.env.ONLINE_COURSES_ENABLED = "false";
  assert.equal((await http("POST", "/bookings", actors.parent, { teacherId, format: "online", startAt: new Date(Date.now() + 951 * 86400000).toISOString() })).status, 409);
});

test("absence/litige : déclaration après séance, fonds bloqués et décision administrateur auditée", async () => {
  const course = await makeCourse();
  await captured(course);
  await assert.rejects(courseApi.reportCourse(course.id, actors.teacher, { outcome: "completed", note: "Fini" }), { code: "course_not_finished" });
  await pool.query("UPDATE courses SET starts_at=now()-interval '3 hours' WHERE id=$1", [course.id]);
  await courseApi.reportCourse(course.id, actors.teacher, { outcome: "completed", note: "Fini", progressSummary: "Fractions" });
  await courseApi.reportCourse(course.id, actors.parent, { outcome: "teacher_absent", note: "Professeur absent" });
  assert.equal((await courseApi.courseDetail(course.id, actors.parent)).course.lifecycle_status, "disputed");
  await assert.rejects(finance.decideSettlement(course.id, actors.admin, { teacherDueAmount: 8500, release: true, reason: "Paiement" }), { code: "course_unresolved" });
  assert.equal((await finance.getCourseFinance(course.id)).teacherReleasable, 0);
  await assert.rejects(courseApi.resolveCourse(course.id, actors.parent, { outcome: "cancelled", reason: "Avis" }), { statusCode: 403 });
  await courseApi.resolveCourse(course.id, actors.admin, { outcome: "cancelled", reason: "Absence confirmée après examen contradictoire" });
  const detail = await courseApi.courseDetail(course.id, actors.parent);
  assert.equal(detail.course.lifecycle_status, "cancelled");
  assert.ok(detail.events.some(e => e.type === "admin_resolved"));
  assert.equal(detail.finance.capturedAmount, 10000);
  assert.equal(detail.finance.refundAmount, 0, "une annulation n'invente pas de remboursement");
});

test("réalisation : confirmations concurrentes, avis unique et progression issue du seul rapport prof", async () => {
  const course = await makeCourse({ past: true });
  await Promise.all([
    courseApi.reportCourse(course.id, actors.teacher, { outcome: "completed", note: "Réalisé", progressSummary: "Progrès sur les équations" }),
    courseApi.reportCourse(course.id, actors.parent, { outcome: "completed", note: "Confirmé" }),
  ]);
  assert.equal((await courseApi.courseDetail(course.id, actors.parent)).course.lifecycle_status, "completed");
  const reviews = await Promise.all([1,2,3].map(() => courseApi.reviewCourse(course.id, actors.parent, { rating: 4, text: "Bon accompagnement" })));
  assert.equal(new Set(reviews.map(r => r.id)).size, 1);
  await assert.rejects(courseApi.reviewCourse(course.id, actors.other, { rating: 1, text: "Faux avis" }), { statusCode: 404 });
  const progress = await courseApi.progressForUser(actors.parent.id);
  assert.ok(progress.entries.some(e => e.courseId === course.id && e.summary === "Progrès sur les équations"));
  assert.equal((await courseApi.progressForUser(actors.other.id)).entries.length, 0);
  const teacher = (await pool.query("SELECT rating,reviews_count FROM teachers WHERE id=$1", [teacherId])).rows[0];
  assert.equal(teacher.rating, 4); assert.equal(teacher.reviews_count, 1);
});

test("simulation et héritage : aucun solde libérable sans encaissement attesté", async () => {
  const course = await makeCourse();
  process.env.PAYSTACK_MOCK = "true";
  const payment = await payments.initiateMobileCharge({ courseId: course.id, userId: actors.parent.id, provider: "mtn", phone: actors.parent.phone.slice(0,-2) + "42" });
  assert.equal(payment.status, "success");
  assert.equal((await finance.getCourseFinance(course.id)).capturedAmount, 0);
  await pool.query("UPDATE courses SET lifecycle_status='completed',status='done' WHERE id=$1", [course.id]);
  await assert.rejects(finance.decideSettlement(course.id, actors.admin, { teacherDueAmount: 8500, release: true, reason: "Pas de preuve" }), { code: "unverified_funds" });
  const marked = await http("POST", `/admin/finance/courses/${course.id}/mark-uncollected`, actors.admin, { reason: "Simulation identifiée et rapprochée" });
  assert.equal(marked.status, 200);
  assert.equal((await courseApi.courseDetail(course.id, actors.parent)).course.payment_status, "uncollected");
});

test("reversement : réservation concurrente et idempotence empêchent la double dépense", async () => {
  const course = await makeCourse(); await captured(course); await closeAndRelease(course);
  const initial = await finance.teacherEarnings(teacherId);
  const requestKeys = [key(), key()];
  const results = await Promise.allSettled([
    finance.requestPayout(actors.teacher, { amount: initial.summary.releasable, provider: "mtn", idempotencyKey: requestKeys[0] }),
    finance.requestPayout(actors.teacher, { amount: initial.summary.releasable, provider: "mtn", idempotencyKey: requestKeys[1] }),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.code, "insufficient_releasable_balance");
  const operation = results.find(r => r.status === "fulfilled").value;
  const requestKey = requestKeys[results.findIndex(r => r.status === "fulfilled")];
  assert.equal(operation.beneficiaryPhone, actors.teacher.phone);
  const retried = await finance.requestPayout(actors.teacher, { amount: operation.amount, provider: "mtn", idempotencyKey: requestKey });
  assert.equal(retried.id, operation.id);
  await assert.rejects(finance.requestPayout(actors.teacher, { amount: operation.amount - 1, provider: "mtn", idempotencyKey: requestKey }), { code: "idempotency_conflict" });
  await finance.decideOperation(operation.id, actors.admin, true, { reason: "Dû validé" });
  const reference = "transfer-" + key();
  let amount = operation.amount * 100, phone = actors.other.phone, status = "success";
  globalThis.fetch = async (url, init) => {
    assert.equal(init.method, "GET"); assert.ok(url.includes("/transfer/verify/"));
    return response({ reference, domain: "test", amount, currency: "XOF", status, createdAt: new Date().toISOString(),
      recipient: { type: "mobile_money", currency: "XOF", details: { account_number: phone, bank_name: "MTN Mobile Money" } } });
  };
  await assert.rejects(finance.verifyOperation(operation.id, actors.admin, reference), { code: "provider_evidence_mismatch" });
  phone = actors.teacher.phone; amount = 1;
  await assert.rejects(finance.verifyOperation(operation.id, actors.admin, reference), { code: "provider_evidence_mismatch" });
  amount = operation.amount * 100; status = "pending";
  assert.equal((await finance.verifyOperation(operation.id, actors.admin, reference)).status, "approved");
  assert.equal((await finance.getCourseFinance(course.id)).teacherPaid, 0);
  status = "success";
  const confirmed = await Promise.all([1,2,3].map(() => finance.verifyOperation(operation.id, actors.admin, reference)));
  assert.ok(confirmed.every(o => o.status === "verified"));
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE finance_operation_id=$1", [operation.id])).rows[0].n, 1);
  assert.equal((await finance.getCourseFinance(course.id)).teacherPaid, 8500);
  await pool.query("UPDATE finance_operations SET needs_review=TRUE WHERE id=$1", [operation.id]);
  status = "reversed";
  const reversal = await finance.verifyOperation(operation.id, actors.admin, reference);
  assert.equal(reversal.status, "reversed");
  assert.equal(reversal.needsReview, false, "une inversion attestée clôt la propre alerte de vérification");
  await pool.query("UPDATE finance_operations SET needs_review=TRUE WHERE id=$1", [operation.id]);
  assert.equal((await finance.verifyOperation(operation.id, actors.admin, reference)).needsReview, false, "une opération déjà inversée reste réexaminable");
  assert.equal((await finance.getCourseFinance(course.id)).teacherPaid, 0);
  assert.equal((await pool.query("SELECT sum(amount)::int AS n FROM transactions WHERE finance_operation_id=$1 OR finance_reversal_id=$1", [operation.id])).rows[0].n, 0);
  await finance.decideSettlement(course.id, actors.admin, { teacherDueAmount: 0, release: false, reason: "Clôture de la fixture de concurrence" });
});

test("remboursement : décision explicite, référence du paiement original et registre idempotent", async () => {
  const course = await makeCourse(); const payment = await captured(course);
  await courseApi.cancelCourse(course.id, actors.parent, { reason: "Indisponibilité" });
  const refundKey = key();
  const op = await finance.requestRefund(course.id, actors.parent, { amount: 10000, reason: "Cours annulé", idempotencyKey: refundKey });
  assert.equal((await finance.requestRefund(course.id, actors.parent, { amount: 10000, reason: "Relance", idempotencyKey: refundKey })).id, op.id);
  await assert.rejects(finance.requestRefund(course.id, actors.other, { amount: 1000, reason: "Autre compte", idempotencyKey: key() }), { statusCode: 404 });
  await assert.rejects(finance.verifyOperation(op.id, actors.admin, "76543"), { code: "operation_state" });
  await finance.decideOperation(op.id, actors.admin, true, { reason: "Remboursement intégral décidé" });
  let transaction = payment.evidence.id + 1, state = "processed";
  globalThis.fetch = async (url, init) => {
    assert.equal(init.method, "GET");
    if (url.includes("/refund/")) return response({ id: 76543, transaction, domain: "test", amount: 1000000, currency: "XOF", status: state });
    assert.ok(url.includes("/transaction/verify/")); return response({ ...payment.evidence, status: "reversed" });
  };
  await assert.rejects(finance.verifyOperation(op.id, actors.admin, "76543"), { code: "provider_evidence_mismatch" });
  transaction = payment.evidence.id; state = "processing";
  assert.equal((await finance.verifyOperation(op.id, actors.admin, "76543")).status, "approved");
  assert.equal((await finance.getCourseFinance(course.id)).refundAmount, 0);
  state = "processed";
  await Promise.all([1,2].map(() => finance.verifyOperation(op.id, actors.admin, "76543")));
  assert.equal((await finance.getCourseFinance(course.id)).refundAmount, 10000);
  assert.equal((await courseApi.courseDetail(course.id, actors.parent)).course.payment_status, "refunded");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE finance_operation_id=$1", [op.id])).rows[0].n, 1);
  assert.equal((await http("GET", "/admin/finance/operations?status=verified&limit=1", actors.parent)).status, 403);
  const listed = await http("GET", "/admin/finance/operations?status=verified&limit=1", actors.admin);
  assert.equal(listed.status, 200); assert.equal(listed.body.operations.length, 1);
});

test("annulation/paiement tardif : preuve conservée, cours annulé et aucune libération automatique", async () => {
  const course = await makeCourse();
  await courseApi.cancelCourse(course.id, actors.parent, { reason: "Annulé avant confirmation Mobile Money" });
  await captured(course);
  const detail = await courseApi.courseDetail(course.id, actors.parent);
  assert.equal(detail.course.lifecycle_status, "cancelled");
  assert.equal(detail.finance.capturedAmount, 10000);
  assert.equal(detail.finance.teacherReleasable, 0);
  assert.equal(detail.finance.reviewRequired, true);
});

test("reversement : un téléphone non prouvé ne peut devenir destinataire financier", async () => {
  await pool.query("UPDATE users SET phone_verified_at=NULL WHERE id=$1", [actors.teacher.id]);
  try {
    await assert.rejects(finance.requestPayout(actors.teacher, { amount: 1, provider: "mtn", idempotencyKey: key(), beneficiaryPhone: actors.other.phone }), { code: "verified_phone_required" });
  } finally { await pool.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [actors.teacher.id]); }
});

test("remboursement après reversement : perte explicite, plafond capturé et preuve concurrente sans double crédit", async () => {
  const course = await makeCourse(); const payment = await captured(course); await closeAndRelease(course);
  const payout = await finance.requestPayout(actors.teacher, { amount: 8500, provider: "mtn", idempotencyKey: key() });
  await finance.decideOperation(payout.id, actors.admin, true, { reason: "Dû entièrement versé" });
  const transferRef = "loss-transfer-" + key();
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.method, "GET");
    return response({ reference: transferRef, domain: "test", amount: 850000, currency: "XOF", status: "success", createdAt: new Date().toISOString(),
      recipient: { type: "mobile_money", currency: "XOF", details: { account_number: actors.teacher.phone, bank_name: "MTN Mobile Money" } } });
  };
  await finance.verifyOperation(payout.id, actors.admin, transferRef);
  await assert.rejects(finance.requestRefund(course.id, actors.parent, { amount: 10001, reason: "Trop", idempotencyKey: key() }), { code: "insufficient_captured_funds" });
  const refund = await finance.requestRefund(course.id, actors.parent, { amount: 10000, reason: "Geste commercial examiné", idempotencyKey: key() });
  await assert.rejects(finance.decideOperation(refund.id, actors.admin, true, { reason: "Sans décision de perte" }), { code: "platform_loss_approval_required", platformLossAmount: 8500 });
  const approved = await finance.decideOperation(refund.id, actors.admin, true, { reason: "La plateforme assume le coût du geste commercial après versement professeur", acceptPlatformLoss: true });
  assert.equal(approved.platformLossAmount, 8500);
  const refundId = 800000 + refund.id;
  globalThis.fetch = async (url, init) => {
    assert.equal(init.method, "GET");
    return response(url.includes("/refund/") ? { id: refundId, transaction: payment.evidence.id, domain: "test", amount: 1000000, currency: "XOF", status: "processed" }
      : { ...payment.evidence, status: "reversed" });
  };
  await Promise.all([1,2,3].map(() => finance.verifyOperation(refund.id, actors.admin, String(refundId))));
  const totals = await finance.getCourseFinance(course.id);
  assert.equal(totals.refundAmount, 10000); assert.equal(totals.teacherPaid, 8500);
  assert.equal(totals.platformLossAcceptedAmount, 8500);
  assert.equal(totals.teacherReleasable, 0, "une perte acceptée n'est pas un nouveau solde professeur");
  assert.equal(totals.reviewRequired, false, "décision déjà acceptée explicitement et preuve valide");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE finance_operation_id=$1", [refund.id])).rows[0].n, 1);
  await assert.rejects(finance.requestRefund(course.id, actors.parent, { amount: 1, reason: "Au-delà du capturé", idempotencyKey: key() }), { code: "insufficient_captured_funds" });
  await pool.query("UPDATE finance_operations SET needs_review=TRUE WHERE id=$1", [refund.id]);
  const resolution = await http("POST", `/admin/finance/operations/${refund.id}/resolve-review`, actors.admin, { reason: "Prestataire relu, perte déjà approuvée et soldes rapprochés" });
  assert.equal(resolution.status, 200, JSON.stringify(resolution.body));
  assert.equal(resolution.body.needsReview, false);
  assert.ok((await pool.query("SELECT id FROM finance_events WHERE operation_id=$1 AND event_type='operator_review_resolved'", [refund.id])).rowCount);
});

test("réconciliation périodique : plusieurs workers ne relisent qu'une fois et n'émettent aucun POST", async () => {
  const course = await makeCourse();
  const ref = "reconcile-" + key();
  const payment = (await pool.query(`INSERT INTO payments(user_id,course_id,amount,provider,phone,paystack_reference,status,created_at)
    VALUES($1,$2,10000,'mtn',$3,$4,'pending',now()-interval '1 minute') RETURNING id`, [actors.parent.id, course.id, actors.parent.phone, ref])).rows[0];
  let reads = 0;
  globalThis.fetch = async (url, init = {}) => {
    assert.ok(url.endsWith("/transaction/verify/" + ref));
    assert.ok(!init.method || init.method === "GET"); reads++;
    return response({ id: 500000 + payment.id, reference: ref, domain: "test", amount: 1000000, currency: "XOF", status: "success" });
  };
  const results = await Promise.all([1,2,3].map(() => payments.reconcilePendingPayments(1,[payment.id])));
  assert.equal(reads, 1);
  assert.equal(results.reduce((n,r) => n+r.checked,0), 1);
  assert.equal((await finance.getCourseFinance(course.id)).capturedAmount, 10000);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE payment_id=$1", [payment.id])).rows[0].n, 1);
});

test("revue financière : deux alertes de preuve du même cours ne se verrouillent pas mutuellement", async () => {
  const course = await makeCourse(); await captured(course); await closeAndRelease(course);
  const records = new Map();
  globalThis.fetch = async (url, init) => {
    assert.equal(init.method, "GET");
    const ref = url.split("/").at(-1), amount = records.get(ref);
    assert.ok(amount);
    return response({ reference: ref, domain: "test", amount: amount * 100, currency: "XOF", status: "success", createdAt: new Date().toISOString(),
      recipient: { type: "mobile_money", currency: "XOF", details: { account_number: actors.teacher.phone, bank_name: "MTN Mobile Money" } } });
  };
  const operations = [];
  for (const amount of [4000,4500]) {
    const operation = await finance.requestPayout(actors.teacher, { amount, provider: "mtn", idempotencyKey: key() });
    await finance.decideOperation(operation.id, actors.admin, true, { reason: "Paiement partiel du dû" });
    const reference = "review-" + key(); records.set(reference, amount);
    await finance.verifyOperation(operation.id, actors.admin, reference);
    operations.push({ ...operation, reference });
  }
  await pool.query("UPDATE finance_operations SET needs_review=TRUE WHERE id=ANY($1::int[])", [operations.map(o => o.id)]);
  assert.equal((await finance.getCourseFinance(course.id)).reviewRequired, true);
  const first = await finance.verifyOperation(operations[0].id, actors.admin, operations[0].reference);
  assert.equal(first.needsReview, false, "l'alerte voisine n'est pas une incohérence de cette preuve");
  assert.equal((await finance.getCourseFinance(course.id)).reviewRequired, true, "l'autre preuve reste à contrôler");
  const second = await finance.verifyOperation(operations[1].id, actors.admin, operations[1].reference);
  assert.equal(second.needsReview, false);
  assert.equal((await finance.getCourseFinance(course.id)).reviewRequired, false);
});
