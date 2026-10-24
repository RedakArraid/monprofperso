import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
process.env.NODE_ENV='test';process.env.DEMO_MODE='false';
const require=createRequire(import.meta.url);
const {Pool,Client}=require('pg');
const {applyMigrations}=require('../dist/migrations.js');
const {pool}=require('../dist/db.js');
after(()=>pool.end());
test('installation réelle vierge : toutes les migrations sans comptes/cours/avis/revenus de démonstration',async()=>{
  const name=`mpp_clean_${process.pid}_${Date.now()}`;
  const admin=new Client();await admin.connect();
  const fresh=new Pool({database:name});
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    await applyMigrations(fresh);
    for(const table of ['teachers','reviews','courses','payments','transactions','notifications','group_courses','subscription_plans','user_subscriptions','referrals','payment_accounts','teacher_profiles','teacher_earning_weeks','teacher_requests','teacher_payouts','progress_subjects']) {
      assert.equal(Number((await fresh.query(`SELECT count(*) FROM ${table}`)).rows[0].count),0,`${table} doit être vide hors démo`);
    }
    const users=(await fresh.query('SELECT role FROM users')).rows;
    assert.deepEqual(users,[{role:'admin'}]);
    assert.ok((await fresh.query('SELECT id FROM subjects')).rowCount>0);
    assert.equal((await fresh.query("SELECT value FROM installation_metadata WHERE key='data_origin'")).rows[0].value,'clean');
    await fresh.query("INSERT INTO users(full_name,phone) VALUES('Compte réel','+2250102030405')");
    await applyMigrations(fresh);
    assert.equal((await fresh.query("SELECT id FROM users WHERE phone='+2250102030405'")).rowCount,1,'Une relance ne supprime aucune donnée réelle');
  } finally {
    await fresh.end();await admin.query(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
