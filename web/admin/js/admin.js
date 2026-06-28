/* =====================================================================
 * Console d'administration, Mon Prof Perso
 * Vanilla JS (sans build), consomme l'API REST commune (mêmes endpoints
 * que les apps). Authentification : JWT admin stocké dans localStorage.
 * ===================================================================== */

// --- Base de l'API : même origine en prod (proxy nginx /api), localhost en dev. ---
const API_BASE = window.MPP_API_BASE || ((location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:8099"
  : location.origin);

function normalizePhone(raw) {
  let p = String(raw ?? "").trim().replace(/[\s.-]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
  else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
  return p;
}

const TOKEN_KEY = "mpp_admin_jwt";
const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (v) => localStorage.setItem(TOKEN_KEY, v),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// --- Appel API générique (sans cache navigateur : évite les 304 sans corps). ---
async function api(path, { method = "GET", body, headers = {} } = {}) {
  const opt = { method, cache: "no-store", headers: { ...headers } };
  const t = token.get();
  if (t) opt.headers["Authorization"] = "Bearer " + t;
  if (body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_BASE + path, opt);
  } catch (_) {
    throw new Error("Impossible de joindre l'API. Vérifiez votre connexion.");
  }
  if (res.status === 204) return null;
  if (res.status === 304) {
    throw new Error("Réponse cache invalide, rechargez la page.");
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { /* corps non JSON */ }
  }
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Page API introuvable. Ouvrez https://monprofperso.com/admin/ pour vous connecter.");
    }
    const err = new Error((data && (data.message || data.error)) || ("Erreur " + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function asList(v) { return Array.isArray(v) ? v : []; }

// --- Utilitaires UI. ---
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fcfa = (n) => (n == null ? "" : Number(n).toLocaleString("fr-FR"));

let toastTimer;
function toast(msg, isErr = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast" + (isErr ? " err" : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

function slugify(input) {
  return String(input).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// --- Lecture d'un fichier -> base64 (sans préfixe data:). ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// --- Modale générique. ---
function modal(title, innerHTML, onMount) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${innerHTML}</div>`;
  back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
  const close = () => back.remove();
  if (onMount) onMount(back, close);
  return { back, close };
}

/* =====================================================================
 * Connexion
 * ===================================================================== */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = normalizePhone($("#phone").value);
  const btn = $("#loginBtn");
  const err = $("#loginErr");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = "Connexion…";
  try {
    if (!phone) throw new Error("Indiquez votre numéro administrateur.");
    const r = await api("/api/auth/login", { method: "POST", body: { phone } });
    if (!r || !r.token) throw new Error("Réponse invalide");
    if (!r.user || r.user.role !== "admin") {
      throw new Error("Ce compte n'est pas administrateur.");
    }
    token.set(r.token);
    enterApp(r.user);
  } catch (ex) {
    err.textContent = ex.message || "Connexion impossible";
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Se connecter";
  }
});

function logout() {
  token.clear();
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#phone").value = "";
}

async function enterApp(user) {
  $("#login").hidden = true;
  $("#app").hidden = false;
  $("#who").textContent = user ? (user.full_name || "Administrateur") : "Administrateur";
  navigate("dashboard");
}

// --- Reprise de session : vérifie le token via /api/me. ---
async function boot() {
  if (!token.get()) return;
  try {
    const me = await api("/api/me");
    if (me && me.role === "admin") { enterApp(me); return; }
  } catch (_) { /* token invalide */ }
  token.clear();
}

/* =====================================================================
 * Navigation
 * ===================================================================== */
const VIEWS = {
  dashboard: { title: "Tableau de bord", render: renderDashboard },
  teachers: { title: "Professeurs", render: renderTeachers },
  groups: { title: "Cours de groupe", render: renderGroups },
  catalog: { title: "Matières & niveaux", render: renderCatalog },
  resources: { title: "Ressources pédagogiques", render: renderResources },
  legal: { title: "Documents légaux", render: renderLegal },
  social: { title: "Réseaux sociaux & contact", render: renderSocial },
};

function navigate(view) {
  const v = VIEWS[view] || VIEWS.dashboard;
  $("#viewTitle").textContent = v.title;
  document.querySelectorAll(".menu-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  $("#content").innerHTML = `<p class="muted">Chargement…</p>`;
  $(".sidebar").classList.remove("open");
  v.render($("#content")).catch((e) => {
    if (e.status === 401 || e.status === 403) { toast("Session expirée", true); logout(); return; }
    $("#content").innerHTML = `<div class="card"><p class="muted">Erreur de chargement : ${esc(e.message)}</p></div>`;
  });
}

$("#menu").addEventListener("click", (e) => {
  const b = e.target.closest(".menu-item");
  if (b) navigate(b.dataset.view);
});
$("#logoutBtn").addEventListener("click", logout);
$("#burger").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

/* =====================================================================
 * Vue : Tableau de bord
 * ===================================================================== */
async function renderDashboard(root) {
  const [subjects, levels, teachers, groups, resources] = await Promise.all([
    api("/api/subjects"), api("/api/levels"), api("/api/teachers"),
    api("/api/groups"), api("/api/resources"),
  ]).then((rows) => rows.map(asList));
  const cards = [
    ["Professeurs", teachers.length, "teachers"],
    ["Cours de groupe", groups.length, "groups"],
    ["Matières", subjects.length, "catalog"],
    ["Niveaux", levels.length, "catalog"],
    ["Ressources", resources.length, "resources"],
  ];
  root.innerHTML = `
    <div class="stats-grid">
      ${cards.map(([lbl, n, v]) => `
        <div class="stat-card" role="button" data-go="${v}" style="cursor:pointer">
          <div class="num">${n}</div><div class="lbl">${esc(lbl)}</div>
        </div>`).join("")}
    </div>
    <div class="card">
      <h3>Bienvenue 👋</h3>
      <p class="card-sub">Gérez ici toute la plateforme : professeurs, cours de groupe,
      catalogue, ressources pédagogiques, documents légaux (CGU…) et réseaux sociaux.</p>
    </div>`;
  root.querySelectorAll("[data-go]").forEach((c) =>
    c.addEventListener("click", () => navigate(c.dataset.go)));
}

/* =====================================================================
 * Vue : Professeurs
 * ===================================================================== */
async function renderTeachers(root) {
  const teachers = asList(await api("/api/teachers"));
  root.innerHTML = `
    <div class="section-head">
      <h3>Professeurs <span class="count">${teachers.length}</span></h3>
      <button class="btn btn-primary btn-sm" id="addT">+ Ajouter un professeur</button>
    </div>
    <div class="list" id="tList">
      ${teachers.length ? "" : `<p class="empty">Aucun professeur pour l'instant.</p>`}
      ${teachers.map(teacherRow).join("")}
    </div>`;
  $("#addT").addEventListener("click", () => teacherForm());
  root.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => teacherForm(teachers.find((t) => String(t.id) === b.dataset.edit))));
  root.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => confirmDelete("ce professeur", async () => {
      await api("/api/admin/teachers/" + b.dataset.del, { method: "DELETE" });
      toast("Professeur supprimé"); navigate("teachers");
    })));
}

function teacherRow(t) {
  return `<div class="row">
    <span class="dot ${t.accent === "orange" ? "orange" : "green"}"></span>
    <div class="row-main">
      <div class="row-title">${esc(t.name)}
        ${t.verified ? `<span class="pill green">vérifié</span>` : ""}
        ${t.special_bepc ? `<span class="pill orange">BEPC</span>` : ""}
        ${t.negotiable ? `<span class="pill orange">à négocier</span>` : ""}</div>
      <div class="row-meta">${esc(t.subjects)} · ${esc(t.location)} · ${fcfa(t.price_per_hour)} F/h · ★ ${t.rating}</div>
    </div>
    <div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-edit="${t.id}">Modifier</button>
      <button class="btn btn-danger btn-sm" data-del="${t.id}">Suppr.</button>
    </div>
  </div>`;
}

function teacherForm(t) {
  const isEdit = !!t;
  t = t || {};
  const fmt = t.formats || ["home", "online"];
  const html = `
    <div class="form-grid">
      <div class="field full"><label>Nom complet *</label><input id="f_name" value="${esc(t.name || "")}" placeholder="Koffi N'Guessan"></div>
      <div class="field full"><label>Matières *</label><input id="f_subjects" value="${esc(t.subjects || "")}" placeholder="Maths · Physique-Chimie"></div>
      <div class="field"><label>Quartier / Ville</label><input id="f_location" value="${esc(t.location || "")}" placeholder="Cocody"></div>
      <div class="field"><label>Prix / heure (F)</label><input id="f_price" type="number" value="${t.price_per_hour ?? 4000}"></div>
      <div class="field"><label>Note (0-5)</label><input id="f_rating" type="number" step="0.1" min="0" max="5" value="${t.rating ?? 5}"></div>
      <div class="field"><label>Nb d'avis</label><input id="f_reviews" type="number" value="${t.reviews_count ?? 0}"></div>
      <div class="field"><label>Expérience</label><input id="f_exp" value="${esc(t.experience || "")}" placeholder="8 ans"></div>
      <div class="field"><label>Élèves</label><input id="f_students" value="${esc(t.students || "")}" placeholder="340+"></div>
      <div class="field"><label>Réussite BAC</label><input id="f_bac" value="${esc(t.bac_success || "")}" placeholder="94%"></div>
      <div class="field"><label>Couleur</label>
        <select id="f_accent"><option value="green"${t.accent !== "orange" ? " selected" : ""}>Vert</option><option value="orange"${t.accent === "orange" ? " selected" : ""}>Orange</option></select></div>
      <div class="field full"><label>Niveaux (séparés par des virgules)</label><input id="f_levels" value="${esc((t.levels || []).join(", "))}" placeholder="Collège, Lycée, Prépa BAC"></div>
      <div class="field"><label>Programmes (slugs séparés par des virgules)</label><input id="f_programs" value="${esc((t.programs || ["standard"]).join(", "))}" placeholder="standard, francais"></div>
      <div class="field"><label>Offres à négocier</label>
        <select id="f_negotiable"><option value="no"${t.negotiable ? "" : " selected"}>Non</option><option value="yes"${t.negotiable ? " selected" : ""}>Oui, tarif &amp; fréquence négociables</option></select></div>
      <div class="field"><label>Formats</label>
        <select id="f_formats"><option value="home,online"${fmt.length === 2 ? " selected" : ""}>Domicile + En ligne</option><option value="home"${fmt.length === 1 && fmt[0] === "home" ? " selected" : ""}>Domicile</option><option value="online"${fmt.length === 1 && fmt[0] === "online" ? " selected" : ""}>En ligne</option></select></div>
      <div class="field"><label>Options</label>
        <select id="f_flags">
          <option value="vb"${t.verified !== false && t.special_bepc ? " selected" : ""}>Vérifié + spécialiste BEPC</option>
          <option value="v"${(t.verified !== false && !t.special_bepc) || !isEdit && false ? " selected" : ""}>Vérifié</option>
          <option value="n"${t.verified === false ? " selected" : ""}>Non vérifié</option>
        </select></div>
      <div class="field full"><label>Biographie</label><textarea id="f_bio" placeholder="Présentation du professeur…">${esc(t.bio || "")}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="save">${isEdit ? "Enregistrer" : "Ajouter"}</button>
      <button class="btn btn-ghost" id="cancel">Annuler</button>
    </div>`;
  modal(isEdit ? "Modifier le professeur" : "Nouveau professeur", html, (back, close) => {
    $("#cancel", back).addEventListener("click", close);
    $("#save", back).addEventListener("click", async () => {
      const flags = $("#f_flags", back).value;
      const body = {
        name: $("#f_name", back).value.trim(),
        subjects: $("#f_subjects", back).value.trim(),
        location: $("#f_location", back).value.trim() || undefined,
        pricePerHour: Number($("#f_price", back).value) || 0,
        rating: Number($("#f_rating", back).value) || 0,
        reviewsCount: Number($("#f_reviews", back).value) || 0,
        experience: $("#f_exp", back).value.trim() || undefined,
        students: $("#f_students", back).value.trim() || undefined,
        bacSuccess: $("#f_bac", back).value.trim() || undefined,
        accent: $("#f_accent", back).value,
        levels: $("#f_levels", back).value.split(",").map((s) => s.trim()).filter(Boolean),
        programs: $("#f_programs", back).value.split(",").map((s) => s.trim()).filter(Boolean),
        formats: $("#f_formats", back).value.split(","),
        bio: $("#f_bio", back).value.trim() || undefined,
        verified: flags !== "n",
        specialBepc: flags === "vb",
        negotiable: $("#f_negotiable", back).value === "yes",
      };
      if (!body.name || !body.subjects) { toast("Nom et matières sont requis", true); return; }
      try {
        if (isEdit) await api("/api/admin/teachers/" + t.id, { method: "PUT", body });
        else await api("/api/admin/teachers", { method: "POST", body });
        close(); toast(isEdit ? "Professeur modifié" : "Professeur ajouté"); navigate("teachers");
      } catch (e) { toast(e.message, true); }
    });
  });
}

/* =====================================================================
 * Vue : Cours de groupe
 * ===================================================================== */
async function renderGroups(root) {
  const groups = asList(await api("/api/groups"));
  root.innerHTML = `
    <div class="section-head">
      <h3>Cours de groupe <span class="count">${groups.length}</span></h3>
      <button class="btn btn-primary btn-sm" id="addG">+ Ajouter un cours de groupe</button>
    </div>
    <div class="list">
      ${groups.length ? "" : `<p class="empty">Aucun cours de groupe.</p>`}
      ${groups.map(groupRow).join("")}
    </div>`;
  $("#addG").addEventListener("click", () => groupForm());
  root.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => groupForm(groups.find((g) => String(g.id) === b.dataset.edit))));
  root.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => confirmDelete("ce cours de groupe", async () => {
      await api("/api/admin/groups/" + b.dataset.del, { method: "DELETE" });
      toast("Cours supprimé"); navigate("groups");
    })));
}

function groupRow(g) {
  const places = g.places_left != null ? ` · ${g.places_left} places restantes` : "";
  return `<div class="row">
    <span class="dot ${g.tag_accent === "orange" ? "orange" : "green"}"></span>
    <div class="row-main">
      <div class="row-title">${esc(g.title)} <span class="pill ${g.tag_accent === "orange" ? "orange" : "green"}">${esc(g.tag)}</span></div>
      <div class="row-meta">${esc(g.detail)} · ${fcfa(g.price)} F${g.teacher_name ? " · " + esc(g.teacher_name) : ""}${places}</div>
    </div>
    <div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-edit="${g.id}">Modifier</button>
      <button class="btn btn-danger btn-sm" data-del="${g.id}">Suppr.</button>
    </div>
  </div>`;
}

function groupForm(g) {
  const isEdit = !!g;
  g = g || {};
  const html = `
    <div class="form-grid">
      <div class="field"><label>Étiquette *</label><input id="g_tag" value="${esc(g.tag || "")}" placeholder="PRÉPA BAC"></div>
      <div class="field"><label>Couleur étiquette</label>
        <select id="g_tagAccent"><option value="orange"${g.tag_accent === "orange" ? " selected" : ""}>Orange</option><option value="green"${g.tag_accent !== "orange" ? " selected" : ""}>Vert</option></select></div>
      <div class="field full"><label>Titre *</label><input id="g_title" value="${esc(g.title || "")}" placeholder="Maths & Physique-Chimie"></div>
      <div class="field full"><label>Détail *</label><input id="g_detail" value="${esc(g.detail || "")}" placeholder="Terminale D · 8 semaines · Sam & Dim"></div>
      <div class="field"><label>Prix (F)</label><input id="g_price" type="number" value="${g.price ?? 2000}"></div>
      <div class="field"><label>Professeur</label><input id="g_teacher" value="${esc(g.teacher_name || "")}" placeholder="Koffi N'Guessan"></div>
      <div class="field"><label>Inscrits</label><input id="g_enrolled" type="number" value="${g.enrolled ?? ""}"></div>
      <div class="field"><label>Capacité</label><input id="g_capacity" type="number" value="${g.capacity ?? ""}"></div>
      <div class="field"><label>Places restantes</label><input id="g_places" type="number" value="${g.places_left ?? ""}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="save">${isEdit ? "Enregistrer" : "Ajouter"}</button>
      <button class="btn btn-ghost" id="cancel">Annuler</button>
    </div>`;
  modal(isEdit ? "Modifier le cours de groupe" : "Nouveau cours de groupe", html, (back, close) => {
    $("#cancel", back).addEventListener("click", close);
    $("#save", back).addEventListener("click", async () => {
      const num = (id) => { const v = $(id, back).value; return v === "" ? undefined : Number(v); };
      const teacher = $("#g_teacher", back).value.trim();
      const body = {
        tag: $("#g_tag", back).value.trim(),
        tagAccent: $("#g_tagAccent", back).value,
        title: $("#g_title", back).value.trim(),
        detail: $("#g_detail", back).value.trim(),
        price: num("#g_price") ?? 0,
        teacherName: teacher || undefined,
        teacherInitials: teacher ? teacher.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() : undefined,
        enrolled: num("#g_enrolled"),
        capacity: num("#g_capacity"),
        placesLeft: num("#g_places"),
      };
      if (!body.tag || !body.title || !body.detail) { toast("Étiquette, titre et détail sont requis", true); return; }
      try {
        if (isEdit) await api("/api/admin/groups/" + g.id, { method: "PUT", body });
        else await api("/api/admin/groups", { method: "POST", body });
        close(); toast(isEdit ? "Cours modifié" : "Cours ajouté"); navigate("groups");
      } catch (e) { toast(e.message, true); }
    });
  });
}

/* =====================================================================
 * Vue : Matières & niveaux
 * ===================================================================== */
async function renderCatalog(root) {
  const [subjects, levels, programs] = await Promise.all([
    api("/api/subjects"), api("/api/levels"), api("/api/programs"),
  ]).then((rows) => rows.map(asList));
  root.innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Matières <span class="count">${subjects.length}</span></h3></div>
      <div class="form-grid">
        <div class="field"><label>Nouvelle matière</label><input id="s_name" placeholder="Ex. Musique, Espagnol…"></div>
        <div class="field"><label>Couleur</label><select id="s_accent"><option value="green">Vert</option><option value="orange">Orange</option></select></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary btn-sm" id="addS">+ Ajouter la matière</button></div>
      <hr class="divider">
      <div class="list" id="sList">${subjects.map((s) => catalogRow(s.name, s.slug, s.accent, "s")).join("")}</div>
    </div>
    <div class="card">
      <div class="section-head"><h3>Niveaux <span class="count">${levels.length}</span></h3></div>
      <div class="form-grid">
        <div class="field full"><label>Nouveau niveau</label><input id="l_name" placeholder="Ex. Université, Master…"></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary btn-sm" id="addL">+ Ajouter le niveau</button></div>
      <hr class="divider">
      <div class="list" id="lList">${levels.map((l) => catalogRow(l.name, l.slug, "green", "l")).join("")}</div>
    </div>
    <div class="card">
      <div class="section-head"><h3>Programmes <span class="count">${programs.length}</span></h3></div>
      <p class="card-sub">Programmes scolaires (jusqu'en Terminale) : standard, français…</p>
      <div class="form-grid">
        <div class="field full"><label>Nouveau programme</label><input id="p_name" placeholder="Ex. Programme Cambridge…"></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary btn-sm" id="addP">+ Ajouter le programme</button></div>
      <hr class="divider">
      <div class="list" id="pList">${programs.map((p) => catalogRow(p.name, p.slug, "orange", "p")).join("")}</div>
    </div>`;
  $("#addS").addEventListener("click", async () => {
    const name = $("#s_name").value.trim();
    if (!name) return;
    try {
      await api("/api/admin/subjects", { method: "POST", body: { slug: slugify(name), name, accent: $("#s_accent").value, icon: "more" } });
      toast("Matière ajoutée"); navigate("catalog");
    } catch (e) { toast(e.message, true); }
  });
  $("#addL").addEventListener("click", async () => {
    const name = $("#l_name").value.trim();
    if (!name) return;
    try {
      await api("/api/admin/levels", { method: "POST", body: { slug: slugify(name), name, ord: levels.length + 1 } });
      toast("Niveau ajouté"); navigate("catalog");
    } catch (e) { toast(e.message, true); }
  });
  $("#addP").addEventListener("click", async () => {
    const name = $("#p_name").value.trim();
    if (!name) return;
    try {
      await api("/api/admin/programs", { method: "POST", body: { slug: slugify(name), name, ord: programs.length + 1 } });
      toast("Programme ajouté"); navigate("catalog");
    } catch (e) { toast(e.message, true); }
  });
  const kindMap = { s: ["subjects", "cette matière"], l: ["levels", "ce niveau"], p: ["programs", "ce programme"] };
  root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    const [kind, slug] = b.dataset.del.split(":");
    const [path, label] = kindMap[kind];
    confirmDelete(label, async () => {
      await api(`/api/admin/${path}/${slug}`, { method: "DELETE" });
      toast("Supprimé"); navigate("catalog");
    });
  }));
}

function catalogRow(name, slug, accent, kind) {
  return `<div class="row">
    <span class="dot ${accent === "orange" ? "orange" : "green"}"></span>
    <div class="row-main"><div class="row-title">${esc(name)}</div><div class="row-meta">${esc(slug)}</div></div>
    <div class="row-actions"><button class="btn btn-danger btn-sm" data-del="${kind}:${esc(slug)}">Suppr.</button></div>
  </div>`;
}

/* =====================================================================
 * Vue : Ressources pédagogiques
 * ===================================================================== */
const R_TYPES = { course: "Cours", homework: "Devoir", exercise: "Exercice" };

async function renderResources(root) {
  const [subjects, levels, resources] = await Promise.all([
    api("/api/subjects"), api("/api/levels"), api("/api/resources"),
  ]).then((rows) => rows.map(asList));
  root.innerHTML = `
    <div class="card">
      <h3>Nouvelle ressource</h3>
      <p class="card-sub">Cours, devoir ou exercice, avec un fichier optionnel (PDF, image…).</p>
      <div class="form-grid">
        <div class="field"><label>Type</label><select id="r_type">${Object.entries(R_TYPES).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
        <div class="field"><label>Fichier (optionnel)</label><input id="r_file" type="file" accept="application/pdf,image/*"></div>
        <div class="field full"><label>Titre *</label><input id="r_title" placeholder="Fiche, Théorème de Thalès"></div>
        <div class="field"><label>Matière</label><select id="r_subject"><option value="">- Aucune -</option>${subjects.map((s) => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Niveau</label><select id="r_level"><option value="">- Aucun -</option>${levels.map((l) => `<option value="${esc(l.slug)}">${esc(l.name)}</option>`).join("")}</select></div>
        <div class="field full"><label>Description</label><textarea id="r_desc" placeholder="Quelques mots sur la ressource…"></textarea></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="addR">+ Ajouter la ressource</button></div>
    </div>
    <div class="section-head"><h3>Ressources <span class="count">${resources.length}</span></h3></div>
    <div class="list">
      ${resources.length ? "" : `<p class="empty">Aucune ressource.</p>`}
      ${resources.map(resourceRow).join("")}
    </div>`;
  $("#addR").addEventListener("click", async () => {
    const title = $("#r_title").value.trim();
    if (!title) { toast("Le titre est requis", true); return; }
    const body = { type: $("#r_type").value, title };
    const subj = $("#r_subject").value; if (subj) body.subjectSlug = subj;
    const lvl = $("#r_level").value; if (lvl) body.level = lvl;
    const desc = $("#r_desc").value.trim(); if (desc) body.description = desc;
    const file = $("#r_file").files[0];
    try {
      if (file) {
        body.contentBase64 = await fileToBase64(file);
        body.fileName = file.name;
        body.mimeType = file.type || "application/octet-stream";
      }
      await api("/api/admin/resources", { method: "POST", body });
      toast("Ressource ajoutée"); navigate("resources");
    } catch (e) { toast(e.message, true); }
  });
  root.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => confirmDelete("cette ressource", async () => {
      await api("/api/admin/resources/" + b.dataset.del, { method: "DELETE" });
      toast("Ressource supprimée"); navigate("resources");
    })));
  root.querySelectorAll("[data-file]").forEach((a) =>
    a.setAttribute("href", API_BASE + "/api/files/" + a.dataset.file));
}

function resourceRow(r) {
  const tags = [r.subject_slug, r.level].filter(Boolean).join(" · ");
  const accent = r.type === "homework" ? "orange" : "green";
  return `<div class="row">
    <div class="row-main">
      <div class="row-title"><span class="pill ${accent}">${esc(R_TYPES[r.type] || r.type)}</span> ${esc(r.title)}</div>
      <div class="row-meta">${tags ? esc(tags) : "-"}${r.file_name ? ` · 📎 <a data-file="${r.id}" target="_blank" rel="noopener">${esc(r.file_name)}</a>` : ""}</div>
    </div>
    <div class="row-actions"><button class="btn btn-danger btn-sm" data-del="${r.id}">Suppr.</button></div>
  </div>`;
}

/* =====================================================================
 * Vue : Documents légaux (CGU, confidentialité, mentions)
 * ===================================================================== */
async function renderLegal(root) {
  const docs = asList(await api("/api/legal"));
  root.innerHTML = `
    <div class="card">
      <h3>Documents légaux</h3>
      <p class="card-sub">Téléversez le PDF de chaque document. Conformité Loi CI N°2013-450.</p>
      <div class="list">
        ${docs.map(legalRow).join("")}
      </div>
    </div>`;
  root.querySelectorAll("[data-up]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const body = {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          contentBase64: await fileToBase64(file),
        };
        await api("/api/admin/legal/" + input.dataset.up, { method: "PUT", body });
        toast("Document mis à jour"); navigate("legal");
      } catch (e) { toast(e.message, true); }
    });
  });
  root.querySelectorAll("[data-file]").forEach((a) =>
    a.setAttribute("href", API_BASE + "/api/legal/" + a.dataset.file + "/file"));
}

function legalRow(d) {
  return `<div class="row">
    <div class="row-main">
      <div class="row-title">${esc(d.title)}</div>
      <div class="row-meta">${d.version ? "v" + esc(d.version) + " · " : ""}${d.hasFile ? `📎 <a data-file="${esc(d.slug)}" target="_blank" rel="noopener">${esc(d.file_name || "PDF")}</a>` : "aucun fichier"}</div>
    </div>
    <div class="row-actions">
      <label class="btn btn-ghost btn-sm" style="display:inline-block">
        ${d.hasFile ? "Remplacer le PDF" : "Téléverser un PDF"}
        <input type="file" accept="application/pdf" data-up="${esc(d.slug)}" hidden>
      </label>
    </div>
  </div>`;
}

/* =====================================================================
 * Vue : Réseaux sociaux & contact
 * ===================================================================== */
const SOCIAL_FIELDS = [
  ["social_facebook", "Facebook", "https://facebook.com/…"],
  ["social_instagram", "Instagram", "https://instagram.com/…"],
  ["social_tiktok", "TikTok", "https://tiktok.com/@…"],
  ["social_whatsapp", "WhatsApp", "https://wa.me/2250700000000"],
  ["social_linkedin", "LinkedIn", "https://linkedin.com/company/…"],
  ["social_x", "X (Twitter)", "https://x.com/…"],
  ["social_youtube", "YouTube", "https://youtube.com/@…"],
  ["contact_email", "E-mail de contact", "contact@monprofperso.com"],
  ["contact_phone", "Téléphone de contact", "+225 07 00 00 00 01"],
];

async function renderSocial(root) {
  const settings = await api("/api/settings");
  root.innerHTML = `
    <div class="card">
      <h3>Réseaux sociaux &amp; contact</h3>
      <p class="card-sub">Ces liens s'affichent sur le site vitrine et dans les applications.
      Laissez un champ vide pour le masquer.</p>
      <div class="form-grid">
        ${SOCIAL_FIELDS.map(([key, label, ph]) => `
          <div class="field${key.startsWith("contact") ? "" : " full"}">
            <label>${esc(label)}</label>
            <input id="set_${key}" value="${esc(settings[key] || "")}" placeholder="${esc(ph)}">
          </div>`).join("")}
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="saveSet">Enregistrer</button></div>
    </div>`;
  $("#saveSet").addEventListener("click", async () => {
    const body = {};
    SOCIAL_FIELDS.forEach(([key]) => { body[key] = $("#set_" + key).value.trim(); });
    try {
      await api("/api/admin/settings", { method: "PUT", body });
      toast("Paramètres enregistrés");
    } catch (e) { toast(e.message, true); }
  });
}

/* =====================================================================
 * Confirmation de suppression
 * ===================================================================== */
function confirmDelete(label, onConfirm) {
  modal("Confirmer la suppression",
    `<p class="muted" style="margin-bottom:18px">Voulez-vous vraiment supprimer ${esc(label)} ? Cette action est définitive.</p>
     <div class="form-actions"><button class="btn btn-danger" id="ok">Supprimer</button><button class="btn btn-ghost" id="no">Annuler</button></div>`,
    (back, close) => {
      $("#no", back).addEventListener("click", close);
      $("#ok", back).addEventListener("click", async () => {
        try { await onConfirm(); close(); } catch (e) { toast(e.message, true); }
      });
    });
}

boot();
