import { invariant, sha } from "./common.mjs";

export async function request(base, route, { method = "GET", body, headers = {}, timeout = 15_000 } = {}) {
  const url = new URL(route, base.endsWith("/") ? base : base + "/");
  invariant(["http:", "https:"].includes(url.protocol) && !url.username && !url.password, "URL HTTP(S) sans identifiants requise.", 64);
  const response = await fetch(url, { method, body, headers, redirect: "manual", signal: AbortSignal.timeout(timeout) });
  return response;
}

export async function smoke({ web, revision, prepared = false, localTest = false }) {
  sha(revision);
  invariant(web && /^https?:\/\//.test(web), "URL web requise.", 64);
  if (localTest) invariant(["localhost", "127.0.0.1", "[::1]"].includes(new URL(web).hostname), "local-test ne peut viser qu'une boucle locale.", 64);
  if (!localTest) invariant(new URL(web).protocol === "https:", "HTTPS est obligatoire pour une livraison exposée.", 64);
  const results = [];
  for (const [route, expected, options] of [
    ["/", 200], ["/admin/", 200], ["/espace/", 200], ["/devenir-prof.html", 200],
    ["/api/subjects", 200], ["/api/teachers", 200], ["/api/me", 401], ["/api/courses", 401],
    ["/api/teacher/profile", 401], ["/api/teacher-applications/status", 401],
    ["/api/me", 401, { headers: { Authorization: "Bearer demo-token" } }],
    ["/api/auth/login", 400, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
  ]) {
    const response = await request(web, route, options);
    await response.arrayBuffer();
    invariant(response.status === expected, `Smoke ${route} : HTTP ${response.status}, attendu ${expected}.`, 69);
    results.push({ route, status: response.status });
  }
  const health = await request(web, "/health");
  invariant(health.status === 200 && (await health.json()).status === "ok", "La sonde de base de données /health échoue.", 69);
  const readiness = await request(web, "/ready"); const state = await readiness.json();
  invariant(readiness.status === (prepared ? 503 : 200) && state.status === (prepared ? "not_ready" : "ready"),
    `Readiness inattendue : ${readiness.status}/${state.status}.`, 69);
  if (revision) invariant(state.revision === revision, "Le serveur ne répond pas avec le SHA livré.", 69);
  const channels = await request(web, "/api/auth/otp-channels"); const auth = await channels.json();
  invariant(channels.status === 200 && (localTest || auth.demo === false), "Le mode démo est actif ou le contrat OTP est inaccessible.", 69);
  const caps = await request(web, "/api/capabilities"); const capabilities = await caps.json();
  invariant(caps.status === 200 && capabilities.serviceOpen === !prepared, "État d'ouverture du service incohérent.", 69);
  return { ok: true, mode: prepared ? "prepared_closed" : "live", localTest, revision: state.revision, checkedAt: new Date().toISOString(), results };
}
