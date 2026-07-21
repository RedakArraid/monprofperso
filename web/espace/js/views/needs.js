/* Besoins parents — enfants, exprimer besoin, mes besoins */
(function (global) {
  "use strict";

  var api = global.MPP.api;
  var UI = global.MPP.UI;
  var esc = UI.esc;
  var fcfa = UI.fcfa;

  async function enfants(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/children") || []; } catch (e) { offline = true; list = global.MPP.Fallback.children; }
    var html = UI.topBar("Mes enfants", true) +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      '<form class="es-form" id="childForm">' +
      '<div class="field"><label>Prénom</label><input name="name" required /></div>' +
      '<div class="field"><label>Niveau</label><input name="level" placeholder="3ème" /></div>' +
      '<div class="field"><label>Établissement</label><input name="school" /></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Ajouter</button></form>';
    if (list.length) {
      html += '<h3 style="margin:16px 0 8px">Enregistrés</h3>';
      list.forEach(function (c) {
        html += UI.card('<div class="es-title">' + esc(c.name) + '</div><div class="es-meta">' + esc(c.level || "") + ' · ' + esc(c.school || "") + '</div>');
      });
    }
    return {
      html: html,
      nav: "compte",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { location.hash = "#/compte"; });
        root.querySelector("#childForm").addEventListener("submit", async function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          try {
            await api("/api/children", {
              method: "POST",
              body: {
                name: fd.get("name"),
                level: fd.get("level"),
                school: fd.get("school"),
                gender: "garcon",
                program: "standard",
              },
            });
            UI.toast("Enfant ajouté");
            location.reload();
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  async function exprimerBesoin(ctx) {
    var children = [];
    try { children = await api("/api/children") || []; } catch (_) {}
    var childOpts = children.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
    }).join("");
    var html = UI.topBar("Exprimer un besoin", true) +
      '<form class="es-form" id="needForm">' +
      '<div class="field"><label>Enfant</label><select name="childId"><option value="">—</option>' + childOpts + '</select></div>' +
      '<div class="field"><label>Matière</label><input name="subject" required placeholder="Maths" /></div>' +
      '<div class="field"><label>Niveau</label><input name="level" required placeholder="3ème" /></div>' +
      '<div class="field"><label>Format</label><select name="format"><option value="home">À domicile</option><option value="online">En ligne</option></select></div>' +
      '<div class="field"><label>Commune / lieu</label><input name="location" placeholder="Cocody" /></div>' +
      '<div class="field"><label>Fréquence</label><input name="frequency" placeholder="2×/semaine" /></div>' +
      '<div class="field"><label>Durée séance</label><input name="duration" placeholder="1h30" /></div>' +
      '<div class="field"><label>Description</label><textarea name="description" rows="3"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Envoyer ma demande</button></form>';
    return {
      html: html,
      nav: "accueil",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { history.back(); });
        root.querySelector("#needForm").addEventListener("submit", async function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var body = {
            subject: fd.get("subject"),
            level: fd.get("level"),
            format: fd.get("format"),
            location: fd.get("location"),
            frequency: fd.get("frequency"),
            duration: fd.get("duration"),
            description: fd.get("description"),
            availabilityWeek: true,
            availabilityWeekend: false,
            availabilityHolidays: false,
          };
          var cid = fd.get("childId");
          if (cid) body.childId = Number(cid);
          try {
            await api("/api/needs", { method: "POST", body: body });
            UI.toast("Demande envoyée");
            location.hash = "#/mes-besoins";
          } catch (ex) { UI.toast(ex.message, true); }
        });
      },
    };
  }

  function needCard(n, onAccept) {
    var status = UI.needStatusLabel(n.status);
    var price = n.parentPrice != null ? fcfa(n.parentPrice) + " F" : "—";
    var html = UI.card(
      '<div class="es-row"><div class="es-row-main">' +
      '<div class="es-title">' + esc(n.reference || ("Besoin #" + n.id)) + ' · ' + esc(n.subject) + '</div>' +
      '<div class="es-meta">' + esc(n.level) + ' · ' + esc(n.format === "online" ? "En ligne" : (n.location || "À domicile")) + '</div>' +
      '<span class="es-pill">' + esc(status) + '</span>' +
      (n.parentPrice != null ? '<div class="es-meta" style="margin-top:6px">Tarif proposé : <strong>' + price + '</strong></div>' : '') +
      '</div></div>'
    );
    if (n.status === "priced") {
      html += '<div class="es-btn-row"><button type="button" class="btn btn-primary btn-sm" data-accept="' + n.id + '">Accepter le tarif</button></div>';
    }
    return html;
  }

  async function mesBesoins(ctx) {
    var offline = false;
    var list = [];
    try { list = await api("/api/needs") || []; } catch (e) { offline = true; list = global.MPP.Fallback.needs; }
    var html = UI.topBar("Mes besoins", true) +
      (offline ? UI.offlineBanner(function () { location.reload(); }) : "") +
      '<a class="btn btn-primary btn-block" href="#/exprimer-besoin" style="margin-bottom:12px">Nouveau besoin</a>';
    if (!list.length) html += UI.empty("Aucune demande pour le moment.");
    else list.forEach(function (n) { html += needCard(n); });
    return {
      html: html,
      nav: "compte",
      onMount: function (root) {
        root.querySelector("[data-back]").addEventListener("click", function () { location.hash = "#/compte"; });
        root.querySelectorAll("[data-accept]").forEach(function (btn) {
          btn.addEventListener("click", async function () {
            try {
              await api("/api/needs/" + btn.dataset.accept + "/accept-price", { method: "POST", body: {} });
              UI.toast("Tarif accepté");
              location.reload();
            } catch (ex) { UI.toast(ex.message, true); }
          });
        });
      },
    };
  }

  global.MPP.Views = global.MPP.Views || {};
  global.MPP.Views.needs = { enfants: enfants, exprimerBesoin: exprimerBesoin, mesBesoins: mesBesoins };
})(window);
