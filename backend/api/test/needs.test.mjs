import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_BASE || "http://localhost:8099";

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
