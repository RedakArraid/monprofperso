// Vraies transactions PostgreSQL et routes HTTP, dans une base jetable propre à
// ce fichier. Aucune fixture ni aucun verrou ne touche la base de recette.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomInt, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';

process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.JWT_SECRET = 'account-concurrency-local-only-secret-32-characters';
process.env.S3_ENDPOINT = '';
const require = createRequire(import.meta.url);
const { Client } = require('pg');
const express = require('express');
const nativeFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Appel fournisseur interdit dans les tests de fermeture de compte'); };
const databaseName = `mpp_account_concurrency_${process.pid}_${Date.now()}`;
const closureLock = "SELECT pg_advisory_xact_lock(hashtext('monprofperso:account-closure'))";
let maintenance, databaseCreated = false, pool, signJwt, server, base;

before(async () => {
  // Le client de maintenance conserve la base initiale. db.js n'est chargé
  // qu'après PGDATABASE : toutes les routes utilisent exclusivement la copie.
  maintenance = new Client();
  await maintenance.connect();
  await maintenance.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  await maintenance.query(`ALTER DATABASE "${databaseName}" SET statement_timeout = '15s'`);
  process.env.PGDATABASE = databaseName;
  ({ pool } = require('../dist/db.js'));
  ({ signJwt } = require('../dist/auth.js'));
  await require('../dist/migrations.js').applyMigrations(pool);
  const app = express();
  app.use(express.json());
  app.use('/api', require('../dist/routes.js').api);
  app.use(require('../dist/http.js').errorHandler);
  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  globalThis.fetch = nativeFetch;
  try {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    if (pool) await pool.end();
  } finally {
    try {
      if (databaseCreated) await dropDisconnectedDatabase();
    } finally { if (maintenance) await maintenance.end(); }
  }
});

async function dropDisconnectedDatabase() {
  // pg-pool résout end() après avoir retiré ses clients du pool, avant que
  // leurs connexions soient toutes fermées côté PostgreSQL. Un DROP FORCE
  // dans cette fenêtre peut provoquer une erreur 57P01 tardive sur un client.
  const deadline = Date.now() + 5000;
  for (;;) {
    const sessions = (await maintenance.query(
      'SELECT pid,state FROM pg_stat_activity WHERE datname=$1', [databaseName])).rows;
    if (!sessions.length) break;
    assert.ok(Date.now() < deadline,
      `Nettoyage refusé : connexions encore ouvertes dans ${databaseName} : ${JSON.stringify(sessions)}`);
    await delay(25);
  }
  // Une connexion persistante est une vraie erreur de nettoyage, jamais tuée
  // ni ignorée pour faire passer le test.
  await maintenance.query(`DROP DATABASE "${databaseName}"`);
}

async function user(role = 'parent', teacherId = null) {
  const phone = `+998${String(randomInt(0, 1e12)).padStart(12, '0')}`;
  const row = (await pool.query(`INSERT INTO users(full_name,phone,role,teacher_id)
    VALUES('Compte concurrence',$1,$2,$3) RETURNING *`, [phone, role, teacherId])).rows[0];
  return { ...row, token: signJwt(row.id, role) };
}

async function teacher() {
  return (await pool.query(`INSERT INTO teachers(initials,name,subjects,rating,reviews_count,location,price_per_hour,formats)
    VALUES('TC','Prof concurrence','Maths',0,0,'Abidjan',6000,ARRAY['home']) RETURNING *`)).rows[0];
}

async function call(path, actor, method = 'POST', body = { confirmation: 'SUPPRIMER' }) {
  const response = await nativeFetch(base + path, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${actor.token}` },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

// Attendre un verrou effectivement observé évite de déduire la concurrence
// d'un simple délai. Le PID du bloqueur prouve aussi l'ordre des transactions.
async function blockedBy(blockerPid, queryFragment, expected = 1) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const rows = (await pool.query(`SELECT pid,query,pg_blocking_pids(pid) AS blockers
      FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'
      AND $1::int=ANY(pg_blocking_pids(pid)) AND position($2 in query)>0`, [blockerPid, queryFragment])).rows;
    if (rows.length === expected) return rows;
    await delay(25);
  }
  const waiting = (await pool.query(`SELECT pid,state,wait_event_type,wait_event,query,pg_blocking_pids(pid) AS blockers
    FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()`)).rows;
  assert.fail(`Attente de ${expected} transaction(s) bloquée(s) par ${blockerPid} sur ${queryFragment} : ${JSON.stringify(waiting)}`);
}

test('fermetures concurrentes : les deux derniers administrateurs ne sont jamais supprimés ensemble', { timeout: 30000 }, async () => {
  // Le seul administrateur de bootstrap appartient à cette base jetable.
  // On le rétrograde afin que les deux acteurs soient réellement les derniers.
  await pool.query("UPDATE users SET role='parent' WHERE role='admin'");
  const admins = await Promise.all([user('admin'), user('admin')]);
  assert.equal(Number((await pool.query("SELECT count(*) FROM users WHERE role='admin' AND deleted_at IS NULL")).rows[0].count), 2);
  const gate = await pool.connect();
  const pending = [];
  let transactionOpen = false;
  try {
    await gate.query('BEGIN'); transactionOpen = true;
    await gate.query(closureLock);
    pending.push(...admins.map(actor => call('/account/deletion-request', actor)));
    await blockedBy(gate.processID, 'monprofperso:account-closure', 2);
    assert.equal((await pool.query('SELECT id FROM users WHERE id=ANY($1::int[]) AND deleted_at IS NULL', [admins.map(a => a.id)])).rowCount, 2);
    await gate.query('COMMIT'); transactionOpen = false;

    const responses = await Promise.all(pending);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 202], JSON.stringify(responses));
    const remaining = responses.findIndex(r => r.status === 202);
    const removed = 1 - remaining;
    assert.equal(responses[removed].body.request.status, 'completed');
    assert.equal(responses[remaining].body.request.status, 'pending');
    assert.ok(responses[remaining].body.blockers.some(b => b.code === 'last_administrator'));
    const active = (await pool.query("SELECT id FROM users WHERE role='admin' AND deleted_at IS NULL")).rows;
    assert.deepEqual(active, [{ id: admins[remaining].id }]);
    const requests = (await pool.query('SELECT user_id,status,completed_by FROM account_deletion_requests WHERE user_id=ANY($1::int[])', [admins.map(a => a.id)])).rows;
    assert.equal(requests.length, 2);
    assert.equal(requests.find(r => r.user_id === admins[removed].id).completed_by, admins[removed].id);
    assert.equal(requests.find(r => r.user_id === admins[remaining].id).completed_by, null);
    assert.equal((await call('/account/export', admins[removed], 'GET')).status, 401);
    assert.equal((await call('/account/export', admins[remaining], 'GET')).status, 200);
  } finally {
    if (transactionOpen) await gate.query('ROLLBACK');
    gate.release();
    await Promise.allSettled(pending);
  }
});

test('réservation concurrente : le cours déjà engagé est enregistré avant de laisser la fermeture en attente', { timeout: 30000 }, async () => {
  const profile = await teacher();
  const owner = await user('teacher', profile.id);
  const parent = await user();
  const bookingGate = `account-test-booking:${randomUUID()}`;
  // Ce déclencheur de test suspend le véritable POST /bookings après son
  // SELECT professeur FOR UPDATE, juste avant l'insertion du cours.
  await pool.query(`CREATE FUNCTION account_test_pause_booking() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN PERFORM pg_advisory_xact_lock(hashtext(TG_ARGV[0])); RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER z_account_test_pause_booking BEFORE INSERT ON courses
    FOR EACH ROW WHEN (NEW.teacher_id=${profile.id}) EXECUTE FUNCTION account_test_pause_booking('${bookingGate}')`);
  const gate = await pool.connect();
  const pending = [];
  let transactionOpen = false;
  try {
    await gate.query('BEGIN'); transactionOpen = true;
    await gate.query('SELECT pg_advisory_xact_lock(hashtext($1))', [bookingGate]);
    const booking = call('/bookings', parent, 'POST', {
      teacherId: profile.id, subject: 'Maths', level: '3eme', format: 'home', duration: '1h',
      startAt: new Date(Date.now() + 86400000).toISOString(), location: 'Abidjan',
    });
    pending.push(booking);
    const [bookingTransaction] = await blockedBy(gate.processID, 'INSERT INTO courses');
    const closure = call('/account/deletion-request', owner);
    pending.push(closure);
    await blockedBy(bookingTransaction.pid, 'account-closure-teacher');
    // La fermeture n'a ni annoncé de demande ni anonymisé le compte pendant
    // que la réservation détient son verrou professeur.
    assert.equal((await pool.query('SELECT id FROM account_deletion_requests WHERE user_id=$1', [owner.id])).rowCount, 0);
    await gate.query('COMMIT'); transactionOpen = false;

    const [booked, closed] = await Promise.all(pending);
    assert.equal(booked.status, 201, JSON.stringify(booked));
    assert.equal(closed.status, 202, JSON.stringify(closed));
    assert.equal(closed.body.request.status, 'pending');
    assert.deepEqual(closed.body.blockers.filter(b => b.code === 'open_courses').map(b => b.count), [1]);
    const course = (await pool.query('SELECT user_id,teacher_id,lifecycle_status FROM courses WHERE id=$1', [booked.body.course.id])).rows[0];
    assert.deepEqual(course, { user_id: parent.id, teacher_id: profile.id, lifecycle_status: 'requested' });
    const account = (await pool.query('SELECT u.deleted_at,t.archived_at FROM users u JOIN teachers t ON t.id=u.teacher_id WHERE u.id=$1', [owner.id])).rows[0];
    assert.deepEqual(account, { deleted_at: null, archived_at: null });
    assert.equal((await pool.query('SELECT status,completed_by FROM account_deletion_requests WHERE id=$1', [closed.body.request.id])).rows[0].completed_by, null);
  } finally {
    if (transactionOpen) await gate.query('ROLLBACK');
    gate.release();
    await Promise.allSettled(pending);
    await pool.query('DROP TRIGGER z_account_test_pause_booking ON courses');
    await pool.query('DROP FUNCTION account_test_pause_booking()');
  }
});

test('administration concurrente : un admin supprimé après authentification ne peut finaliser une autre fermeture', { timeout: 30000 }, async () => {
  const actor = await user('admin');
  const replacement = await user('admin');
  const owner = await user();
  // Une demande encore en attente dont les obligations sont déjà résolues.
  const request = (await pool.query('INSERT INTO account_deletion_requests(user_id) VALUES($1) RETURNING id', [owner.id])).rows[0];
  const gate = await pool.connect();
  const pending = [];
  let transactionOpen = false;
  try {
    await gate.query('BEGIN'); transactionOpen = true;
    await gate.query(closureLock);
    const actorClosure = call('/account/deletion-request', actor);
    pending.push(actorClosure);
    await blockedBy(gate.processID, 'monprofperso:account-closure');
    const completion = call(`/admin/account-deletions/${request.id}/complete`, actor);
    pending.push(completion);
    // Les deux requêtes ont déjà passé optionalAuth et les gardes de route.
    // La fermeture de l'acteur est la première dans la file du verrou global.
    await blockedBy(gate.processID, 'monprofperso:account-closure', 2);
    await gate.query('COMMIT'); transactionOpen = false;

    const [deleted, denied] = await Promise.all(pending);
    assert.equal(deleted.status, 200, JSON.stringify(deleted));
    assert.equal(deleted.body.request.status, 'completed');
    assert.equal(denied.status, 403, JSON.stringify(denied));
    assert.equal(denied.body.error, 'forbidden');
    assert.ok((await pool.query('SELECT deleted_at FROM users WHERE id=$1', [actor.id])).rows[0].deleted_at);
    assert.equal((await pool.query('SELECT deleted_at FROM users WHERE id=$1', [owner.id])).rows[0].deleted_at, null);
    assert.deepEqual((await pool.query('SELECT status,completed_at,completed_by FROM account_deletion_requests WHERE id=$1', [request.id])).rows[0],
      { status: 'pending', completed_at: null, completed_by: null });
    assert.equal((await call('/account/export', actor, 'GET')).status, 401);

    // Le refus précédent venait bien de l'acteur révoqué : un autre admin
    // peut terminer exactement cette demande, sans changer le compte cible.
    const completed = await call(`/admin/account-deletions/${request.id}/complete`, replacement);
    assert.equal(completed.status, 200, JSON.stringify(completed));
    assert.equal((await pool.query('SELECT completed_by FROM account_deletion_requests WHERE id=$1', [request.id])).rows[0].completed_by, replacement.id);
    assert.ok((await pool.query('SELECT deleted_at FROM users WHERE id=$1', [owner.id])).rows[0].deleted_at);
  } finally {
    if (transactionOpen) await gate.query('ROLLBACK');
    gate.release();
    await Promise.allSettled(pending);
  }
});
