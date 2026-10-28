#!/usr/bin/env node
/**
 * API locale de recette VISUELLE, sans base, stockage, OTP ni paiement externe.
 * Ce fichier n'est pas inclus dans les images API ou les applications mobiles.
 * Démarrage explicite : MPP_VISUAL_FIXTURES=1 node scripts/visual/fixture-server.mjs
 * Parent 0700000101 ; professeur 0700000102 ; admin 0700000103 ; OTP 123456.
 * 0700000198 = données vides ; 0700000199 = lectures métier en erreur 503.
 */
import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

if (process.env.MPP_VISUAL_FIXTURES !== '1' || process.env.NODE_ENV === 'production') {
  throw new Error('Recette locale uniquement : MPP_VISUAL_FIXTURES=1 et NODE_ENV différent de production requis.');
}
const port = Number(process.env.MPP_VISUAL_PORT || 8099);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port de fixture invalide.');
const challenges = new Map();
const sessions = new Map();
const consentVersion = 'CGU-2026-10|Confidentialite-2026-10|Mentions-2026-10|visual-7f3f0ea170ab4650956196f8e1aacb6823c338165fc02cb647c5cd937f15c4ad';
const users = {
  '0700000101': { id: 1001, full_name: 'Aïcha Koné', phone: '+2250700000101', role: 'parent', teacher_id: null },
  '0700000102': { id: 1002, full_name: 'Mariam Coulibaly', phone: '+2250700000102', role: 'teacher', teacher_id: 101 },
  '0700000103': { id: 1003, full_name: 'Administration de recette', phone: '+2250700000103', role: 'admin', teacher_id: null },
  '0700000198': { id: 1098, full_name: 'Compte sans cours', phone: '+2250700000198', role: 'parent', teacher_id: null, scenario: 'empty' },
  '0700000199': { id: 1099, full_name: 'Compte réseau indisponible', phone: '+2250700000199', role: 'parent', teacher_id: null, scenario: 'error' },
};
const subjects = [
  { slug: 'mathematiques', name: 'Mathématiques', icon: 'function', accent: 'green' },
  { slug: 'francais', name: 'Français', icon: 'book', accent: 'orange' },
  { slug: 'physique-chimie', name: 'Physique-Chimie', icon: 'atom', accent: 'green' },
  { slug: 'anglais', name: 'Anglais', icon: 'translate', accent: 'orange' },
];
const levels = [{ slug: 'cm2', name: 'CM2' }, { slug: '3eme', name: '3ème' }, { slug: 'terminale', name: 'Terminale' }];
const programs = [{ slug: 'ivoirien', name: 'Programme ivoirien' }];
const teachers = [
  { id: 101, initials: 'MC', name: 'Mariam Coulibaly', subjects: 'Mathématiques · Physique-Chimie', rating: 4.8, reviews_count: 12,
    location: 'Cocody, Abidjan', price_per_hour: 5000, distance_km: null, accent: 'green', verified: true, special_bepc: true,
    formats: ['home'], experience: '6 ans', students: '18 élèves accompagnés', bac_success: '',
    bio: 'Je reprends chaque notion avec des exemples concrets et des exercices progressifs. Ensemble, nous construisons une méthode de travail adaptée au rythme de l’élève.',
    levels: ['3ème', 'Terminale'], programs: ['Programme ivoirien'], negotiable: false,
    reviews: [{ author_initials: 'AK', author_name: 'Aïcha K.', rating: 5, time_ago: 'Après un cours', text: 'Une explication claire et une séance bien préparée.' }] },
  { id: 102, initials: 'YK', name: 'Yao Kouamé', subjects: 'Français · Anglais', rating: 0, reviews_count: 0,
    location: 'Yopougon, Abidjan', price_per_hour: 4500, distance_km: null, accent: 'orange', verified: true, special_bepc: false,
    formats: ['home'], experience: '4 ans', students: '', bac_success: '', bio: 'Lecture, expression écrite et pratique orale avec des objectifs définis ensemble.',
    levels: ['CM2', '3ème'], programs: ['Programme ivoirien'], negotiable: true, reviews: [] },
];
const courses = [
  { id: 501, teacher_name: teachers[0].name, subject: 'Mathématiques', level: '3ème', day_label: 'MER', day_num: '28 oct.', time: '16:00', duration: '1 h 30',
    format: 'home', location: 'Cocody', private_address: 'Adresse fictive de recette, Cocody', access_notes: 'Sonner à l’entrée principale.', price: 7500,
    status: 'upcoming', badge: 'Cours confirmé', accepted: true, payment_status: 'paid', starts_at: '2099-10-28T16:00:00.000Z', duration_minutes: 90,
    lifecycle_status: 'scheduled', parent_name: 'Aïcha Koné', participant_role: 'parent', meeting_url: null },
  { id: 502, teacher_name: teachers[1].name, subject: 'Français', level: 'CM2', day_label: 'SAM', day_num: '31 oct.', time: '10:00', duration: '1 h',
    format: 'home', location: 'Yopougon', price: 4500, status: 'upcoming', accepted: false, payment_status: 'pending', starts_at: '2099-10-31T10:00:00.000Z',
    duration_minutes: 60, lifecycle_status: 'requested', parent_name: 'Aïcha Koné', participant_role: 'parent' },
  { id: 503, teacher_name: teachers[0].name, subject: 'Mathématiques', level: '3ème', day_label: 'LUN', day_num: '19 oct.', time: '16:00', duration: '1 h 30',
    format: 'home', location: 'Cocody', price: 7500, status: 'done', accepted: true, payment_status: 'paid', starts_at: '2026-10-19T16:00:00.000Z',
    duration_minutes: 90, lifecycle_status: 'completed', parent_name: 'Aïcha Koné', participant_role: 'parent' },
];
const summary = { expected: 18000, due: 12000, releasable: 6500, reserved: 2000, paid: 3500 };
const finance = { grossAmount: 7500, commissionPct: 20, commissionAmount: 1500, teacherNetAmount: 6000, capturedAmount: 7500,
  refundAmount: 0, refundPendingAmount: 0, teacherDue: 6000, teacherReleasable: 6000, teacherReserved: 0, teacherPaid: 0, reviewRequired: false };
const legal = ['cgu', 'confidentialite', 'mentions-legales'].map((slug, i) => ({ slug, title: ['Conditions d’utilisation', 'Politique de confidentialité', 'Mentions légales'][i],
  version: 'Recette visuelle 2026-10', hasFile: true, file_name: `${slug}-recette.pdf`, file_url: `/api/legal/${slug}/file`, mime_type: 'application/pdf' }));
const settings = { contact_email: 'support@example.test', contact_phone: '+2250700000100', social_facebook: 'https://www.facebook.com/', commission_pct: '20' };
const operations = { company_name: 'Exploitant de recette visuelle — données fictives', registration_number: 'RECETTE-LOCALE', company_address: 'Adresse fictive de recette, Abidjan',
  privacy_email: 'donnees@example.test', hosting_location: 'Environnement local de test', retention_policy: 'Texte de recette visuelle. Les durées réelles seront publiées par l’exploitant.',
  cancellation_policy: 'Conditions de recette uniquement. Consultez les conditions publiées avant une réservation réelle.',
  refund_policy: 'Les demandes sont examinées et les opérations confirmées après vérification du prestataire.', payout_policy: 'Les montants disponibles sont distincts des demandes approuvées et des versements effectués.' };
const capabilities = { demo: false, serviceOpen: true, individualCourses: true, needs: true, courseOperations: true,
  groups: false, subscriptions: false, messaging: false, onlineCourses: false, integratedVideo: false,
  agenda: true, reviews: true, progress: true, referrals: false, payouts: true, accountDeletion: true, accountExport: true };

function session(user) {
  const payload = Buffer.from(JSON.stringify({ sub: String(user.id), userId: user.id, role: user.role, v: 2, auth_time: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const unsigned = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${payload}`;
  const token = `${unsigned}.${createHmac('sha256', 'visual-fixture-only-not-a-production-secret').update(unsigned).digest('base64url')}`;
  sessions.set(token, user);
  return { token, user, verified: true, demo: false };
}
function challenge(user, channel = 'whatsapp') {
  const challengeId = randomUUID(); challenges.set(challengeId, user);
  return { otpRequired: true, challengeId, channel, destination: user.phone, expiresInMinutes: 10, sent: true, demo: false };
}
async function body(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw new Error('Corps trop volumineux.'); }
  if (!data || !String(req.headers['content-type'] || '').includes('application/json')) return {};
  return JSON.parse(data);
}
function forUser(course, user) { return { ...course, participant_role: user?.role === 'teacher' ? 'teacher' : 'parent' }; }

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) { res.writeHead(403); res.end(); return; }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-MPP-Visual-Fixture', 'local-only');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const send = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url, 'http://localhost'); const path = url.pathname; const method = req.method;
    const user = sessions.get(String(req.headers.authorization || '').replace(/^Bearer\s+/, ''));
    const empty = user?.scenario === 'empty';
    if (path === '/health') return send({ status: 'ok', fixture: true, external: false });
    if (path === '/ready') return send({ status: 'visual-fixture-only', ready: false }, 503);
    if (path === '/api/capabilities') return send(capabilities);
    if (path === '/api/auth/otp-channels') return send({ demo: false, whatsapp: true, email: false, defaultChannel: 'whatsapp', codeLength: 6, ttlMinutes: 10, consentVersion });
    if (path === '/api/auth/login' || path === '/api/auth/signup') {
      const data = await body(req); const phone = String(data.phone || '').replace(/\D/g, '').slice(-10); const found = users[phone];
      if (!found) return send({ error: 'visual_fixture_account_required', message: 'Utilisez un compte de recette documenté.' }, 400);
      return send(challenge(found, data.channel), 202);
    }
    if (path === '/api/auth/verify-otp') {
      const data = await body(req); const found = challenges.get(data.challengeId);
      if (!found || data.code !== '123456') return send({ error: 'invalid_otp', message: 'Le code de recette attendu est 123456.' }, 400);
      challenges.delete(data.challengeId); return send(session(found));
    }
    if (path === '/api/auth/request-otp') {
      const data = await body(req); const found = challenges.get(data.challengeId);
      if (!found) return send({ error: 'invalid_challenge' }, 400);
      challenges.delete(data.challengeId); return send(challenge(found));
    }
    if (path === '/api/me') return user ? send(user) : send({ error: 'unauthorized' }, 401);
    if (user?.scenario === 'error' && ['/api/teachers', '/api/courses', '/api/progress', '/api/notifications'].includes(path)) {
      return send({ error: 'visual_service_unavailable', message: 'Le service est momentanément indisponible. Réessayez dans un instant.' }, 503);
    }
    if (path === '/api/subjects') return send(subjects);
    if (path === '/api/levels') return send(levels);
    if (path === '/api/programs') return send(programs);
    if (path === '/api/teachers') return send(empty ? [] : teachers);
    if (/^\/api\/teachers\/\d+$/.test(path)) return send(teachers.find(t => t.id === Number(path.split('/').pop())) || teachers[0]);
    if (path === '/api/settings') return send(settings);
    if (path === '/api/service-information') return send(operations);
    if (path === '/api/legal') return send(legal);
    if (/^\/api\/legal\/[^/]+\/file$/.test(path)) {
      const stream = 'BT /F1 14 Tf 20 150 Td (Document de recette visuelle uniquement.) Tj ET';
      const objects = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Kids[3 0 R]/Count 1>>',
        '<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
        `<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'];
      let pdf = '%PDF-1.4\n'; const offsets = [0];
      objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
      const xref = Buffer.byteLength(pdf);
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
      pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
      res.writeHead(200, { 'Content-Type': 'application/pdf' }); res.end(pdf); return;
    }
    if (path === '/api/resources') return send([]);
    if (path === '/api/needs/public' && method === 'POST') { await body(req); return send({ reference: 'VISUAL-DEMANDE', id: 701, status: 'new' }, 201); }
    if (path === '/api/teacher-applications' && method === 'POST') { await body(req); return send({ id: 801, status: 'pending', reference: 'VISUAL-CANDIDATURE' }, 201); }
    if (!user) return send({ error: 'unauthorized' }, 401);
    if (path === '/api/courses') return send(empty ? [] : courses.filter(c => !url.searchParams.get('status') || c.status === url.searchParams.get('status')).map(c => forUser(c, user)));
    if (/^\/api\/courses\/\d+$/.test(path)) {
      const course = forUser(courses.find(c => c.id === Number(path.split('/').pop())) || courses[0], user);
      return send({ course, contacts: { parentPhone: users['0700000101'].phone, teacherPhone: users['0700000102'].phone }, finance,
        scheduleRequests: [], reports: [], events: [{ id: 1, type: 'details_updated', actorRole: 'parent', createdAt: '2026-10-24T10:00:00Z' }],
        permissions: ['edit_details', 'schedule', 'cancel'] });
    }
    if (path === '/api/children') return send(empty ? [] : [{ id: 601, name: 'Élève de recette', level: '3ème', gender: 'other', school: 'Établissement de recette', program: 'Programme ivoirien' }]);
    if (path === '/api/needs') return send([]);
    if (path === '/api/account/consent') return send({ version: consentVersion, accepted: true, documents: legal });
    if (path === '/api/account/preferences') return send({ notificationsWhatsapp: true, notificationsEmail: false, whatsappAvailable: true, emailAvailable: false });
    if (path === '/api/account/deletion-request') return send({ request: null, blockers: empty ? [] : [{ code: 'open_courses', message: 'Un cours reste à clôturer.', count: 1 }] });
    if (path === '/api/account/export') return send({ user, fixture: true, courses: empty ? [] : courses });
    if (path === '/api/notifications/unread') return send({ count: empty ? 0 : 1 });
    if (path === '/api/notifications/read') return send({ ok: true });
    if (path === '/api/notifications') return send(empty ? [] : [{ icon: 'calendar', accent: 'green', text: 'Votre prochain cours de mathématiques est confirmé. Retrouvez les détails dans votre agenda.', time_ago: 'Il y a 2 h', unread: true, section: 'Aujourd’hui' }]);
    if (path === '/api/progress') return send({ student: '', average: '', trend: '', goal: '', subjects: [], entries: empty ? [] : [{ courseId: 503, subject: 'Mathématiques', teacherName: teachers[0].name, studentName: 'Élève de recette', completedAt: '2026-10-19T17:30:00Z', summary: 'Les fonctions affines ont été revues. La lecture du graphique est maîtrisée ; les exercices de mise en équation seront poursuivis à la prochaine séance.' }] });
    if (path === '/api/teacher/dashboard') return send({ name: teachers[0].name, revenue: 12000, trend: '', stats: [], pendingRequests: 1, negotiable: false, needsConfirmed: true, profileCompletion: { percent: 100, complete: true, missing: [] } });
    if (path === '/api/teacher/profile') return send({ name: teachers[0].name, subjects: teachers[0].subjects, email: 'professeur@example.test', location: teachers[0].location, pricePerHour: 5000, experience: '6 ans', bio: teachers[0].bio, levels: teachers[0].levels, formats: ['home'], programs: ['Programme ivoirien'], negotiable: false, hasIdCard: true, hasDiploma: true, hasPhoto: false, completion: { percent: 100, complete: true, missing: [] } });
    if (path === '/api/teacher/earnings') return send({ total: 12000, trend: '', weeks: [], stats: [], payouts: [], summary, payoutRequests: [{ id: 901, amount: 2000, status: 'approved', provider: 'wave', providerReference: null, reason: 'Demande de recette visuelle', createdAt: '2026-10-24T10:00:00Z', beneficiaryPhone: users['0700000102'].phone }] });
    if (path === '/api/teacher/requests') return send([{ courseId: 502, needId: null, initials: 'AK', accent: 'green', name: 'Aïcha Koné', ago: 'Il y a 1 h', price: 4500, student: 'Élève de recette', subject: 'Français · CM2', slot: 'Samedi à 10:00', format: 'home', netHourly: 3600, frequency: 'Une séance', duration: '1 h', startDate: '2099-10-31T10:00:00Z', isOpportunity: false }]);
    if (path === '/api/admin/dashboard') return send({ users: 3, teachers: 2, courses: 3, revenue: 7500, stats: [], recentCourses: [], recentPayments: [] });
    if (path === '/api/admin/teacher-applications' || path === '/api/admin/needs') return send([]);
    if (path === '/api/admin/teachers') return send(teachers);
    if (path === '/api/admin/courses') return send({ courses, nextBefore: null });
    if (path === '/api/admin/finance') return send({ courses: courses.map(course => ({ course, finance })), nextBefore: null });
    if (path === '/api/admin/finance/operations') return send({ operations: [], nextBefore: null });
    if (path === '/api/admin/account-deletions' || path === '/api/admin/account-deletion-requests') return send({ requests: [] });
    if (path === '/api/admin/operations-settings') return send(operations);
    if (path === '/api/admin/production-readiness') return send({ ready: false, launchEnabled: false, environment: 'visual-fixture', revision: '0'.repeat(40), checks: [{ key: 'provider_e2e', title: 'Recette des prestataires', kind: 'operator_evidence', ok: false, detail: 'Non réalisée par ce serveur local de captures.' }], validations: [] });
    if (path === '/api/admin/production-data-audit') return send({ origin: 'visual-fixture', demoAccountIds: [1001, 1002, 1003], demoTeacherIds: [101, 102], demoReviewIds: [], unverifiedPaidCourses: 0 });
    return send({ error: 'visual_fixture_route_missing', message: `Route de recette non prévue : ${method} ${path}` }, 404);
  } catch (error) { send({ error: 'visual_fixture_error', message: error.message }, 400); }
});
server.listen(port, '127.0.0.1', () => process.stdout.write(`API de captures locale : http://127.0.0.1:${port} — données fictives, aucun prestataire\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
