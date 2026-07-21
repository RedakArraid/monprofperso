/* Bootstrap espace utilisateur */
(function () {
  "use strict";

  async function boot() {
    var user = await MPP.Auth.requireAuth();
    if (!user) return;

    if (user.role === "admin") {
      localStorage.setItem("mpp_admin_jwt", MPP.token.get());
      location.href = "/admin/";
      return;
    }

    if (!location.hash || location.hash === "#" || location.hash === "#/") {
      location.replace(MPP.Router.defaultRouteForUser());
      return;
    }

    window.addEventListener("hashchange", function () { MPP.Router.navigate(); });
    await MPP.Router.navigate();
  }

  boot().catch(function (e) {
    console.error(e);
    document.getElementById("view").innerHTML = MPP.UI.empty("Impossible de démarrer l'espace.");
  });
})();
