/* Client API partagé — vitrine, connexion, espace utilisateur */
(function (global) {
  "use strict";

  var API_BASE = global.MPP_API_BASE || ((location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin);

  var TOKEN_KEY = "mpp_user_jwt";
  var ROLE_KEY = "mpp_user_role";

  function normalizePhone(raw) {
    var p = String(raw ?? "").trim().replace(/[\s.-]/g, "");
    if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
    else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
    return p;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function fcfa(n) {
    return n == null ? "" : Number(n).toLocaleString("fr-FR");
  }

  var token = {
    get: function () { return localStorage.getItem(TOKEN_KEY); },
    set: function (t, role) {
      localStorage.setItem(TOKEN_KEY, t);
      if (role) localStorage.setItem(ROLE_KEY, role);
    },
    role: function () { return localStorage.getItem(ROLE_KEY); },
    clear: function () {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
    },
  };

  async function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    var t = token.get();
    if (t) headers.Authorization = "Bearer " + t;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    var res;
    try {
      res = await fetch(API_BASE + path, {
        method: opts.method || "GET",
        cache: "no-store",
        headers: headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (_) {
      throw new Error("Impossible de joindre l'API.");
    }
    if (res.status === 204) return null;
    var text = await res.text();
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    }
    if (!res.ok) {
      var err = new Error((data && (data.message || data.error)) || ("Erreur " + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function redirectAfterLogin(user) {
    if (user && user.role === "admin") {
      localStorage.setItem("mpp_admin_jwt", token.get());
      location.href = "/admin/";
      return;
    }
    if (user && (user.role === "teacher" || user.teacher_id)) {
      location.href = "/espace/#/prof-espace";
      return;
    }
    location.href = "/espace/#/accueil";
  }

  global.MPP = global.MPP || {};
  global.MPP.API_BASE = API_BASE;
  global.MPP.api = api;
  global.MPP.token = token;
  global.MPP.normalizePhone = normalizePhone;
  global.MPP.esc = esc;
  global.MPP.fcfa = fcfa;
  global.MPP.redirectAfterLogin = redirectAfterLogin;
})(window);
