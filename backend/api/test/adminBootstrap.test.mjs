// Schéma PostgreSQL isolé : ne modifie jamais l'administrateur de la base de test applicative.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
process.env.NODE_ENV = 'test';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const { bootstrapProductionAdmin, SEED_ADMIN_PHONE } = require('../dist/adminBootstrap.js');
const schema = 'auth_bootstrap_' + randomUUID().replaceAll('-', '');
const database = new Pool({ options: `-c search_path=${schema},public` });
const original = { node: process.env.NODE_ENV, phone: process.env.ADMIN_BOOTSTRAP_PHONE };
const target = '+2250711223344';

before(async () => {
  await database.query(`CREATE SCHEMA ${schema}`);
  await database.query(`CREATE TABLE ${schema}.users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE, role TEXT NOT NULL, full_name TEXT)`);
});
beforeEach(async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.ADMIN_BOOTSTRAP_PHONE;
  await database.query('TRUNCATE users');
  await database.query("INSERT INTO users VALUES (1,$1,'admin','Admin seed'),(2,'+2250799999999','parent','Parent existant')", [SEED_ADMIN_PHONE]);
});
after(async () => {
  try { await database.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } finally { await database.end(); }
  for (const [key, value] of [['NODE_ENV', original.node], ['ADMIN_BOOTSTRAP_PHONE', original.phone]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

async function rows() { return (await database.query('SELECT * FROM users ORDER BY id')).rows; }

test('seed admin en production sans numéro privé : démarrage refusé sans mutation', async () => {
  const initial = await rows();
  await assert.rejects(bootstrapProductionAdmin(database), /ADMIN_BOOTSTRAP_PHONE/);
  assert.deepEqual(await rows(), initial);
});

test('numéro public de démo et numéro appartenant à un autre compte sont refusés', async () => {
  const initial = await rows();
  for (const phone of ['0700000001', '+2250799999999']) {
    process.env.ADMIN_BOOTSTRAP_PHONE = phone;
    await assert.rejects(bootstrapProductionAdmin(database), /ADMIN_BOOTSTRAP_PHONE/);
    assert.deepEqual(await rows(), initial);
  }
  await database.query("UPDATE users SET phone='0711223344' WHERE id=2");
  process.env.ADMIN_BOOTSTRAP_PHONE = target;
  await assert.rejects(bootstrapProductionAdmin(database), /déjà associé/);
  assert.equal((await rows())[0].phone, SEED_ADMIN_PHONE);
});

test('bootstrap concurrent remplace seulement le téléphone du seed et conserve les identités', async () => {
  process.env.ADMIN_BOOTSTRAP_PHONE = '0711223344';
  const initial = await rows();
  await Promise.all([bootstrapProductionAdmin(database), bootstrapProductionAdmin(database)]);
  const actual = await rows();
  assert.deepEqual(actual, [{ ...initial[0], phone: target }, initial[1]]);
  delete process.env.ADMIN_BOOTSTRAP_PHONE;
  await bootstrapProductionAdmin(database);
  assert.deepEqual(await rows(), actual);
});

test('absence de seed admin : aucun compte créé ou promu', async () => {
  await database.query("UPDATE users SET role='parent' WHERE id=1");
  const initial = await rows();
  await bootstrapProductionAdmin(database);
  assert.deepEqual(await rows(), initial);
});
