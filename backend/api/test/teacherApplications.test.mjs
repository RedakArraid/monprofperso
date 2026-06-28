// Candidatures professeur — soumission publique, statut, approve/reject admin.

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

const adminToken = async () =>
  (await api("/api/auth/login", { method: "POST", json: { phone: "+2250700000001" } })).body.token;

const tinyPdf = Buffer.from("%PDF-1.4 test").toString("base64");
const tinyJpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");

function applicationBody(phone) {
  return {
    fullName: "Test Candidat",
    phone,
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

test("candidature : statut none sans dossier", async () => {
  const phone = `+22507${String(Date.now()).slice(-8)}`;
  const r = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "none");
});

test("candidature : soumission, conflit pending, approve admin", async () => {
  const phone = `+22507${String(Date.now()).slice(-8)}`;
  const body = applicationBody(phone);

  const created = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "pending");
  const appId = created.body.id;

  const dup = await api("/api/teacher-applications", { method: "POST", json: body });
  assert.equal(dup.status, 409);

  const status = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`);
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

  const approved = await api(`/api/admin/teacher-applications/${appId}/approve`, { method: "POST", token, json: {} });
  assert.equal(approved.status, 200);
  assert.ok(approved.body.teacherId);
  assert.ok(approved.body.userId);

  const after = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`);
  assert.equal(after.body.status, "approved");
});

test("candidature : reject admin", async () => {
  const phone = `+22507${String(Date.now()).slice(-8)}`;
  const created = await api("/api/teacher-applications", { method: "POST", json: applicationBody(phone) });
  assert.equal(created.status, 201);
  const appId = created.body.id;

  const token = await adminToken();
  const rejected = await api(`/api/admin/teacher-applications/${appId}/reject`, {
    method: "POST", token, json: { reason: "Documents incomplets" },
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "rejected");

  const status = await api(`/api/teacher-applications/status?phone=${encodeURIComponent(phone)}`);
  assert.equal(status.body.status, "rejected");
  assert.equal(status.body.rejectionReason, "Documents incomplets");
});
