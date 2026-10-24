import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
process.env.NODE_ENV = 'test';
const require = createRequire(import.meta.url);
const { validateBootstrapPhone, bootstrapProductionAdmin } = require('../dist/adminBootstrap.js');

test('bootstrap admin exige un numéro différent et valide, puis normalise le numéro local', () => {
  for (const phone of [undefined, '', 'not-a-phone', '+2250700000001', '0700000001']) {
    assert.throws(() => validateBootstrapPhone(phone), /ADMIN_BOOTSTRAP_PHONE/);
  }
  assert.equal(validateBootstrapPhone('07 11 22 33 44'), '+2250711223344');
  assert.equal(validateBootstrapPhone('+2250711223344'), '+2250711223344');
});

test('bootstrap admin hors production ne lit ni ne modifie aucune base', async () => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    await bootstrapProductionAdmin({ connect: () => assert.fail('Connexion DB inattendue') });
  } finally {
    if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before;
  }
});
