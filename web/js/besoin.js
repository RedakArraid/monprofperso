/* Formulaire "Décrivez votre besoin" — devis personnalisé, sans compte */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var form = document.getElementById("besoinForm");
  if (!form) return;

  var card = document.getElementById("besoinCard");
  var successEl = document.getElementById("besoinSuccess");
  var successText = document.getElementById("besoinSuccessText");
  var errEl = document.getElementById("besoinErr");
  var locationWrap = document.getElementById("besoinLocationWrap");
  var subjectSelect = document.getElementById("besoinSubject");
  var levelSelect = document.getElementById("besoinLevel");
  var submitBtn = document.getElementById("besoinSubmitBtn");
  var consentInput = document.getElementById("besoinConsent");
  var consentVersion = "";

  async function loadConsentVersion() {
    consentVersion = ""; consentInput.checked = false; consentInput.disabled = true;
    var response = await fetch(API_BASE + "/api/auth/otp-channels", { cache: "no-store" });
    var data = response.ok ? await response.json() : null;
    if (!data || typeof data.consentVersion !== "string" || !data.consentVersion.trim()) {
      throw new Error("La version des documents est indisponible. Actualisez la page avant d’envoyer votre demande.");
    }
    consentVersion = data.consentVersion;
    consentInput.disabled = false;
    document.getElementById("besoinConsentVersion").textContent = "Version présentée : " + consentVersion;
  }

  function normalizePhone(raw) {
    var p = String(raw || "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p;
    else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
    return p;
  }

  function showErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
  }

  function fillSelect(select, items) {
    if (!select) return;
    select.innerHTML = "";
    items.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = typeof item === "string" ? item : item.name;
      opt.textContent = opt.value;
      select.appendChild(opt);
    });
  }

  var ready = false;
  async function loadCatalog() {
    submitBtn.disabled = true;
    try {
      var results = await Promise.all(["/api/subjects", "/api/levels", "/api/capabilities"].map(async function (path) {
        var response = await fetch(API_BASE + path, { cache: "no-store" });
        if (!response.ok) throw new Error("Le formulaire est temporairement indisponible. Actualisez la page pour réessayer.");
        return response.json();
      }).concat([loadConsentVersion()]));
      if (!results[2].needs || !results[0].length || !results[1].length) throw new Error("Le formulaire de demande de cours n’est pas disponible actuellement.");
      fillSelect(subjectSelect, results[0]); fillSelect(levelSelect, results[1]);
      ready = true; submitBtn.disabled = false;
    } catch (error) { showErr(error.message || "Le catalogue n’a pas pu être chargé. Réessayez plus tard."); }
  }

  function toggleLocation() {
    var format = (document.querySelector('input[name="besoinFormat"]:checked') || {}).value;
    if (locationWrap) locationWrap.hidden = format === "online";
    document.getElementById("besoinLocation").required = format !== "online";
  }
  document.querySelectorAll('input[name="besoinFormat"]').forEach(function (r) {
    r.addEventListener("change", toggleLocation);
  });

  document.querySelectorAll("[data-legal]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.stopPropagation(); });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");
    if (!ready || !consentVersion || submitBtn.disabled) return;

    var name = document.getElementById("besoinName").value.trim();
    var phone = normalizePhone(document.getElementById("besoinPhone").value);
    var subject = subjectSelect.value;
    var level = levelSelect.value;
    var format = (document.querySelector('input[name="besoinFormat"]:checked') || {}).value || "home";
    var location = document.getElementById("besoinLocation").value.trim();
    var description = document.getElementById("besoinDescription").value.trim();
    var consent = document.getElementById("besoinConsent").checked;

    if (!name) return showErr("Indiquez votre nom complet.");
    if (!phone) return showErr("Indiquez votre numéro.");
    if (!subject) return showErr("Sélectionnez une matière.");
    if (!level) return showErr("Sélectionnez un niveau.");
    if (format === "home" && !location) return showErr("Indiquez le quartier ou la commune du cours.");
    if (!consent) return showErr("Acceptez les conditions d'utilisation.");

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";
    try {
      var body = {
        parentName: name,
        parentPhone: phone,
        subject: subject,
        level: level,
        format: format,
        location: format === "home" ? (location || undefined) : undefined,
        description: description || undefined,
        consent: true,
        consentVersion: consentVersion,
      };
      var res = await fetch(API_BASE + "/api/needs/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 409 && data.error === "consent_version_changed") {
        await loadConsentVersion();
        throw new Error("Les documents ont changé. Consultez-les puis cochez à nouveau votre acceptation avant d’envoyer votre demande.");
      }
      if (!res.ok) throw new Error(data.message || data.error || "Erreur " + res.status);

      if (card) card.hidden = true;
      if (successText && data.reference) {
        successText.textContent = "Merci ! Référence " + data.reference + ". Votre demande a été enregistrée. Notre équipe vous contactera après son examen.";
      }
      if (successEl) successEl.hidden = false;
    } catch (ex) {
      showErr(ex.message || "Envoi impossible");
      submitBtn.disabled = !ready || !consentVersion;
      submitBtn.textContent = "Recevoir un devis";
    }
  });

  toggleLocation();
  loadCatalog();
})();
