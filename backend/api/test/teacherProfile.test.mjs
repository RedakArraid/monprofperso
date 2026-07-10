// Profil professeur — lecture, mise à jour, complétion.

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
