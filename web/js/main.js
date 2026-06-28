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

  function setNavOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.classList.toggle("nav-open", open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle("visible", open);
      backdrop.setAttribute("aria-hidden", String(!open));
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNavOpen(!nav.classList.contains("open"));
    });
    if (backdrop) {
      backdrop.addEventListener("click", function () { setNavOpen(false); });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNavOpen(false);
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setNavOpen(false); });
    });
  }

  // --- Apparition au défilement (IntersectionObserver) ---
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
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

  // Liens légaux : pointent vers le PDF géré par l'admin (s'il existe).
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
        if (url) {
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
        var bits = [];
        if (s.contact_email) bits.push('<a href="mailto:' + s.contact_email + '">' + s.contact_email + "</a>");
        if (s.contact_phone) bits.push('<a href="tel:' + s.contact_phone.replace(/\s+/g, "") + '">' + s.contact_phone + "</a>");
        if (bits.length) { contact.innerHTML = bits.join(" · "); contact.hidden = false; }
      }
    })
    .catch(function () {});
})();
