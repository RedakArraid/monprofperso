/* Auth espace — session utilisateur */
(function (global) {
  "use strict";

  var user = null;

  function isTeacher() {
    return user && (user.role === "teacher" || user.teacher_id);
  }

  async function loadUser() {
    user = await global.MPP.api("/api/me");
    if (user) global.MPP.token.set(global.MPP.token.get(), user.role);
    return user;
  }

  function getUser() { return user; }

  function logout() {
    global.MPP.token.clear();
    user = null;
    location.href = "/connexion.html";
  }

  async function requireAuth() {
    if (!global.MPP.token.get()) {
      location.href = "/connexion.html";
      return null;
    }
    try {
      return await loadUser();
    } catch (e) {
      if (e.status === 401) {
        global.MPP.token.clear();
        location.href = "/connexion.html";
        return null;
      }
      throw e;
    }
  }

  global.MPP = global.MPP || {};
  global.MPP.Auth = { loadUser: loadUser, getUser: getUser, logout: logout, requireAuth: requireAuth, isTeacher: isTeacher };
})(window);
