// Contrat sécurisé réel, fournisseur WhatsApp simulé uniquement sur 127.0.0.1.
// Nécessite les migrations et PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.JWT_SECRET = 'auth-integration-test-only-secret-with-32-plus-characters';
process.env.OTP_ENABLED = 'true';
process.env.OTP_WHATSAPP_ENABLED = 'true';
process.env.OTP_WHATSAPP_SESSION_ID = 'auth-test';
process.env.OTP_DEFAULT_CHANNEL = 'whatsapp';
const require = createRequire(import.meta.url);
const express = require('express');
const { pool } = require('../dist/db.js');
const { optionalAuth, requireAuth, requireAdmin, requireTeacher, signJwt } = require('../dist/auth.js');
const { registerAuthRoutes } = require('../dist/authRoutes.js');
const nonce = String(Date.now()).slice(-7);
const phones = [];
let sequence = 0;
const nextPhone = () => { const phone = `+999${nonce}${String(++sequence).padStart(3, '0')}`; phones.push(phone); return phone; };
const codes = new Map();
let provider;
let server;
let base;
let providerFails = false;

async function listen(srv) {
  await new Promise((resolve, reject) => { srv.once('error', reject); srv.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${srv.address().port}`;
}
async function call(path, body, token, method = 'POST') {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  return { status: res.status, body: await res.json(), retryAfter: res.headers.get('retry-after') };
}
async function fixture(role = 'parent', extras = {}) {
  const phone = nextPhone();
  const user = (await pool.query(
    `INSERT INTO users (full_name,phone,role,email,email_verified_at) VALUES ('Auth fixture',$1,$2,$3,$4) RETURNING *`,
    [phone,role,extras.email ?? null,extras.verified ? new Date() : null],
  )).rows[0];
  return user;
}
async function initiate(user) {
  const result = await call('/auth/login', { phone: user.phone });
  assert.equal(result.status, 202);
  assert.equal(result.body.token, undefined);
  assert.equal(result.body.otpRequired, true);
  assert.notEqual(result.body.destination, user.phone);
  assert.match(result.body.destination, /\*/);
  assert.ok(codes.has(user.phone));
  return { ...result.body, code: codes.get(user.phone) };
}

before(async () => {
  provider = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (providerFails) { res.writeHead(503).end('{}'); return; }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const match = body.text.match(/: (\d{6})\./);
    if (!match) { res.writeHead(400).end('{}'); return; }
    codes.set('+' + body.chatId.replace('@c.us', ''), match[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  });
  process.env.OTP_WHATSAPP_BASE_URL = await listen(provider);
  const app = express();
  app.use(express.json());
  app.use(optionalAuth);
  registerAuthRoutes(app);
  app.get('/private', requireAuth, (_req, res) => res.json({ userId: res.locals.userId, role: res.locals.userRole }));
  app.get('/admin', requireAdmin, (_req, res) => res.json({ ok: true }));
  app.get('/teacher', requireTeacher, (_req, res) => res.json({ ok: true }));
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.name }));
  server = http.createServer(app);
  base = await listen(server);
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (provider) await new Promise((resolve) => provider.close(resolve));
  try {
    await pool.query('DELETE FROM auth_challenges WHERE phone=ANY($1::text[])', [phones]);
    await pool.query('DELETE FROM users WHERE phone=ANY($1::text[])', [phones]);
  } finally { await pool.end(); }
});

test('auth réelle : login admin sans OTP ne délivre aucune session', async () => {
  const admin = await fixture('admin');
  const challenge = await initiate(admin);
  assert.equal((await call('/admin', undefined, undefined, 'GET')).status, 401);
  const wrong = await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code === '000000' ? '111111' : '000000' });
  assert.equal(wrong.status, 401);
  const verified = await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code });
  assert.equal(verified.status, 200);
  assert.equal((await call('/admin', undefined, verified.body.token, 'GET')).status, 200);
});

test('auth réelle : les champs libres téléphone/e-mail ne changent pas le compte du challenge', async () => {
  const owner = await fixture();
  const victim = await fixture('admin');
  const challenge = await initiate(owner);
  const verified = await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code, phone: victim.phone, email: 'attacker@example.invalid' });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.user.id, owner.id);
  assert.equal((await call('/admin', undefined, verified.body.token, 'GET')).status, 403);
  assert.equal((await call('/auth/verify-otp', { phone: victim.phone, email: 'attacker@example.invalid', code: challenge.code })).status, 400);
});

test('auth réelle : e-mail non vérifié ou étranger au compte refusé', async () => {
  const owner = await fixture('parent', { email: 'unverified@example.invalid' });
  const bad = await call('/auth/login', { phone: owner.phone, channel: 'email', email: owner.email });
  assert.equal(bad.status, 400);
  await pool.query('UPDATE users SET email_verified_at=now() WHERE id=$1', [owner.id]);
  const mismatch = await call('/auth/login', { phone: owner.phone, channel: 'email', email: 'attacker@example.invalid' });
  assert.equal(mismatch.status, 400);
});

test('auth réelle : un challenge ne peut être consommé qu’une fois, même concurremment', async () => {
  const user = await fixture();
  const challenge = await initiate(user);
  const results = await Promise.all([1,2].map(() => call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code })));
  assert.deepEqual(results.map((r) => r.status).sort(), [200,401]);
});

test('auth réelle : cinq erreurs bloquent le code, même correct ensuite', async () => {
  const challenge = await initiate(await fixture());
  const wrong = challenge.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: wrong })).status, 401);
  assert.equal((await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code })).status, 401);
  const row = (await pool.query('SELECT attempts,consumed_at FROM auth_challenges WHERE id=$1', [challenge.challengeId])).rows[0];
  assert.equal(row.attempts, 5);
  assert.ok(row.consumed_at);
});

test('auth réelle : code expiré refusé', async () => {
  const challenge = await initiate(await fixture());
  await pool.query("UPDATE auth_challenges SET expires_at=now() - interval '1 second' WHERE id=$1", [challenge.challengeId]);
  assert.equal((await call('/auth/verify-otp', { challengeId: challenge.challengeId, code: challenge.code })).status, 401);
});

test('auth réelle : renvoi limité puis ancien challenge invalidé', async () => {
  const user = await fixture();
  const first = await initiate(user);
  const throttled = await call('/auth/request-otp', { challengeId: first.challengeId });
  assert.equal(throttled.status, 429);
  assert.ok(Number(throttled.retryAfter) > 0);
  await pool.query("UPDATE auth_challenges SET created_at=now() - interval '61 seconds' WHERE id=$1", [first.challengeId]);
  const second = await call('/auth/request-otp', { challengeId: first.challengeId });
  assert.equal(second.status, 202);
  assert.notEqual(second.body.challengeId, first.challengeId);
  assert.equal((await call('/auth/verify-otp', { challengeId: first.challengeId, code: first.code })).status, 401);
  assert.equal((await call('/auth/verify-otp', { challengeId: second.body.challengeId, code: codes.get(user.phone) })).status, 200);
});

test('auth réelle : inscription différée et aucun écrasement de compte avant preuve', async () => {
  const phone = nextPhone();
  const payload = { fullName: 'Nouveau compte OTP', phone, role: 'parent', consent: true, email: 'declared@example.invalid' };
  const started = await call('/auth/signup', payload);
  assert.equal(started.status, 202);
  assert.equal((await pool.query('SELECT id FROM users WHERE phone=$1', [phone])).rowCount, 0);
  const verified = await call('/auth/verify-otp', { challengeId: started.body.challengeId, code: codes.get(phone) });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.user.email_verified_at, null);
  const victim = await fixture('admin');
  const attempt = await call('/auth/signup', { ...payload, phone: victim.phone, fullName: 'Attacker name' });
  assert.equal(attempt.status, 202);
  assert.equal(attempt.body.token, undefined);
  const stored = (await pool.query('SELECT full_name,role FROM users WHERE id=$1', [victim.id])).rows[0];
  assert.equal(stored.full_name, 'Auth fixture');
  assert.equal(stored.role, 'admin');
});

test('auth réelle : absence de configuration et échec fournisseur ne deviennent jamais une démo', async () => {
  const user = await fixture();
  process.env.OTP_ENABLED = 'false';
  try {
    const disabled = await call('/auth/login', { phone: user.phone });
    assert.equal(disabled.status, 503);
    assert.equal(disabled.body.token, undefined);
  } finally { process.env.OTP_ENABLED = 'true'; }
  providerFails = true;
  try {
    const failed = await call('/auth/login', { phone: user.phone });
    assert.equal(failed.status, 503);
    assert.equal(failed.body.token, undefined);
    const challenge = (await pool.query('SELECT * FROM auth_challenges WHERE phone=$1 ORDER BY created_at DESC LIMIT 1', [user.phone])).rows[0];
    assert.equal(challenge.delivered_at, null);
    assert.ok(challenge.consumed_at);
  } finally { providerFails = false; }
});

test('rôle relu en base : rétrogradation admin immédiatement effective', async () => {
  const user = await fixture('admin');
  const token = signJwt(user.id, 'admin');
  assert.equal((await call('/admin', undefined, token, 'GET')).status, 200);
  await pool.query("UPDATE users SET role='parent' WHERE id=$1", [user.id]);
  assert.equal((await call('/admin', undefined, token, 'GET')).status, 403);
  assert.equal((await call('/teacher', undefined, token, 'GET')).status, 403);
});
