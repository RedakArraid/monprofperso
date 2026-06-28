// Tests end-to-end (e2e), parcours utilisateur complets contre la stack live.
//
// Contrairement à api.test.mjs (qui teste chaque endpoint isolément), ces tests
// enchaînent plusieurs appels pour valider des scénarios réels de bout en bout :
// inscription -> token -> navigation -> réservation -> relecture, isolation entre
// comptes via le JWT, parcours prof, et le catalogue public.
//
// Prérequis : la stack tourne (`docker compose up -d`).
//   API_URL=http://localhost:8099 node --test 'test/*.test.mjs'

import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? "http://localhost:8099";

// --- Petit client HTTP avec support du Bearer token -----------------------
async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body: data };
}
const get = (path, token) => call("GET", path, { token });
const post = (path, body, token) => call("POST", path, { body, token });

let seq = 0;
/** Téléphone ivoirien unique par appel (évite les collisions entre exécutions). */
const uniquePhone = () => "+22501" + String(Date.now()).slice(-7) + String(seq++).padStart(1, "0");

/** Inscrit un nouvel utilisateur et renvoie { token, user }. */
async function signup(role = "parent") {
  const { status, body } = await post("/api/auth/signup", {
    fullName: "E2E Test", phone: uniquePhone(), role,
  });
  assert.equal(status, 200, "signup doit réussir");
  assert.ok(body.token && body.user?.id);
  return body;
}

test("e2e, le consentement (CGU + parental) est enregistré à l'inscription", async () => {
  const phone = uniquePhone();
  const withConsent = await post("/api/auth/signup", {
    fullName: "Consent E2E", phone, role: "student", consent: true, parentalConsent: true,
  });
  assert.equal(withConsent.status, 200);
  assert.ok(withConsent.body.user.consent_version, "version de CGU enregistrée");
  assert.equal(withConsent.body.user.parental_consent, true, "consentement parental enregistré");

  const noConsent = await post("/api/auth/signup", {
    fullName: "Sans Consent", phone: uniquePhone(), role: "parent",
  });
  assert.equal(noConsent.body.user.consent_version, null, "pas de consentement -> non daté");
});

// ======================================================================
// Parcours 1, Parent : inscription -> navigation -> réservation -> relecture
// ======================================================================
test("e2e, parcours parent complet (compte neuf isolé)", async () => {
  const { token, user } = await signup("parent");
  assert.equal(user.role, "parent");

  // /me reflète bien le compte du token
  const me = await get("/api/me", token);
  assert.equal(me.status, 200);
  assert.equal(me.body.id, user.id);

  // Catalogue public visible
  const subjects = await get("/api/subjects", token);
  assert.ok(Array.isArray(subjects.body) && subjects.body.length > 0);

  const teachers = await get("/api/teachers", token);
  assert.ok(teachers.body.length > 0);
  const teacher = teachers.body[0];

  // Détail prof + avis
  const detail = await get(`/api/teachers/${teacher.id}`, token);
  assert.equal(detail.status, 200);
  assert.ok(Array.isArray(detail.body.reviews));

  // Compte neuf : aucun cours pour l'instant
  const before = await get("/api/courses", token);
  assert.equal(before.status, 200);
  assert.equal(before.body.length, 0, "un nouvel utilisateur n'a aucun cours");

  // Réservation
  const booking = await post("/api/bookings", {
    teacherId: teacher.id, teacherName: teacher.name, subject: "Physique-Chimie",
    level: "Terminale", format: "online", price: 5000,
  }, token);
  assert.equal(booking.status, 201);
  assert.ok(booking.body.reference.startsWith("AKW-"));

  // Le cours réservé apparaît maintenant
  const after = await get("/api/courses", token);
  assert.equal(after.body.length, 1);
  assert.equal(after.body[0].subject, "Physique-Chimie");
  assert.equal(after.body[0].status, "upcoming");

  // Filtre par statut cohérent
  const upcoming = await get("/api/courses?status=upcoming", token);
  assert.equal(upcoming.body.length, 1);
  const done = await get("/api/courses?status=done", token);
  assert.equal(done.body.length, 0);

  // Écrans scopés sur l'utilisateur (compte neuf -> vides)
  const notifs = await get("/api/notifications", token);
  assert.ok(Array.isArray(notifs.body) && notifs.body.length === 0);
  const wallet = await get("/api/wallet", token);
  assert.ok(Array.isArray(wallet.body.accounts) && Array.isArray(wallet.body.transactions));
  assert.equal(wallet.body.transactions.length, 0);
  const progress = await get("/api/progress", token);
  assert.ok(Array.isArray(progress.body.subjects) && progress.body.subjects.length === 0);
});

// ======================================================================
// Parcours 2, Isolation entre comptes (scoping JWT)
// ======================================================================
test("e2e, les données d'un utilisateur ne fuitent pas vers un autre", async () => {
  const a = await signup("parent");
  const b = await signup("parent");

  // A réserve un cours
  const booking = await post("/api/bookings", { subject: "Maths", format: "home" }, a.token);
  assert.equal(booking.status, 201);

  // A voit son cours, B ne voit rien
  const aCourses = await get("/api/courses", a.token);
  assert.equal(aCourses.body.length, 1);
  const bCourses = await get("/api/courses", b.token);
  assert.equal(bCourses.body.length, 0, "B ne doit pas voir les cours de A");
});

// ======================================================================
// Parcours 3, Repli démo sans token (utilisateur de la maquette)
// ======================================================================
test("e2e, sans token, on retombe sur les données de démo seedées", async () => {
  const me = await get("/api/me");
  assert.equal(me.body.id, 1);

  // L'utilisateur de démo a des cours seedés (cf. migration 002_seed-data)
  const courses = await get("/api/courses");
  assert.ok(courses.body.length >= 3, "le compte démo a des cours seedés");
  const notifs = await get("/api/notifications");
  assert.ok(notifs.body.length > 0);
  const wallet = await get("/api/wallet");
  assert.ok(wallet.body.transactions.length > 0);
  const progress = await get("/api/progress");
  assert.ok(progress.body.subjects.length > 0);
});

// ======================================================================
// Parcours 4, verify-otp -> token utilisable
// ======================================================================
test("e2e, verify-otp renvoie un token exploitable", async () => {
  // Compte connu (seedé)
  const otp = await post("/api/auth/verify-otp", { phone: "+2250758421903" });
  assert.equal(otp.status, 200);
  assert.equal(otp.body.verified, true);
  assert.equal(otp.body.token.split(".").length, 3);

  const me = await get("/api/me", otp.body.token);
  assert.equal(me.status, 200);
  assert.equal(me.body.id, 1, "le token OTP doit scoper sur l'utilisateur du téléphone");
});

// ======================================================================
// Parcours 5, Prof : tableau de bord / demandes / revenus
// ======================================================================
test("e2e, parcours prof (dashboard, requests, earnings)", async () => {
  const { token } = await signup("teacher");

  const dash = await get("/api/teacher/dashboard", token);
  assert.equal(dash.status, 200);
  assert.ok("revenue" in dash.body && Array.isArray(dash.body.stats));

  const requests = await get("/api/teacher/requests", token);
  assert.ok(Array.isArray(requests.body));

  const earnings = await get("/api/teacher/earnings", token);
  assert.ok("total" in earnings.body && Array.isArray(earnings.body.weeks) && Array.isArray(earnings.body.payouts));
});

test("e2e, espace prof scopé par compte : Koffi ≠ Ibrahim", async () => {
  const koffi = await post("/api/auth/login", { phone: "+2250707001234" });
  const ibra = await post("/api/auth/login", { phone: "+2250705001122" });

  const dashK = await get("/api/teacher/dashboard", koffi.body.token);
  const dashI = await get("/api/teacher/dashboard", ibra.body.token);

  assert.equal(dashK.body.name, "Koffi N'Guessan");
  assert.equal(dashI.body.name, "Ibrahim Diallo");
  assert.notEqual(dashK.body.revenue, dashI.body.revenue, "chaque prof voit ses propres revenus");

  // Un compte non relié à une fiche prof retombe sur le prof de démo (rétrocompat).
  const fresh = await signup("teacher");
  const dashFresh = await get("/api/teacher/dashboard", fresh.token);
  assert.equal(dashFresh.body.name, "Koffi N'Guessan", "repli démo si pas de fiche prof");
});

test("e2e, réservation parent -> demande chez le prof -> validation", async () => {
  const parent = await signup("parent");
  const ibra = await post("/api/auth/login", { phone: "+2250705001122" });

  const before = (await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests;

  // Le parent réserve un cours avec Ibrahim (teachers.id=2).
  const booking = await post("/api/bookings",
    { teacherId: 2, teacherName: "Ibrahim Diallo", subject: "Statistiques", price: 3000, format: "online" },
    parent.token);
  assert.equal(booking.status, 201);
  const courseId = booking.body.course.id;
  assert.equal(booking.body.course.accepted, false, "une réservation naît en attente");

  // Elle apparaît dans les demandes d'Ibrahim, avec le nom du parent et un courseId.
  const reqs = (await get("/api/teacher/requests", ibra.body.token)).body;
  const mine = reqs.find((r) => r.courseId === courseId);
  assert.ok(mine, "la réservation apparaît comme demande du prof");
  assert.equal(mine.name, parent.user.full_name);
  assert.equal((await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests, before + 1);

  // Un autre prof ne peut pas valider cette demande.
  const koffi = await post("/api/auth/login", { phone: "+2250707001234" });
  const wrongAccept = await post(`/api/teacher/requests/${courseId}/accept`, undefined, koffi.body.token);
  assert.equal(wrongAccept.status, 404, "validation isolée au prof concerné");

  // Ibrahim valide -> la demande disparaît et le compteur redescend.
  const accept = await post(`/api/teacher/requests/${courseId}/accept`, undefined, ibra.body.token);
  assert.equal(accept.status, 200);
  const after = (await get("/api/teacher/requests", ibra.body.token)).body;
  assert.ok(!after.some((r) => r.courseId === courseId), "la demande validée quitte la liste");
  assert.equal((await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests, before);
});

test("e2e, le prof refuse une demande : retirée et invisible côté parent", async () => {
  const parent = await signup("parent");
  const ibra = await post("/api/auth/login", { phone: "+2250705001122" });
  const before = (await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests;

  const booking = await post("/api/bookings",
    { teacherId: 2, teacherName: "Ibrahim Diallo", subject: "Statistiques", price: 3000, format: "online" },
    parent.token);
  const courseId = booking.body.course.id;
  assert.equal((await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests, before + 1);

  const refuse = await post(`/api/teacher/requests/${courseId}/refuse`, undefined, ibra.body.token);
  assert.equal(refuse.status, 200);

  const reqs = (await get("/api/teacher/requests", ibra.body.token)).body;
  assert.ok(!reqs.some((r) => r.courseId === courseId), "la demande refusée quitte la liste");
  assert.equal((await get("/api/teacher/dashboard", ibra.body.token)).body.pendingRequests, before);

  const upcoming = (await get("/api/courses?status=upcoming", parent.token)).body;
  assert.ok(!upcoming.some((c) => c.id === courseId), "le cours refusé n'est plus dans l'agenda du parent");

  // Refuser à nouveau échoue (déjà traité).
  assert.equal((await post(`/api/teacher/requests/${courseId}/refuse`, undefined, ibra.body.token)).status, 404);
});

test("e2e, le parent est notifié de la décision (accept/refuse)", async () => {
  const ibra = await post("/api/auth/login", { phone: "+2250705001122" });

  // Acceptation -> notification verte « acceptée ».
  const p1 = await signup("parent");
  const b1 = await post("/api/bookings", { teacherId: 2, subject: "Maths", price: 3000, format: "online" }, p1.token);
  await post(`/api/teacher/requests/${b1.body.course.id}/accept`, undefined, ibra.body.token);
  const notif1 = (await get("/api/notifications", p1.token)).body;
  assert.ok(notif1.some((n) => n.unread && /accept/i.test(n.text)), "notif d'acceptation reçue");

  // Refus -> notification orange.
  const p2 = await signup("parent");
  const b2 = await post("/api/bookings", { teacherId: 2, subject: "Maths", price: 3000, format: "online" }, p2.token);
  await post(`/api/teacher/requests/${b2.body.course.id}/refuse`, undefined, ibra.body.token);
  const notif2 = (await get("/api/notifications", p2.token)).body;
  assert.ok(notif2.some((n) => n.accent === "orange" && n.unread), "notif de refus reçue");
});

test("e2e, « Tout lire » marque les notifications comme lues", async () => {
  const ibra = await post("/api/auth/login", { phone: "+2250705001122" });
  const parent = await signup("parent");
  const b = await post("/api/bookings", { teacherId: 2, subject: "Maths", price: 3000, format: "online" }, parent.token);
  await post(`/api/teacher/requests/${b.body.course.id}/accept`, undefined, ibra.body.token);

  assert.ok((await get("/api/notifications", parent.token)).body.some((n) => n.unread), "notif non lue présente");
  assert.ok((await get("/api/notifications/unread", parent.token)).body.count >= 1, "compteur non lu > 0");
  const read = await post("/api/notifications/read", undefined, parent.token);
  assert.equal(read.status, 200);
  assert.ok(read.body.updated >= 1);
  assert.ok((await get("/api/notifications", parent.token)).body.every((n) => !n.unread), "tout est lu");
  assert.equal((await get("/api/notifications/unread", parent.token)).body.count, 0, "compteur remis à zéro");
});

// ======================================================================
// Parcours 6, Catalogue public (groupes, abonnement, parrainage)
// ======================================================================
test("e2e, cours en groupe : liste puis détail", async () => {
  const list = await get("/api/groups");
  assert.equal(list.status, 200);
  assert.ok(list.body.length > 0);

  const id = list.body[0].id;
  const detail = await get(`/api/groups/${id}`);
  assert.equal(detail.status, 200);
  assert.ok(Array.isArray(detail.body.program) && detail.body.program.length > 0);
});

test("e2e, abonnement : plans + abonnement courant", async () => {
  const plans = await get("/api/subscription/plans");
  assert.ok(plans.body.length > 0 && "price" in plans.body[0]);
  const mine = await get("/api/subscription/mine");
  assert.ok("plan" in mine.body && "status" in mine.body);
});

test("e2e, parrainage : code + compteurs", async () => {
  const { status, body } = await get("/api/referral");
  assert.equal(status, 200);
  assert.ok(typeof body.code === "string" && "referred" in body && "earned" in body);
});
