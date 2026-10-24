// Profil professeur — lecture, mise à jour, complétion.

import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? process.env.API_BASE ?? "http://localhost:8099";

async function api(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}

const teacherToken = async () =>
  (await api("/api/auth/login", { method: "POST", json: { phone: "+2250707001234" } })).body.token;

test("profil prof : GET + PUT + completion", async () => {
  const token = await teacherToken();
  const get0 = await api("/api/teacher/profile", { token });
  assert.equal(get0.status, 200);
  assert.ok(get0.body.completion);
  assert.ok(Array.isArray(get0.body.completion.missing));

  const updated = await api("/api/teacher/profile", {
    method: "PUT", token,
    json: {
      location: "Cocody",
      pricePerHour: 5000,
      experience: "5 à 10 ans",
      programs: ["standard"],
      formats: ["home", "online"],
      bio: "Prof expérimenté",
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.location, "Cocody");
  assert.equal(updated.body.pricePerHour, 5000);
  assert.ok(updated.body.completion.percent >= 50);

  const dash = await api("/api/teacher/dashboard", { token });
  assert.equal(dash.status, 200);
  assert.ok(dash.body.profileCompletion);
});

test("profil prof : premiers justificatifs concurrents, persistés et téléchargeables", async () => {
  const phone = "+2250705001122";
  const token = (await api("/api/auth/login", { method: "POST", json: { phone } })).body.token;
  assert.ok(token);
  const pdf = Buffer.from("%PDF-1.4\nJustificatif de test local\n%%EOF");
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  // Ibrahim est un professeur seed sans dossier de candidature sur une base neuve.
  // Le verrou professeur sérialise les deux premiers dépôts.
  const results = await Promise.all([
    api("/api/teacher/profile", { method: "PUT", token, json: {
      idCardBase64: pdf.toString("base64"), idCardFileName: "cni-test.pdf", idCardMimeType: "application/pdf",
    } }),
    api("/api/teacher/profile", { method: "PUT", token, json: {
      diplomaBase64: pdf.toString("base64"), diplomaFileName: "diplome-test.pdf", diplomaMimeType: "application/pdf",
      photoBase64: jpg.toString("base64"), photoFileName: "photo-test.jpg", photoMimeType: "image/jpeg",
    } }),
  ]);
  assert.deepEqual(results.map((r) => r.status), [200, 200]);
  const profile = await api("/api/teacher/profile", { token });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.hasIdCard, true);
  assert.equal(profile.body.hasDiploma, true);
  assert.equal(profile.body.hasPhoto, true);
  const admin = (await api("/api/auth/login", { method: "POST", json: { phone: "+2250700000001" } })).body.token;
  const applications = await api("/api/admin/teacher-applications?status=approved", { token: admin });
  const dossiers = applications.body.filter((row) => row.phone === phone);
  assert.equal(dossiers.length, 1);
  for (const kind of ["id_card", "diploma"]) {
    const file = await fetch(`${BASE}/api/admin/teacher-applications/${dossiers[0].id}/files/${kind}`, {
      headers: { Authorization: `Bearer ${admin}` },
    });
    assert.equal(file.status, 200);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdf);
  }
});

test("profil prof : visiteur anonyme et parent ne peuvent pas modifier une fiche", async () => {
  assert.equal((await api("/api/teacher/profile")).status, 401);
  assert.equal((await api("/api/teacher/profile", { method: "PUT", json: { bio: "Interdit" } })).status, 401);
  const parent = (await api("/api/auth/login", { method: "POST", json: { phone: "+2250758421903" } })).body.token;
  assert.equal((await api("/api/teacher/profile", { token: parent })).status, 403);
  assert.equal((await api("/api/teacher/profile", { method: "PUT", token: parent, json: { bio: "Interdit" } })).status, 403);
});
