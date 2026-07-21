/* Vues diverses — notifications, wallet, groupes, abonnement, ressources, legal, booking, maquettes */
(function (global) {
  "use strict";

  var api = global.MPP.api;
  var UI = global.MPP.UI;
  var FB = global.MPP.Fallback;
  var esc = UI.esc;
  var fcfa = UI.fcfa;
  var API_BASE = global.MPP.API_BASE;

  function backMount(root, hash) {
    var b = root.querySelector("[data-back]");
    if (b) b.addEventListener("click", function () { location.hash = hash || "#/compte"; });
  }

  async function notifications(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/notifications") || []; } catch (e) { offline = true; list = FB.notifications; }
    var html = UI.topBar("Notifications", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      '<button type="button" class="btn btn-ghost btn-sm" id="markRead">Tout lire</button>';
    if (!list.length) html += UI.empty("Aucune notification.");
    else list.forEach(function (n) {
      html += UI.card('<div class="es-row"><span>' + (n.unread ? "🔵" : "⚪") + '</span><div class="es-row-main">' +
        '<div>' + esc(n.text) + '</div><div class="es-meta">' + esc(n.time_ago || n.timeAgo || "") + '</div></div></div>');
    });
    return {
      html: html,
      nav: "compte",
      onMount: function (root) {
        backMount(root);
        var btn = root.querySelector("#markRead");
        if (btn) btn.addEventListener("click", async function () {
          try { await api("/api/notifications/read", { method: "POST", body: {} }); UI.toast("Notifications lues"); location.reload(); }
          catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  async function portefeuille(ctx) {
    var offline = false;
    var w = null;
    try { w = await api("/api/wallet"); } catch (e) { offline = true; w = FB.wallet; }
    var accounts = (w.accounts || []).map(function (a) {
      return UI.card('<div class="es-title">' + esc(a.provider || a.label || "Compte") + '</div><div class="es-meta">' + esc(a.number || "") + '</div>');
    }).join("");
    var tx = (w.transactions || []).map(function (t) {
      var amt = t.amount != null ? t.amount : (t.credit ? t.credit : 0);
      return UI.card('<div class="es-row"><div class="es-row-main"><div class="es-title">' + esc(t.title || t.label) + '</div><div class="es-meta">' + esc(t.subtitle || t.date || "") + '</div></div><strong>' + fcfa(amt) + ' F</strong></div>');
    }).join("");
    return {
      html: UI.topBar("Portefeuille", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") + accounts + tx,
      nav: "compte",
      onMount: function (root) { backMount(root); },
    };
  }

  async function groupes(ctx) {
    var offline = false;
    var list = [];
    var kind = (ctx.query && ctx.query.kind) || "";
    try {
      var path = "/api/groups" + (kind ? "?kind=" + encodeURIComponent(kind) : "");
      list = await api(path) || [];
    } catch (e) { offline = true; list = FB.groups; }
    var html = UI.topBar("Cours en groupe") +
      '<p class="muted"><a href="#/groupes">Tous</a> · <a href="#/groupes?kind=stage">Vacances</a></p>' +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "");
    if (!list.length) html += UI.empty("Aucun groupe disponible.");
    else list.forEach(function (g) {
      html += '<a class="es-card" href="#/groupes/' + g.id + '"><div class="es-title">' + esc(g.title) + '</div>' +
        '<div class="es-meta">' + esc(g.detail || g.teacher_name || "") + ' · ' + fcfa(g.price) + ' F</div></a>';
    });
    return { html: html, nav: "accueil" };
  }

  async function groupeDetail(ctx) {
    var id = ctx.params.id;
    var offline = false;
    var g = null;
    try { g = await api("/api/groups/" + id); } catch (e) {
      offline = true;
      g = FB.groups.find(function (x) { return String(x.id) === String(id); }) || FB.groups[0];
    }
    if (!g) return { html: UI.topBar("Groupe", true) + UI.empty("Introuvable."), nav: "accueil" };
    return {
      html: UI.topBar("Détail groupe", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
        UI.card('<div class="es-title">' + esc(g.title) + '</div><div class="es-meta">' + esc(g.detail) + '</div><p><strong>' + fcfa(g.price) + ' F</strong></p>') +
        '<p class="muted">Inscription bientôt disponible sur le web.</p>',
      nav: "accueil",
      onMount: function (root) { backMount(root, "#/groupes"); },
    };
  }

  async function abonnement(ctx) {
    var offline = false;
    var plans = [];
    var mine = null;
    try {
      plans = await api("/api/subscription/plans") || [];
      mine = await api("/api/subscription/mine");
    } catch (e) { offline = true; plans = FB.plans; }
    var html = UI.topBar("Abonnement", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "");
    if (mine && mine.plan) html += UI.card('<div class="es-title">Votre formule</div><div class="es-meta">' + esc(mine.plan) + '</div>', "green");
    plans.forEach(function (p) {
      html += UI.card('<div class="es-title">' + esc(p.name) + (p.popular ? ' <span class="es-pill orange">Populaire</span>' : '') + '</div>' +
        '<div class="es-meta">' + esc(p.detail) + '</div><strong>' + fcfa(p.price) + ' F' + esc(p.suffix || "") + '</strong>');
    });
    return { html: html, nav: "compte", onMount: function (root) { backMount(root); } };
  }

  async function parrainage(ctx) {
    var offline = false;
    var r = FB.referral;
    try { r = await api("/api/referral"); } catch (e) { offline = true; }
    return {
      html: UI.topBar("Parrainage", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
        UI.card('<div class="es-hero-title">Votre code</div><div class="es-hero-value" style="font-size:22px">' + esc(r.code) + '</div>') +
        UI.card('<div class="es-meta">Filleuls : ' + (r.referred || 0) + ' · Gains : ' + fcfa(r.earned) + ' F</div>'),
      nav: "compte",
      onMount: function (root) { backMount(root); },
    };
  }

  async function ressources(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/resources") || []; } catch (e) { offline = true; list = FB.resources; }
    var html = UI.topBar("Ressources", true) + (offline ? UI.offlineBanner(function () { location.reload(); }) : "");
    if (!list.length) html += UI.empty("Aucune ressource.");
    else list.forEach(function (r) {
      var href = r.id ? API_BASE + "/api/files/" + r.id : "#";
      html += '<a class="es-card" href="' + href + '" target="_blank" rel="noopener"><div class="es-title">' + esc(r.title) + '</div><div class="es-meta">' + esc(r.type) + ' · ' + esc(r.level || "") + '</div></a>';
    });
    return { html: html, nav: "compte", onMount: function (root) { backMount(root); } };
  }

  async function legal(ctx) {
    var docs = [];
    try { docs = await api("/api/legal") || []; } catch (_) {}
    var html = UI.topBar("Documents légaux", true);
    if (!docs.length) html += UI.empty("Documents indisponibles.");
    else docs.forEach(function (d) {
      var href = d.hasFile ? API_BASE + "/api/legal/" + d.slug + "/file" : "#";
      html += UI.menuRow(d.title || d.slug, href);
    });
    return { html: html, nav: "compte", onMount: function (root) { backMount(root); } };
  }

  async function reservation(ctx) {
    var q = ctx.query || {};
    var html = UI.topBar("Réservation", true) +
      '<form class="es-form" id="bookForm">' +
      '<input type="hidden" name="teacherId" value="' + esc(q.teacherId || "1") + '" />' +
      '<div class="field"><label>Professeur</label><input name="teacherName" value="' + esc(decodeURIComponent(q.name || "Professeur")) + '" /></div>' +
      '<div class="field"><label>Matière</label><input name="subject" value="Maths" /></div>' +
      '<div class="field"><label>Niveau</label><input name="level" value="3ème" /></div>' +
      '<div class="field"><label>Format</label><select name="format"><option value="home">À domicile</option><option value="online">En ligne</option></select></div>' +
      '<div class="field"><label>Prix (F)</label><input name="price" type="number" value="' + esc(q.price || "6000") + '" /></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Continuer vers paiement</button></form>';
    return {
      html: html,
      nav: "recherche",
      onMount: function (root) {
        backMount(root, "#/recherche");
        root.querySelector("#bookForm").addEventListener("submit", async function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          try {
            var r = await api("/api/bookings", {
              method: "POST",
              body: {
                teacherId: Number(fd.get("teacherId")),
                teacherName: fd.get("teacherName"),
                subject: fd.get("subject"),
                level: fd.get("level"),
                format: fd.get("format"),
                price: Number(fd.get("price")),
                dayLabel: "SAM", dayNum: "22", time: "16h00", duration: "1h30", location: "Cocody",
              },
            });
            sessionStorage.setItem("mpp_booking_ref", r.reference || "");
            sessionStorage.setItem("mpp_booking_price", fd.get("price"));
            sessionStorage.setItem("mpp_course_id", String((r.course && r.course.id) || ""));
            location.hash = "#/paiement";
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  async function paiement(ctx) {
    var price = sessionStorage.getItem("mpp_booking_price") || "6000";
    var html = UI.topBar("Paiement", true) +
      UI.card('<div class="es-title">Montant : ' + fcfa(price) + ' F</div><div class="es-meta">Mobile Money (démo)</div>') +
      '<form class="es-form" id="payForm">' +
      '<div class="field"><label>Opérateur</label><select name="provider"><option value="orange">Orange Money</option><option value="mtn">MTN</option><option value="wave">Wave</option></select></div>' +
      '<div class="field"><label>Téléphone</label><input name="phone" type="tel" placeholder="+22507…" /></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Payer</button></form>';
    return {
      html: html,
      nav: "recherche",
      onMount: function (root) {
        backMount(root, "#/reservation");
        root.querySelector("#payForm").addEventListener("submit", async function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var courseId = Number(sessionStorage.getItem("mpp_course_id"));
          if (!courseId) { UI.toast("Réservez d'abord un cours", true); return; }
          try {
            var r = await api("/api/payments/charge-mobile", {
              method: "POST",
              body: {
                courseId: courseId,
                provider: fd.get("provider"),
                phone: fd.get("phone"),
              },
            });
            sessionStorage.setItem("mpp_payment_id", String(r.paymentId || r.id || ""));
            if (r.needsOtp) location.hash = "#/paiement-otp";
            else location.hash = "#/confirmation";
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  async function paiementOtp(ctx) {
    var html = UI.topBar("Code OTP", true) +
      '<form class="es-form" id="otpPayForm"><div class="field"><label>Code reçu</label><input name="code" maxlength="6" /></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Valider</button></form>';
    return {
      html: html,
      nav: "recherche",
      onMount: function (root) {
        backMount(root, "#/paiement");
        root.querySelector("#otpPayForm").addEventListener("submit", async function (e) {
          e.preventDefault();
          var pid = sessionStorage.getItem("mpp_payment_id");
          try {
            await api("/api/payments/submit-otp", { method: "POST", body: { paymentId: Number(pid), otp: new FormData(e.target).get("code") } });
            location.hash = "#/confirmation";
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  async function confirmation(ctx) {
    return {
      html: UI.topBar("Confirmé") + UI.card('<div style="text-align:center;font-size:48px">✓</div><div class="es-title" style="text-align:center">Réservation enregistrée</div>') +
        '<a class="btn btn-primary btn-block" href="#/cours">Voir mes cours</a>',
      nav: "cours",
    };
  }

  function mockScreen(title, text) {
    return function () {
      return {
        html: UI.topBar(title, true) + UI.card('<p class="muted">' + esc(text) + '</p><p>Interface fidèle à l\'app — données de démonstration.</p>'),
        nav: global.MPP.Auth.isTeacher() ? "agenda" : "compte",
        onMount: function (root) { backMount(root); },
      };
    };
  }

  global.MPP.Views = global.MPP.Views || {};
  global.MPP.Views.misc = {
    notifications: notifications,
    portefeuille: portefeuille,
    groupes: groupes,
    groupeDetail: groupeDetail,
    abonnement: abonnement,
    parrainage: parrainage,
    ressources: ressources,
    legal: legal,
    reservation: reservation,
    paiement: paiement,
    paiementOtp: paiementOtp,
    confirmation: confirmation,
    agenda: mockScreen("Agenda", "Vos créneaux de cours cette semaine."),
    messages: mockScreen("Messages", "Messagerie avec vos professeurs."),
    coursEnLigne: mockScreen("Cours en ligne", "Salle de visioconférence."),
    avis: mockScreen("Laisser un avis", "Notez votre dernier cours."),
    profRetrait: mockScreen("Retrait", "Demande de retrait vers Mobile Money."),
    aide: mockScreen("Aide", "FAQ et contact support."),
    parametres: mockScreen("Paramètres", "Notifications, langue, confidentialité."),
    welcome: function () {
      location.href = "/connexion.html";
      return { html: UI.loading(), nav: "" };
    },
  };
})(window);
