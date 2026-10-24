/* Course, financial and privacy operations. All writes are acknowledged by the API. */
function opStatus(value) {
  return ({ requested: "Demandé", awaiting_schedule: "À planifier", scheduled: "Programmé", completion_pending: "Réalisation à confirmer", completed: "Réalisé", disputed: "Litige", cancelled: "Annulé", refused: "Refusé", pending: "En attente", approved: "Approuvé — exécution à suivre", verified: "Confirmé par le prestataire", rejected: "Refusé", reversed: "Versement inversé — à examiner", paid: "Payé", unpaid: "Non payé", uncollected: "Non encaissé", partially_refunded: "Remboursé en partie", refunded: "Remboursé", accepted: "Accepté", declined: "Refusé", superseded: "Remplacé" })[value] || value || "—";
}
function opDate(value) {
  if (!value) return "À planifier";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Abidjan", dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}
function opKey(scope, payload) {
  const storageKey = `mpp_admin_op_${adminUserId}_${scope}`;
  const signature = JSON.stringify(payload);
  try { const previous = JSON.parse(sessionStorage.getItem(storageKey) || "null"); if (previous?.signature === signature && previous.key) return previous.key; } catch (_) { /* Replace invalid browser state. */ }
  const key = crypto.randomUUID(); sessionStorage.setItem(storageKey, JSON.stringify({ key, signature })); return key;
}
function opFinish(scope) { sessionStorage.removeItem(`mpp_admin_op_${adminUserId}_${scope}`); }
function opError(error) {
  const blockers = error.data?.blockers;
  return error.message + (Array.isArray(blockers) && blockers.length ? " — " + blockers.map((item) => item.message).join(" ; ") : "")
    + (Number.isFinite(error.data?.platformLossAmount) ? ` — Coût à prendre en charge par la plateforme : ${fcfa(error.data.platformLossAmount)} F.` : "");
}
function opForm(title, intro, fields, buttonLabel, submit, onSuccess) {
  modal(title, `<p class="muted">${esc(intro)}</p><form class="operation-form"><fieldset>${fields}<p data-error role="alert" class="operation-error" hidden></p><div class="form-actions"><button class="btn btn-primary" type="submit">${esc(buttonLabel)}</button></div></fieldset></form>`, (back, close) => {
    const form = $("form", back); let busy = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); if (busy) return;
      const fd = new FormData(form); const errorEl = $("[data-error]", back);
      busy = true; $("fieldset", form).disabled = true; errorEl.hidden = true;
      let recorded = false;
      try { const result = await submit(fd); recorded = true; if (onSuccess) await onSuccess(result); close(); }
      catch (error) {
        if (recorded) { close(); toast("L’action est enregistrée, mais le rechargement a échoué. Actualisez avant de recommencer. " + opError(error), true); return; }
        errorEl.textContent = opError(error); errorEl.hidden = false;
        if (error.data?.error === "reauthentication_required") {
          const reauth = document.createElement("button"); reauth.type = "button"; reauth.className = "btn";
          reauth.textContent = "Vérifier à nouveau mon identité";
          reauth.addEventListener("click", () => { close(); reauthenticateAdmin(); }); errorEl.appendChild(reauth);
        }
      }
      finally { busy = false; $("fieldset", form).disabled = false; }
    });
  });
}
function opReason(label = "Motif de la décision") {
  return `<label>${esc(label)}<textarea name="reason" required minlength="3" maxlength="1000" rows="3"></textarea></label>`;
}

async function renderCourseOperations(root) {
  let before = null; let rows = []; let loading = false;
  root.innerHTML = `<div class="card"><div class="card-head"><h3>Suivi des cours</h3><button class="btn btn-ghost" data-reload>Actualiser</button></div><p class="muted">Planification, coordonnées, réalisation, problèmes et décisions de clôture. Heures de Côte d’Ivoire.</p><label>Filtrer les cours chargés <input type="search" data-filter placeholder="Numéro, matière, professeur…" /></label><div class="table-wrap" data-table></div><button class="btn btn-ghost" data-more hidden>Charger les cours plus anciens</button><p class="operation-error" data-error hidden role="alert"></p></div>`;
  function paint() {
    const query = $("[data-filter]", root).value.trim().toLocaleLowerCase("fr");
    const visible = rows.filter(({ course: c }) => `${c.id} ${c.subject} ${c.teacher_name} ${c.parent_name || ""} ${c.lifecycle_status}`.toLocaleLowerCase("fr").includes(query));
    $("[data-table]", root).innerHTML = visible.length ? `<table><thead><tr><th>Cours</th><th>Participants</th><th>Créneau</th><th>Suivi</th><th>Paiement</th><th>Actions</th></tr></thead><tbody>${visible.map(({ course: c }) => `<tr><td>N° ${esc(c.id)}<br><strong>${esc(c.subject)} · ${esc(c.level)}</strong></td><td>${esc(c.teacher_name)}<br>${esc(c.parent_name || "")}</td><td>${esc(opDate(c.starts_at))}<br>${esc(c.duration)}</td><td>${esc(opStatus(c.lifecycle_status))}</td><td>${fcfa(c.price)} F<br>${esc(opStatus(c.payment_status))}</td><td><button class="btn btn-sm" data-course="${esc(c.id)}">Ouvrir</button></td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucun cours dans cette sélection.</p>`;
    root.querySelectorAll("[data-course]").forEach((button) => button.addEventListener("click", () => openCourseOperation(button.dataset.course, () => load(true))));
  }
  async function load(reset) {
    if (loading) return; loading = true; const errorEl = $("[data-error]", root); errorEl.hidden = true;
    $("[data-reload]", root).disabled = true; $("[data-more]", root).disabled = true;
    try {
      const result = await api(`/api/admin/finance?limit=100${!reset && before ? `&before=${encodeURIComponent(before)}` : ""}`);
      rows = reset ? asList(result.courses) : rows.concat(asList(result.courses)); before = result.nextBefore || null;
      $("[data-more]", root).hidden = !before; paint();
    } catch (error) { errorEl.textContent = opError(error); errorEl.hidden = false; }
    finally { loading = false; $("[data-reload]", root).disabled = false; $("[data-more]", root).disabled = false; }
  }
  $("[data-filter]", root).addEventListener("input", paint);
  $("[data-reload]", root).addEventListener("click", () => load(true));
  $("[data-more]", root).addEventListener("click", () => load(false));
  await load(true);
}

async function openCourseOperation(id, afterChange) {
  try {
    const detail = await api(`/api/courses/${encodeURIComponent(id)}`);
    const c = detail.course; const permissions = asList(detail.permissions); const finance = detail.finance;
    const { back, close } = modal(`Cours n° ${c.id} — ${c.subject}`, `
      <div class="operation-summary"><p><strong>${esc(c.teacher_name)}</strong> · ${esc(c.parent_name || "Famille")}</p><p>${esc(opDate(c.starts_at))} · ${esc(c.duration)} · ${esc(opStatus(c.lifecycle_status))}</p><p>Parent : ${esc(detail.contacts.parentPhone || "—")} · Professeur : ${esc(detail.contacts.teacherPhone || "—")}</p><p>Adresse : ${esc(c.private_address || c.location || "À renseigner")}</p><p class="break-anywhere">Lien externe : ${esc(c.meeting_url || "—")}</p><p>${esc(c.access_notes || "")}</p><p>Encaissé : ${fcfa(finance.capturedAmount)} F · Remboursé : ${fcfa(finance.refundAmount)} F · Dû professeur : ${finance.teacherDue == null ? "à décider" : fcfa(finance.teacherDue) + " F"}</p></div>
      <div class="form-actions operation-actions">${permissions.includes("edit_details") ? '<button class="btn" data-edit>Modifier les modalités</button>' : ""}${permissions.includes("schedule") ? '<button class="btn" data-schedule>Proposer un créneau</button>' : ""}${permissions.includes("cancel") ? '<button class="btn btn-danger" data-cancel>Annuler le cours</button>' : ""}${["completion_pending", "disputed", "scheduled"].includes(c.lifecycle_status) ? '<button class="btn" data-resolve>Décider de la clôture</button>' : ""}<button class="btn" data-settlement>Règlement financier</button>${c.commission_pct == null ? '<button class="btn" data-historical>Documenter les termes historiques</button>' : ""}${c.payment_status === "paid" && !finance.capturedAmount ? '<button class="btn btn-danger" data-uncollected>Rectifier un ancien paiement non encaissé</button>' : ""}</div>
      <h4>Encaissements enregistrés</h4>${asList(detail.payments).map((payment) => `<div class="operation-entry"><strong>Paiement n°${esc(payment.id)} · ${fcfa(payment.amount)} F</strong> — ${esc(payment.provider)}<p>${esc(opStatus(payment.status))} · ${payment.funds_verified_at ? "Preuve vérifiée : " + esc(opDate(payment.funds_verified_at)) : "Encaissement non attesté"}</p><p class="break-anywhere">Référence : ${esc(payment.paystack_reference || "—")}</p>${payment.last_reconcile_error ? `<p class="operation-error">${esc(payment.last_reconcile_error)}</p>` : ""}<button class="btn btn-sm" data-payment-reconcile="${esc(payment.id)}">Vérifier auprès du prestataire</button></div>`).join("") || '<p class="muted">Aucun paiement enregistré.</p>'}
      <h4>Propositions de créneau</h4>${asList(detail.scheduleRequests).map((p) => `<div class="operation-entry"><strong>${esc(opDate(p.startAt))}</strong> — ${esc(opStatus(p.status))}<p>${esc(p.reason)}</p>${p.status === "pending" && permissions.includes("respond_schedule") ? `<button class="btn btn-sm" data-respond="${esc(p.id)}" data-decision="accept">Accepter</button> <button class="btn btn-sm" data-respond="${esc(p.id)}" data-decision="decline">Refuser</button>` : ""}</div>`).join("") || '<p class="muted">Aucune proposition.</p>'}
      <h4>Comptes rendus</h4>${asList(detail.reports).map((r) => `<div class="operation-entry"><strong>${esc(r.actorRole)} — ${esc(opStatus(r.outcome))}</strong><p>${esc(r.note)}</p>${r.progressSummary ? `<p>Bilan pédagogique : ${esc(r.progressSummary)}</p>` : ""}<small>${esc(opDate(r.createdAt))}</small></div>`).join("") || '<p class="muted">Aucun compte rendu.</p>'}
      <h4>Historique</h4>${asList(detail.events).map((event) => `<div class="operation-entry"><strong>${esc(event.type.replace(/_/g, " "))}</strong> · ${esc(event.actorRole)} · ${esc(opDate(event.createdAt))}<p>${esc(event.details?.reason || "")}</p></div>`).join("") || '<p class="muted">Aucun événement.</p>'}`);
    async function updated(message) { close(); toast(message); if (afterChange) await afterChange(); await openCourseOperation(id, afterChange); }
    const write = (path, body, method = "POST") => api(`/api/courses/${encodeURIComponent(id)}/${path}`, { method, body });
    $("[data-edit]", back)?.addEventListener("click", () => opForm("Modalités du cours", "Les coordonnées sont accessibles uniquement aux participants autorisés et à l’équipe.", `<label>Adresse précise<textarea name="address" maxlength="1000"${c.format === "home" ? " required" : ""}>${esc(c.private_address || c.location || "")}</textarea></label><label>Lien HTTPS de réunion externe<input name="meeting" type="url" pattern="https://.*" maxlength="2000" value="${esc(c.meeting_url || "")}" /></label><label>Précisions d’accès<textarea name="notes" maxlength="2000">${esc(c.access_notes || "")}</textarea></label>`, "Enregistrer", (fd) => write("details", { privateAddress: fd.get("address"), meetingUrl: fd.get("meeting") || undefined, accessNotes: fd.get("notes") }, "PUT"), () => updated("Modalités enregistrées")));
    $("[data-schedule]", back)?.addEventListener("click", () => opForm("Proposer un créneau", "Les dates sont exprimées en Côte d’Ivoire (UTC). Une proposition attend l’accord de l’autre partie.", `<label>Date et heure (UTC)<input type="datetime-local" name="startAt" required /></label>${opReason("Motif de la proposition")}`, "Proposer", (fd) => write("schedule", { startAt: new Date(String(fd.get("startAt")) + "Z").toISOString(), reason: fd.get("reason") }), () => updated("Proposition enregistrée")));
    back.querySelectorAll("[data-respond]").forEach((button) => button.addEventListener("click", () => opForm("Décider du créneau", `Décision : ${button.dataset.decision === "accept" ? "accepter" : "refuser"} la proposition. L’API contrôle les chevauchements.`, opReason(), "Confirmer", (fd) => write(`schedule/${button.dataset.respond}/respond`, { decision: button.dataset.decision, reason: fd.get("reason") }), () => updated("Décision enregistrée"))));
    $("[data-cancel]", back)?.addEventListener("click", () => opForm("Annuler le cours", "Cette action annule le rendez-vous. Elle ne déclenche pas de remboursement automatique ; le règlement financier doit être décidé séparément.", opReason("Motif communiqué aux participants"), "Confirmer l’annulation", (fd) => write("cancel", { reason: fd.get("reason") }), () => updated("Cours annulé")));
    $("[data-resolve]", back)?.addEventListener("click", () => opForm("Décision de clôture", "Appuyez la décision sur les comptes rendus et les éléments recueillis. Le règlement financier reste une décision séparée.", `<label>Décision<select name="outcome" required><option value="">Choisir</option><option value="completed">Cours réalisé</option><option value="cancelled">Cours annulé</option></select></label>${opReason()}`, "Enregistrer la décision", (fd) => api(`/api/admin/courses/${id}/resolve`, { method: "POST", body: { outcome: fd.get("outcome"), reason: fd.get("reason") } }), () => updated("Décision de clôture enregistrée")));
    $("[data-historical]", back)?.addEventListener("click", () => opForm("Documenter les conditions historiques", "Saisissez uniquement des conditions appuyées par les documents de ce cours. Aucun pourcentage historique n’est déduit automatiquement.", `<label>Commission documentée (%)<input name="commission" type="number" min="0" max="100" step="0.01" required /></label><label>Durée documentée (minutes)<input name="duration" type="number" min="15" max="1440" step="1" required /></label>${opReason("Origine des conditions et référence documentaire")}`, "Enregistrer les conditions", (fd) => api(`/api/admin/courses/${id}/historical-terms`, { method: "POST", body: { commissionPct: Number(fd.get("commission")), durationMinutes: Number(fd.get("duration")), reason: fd.get("reason") } }), () => updated("Conditions historiques documentées")));
    $("[data-uncollected]", back)?.addEventListener("click", () => opForm("Rectifier un ancien état non encaissé", "Cette correction ne rembourse pas et ne supprime aucun débit. Elle est réservée à un ancien état payé sans encaissement réel, après vérification des références. L’API refuse si une preuve ou une opération liée s’y oppose.", `${opReason("Résultat de la vérification et références consultées")}<label><input type="checkbox" required /> Je confirme que l’ancien état ne correspond à aucun encaissement réel.</label>`, "Enregistrer l’absence d’encaissement", (fd) => api(`/api/admin/finance/courses/${id}/mark-uncollected`, { method: "POST", body: { reason: fd.get("reason") } }), () => updated("Ancien état corrigé")));
    back.querySelectorAll("[data-payment-reconcile]").forEach((button) => button.addEventListener("click", async () => { button.disabled = true; try { await api(`/api/admin/finance/payments/${button.dataset.paymentReconcile}/reconcile`, { method: "POST", body: {} }); await updated("Vérification fournisseur exécutée ; consultez le résultat enregistré"); } catch (error) { toast(opError(error), true); button.disabled = false; } }));
    $("[data-settlement]", back)?.addEventListener("click", () => settlementForm(c, finance, () => updated("Règlement enregistré")));
  } catch (error) { toast(opError(error), true); }
}

function settlementForm(course, finance, onSuccess) {
  opForm(`Règlement du cours n° ${course.id}`, `Encaissé ${fcfa(finance.capturedAmount)} F ; remboursement confirmé ${fcfa(finance.refundAmount)} F ; net professeur prévu ${finance.teacherNetAmount == null ? "à documenter" : fcfa(finance.teacherNetAmount) + " F"}. Le cours doit être clôturé et l’encaissement prouvé. Cette décision ne réalise aucun transfert.`, `<label>Dû total du professeur pour ce cours (F CFA)<input name="amount" type="number" min="0" step="1" required value="${finance.teacherDue == null ? "" : esc(finance.teacherDue)}" /></label><label>Disponibilité pour reversement<select name="release" required><option value="false">Conserver bloqué</option><option value="true">Libérer le dû au reversement</option></select></label>${opReason()}`, "Enregistrer ce règlement", (fd) => api(`/api/admin/finance/courses/${course.id}/settlement`, { method: "POST", body: { teacherDueAmount: Number(fd.get("amount")), release: fd.get("release") === "true", reason: fd.get("reason") } }), onSuccess);
}

async function renderFinanceOperations(root) {
  const result = await api("/api/admin/finance?limit=200");
  const courses = asList(result.courses); let operations = []; let operationsBefore = null; let operationsLoading = false;
  root.innerHTML = `<div class="card"><div class="card-head"><h3>Paiements, remboursements et reversements</h3><button class="btn btn-ghost" data-refresh>Actualiser</button></div><p class="muted">Les décisions et demandes enregistrées ici ne déplacent pas d’argent. L’opérateur réalise l’opération dans la console du prestataire, puis fournit sa référence pour vérification. Seule une preuve concordante confirme un mouvement.</p><button class="btn" data-reconcile>Rapprocher les paiements en attente</button><p role="status" data-reconcile-status></p></div>
    <div class="card"><h3>Opérations financières</h3><label>Afficher<select data-status><option value="requested">Demandes à examiner</option><option value="approved">Approuvées, à exécuter / vérifier</option><option value="reversed">Versements inversés à examiner</option><option value="verified">Confirmées par le prestataire</option><option value="rejected">Refusées</option><option value="all">Tous les états</option></select></label><div class="table-wrap" data-operations></div><button class="btn btn-ghost" data-more-ops hidden>Charger les opérations plus anciennes</button><p data-operations-error class="operation-error" role="alert" hidden></p></div>
    <div class="card"><h3>Règlement par cours</h3><p class="muted">${courses.length} cours chargés${result.nextBefore ? " ; utilisez la vue Cours pour accéder aux cours plus anciens." : "."}</p><div class="table-wrap"><table><thead><tr><th>Cours</th><th>Encaissé / remboursé</th><th>Professeur</th><th>Décision</th></tr></thead><tbody>${courses.map(({ course: c, finance: f }) => `<tr><td>N°${esc(c.id)} · ${esc(c.subject)}<br>${esc(c.teacher_name)}<br>${esc(opStatus(c.lifecycle_status))}</td><td>${fcfa(f.capturedAmount)} F / ${fcfa(f.refundAmount)} F${f.refundPendingAmount ? `<br>Demandé : ${fcfa(f.refundPendingAmount)} F` : ""}</td><td>Net prévu : ${f.teacherNetAmount == null ? "à documenter" : fcfa(f.teacherNetAmount) + " F"}<br>Dû : ${f.teacherDue == null ? "à décider" : fcfa(f.teacherDue) + " F"}<br>Disponible : ${fcfa(f.teacherReleasable)} F<br>Versé : ${fcfa(f.teacherPaid)} F${f.reviewRequired ? '<br><strong>Examen requis</strong>' : ""}${f.platformLossAcceptedAmount > 0 ? `<br>Charge plateforme acceptée : ${fcfa(f.platformLossAcceptedAmount)} F` : ""}</td><td><button class="btn btn-sm" data-settlement="${esc(c.id)}">Décider du règlement</button><button class="btn btn-sm" data-refund="${esc(c.id)}"${f.capturedAmount - f.refundAmount - f.refundPendingAmount <= 0 ? " disabled" : ""}>Demander un remboursement</button><button class="btn btn-sm" data-course="${esc(c.id)}">Détail</button></td></tr>`).join("")}</tbody></table></div></div>`;
  const refresh = () => renderFinanceOperations(root);
  function paintOperations() {
    const selected = $("[data-status]", root).value;
    const visible = operations.filter((operation) => selected === "all" || operation.status === selected);
    $("[data-operations]", root).innerHTML = visible.length ? `<table><thead><tr><th>Opération</th><th>Montant / destination</th><th>État</th><th>Preuve</th><th>Actions</th></tr></thead><tbody>${visible.map((operation) => `<tr><td>N°${esc(operation.id)} · ${operation.kind === "refund" ? "Remboursement" : "Reversement"}${operation.courseId ? `<br>Cours n°${esc(operation.courseId)}` : ""}<br>${esc(opDate(operation.createdAt))}<p>${esc(operation.reason)}</p></td><td>${fcfa(operation.amount)} F<br>${esc(operation.provider || "")}<br>${esc(operation.beneficiaryPhone || "")}</td><td>${esc(opStatus(operation.status))}${operation.needsReview ? "<br><strong>Contrôle requis</strong>" : ""}${operation.platformLossAmount > 0 ? `<br>Coût pris en charge par la plateforme : ${fcfa(operation.platformLossAmount)} F` : ""}</td><td class="break-anywhere">${esc(operation.providerReference || "—")}${operation.verifiedAt ? `<br>${esc(opDate(operation.verifiedAt))}` : ""}</td><td>${operation.status === "requested" ? `<button class="btn btn-sm" data-op="${esc(operation.id)}" data-action="approve">Approuver</button>` : ""}${["requested", "approved"].includes(operation.status) ? `<button class="btn btn-sm" data-op="${esc(operation.id)}" data-action="reject">Refuser</button>` : ""}${["approved", "verified"].includes(operation.status) ? `<button class="btn btn-sm" data-op="${esc(operation.id)}" data-action="verify">${operation.status === "verified" ? "Revérifier la preuve" : "Vérifier la référence prestataire"}</button>` : ""}${operation.needsReview ? `<button class="btn btn-sm" data-op="${esc(operation.id)}" data-action="resolve-review">Réexaminer l’anomalie</button>` : ""}</td></tr>`).join("")}</tbody></table>` : '<p class="empty">Aucune opération dans cette sélection.</p>';
    root.querySelectorAll("[data-op]").forEach((button) => button.addEventListener("click", () => {
      const operation = operations.find((item) => String(item.id) === button.dataset.op); const action = button.dataset.action;
      if (!operation) return;
      const verify = action === "verify"; const resolving = action === "resolve-review";
      const allowPlatformLoss = action === "approve" && operation.kind === "refund";
      const confirmNoExecution = action === "reject" && operation.status === "approved" && !operation.providerReference;
      opForm(`${verify ? "Vérifier la preuve" : resolving ? "Réexaminer et clôturer l’anomalie" : action === "approve" ? "Approuver la demande" : "Refuser la demande"} n°${operation.id}`, `${operation.kind === "refund" ? "Remboursement" : "Reversement"} de ${fcfa(operation.amount)} F. Destination : ${operation.provider || "prestataire"} ${operation.beneficiaryPhone || ""}. ${verify ? "Indiquez la référence de l’opération réellement exécutée chez le prestataire. Le serveur vérifie le montant, la devise et le bénéficiaire ; une référence saisie n’est pas une preuve suffisante." : "Cette décision est tracée. Elle ne confirme aucun mouvement d’argent."}`, verify ? `<label>Référence prestataire<input name="reference" required maxlength="100" autocomplete="off" value="${esc(operation.providerReference || "")}" /></label>` : opReason() + (allowPlatformLoss ? `<label><input type="checkbox" name="acceptPlatformLoss" /> Pour cette demande de ${fcfa(operation.amount)} F, j’autorise explicitement la plateforme à prendre à sa charge le coût que les fonds restants du cours ne couvrent plus. Les versements déjà réalisés au professeur ne sont pas annulés.</label>` : "") + (confirmNoExecution ? '<label><input type="checkbox" name="notExecuted" required /> Je confirme qu’aucun mouvement de fonds n’a été exécuté pour cette opération.</label>' : ""), verify ? "Vérifier auprès du prestataire" : "Enregistrer la décision", (fd) => api(`/api/admin/finance/operations/${operation.id}/${action}`, { method: "POST", body: verify ? { providerReference: fd.get("reference") } : { reason: fd.get("reason"), acceptPlatformLoss: allowPlatformLoss ? fd.get("acceptPlatformLoss") === "on" : undefined, notExecutedConfirmed: confirmNoExecution ? fd.get("notExecuted") === "on" : undefined } }), async (response) => { toast(verify ? `Résultat fournisseur : ${opStatus(response?.status || response?.operation?.status)}` : `Décision enregistrée${response?.platformLossAmount > 0 ? " — charge plateforme : " + fcfa(response.platformLossAmount) + " F" : ""}`); await refresh(); });
    }));
  }
  async function loadOperations(reset) {
    if (operationsLoading) return;
    operationsLoading = true;
    const select = $("[data-status]", root); const more = $("[data-more-ops]", root); const errorEl = $("[data-operations-error]", root);
    select.disabled = true; more.disabled = true; errorEl.hidden = true;
    try {
      const query = new URLSearchParams({ limit: "100" });
      if (select.value !== "all") query.set("status", select.value);
      if (!reset && operationsBefore) query.set("before", String(operationsBefore));
      const page = await api(`/api/admin/finance/operations?${query}`);
      operations = reset ? asList(page.operations) : operations.concat(asList(page.operations));
      operationsBefore = page.nextBefore || null; more.hidden = !operationsBefore; paintOperations();
    } catch (error) { errorEl.textContent = opError(error); errorEl.hidden = false; }
    finally { operationsLoading = false; select.disabled = false; more.disabled = false; }
  }
  $("[data-status]", root).addEventListener("change", () => loadOperations(true));
  $("[data-more-ops]", root).addEventListener("click", () => loadOperations(false));
  await loadOperations(true);
  $("[data-refresh]", root).addEventListener("click", () => refresh().catch((error) => toast(opError(error), true)));
  $("[data-reconcile]", root).addEventListener("click", async (event) => {
    const button = event.currentTarget; button.disabled = true; const status = $("[data-reconcile-status]", root); status.textContent = "Vérification des paiements en cours…";
    try { await api("/api/admin/finance/reconcile", { method: "POST", body: {} }); status.textContent = "Rapprochement exécuté. Actualisez les listes pour consulter les états vérifiés."; }
    catch (error) { status.textContent = opError(error); }
    finally { button.disabled = false; }
  });
  root.querySelectorAll("[data-settlement]").forEach((button) => button.addEventListener("click", () => { const item = courses.find((row) => String(row.course.id) === button.dataset.settlement); if (item) settlementForm(item.course, item.finance, async () => { toast("Règlement enregistré"); await refresh(); }); }));
  root.querySelectorAll("[data-course]").forEach((button) => button.addEventListener("click", () => openCourseOperation(button.dataset.course, refresh)));
  root.querySelectorAll("[data-refund]").forEach((button) => button.addEventListener("click", () => {
    const item = courses.find((row) => String(row.course.id) === button.dataset.refund); if (!item) return;
    const maximum = item.finance.capturedAmount - item.finance.refundAmount - item.finance.refundPendingAmount;
    opForm(`Demander un remboursement — cours ${item.course.id}`, "Cette action ouvre une demande ; elle ne rembourse pas automatiquement le parent.", `<label>Montant (F CFA)<input name="amount" type="number" min="1" max="${maximum}" step="1" required /></label>${opReason("Motif communiqué")}`, "Créer la demande", (fd) => { const body = { amount: Number(fd.get("amount")), reason: String(fd.get("reason")) }; return api(`/api/courses/${item.course.id}/refund-requests`, { method: "POST", body: { ...body, idempotencyKey: opKey(`refund_${item.course.id}`, body) } }); }, async () => { opFinish(`refund_${item.course.id}`); toast("Demande de remboursement enregistrée"); await refresh(); });
  }));
}

async function renderAccountDeletions(root) {
  const result = await api("/api/admin/account-deletions"); const requests = asList(result.requests);
  root.innerHTML = `<div class="card"><div class="card-head"><h3>Suppressions de comptes</h3><button class="btn btn-ghost" data-refresh>Actualiser</button></div><p class="muted">Traiter les obligations encore ouvertes avant la suppression. L’API recontrôle les blocages au moment de la finalisation. Les justificatifs à conserver restent soumis à la politique publiée.</p>${requests.length ? `<div class="table-wrap"><table><thead><tr><th>Compte</th><th>Demande</th><th>Blocages actuels</th><th>Action</th></tr></thead><tbody>${requests.map((request) => `<tr><td>${esc(request.userName)}<br>${esc(request.phone)}<br>${esc(request.role)} · n°${esc(request.userId)}</td><td>${esc(opStatus(request.status))}<br>${esc(opDate(request.requestedAt))}</td><td>${asList(request.blockers).map((blocker) => `<p>${esc(blocker.message)}${blocker.count ? ` (${esc(blocker.count)})` : ""}</p>`).join("") || "Aucun blocage identifié"}</td><td>${request.status === "pending" ? `<button class="btn btn-danger btn-sm" data-complete="${esc(request.id)}"${asList(request.blockers).length ? " disabled" : ""}>Finaliser la suppression</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">Aucune demande enregistrée.</p>'}</div>`;
  const refresh = () => renderAccountDeletions(root);
  $("[data-refresh]", root).addEventListener("click", () => refresh().catch((error) => toast(opError(error), true)));
  root.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => {
    const request = requests.find((item) => String(item.id) === button.dataset.complete); if (!request) return;
    opForm(`Supprimer le compte n°${request.userId}`, `Demande de ${request.userName}. La finalisation retire l’accès au compte et anonymise les données qui peuvent être retirées. Cette action est irréversible.`, '<label>Saisir SUPPRIMER<input name="confirmation" required pattern="SUPPRIMER" autocomplete="off" /></label>', "Finaliser la suppression", (fd) => api(`/api/admin/account-deletions/${request.id}/complete`, { method: "POST", body: { confirmation: fd.get("confirmation") } }), async () => { toast("Compte fermé. Le retrait des fichiers peut se poursuivre en arrière-plan."); await refresh(); });
  }));
}

async function renderProductionReadiness(root) {
  const [readiness, settings, audit] = await Promise.all([
    api("/api/admin/production-readiness"), api("/api/admin/operations-settings"), api("/api/admin/production-data-audit"),
  ]);
  const labels = {
    company_name: "Nom de l’exploitant", registration_number: "Identifiant d’immatriculation", company_address: "Adresse de l’exploitant",
    privacy_email: "E-mail relatif aux données personnelles", hosting_location: "Localisation de l’hébergement",
    retention_policy: "Règles de conservation des données", cancellation_policy: "Conditions d’annulation",
    refund_policy: "Règles de remboursement", payout_policy: "Règles de règlement des professeurs",
  };
  root.innerHTML = `<div class="card"><div class="card-head"><h3>Mise en service</h3><button class="btn btn-ghost" data-refresh>Actualiser les contrôles</button></div><p><strong>${readiness.ready ? "Les contrôles configurés sont satisfaits" : "Des prérequis restent à satisfaire"}</strong> · Ouverture configurée : ${readiness.launchEnabled ? "oui" : "non"}</p><p>Environnement : ${esc(readiness.environment)} · Révision : <span class="break-anywhere">${esc(readiness.revision)}</span></p><p class="muted">Cette vue combine des contrôles techniques et des validations déclarées par l’exploitant. Elle ne constitue pas un audit externe et n’active pas le service.</p></div>
    <div class="card"><h3>Contrôles et preuves</h3><div class="table-wrap"><table><thead><tr><th>Contrôle</th><th>Résultat</th><th>Détail</th><th>Action</th></tr></thead><tbody>${asList(readiness.checks).map((check) => `<tr><td>${esc(check.title)}<br><small>${check.kind === "operator_evidence" ? "Validation déclarée par l’exploitant" : check.kind === "runtime" ? "État technique observé" : "Configuration vérifiée"}</small></td><td>${check.ok ? "Satisfait" : "À traiter"}</td><td>${esc(check.detail)}</td><td>${check.kind === "operator_evidence" ? `<button class="btn btn-sm" data-validation="${esc(check.key)}">Consigner une preuve</button>` : "—"}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h3>Déclarations enregistrées</h3>${asList(readiness.validations).map((validation) => `<div class="operation-entry"><strong>${esc(validation.check_key)}</strong> · ${esc(opDate(validation.validated_at))}<p class="break-anywhere">Révision : ${esc(validation.revision)} · Compte : ${esc(validation.validated_by)}</p><p>${esc(validation.evidence)}</p></div>`).join("") || '<p class="muted">Aucune déclaration enregistrée.</p>'}</div>
    <div class="card"><h3>Revue des données existantes</h3><p class="muted">Ces correspondances identifient des données à examiner. Aucune suppression automatique n’est effectuée ; confirmer leur origine avant toute intervention sur une base utilisée.</p><p>Origine déclarée : ${esc(audit.origin)}</p><p>Comptes suspects : ${esc(asList(audit.demoAccountIds).join(", ") || "aucun")}</p><p>Professeurs suspects : ${esc(asList(audit.demoTeacherIds).join(", ") || "aucun")}</p><p>Avis suspects : ${esc(asList(audit.demoReviewIds).join(", ") || "aucun")}</p><p>Cours marqués payés sans preuve fournisseur vérifiée : ${esc(audit.unverifiedPaidCourses)}</p></div>
    <div class="card"><h3>Informations publiées sur le service</h3><p class="muted">Renseignez les informations réelles et les politiques validées. Les champs vides n’ont pas de valeur de remplacement. Ces informations sont publiées sur la page « Informations sur le service ».</p><form data-settings class="operation-form"><fieldset>${Object.entries(labels).map(([key, label]) => `<label>${esc(label)}${["company_name", "registration_number", "privacy_email"].includes(key) ? `<input name="${key}"${key === "privacy_email" ? ' type="email"' : ""} maxlength="4000" value="${esc(settings[key] || "")}" />` : `<textarea name="${key}" rows="4" maxlength="4000">${esc(settings[key] || "")}</textarea>`}</label>`).join("")}<p role="alert" data-settings-error class="operation-error" hidden></p><button class="btn btn-primary" type="submit">Enregistrer les informations publiées</button></fieldset></form><p><a href="/informations-service.html" target="_blank" rel="noopener">Consulter la page publique</a></p></div>`;
  const refresh = () => renderProductionReadiness(root);
  $("[data-refresh]", root).addEventListener("click", () => refresh().catch((error) => toast(opError(error), true)));
  root.querySelectorAll("[data-validation]").forEach((button) => button.addEventListener("click", () => {
    const check = readiness.checks.find((item) => item.key === button.dataset.validation); if (!check) return;
    opForm(`Validation déclarée par l’exploitant — ${check.title}`, `Révision concernée : ${readiness.revision}. Décrivez les vérifications réellement réalisées, la date, le résultat et les références de preuve. N’insérez aucun secret ni code de paiement. Une déclaration ne remplace pas une recette réelle.`, '<label>Preuve / compte rendu<textarea name="evidence" required minlength="20" maxlength="4000" rows="7"></textarea></label>', "Enregistrer cette déclaration", (fd) => api(`/api/admin/production-checks/${encodeURIComponent(check.key)}`, { method: "POST", body: { evidence: fd.get("evidence") } }), async () => { toast("Déclaration de l’exploitant enregistrée"); await refresh(); });
  }));
  const settingsForm = $("[data-settings]", root); let busy = false;
  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault(); if (busy) return; const fd = new FormData(settingsForm);
    const body = Object.fromEntries(Object.keys(labels).map((key) => [key, String(fd.get(key) || "").trim()]));
    const errorEl = $("[data-settings-error]", settingsForm); errorEl.hidden = true; busy = true; $("fieldset", settingsForm).disabled = true;
    try { await api("/api/admin/operations-settings", { method: "PUT", body }); toast("Informations enregistrées"); await refresh(); }
    catch (error) { errorEl.textContent = opError(error); errorEl.hidden = false; }
    finally { busy = false; $("fieldset", settingsForm).disabled = false; }
  });
}
