import fs from "node:fs/promises";
import path from "node:path";
import { assertReleaseEnv, atomicJson, composeArguments, defaultWeb, environment, exists, invariant, json, loadComposeEnv, lock, OperationError,
  repository, run, sha, shellQuote, waitFor } from "./common.mjs";
import { checkCi } from "./ci.mjs";
import { backup } from "./backup.mjs";
import { request, smoke } from "./smoke.mjs";

function deploymentOptions(options, env) {
  invariant(Number(process.versions.node.split(".")[0]) >= 24, "Node.js 24 minimum requis.", 64);
  const mode = environment(options.environment ?? env.MPP_ENVIRONMENT);
  const revision = sha(options.sha);
  invariant(options.confirm === true, "--confirm requis pour préparer ou activer cette révision sur le serveur.", 64);
  const envFile = options["app-env"] ?? env.MPP_ENV_FILE;
  invariant(envFile && path.isAbsolute(envFile), "Chemin absolu du fichier d'environnement requis (--app-env ou MPP_ENV_FILE).", 64);
  return { mode, revision, envFile: path.resolve(envFile),
    repoDir: path.resolve(options["repo-dir"] ?? env.MPP_REPOSITORY ?? repository),
    releasesDir: path.resolve(env.MPP_RELEASES_DIR || "/srv/monprofperso/releases", mode),
    stateDir: path.resolve(options["state-dir"] ?? env.MPP_STATE_DIR ?? `/srv/monprofperso/state/${mode}`),
    web: options.web ?? env.MPP_WEB_URL ?? defaultWeb(mode) };
}

async function compose(ctx, releaseDir, env, args, options = {}) {
  await assertReleaseEnv(releaseDir,ctx.mode,ctx.envFile);
  return run(env.DOCKER_BIN || "docker", [...composeArguments(releaseDir, ctx.mode, ctx.envFile), ...args], { env, ...options });
}
async function imageIds(revision, env) {
  const ids = {};
  for (const kind of ["api", "web"]) ids[kind] = (await run(env.DOCKER_BIN || "docker", ["image", "inspect", "--format", "{{.Id}}", `monprofperso-${kind}:${revision}`], { env, capture: true })).stdout.trim();
  return ids;
}
async function migrationsInSource(releaseDir) {
  return (await fs.readdir(path.join(releaseDir, "backend/api/migrations"))).filter(file => /^\d+_.+\.sql$/.test(file)).sort().map(file => file.replace(/\.sql$/, ""));
}
export function requireSameSchema(applied, target) {
  invariant(Array.isArray(applied) && Array.isArray(target) && JSON.stringify(applied) === JSON.stringify(target),
    "Le schéma diffère du code cible. Retour automatique interdit : revue de compatibilité et procédure dédiée requises ; aucune migration descendante ne sera exécutée.", 78);
}
async function databaseMigrations(ctx, releaseDir, env) {
  const data = await compose(ctx, releaseDir, env, ["exec", "-T", "db", "psql", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align",
    "--username", env.POSTGRES_USER || "monprofperso", "--dbname", env.POSTGRES_DB || (ctx.mode === "prod" ? "monprofperso" : "monprofperso_staging"),
    "--command", "SELECT COALESCE(json_agg(name ORDER BY id),'[]'::json) FROM pgmigrations"], { capture: true });
  return JSON.parse(data.stdout.trim());
}
async function waitRevision(web, revision) {
  await waitFor(async () => {
    try { const response = await request(web, "/ready", { timeout: 5_000 }); return (await response.json()).revision === revision; }
    catch { return false; }
  }, { timeout: 120_000, interval: 1000, message: "Le proxy ne sert pas la nouvelle révision dans le délai prévu." });
}

/** Prepares code and schema with new purchases closed. It never opens service. */
export async function deploy(options, inherited = process.env) {
  const ctx = deploymentOptions(options, inherited);
  const env = { ...await loadComposeEnv(ctx.envFile, inherited), RELEASE_SHA: ctx.revision, SERVICE_OPEN: "false" };
  return lock(path.join(ctx.stateDir, "deployment.lock"), async () => {
    const branch = ctx.mode === "prod" ? "main" : "staging";
    await run("git", ["fetch", "origin", branch], { cwd: ctx.repoDir, env });
    const resolved = (await run("git", ["rev-parse", `${ctx.revision}^{commit}`], { cwd: ctx.repoDir, env, capture: true })).stdout.trim();
    invariant(resolved === ctx.revision, "L'objet Git ne correspond pas au SHA demandé.", 65);
    const ancestor = await run("git", ["merge-base", "--is-ancestor", ctx.revision, `origin/${branch}`], { cwd: ctx.repoDir, env, capture: true, allowFailure: true });
    invariant(ancestor.code === 0, `La révision doit appartenir à origin/${branch}. Aucun merge ou push automatique.`, 65);
    const ci = await checkCi(ctx.revision, { repo: env.MPP_GITHUB_REPO, env });
    const previous = await exists(path.join(ctx.stateDir, "current.json")) ? await json(path.join(ctx.stateDir, "current.json")) : null;
    await fs.mkdir(ctx.releasesDir, { recursive: true, mode: 0o700 });
    const releaseDir = path.join(ctx.releasesDir, `${ctx.revision}-${Date.now()}`);
    await run("git", ["worktree", "add", "--detach", releaseDir, ctx.revision], { cwd: ctx.repoDir, env });
    const alias = path.join(releaseDir, "backend", ctx.mode === "prod" ? ".env.production" : ".env.staging");
    invariant(!await exists(alias), "Une livraison ne doit pas contenir un fichier d'environnement versionné.", 65);
    await fs.symlink(ctx.envFile, alias);
    let record = { sha: ctx.revision, environment: ctx.mode, releaseDir, envFile: ctx.envFile, web: ctx.web,
      preparedAt: new Date().toISOString(), status: "building", previousSha: previous?.sha ?? null, ci };
    const recordFile = path.join(ctx.stateDir, "releases", `${ctx.revision}.json`);
    let changed = false;
    try {
      await run("npm", ["ci", "--ignore-scripts"], { cwd: path.join(releaseDir, "webapp"), env });
      await run("npm", ["run", "build"], { cwd: path.join(releaseDir, "webapp"), env });
      // Never print `docker compose config`: it expands secrets.
      await compose(ctx, releaseDir, env, ["build", "api", "web"]);
      record.images = await imageIds(ctx.revision, env);
      await compose(ctx, releaseDir, env, ["up", "--detach", "--wait", "--wait-timeout", "120", "db"]);
      record.backup = await backup({ environment: ctx.mode, "release-dir": releaseDir, "app-env": ctx.envFile,
        "state-dir": ctx.stateDir, sha: ctx.revision, ...(previous?.sha ? { "source-sha": previous.sha } : {}) }, env);
      invariant(record.backup.external === true, "Une sauvegarde externe complète est obligatoire avant migration.");
      record.status = "migrating_closed"; await atomicJson(recordFile, record);
      changed = true;
      await compose(ctx, releaseDir, env, ["up", "--detach", "--no-build", "--no-deps", "--wait", "--wait-timeout", "120", "api", "web"]);
      await waitRevision(ctx.web, ctx.revision);
      record.smoke = await smoke({ web: ctx.web, revision: ctx.revision, prepared: true });
      record.migrations = await databaseMigrations(ctx, releaseDir, env);
      requireSameSchema(record.migrations, await migrationsInSource(releaseDir));
      record.status = "prepared_closed";
      await atomicJson(recordFile, record); await atomicJson(path.join(ctx.stateDir, "current.json"), record);
      return { ...record, message: "Version préparée. Les nouvelles inscriptions, réservations et charges sont fermées. Effectuer la recette et les validations opérateur de ce SHA, puis activate." };
    } catch (error) {
      record = { ...record, status: changed ? "deployment_failed_closed" : "build_failed", error: error.message, failedAt: new Date().toISOString() };
      await atomicJson(recordFile, record);
      if (changed) await atomicJson(path.join(ctx.stateDir, "current.json"), record);
      throw error;
    }
  });
}

export async function activate(options, inherited = process.env) {
  const ctx = deploymentOptions(options, inherited);
  return lock(path.join(ctx.stateDir, "deployment.lock"), async () => {
    const record = await json(path.join(ctx.stateDir, "current.json"));
    invariant(record.sha === ctx.revision && ["prepared_closed", "activation_failed_closed", "active"].includes(record.status), "Ce SHA n'est pas la version préparée courante.", 65);
    const env = { ...await loadComposeEnv(ctx.envFile, inherited), RELEASE_SHA: ctx.revision, SERVICE_OPEN: "false" };
    invariant(JSON.stringify(await imageIds(ctx.revision, env)) === JSON.stringify(record.images), "Le contenu des images taguées a changé depuis leur préparation.", 65);
    record.ci = await checkCi(ctx.revision, { repo: env.MPP_GITHUB_REPO, env });
    const preflight = "const p=require('./dist/production'),d=require('./dist/db');p.productionReadiness(false).then(r=>{console.log(JSON.stringify({ready:r.ready,revision:r.revision,checks:r.checks.filter(c=>!c.ok).map(c=>({key:c.key,title:c.title}))}));if(!r.ready)process.exitCode=1;}).catch(()=>{console.error('preflight_failed');process.exitCode=1;}).finally(()=>d.pool.end());";
    await compose(ctx, record.releaseDir, env, ["run", "--rm", "--no-deps", "api", "node", "-e", preflight]);
    env.SERVICE_OPEN = "true";
    try {
      await compose(ctx, record.releaseDir, env, ["up", "--detach", "--no-build", "--no-deps", "--wait", "--wait-timeout", "120", "api", "web"]);
      await waitRevision(ctx.web, ctx.revision);
      record.smoke = await smoke({ web: ctx.web, revision: ctx.revision });
      record.status = "active"; record.activatedAt = new Date().toISOString();
      await atomicJson(path.join(ctx.stateDir, "current.json"), record);
      await atomicJson(path.join(ctx.stateDir, "releases", `${ctx.revision}.json`), record);
      return record;
    } catch (error) {
      env.SERVICE_OPEN = "false";
      await compose(ctx, record.releaseDir, env, ["up", "--detach", "--no-build", "--no-deps", "api"]);
      record.status = "activation_failed_closed"; record.error = error.message;
      await atomicJson(path.join(ctx.stateDir, "current.json"), record);
      throw new OperationError("Activation échouée ; service refermé. " + error.message, 69);
    }
  });
}

export async function rollback(options, inherited = process.env) {
  const ctx = deploymentOptions(options, inherited);
  invariant(options["confirm-schema-compatible"] === true && (options.reason ?? "").trim().length >= 10,
    "Retour code : --confirm-schema-compatible et motif explicite --reason requis.", 64);
  return lock(path.join(ctx.stateDir, "deployment.lock"), async () => {
    const current = await json(path.join(ctx.stateDir, "current.json"));
    const target = await json(path.join(ctx.stateDir, "releases", `${ctx.revision}.json`));
    invariant(current.sha !== target.sha && ["prepared_closed", "active", "activation_failed_closed"].includes(target.status), "Version cible antérieure préparée requise.", 65);
    const env = { ...await loadComposeEnv(ctx.envFile, inherited), RELEASE_SHA: current.sha, SERVICE_OPEN: "false" };
    const applied = await databaseMigrations(ctx, current.releaseDir, env);
    requireSameSchema(applied, await migrationsInSource(target.releaseDir));
    invariant(JSON.stringify(await imageIds(target.sha, env)) === JSON.stringify(target.images), "Images de retour absentes ou modifiées.", 65);
    const safetyBackup = await backup({ environment: ctx.mode, "release-dir": current.releaseDir, "app-env": ctx.envFile,
      "state-dir": ctx.stateDir, sha: current.sha, "source-sha": current.sha }, env);
    env.RELEASE_SHA = target.sha;
    await compose(ctx, target.releaseDir, env, ["up", "--detach", "--no-build", "--no-deps", "--wait", "--wait-timeout", "120", "api", "web"]);
    await waitRevision(ctx.web, target.sha);
    const result = { ...target, status: "prepared_closed", rolledBackAt: new Date().toISOString(), rollbackFrom: current.sha,
      rollbackReason: options.reason.trim(), rollbackBackup: safetyBackup, smoke: await smoke({ web: ctx.web, revision: target.sha, prepared: true }) };
    await atomicJson(path.join(ctx.stateDir, "current.json"), result);
    return result;
  });
}

/** Local convenience wrapper; it never merges branches or pushes code. */
export async function remoteRelease(options, env = process.env) {
  const mode = environment(options.environment ?? env.MPP_ENVIRONMENT); const revision = sha(options.sha);
  invariant(options.confirm === true, "--confirm requis pour la préparation distante.", 64);
  const host = env.MP2_SSH || "vps-contabo";
  invariant(/^(?:[A-Za-z0-9_.-]+@)?[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(host), "Alias SSH invalide.", 64);
  const control = env.MPP_REMOTE_CONTROL_DIR || "/srv/monprofperso/control";
  const config = env.MPP_REMOTE_CONFIG || `/etc/monprofperso/backup-${mode}.env`;
  invariant(path.isAbsolute(control) && path.isAbsolute(config), "Chemins distants absolus requis.", 64);
  await checkCi(revision, { repo: env.MPP_GITHUB_REPO, env });
  const command = ["node", `${control}/scripts/run-env.mjs`, config, "--", "node", `${control}/scripts/operations.mjs`,
    "deploy", "--environment", mode, "--sha", revision, "--confirm"].map(shellQuote).join(" ");
  await run(env.SSH_BIN || "ssh", ["-o", "BatchMode=yes", host, command], { env, timeout: 3_600_000 });
  return { preparedRemotely: true, environment: mode, sha: revision, serviceOpen: false };
}
