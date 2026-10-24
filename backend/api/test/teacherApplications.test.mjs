// Candidatures professeur — soumission publique, statut, approve/reject admin.

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";

const BASE = process.env.API_URL ?? process.env.API_BASE ?? "http://localhost:8099";
const freshPhone = () => `+22507${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;

async function api(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}

const adminToken = async () =>
  (await api("/api/auth/login", { method: "POST", json: { phone: "+2250700000001" } })).body.token;

const tinyPdf = Buffer.from("%PDF-1.4 test").toString("base64");
const tinyJpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");

function applicationBody(phone) {
  return {
    fullName: "Test Candidat",
    phone,
    email: "candidat@example.invalid",
    subjects: "Maths",
    location: "Cocody",
    pricePerHour: 5000,
    bio: "Prof test",
    levels: ["Collège"],
    formats: ["home"],
    programs: ["standard"],
    consent: true,
    idCardBase64: tinyPdf,
    idCardFileName: "cni.pdf",
    idCardMimeType: "application/pdf",
    diplomaBase64: tinyPdf,
    diplomaFileName: "dip.pdf",
    diplomaMimeType: "application/pdf",
    photoBase64: tinyJpg,
    photoFileName: "photo.jpg",
    photoMimeType: "image/jpeg",
  };
}

function simpleApplicationBody(phone) {
  return {
    fullName: "Test Candidat Simple",
    phone,
    subjects: "Maths · Français",
    levels: ["Collège", "Lycée"],
    consent: true,
  };
}

test("candidature : soumission simple sans documents", async () => {
  const phone = freshPhone();
  const created = await api("/api/teacher-applications", {
    method: "POST",
    json: simpleApplicationBody(phone),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "pending");

  const status = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`, { token: await adminToken() });
  assert.equal(status.body.status, "pending");
});

test("candidature : niveau requis", async () => {
  const phone = freshPhone();
  const r = await api("/api/teacher-applications", {
    method: "POST",
    json: { fullName: "Sans niveau", phone, subjects: "Maths", consent: true },
  });
  assert.equal(r.status, 400);
});

test("candidature : statut none sans dossier", async () => {
  const phone = freshPhone();
  const r = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`, { token: await adminToken() });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "none");
});

test("candidature : soumission, conflit pending, approve admin", async () => {
  const phone = freshPhone();
  const body = applicationBody(phone);

  const created = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "pending");
  const appId = created.body.id;

  const dup = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(dup.status, 409);

  const status = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`, { token: await adminToken() });
  assert.equal(status.status, 200);
  assert.equal(status.body.status, "pending");

  const token = await adminToken();
  const list = await api("/api/admin/teacher-applications?status=pending", { token });
  assert.equal(list.status, 200);
  assert.ok(list.body.some((a) => a.id === appId));

  const detail = await api(`/api/admin/teacher-applications/${appId}`, { token });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.phone, phone);

  const file = await api(`/api/admin/teacher-applications/${appId}/files/id_card`, { token });
  assert.equal(file.status, 200);

  const interview = await api(`/api/admin/teacher-applications/${appId}/interview`, { method: "POST", token, json: { notes: "RDV lundi" } });
  assert.equal(interview.status, 200);
  assert.equal(interview.body.status, "interview");
  const duplicateDuringInterview = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(duplicateDuringInterview.status, 409);

  const startTest = await api(`/api/admin/teacher-applications/${appId}/start-test`, { method: "POST", token, json: {} });
  assert.equal(startTest.status, 200);
  assert.equal(startTest.body.status, "test");
  const duplicateDuringTest = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(duplicateDuringTest.status, 409);

  const testResult = await api(`/api/admin/teacher-applications/${appId}/test-result`, { method: "POST", token, json: { passed: true } });
  assert.equal(testResult.status, 200);
  assert.equal(testResult.body.status, "training");
  const duplicateDuringTraining = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(duplicateDuringTraining.status, 409);

  const approved = await api(`/api/admin/teacher-applications/${appId}/approve`, { method: "POST", token, json: {} });
  assert.equal(approved.status, 200);
  assert.ok(approved.body.teacherId);
  assert.ok(approved.body.userId);

  const teacherToken = (await api("/api/auth/login", { method: "POST", json: { phone } })).body.token;
  const teacherDash = await api("/api/teacher/dashboard", { token: teacherToken });
  assert.equal(teacherDash.status, 200);
  assert.equal(teacherDash.body.needsConfirmed, false);
  // Régression : le profil lisait une colonne users.email inexistante.
  const profile = await api("/api/teacher/profile", { token: teacherToken });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.email, "candidat@example.invalid");
  assert.equal(profile.body.hasIdCard, true);
  const edited = await api("/api/teacher/profile", { method: "PUT", token: teacherToken, json: { bio: "Profil après approbation" } });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.bio, "Profil après approbation");

  const after = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`, { token: await adminToken() });
  assert.equal(after.body.status, "approved");
});

test("candidature : reject admin", async () => {
  const phone = freshPhone();
  const created = await api("/api/teacher-applications", { method: "POST", json: applicationBody(phone) });
  assert.equal(created.status, 201);
  const appId = created.body.id;

  const token = await adminToken();
  const rejected = await api(`/api/admin/teacher-applications/${appId}/reject`, {
    method: "POST", token, json: { reason: "Documents incomplets" },
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "rejected");

  const status = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`, { token: await adminToken() });
  assert.equal(status.body.status, "rejected");
  assert.equal(status.body.rejectionReason, "Documents incomplets");
});

test("candidature : suivi réservé au propriétaire et notes internes masquées", async () => {
  const phone = freshPhone();
  const owner = await api("/api/auth/signup", { method: "POST", json: {
    fullName: "Propriétaire du dossier", phone, role: "parent", consent: true,
  } });
  assert.equal(owner.status, 200);
  const created = await api("/api/teacher-applications", { method: "POST", json: applicationBody(phone) });
  assert.equal(created.status, 201);
  const path = `/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`;
  assert.equal((await api(path)).status, 401);
  const other = (await api("/api/auth/login", { method: "POST", json: { phone: "+2250758421903" } })).body.token;
  assert.equal((await api(path, { token: other })).status, 403);

  const token = await adminToken();
  const prefix = `/api/admin/teacher-applications/${created.body.id}`;
  assert.equal((await api(`${prefix}/interview`, { method: "POST", token, json: { notes: "Note interne entretien" } })).status, 200);
  assert.equal((await api(`${prefix}/start-test`, { method: "POST", token, json: {} })).status, 200);
  assert.equal((await api(`${prefix}/test-result`, { method: "POST", token, json: { passed: false, notes: "Note interne du test" } })).status, 200);
  const ownStatus = await api("/api/teacher-applications/status", { token: owner.body.token });
  assert.equal(ownStatus.status, 200);
  assert.equal(ownStatus.body.status, "rejected");
  assert.equal(ownStatus.body.testResult, "failed");
  assert.equal(ownStatus.body.rejectionReason, "Test non concluant");
  assert.equal("interviewNotes" in ownStatus.body, false);
  assert.equal("testNotes" in ownStatus.body, false);
  assert.equal(JSON.stringify(ownStatus.body).includes("Note interne"), false);
  const adminDetail = await api(prefix, { token });
  assert.equal(adminDetail.body.interview_notes, "Note interne entretien");
  assert.equal(adminDetail.body.test_notes, "Note interne du test");
});

test("candidature : deux soumissions concurrentes ne créent qu'un dossier actif", async () => {
  const body = applicationBody(freshPhone());
  const results = await Promise.all([
    api("/api/teacher-applications", { method: "POST", json: body }),
    api("/api/teacher-applications", { method: "POST", json: body }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const list = await api("/api/admin/teacher-applications?status=pending", { token: await adminToken() });
  assert.equal(list.body.filter((a) => a.phone === body.phone).length, 1);
});

test("candidature : deux approbations concurrentes ne créent qu'un professeur", async () => {
  const phone = freshPhone();
  const body = { ...applicationBody(phone), fullName: `Concurrent ${phone.slice(-8)}` };
  const created = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(created.status, 201);
  const token = await adminToken();
  const prefix = `/api/admin/teacher-applications/${created.body.id}`;
  for (const [action, json] of [["interview", {}], ["start-test", {}], ["test-result", { passed: true }]]) {
    assert.equal((await api(`${prefix}/${action}`, { method: "POST", token, json })).status, 200);
  }
  const results = await Promise.all([
    api(`${prefix}/approve`, { method: "POST", token, json: {} }),
    api(`${prefix}/approve`, { method: "POST", token, json: {} }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const accepted = results.find((r) => r.status === 200).body;
  const teachers = await api("/api/teachers");
  const matches = teachers.body.filter((teacher) => teacher.name === body.fullName);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, accepted.teacherId);
  const detail = await api(prefix, { token });
  assert.equal(detail.body.status, "approved");
  assert.equal(detail.body.teacher_id, accepted.teacherId);
  assert.equal(detail.body.user_id, accepted.userId);
});
