/* Formulaire "Décrivez votre besoin" — devis personnalisé, sans compte */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var FALLBACK = {
    subjects: ["Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo", "Musique", "Espagnol", "Allemand"],
    levels: ["Primaire", "Collège", "Lycée", "Professionnel", "Supérieur", "Université"],
  };

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

  function normalizePhone(raw) {
    var p = String(raw || "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
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

  async function loadCatalog() {
    var subjects = FALLBACK.subjects.slice();
    var levels = FALLBACK.levels.slice();
    try {
      var res = await Promise.all([
        fetch(API_BASE + "/api/subjects").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/levels").then(function (r) { return r.ok ? r.json() : []; }),
      ]);
      if (res[0] && res[0].length) subjects = res[0].map(function (s) { return s.name; });
      if (res[1] && res[1].length) levels = res[1].map(function (l) { return l.name; });
    } catch (_) { /* repli local */ }
    fillSelect(subjectSelect, subjects);
    fillSelect(levelSelect, levels);
  }

  function toggleLocation() {
    var format = (document.querySelector('input[name="besoinFormat"]:checked') || {}).value;
    if (locationWrap) locationWrap.hidden = format === "online";
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
      };
      var res = await fetch(API_BASE + "/api/needs/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.message || data.error || "Erreur " + res.status);

      if (card) card.hidden = true;
      if (successText && data.reference) {
        successText.textContent = "Merci ! Référence " + data.reference + ". Notre équipe vous contacte sous 24h avec un tarif personnalisé.";
      }
      if (successEl) successEl.hidden = false;
    } catch (ex) {
      showErr(ex.message || "Envoi impossible");
      submitBtn.disabled = false;
      submitBtn.textContent = "Recevoir un devis";
    }
  });

  toggleLocation();
  loadCatalog();
})();
