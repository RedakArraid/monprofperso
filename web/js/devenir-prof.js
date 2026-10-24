/* Formulaire candidature professeur — 2 étapes (profil + consentement) */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var OTHER = "Autre";

  var form = document.getElementById("candidatureForm");
  var formCard = document.getElementById("formCard");
  var stepEls = document.querySelectorAll(".form-step");
  var progressBars = document.querySelectorAll(".progress-bar span");
  var stepLabel = document.getElementById("stepLabel");
  var errStep0 = document.getElementById("formErrStep0");
  var errStep1 = document.getElementById("formErrStep1");
  var successEl = document.getElementById("formSuccess");
  var step = 0;
  var consentInput = document.getElementById("consent");
  var consentVersion = "";

  async function loadConsentVersion() {
    consentVersion = ""; consentInput.checked = false; consentInput.disabled = true;
    var response = await fetch(API_BASE + "/api/auth/otp-channels", { cache: "no-store" });
    var data = response.ok ? await response.json() : null;
    if (!data || typeof data.consentVersion !== "string" || !data.consentVersion.trim()) {
      throw new Error("La version des documents est indisponible. Actualisez la page avant d’envoyer votre candidature.");
    }
    consentVersion = data.consentVersion;
    consentInput.disabled = false;
    document.getElementById("consentVersion").textContent = "Version présentée : " + consentVersion;
  }

  function normalizePhone(raw) {
    var p = String(raw || "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p;
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
      var caption = document.createElement("span"); caption.textContent = label; chip.appendChild(caption);
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
    var nextButton = document.querySelector("[data-next]");
    if (nextButton) nextButton.disabled = true;
    document.getElementById("submitBtn").disabled = true;
    var subjects, levels;
    try {
      var result = await Promise.all(["/api/subjects", "/api/levels"].map(async function (path) {
        var response = await fetch(API_BASE + path, { cache: "no-store" });
        if (!response.ok) throw new Error("Catalogue indisponible");
        return response.json();
      }).concat([loadConsentVersion()]));
      subjects = finalizeSubjects(result[0].map(function (item) { return item.name; }));
      levels = finalizeLevels(result[1].map(function (item) { return item.name; }));
      if (nextButton) nextButton.disabled = false;
      document.getElementById("submitBtn").disabled = false;
    } catch (error) {
      showErr(error.message || "Le catalogue n’a pas pu être chargé. Actualisez la page pour réessayer.", 0);
      return;
    }

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
      var btn = document.getElementById("submitBtn");
      if (btn.disabled || !consentVersion) return;
      if (!document.getElementById("consent").checked) {
        return showErr("Acceptez les conditions d'utilisation.", 1);
      }
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
          consentVersion: consentVersion,
        };

        var res = await fetch(API_BASE + "/api/teacher-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        var data = await res.json().catch(function () { return {}; });
        if (res.status === 409 && data.error === "consent_version_changed") {
          await loadConsentVersion();
          throw new Error("Les documents ont changé. Consultez-les puis cochez à nouveau votre acceptation avant d’envoyer votre candidature.");
        }
        if (!res.ok) throw new Error(data.message || data.error || "Erreur " + res.status);

        if (formCard) formCard.hidden = true;
        if (successEl) successEl.hidden = false;
      } catch (ex) {
        showErr(ex.message || "Envoi impossible", 1);
        btn.disabled = !consentVersion;
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
        var userToken = localStorage.getItem("mpp_user_jwt");
        if (!userToken) {
          statusResult.innerHTML = '<p>Connectez-vous ou créez votre compte avec le numéro de votre candidature pour consulter son suivi.</p><a class="btn" href="/espace/#/login?next=candidature">Accéder à mon compte</a>';
          return;
        }
        var res = await fetch(API_BASE + "/api/teacher-applications/status?phone=" + encodeURIComponent(phone), {
          headers: { Authorization: "Bearer " + userToken }, cache: "no-store",
        });
        if (res.status === 401) {
          statusResult.innerHTML = '<p class="form-err">Votre session a expiré. Reconnectez-vous pour consulter le suivi.</p><a href="/espace/#/login?next=candidature">Se reconnecter</a>';
          return;
        }
        if (res.status === 403) {
          statusResult.innerHTML = '<p class="form-err">Ce compte ne correspond pas au numéro de cette candidature. Consultez votre compte pour vérifier votre numéro ou changer de compte.</p><a href="/espace/#/compte">Mon compte</a>';
          return;
        }
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
        if (data.interviewAt) {
          var interview = new Date(data.interviewAt);
          if (Number.isFinite(interview.getTime())) html += "<p>Entretien prévu : " + esc(interview.toLocaleString("fr-FR", { timeZone: "Africa/Abidjan" })) + " (heure de Côte d’Ivoire).</p>";
        }
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

  goStep(0);
  loadCatalog();
})();
