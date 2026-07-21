/* Routeur hash — mapping des 37+ écrans */
(function (global) {
  "use strict";

  function parseHash() {
    var raw = (location.hash || "#/accueil").replace(/^#\/?/, "");
    var qIdx = raw.indexOf("?");
    var path = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    var query = {};
    if (qIdx >= 0) {
      raw.slice(qIdx + 1).split("&").forEach(function (pair) {
        var p = pair.split("=");
        if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
    }
    var parts = path.split("/").filter(Boolean);
    return { parts: parts, query: query, path: path };
  }

  function matchRoute(parsed) {
    var p = parsed.parts;
    var V = global.MPP.Views;

    if (!p.length || p[0] === "welcome") return { fn: V.misc.welcome, ctx: {} };
    if (p[0] === "accueil") return { fn: V.parent.accueil, ctx: {} };
    if (p[0] === "recherche" && p[1] === "filtres") return { fn: V.parent.filtres, ctx: { query: parsed.query } };
    if (p[0] === "recherche") return { fn: V.parent.recherche, ctx: { query: parsed.query } };
    if (p[0] === "prof" && p[1]) return { fn: V.parent.profil, ctx: { params: { id: p[1] } } };
    if (p[0] === "cours") return { fn: V.parent.cours, ctx: {} };
    if (p[0] === "progres") return { fn: V.parent.progres, ctx: {} };
    if (p[0] === "compte") return { fn: V.parent.compte, ctx: {} };
    if (p[0] === "enfants") return { fn: V.needs.enfants, ctx: {} };
    if (p[0] === "exprimer-besoin") return { fn: V.needs.exprimerBesoin, ctx: {} };
    if (p[0] === "mes-besoins") return { fn: V.needs.mesBesoins, ctx: {} };
    if (p[0] === "notifications") return { fn: V.misc.notifications, ctx: {} };
    if (p[0] === "portefeuille") return { fn: V.misc.portefeuille, ctx: {} };
    if (p[0] === "groupes" && p[1]) return { fn: V.misc.groupeDetail, ctx: { params: { id: p[1] } } };
    if (p[0] === "groupes") return { fn: V.misc.groupes, ctx: { query: parsed.query } };
    if (p[0] === "abonnement") return { fn: V.misc.abonnement, ctx: {} };
    if (p[0] === "parrainage") return { fn: V.misc.parrainage, ctx: {} };
    if (p[0] === "ressources") return { fn: V.misc.ressources, ctx: {} };
    if (p[0] === "legal") return { fn: V.misc.legal, ctx: {} };
    if (p[0] === "reservation") return { fn: V.misc.reservation, ctx: { query: parsed.query } };
    if (p[0] === "paiement-otp") return { fn: V.misc.paiementOtp, ctx: {} };
    if (p[0] === "paiement") return { fn: V.misc.paiement, ctx: {} };
    if (p[0] === "confirmation") return { fn: V.misc.confirmation, ctx: {} };
    if (p[0] === "prof-espace") return { fn: V.teacher.dashboard, ctx: {} };
    if (p[0] === "prof-offres") return { fn: V.teacher.offres, ctx: {} };
    if (p[0] === "prof-revenus") return { fn: V.teacher.revenus, ctx: {} };
    if (p[0] === "prof-profil") return { fn: V.teacher.profil, ctx: {} };
    if (p[0] === "prof-retrait") return { fn: V.misc.profRetrait, ctx: {} };
    if (p[0] === "agenda") return { fn: V.misc.agenda, ctx: {} };
    if (p[0] === "messages") return { fn: V.misc.messages, ctx: {} };
    if (p[0] === "cours-en-ligne") return { fn: V.misc.coursEnLigne, ctx: {} };
    if (p[0] === "avis") return { fn: V.misc.avis, ctx: {} };
    if (p[0] === "aide") return { fn: V.misc.aide, ctx: {} };
    if (p[0] === "parametres") return { fn: V.misc.parametres, ctx: {} };

    return { fn: V.parent.accueil, ctx: {} };
  }

  async function navigate() {
    var viewEl = document.getElementById("view");
    var navEl = document.getElementById("nav");
    if (!viewEl) return;

    var parsed = parseHash();
    var route = matchRoute(parsed);
    viewEl.innerHTML = global.MPP.UI.loading();

    var result;
    try {
      result = await route.fn(route.ctx);
    } catch (e) {
      viewEl.innerHTML = global.MPP.UI.topBar("Erreur") + global.MPP.UI.empty(e.message || "Erreur de chargement");
      return;
    }

    viewEl.innerHTML = result.html || "";
    if (navEl) {
      var isTeacher = global.MPP.Auth.isTeacher();
      var showNav = result.nav && !["reservation", "paiement", "paiement-otp", "confirmation", "welcome"].some(function (x) {
        return (location.hash || "").indexOf(x) >= 0;
      });
      if (showNav) {
        navEl.innerHTML = isTeacher ? global.MPP.UI.teacherNav(result.nav) : global.MPP.UI.parentNav(result.nav);
        navEl.hidden = false;
        document.body.style.paddingBottom = "";
      } else {
        navEl.innerHTML = "";
        navEl.hidden = true;
        document.body.style.paddingBottom = "0";
      }
    }

    if (result.onMount) result.onMount(viewEl);
    global.MPP.UI.bindRetry(viewEl, function () { navigate(); });
  }

  function defaultRouteForUser() {
    if (global.MPP.Auth.isTeacher()) return "#/prof-espace";
    return "#/accueil";
  }

  global.MPP = global.MPP || {};
  global.MPP.Router = { navigate: navigate, parseHash: parseHash, defaultRouteForUser: defaultRouteForUser };
})(window);
