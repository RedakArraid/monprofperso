/* Formulaire candidature professeur — cases à cocher + listes déroulantes */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var FALLBACK = {
    subjects: ["Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo", "Musique", "Espagnol", "Allemand"],
    levels: ["Primaire", "Collège", "Lycée", "Supérieur", "Université"],
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
  var stepEls = document.querySelectorAll(".form-step");
  var progressBars = document.querySelectorAll(".progress-bar span");
  var stepLabel = document.getElementById("stepLabel");
  var errEl = document.getElementById("formErr");
  var errStep0 = document.getElementById("formErrStep0");
  var errStep1 = document.getElementById("formErrStep1");
  var successEl = document.getElementById("formSuccess");
  var step = 0;
  var files = { idCard: null, diploma: null, photo: null };

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

  function buildChips(containerId, items, type) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = "";
    items.forEach(function (item) {
      var label = typeof item === "string" ? item : item.name;
      var value = typeof item === "string" ? item : item.slug;
      var id = containerId + "-" + value.replace(/\s+/g, "-");
      var lbl = document.createElement("label");
      lbl.className = "chip";
      lbl.innerHTML = '<input type="checkbox" name="' + type + '" value="' + value + '" id="' + id + '" />' +
        "<span>" + label + "</span>";
      if (type === "programs" && value === "standard") {
        lbl.querySelector("input").checked = true;
      }
      if (type === "levels" && (value === "Collège" || value === "Lycée")) {
        lbl.querySelector("input").checked = true;
      }
      box.appendChild(lbl);
    });
  }

  function checkedValues(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return el.value; });
  }

  function checkedLabels(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return el.parentElement.querySelector("span").textContent; });
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
    if (!input) return;
    input.addEventListener("change", function () {
      var f = input.files[0];
      files[key] = f || null;
      if (label) label.textContent = f ? f.name : "Choisir un fichier";
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
  }

  function validateStep0() {
    if (!document.getElementById("fullName").value.trim()) return "Indiquez votre nom complet.";
    if (!document.getElementById("phone").value.trim()) return "Indiquez votre numéro.";
    if (!checkedLabels("subjects").length) return "Sélectionnez au moins une matière.";
    if (!checkedLabels("levels").length) return "Sélectionnez au moins un niveau.";
    if (!checkedValues("programs").length) return "Sélectionnez au moins un programme.";
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

  async function loadCatalog() {
    fillSelect("location", LOCATIONS, "Cocody");
    fillSelect("experience", EXPERIENCES, "3 à 5 ans");
    fillSelect("price", PRICES, 4000);

    var subjects = FALLBACK.subjects.slice();
    var levels = FALLBACK.levels.slice();
    var programs = FALLBACK.programs.slice();

    try {
      var res = await Promise.all([
        fetch(API_BASE + "/api/subjects").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/levels").then(function (r) { return r.ok ? r.json() : []; }),
        fetch(API_BASE + "/api/programs").then(function (r) { return r.ok ? r.json() : []; }),
      ]);
      if (res[0] && res[0].length) subjects = res[0].map(function (s) { return s.name; });
      if (res[1] && res[1].length) levels = res[1].map(function (l) { return l.name; });
      if (res[2] && res[2].length) programs = res[2].map(function (p) { return { slug: p.slug, name: p.name }; });
    } catch (_) { /* repli local */ }

    buildChips("subjectsGrid", subjects, "subjects");
    buildChips("levelsGrid", levels, "levels");
    buildChips("programsGrid", programs, "programs");
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
          phone: document.getElementById("phone").value.trim(),
          email: document.getElementById("email").value.trim() || undefined,
          subjects: checkedLabels("subjects").join(" · "),
          location: document.getElementById("location").value,
          pricePerHour: Number(document.getElementById("price").value) || undefined,
          bio: document.getElementById("bio").value.trim() || undefined,
          experience: document.getElementById("experience").value,
          levels: checkedLabels("levels"),
          formats: formats,
          programs: checkedValues("programs"),
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

        form.hidden = true;
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
