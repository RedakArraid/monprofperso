// Tests de l'espace administration — runner natif Node (`node --test`).
//
// Prérequis : la stack tourne (`docker compose up -d`).
// Couvre : garde admin (401/403), CRUD matières & niveaux, ressources + fichiers.

import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? "http://localhost:8099";

async function api(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}
const tokenFor = async (phone) =>
  (await api("/api/auth/login", { method: "POST", json: { phone } })).body.token;
const adminToken = () => tokenFor("+2250700000001");          // utilisateur seed admin
const userToken = () => tokenFor("+2250758421903");            // utilisateur seed parent

// ----------------------------------------------------------------- Garde admin
test("admin : 401 sans token, 403 avec un token non-admin", async () => {
  const anon = await api("/api/admin/subjects", { method: "POST", json: { slug: "x", name: "X" } });
  assert.equal(anon.status, 401);
  const asUser = await api("/api/admin/subjects", {
    method: "POST", token: await userToken(), json: { slug: "x", name: "X" },
  });
  assert.equal(asUser.status, 403);
});

// --------------------------------------------------------------- CRUD matières
test("admin : créer / modifier / supprimer une matière", async () => {
  const token = await adminToken();
  const slug = `tsubj-${Date.now()}`;
  const created = await api("/api/admin/subjects", {
    method: "POST", token, json: { slug, name: "Test", icon: "music", accent: "orange" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.slug, slug);

  // slug déjà pris -> 409
  const dup = await api("/api/admin/subjects", { method: "POST", token, json: { slug, name: "Test" } });
  assert.equal(dup.status, 409);

  const updated = await api(`/api/admin/subjects/${slug}`, { method: "PUT", token, json: { name: "Modifié" } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "Modifié");

  const del = await api(`/api/admin/subjects/${slug}`, { method: "DELETE", token });
  assert.equal(del.status, 204);
});

// ---------------------------------------------------------------- CRUD niveaux
test("admin : créer puis supprimer un niveau ; /levels est public", async () => {
  const token = await adminToken();
  const slug = `tlvl-${Date.now()}`;
  const created = await api("/api/admin/levels", { method: "POST", token, json: { slug, name: "Test", ord: 9 } });
  assert.equal(created.status, 201);

  const list = await api("/api/levels");
  assert.equal(list.status, 200);
  assert.ok(list.body.some((l) => l.slug === "universite"), "le niveau universitaire est présent");

  const del = await api(`/api/admin/levels/${slug}`, { method: "DELETE", token });
  assert.equal(del.status, 204);
});

// --------------------------------------------- Ressources pédagogiques + fichier
test("admin : créer une ressource avec fichier, la télécharger, la supprimer", async () => {
  const token = await adminToken();
  const contentBase64 = Buffer.from("contenu du devoir").toString("base64");
  const created = await api("/api/admin/resources", {
    method: "POST", token,
    json: { type: "homework", subjectSlug: "maths", level: "lycee", title: "Devoir 1",
            fileName: "devoir.txt", mimeType: "text/plain", contentBase64 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.type, "homework");
  assert.equal(created.body.size_bytes, Buffer.from("contenu du devoir").length);
  const id = created.body.id;

  // la liste renvoie les métadonnées (sans le contenu)
  const list = await api("/api/resources?type=homework");
  assert.ok(list.body.some((r) => r.id === id));
  assert.ok(!("content" in (list.body.find((r) => r.id === id) ?? {})));

  // le fichier se télécharge tel quel
  const file = await api(`/api/files/${id}`);
  assert.equal(file.status, 200);
  assert.equal(file.body, "contenu du devoir");

  const del = await api(`/api/admin/resources/${id}`, { method: "DELETE", token });
  assert.equal(del.status, 204);
  const gone = await api(`/api/files/${id}`);
  assert.equal(gone.status, 404);
});

// --------------------------------------------------------- Catalogue dynamique
test("catalogue : /subjects inclut des matières hors FR/EN (musique, langues)", async () => {
  const { status, body } = await api("/api/subjects");
  assert.equal(status, 200);
  const slugs = body.map((s) => s.slug);
  for (const s of ["musique", "espagnol", "allemand"]) assert.ok(slugs.includes(s), `matière ${s} présente`);
});

// --------------------------------------------------------- Validation entrées
test("admin : type de ressource invalide -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await api("/api/admin/resources", {
    method: "POST", token, json: { type: "quiz", title: "X" },
  });
  assert.equal(status, 400);
  assert.equal(body.field, "type");
});
