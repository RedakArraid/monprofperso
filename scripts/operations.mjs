#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { checkCi } from "./ops/ci.mjs";
import { backup, restoreArchive, restoreDatabase } from "./ops/backup.mjs";
import { activate, deploy, remoteRelease, rollback } from "./ops/deploy.mjs";
import { monitor } from "./ops/monitor.mjs";
import { smoke } from "./ops/smoke.mjs";
import { loadEnv, optionsOnly, parseArguments } from "./ops/common.mjs";

const usage = `Usage : node scripts/operations.mjs COMMANDE [options]
  ci-check --sha SHA40
  deploy --environment prod|staging --sha SHA40 --confirm [--app-env /etc/...]
  activate --environment prod|staging --sha SHA40 --confirm
  rollback --environment prod|staging --sha SHA40 --confirm --confirm-schema-compatible --reason MOTIF
  release --environment prod|staging --sha SHA40 --confirm (préparation par SSH)
  smoke --web https://... --sha SHA40 [--prepared]
  backup --environment prod|staging [--app-env /etc/...] [--release-dir DIR]
  restore --snapshot IDENTIFIANT --target NOUVEAU_REPERTOIRE
  restore-database --backup-dir DIR --target-database mpp_restore_x --confirm-new-database
  monitor --environment prod|staging
Options communes : --config FICHIER (dotenv littéral), --state-dir REPERTOIRE.
La restauration n'écrase jamais une base existante. La production exige un dépôt restic externe.`;

export async function main(args = process.argv.slice(2), inherited = process.env) {
  const [command, ...rest] = args;
  if (!command || ["help", "--help", "-h"].includes(command)) { console.log(usage); return; }
  const options = parseArguments(rest);
  const env = await loadEnv(options.config, inherited);
  delete options.config;
  let result;
  const delivery = ["environment", "sha", "confirm", "app-env", "repo-dir", "state-dir", "web"];
  const files = ["environment", "app-env", "release-dir", "api-dir", "state-dir", "local-test"];
  switch (command) {
    case "ci-check": optionsOnly(options, ["sha"]); result = await checkCi(options.sha, { repo: env.MPP_GITHUB_REPO, env }); break;
    case "deploy": optionsOnly(options, delivery); result = await deploy(options, env); break;
    case "activate": optionsOnly(options, delivery); result = await activate(options, env); break;
    case "rollback": optionsOnly(options, [...delivery, "confirm-schema-compatible", "reason"]); result = await rollback(options, env); break;
    case "release": optionsOnly(options, ["environment", "sha", "confirm"]); result = await remoteRelease(options, env); break;
    case "backup": optionsOnly(options, [...files, "sha", "source-sha"]); result = await backup(options, env); break;
    case "restore": optionsOnly(options, [...files, "snapshot", "target"]); result = await restoreArchive(options, env); break;
    case "restore-database": optionsOnly(options, [...files, "backup-dir", "target-database", "confirm-new-database"]); result = await restoreDatabase(options, env); break;
    case "monitor": optionsOnly(options, ["environment", "web", "state-dir", "local-test"]); result = await monitor(options, env); if (!result.ok) process.exitCode = 1; break;
    case "smoke": optionsOnly(options, ["web", "sha", "prepared", "local-test"]); result = await smoke({ web: options.web, revision: options.sha, prepared: options.prepared === true, localTest: options["local-test"] === true }); break;
    default: throw new Error(usage);
  }
  console.log(JSON.stringify(result, null, 2));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(`[operations] ${error.message}`); process.exitCode = error.exitCode || 1;
});
