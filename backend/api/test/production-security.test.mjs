import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';

// An isolated database prevents production-mode tests from changing shared API fixtures.
const originalDatabase = process.env.PGDATABASE;
const databaseName = `mpp_operations_${process.pid}_${Date.now()}`;
process.env.PGDATABASE = databaseName;
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.JWT_SECRET = 'operations-regression-local-secret-32-characters';
process.env.RELEASE_SHA = 'a'.repeat(40);
process.env.S3_ENDPOINT = '';
process.env.NOTIFICATIONS_ENABLED = 'false';
process.env.PAYSTACK_SECRET_KEY = '';
process.env.PAYSTACK_MOCK = 'false';
process.env.SERVICE_OPEN = 'false';
process.env.LAUNCH_TEST_PHONES = '';
const require = createRequire(import.meta.url);
const { Client } = require('pg');
const express = require('express');
const { pool } = require('../dist/db.js');
const { applyMigrations } = require('../dist/migrations.js');
const { optionalAuth, signJwt } = require('../dist/auth.js');
const { accountRouter } = require('../dist/account.js');
const { currentLegalConsent, validateConsentVersion } = require('../dist/consent.js');
const { configurationFingerprint, productionReadiness, productionRouter, launchGate, limitPublicForms, invalidateReadiness } = require('../dist/production.js');
const { createCourseReminders, deliverQueuedNotifications } = require('../dist/notifications.js');
const { runOperationsCycle } = require('../dist/jobs.js');
const { errorHandler } = require('../dist/http.js');
const control = new Client({ database: originalDatabase });
let server, base, sequence = 0, operator, provider, providerUrl, providerStatus = 200;
const messages = [];

async function user(role = 'parent', verified = false) {
  const row = (await pool.query(`INSERT INTO users(full_name,phone,role,phone_verified_at)
    VALUES('Compte de test',$1,$2,CASE WHEN $3 THEN now() ELSE NULL END) RETURNING *`,
  [`+998701${String(++sequence).padStart(6,'0')}`, role, verified])).rows[0];
  return { ...row, token: signJwt(row.id, role) };
}
async function request(path, who, body, method = 'POST') {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
    ...(who ? { Authorization: `Bearer ${who.token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function notify(owner, icon = 'calendar') {
  return (await pool.query(`INSERT INTO notifications(user_id,icon,accent,text,time_ago,section)
    VALUES($1,$2,'green','Enfant et informations privées ne devant jamais être envoyés','Maintenant','today') RETURNING id`, [owner.id,icon])).rows[0].id;
}

before(async () => {
  await control.connect(); await control.query(`CREATE DATABASE "${databaseName}"`);
  await applyMigrations();
  operator = await user('admin');
  const app = express();
  app.use(limitPublicForms); app.use(express.json()); app.use(optionalAuth);
  app.use('/api', productionRouter, launchGate, accountRouter);
  for (const path of ['/auth/signup','/bookings','/needs/public','/teacher-applications']) {
    app.post('/api' + path, (_req, res) => res.json({ reachedHandler: true }));
  }
  app.use(errorHandler);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  provider = http.createServer(async (req, res) => {
    const chunks = []; for await (const part of req) chunks.push(part);
    messages.push({ path: req.url, body: JSON.parse(Buffer.concat(chunks).toString()) });
    res.writeHead(providerStatus, { 'Content-Type': 'application/json' }); res.end('{}');
  });
  await new Promise(resolve => provider.listen(0,'127.0.0.1',resolve));
  providerUrl = `http://127.0.0.1:${provider.address().port}`;
  for (const [key,value] of Object.entries({ otp_enabled: 'true', otp_whatsapp_enabled: 'true',
    otp_whatsapp_base_url: providerUrl, otp_whatsapp_session_id: 'local-regression', otp_whatsapp_api_key: 'local-only-key' })) {
    await pool.query(`INSERT INTO app_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, [key,value]);
  }
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (provider) await new Promise(resolve => provider.close(resolve));
  await pool.end();
  await control.query(`DROP DATABASE IF EXISTS "${databaseName}"`); await control.end();
});

test('ouverture : les variantes de casse et slash restent fermées, sans bloquer les droits du compte', async () => {
  process.env.NODE_ENV = 'production'; invalidateReadiness();
  for (const path of ['/api/AUTH/SIGNUP/', '/api/BOOKINGS', '/api/Teacher-Applications/']) {
    const response = await request(path, undefined, { phone: '+998701999999' });
    assert.equal(response.status,503,path); assert.equal(response.body.error,'service_not_open');
  }
  const owner = await user();
  assert.equal((await request('/api/account/export',owner,undefined,'GET')).status,200);
  process.env.LAUNCH_TEST_PHONES = owner.phone;
  assert.equal((await request('/api/auth/signup',undefined,{ phone: owner.phone })).status,200);
  assert.equal((await request('/api/auth/signup',undefined,{ phone: '+998701999998' })).status,503);
  // A rehearsal account still has to accept the current documents before booking.
  assert.equal((await request('/api/BOOKINGS/',owner,{})).body.error,'consent_required');
  process.env.LAUNCH_TEST_PHONES = ''; process.env.NODE_ENV = 'test';
});

test('formulaires publics : cinq requêtes au maximum malgré une rafale concurrente et la casse', async () => {
  await pool.query('DELETE FROM public_form_quotas');
  process.env.PUBLIC_FORM_RATE_LIMIT_ENABLED = 'true';
  const responses = await Promise.all(Array.from({length:12},(_,i) => request(
    i % 2 ? '/api/Teacher-Applications/' : '/api/teacher-applications',undefined,{})));
  assert.equal(responses.filter(r=>r.status===200).length,5);
  assert.equal(responses.filter(r=>r.status===429).length,7);
  assert.ok(responses.filter(r=>r.status===429).every(r=>Number(r.headers.get('retry-after'))>0));
  const rows = (await pool.query('SELECT ip_hash,purpose,count FROM public_form_quotas')).rows;
  assert.equal(rows.length,1); assert.equal(rows[0].count,12); assert.match(rows[0].ip_hash,/^[a-f0-9]{64}$/);
  assert.equal(rows[0].purpose,'/api/teacher-applications');
  assert.equal((await request('/api/needs/public',undefined,{})).status,200,'quotas indépendants par formulaire');
  process.env.PUBLIC_FORM_RATE_LIMIT_ENABLED = 'false';
});

test('preuves de recette : même SHA ne suffit pas après une modification de configuration', async () => {
  const result = await request('/api/admin/production-checks/provider_e2e',operator,{ evidence: 'Recette locale documentée pour ce test uniquement.' });
  assert.equal(result.status,200);
  assert.equal(result.body.checks.find(c=>c.key==='provider_e2e').ok,true);
  assert.ok(!JSON.stringify(result.body).includes('local-only-key'));
  const initial = await configurationFingerprint();
  process.env.SERVICE_OPEN = 'true';
  assert.equal(await configurationFingerprint(),initial,'ouvrir ne rend pas la validation caduque');
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_local_different_configuration';
  assert.notEqual(await configurationFingerprint(),initial);
  assert.equal((await productionReadiness()).checks.find(c=>c.key==='provider_e2e').ok,false);
  process.env.PAYSTACK_SECRET_KEY = ''; process.env.SERVICE_OPEN = 'false';
  assert.equal((await productionReadiness()).checks.find(c=>c.key==='provider_e2e').ok,true);
  process.env.RELEASE_SHA = 'b'.repeat(40);
  assert.equal((await productionReadiness()).checks.find(c=>c.key==='provider_e2e').ok,false);
  process.env.RELEASE_SHA = 'a'.repeat(40);
  await request('/api/admin/operations-settings',operator,{refund_policy:'Politique locale renseignée'},'PUT');
  await request('/api/admin/production-checks/legal_review',operator,{evidence:'Vérification locale du maintien des valeurs inchangées.'});
  await request('/api/admin/operations-settings',operator,{refund_policy:'Politique locale renseignée'},'PUT');
  assert.equal((await productionReadiness()).checks.find(c=>c.key==='legal_review').ok,true,'renvoyer la même valeur ne ferme pas le service');
  await request('/api/admin/operations-settings',operator,{refund_policy:'Politique locale modifiée'},'PUT');
  assert.equal((await productionReadiness()).checks.find(c=>c.key==='legal_review').ok,false);
});

test('consentement : fichier révisé sans changement de version, ancien accord refusé, archive consultable', async () => {
  await pool.query("UPDATE legal_documents SET version='2026-10',content=$1,mime_type='application/pdf' WHERE slug IN ('cgu','confidentialite')",[Buffer.from('%PDF-1.4\nInitial')]);
  const first = await currentLegalConsent(); const owner = await user();
  process.env.NODE_ENV = 'production';
  assert.equal((await request('/api/account/consent',owner,{consent:true,consentVersion:first.version})).body.accepted,true);
  const original = (await pool.query("SELECT revision_id FROM legal_documents WHERE slug='cgu'")).rows[0].revision_id;
  await pool.query("UPDATE legal_documents SET content=$1 WHERE slug='cgu'",[Buffer.from('%PDF-1.4\nNouvelle rédaction')]);
  const second = await currentLegalConsent(); assert.notEqual(second.version,first.version);
  await assert.rejects(validateConsentVersion(first.version),{code:'consent_version_changed'});
  assert.equal((await request('/api/account/consent',owner,undefined,'GET')).body.accepted,false);
  assert.equal((await request('/api/account/consent',owner,{consent:true,consentVersion:first.version})).status,409);
  const archived = (await pool.query("SELECT content FROM legal_document_versions WHERE slug='cgu' AND revision_id=$1",[original])).rows[0];
  assert.equal(archived.content.toString(),'%PDF-1.4\nInitial');
  assert.equal((await request('/api/account/consent',owner,{consent:true,consentVersion:second.version})).body.accepted,true);
  const receipts = (await pool.query('SELECT consent_version,legal_revisions FROM account_consent_receipts WHERE user_id=$1 ORDER BY id',[owner.id])).rows;
  assert.deepEqual(receipts.map(row=>row.consent_version),[first.version,second.version]);
  assert.equal(receipts[0].legal_revisions.find(doc=>doc.slug==='cgu').revisionId,original);
  assert.equal((await request('/api/account/export',owner,undefined,'GET')).body.consentReceipts.length,2);
  const student = await user('student');
  assert.equal((await request('/api/account/consent',student,{consent:true,consentVersion:second.version})).body.error,'parental_consent_required');
  assert.equal((await request('/api/account/consent',student,{consent:true,consentVersion:second.version,parentalConsent:true})).status,200);
  process.env.NODE_ENV = 'test';
});

test('notifications : destination vérifiée, aucune promotion, retrait des préférences avant envoi', async () => {
  const unverified = await user(), verified = await user('parent',true);
  await notify(unverified); await notify(verified,'gift');
  const id = await notify(verified);
  const deliveries = (await pool.query('SELECT * FROM notification_deliveries')).rows;
  assert.equal(deliveries.length,1); assert.equal(deliveries[0].notification_id,id);
  await pool.query('UPDATE users SET notifications_whatsapp=false WHERE id=$1',[verified.id]);
  process.env.NOTIFICATIONS_ENABLED = 'true';
  const before = messages.length;
  const result = await deliverQueuedNotifications();
  assert.equal(result.skipped,1); assert.equal(messages.length,before);
  process.env.NOTIFICATIONS_ENABLED = 'false';
});

test('notifications : envoi générique, échec repris durablement et abandon borné', async () => {
  const owner = await user('parent',true), id = await notify(owner);
  process.env.NOTIFICATIONS_ENABLED = 'true'; providerStatus = 503;
  let result = await deliverQueuedNotifications(); assert.equal(result.failed,1);
  let row = (await pool.query('SELECT * FROM notification_deliveries WHERE notification_id=$1',[id])).rows[0];
  assert.equal(row.status,'queued'); assert.equal(row.attempts,1); assert.equal(row.lease_until,null);
  assert.ok(new Date(row.next_attempt_at)>new Date());
  assert.ok(!messages.at(-1).body.text.includes('Enfant'));
  await pool.query("UPDATE notification_deliveries SET next_attempt_at=now(),attempts=4 WHERE notification_id=$1",[id]);
  result = await deliverQueuedNotifications(); assert.equal(result.failed,1);
  row = (await pool.query('SELECT * FROM notification_deliveries WHERE notification_id=$1',[id])).rows[0];
  assert.equal(row.status,'failed'); assert.equal(row.attempts,5);
  providerStatus = 200; const second = await notify(owner);
  assert.equal((await deliverQueuedNotifications()).sent,1);
  assert.equal((await pool.query('SELECT status FROM notification_deliveries WHERE notification_id=$1',[second])).rows[0].status,'sent');
  assert.equal((await deliverQueuedNotifications()).sent,0,'une livraison confirmée n’est pas répétée');
  process.env.NOTIFICATIONS_ENABLED = 'false';
});

test('rappels : concurrence sans doublon, nouveau rappel après report effectif', async () => {
  const parent = await user(), teacherUser = await user('teacher');
  const consent = await currentLegalConsent();
  await request('/api/account/consent',parent,{consent:true,consentVersion:consent.version});
  const teacher = (await pool.query("INSERT INTO teachers(initials,name,subjects,location,price_per_hour,rating,reviews_count) VALUES('TT','Prof test','Maths','Abidjan',5000,0,0) RETURNING id")).rows[0];
  await pool.query('UPDATE users SET teacher_id=$1 WHERE id=$2',[teacher.id,teacherUser.id]);
  const course = (await pool.query(`INSERT INTO courses(user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,
    format,price,status,lifecycle_status,payment_status,accepted,starts_at)
    VALUES($1,$2,'Prof test','Maths','3e','SAM','12','12h','1h','home',5000,'upcoming','scheduled','paid',true,now()+interval '30 minutes') RETURNING id`,[parent.id,teacher.id])).rows[0];
  const totals = await Promise.all([createCourseReminders(),createCourseReminders()]);
  assert.equal((await pool.query('SELECT consent_version FROM courses WHERE id=$1',[course.id])).rows[0].consent_version,consent.version);
  assert.equal(totals.reduce((a,b)=>a+b,0),2);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM course_reminders WHERE course_id=$1',[course.id])).rows[0].count,2);
  await pool.query("UPDATE courses SET starts_at=starts_at+interval '5 minutes' WHERE id=$1",[course.id]);
  assert.equal(await createCourseReminders(),2);
  assert.equal(await createCourseReminders(),0);
});

test('worker : une erreur de stockage invalide le cycle puis une reprise rétablit son état', async () => {
  await pool.query("INSERT INTO storage_deletion_queue(storage_key) VALUES('local-regression/unavailable.pdf')");
  await runOperationsCycle();
  let state = (await pool.query("SELECT last_error,last_success_at FROM worker_heartbeats WHERE worker='operations'")).rows[0];
  assert.match(state.last_error,/storage_cleanup/); assert.equal(state.last_success_at,null);
  await pool.query("DELETE FROM storage_deletion_queue WHERE storage_key='local-regression/unavailable.pdf'");
  await runOperationsCycle();
  state = (await pool.query("SELECT last_error,last_success_at FROM worker_heartbeats WHERE worker='operations'")).rows[0];
  assert.equal(state.last_error,null); assert.ok(state.last_success_at);
});
