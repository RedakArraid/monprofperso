import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_BASE || "http://localhost:8099";

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

async function put(path, body, token) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const adminToken = async () =>
  (await post("/api/auth/login", { phone: "+2250700000001" })).body.token;

test("GET /api/auth/otp-channels -> démo par défaut", async () => {
  const { status, body } = await get("/api/auth/otp-channels");
  assert.equal(status, 200);
  assert.equal(body.demo, true);
  assert.equal(typeof body.whatsapp, "boolean");
  assert.equal(typeof body.email, "boolean");
});

test("POST /api/auth/request-otp mode démo -> pas d'envoi", async () => {
  const { status, body } = await post("/api/auth/request-otp", {
    phone: "+2250758421903",
    channel: "whatsapp",
  });
  assert.equal(status, 200);
  assert.equal(body.demo, true);
  assert.equal(body.sent, false);
});

test("POST /api/auth/verify-otp mode démo sans code -> JWT", async () => {
  const { status, body } = await post("/api/auth/verify-otp", { phone: "+2250758421903" });
  assert.equal(status, 200);
  assert.match(body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
});

test("GET /api/admin/otp-settings -> admin uniquement", async () => {
  const anon = await get("/api/admin/otp-settings");
  assert.equal(anon.status, 401);
  const token = await adminToken();
  const { status, body } = await get("/api/admin/otp-settings", token);
  assert.equal(status, 200);
  assert.equal(typeof body.otp_enabled, "string");
  assert.equal(typeof body.otp_smtp_host, "string");
});

test("PUT /api/admin/otp-settings -> met à jour la config", async () => {
  const token = await adminToken();
  const { status, body } = await put(
    "/api/admin/otp-settings",
    { otp_code_ttl_minutes: "15", otp_demo_mode: "true" },
    token
  );
  assert.equal(status, 200);
  assert.equal(body.otp_code_ttl_minutes, "15");
  assert.equal(body.otp_demo_mode, "true");
  // Remettre la valeur seed
  await put("/api/admin/otp-settings", { otp_code_ttl_minutes: "10" }, token);
});

test("POST /api/auth/request-otp sans téléphone WhatsApp -> 400", async () => {
  const { status, body } = await post("/api/auth/request-otp", { channel: "whatsapp" });
  assert.equal(status, 400);
  assert.equal(body.error, "validation_error");
});

test("POST /api/auth/request-otp e-mail sans adresse -> 400", async () => {
  const { status } = await post("/api/auth/request-otp", { channel: "email" });
  assert.equal(status, 400);
});

test("POST /api/admin/otp-settings/test -> 401 sans token", async () => {
  const { status } = await post("/api/admin/otp-settings/test", {
    channel: "whatsapp",
    phone: "+2250758421903",
  });
  assert.equal(status, 401);
});

test("POST /api/admin/otp-settings/test WhatsApp sans téléphone -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await post(
    "/api/admin/otp-settings/test",
    { channel: "whatsapp" },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.error, "validation_error");
});

test("POST /api/admin/otp-settings/test e-mail sans adresse -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await post(
    "/api/admin/otp-settings/test",
    { channel: "email" },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.error, "validation_error");
});

test("POST /api/admin/otp-settings/test sans URL OpenWA -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await post(
    "/api/admin/otp-settings/test",
    {
      channel: "whatsapp",
      phone: "+2250758421903",
      settings: { otp_whatsapp_base_url: "" },
    },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.field, "otp_whatsapp_base_url");
});

test("POST /api/admin/otp-settings/test WhatsApp wa-automate session sans ID -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await post(
    "/api/admin/otp-settings/test",
    {
      channel: "whatsapp",
      phone: "+2250758421903",
      settings: {
        otp_whatsapp_provider: "wa-automate",
        otp_whatsapp_base_url: "http://localhost:3000",
        otp_whatsapp_session_in_path: "true",
        otp_whatsapp_session_id: "",
      },
    },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.field, "otp_whatsapp_session_id");
});

test("POST /api/admin/otp-settings/test WhatsApp gateway sans session ID -> 400", async () => {
  const token = await adminToken();
  const { status, body } = await post(
    "/api/admin/otp-settings/test",
    {
      channel: "whatsapp",
      phone: "+2250758421903",
      settings: {
        otp_whatsapp_provider: "gateway",
        otp_whatsapp_base_url: "http://localhost:2785",
        otp_whatsapp_session_id: "",
      },
    },
    token
  );
  assert.equal(status, 400);
  assert.equal(body.field, "otp_whatsapp_session_id");
});
