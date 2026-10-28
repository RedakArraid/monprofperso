import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function formHarness(kind, initialVersion = "cgu-1|confidentialite-1") {
  const elements = new Map(), created = [], writes = [];
  let version = initialVersion, changeOnSubmit = true, focusedElement = null;
  function element(id = "") {
    const attributes = new Map(), classes = new Set();
    return { id, value: "", textContent: "", checked: false, disabled: false, hidden: false, children: [], dataset: {}, handlers: {},
      classList: {
        contains(name) { return classes.has(name); },
        toggle(name, enabled = !classes.has(name)) { if (enabled) classes.add(name); else classes.delete(name); return enabled; },
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      focus() { focusedElement = this; },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      appendChild(child) { child.parent = this; this.children.push(child); if (!this.value && child.value) this.value = child.value; },
      querySelector(tag) { return this.children.find(child => child.tag === tag) || null; },
      querySelectorAll(selector) {
        // IDs in this small harness stand in for the fields of the single form.
        if (selector === "[aria-invalid]") return [...elements.values(), ...created].filter(node => node.getAttribute("aria-invalid") !== null);
        return this.children.filter(child => child.tag === selector);
      },
      closest() { return this.parent; },
    };
  }
  function byId(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); }
  const isNeed = kind === "besoin", formId = isNeed ? "besoinForm" : "candidatureForm";
  const buttonId = isNeed ? "besoinSubmitBtn" : "submitBtn", consentId = isNeed ? "besoinConsent" : "consent";
  byId(isNeed ? "besoinName" : "fullName").value = "Parent test";
  byId(isNeed ? "besoinPhone" : "phone").value = "0700000000";
  byId("besoinLocation").value = "Cocody";
  const format = element(); format.value = "home";
  const context = {
    location: { hostname: "test.local", origin: "https://test.local" },
    window: { scrollTo() {}, matchMedia() { return { matches: false }; } },
    document: {
      getElementById: byId,
      createElement(tag) { const node = element(); node.tag = tag; created.push(node); return node; },
      querySelector(selector) {
        if (selector === "[data-next]") return byId("next");
        if (selector.includes('name="besoinFormat"')) return format;
        return null;
      },
      querySelectorAll(selector) {
        const name = selector.match(/^input\[name="(subjects|levels)"\]:checked$/)?.[1];
        return name ? created.filter(node => node.name === name && node.checked) : [];
      },
    },
    fetch: async (url, options = {}) => {
      if (options.method === "POST") {
        writes.push(JSON.parse(options.body));
        if (changeOnSubmit) {
          version = "cgu-2|confidentialite-2"; changeOnSubmit = false;
          return { status: 409, ok: false, json: async () => ({ error: "consent_version_changed" }) };
        }
        return { status: 201, ok: true, json: async () => ({ reference: "fixture" }) };
      }
      const data = url.endsWith("otp-channels") ? { consentVersion: version }
        : url.endsWith("capabilities") ? { needs: true }
        : [{ name: url.endsWith("subjects") ? "Maths" : "Collège" }];
      return { status: 200, ok: true, json: async () => data };
    },
  };
  vm.createContext(context);
  vm.runInContext(readFileSync(new URL(`../../web/js/${kind}.js`, import.meta.url), "utf8"), context);
  return { byId, writes, button: byId(buttonId), checkbox: byId(consentId), focused: () => focusedElement,
    ready: () => new Promise(resolve => setImmediate(resolve)),
    submit: () => byId(formId).handlers.submit({ preventDefault() {} }),
  };
}

for (const kind of ["besoin", "devenir-prof"]) {
  test(`${kind} : le changement de version exige une nouvelle acceptation sans renvoyer le formulaire`, async () => {
    const form = formHarness(kind); await form.ready();
    assert.equal(form.button.disabled, false);
    form.checkbox.checked = true;
    await form.submit();
    assert.equal(form.writes.length, 1);
    assert.equal(form.writes[0].consentVersion, "cgu-1|confidentialite-1");
    assert.equal(form.checkbox.checked, false);
    assert.equal(form.button.disabled, false);
    assert.equal(form.focused(), form.byId(kind === "besoin" ? "besoinErr" : "formErrStep1"), "le changement de documents est annoncé avec le focus sur l’erreur");
    await form.submit();
    assert.equal(form.writes.length, 1, "aucune acceptation implicite de la nouvelle version");
    assert.equal(form.focused(), form.checkbox, "le consentement manquant est accessible au clavier");
    assert.equal(form.checkbox.getAttribute("aria-invalid"), "true");
    form.checkbox.checked = true;
    await form.submit();
    assert.equal(form.writes.length, 2);
    assert.equal(form.writes[1].consentVersion, "cgu-2|confidentialite-2");
    assert.equal(form.checkbox.getAttribute("aria-invalid"), null);
    assert.equal(form.focused(), form.byId(kind === "besoin" ? "besoinSuccess" : "formSuccess"));
  });

  test(`${kind} : une version indisponible bloque l'envoi`, async () => {
    const form = formHarness(kind, ""); await form.ready();
    assert.equal(form.button.disabled, true);
    form.checkbox.checked = true;
    await form.submit();
    assert.equal(form.writes.length, 0);
  });
}
