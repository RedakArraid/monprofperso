#!/usr/bin/env node
import { loadEnv, invariant, run } from "./ops/common.mjs";
try {
  const [file, separator, command, ...args] = process.argv.slice(2);
  invariant(file && separator === "--" && command, "Usage : node scripts/run-env.mjs FICHIER -- COMMANDE [ARGUMENTS]", 64);
  const env = await loadEnv(file);
  const result = await run(command, args, { env, allowFailure: true, timeout: 4 * 3_600_000 });
  process.exitCode = result.code ?? 1;
} catch (error) { console.error(`[configuration] ${error.message}`); process.exitCode = error.exitCode || 1; }
