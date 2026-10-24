(function () {
  "use strict";
  var base = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:8099" : location.origin;
  var status = document.getElementById("service-information-status");
  fetch(base + "/api/service-information", { cache: "no-store" })
    .then(function (response) { if (!response.ok) throw new Error("unavailable"); return response.json(); })
    .then(function (data) {
      var missing = 0;
      document.querySelectorAll("[data-service]").forEach(function (element) {
        var value = data[element.getAttribute("data-service")];
        if (typeof value === "string" && value.trim()) { element.textContent = value; element.style.whiteSpace = "pre-wrap"; }
        else missing++;
      });
      status.textContent = missing ? "Certaines informations ne sont pas encore publiées. Contactez le support avant tout engagement si une condition vous manque." : "Informations publiées par l’exploitant. Consultez également les documents légaux ci-dessous.";
    }).catch(function () { status.textContent = "Les informations n’ont pas pu être chargées. Actualisez la page pour réessayer."; });
})();
