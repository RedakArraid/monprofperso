import { invariant, run, sha } from "./common.mjs";

export const REQUIRED_JOBS = ["API — build et tests PostgreSQL", "Web — types, lint, tests et build",
  "Android — compilation et tests JVM", "iOS — compilation et tests simulateur"];

export function validateCiRun(revision, workflowRun, jobs) {
  sha(revision);
  invariant(workflowRun?.head_sha === revision, "La CI ne porte pas sur le SHA demandé.", 65);
  invariant(workflowRun.status === "completed" && workflowRun.conclusion === "success", "La dernière CI de ce SHA n'est pas terminée avec succès.", 65);
  invariant(workflowRun.path?.split("@")[0] === ".github/workflows/ci.yml", "Workflow CI inattendu.", 65);
  invariant(Array.isArray(jobs) && jobs.length === REQUIRED_JOBS.length, "Les quatre jobs CI attendus doivent être présents exactement une fois.", 65);
  for (const name of REQUIRED_JOBS) {
    const matches = jobs.filter(job => job.name === name);
    invariant(matches.length === 1 && matches[0].status === "completed" && matches[0].conclusion === "success",
      `Job CI absent, ignoré ou en échec : ${name}`, 65);
    if (matches[0].head_sha !== undefined) invariant(matches[0].head_sha === revision, `SHA du job incorrect : ${name}`, 65);
  }
  return { sha: revision, runId: workflowRun.id, runUrl: workflowRun.html_url, checkedAt: new Date().toISOString(),
    jobs: jobs.map(({ id, name, conclusion }) => ({ id, name, conclusion })) };
}

export async function checkCi(revision, { repo = "RedakArraid/monprofperso", env = process.env, command = run } = {}) {
  sha(revision);
  invariant(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo), "Dépôt GitHub invalide.", 64);
  const request = async endpoint => JSON.parse((await command(env.GH_BIN || "gh", ["api", "--method", "GET", endpoint], { env, capture: true, timeout: 60_000 })).stdout);
  const response = await request(`repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${revision}&per_page=100`);
  const candidates = (response.workflow_runs ?? []).filter(item => item.head_sha === revision).sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt);
  invariant(candidates.length, "Aucune CI trouvée pour ce SHA exact.", 65);
  const current = candidates[0];
  const result = await request(`repos/${repo}/actions/runs/${current.id}/jobs?filter=latest&per_page=100`);
  invariant(result.total_count === REQUIRED_JOBS.length, "Inventaire des jobs CI incomplet ou inattendu.", 65);
  return validateCiRun(revision, current, result.jobs);
}
