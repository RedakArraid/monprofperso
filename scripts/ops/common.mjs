import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export class OperationError extends Error {
  constructor(message, exitCode = 1) { super(message); this.exitCode = exitCode; }
}
export function invariant(condition, message, code = 1) { if (!condition) throw new OperationError(message, code); }
export function sha(value) {
  invariant(typeof value === "string" && /^[a-f0-9]{40}$/.test(value), "SHA Git complet de 40 caractères hexadécimaux requis.", 64);
  return value;
}
export function environment(value) {
  invariant(["prod", "staging"].includes(value), "Environnement attendu : prod ou staging.", 64);
  return value;
}
export function parseArguments(args) {
  const flags = new Set(["confirm", "local-test", "confirm-new-database", "prepared", "confirm-schema-compatible"]);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    invariant(/^--[a-z][a-z-]*$/.test(key), `Argument inattendu : ${key}`, 64);
    invariant(!(key.slice(2) in parsed), `Option répétée : ${key}`, 64);
    if (flags.has(key.slice(2))) parsed[key.slice(2)] = true;
    else {
      invariant(args[i + 1] !== undefined && !args[i + 1].startsWith("--"), `Valeur manquante : ${key}`, 64);
      parsed[key.slice(2)] = args[++i];
    }
  }
  return parsed;
}
export function optionsOnly(options, names) {
  for (const name of Object.keys(options)) invariant(names.includes(name), `Option inconnue : --${name}`, 64);
}

// Un fichier de configuration est du texte : aucune expansion $, substitution
// $(...), commande de shell, ni instruction JavaScript n'est exécutée.
export function parseEnv(text) {
  const result = {};
  for (const [index, source] of text.split(/\r?\n/).entries()) {
    const line = source.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    invariant(match, `Configuration invalide à la ligne ${index + 1}.`, 64);
    const [, key, raw] = match;
    invariant(!["NODE_OPTIONS", "BASH_ENV", "ENV", "RESTIC_PASSWORD_COMMAND"].includes(key), `Option d'exécution interdite dans la configuration : ${key}.`, 64);
    let value;
    if (raw.startsWith("'") || raw.startsWith('"')) {
      const quote = raw[0]; let cursor = 1, out = "", closed = false;
      for (; cursor < raw.length; cursor++) {
        if (raw[cursor] === quote) { closed = true; cursor++; break; }
        if (raw[cursor] === "\\" && (raw[cursor + 1] === quote || quote === '"' && raw[cursor + 1] === "\\")) out += raw[++cursor];
        else out += raw[cursor];
      }
      invariant(closed && /^(?:\s*#.*)?$/.test(raw.slice(cursor)), `Guillemets invalides à la ligne ${index + 1}.`, 64);
      value = out;
    } else value = raw.replace(/\s+#.*$/, "").trim();
    invariant(!value.includes("\0"), `Valeur invalide à la ligne ${index + 1}.`, 64);
    result[key] = value;
  }
  return result;
}
export async function loadEnv(file, base = process.env) {
  if (!file) return { ...base };
  return { ...base, ...parseEnv(await fs.readFile(path.resolve(file), "utf8")) };
}
export function parseComposeEnv(text) {
  const values = parseEnv(text);
  for (const [index,line] of text.split(/\r?\n/).entries()) {
    const match = /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const raw = match[1];
    invariant(raw.startsWith("'") || (!raw.includes("$") && (!raw.startsWith('"') || !raw.includes("\\"))),
      `Configuration Docker ambiguë à la ligne ${index+1} : utiliser des guillemets simples pour les valeurs contenant $ ou des échappements.`,64);
  }
  return values;
}
export async function loadComposeEnv(file, base = process.env) {
  return { ...base, ...parseComposeEnv(await fs.readFile(path.resolve(file),"utf8")) };
}
export async function json(file) { return JSON.parse(await fs.readFile(file, "utf8")); }
export async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await fs.rename(temporary, file);
}
export async function lock(directory, fn) {
  await fs.mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  try { await fs.mkdir(directory, { mode: 0o700 }); }
  catch (error) { if (error.code === "EEXIST") throw new OperationError(`Opération déjà en cours ou verrou à examiner : ${directory}`, 75); throw error; }
  await fs.writeFile(path.join(directory, "owner.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try { return await fn(); } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
export function run(command, args = [], options = {}) {
  const { cwd, env = process.env, timeout = 30 * 60_000, capture = false, stdin, stdout, input, allowFailure = false, signal } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, shell: false, signal,
      stdio: [stdin ?? (input === undefined ? "ignore" : "pipe"), stdout ?? (capture ? "pipe" : "inherit"), capture ? "pipe" : "inherit"] });
    let output = "", errors = "", timedOut = false;
    child.stdout?.on("data", chunk => { output += chunk; if (output.length > 16 * 1024 * 1024) child.kill("SIGTERM"); });
    child.stderr?.on("data", chunk => { errors += chunk; if (errors.length > 1024 * 1024) errors = errors.slice(-1024 * 1024); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 5_000).unref(); }, timeout);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const result = { code, signal, stdout: output, stderr: errors };
      if (code === 0 && !timedOut || allowFailure) resolve(result);
      else reject(new OperationError(`${path.basename(command)} a échoué (${timedOut ? "délai dépassé" : code ?? signal}).${capture && errors ? `\n${errors.slice(-4000)}` : ""}`));
    });
    if (input !== undefined) child.stdin.end(input);
  });
}
export async function waitFor(check, { timeout = 60_000, interval = 250, message = "Délai dépassé." } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, interval)); }
  throw new OperationError(message);
}
export function projectName(env) { return env === "prod" ? "monprofperso" : "monprofperso-staging"; }
export function composeArguments(releaseDir, env, envFile) {
  return ["compose", "--project-directory", path.join(releaseDir, "backend"), "--project-name", projectName(env),
    "--env-file", path.resolve(envFile), "-f", path.join(releaseDir, "backend", `docker-compose.${env}.yml`)];
}
export async function assertReleaseEnv(releaseDir, mode, envFile) {
  const alias=path.join(releaseDir,"backend",mode==="prod"?".env.production":".env.staging");
  invariant(await fs.realpath(alias)===await fs.realpath(envFile),
    "Le fichier de configuration ne correspond pas à celui lié au worktree préparé. Préparer la version avec ce fichier avant de l'utiliser.",64);
}
export function defaultWeb(env) { return env === "prod" ? "https://www.monprofperso.com" : "https://staging.monprofperso.com"; }
export function shellQuote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
