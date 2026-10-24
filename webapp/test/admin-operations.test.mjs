import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../../web/admin/js/operations.js", import.meta.url), "utf8");

function adminHarness() {
  const handlers = new Map();
  const fieldset = { disabled: false };
  const errors = { hidden: true, textContent: "", children: [], appendChild(node) { this.children.push(node); } };
  const form = { fields: new Map([["amount", "5000"]]), addEventListener(name, handler) { handlers.set(name, handler); } };
  const storage = new Map();
  let closed = 0, reauthenticated = 0;
  const toasts = [];
  const context = {
    crypto: globalThis.crypto,
    adminUserId: 7,
    sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    fcfa: (value) => Number(value).toLocaleString("fr-FR"),
    esc: (value) => String(value ?? ""),
    modal(_title, _html, mount) { mount({}, () => { closed++; }); },
    $(selector) { return selector === "form" ? form : selector === "fieldset" ? fieldset : errors; },
    FormData: class { constructor(node) { this.fields = node.fields; } get(key) { return this.fields.get(key); } },
    document: { createElement() { return { handlers: new Map(), addEventListener(name, handler) { this.handlers.set(name, handler); } }; } },
    reauthenticateAdmin() { reauthenticated++; },
    toast(message) { toasts.push(message); },
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { context, form, fieldset, errors, toasts, get closed() { return closed; }, get reauthenticated() { return reauthenticated; }, submit: () => handlers.get("submit")({ preventDefault() {} }) };
}

test("Admin : une action financière en cours ne peut pas être soumise deux fois", async () => {
  const harness = adminHarness(); let calls = 0; let release;
  const pending = new Promise((resolve) => { release = resolve; });
  harness.context.opForm("Versement", "", "", "Confirmer", async (fd) => { calls++; assert.equal(fd.get("amount"), "5000"); await pending; return { id: 1 }; });
  const first = harness.submit();
  await harness.submit();
  assert.equal(calls, 1); assert.equal(harness.fieldset.disabled, true); assert.equal(harness.closed, 0);
  release(); await first;
  assert.equal(harness.closed, 1); assert.equal(harness.fieldset.disabled, false);
});

test("Admin : un refus API reste visible et ne ferme pas le formulaire", async () => {
  const harness = adminHarness();
  harness.context.opForm("Remboursement", "", "", "Confirmer", async () => { throw Object.assign(new Error("Montant non couvert"), { data: { blockers: [{ message: "Versement réservé" }] } }); });
  await harness.submit();
  assert.equal(harness.closed, 0); assert.equal(harness.errors.hidden, false);
  assert.match(harness.errors.textContent, /Montant non couvert.*Versement réservé/);
  assert.equal(harness.fieldset.disabled, false);
});

test("Admin : la reconnexion demandée est explicite, sans rejouer automatiquement l’action", async () => {
  const harness = adminHarness(); let writes = 0;
  harness.context.opForm("Suppression", "", "", "Confirmer", async () => { writes++; throw Object.assign(new Error("Reconnectez-vous"), { data: { error: "reauthentication_required" } }); });
  await harness.submit();
  assert.equal(harness.reauthenticated, 0); assert.equal(harness.errors.children.length, 1);
  harness.errors.children[0].handlers.get("click")();
  assert.equal(harness.reauthenticated, 1); assert.equal(writes, 1);
});

test("Admin : un échec de rechargement après succès ne transforme pas l’écriture en échec", async () => {
  const harness = adminHarness();
  harness.context.opForm("Règlement", "", "", "Confirmer", async () => ({ ok: true }), async () => { throw new Error("Réseau indisponible"); });
  await harness.submit();
  assert.equal(harness.closed, 1); assert.equal(harness.toasts.length, 1);
  assert.match(harness.toasts[0], /action est enregistrée.*Actualisez avant de recommencer/);
});

test("Admin : l’action reste protégée jusqu’à la fin du rafraîchissement", async () => {
  const harness = adminHarness(); let release; let writes = 0;
  const refresh = new Promise(resolve => { release = resolve; });
  harness.context.opForm("Règlement", "", "", "Confirmer", async () => { writes++; return { ok: true }; }, () => refresh);
  const pending = harness.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.closed, 0); assert.equal(harness.fieldset.disabled, true);
  await harness.submit(); assert.equal(writes, 1);
  release(); await pending;
  assert.equal(harness.closed, 1); assert.equal(harness.fieldset.disabled, false);
});

test("Admin : les clés de reprise sont isolées par compte et par opération", () => {
  const harness = adminHarness(); const body = { amount: 5000, reason: "Annulation" };
  const first = harness.context.opKey("refund_5", body);
  assert.equal(harness.context.opKey("refund_5", body), first);
  assert.notEqual(harness.context.opKey("refund_6", body), first);
  harness.context.adminUserId = 8;
  assert.notEqual(harness.context.opKey("refund_5", body), first);
});
