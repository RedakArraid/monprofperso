import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
process.env.NODE_ENV='test';
process.env.JWT_SECRET='account-regression-local-only-secret-32-characters';
process.env.S3_ENDPOINT='';
const require=createRequire(import.meta.url);
const express=require('express');
const {pool}=require('../dist/db.js');
const {optionalAuth,signJwt}=require('../dist/auth.js');
const {accountRouter,processStorageDeletions}=require('../dist/account.js');
const {errorHandler}=require('../dist/http.js');
const ids=[],teacherIds=[],courseIds=[];
let server,base,sequence=0;
const nonce=Date.now().toString().slice(-7);
async function user(role='parent') {
  const row=(await pool.query("INSERT INTO users(full_name,phone,role,email) VALUES('Compte privé',$1,$2,'prive@example.invalid') RETURNING *",[`+998${nonce}${String(++sequence).padStart(3,'0')}`,role])).rows[0];
  ids.push(row.id);return {...row,token:signJwt(row.id,role)};
}
async function teacher() {
  const row=(await pool.query("INSERT INTO teachers(initials,name,subjects,rating,reviews_count,location,price_per_hour) VALUES('TP','Prof privé','Maths',0,0,'Abidjan',5000) RETURNING *")).rows[0];
  teacherIds.push(row.id);return row;
}
async function course(owner,status='scheduled') {
  const t=await teacher();
  const row=(await pool.query(`INSERT INTO courses(user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,price,status,lifecycle_status,payment_status)
    VALUES($1,$2,'Prof privé','Maths','3e','SAM','12','12h','1h','home',5000,$3,$4,'pending') RETURNING *`,[owner.id,t.id,status==='completed'?'done':'upcoming',status])).rows[0];
  courseIds.push(row.id);return row;
}
async function call(path,who,method='GET',body) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(who?.token?{Authorization:`Bearer ${who.token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json(),headers:response.headers};
}
before(async()=>{
  const app=express();app.use(express.json());app.use(optionalAuth);app.use(accountRouter);app.use(errorHandler);
  server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  try {
    await pool.query('DELETE FROM storage_deletion_queue WHERE account_request_id IN (SELECT id FROM account_deletion_requests WHERE user_id=ANY($1::int[]))',[ids]);
    await pool.query('DELETE FROM account_deletion_requests WHERE user_id=ANY($1::int[])',[ids]);
    await pool.query('DELETE FROM courses WHERE id=ANY($1::int[])',[courseIds]);
    await pool.query('DELETE FROM teacher_applications WHERE user_id=ANY($1::int[])',[ids]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);
    await pool.query('DELETE FROM teachers WHERE id=ANY($1::int[])',[teacherIds]);
  } finally {await pool.end();}
});
test('compte : export privé, aucune identité choisie par le client, re-auth récente',async()=>{
  const owner=await user(),other=await user();
  assert.equal((await call('/account/export')).status,401);
  const result=await call(`/account/export?userId=${other.id}`,owner);
  assert.equal(result.status,200);assert.equal(result.body.account.id,owner.id);
  assert.equal(result.headers.get('cache-control'),'no-store');
  const old=JSON.parse(Buffer.from(owner.token.split('.')[1],'base64url').toString());old.iat-=1000;old.auth_time-=1000;
  const body=owner.token.split('.')[0]+'.'+Buffer.from(JSON.stringify(old)).toString('base64url');
  const token=body+'.'+crypto.createHmac('sha256',process.env.JWT_SECRET).update(body).digest('base64url');
  const forbidden=await call('/account/deletion-request',{token},'POST',{confirmation:'SUPPRIMER'});
  assert.equal(forbidden.status,403);assert.equal(forbidden.body.error,'reauthentication_required');
  assert.equal((await call('/account/export',{token})).status,403);
});
test('compte : fermeture immédiate, enfants/pièces retirés et ancien JWT révoqué',async()=>{
  const owner=await user();
  await pool.query("INSERT INTO children(user_id,name,level) VALUES($1,'Enfant privé','3e')",[owner.id]);
  const app=(await pool.query("INSERT INTO teacher_applications(full_name,phone,subjects,user_id,id_card_content,id_card_file_name) VALUES('Compte privé',$1,'Maths',$2,$3,'identite.pdf') RETURNING id",[owner.phone,owner.id,Buffer.from('PDF personnel')])).rows[0];
  const other=await user();
  assert.equal((await call(`/account/documents/id_card/${app.id}`,other)).status,404);
  assert.equal((await call('/account/deletion-request',owner,'POST',{confirmation:'oui'})).status,400);
  const result=await call('/account/deletion-request',owner,'POST',{confirmation:'SUPPRIMER'});
  assert.equal(result.status,200);assert.equal(result.body.request.status,'completed');
  assert.equal((await call('/account/export',owner)).status,401);
  const row=(await pool.query('SELECT * FROM users WHERE id=$1',[owner.id])).rows[0];
  assert.ok(row.deleted_at);assert.notEqual(row.phone,owner.phone);assert.equal(row.email,null);
  assert.equal((await pool.query('SELECT id FROM children WHERE user_id=$1',[owner.id])).rowCount,0);
  assert.equal((await pool.query('SELECT id_card_content FROM teacher_applications WHERE id=$1',[app.id])).rows[0].id_card_content,null);
  await assert.rejects(pool.query("INSERT INTO children(user_id,name,level) VALUES($1,'Course concurrente','3e')",[owner.id]),{code:'23514'});
});
test('compte : demandes concurrentes uniques, clôture bloquée par cours, annulation effective',async()=>{
  const owner=await user();await course(owner);
  const results=await Promise.all([1,2].map(()=>call('/account/deletion-request',owner,'POST',{confirmation:'SUPPRIMER'})));
  assert.deepEqual(results.map(r=>r.status),[202,202]);assert.equal(results[0].body.request.id,results[1].body.request.id);
  assert.ok(results[0].body.blockers.some(b=>b.code==='open_courses'));
  await assert.rejects(pool.query("INSERT INTO children(user_id,name,level) VALUES($1,'Nouveau','3e')",[owner.id]),{code:'23514'});
  const admin=await user('admin');
  assert.equal((await call(`/admin/account-deletions/${results[0].body.request.id}/complete`,owner,'POST',{confirmation:'SUPPRIMER'})).status,403);
  assert.equal((await call(`/admin/account-deletions/${results[0].body.request.id}/complete`,admin,'POST',{confirmation:'SUPPRIMER'})).status,409);
  assert.equal((await call('/account/deletion-request',owner,'DELETE')).body.request.status,'cancelled');
  assert.equal((await call(`/admin/account-deletions/${results[0].body.request.id}/complete`,admin,'POST',{confirmation:'SUPPRIMER'})).body.error,'request_cancelled');
});
test('compte : un paiement attendu empêche la clôture, les montants historiques restent',async()=>{
  const owner=await user(),c=await course(owner,'completed');
  const payment=(await pool.query("INSERT INTO payments(user_id,course_id,amount,provider,phone,status) VALUES($1,$2,5000,'mtn',$3,'pending') RETURNING id",[owner.id,c.id,owner.phone])).rows[0];
  const result=await call('/account/deletion-request',owner,'POST',{confirmation:'SUPPRIMER'});
  assert.equal(result.status,202);assert.ok(result.body.blockers.some(b=>b.code==='pending_payments'));
  await pool.query("UPDATE payments SET status='failed' WHERE id=$1",[payment.id]);
  const admin=await user('admin');
  const closed=await call(`/admin/account-deletions/${result.body.request.id}/complete`,admin,'POST',{confirmation:'SUPPRIMER'});
  assert.equal(closed.status,200);
  assert.equal((await pool.query('SELECT amount FROM payments WHERE id=$1',[payment.id])).rows[0].amount,5000);
});
test('compte : intention de suppression S3 conservée lorsque le stockage est indisponible',async()=>{
  const owner=await user();
  await pool.query("INSERT INTO teacher_applications(full_name,phone,subjects,user_id,id_card_storage_key) VALUES('Compte privé',$1,'Maths',$2,$3)",[owner.phone,owner.id,`account-test/${nonce}.pdf`]);
  const result=await call('/account/deletion-request',owner,'POST',{confirmation:'SUPPRIMER'});
  assert.equal(result.status,200);assert.equal(result.body.cleanupPending,true);
  await processStorageDeletions();
  const row=(await pool.query('SELECT attempts,last_error,next_attempt_at FROM storage_deletion_queue WHERE account_request_id=$1',[result.body.request.id])).rows[0];
  assert.equal(row.attempts,1);assert.equal(row.last_error,'storage_unavailable');assert.ok(new Date(row.next_attempt_at)>new Date());
});
