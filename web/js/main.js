/* Mon Prof Perso, interactions de la page vitrine (vanilla JS, sans dépendance). */
(function () {
  "use strict";

  // --- Année courante dans le pied de page ---
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // --- Menu mobile ---
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  var backdrop = document.getElementById("navBackdrop");

  var mobileNav = window.matchMedia("(max-width: 1100px)");
  function setNavOpen(open, restoreFocus) {
    if (!nav || !toggle) return;
    open = Boolean(open && mobileNav.matches);
    var wasOpen = nav.classList.contains("open");
    nav.classList.toggle("open", open);
    nav.inert = mobileNav.matches && !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.classList.toggle("nav-open", open);
    document.querySelectorAll("main, body > footer").forEach(function (element) { element.inert = open; });
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle("visible", open);
      backdrop.setAttribute("aria-hidden", String(!open));
    }
    if (open) nav.querySelector("a[href]")?.focus();
    else if (wasOpen && restoreFocus !== false && mobileNav.matches) toggle.focus();
  }

  if (toggle && nav) {
    setNavOpen(false, false);
    toggle.addEventListener("click", function () { setNavOpen(!nav.classList.contains("open")); });
    if (backdrop) backdrop.addEventListener("click", function () { setNavOpen(false); });
    document.addEventListener("keydown", function (event) {
      if (!nav.classList.contains("open")) return;
      if (event.key === "Escape") { event.preventDefault(); setNavOpen(false); }
      if (event.key === "Tab") {
        var items = Array.from(nav.querySelectorAll("a[href], button:not(:disabled)")).concat(toggle);
        var index = items.indexOf(document.activeElement);
        var next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index + 1) % items.length;
        event.preventDefault(); items[next].focus();
      }
    });
    nav.querySelectorAll("a").forEach(function (anchor) {
      anchor.addEventListener("click", function () {
        setNavOpen(false, false);
        if (anchor.pathname === location.pathname && anchor.hash) {
          var target = document.getElementById(anchor.hash.slice(1));
          if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
        }
      });
    });
    mobileNav.addEventListener("change", function () { setNavOpen(false, false); });
  }

  // --- Lien connexion / Mon espace si session utilisateur ---
  var authLink = document.getElementById("authLink");
  var hasSession = false;
  try { hasSession = Boolean(localStorage.getItem("mpp_user_jwt")); } catch (_) { /* Browsing remains available without storage. */ }
  if (authLink && hasSession) {
    authLink.textContent = "Mon espace";
    authLink.href = "espace/";
    authLink.classList.remove("btn-ghost");
    authLink.classList.add("btn-primary");
  }

  // --- Met en avant le store correspondant au système de l'utilisateur ---
  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var target = isIOS ? "ios" : isAndroid ? "android" : null;
  if (target) {
    document.querySelectorAll('.store-badge[data-store="' + target + '"]').forEach(function (b) {
      b.classList.add("highlight");
    });
  }

  // --- Réseaux sociaux, contact et documents légaux depuis l'API ---
  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8099"
    : location.origin;

  // Capabilities are shared with the API and native clients. Unavailable modules remain hidden.
  fetch(API_BASE + "/api/capabilities", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("capabilities"); return r.json(); })
    .then(function (capabilities) {
      document.querySelectorAll("[data-capability]").forEach(function (element) {
        var enabled = capabilities[element.getAttribute("data-capability")] === true;
        element.hidden = !enabled;
        element.querySelectorAll("input,button,select").forEach(function (input) { input.disabled = !enabled; });
      });
    }).catch(function () { /* Initially hidden; never enable a service on a failed request. */ });

  // Liens légaux : pointent vers le PDF géré par l'admin (s'il existe).
  document.querySelectorAll("[data-legal]").forEach(function (anchor) {
    anchor.removeAttribute("href"); anchor.setAttribute("aria-disabled", "true");
    anchor.setAttribute("title", "Document temporairement indisponible");
  });
  fetch(API_BASE + "/api/legal")
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (docs) {
      var bySlug = {};
      (docs || []).forEach(function (d) { bySlug[d.slug] = d; });
      document.querySelectorAll("[data-legal]").forEach(function (a) {
        var d = bySlug[a.getAttribute("data-legal")];
        if (d && d.hasFile) {
          a.setAttribute("href", API_BASE + "/api/legal/" + d.slug + "/file");
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener");
          a.removeAttribute("aria-disabled"); a.removeAttribute("title");
        } else {
          a.removeAttribute("href");
          a.setAttribute("aria-disabled", "true");
          a.setAttribute("title", "Document temporairement indisponible");
        }
      });
    })
    .catch(function () {});

  // Réseaux sociaux + contact : affiche uniquement les liens renseignés par l'admin.
  fetch(API_BASE + "/api/settings")
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (s) {
      s = s || {};
      document.querySelectorAll("[data-social]").forEach(function (a) {
        var url = s[a.getAttribute("data-social")];
        if (typeof url === "string" && /^https:\/\//i.test(url)) {
          a.setAttribute("href", url);
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener");
          a.hidden = false;
        } else {
          a.hidden = true;
        }
      });
      var contact = document.getElementById("footerContact");
      if (contact) {
        contact.replaceChildren();
        if (s.contact_email) {
          var emailLink = document.createElement("a"); emailLink.href = "mailto:" + s.contact_email;
          emailLink.textContent = s.contact_email; contact.appendChild(emailLink);
        }
        if (s.contact_phone) {
          if (contact.childNodes.length) contact.appendChild(document.createTextNode(" · "));
          var phoneLink = document.createElement("a"); phoneLink.href = "tel:" + s.contact_phone.replace(/\s+/g, "");
          phoneLink.textContent = s.contact_phone; contact.appendChild(phoneLink);
        }
        if (contact.childNodes.length) contact.hidden = false;
        else if (contact.hasAttribute("data-support")) { contact.textContent = "Les coordonnées du support sont temporairement indisponibles. Réessayez plus tard."; contact.hidden = false; }
      }
    })
    .catch(function () {
      var contact = document.querySelector("[data-support]");
      if (contact) { contact.textContent = "Impossible de charger les coordonnées du support. Actualisez la page pour réessayer."; contact.hidden = false; }
    });

  // Note moyenne réelle des professeurs (moyenne pondérée par le nombre d'avis).
  fetch(API_BASE + "/api/teachers")
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (teachers) {
      teachers = teachers || [];
      var totalReviews = 0, weighted = 0;
      teachers.forEach(function (t) {
        var count = Number(t.reviewsCount || t.reviews_count || 0);
        var rating = Number(t.rating || 0);
        totalReviews += count;
        weighted += rating * count;
      });
      var title = document.getElementById("trustRatingTitle");
      var text = document.getElementById("trustRatingText");
      if (totalReviews > 0 && title && text) {
        var avg = (weighted / totalReviews).toFixed(1).replace(".", ",");
        title.textContent = "Notés " + avg + "/5 par les familles";
        text.textContent = "Moyenne calculée sur " + totalReviews + " avis, " + teachers.length + " professeurs actifs sur la plateforme.";
      }
    })
    .catch(function () {});
})();
