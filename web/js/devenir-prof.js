/* Formulaire candidature professeur — 2 étapes (profil + consentement) */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var OTHER = "Autre";

  var FALLBACK = {
    subjects: ["Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo", "Musique", "Espagnol", "Allemand"],
    levels: ["Primaire", "Collège", "Lycée", "Professionnel", "Supérieur", "Université"],
  };

  var form = document.getElementById("candidatureForm");
  var formCard = document.getElementById("formCard");
  var stepEls = document.querySelectorAll(".form-step");
  var progressBars = document.querySelectorAll(".progress-bar span");
  var stepLabel = document.getElementById("stepLabel");
  var errStep0 = document.getElementById("formErrStep0");
  var errStep1 = document.getElementById("formErrStep1");
  var successEl = document.getElementById("formSuccess");
  var step = 0;

  function normalizePhone(raw) {
    var p = String(raw || "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
    else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
    return p;
  }

  function showErr(msg, which) {
    if (errStep0) errStep0.hidden = true;
    if (errStep1) errStep1.hidden = true;
    var target = which === 0 ? errStep0 : errStep1;
    if (target) { target.textContent = msg || ""; target.hidden = !msg; }
  }

  function finalizeSubjects(list) {
    var out = list.filter(function (s) { return s !== OTHER; });
    out.push(OTHER);
    return out;
  }

  function finalizeLevels(list) {
    var out = list.filter(function (s) { return s !== OTHER && s !== "Professionnel"; });
    var idx = out.indexOf("Lycée");
    if (idx >= 0) out.splice(idx + 1, 0, "Professionnel");
    else if (out.indexOf("Professionnel") < 0) out.push("Professionnel");
    out.push(OTHER);
    return out;
  }

  function updateOtherFields() {
    var subWrap = document.getElementById("otherSubjectWrap");
    var lvlWrap = document.getElementById("otherLevelWrap");
    if (subWrap) subWrap.hidden = !isChecked("subjects", OTHER);
    if (lvlWrap) lvlWrap.hidden = !isChecked("levels", OTHER);
  }

  function isChecked(name, val) {
    return !!document.querySelector('input[name="' + name + '"][value="' + val + '"]:checked');
  }

  function collectSubjects() {
    var labels = checkedLabels("subjects").filter(function (l) { return l !== OTHER; });
    if (isChecked("subjects", OTHER)) {
      var custom = (document.getElementById("otherSubject") || {}).value;
      custom = String(custom || "").trim();
      if (custom) labels.push(custom);
    }
    return labels.join(" · ");
  }

  function collectLevels() {
    var labels = checkedLabels("levels").filter(function (l) { return l !== OTHER; });
    if (isChecked("levels", OTHER)) {
      var custom = (document.getElementById("otherLevel") || {}).value;
      custom = String(custom || "").trim();
      if (custom) labels.push(custom);
    }
    return labels;
  }

  function syncChip(chip) {
    var input = chip.querySelector("input");
    if (!input) return;
    chip.classList.toggle("selected", input.checked);
    chip.setAttribute("aria-pressed", input.checked ? "true" : "false");
  }

  function buildChips(containerId, items, type) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = "";
    items.forEach(function (item) {
      var label = typeof item === "string" ? item : item.name;
      var value = typeof item === "string" ? item : item.slug;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("aria-pressed", "false");
      chip.innerHTML = "<span>" + label + "</span>";
      chip.dataset.name = type;
      chip.dataset.value = value;
      var hidden = document.createElement("input");
      hidden.type = "checkbox";
      hidden.name = type;
      hidden.value = value;
      hidden.hidden = true;
      chip.appendChild(hidden);
      if (type === "levels" && (value === "Collège" || value === "Lycée")) hidden.checked = true;
      chip.addEventListener("click", function () {
        hidden.checked = !hidden.checked;
        syncChip(chip);
        updateOtherFields();
      });
      syncChip(chip);
      box.appendChild(chip);
    });
  }

  function checkedLabels(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) {
        var chip = el.closest(".chip");
        return chip ? chip.querySelector("span").textContent : el.value;
      });
  }

  function goStep(n) {
    step = n;
    stepEls.forEach(function (el, i) { el.hidden = i !== step; });
    progressBars.forEach(function (el, i) { el.classList.toggle("done", i <= step); });
    if (stepLabel) stepLabel.textContent = "Étape " + (step + 1) + " / 2";
    showErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep0() {
    if (!document.getElementById("fullName").value.trim()) return "Indiquez votre nom complet.";
    if (!document.getElementById("phone").value.trim()) return "Indiquez votre numéro.";
    if (!checkedLabels("subjects").length) return "Sélectionnez au moins une matière.";
    if (isChecked("subjects", OTHER) && !(document.getElementById("otherSubject").value || "").trim()) {
      return "Précisez la matière « Autre ».";
    }
    if (!checkedLabels("levels").length) return "Sélectionnez au moins un niveau.";
    if (isChecked("levels", OTHER) && !(document.getElementById("otherLevel").value || "").trim()) {
      return "Précisez le niveau « Autre ».";
    }
    return "";
  }

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (step === 0) {
        var e0 = validateStep0();
        if (e0) return showErr(e0, 0);
      }
      goStep(Math.min(step + 1, 1));
    });
  });

  document.querySelectorAll("[data-prev]").forEach(function (btn) {
    btn.addEventListener("click", function () { goStep(Math.max(step - 1, 0)); });
  });

  document.querySelectorAll("[data-legal]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.stopPropagation(); });
  });

  async function loadCatalog() {
    var subjects = finalizeSubjects(FALLBACK.subjects.slice());
    var levels = finalizeLevels(FALLBACK.levels.slice());

    try {
      var res = await Promise.all([
        fetch(API_BASE + "/api/subjects").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/levels").then(function (r) { return r.ok ? r.json() : []; }),
      ]);
      if (res[0] && res[0].length) subjects = finalizeSubjects(res[0].map(function (s) { return s.name; }));
      if (res[1] && res[1].length) levels = finalizeLevels(res[1].map(function (l) { return l.name; }));
    } catch (_) { /* repli local */ }

    buildChips("subjectsGrid", subjects, "subjects");
    buildChips("levelsGrid", levels, "levels");
    updateOtherFields();
    ["otherSubject", "otherLevel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", updateOtherFields);
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showErr("");
      if (!document.getElementById("consent").checked) {
        return showErr("Acceptez les conditions d'utilisation.", 1);
      }
      var btn = document.getElementById("submitBtn");
      btn.disabled = true;
      btn.textContent = "Envoi en cours…";
      try {
        var price = document.getElementById("pricePerHour").value;
        var body = {
          fullName: document.getElementById("fullName").value.trim(),
          phone: normalizePhone(document.getElementById("phone").value),
          email: document.getElementById("email").value.trim() || undefined,
          subjects: collectSubjects(),
          levels: collectLevels(),
          pricePerHour: price ? Number(price) : undefined,
          negotiable: document.getElementById("negotiable").checked,
          consent: true,
        };

        var res = await fetch(API_BASE + "/api/teacher-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.message || data.error || "Erreur " + res.status);

        if (formCard) formCard.hidden = true;
        if (successEl) successEl.hidden = false;
      } catch (ex) {
        showErr(ex.message || "Envoi impossible", 1);
        btn.disabled = false;
        btn.textContent = "Envoyer ma candidature";
      }
    });
  }

  var STATUS_STEPS = ["pending", "interview", "test", "training", "approved"];
  var STATUS_LABEL = {
    pending: "Dossier reçu",
    interview: "Entretien proposé",
    test: "Test / mise en situation",
    training: "Formation",
    approved: "Accès aux offres",
    rejected: "Candidature refusée",
  };

  var statusBtn = document.getElementById("statusBtn");
  var statusResult = document.getElementById("statusResult");
  if (statusBtn) {
    statusBtn.addEventListener("click", async function () {
      var phone = normalizePhone(document.getElementById("statusPhone").value);
      if (!phone) { statusResult.innerHTML = '<p class="form-err">Indiquez un numéro valide.</p>'; return; }
      statusBtn.disabled = true;
      statusBtn.textContent = "Recherche…";
      try {
        var res = await fetch(API_BASE + "/api/teacher-applications/status?phone=" + encodeURIComponent(phone));
        var data = await res.json();
        if (!res.ok || data.status === "none") {
          statusResult.innerHTML = '<p class="form-err">Aucune candidature trouvée pour ce numéro.</p>';
          return;
        }
        if (data.status === "rejected") {
          statusResult.innerHTML = '<p class="form-err">Candidature refusée' + (data.rejectionReason ? " — " + esc(data.rejectionReason) : "") + "</p>";
          return;
        }
        var currentIdx = STATUS_STEPS.indexOf(data.status);
        var html = '<div class="progress-row" aria-hidden="true">' +
          STATUS_STEPS.map(function (s, i) { return '<div class="progress-bar"><span' + (i <= currentIdx ? ' class="done"' : "") + '></span></div>'; }).join("") +
          "</div>" +
          '<p class="step-kicker">' + esc(STATUS_LABEL[data.status] || data.status) + "</p>";
        if (data.interviewNotes) html += "<p>Entretien : " + esc(data.interviewNotes) + "</p>";
        if (data.testNotes) html += "<p>Test : " + esc(data.testNotes) + "</p>";
        statusResult.innerHTML = html;
      } catch (ex) {
        statusResult.innerHTML = '<p class="form-err">Recherche impossible, réessayez.</p>';
      } finally {
        statusBtn.disabled = false;
        statusBtn.textContent = "Voir mon statut";
      }
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  loadCatalog().then(function () { goStep(0); });
})();
