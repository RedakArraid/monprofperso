#!/usr/bin/env bash
# CI jetable uniquement : deux vrais stacks Docker, aucun fournisseur externe.
set -euo pipefail
[[ "${CI:-}" == true ]] || { echo 'Ce test exige CI=true sur un runner jetable.' >&2; exit 64; }
for mpp_command in docker node; do
  command -v "$mpp_command" >/dev/null || { echo "Prérequis absent : $mpp_command" >&2; exit 69; }
done
docker info >/dev/null
docker compose version >/dev/null
mpp_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mpp_run="${GITHUB_RUN_ID:-0}-${GITHUB_RUN_ATTEMPT:-0}-$$"
[[ "$mpp_run" =~ ^[0-9-]+$ ]] || exit 64
mpp_prod_project="mpp-ci-prod-$mpp_run"
mpp_staging_project="mpp-ci-staging-$mpp_run"
mpp_prod_sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
mpp_staging_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
mpp_containers=(monprofperso-db monprofperso-api monprofperso-web monprofperso-staging-db monprofperso-staging-api monprofperso-staging-web)
for mpp_container in "${mpp_containers[@]}"; do
  if docker container inspect "$mpp_container" >/dev/null 2>&1; then
    echo "Conteneur déjà présent : $mpp_container. Aucune installation existante ne sera arrêtée." >&2; exit 64
  fi
done
if docker network inspect traefik_network >/dev/null 2>&1; then
  echo 'Réseau traefik_network déjà présent : runner vierge requis.' >&2; exit 64
fi
for mpp_project in "$mpp_prod_project" "$mpp_staging_project"; do
  for mpp_resource in container network volume; do
    [[ -z "$(docker "$mpp_resource" ls -q --filter "label=com.docker.compose.project=$mpp_project")" ]] || exit 64
  done
done

umask 077
mpp_work="$(mktemp -d)"
mpp_prod_started=false mpp_staging_started=false mpp_network_created=false
compose() {
  local mpp_mode="$1" mpp_project mpp_env
  shift
  if [[ "$mpp_mode" == prod ]]; then
    mpp_project="$mpp_prod_project"; mpp_env="$mpp_work/backend/.env.production"
  else
    mpp_project="$mpp_staging_project"; mpp_env="$mpp_work/backend/.env.staging"
  fi
  node -- "$mpp_root/scripts/run-env.mjs" "$mpp_env" -- docker compose \
    --project-directory "$mpp_work/backend" --project-name "$mpp_project" \
    --env-file "$mpp_env" -f "$mpp_work/backend/docker-compose.$mpp_mode.yml" "$@"
}
cleanup() {
  local mpp_status=$?
  trap - EXIT INT TERM
  set +e
  if (( mpp_status != 0 )); then
    $mpp_prod_started && compose prod logs --no-color --tail 60 db api web
    $mpp_staging_started && compose staging logs --no-color --tail 60 db api web
  fi
  if $mpp_staging_started; then compose staging down --volumes --timeout 10 || mpp_status=1; fi
  if $mpp_prod_started; then compose prod down --volumes --timeout 10 || mpp_status=1; fi
  if $mpp_network_created; then docker network rm traefik_network >/dev/null || mpp_status=1; fi
  rm -rf -- "${mpp_work:?}"
  exit "$mpp_status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir "$mpp_work/backend"
cp "$mpp_root/backend/docker-compose.prod.yml" "$mpp_root/backend/docker-compose.staging.yml" "$mpp_work/backend/"
ln -s "$mpp_root/backend/api" "$mpp_work/backend/api"
ln -s "$mpp_root/web" "$mpp_work/web"

node --input-type=module - "$mpp_root" "$mpp_work" <<'NODE'
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const [root, work] = process.argv.slice(2);
const { parseComposeEnv } = await import(pathToFileURL(`${root}/scripts/ops/common.mjs`));
for (const [mode, letter, number] of [['production','a','1'], ['staging','b','2']]) {
  const env = {
    POSTGRES_USER: 'ci_isolation', POSTGRES_DB: `ci_isolation_${mode}`,
    POSTGRES_PASSWORD: 'ci-only-postgres-$TOKEN-"quote"',
    JWT_SECRET: 'ci-isolation-only-$TOKEN-"quote"-0123456789abcdef',
    RELEASE_SHA: letter.repeat(40), NODE_ENV: 'production', APP_ENV: mode,
    HOST: '0.0.0.0', TRUST_PROXY: 'loopback', ADMIN_BOOTSTRAP_PHONE: `+99900000000${number}`,
    SERVICE_OPEN: 'false', DEMO_MODE: 'false', PAYSTACK_MOCK: 'false',
    WORKER_ENABLED: 'false', NOTIFICATIONS_ENABLED: 'false', ONLINE_COURSES_ENABLED: 'false',
    OTP_ENABLED: 'false', OTP_WHATSAPP_ENABLED: 'false', OTP_EMAIL_ENABLED: 'false',
    OTP_WHATSAPP_BASE_URL: '', OTP_WHATSAPP_SESSION_ID: '',
    OTP_WHATSAPP_API_KEY: 'alpha$TOKEN"quote\'single', OTP_SMTP_PASS: String.raw`abc\nxyz\\tail`,
    PAYSTACK_SECRET_KEY: '', PAYSTACK_PUBLIC_KEY: '', S3_ENDPOINT: '', S3_ACCESS_KEY: '', S3_SECRET_KEY: '',
    S3_PORT: '443', S3_USE_SSL: 'true', S3_BUCKET: `ci-isolation-${mode}`,
    PUBLIC_WEB_URL: 'https://ci.example.invalid', LAUNCH_TEST_PHONES: '',
  };
  const text = Object.entries(env).map(([key,value]) => `${key}='${value.replaceAll("'", "\\'")}'`).join('\n') + '\n';
  assert.deepEqual(parseComposeEnv(text), env);
  await fs.writeFile(`${work}/backend/.env.${mode}`, text, {mode:0o600,flag:'wx'});
}
NODE

# Les noms d'images sont eux aussi réservés avant de construire les tags factices.
for mpp_sha in "$mpp_prod_sha" "$mpp_staging_sha"; do
  for mpp_image in api web; do
    if docker image inspect "monprofperso-$mpp_image:$mpp_sha" >/dev/null 2>&1; then
      echo 'Image de test déjà présente : runner vierge requis.' >&2; exit 64
    fi
  done
done
compose prod build api web
compose staging build api web
docker network create --label "mpp.ci.isolation=$mpp_run" traefik_network >/dev/null
mpp_network_created=true
mpp_prod_started=true
compose prod up --detach --no-build
mpp_staging_started=true
compose staging up --detach --no-build
mpp_healthy=false
for mpp_attempt in {1..90}; do
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' "${mpp_containers[@]}" | grep -c '^healthy$')" == 6 ]]; then
    mpp_healthy=true; break
  fi
  sleep 2
done
$mpp_healthy || { echo 'Les six conteneurs ne sont pas devenus sains.' >&2; exit 1; }

# Node existe dans l'image API ; les requêtes passent bien par chaque Nginx web.
mpp_probe="$(cat <<'NODE'
const assert = require('node:assert/strict');
const [web, revision, mode] = process.argv.slice(1);
const expected = { OTP_WHATSAPP_API_KEY:'alpha$TOKEN"quote\'single', OTP_SMTP_PASS:String.raw`abc\nxyz\\tail`,
  POSTGRES_PASSWORD:'ci-only-postgres-$TOKEN-"quote"', JWT_SECRET:'ci-isolation-only-$TOKEN-"quote"-0123456789abcdef' };
for (const [key,value] of Object.entries(expected)) assert.ok(process.env[key] === value,`Valeur dotenv altérée : ${key}`);
assert.ok(process.env.PGPASSWORD === expected.POSTGRES_PASSWORD,'Mot de passe PostgreSQL altéré');
assert.equal(process.env.RELEASE_SHA,revision); assert.equal(process.env.APP_ENV,mode);
for (const key of ['WORKER_ENABLED','NOTIFICATIONS_ENABLED','OTP_ENABLED','PAYSTACK_MOCK']) assert.equal(process.env[key],'false');
(async () => {
  for (const [route,status] of [['/ready',503],['/ready',503],['/ready',503],['/health',200],['/api/capabilities',200],['/.env.production',404],['/.env.staging',404],['/nginx.conf',404]]) {
    const response = await fetch(`http://${web}${route}`,{redirect:'manual',signal:AbortSignal.timeout(10000)});
    const body = await response.text();
    assert.equal(response.status,status,`${mode} ${route}`);
    for (const value of Object.values(expected)) assert.ok(!body.includes(value) && !body.includes(JSON.stringify(value).slice(1,-1)),`Fuite de configuration : ${route}`);
    assert.match(response.headers.get('x-content-type-options') || '',/nosniff/);
    assert.equal(response.headers.get('x-powered-by'),null);
    assert.doesNotMatch(response.headers.get('server') || '',/nginx\//);
    if (route === '/ready') {
      assert.deepEqual(JSON.parse(body),{status:'not_ready',service:'monprofperso-api',revision});
      assert.match(response.headers.get('cache-control') || '',/no-store/);
      assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
      assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    }
    if (route === '/health') assert.deepEqual(JSON.parse(body),{status:'ok',service:'monprofperso-api'});
    if (route === '/api/capabilities') assert.equal(JSON.parse(body).serviceOpen,false);
  }
  console.log(`Isolation ${mode} vérifiée : Nginx → API ${revision}, service fermé, dotenv littéral et en-têtes préservés.`);
})().catch(error => { console.error(error); process.exitCode=1; });
NODE
)"
compose prod exec -T api node -e "$mpp_probe" monprofperso-web "$mpp_prod_sha" production
compose staging exec -T api node -e "$mpp_probe" monprofperso-staging-web "$mpp_staging_sha" staging

# envsubst doit remplacer uniquement API_UPSTREAM, jamais les variables Nginx.
for mpp_mode in prod staging; do
  compose "$mpp_mode" exec -T web cat /etc/nginx/conf.d/default.conf > "$mpp_work/$mpp_mode.nginx"
done
node --input-type=module - "$mpp_work" <<'NODE'
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const work=process.argv[2];
for (const [mode,alias] of [['prod','mpp-production-api'],['staging','mpp-staging-api']]) {
  const config=await fs.readFile(`${work}/${mode}.nginx`,'utf8');
  assert.ok(config.includes(`proxy_pass http://${alias}:8099/ready;`));
  for (const variable of ['$host','$request_uri','$remote_addr','$proxy_add_x_forwarded_for','$scheme','$uri']) assert.ok(config.includes(variable),`Variable Nginx effacée : ${variable}`);
  assert.ok(!config.includes('${API_UPSTREAM}'));
}
NODE
