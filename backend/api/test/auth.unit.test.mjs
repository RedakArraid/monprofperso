import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.JWT_SECRET = 'auth-unit-test-secret-with-at-least-32-characters';
const require = createRequire(import.meta.url);
const auth = require('../dist/auth.js');
const now = () => Math.floor(Date.now() / 1000);
const claims = () => ({ sub: 7, role: 'parent', iat: now(), exp: now() + 300, v: 2, aud: 'monprofperso-api', iss: 'monprofperso-auth' });
function signed(payload, header = { alg: 'HS256', typ: 'JWT' }) {
  const body = [header, payload].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return body + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url');
}

test('JWT v2 signé : identité et durée vérifiables', () => {
  const token = auth.signJwt(7, 'parent');
  const verified = auth.verifyJwt(token);
  assert.equal(verified.sub, 7);
  assert.equal(verified.v, 2);
  assert.equal(verified.exp - verified.iat, 86400);
  assert.equal(auth.verifyJwt(token + 'x'), null);
});

test('JWT historique signé sans preuve rejeté après migration v2', () => {
  assert.equal(auth.verifyJwt(signed({ sub: 7, role: 'admin', iat: now(), exp: now() + 300 })), null);
});

test('expiration, version, audience, émetteur, identifiant et algorithme sont obligatoires', () => {
  const cases = [
    { ...claims(), exp: undefined }, { ...claims(), exp: now() }, { ...claims(), exp: '9999999999' },
    { ...claims(), iat: undefined }, { ...claims(), iat: now() + 100 },
    { ...claims(), sub: 1.5 }, { ...claims(), sub: 0 }, { ...claims(), v: 1 },
    { ...claims(), aud: 'another-api' }, { ...claims(), iss: 'another-issuer' },
  ];
  for (const value of cases) assert.equal(auth.verifyJwt(signed(value)), null);
  assert.equal(auth.verifyJwt(signed(claims(), { alg: 'none', typ: 'JWT' })), null);
  assert.equal(auth.verifyJwt(signed(claims(), null)), null);
  assert.equal(auth.verifyJwt('malformed'), null);
});

test('une requête anonyme ne reçoit aucune identité de démonstration', async () => {
  const req = { header: () => undefined };
  const res = { locals: {} };
  let called = false;
  auth.optionalAuth(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(res.locals.userId, undefined);
  assert.throws(() => auth.currentUserId(res), (error) => error.statusCode === 401);
});

test('gardes professeur et administrateur refusent le compte parent et le professeur sans fiche', () => {
  for (const [guard, locals, expected] of [
    [auth.requireAdmin, {}, 401], [auth.requireTeacher, {}, 401],
    [auth.requireAdmin, { userId: 1, userRole: 'parent' }, 403],
    [auth.requireTeacher, { userId: 1, userRole: 'parent', teacherId: 1 }, 403],
    [auth.requireTeacher, { userId: 2, userRole: 'teacher', teacherId: null }, 403],
  ]) {
    let status;
    const res = { locals, status(code) { status = code; return this; }, json() {} };
    guard({}, res, () => assert.fail('Accès inattendu'));
    assert.equal(status, expected);
  }
});

test('la production refuse le mode démo et les secrets faibles', () => {
  const previous = { node: process.env.NODE_ENV, demo: process.env.DEMO_MODE, secret: process.env.JWT_SECRET };
  try {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';
    assert.equal(auth.isDemoMode(), false);
    assert.throws(() => auth.assertAuthConfiguration(), /DEMO_MODE/);
    process.env.DEMO_MODE = 'false';
    for (const secret of [
      'weak', 'x'.repeat(64),
      'local-only-replace-with-a-random-secret-before-exposure',
      'local-development-secret-do-not-use-in-production',
      'GENERER_UN_SECRET_LONG_DE_64_CARACTERES',
    ]) {
      process.env.JWT_SECRET = secret;
      assert.throws(() => auth.assertAuthConfiguration(), /JWT_SECRET/);
    }
    process.env.JWT_SECRET = previous.secret;
    assert.doesNotThrow(() => auth.assertAuthConfiguration());
  } finally {
    process.env.NODE_ENV = previous.node;
    process.env.DEMO_MODE = previous.demo;
    process.env.JWT_SECRET = previous.secret;
  }
});

test('normalisation ivoirienne sans zéro supplémentaire', () => {
  assert.equal(auth.normalizeAuthPhone('0758421903'), '+2250758421903');
  assert.equal(auth.normalizeAuthPhone('2250758421903'), '+2250758421903');
  assert.equal(auth.normalizeAuthPhone('+2250758421903'), '+2250758421903');
});
