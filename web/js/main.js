/* Mon Prof Perso — interactions de la page vitrine (vanilla JS, sans dépendance). */
(function () {
  "use strict";

  // --- Année courante dans le pied de page ---
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // --- Menu mobile ---
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Referme le menu après un clic sur un lien (mobile).
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
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
})();
