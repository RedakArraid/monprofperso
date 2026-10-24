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

  // --- Lien connexion / Mon espace si session utilisateur ---
  var authLink = document.getElementById("authLink");
  if (authLink && localStorage.getItem("mpp_user_jwt")) {
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
