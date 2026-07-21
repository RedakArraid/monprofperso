/* Vues professeur */
(function (global) {
  "use strict";

  var api = global.MPP.api;
  var UI = global.MPP.UI;
  var FB = global.MPP.Fallback;
  var esc = UI.esc;
  var fcfa = UI.fcfa;

  function requestCard(r) {
    var price = r.price != null ? fcfa(r.price) + " F" : "";
    var hourly = r.netHourly != null ? " · " + fcfa(r.netHourly) + " F/h net" : "";
    return UI.card(
      '<div class="es-title">' + esc(r.subject || "Cours") + ' · ' + esc(r.student || "") + '</div>' +
      '<div class="es-meta">' + esc(r.slot || r.format || "") + '</div>' +
      (price ? '<div class="es-meta"><strong>' + price + hourly + '</strong></div>' : '') +
      '<div class="es-btn-row">' +
      '<button type="button" class="btn btn-primary btn-sm" data-accept="' + (r.needId || r.courseId) + '" data-opp="' + (r.isOpportunity ? "1" : "0") + '">Accepter</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-refuse="' + (r.needId || r.courseId) + '" data-opp="' + (r.isOpportunity ? "1" : "0") + '">Refuser</button></div>'
    );
  }

  async function dashboard(ctx) {
    var offline = false;
    var d = null;
    try { d = await api("/api/teacher/dashboard"); } catch (e) { offline = true; d = FB.teacherDashboard; }
    var banner = "";
    if (d && d.needsConfirmed === false) {
      banner = '<div class="offline-banner">Votre accès aux offres est en cours de validation par l\'équipe.</div>';
    }
    var stats = (d.stats || []).map(function (s) {
      return '<div style="text-align:center;flex:1"><div style="font-size:20px;font-weight:800">' + esc(s.value) + '</div><div class="muted" style="font-size:11px">' + esc(s.label) + '</div></div>';
    }).join("");
    var html = UI.topBar("Tableau de bord") + banner +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      UI.card('<div class="es-hero-title">Revenus du mois</div><div class="es-hero-value">' + fcfa(d.revenue) + ' F</div><p class="muted">' + esc(d.trend || "") + '</p>', "green") +
      UI.card('<div class="es-row" style="justify-content:space-around">' + stats + '</div>') +
      (d.pendingRequests ? UI.card('<a href="#/prof-offres" style="color:inherit;text-decoration:none"><strong>' + d.pendingRequests + ' demande(s)</strong> en attente ›</a>') : "") +
      (d.profileCompletion && !d.profileCompletion.complete ? UI.menuRow("Compléter mon profil (" + d.profileCompletion.percent + "%)", "#/prof-profil") : "");
    return { html: html, nav: "prof-espace" };
  }

  async function offres(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/teacher/requests") || []; } catch (e) { offline = true; list = FB.teacherRequests; }
    var html = UI.topBar("Demandes") + (offline ? UI.offlineBanner(function () { location.reload(); }) : "");
    if (!list.length) html += UI.empty("Aucune demande pour le moment.");
    else list.forEach(function (r) { html += requestCard(r); });
    return {
      html: html,
      nav: "prof-offres",
      onMount: function (root) {
        async function act(id, accept) {
          try {
            await api("/api/teacher/requests/" + id + "/" + (accept ? "accept" : "refuse"), { method: "POST", body: {} });
            UI.toast(accept ? "Demande acceptée" : "Demande refusée");
            location.reload();
          } catch (ex) { UI.toast(ex.message, true); }
        }
        root.querySelectorAll("[data-accept]").forEach(function (btn) {
          btn.addEventListener("click", function () { act(btn.dataset.accept, true); });
        });
        root.querySelectorAll("[data-refuse]").forEach(function (btn) {
          btn.addEventListener("click", function () { act(btn.dataset.refuse, false); });
        });
      },
    };
  }

  async function revenus(ctx) {
    var offline = false;
    var e = null;
    try { e = await api("/api/teacher/earnings"); } catch (err) { offline = true; e = FB.teacherEarnings; }
    var stats = (e.stats || []).map(function (s) {
      return '<div style="text-align:center;flex:1"><div style="font-weight:800">' + esc(s.value) + '</div><div class="muted" style="font-size:11px">' + esc(s.label) + '</div></div>';
    }).join("");
    var payouts = (e.payouts || []).map(function (p) {
      return UI.card('<div class="es-row"><div class="es-row-main"><div class="es-title">' + esc(p.provider || p.label) + '</div><div class="es-meta">' + esc(p.date) + '</div></div><strong>' + fcfa(p.amount) + ' F</strong></div>');
    }).join("");
    var html = UI.topBar("Revenus") + (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      UI.card('<div class="es-hero-title">Total</div><div class="es-hero-value">' + fcfa(e.total) + ' F</div><p class="muted">' + esc(e.trend || "") + '</p>') +
      UI.card('<div class="es-row" style="justify-content:space-around">' + stats + '</div>') +
      (payouts ? '<h3 style="margin:16px 0 8px">Retraits</h3>' + payouts : "") +
      UI.menuRow("Demander un retrait", "#/prof-retrait");
    return { html: html, nav: "prof-revenus" };
  }

  async function profil(ctx) {
    var offline = false;
    var p = null;
    try { p = await api("/api/teacher/profile"); } catch (e) { offline = true; }
    var html = UI.topBar("Mon profil prof", true) +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      '<form class="es-form" id="profForm">' +
      '<div class="field"><label>Localisation</label><input name="location" value="' + esc((p && p.location) || "") + '" /></div>' +
      '<div class="field"><label>Matières</label><input name="subjects" value="' + esc((p && p.subjects) || "") + '" /></div>' +
      '<div class="field"><label>Programmes (séparés par virgule)</label><input name="programs" value="' + esc(((p && p.programs) || []).join(", ")) + '" /></div>' +
      '<div class="field"><label>Niveaux (séparés par virgule)</label><input name="levels" value="' + esc(((p && p.levels) || []).join(", ")) + '" /></div>' +
      (p && p.profileCompletion ? '<p class="muted">Profil complété à ' + p.profileCompletion.percent + '%</p>' : '') +
      '<button type="submit" class="btn btn-primary btn-block">Enregistrer</button></form>';
    return {
      html: html,
      nav: "compte",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { location.hash = "#/compte"; });
        root.querySelector("#profForm").addEventListener("submit", async function (ev) {
          ev.preventDefault();
          var fd = new FormData(ev.target);
          var split = function (s) { return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); };
          try {
            await api("/api/teacher/profile", {
              method: "PUT",
              body: {
                location: fd.get("location"),
                subjects: fd.get("subjects"),
                programs: split(fd.get("programs")),
                levels: split(fd.get("levels")),
              },
            });
            UI.toast("Profil mis à jour");
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  global.MPP.Views = global.MPP.Views || {};
  global.MPP.Views.teacher = {
    dashboard: dashboard,
    offres: offres,
    revenus: revenus,
    profil: profil,
  };
})(window);
