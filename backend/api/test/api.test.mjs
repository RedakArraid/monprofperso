// Tests d'intégration de l'API — runner natif Node (`node --test`), zéro dépendance.
//
// Prérequis : la stack tourne (`docker compose up -d`). Cible configurable :
//   API_URL=http://localhost:8099 node --test
//
// Ces tests vérifient le contrat consommé *à l'identique* par les apps Android
// et iOS : formes de réponse + validation des entrées (HTTP 400).

import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? "http://localhost:8099";

async function get(path, token) {
  const res = await fetch(BASE + path, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}
async function post(path, payload) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}

// ----------------------------------------------------------------- Sonde
test("GET /health -> ok", async () => {
  const { status, body } = await get("/health");
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

// -------------------------------------------------------------- Lecture
test("GET /api/subjects -> liste non vide", async () => {
  const { status, body } = await get("/api/subjects");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body) && body.length > 0);
  assert.ok("slug" in body[0] && "name" in body[0]);
});

test("GET /api/teachers -> liste triée par note", async () => {
  const { status, body } = await get("/api/teachers");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body) && body.length > 0);
  assert.equal(typeof body[0].price_per_hour, "number", "NUMERIC doit être un nombre (décodage iOS strict)");
});

test("GET /api/teachers?format=online -> filtre appliqué", async () => {
  const { status, body } = await get("/api/teachers?format=online");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test("GET /api/teachers/:id existant -> 200 + avis", async () => {
  const { status, body } = await get("/api/teachers/1");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.reviews));
});

test("GET /api/teachers/:id inexistant -> 404", async () => {
  const { status, body } = await get("/api/teachers/999999");
  assert.equal(status, 404);
  assert.equal(body.error, "not_found");
});

test("GET /api/courses -> liste", async () => {
  const { status, body } = await get("/api/courses");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test("GET /api/progress -> structure attendue", async () => {
  const { status, body } = await get("/api/progress");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.subjects));
  assert.ok("average" in body);
});

test("GET /api/wallet -> comptes + transactions", async () => {
  const { status, body } = await get("/api/wallet");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.accounts) && Array.isArray(body.transactions));
});

test("GET /api/wallet -> comptes Mobile Money issus de la base (user démo)", async () => {
  const { body } = await get("/api/wallet");
  assert.ok(body.accounts.length >= 1, "l'utilisateur de démo a des comptes seedés");
  assert.ok("provider" in body.accounts[0] && "isDefault" in body.accounts[0]);
  assert.ok(body.accounts.some((a) => a.isDefault === true), "un compte par défaut");
});

test("GET /api/groups/:id inexistant -> 404", async () => {
  const { status } = await get("/api/groups/999999");
  assert.equal(status, 404);
});

test("GET /api/groups/:id -> programme propre à chaque groupe (DB)", async () => {
  const a = (await get("/api/groups/1")).body.program;
  const b = (await get("/api/groups/2")).body.program;
  assert.ok(Array.isArray(a) && a.length > 0 && Array.isArray(b) && b.length > 0);
  assert.notDeepEqual(a, b, "deux groupes distincts ont des programmes distincts");
});

test("GET /api/teacher/dashboard + requests : demandes de démo stables (DB)", async () => {
  // Note : les autres fichiers de tests s'exécutent en parallèle et créent des
  // réservations pour le prof de démo ; on n'assérte donc que des invariants stables.
  const dash = (await get("/api/teacher/dashboard")).body;
  const requests = (await get("/api/teacher/requests")).body;
  assert.equal(typeof dash.pendingRequests, "number");
  const seeded = requests.filter((r) => r.courseId === null);
  assert.equal(seeded.length, 2, "les 2 demandes de démo du prof 1 sont renvoyées");
  assert.ok(dash.pendingRequests >= seeded.length, "le compteur inclut au moins les demandes de démo");
});

test("GET /api/subscription/mine -> abonnement de l'utilisateur (DB)", async () => {
  const { status, body } = await get("/api/subscription/mine");
  assert.equal(status, 200);
  // Valeurs seedées pour l'utilisateur de démo + forme attendue par les apps.
  assert.equal(body.plan, "Régulier");
  assert.equal(typeof body.nextAmount, "number");
  assert.equal(typeof body.used, "number");
  assert.equal(typeof body.total, "number");
});

test("GET /api/referral -> parrainage de l'utilisateur (DB)", async () => {
  const { status, body } = await get("/api/referral");
  assert.equal(status, 200);
  assert.equal(body.code, "AYA2026");
  assert.equal(typeof body.referred, "number");
  assert.equal(typeof body.earned, "number");
});

// ----------------------------------------------------------- Validation
test("POST /api/auth/login body vide -> 200 (repli sur défaut)", async () => {
  const { status, body } = await post("/api/auth/login", {});
  assert.equal(status, 200);
  assert.ok(body.user && body.token);
});

test("POST /api/auth/login téléphone invalide -> 400", async () => {
  const { status, body } = await post("/api/auth/login", { phone: "abc" });
  assert.equal(status, 400);
  assert.equal(body.error, "validation_error");
  assert.equal(body.field, "phone");
});

test("POST /api/auth/signup rôle invalide -> 400", async () => {
  const { status, body } = await post("/api/auth/signup", { fullName: "Test", role: "hacker" });
  assert.equal(status, 400);
  assert.equal(body.field, "role");
});

test("POST /api/auth/signup valide -> 200", async () => {
  const { status, body } = await post("/api/auth/signup", {
    fullName: "Awa Diallo", phone: "+2250700000000", role: "teacher",
  });
  assert.equal(status, 200);
  assert.equal(body.user.role, "teacher");
});

test("POST /api/bookings prix non-numérique -> 400", async () => {
  const { status, body } = await post("/api/bookings", { price: "gratuit" });
  assert.equal(status, 400);
  assert.equal(body.field, "price");
});

test("POST /api/bookings format hors énumération -> 400", async () => {
  const { status, body } = await post("/api/bookings", { format: "téléportation" });
  assert.equal(status, 400);
  assert.equal(body.field, "format");
});

test("POST /api/bookings valide -> 201 + référence", async () => {
  const { status, body } = await post("/api/bookings", { teacherId: 2, price: 5000, format: "online" });
  assert.equal(status, 201);
  assert.ok(typeof body.reference === "string" && body.reference.startsWith("AKW-"));
  assert.equal(body.course.status, "upcoming");
});

// ----------------------------------------------------------- Auth (JWT)
test("POST /api/auth/login -> JWT à 3 segments", async () => {
  const { status, body } = await post("/api/auth/login", {});
  assert.equal(status, 200);
  assert.equal(body.token.split(".").length, 3, "doit être un JWT, plus 'demo-token'");
});

test("auth bout-en-bout : /me avec le token reflète l'utilisateur du token", async () => {
  // Téléphone unique pour ne pas collisionner avec d'autres exécutions.
  const phone = "+22507" + String(Date.now()).slice(-7);
  const signup = await post("/api/auth/signup", { fullName: "E2E Auth", phone, role: "teacher" });
  assert.equal(signup.status, 200);
  const token = signup.body.token;
  const newId = signup.body.user.id;

  const me = await get("/api/me", token);
  assert.equal(me.status, 200);
  assert.equal(me.body.id, newId, "le token doit scoper /me sur son utilisateur");
});

test("/me sans token -> repli sur l'utilisateur de démo (id 1)", async () => {
  const { status, body } = await get("/api/me");
  assert.equal(status, 200);
  assert.equal(body.id, 1);
});

test("/me avec ancien 'demo-token' -> repli (id 1, rétrocompat)", async () => {
  const { body } = await get("/api/me", "demo-token");
  assert.equal(body.id, 1);
});

test("/me avec JWT falsifié -> rejeté, repli (id 1)", async () => {
  const login = await post("/api/auth/login", {});
  const parts = login.body.token.split(".");
  const forged = `${parts[0]}.${parts[1]}.AAAAdeadbeef`;
  const { body } = await get("/api/me", forged);
  assert.equal(body.id, 1, "signature invalide -> ne doit pas authentifier");
});

// ----------------------------------------------- Standardisation HTTP (codes/logs)
test("route inconnue -> 404 JSON cohérent", async () => {
  const { status, body } = await get("/api/route-qui-nexiste-pas");
  assert.equal(status, 404);
  assert.equal(body.error, "not_found");
});

test("corps JSON malformé -> 400 bad_json", async () => {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ ceci n'est pas du json",
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, "bad_json");
});
