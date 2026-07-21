/* Page connexion.html — login, signup, OTP */
(function () {
  "use strict";

  var api = MPP.api;
  var token = MPP.token;
  var normalizePhone = MPP.normalizePhone;
  var redirectAfterLogin = MPP.redirectAfterLogin;

  var errEl = document.getElementById("authErr");
  var loginForm = document.getElementById("loginForm");
  var signupForm = document.getElementById("signupForm");
  var otpForm = document.getElementById("otpForm");
  var pendingPhone = "";
  var otpRequired = false;

  function showErr(msg) {
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
  }

  function showPanel(name) {
    loginForm.hidden = name !== "login";
    signupForm.hidden = name !== "signup";
    otpForm.hidden = name !== "otp";
    document.querySelectorAll(".auth-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === name || (name === "otp" && t.dataset.tab === "login"));
    });
  }

  document.querySelectorAll(".auth-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showPanel(btn.dataset.tab);
      showErr("");
    });
  });

  if (location.hash === "#inscription") showPanel("signup");
  if (location.hash === "#otp") showPanel("otp");

  if (token.get()) {
    api("/api/me").then(function (me) {
      if (me) redirectAfterLogin(me);
    }).catch(function () { token.clear(); });
  }

  fetch(MPP.API_BASE + "/api/legal").then(function (r) { return r.ok ? r.json() : []; }).then(function (docs) {
    var bySlug = {};
    (docs || []).forEach(function (d) { bySlug[d.slug] = d; });
    document.querySelectorAll("[data-legal]").forEach(function (a) {
      var d = bySlug[a.getAttribute("data-legal")];
      if (d && d.hasFile) a.href = MPP.API_BASE + "/api/legal/" + d.slug + "/file";
    });
  }).catch(function () {});

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");
    var phone = normalizePhone(document.getElementById("loginPhone").value);
    if (!phone) { showErr("Indiquez votre numéro."); return; }
    var btn = document.getElementById("loginBtn");
    btn.disabled = true;
    try {
      var channels = await api("/api/auth/otp-channels");
      if (channels && !channels.demo && channels.enabled) {
        pendingPhone = phone;
        otpRequired = true;
        await api("/api/auth/request-otp", { method: "POST", body: { phone: phone, channel: "whatsapp" } });
        showPanel("otp");
        return;
      }
      var r = await api("/api/auth/login", { method: "POST", body: { phone: phone } });
      token.set(r.token, r.user.role);
      redirectAfterLogin(r.user);
    } catch (ex) {
      showErr(ex.message || "Connexion impossible");
    } finally {
      btn.disabled = false;
    }
  });

  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");
    if (!document.getElementById("signupConsent").checked) {
      showErr("Acceptez les CGU pour continuer.");
      return;
    }
    var body = {
      fullName: document.getElementById("signupName").value.trim(),
      phone: normalizePhone(document.getElementById("signupPhone").value),
      role: document.getElementById("signupRole").value,
      consent: true,
    };
    if (!body.fullName || !body.phone) { showErr("Nom et téléphone requis."); return; }
    try {
      var r = await api("/api/auth/signup", { method: "POST", body: body });
      token.set(r.token, r.user.role);
      redirectAfterLogin(r.user);
    } catch (ex) {
      showErr(ex.message || "Inscription impossible");
    }
  });

  otpForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");
    try {
      var r = await api("/api/auth/verify-otp", {
        method: "POST",
        body: { phone: pendingPhone, code: document.getElementById("otpCode").value.trim() },
      });
      token.set(r.token, r.user.role);
      redirectAfterLogin(r.user);
    } catch (ex) {
      showErr(ex.message || "Code invalide");
    }
  });
})();
