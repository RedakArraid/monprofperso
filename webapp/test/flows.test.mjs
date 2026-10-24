import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  canPayCourse, isConfirmedPayment, isOtpChallenge, needFields, normalizeCiPhone, paymentStep,
} from "../src/lib/flows.ts";
import { offerPopupContent } from "../src/lib/map-popup.ts";
import { readPaymentSession, savePaymentSession } from "../src/lib/payment-session.ts";
import { courseDate, courseEventLabel, finishOperation, loginDestination, operationKey, reviewedRating, safeHttpsUrl, scheduleIso } from "../src/lib/operations.ts";
import { distanceKmFromHome, resolveCoords } from "../src/lib/geography.ts";

test("OTP: une réponse 202 valide est un challenge, jamais une session", () => {
  const challenge = {
    otpRequired: true, challengeId: "opaque-single-use-id", channel: "whatsapp",
    destination: "+22507••••••00", expiresInMinutes: 5, sent: true, demo: false,
  };
  assert.equal(isOtpChallenge(challenge), true);
  assert.equal(isOtpChallenge({ ...challenge, channel: "email", destination: "r•••@example.com" }), true);
  for (const invalid of [
    null, {}, { token: "session", user: { id: 1 } },
    { ...challenge, challengeId: "" }, { ...challenge, sent: false },
    { ...challenge, channel: "sms" }, { ...challenge, expiresInMinutes: 0 },
    { ...challenge, expiresInMinutes: Number.NaN }, { ...challenge, demo: true },
  ]) assert.equal(isOtpChallenge(invalid), false);
});

test("Paiement: pending, OTP, succès et échec restent des états distincts", () => {
  for (const status of ["pending", "otp_required", "success", "failed"]) {
    assert.equal(paymentStep({ paymentId: 42, status }), status);
  }
  for (const invalid of [
    null, {}, { paymentId: 42, needsOtp: true }, { paymentId: 42, status: "pay_offline" },
    { paymentId: 0, status: "success" }, { paymentId: "42", status: "success" },
  ]) assert.throws(() => paymentStep(invalid), /statut du paiement/);
});

test("Confirmation: le paiement et le cours doivent tous deux être confirmés par l’API", () => {
  assert.equal(isConfirmedPayment({ status: "success", paid: true }), true);
  for (const result of [
    null, { status: "success" }, { status: "success", paid: false },
    { status: "pending", paid: true }, { status: "otp_required", paid: true },
    { status: "failed", paid: true }, { status: "success", paid: "true" },
  ]) assert.equal(isConfirmedPayment(result), false);
});

test("Le paiement reste inaccessible avant acceptation et après paiement ou annulation", () => {
  const course = { accepted: true, participant_role: "parent", status: "upcoming", payment_status: "pending", lifecycle_status: "scheduled", starts_at: "2099-01-01T12:00:00Z" };
  assert.equal(canPayCourse(course), true);
  for (const invalid of [
    null, undefined, {}, { ...course, accepted: false }, { ...course, accepted: undefined },
    { ...course, participant_role: "teacher" }, { ...course, participant_role: "admin" }, { ...course, participant_role: undefined },
    { ...course, status: "cancelled" }, { ...course, status: "completed" },
    { ...course, payment_status: "paid" }, { ...course, payment_status: undefined },
    { ...course, payment_status: "refunded" }, { ...course, payment_status: "partially_refunded" },
    { ...course, payment_status: "failed" }, { ...course, payment_status: "uncollected" },
    { ...course, lifecycle_status: "awaiting_schedule" }, { ...course, starts_at: null },
    { ...course, lifecycle_status: "disputed" }, { ...course, starts_at: "2000-01-01T12:00:00Z" },
    { ...course, starts_at: "not-a-date" },
  ]) assert.equal(canPayCourse(invalid), false);
});

test("Un numéro ivoirien local conserve ses dix chiffres, y compris son zéro initial", () => {
  for (const input of ["07 12 34 56 78", "0712345678", "2250712345678", "+225 (07) 12-34-56-78"]) {
    assert.equal(normalizeCiPhone(input), "+2250712345678");
  }
  assert.equal(normalizeCiPhone("+33123456789"), "+33123456789");
  assert.equal(normalizeCiPhone(""), "");
});

test("Un besoin pour soi omet childId et transmet les précisions dans description", () => {
  const form = new FormData();
  form.set("childId", "");
  form.set("subject", " Mathématiques ");
  form.set("level", " 3e ");
  form.set("description", " Revoir les fractions ");
  const payload = needFields(form);
  assert.equal(payload.childId, undefined);
  assert.equal(payload.description, "Revoir les fractions");
  assert.equal(payload.subject, "Mathématiques");
  assert.equal(payload.level, "3e");
  assert.equal(payload.format, "home");
  assert.equal("notes" in payload, false);
  assert.equal("childId" in JSON.parse(JSON.stringify(payload)), false);
  form.set("childId", "7");
  assert.equal(needFields(form).childId, 7);
});

test("Carte: les champs HTML malveillants restent du texte dans un nœud DOM", () => {
  class SafeNode {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.textContent = ""; }
    set innerHTML(_value) { throw new Error("HTML injection sink"); }
    appendChild(child) { this.children.push(child); return child; }
  }
  const doc = { createElement: (name) => new SafeNode(name) };
  const attack = '<img src=x onerror="alert(document.cookie)">';
  const popup = offerPopupContent({ label: attack, subject: "<script>bad()</script>", priceLabel: "<iframe src=x>" }, doc);
  assert.equal(typeof popup, "object");
  assert.equal(popup.children.find((node) => node.tagName === "strong").textContent, attack);
  const contents = popup.children.map((node) => node.textContent);
  assert.ok(contents.includes("<script>bad()</script>"));
  assert.ok(contents.includes("<iframe src=x>"));
  assert.equal(popup.children.some((node) => ["img", "script", "iframe"].includes(node.tagName)), false);
});

const storage = new Map();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) },
});
beforeEach(() => storage.clear());

test("Une reprise de paiement est limitée au compte qui l’a initiée", () => {
  const session = { userId: 5, courseId: 12, amount: 9000, paymentId: 42 };
  savePaymentSession(session);
  assert.deepEqual(readPaymentSession(5), session);
  assert.equal(readPaymentSession(6), null);
  assert.equal(readPaymentSession(undefined), null);
});

test("Les données de reprise manquantes ou corrompues sont rejetées", () => {
  for (const value of [
    "not-json", "null", JSON.stringify({ courseId: 12, amount: 9000 }),
    JSON.stringify({ userId: 5, courseId: 0, amount: 9000 }),
    JSON.stringify({ userId: 5, courseId: 12, amount: -1 }),
    JSON.stringify({ userId: 5, courseId: 12, amount: 9000, paymentId: "42" }),
  ]) {
    sessionStorage.setItem("mpp_payment_session", value);
    assert.equal(readPaymentSession(5), null);
  }
});

test("Un report utilise l’heure ivoirienne sans dépendre du fuseau du navigateur", () => {
  assert.equal(scheduleIso("2099-12-31", "16:30"), "2099-12-31T16:30:00.000Z");
  for (const [date, time] of [["2099-02-30", "12:00"], ["2099-01-01", "25:00"], ["2099-13-01", "12:00"], ["", "12:00"], ["2000-01-01", "12:00"]]) {
    assert.throws(() => scheduleIso(date, time));
  }
  assert.equal(courseDate(null), "À planifier");
  assert.equal(courseDate("invalid"), "Date indisponible");
});

test("Les liens de cours externes doivent être HTTPS et sans identifiants", () => {
  assert.equal(safeHttpsUrl("https://meet.example.org/session-42"), "https://meet.example.org/session-42");
  for (const url of [null, "", "javascript:alert(1)", "data:text/html,x", "http://example.org", "https://user:secret@example.org", "//example.org", "/meeting"]) {
    assert.equal(safeHttpsUrl(url), null);
  }
});

test("Une demande financière incertaine conserve sa clé à la relance, dans le bon compte", () => {
  const payload = { amount: 5000, provider: "orange" };
  const key = operationKey("payout_4", payload);
  assert.equal(operationKey("payout_4", payload), key);
  assert.notEqual(operationKey("payout_5", payload), key);
  assert.notEqual(operationKey("payout_4", { ...payload, amount: 6000 }), key);
  const completedKey = operationKey("refund_4_16", { amount: 2000, reason: "Cours annulé" });
  finishOperation("refund_4_16");
  assert.notEqual(operationKey("refund_4_16", { amount: 2000, reason: "Cours annulé" }), completedKey);
});

test("Les notes affichées nécessitent de véritables avis", () => {
  assert.equal(reviewedRating(5, 0), "Pas encore d’avis");
  assert.equal(reviewedRating(undefined, 2), "Pas encore d’avis");
  assert.equal(reviewedRating(0, 0), "Pas encore d’avis");
  assert.match(reviewedRating(4.5, 2), /4,5.*2 avis/);
});

test("Une localisation inconnue ne fabrique ni point de carte ni distance", () => {
  assert.equal(resolveCoords("Adresse à confirmer"), null);
  assert.equal(resolveCoords("En ligne"), null);
  assert.equal(resolveCoords(null, 120, 300), null);
  assert.equal(distanceKmFromHome("Cocody", null), null);
  assert.equal(distanceKmFromHome("Adresse inconnue", [5.36, -4]), null);
  assert.deepEqual(resolveCoords(null, 5.31, -4.05), [5.31, -4.05]);
  assert.notEqual(resolveCoords("Bouaké"), null);
});

test("Le retour OTP est limité aux parcours internes autorisés", () => {
  assert.equal(loginDestination("suppression"), "/espace/#/parametres?section=suppression");
  assert.equal(loginDestination("candidature"), "/devenir-prof.html#suivi");
  for (const next of [null, "https://evil.example", "//evil.example", "javascript:alert(1)", "/admin/"]) assert.equal(loginDestination(next), null);
});

test("L’historique utilisateur décrit les événements sans exposer des noms internes inconnus", () => {
  assert.equal(courseEventLabel("payment_verified"), "Paiement vérifié");
  assert.equal(courseEventLabel("schedule_proposed"), "Créneau proposé");
  assert.equal(courseEventLabel("private_backend_diagnostic"), "Mise à jour du suivi");
});
