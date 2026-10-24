import test from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";

const BASE = process.env.API_URL ?? process.env.API_BASE ?? "http://localhost:8099";

async function req(method, path, { body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (res.status >= 400) {
    const err = new Error(json.message || json.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const login = async (phone) => req("POST", "/api/auth/login", { body: { phone } }).then((b) => b.token);

async function newParent() {
  const phone = `+22507${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  return req("POST", "/api/auth/signup", { body: { fullName: "Parent test besoins", phone, role: "parent", consent: true } });
}

test("parcours besoin → tarif admin → parent → offre prof (gains nets)", async () => {
  const parentTok = await login("+2250758421903");
  const adminTok = await login("+2250700000001");

  const child = await req("POST", "/api/children", {
    token: parentTok,
    body: { name: "Kouadio", level: "3eme", gender: "garcon", school: "Collège Moderne" },
  });
  assert.equal(child.name, "Kouadio");

  const need = await req("POST", "/api/needs", {
    token: parentTok,
    body: {
      childId: child.id,
      subject: "Maths",
      level: "3eme",
      format: "home",
      location: "Cocody",
      frequency: "1 fois/sem",
      duration: "2h00",
      description: "Renforcement BEPC",
    },
  });
  assert.equal(need.status, "submitted");

  const priced = await req("PUT", `/api/admin/needs/${need.id}/price`, {
    token: adminTok,
    body: { parentPrice: 10000, startDate: "2026-09-01" },
  });
  assert.equal(priced.status, "priced");
  assert.equal(priced.parentPrice, 10000);
  assert.equal(priced.netTeacherAmount, 8500);
  assert.equal(priced.netTeacherHourly, 4250);

  const published = await req("POST", `/api/needs/${need.id}/accept-price`, { token: parentTok });
  assert.equal(published.status, "published");

  const teacherTok = await login("+2250707001234");
  const opps = await req("GET", "/api/teacher/opportunities", { token: teacherTok });
  assert.ok(opps.some((o) => o.needId === need.id));
  assert.equal(opps.find((o) => o.needId === need.id).netAmount, 8500);

  const accepted = await req("POST", `/api/teacher/opportunities/${need.id}/accept`, { token: teacherTok });
  assert.equal(accepted.ok, true);
  assert.ok(accepted.courseId);

  const mine = await req("GET", "/api/needs", { token: parentTok });
  assert.equal(mine.find((n) => n.id === need.id).status, "matched");
});

test("prof non confirmé : pas d'offres ni d'acceptation", async () => {
  const adminTok = await login("+2250700000001");
  const teacherTok = await login("+2250707001234");

  await req("POST", "/api/admin/teachers/1/confirm-needs", {
    token: adminTok,
    body: { confirmed: false },
  });

  const dash = await req("GET", "/api/teacher/dashboard", { token: teacherTok });
  assert.equal(dash.needsConfirmed, false);

  const opps = await req("GET", "/api/teacher/opportunities", { token: teacherTok });
  assert.equal(opps.length, 0);

  const parentTok = await login("+2250758421903");
  const needs = await req("GET", "/api/needs", { token: parentTok });
  const published = needs.find((n) => n.status === "published");
  if (published) {
    try {
      await req("POST", `/api/teacher/opportunities/${published.id}/accept`, { token: teacherTok });
      assert.fail("devrait refuser");
    } catch (e) {
      assert.equal(e.status, 403);
    }
  }

  await req("POST", "/api/admin/teachers/1/confirm-needs", {
    token: adminTok,
    body: { confirmed: true },
  });
  const after = await req("GET", "/api/teacher/dashboard", { token: teacherTok });
  assert.equal(after.needsConfirmed, true);
});

test("commission_pct dans les paramètres admin", async () => {
  const adminTok = await login("+2250700000001");
  const settings = await req("PUT", "/api/admin/settings", {
    token: adminTok,
    body: { commission_pct: "15" },
  });
  assert.equal(settings.commission_pct, "15");
});

test("besoin : pièce conservée sans S3, téléchargement réservé au propriétaire et à l'admin", async () => {
  const owner = await newParent();
  const other = await newParent();
  const pdf = Buffer.from("%PDF-1.4\nPièce du besoin de test\n%%EOF");
  const need = await req("POST", "/api/needs", { token: owner.token, body: {
    subject: "Maths", level: "3eme", format: "online", description: "Précisions à conserver",
    documentBase64: pdf.toString("base64"), documentFileName: "besoin.pdf", documentMimeType: "application/pdf",
  } });
  assert.equal(need.description, "Précisions à conserver");
  assert.equal(need.durationMinutes, 90);
  assert.equal(need.documentName, "besoin.pdf");
  const path = `/api/needs/${need.id}/document`;
  const download = await fetch(BASE + path, { headers: { Authorization: `Bearer ${owner.token}` } });
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
  assert.equal((await fetch(BASE + path)).status, 401);
  assert.equal((await fetch(BASE + path, { headers: { Authorization: `Bearer ${other.token}` } })).status, 404);
  const admin = await login("+2250700000001");
  const adminFile = await fetch(`${BASE}/api/admin/needs/${need.id}/document`, { headers: { Authorization: `Bearer ${admin}` } });
  assert.equal(adminFile.status, 200);
  assert.deepEqual(Buffer.from(await adminFile.arrayBuffer()), pdf);
});

test("besoin : 1h30 vaut 90 minutes et le net horaire est calculé sur 1,5 heure", async () => {
  const parent = await newParent();
  const need = await req("POST", "/api/needs", { token: parent.token, body: {
    subject: "Maths", level: "3eme", format: "online", duration: "1h30",
  } });
  assert.equal(need.durationMinutes, 90);
  const priced = await req("PUT", `/api/admin/needs/${need.id}/price`, {
    token: await login("+2250700000001"), body: { parentPrice: 10000 },
  });
  assert.equal(priced.netTeacherAmount, 8500);
  assert.equal(priced.netTeacherHourly, 5667);
  for (const duration of ["1h90", "n'importe quoi", "0h00", "25h00"]) {
    await assert.rejects(req("POST", "/api/needs", { token: parent.token, body: {
      subject: "Maths", level: "3eme", format: "online", duration,
    } }), (error) => error.status === 400);
  }
});

test("besoin : l'attribution concurrente crée un seul cours", async () => {
  const parent = await newParent();
  const need = await req("POST", "/api/needs", { token: parent.token, body: {
    subject: "Maths", level: "3eme", format: "online", duration: "1h30",
  } });
  await req("PUT", `/api/admin/needs/${need.id}/price`, {
    token: await login("+2250700000001"), body: { parentPrice: 10000 },
  });
  await req("POST", `/api/needs/${need.id}/accept-price`, { token: parent.token });
  const tokens = await Promise.all([login("+2250707001234"), login("+2250705001122")]);
  const results = await Promise.all(tokens.map(async (token) => {
    const response = await fetch(`${BASE}/api/teacher/opportunities/${need.id}/accept`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    return { status: response.status, body: await response.json() };
  }));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 404]);
  const winner = results.find((r) => r.status === 200);
  const courses = await req("GET", "/api/courses", { token: parent.token });
  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, winner.body.courseId);
  const mine = await req("GET", "/api/needs", { token: parent.token });
  assert.equal(mine[0].status, "matched");
  assert.equal(mine[0].courseId, winner.body.courseId);
});

test("devis public : ne modifie pas le profil ni le consentement d'un compte existant", async () => {
  const owner = await newParent();
  const before = await req("GET", "/api/me", { token: owner.token });
  await req("POST", "/api/needs/public", { body: {
    parentName: "Nom injecté par un tiers", parentPhone: before.phone,
    subject: "Maths", level: "3eme", format: "online", consent: true,
  } });
  const after = await req("GET", "/api/me", { token: owner.token });
  assert.equal(after.full_name, before.full_name);
  assert.equal(after.consent_at, before.consent_at);
  assert.equal(after.role, before.role);
});
