/* Composants UI partagés — espace utilisateur */
(function (global) {
  "use strict";

  var esc = global.MPP.esc;
  var fcfa = global.MPP.fcfa;

  var toastTimer;
  function toast(msg, isErr) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast" + (isErr ? " err" : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2800);
  }

  function offlineBanner(onRetry) {
    return '<div class="offline-banner">Hors-ligne — données de démonstration. <button type="button" class="link-btn" data-retry>Réessayer</button></div>';
  }

  function bindRetry(root, onRetry) {
    var btn = root.querySelector("[data-retry]");
    if (btn && onRetry) btn.addEventListener("click", onRetry);
  }

  function topBar(title, back) {
    var backBtn = back ? '<button type="button" class="icon-btn" data-back aria-label="Retour">←</button>' : "";
    return '<header class="es-topbar">' + backBtn + '<h1>' + esc(title) + '</h1><div class="es-topbar-actions" id="topbarActions"></div></header>';
  }

  function parentNav(active) {
    var items = [
      { id: "accueil", label: "Accueil", icon: "🏠" },
      { id: "recherche", label: "Recherche", icon: "🔍" },
      { id: "cours", label: "Cours", icon: "📚" },
      { id: "progres", label: "Progrès", icon: "📈" },
      { id: "compte", label: "Compte", icon: "👤" },
    ];
    return bottomNav(items, active);
  }

  function teacherNav(active) {
    var items = [
      { id: "prof-espace", label: "Tableau", icon: "📊" },
      { id: "prof-offres", label: "Demandes", icon: "📥" },
      { id: "agenda", label: "Agenda", icon: "📅" },
      { id: "prof-revenus", label: "Revenus", icon: "💰" },
      { id: "compte", label: "Compte", icon: "👤" },
    ];
    return bottomNav(items, active);
  }

  function bottomNav(items, active) {
    return '<nav class="es-bottomnav">' + items.map(function (it) {
      var cls = "es-nav-item" + (active === it.id ? " active" : "");
      return '<a class="' + cls + '" href="#/' + it.id + '"><span class="es-nav-icon">' + it.icon + '</span><span>' + esc(it.label) + '</span></a>';
    }).join("") + '</nav>';
  }

  function card(html, cls) {
    return '<div class="es-card' + (cls ? " " + cls : "") + '">' + html + '</div>';
  }

  function loading() {
    return '<p class="muted es-loading">Chargement…</p>';
  }

  function empty(msg) {
    return '<p class="muted es-empty">' + esc(msg || "Rien à afficher.") + '</p>';
  }

  function menuRow(label, href, extra) {
    return '<a class="es-menu-row" href="' + esc(href) + '"><span>' + esc(label) + '</span><span class="es-chevron">›</span></a>' + (extra || "");
  }

  function progressBar(label, grade, fraction, warn) {
    var pct = Math.round((fraction || 0) * 100);
    var color = warn ? "orange" : "green";
    return '<div class="es-progress-item"><div class="es-progress-head"><span>' + esc(label) + '</span><span class="' + color + '">' + esc(grade) + '</span></div>' +
      '<div class="es-progress-track"><div class="es-progress-fill ' + color + '" style="width:' + pct + '%"></div></div></div>';
  }

  function needStatusLabel(s) {
    return ({ submitted: "En analyse", priced: "Tarif proposé", published: "Recherche prof", matched: "Prof trouvé", cancelled: "Annulé" })[s] || s;
  }

  global.MPP = global.MPP || {};
  global.MPP.UI = {
    toast: toast,
    offlineBanner: offlineBanner,
    bindRetry: bindRetry,
    topBar: topBar,
    parentNav: parentNav,
    teacherNav: teacherNav,
    card: card,
    loading: loading,
    empty: empty,
    menuRow: menuRow,
    progressBar: progressBar,
    needStatusLabel: needStatusLabel,
    fcfa: fcfa,
    esc: esc,
  };
})(window);
