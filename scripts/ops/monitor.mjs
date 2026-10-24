import path from "node:path";
import { createHash } from "node:crypto";
import { atomicJson, defaultWeb, environment, exists, invariant, json, run } from "./common.mjs";
import { validateBackupDestination } from "./backup.mjs";
import { request } from "./smoke.mjs";

export async function monitor(options, env = process.env) {
  const mode = environment(options.environment ?? env.MPP_ENVIRONMENT ?? "prod");
  const localTest = options["local-test"] === true;
  const web = options.web ?? env.MONITOR_WEB_URL ?? defaultWeb(mode);
  const api = env.MONITOR_API_URL || web;
  for (const base of [web, api]) invariant(new URL(base).protocol === "https:" || localTest && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname), "Le monitoring exposé exige HTTPS.", 64);
  const stateDir = path.resolve(options["state-dir"] ?? env.MPP_STATE_DIR ?? `/srv/monprofperso/state/${mode}`);
  const checks = [];
  async function check(key, fn) {
    try { await fn(); checks.push({ key, ok: true }); }
    catch { checks.push({ key, ok: false }); }
  }
  await Promise.all([
    check("web", async () => { const r = await request(web, "/", { timeout: 10_000 }); await r.arrayBuffer(); invariant(r.status === 200, "web"); }),
    check("health", async () => { const r = await request(api, "/health", { timeout: 10_000 }); invariant(r.status === 200 && (await r.json()).status === "ok", "health"); }),
    check("ready", async () => { const r = await request(api, "/ready", { timeout: 10_000 }); const data = await r.json(); invariant(r.status === 200 && data.status === "ready", "ready");
      if (env.MONITOR_EXPECTED_SHA) invariant(data.revision === env.MONITOR_EXPECTED_SHA, "revision"); }),
    check("external_backup", async () => {
      validateBackupDestination(env, localTest);
      const proof = await json(env.BACKUP_STATE_FILE || path.join(stateDir, "backup-state.json"));
      invariant(localTest || proof.external === true, "local_backup_is_not_external");
      const maximum = Number(env.BACKUP_MAX_AGE_HOURS || "26") * 3_600_000;
      invariant(Number.isFinite(maximum) && maximum > 0 && maximum <= 31 * 24 * 3_600_000, "backup_age_configuration");
      const age = Date.now() - new Date(proof.completedAt).getTime();
      invariant(Number.isFinite(age) && age >= -60_000 && age <= maximum, "stale_backup");
      const result = await run(env.RESTIC_BIN || "restic", ["snapshots", "--json", "--tag", `monprofperso,env:${mode}`], { env, capture: true, timeout: 60_000 });
      const snapshots = JSON.parse(result.stdout);
      const match = snapshots.find(snapshot => snapshot.id.startsWith(proof.snapshotId) && snapshot.tags?.includes(localTest ? "local-rehearsal" : "external-backup"));
      invariant(match && Date.now() - new Date(match.time).getTime() <= maximum, "backup_snapshot_not_found");
    }),
  ]);
  checks.sort((a,b) => a.key.localeCompare(b.key));
  const ok = checks.every(check => check.ok);
  const stateFile = path.join(stateDir, "monitor-state.json");
  const previous = await exists(stateFile) ? await json(stateFile) : {};
  const fingerprint = createHash("sha256").update(JSON.stringify(checks)).digest("hex");
  const alertsEnabled = env.MONITOR_ALERTS_ENABLED === "true" && Boolean(env.ALERT_WEBHOOK_URL);
  const interval = Number(env.MONITOR_ALERT_REPEAT_MINUTES || "240") * 60_000;
  invariant(Number.isFinite(interval) && interval >= 60_000, "Intervalle d'alerte invalide.", 64);
  let alertSent = false, alertFailed = false;
  const shouldAlert = !ok && (previous.fingerprint !== fingerprint || !previous.lastAlertAt || Date.now() - new Date(previous.lastAlertAt).getTime() >= interval)
    || ok && previous.ok === false && Boolean(previous.lastAlertAt);
  if (alertsEnabled && shouldAlert) {
    try {
      const destination = new URL(env.ALERT_WEBHOOK_URL);
      invariant(destination.protocol === "https:" && !destination.username && !destination.password, "Webhook HTTPS requis.");
      const text = `Mon Prof Perso ${mode} : ${ok ? "service rétabli" : "incident — " + checks.filter(item => !item.ok).map(item => item.key).join(", ")}`;
      const response = await fetch(destination, { method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      invariant(response.ok, "alert_failed"); await response.arrayBuffer(); alertSent = true;
    } catch { alertFailed = true; }
  }
  const result = { ok: ok && !alertFailed, environment: mode, checkedAt: new Date().toISOString(), checks, alertsEnabled, alertSent, alertFailed,
    fingerprint, lastAlertAt: alertSent ? new Date().toISOString() : previous.lastAlertAt ?? null };
  await atomicJson(stateFile, result);
  return result;
}
