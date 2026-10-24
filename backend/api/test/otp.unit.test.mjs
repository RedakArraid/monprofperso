import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
process.env.NODE_ENV = 'test';
const require = createRequire(import.meta.url);
const { maskOtpDestination } = require('../dist/otp.js');

test('la destination OTP affichée ne divulgue pas l’adresse e-mail liée au compte', () => {
  assert.equal(maskOtpDestination('email', 'personne@example.com'), 'p***@e***.com');
  assert.equal(maskOtpDestination('whatsapp', '+2250711223344'), '+225 ******44');
});
