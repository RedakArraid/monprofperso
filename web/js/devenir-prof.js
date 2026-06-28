/* Formulaire candidature professeur — cases à cocher + listes déroulantes */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var OTHER = "Autre";
  var OTHER_PROG = "__autre__";

  var FALLBACK = {
    subjects: ["Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo", "Musique", "Espagnol", "Allemand"],
    levels: ["Primaire", "Collège", "Lycée", "Professionnel", "Supérieur", "Université"],
    programs: [
      { slug: "standard", name: "Programme standard" },
      { slug: "francais", name: "Programme français" },
    ],
  };

  var LOCATIONS = [
    "Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Abobo", "Adjamé",
    "Koumassi", "Port-Bouët", "Bingerville", "Anyama", "Autre (Abidjan)",
  ];

  var EXPERIENCES = ["Débutant", "1 à 3 ans", "3 à 5 ans", "5 à 10 ans", "10 ans et +", "Enseignant certifié"];
  var PRICES = [2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000];

  var form = document.getElementById("candidatureForm");
  var formCard = document.getElementById("formCard");
  var stepEls = document.querySelectorAll(".form-step");
  var progressBars = document.querySelectorAll(".progress-bar span");
  var stepLabel = document.getElementById("stepLabel");
  var errEl = document.getElementById("formErr");
  var errStep0 = document.getElementById("formErrStep0");
  var errStep1 = document.getElementById("formErrStep1");
  var successEl = document.getElementById("formSuccess");
  var step = 0;
  var files = { idCard: null, diploma: null, photo: null };

  function normalizePhone(raw) {
    var p = String(raw || "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
    else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
    return p;
  }

  function showErr(msg, which) {
    [errEl, errStep0, errStep1].forEach(function (el) { if (el) el.hidden = true; });
    var target = which === 0 ? errStep0 : which === 1 ? errStep1 : errEl;
    if (target) { target.textContent = msg || ""; target.hidden = !msg; }
  }

  function fillSelect(id, options, def) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    options.forEach(function (opt) {
      var o = document.createElement("option");
      if (typeof opt === "number") {
        o.value = String(opt);
        o.textContent = opt.toLocaleString("fr-FR") + " F / h";
      } else {
        o.value = opt;
        o.textContent = opt;
      }
      sel.appendChild(o);
    });
    if (def != null) sel.value = String(def);
  }

  function isChecked(name, val) {
    return !!document.querySelector('input[name="' + name + '"][value="' + val + '"]:checked');
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

  function finalizePrograms(list) {
    var out = list.filter(function (p) { return p.slug !== OTHER_PROG; });
    out.push({ slug: OTHER_PROG, name: OTHER });
    return out;
  }

  function updateOtherFields() {
    var subWrap = document.getElementById("otherSubjectWrap");
    var lvlWrap = document.getElementById("otherLevelWrap");
    var progWrap = document.getElementById("otherProgramWrap");
    if (subWrap) subWrap.hidden = !isChecked("subjects", OTHER);
    if (lvlWrap) lvlWrap.hidden = !isChecked("levels", OTHER);
    if (progWrap) progWrap.hidden = !isChecked("programs", OTHER_PROG);
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

  function collectPrograms() {
    var vals = checkedValues("programs").filter(function (v) { return v !== OTHER_PROG; });
    if (isChecked("programs", OTHER_PROG)) {
      var custom = (document.getElementById("otherProgram") || {}).value;
      custom = String(custom || "").trim();
      if (custom) vals.push(custom);
    }
    return vals;
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
      if (type === "programs" && value === "standard") hidden.checked = true;
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

  function checkedValues(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return el.value; });
  }

  function checkedLabels(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) {
        var chip = el.closest(".chip");
        return chip ? chip.querySelector("span").textContent : el.value;
      });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1] || ""); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function bindFile(inputId, key, labelId) {
    var input = document.getElementById(inputId);
    var label = labelId ? document.getElementById(labelId) : null;
    var wrap = input && input.closest(".file-btn");
    if (!input) return;
    if (wrap) {
      wrap.addEventListener("click", function (e) {
        if (e.target !== input) { e.preventDefault(); input.click(); }
      });
    }
    input.addEventListener("change", function () {
      var f = input.files[0];
      files[key] = f || null;
      if (label) label.textContent = f ? f.name : (key === "photo" ? "Choisir une photo" : "Choisir un fichier");
      if (wrap) wrap.classList.toggle("selected", !!f);
    });
  }

  bindFile("idCard", "idCard", "idCardLabel");
  bindFile("diploma", "diploma", "diplomaLabel");
  bindFile("photo", "photo", "photoLabel");

  function goStep(n) {
    step = n;
    stepEls.forEach(function (el, i) { el.hidden = i !== step; });
    progressBars.forEach(function (el, i) { el.classList.toggle("done", i <= step); });
    if (stepLabel) stepLabel.textContent = "Étape " + (step + 1) + " / 3";
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
    if (!checkedValues("programs").length) return "Sélectionnez au moins un programme.";
    if (isChecked("programs", OTHER_PROG) && !(document.getElementById("otherProgram").value || "").trim()) {
      return "Précisez le programme « Autre ».";
    }
    if (!document.getElementById("fmtHome").checked && !document.getElementById("fmtOnline").checked) {
      return "Choisissez au moins une modalité (domicile ou en ligne).";
    }
    return "";
  }

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (step === 0) {
        var e0 = validateStep0();
        if (e0) return showErr(e0, 0);
      }
      if (step === 1 && !document.getElementById("consent").checked) {
        return showErr("Acceptez les conditions d'utilisation.", 1);
      }
      goStep(Math.min(step + 1, 2));
    });
  });

  document.querySelectorAll("[data-prev]").forEach(function (btn) {
    btn.addEventListener("click", function () { goStep(Math.max(step - 1, 0)); });
  });

  document.querySelectorAll("[data-legal]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.stopPropagation(); });
  });

  async function loadCatalog() {
    fillSelect("location", LOCATIONS, "Cocody");
    fillSelect("experience", EXPERIENCES, "3 à 5 ans");
    fillSelect("price", PRICES, 4000);

    var subjects = finalizeSubjects(FALLBACK.subjects.slice());
    var levels = finalizeLevels(FALLBACK.levels.slice());
    var programs = finalizePrograms(FALLBACK.programs.slice());

    try {
      var res = await Promise.all([
        fetch(API_BASE + "/api/subjects").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/levels").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/programs").then(function (r) { return r.ok ? r.json() : []; }),
      ]);
      if (res[0] && res[0].length) subjects = finalizeSubjects(res[0].map(function (s) { return s.name; }));
      if (res[1] && res[1].length) levels = finalizeLevels(res[1].map(function (l) { return l.name; }));
      if (res[2] && res[2].length) {
        programs = finalizePrograms(res[2].map(function (p) { return { slug: p.slug, name: p.name }; }));
      }
    } catch (_) { /* repli local */ }

    buildChips("subjectsGrid", subjects, "subjects");
    buildChips("levelsGrid", levels, "levels");
    buildChips("programsGrid", programs, "programs");
    updateOtherFields();
    ["otherSubject", "otherLevel", "otherProgram"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", updateOtherFields);
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showErr("");
      if (!files.idCard || !files.diploma || !files.photo) {
        return showErr("Ajoutez les trois documents requis.");
      }
      var btn = document.getElementById("submitBtn");
      btn.disabled = true;
      btn.textContent = "Envoi en cours…";
      try {
        var formats = [];
        if (document.getElementById("fmtHome").checked) formats.push("home");
        if (document.getElementById("fmtOnline").checked) formats.push("online");

        var body = {
          fullName: document.getElementById("fullName").value.trim(),
          phone: normalizePhone(document.getElementById("phone").value),
          email: document.getElementById("email").value.trim() || undefined,
          subjects: collectSubjects(),
          location: document.getElementById("location").value,
          pricePerHour: Number(document.getElementById("price").value) || undefined,
          bio: document.getElementById("bio").value.trim() || undefined,
          experience: document.getElementById("experience").value,
          levels: collectLevels(),
          formats: formats,
          programs: collectPrograms(),
          negotiable: document.getElementById("negotiable").checked,
          consent: true,
          idCardBase64: await fileToBase64(files.idCard),
          idCardFileName: files.idCard.name,
          idCardMimeType: files.idCard.type || "application/pdf",
          diplomaBase64: await fileToBase64(files.diploma),
          diplomaFileName: files.diploma.name,
          diplomaMimeType: files.diploma.type || "application/pdf",
          photoBase64: await fileToBase64(files.photo),
          photoFileName: files.photo.name,
          photoMimeType: files.photo.type || "image/jpeg",
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
        showErr(ex.message || "Envoi impossible");
        btn.disabled = false;
        btn.textContent = "Envoyer ma candidature";
      }
    });
  }

  loadCatalog().then(function () { goStep(0); });
})();
