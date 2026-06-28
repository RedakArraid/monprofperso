/* Formulaire candidature professeur, Mon Prof Perso */
(function () {
  "use strict";

  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  var form = document.getElementById("candidatureForm");
  var stepEls = document.querySelectorAll(".form-step");
  var progressBars = document.querySelectorAll(".progress-bar span");
  var stepLabel = document.getElementById("stepLabel");
  var errEl = document.getElementById("formErr");
  var successEl = document.getElementById("formSuccess");
  var step = 0;
  var files = { idCard: null, diploma: null, photo: null };

  function showErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.hidden = !msg; }
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

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (step === 0) {
        if (!document.getElementById("fullName").value.trim()) return showErr("Indiquez votre nom complet.");
        if (!document.getElementById("phone").value.trim()) return showErr("Indiquez votre numéro.");
        if (!document.getElementById("subjects").value.trim()) return showErr("Indiquez vos matières.");
      }
      if (step === 1 && !document.getElementById("consent").checked) {
        return showErr("Acceptez les conditions d'utilisation.");
      }
      goStep(Math.min(step + 1, 2));
    });
  });

  document.querySelectorAll("[data-prev]").forEach(function (btn) {
    btn.addEventListener("click", function () { goStep(Math.max(step - 1, 0)); });
  });

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
        var levels = document.getElementById("levels").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
        var formats = [];
        if (document.getElementById("fmtHome").checked) formats.push("home");
        if (document.getElementById("fmtOnline").checked) formats.push("online");
        if (!formats.length) formats = ["home", "online"];

        var body = {
          fullName: document.getElementById("fullName").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          email: document.getElementById("email").value.trim() || undefined,
          subjects: document.getElementById("subjects").value.trim(),
          location: document.getElementById("location").value.trim() || "Abidjan",
          pricePerHour: Number(document.getElementById("price").value) || undefined,
          bio: document.getElementById("bio").value.trim() || undefined,
          experience: document.getElementById("experience").value.trim() || undefined,
          levels: levels,
          formats: formats,
          programs: ["standard"],
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

  goStep(0);
})();
