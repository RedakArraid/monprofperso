/* Vues parent — accueil, recherche, profil, cours, progrès, compte */
(function (global) {
  "use strict";

  var api = global.MPP.api;
  var UI = global.MPP.UI;
  var FB = global.MPP.Fallback;
  var esc = UI.esc;
  var fcfa = UI.fcfa;

  function teacherCard(t) {
    var initials = t.initials || (t.name || "?").slice(0, 2).toUpperCase();
    return '<a class="es-card" href="#/prof/' + t.id + '"><div class="es-row">' +
      '<div class="es-avatar">' + esc(initials) + '</div>' +
      '<div class="es-row-main"><div class="es-title">' + esc(t.name) + '</div>' +
      '<div class="es-meta">' + esc(t.subjects || "") + ' · ' + esc(t.location || "") + '</div>' +
      '<div class="es-meta">★ ' + (t.rating || "—") + ' · ' + fcfa(t.price_per_hour) + ' F/h</div></div></div></a>';
  }

  function courseCard(c) {
    var name = c.teacher_name || c.teacherName || "Professeur";
    var subj = c.subject || "";
    var lvl = c.level || "";
    var day = (c.day_label || c.dayLabel || "") + " " + (c.day_num || c.dayNum || "");
    var time = c.time || "";
    var badge = c.badge || c.status || "";
    return UI.card(
      '<div class="es-row"><div class="es-row-main">' +
      '<div class="es-title">' + esc(subj) + ' · ' + esc(lvl) + '</div>' +
      '<div class="es-meta">' + esc(name) + '</div>' +
      '<div class="es-meta">' + esc(day.trim()) + ' · ' + esc(time) + '</div>' +
      (badge ? '<span class="es-pill">' + esc(badge) + '</span>' : '') +
      '</div><div><strong>' + fcfa(c.price) + ' F</strong></div></div>'
    );
  }

  async function accueil(ctx) {
    var offline = false;
    var unread = 0;
    var courses = [];
    var user = global.MPP.Auth.getUser();
    try {
      var u = await api("/api/notifications/unread");
      unread = (u && u.count) || 0;
      courses = await api("/api/courses?status=upcoming") || [];
    } catch (e) {
      offline = true;
      courses = FB.courses;
    }
    var next = courses[0];
    var html = UI.topBar("Accueil") +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      UI.card('<div class="es-hero-title">Bonjour' + (user && user.full_name ? ", " + esc(user.full_name.split(" ")[0]) : "") + '</div>' +
        '<div class="es-hero-value" style="font-size:22px">Trouvez le bon prof</div>' +
        '<p class="muted" style="margin:8px 0 0">Cours à domicile ou en ligne, profs vérifiés.</p>') +
      '<div class="es-btn-row"><a class="btn btn-primary btn-block" href="#/recherche">Rechercher un prof</a></div>' +
      '<div class="es-btn-row"><a class="btn btn-ghost btn-block" href="#/exprimer-besoin">Exprimer un besoin</a></div>';
    if (unread > 0) {
      html += UI.card('<a href="#/notifications" class="es-row" style="text-decoration:none;color:inherit">' +
        '<span>🔔</span><span class="es-row-main"><strong>' + unread + ' notification' + (unread > 1 ? "s" : "") + '</strong></span><span class="es-chevron">›</span></a>');
    }
    if (next) {
      html += '<h3 style="margin:16px 0 8px;font-size:15px">Prochain cours</h3>' + courseCard(next);
    }
    html += '<h3 style="margin:16px 0 8px;font-size:15px">Raccourcis</h3>' +
      UI.menuRow("Mes besoins", "#/mes-besoins") +
      UI.menuRow("Mes enfants", "#/enfants") +
      UI.menuRow("Cours en groupe", "#/groupes");
    return { html: html, nav: "accueil" };
  }

  async function recherche(ctx) {
    var q = ctx.query || {};
    var offline = false;
    var teachers = [];
    try {
      var path = "/api/teachers";
      var params = [];
      if (q.format) params.push("format=" + encodeURIComponent(q.format));
      if (q.level) params.push("level=" + encodeURIComponent(q.level));
      if (params.length) path += "?" + params.join("&");
      teachers = await api(path) || [];
    } catch (e) {
      offline = true;
      teachers = FB.teachers;
    }
    var html = UI.topBar("Recherche") +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      '<p class="muted"><a href="#/recherche/filtres">Filtres</a> · ' + teachers.length + ' professeur(s)</p>';
    if (!teachers.length) html += UI.empty("Aucun professeur trouvé.");
    else teachers.forEach(function (t) { html += teacherCard(t); });
    return { html: html, nav: "recherche" };
  }

  async function filtres(ctx) {
    var html = UI.topBar("Filtres", true) +
      '<form class="es-form" id="filterForm">' +
      '<div class="field"><label>Format</label><select name="format"><option value="">Tous</option><option value="home">À domicile</option><option value="online">En ligne</option></select></div>' +
      '<div class="field"><label>Niveau</label><select name="level"><option value="">Tous</option><option value="college">Collège</option><option value="lycee">Lycée</option></select></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Appliquer</button></form>';
    return {
      html: html,
      nav: "recherche",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { location.hash = "#/recherche"; });
        root.querySelector("#filterForm").addEventListener("submit", function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var parts = [];
          if (fd.get("format")) parts.push("format=" + fd.get("format"));
          if (fd.get("level")) parts.push("level=" + fd.get("level"));
          location.hash = "#/recherche" + (parts.length ? "?" + parts.join("&") : "");
        });
      },
    };
  }

  async function profil(ctx) {
    var id = ctx.params.id;
    var offline = false;
    var t = null;
    try {
      t = await api("/api/teachers/" + id);
    } catch (e) {
      offline = true;
      t = FB.teachers.find(function (x) { return String(x.id) === String(id); }) || FB.teachers[0];
    }
    if (!t) return { html: UI.topBar("Profil", true) + UI.empty("Professeur introuvable."), nav: "recherche" };
    var reviews = (t.reviews || []).map(function (r) {
      return UI.card('<div class="es-meta">★ ' + r.rating + ' · ' + esc(r.author_name || "") + '</div><p>' + esc(r.text || "") + '</p>');
    }).join("");
    var html = UI.topBar("Profil prof", true) +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      UI.card('<div class="es-row"><div class="es-avatar">' + esc(t.initials || "?") + '</div>' +
        '<div><div class="es-title">' + esc(t.name) + '</div>' +
        '<div class="es-meta">' + esc(t.subjects) + '</div>' +
        '<div class="es-meta">★ ' + t.rating + ' (' + (t.reviews_count || 0) + ' avis) · ' + esc(t.location) + '</div>' +
        '<div class="es-meta"><strong>' + fcfa(t.price_per_hour) + ' F/h</strong></div></div></div>') +
      '<a class="btn btn-primary btn-block" href="#/reservation?teacherId=' + t.id + '&name=' + encodeURIComponent(t.name) + '&price=' + (t.price_per_hour || 6000) + '">Réserver un cours</a>' +
      (reviews ? '<h3 style="margin:16px 0 8px">Avis</h3>' + reviews : "");
    return {
      html: html,
      nav: "recherche",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { history.back(); });
      },
    };
  }

  async function cours(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/courses") || []; } catch (e) { offline = true; list = FB.courses; }
    var html = UI.topBar("Mes cours") + (offline ? UI.offlineBanner(function () { location.reload(); }) : "");
    if (!list.length) html += UI.empty("Aucun cours pour le moment.");
    else list.forEach(function (c) { html += courseCard(c); });
    return { html: html, nav: "cours" };
  }

  async function progres(ctx) {
    var offline = false;
    var p = null;
    try { p = await api("/api/progress"); } catch (e) { offline = true; p = FB.progress; }
    var subs = (p.subjects || []).map(function (s) {
      return UI.progressBar(s.subject, s.grade, s.fraction, s.warn);
    }).join("");
    var html = UI.topBar("Progrès") + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      UI.card('<div class="es-hero-title">Moyenne générale</div><div class="es-hero-value">' + esc(p.average || "—") + '</div>' +
        '<p class="muted">' + esc(p.trend || "") + ' · ' + esc(p.goal || "") + '</p>') + subs;
    return { html: html, nav: "progres" };
  }

  async function compte(ctx) {
    var user = global.MPP.Auth.getUser();
    var isTeacher = global.MPP.Auth.isTeacher();
    var html = UI.topBar("Mon compte") +
      UI.card('<div class="es-title">' + esc((user && user.full_name) || "Utilisateur") + '</div>' +
        '<div class="es-meta">' + esc((user && user.phone) || "") + '</div>') +
      UI.menuRow("Notifications", "#/notifications") +
      UI.menuRow("Portefeuille", "#/portefeuille") +
      UI.menuRow("Mes besoins", "#/mes-besoins") +
      UI.menuRow("Mes enfants", "#/enfants") +
      UI.menuRow("Ressources", "#/ressources") +
      UI.menuRow("Abonnement", "#/abonnement") +
      UI.menuRow("Parrainage", "#/parrainage") +
      UI.menuRow("Documents légaux", "#/legal") +
      UI.menuRow("Aide", "#/aide") +
      UI.menuRow("Paramètres", "#/parametres") +
      (!isTeacher ? UI.menuRow("Devenir professeur", "../devenir-prof.html") : UI.menuRow("Compléter mon profil", "#/prof-profil")) +
      '<button type="button" class="btn btn-danger btn-block" id="logoutBtn" style="margin-top:16px">Déconnexion</button>';
    return {
      html: html,
      nav: "compte",
      onMount: function (root) {
        root.querySelector("#logoutBtn").addEventListener("click", function () { global.MPP.Auth.logout(); });
      },
    };
  }

  global.MPP = global.MPP || {};
  global.MPP.Views = global.MPP.Views || {};
  global.MPP.Views.parent = {
    accueil: accueil,
    recherche: recherche,
    filtres: filtres,
    profil: profil,
    cours: cours,
    progres: progres,
    compte: compte,
  };
})(window);
