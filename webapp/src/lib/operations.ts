/** User-facing formatting and validation shared by course and account workflows. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function courseDate(value: string | null | undefined, withTime = true): string {
  if (!value) return "À planifier";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Abidjan", dateStyle: "full", ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

/** The form explicitly uses Côte d'Ivoire (UTC), independent of browser timezone. */
export function scheduleIso(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Indiquez une date et une heure valides.");
  }
  const raw = `${date}T${time}:00.000Z`;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== raw) {
    throw new Error("Indiquez une date et une heure valides.");
  }
  if (parsed.getTime() <= Date.now()) throw new Error("Choisissez un créneau futur.");
  return parsed.toISOString();
}

export function statusLabel(status: string | undefined | null): string {
  const labels: Record<string, string> = {
    upcoming: "À venir", done: "Réalisé", completed: "Réalisé", cancelled: "Annulé",
    pending: "En attente", paid: "Payé", success: "Confirmé", failed: "Échec",
    requested: "Demandé", approved: "Approuvé", processing: "En cours de traitement",
    rejected: "Refusé", refunded: "Remboursé", partially_refunded: "Remboursé en partie",
    open: "Ouvert", resolved: "Résolu", accepted: "Accepté", submitted: "Envoyé",
    awaiting_schedule: "Créneau à convenir", scheduled: "Programmé", completion_pending: "Réalisation à confirmer",
    disputed: "Problème à résoudre", refused: "Refusé", declined: "Proposition refusée", superseded: "Proposition remplacée",
    verified: "Vérifié", reversed: "Versement inversé — à examiner", teacher_absent: "Professeur absent", student_absent: "Élève absent",
  };
  return status ? labels[status] || status : "—";
}

/** Retain a key after a transport error or reload so retrying cannot duplicate a financial request. */
export function operationKey(scope: string, payload: unknown): string {
  const signature = JSON.stringify(payload);
  const storageKey = `mpp_operation_${scope}`;
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (previous?.signature === signature && typeof previous.key === "string") return previous.key;
  } catch { /* Corrupt local state is replaced. */ }
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, JSON.stringify({ key, signature }));
  return key;
}

export function finishOperation(scope: string) { sessionStorage.removeItem(`mpp_operation_${scope}`); }

export function reviewedRating(rating: number | null | undefined, count: number | null | undefined): string {
  return Number(count) > 0 && Number.isFinite(rating) && Number(rating) > 0
    ? `★ ${Number(rating).toLocaleString("fr-FR")} (${count} avis)` : "Pas encore d’avis";
}

export function loginDestination(next: string | null): string | null {
  // Only app-owned destinations are accepted; never an arbitrary redirect URL.
  const destinations: Record<string, string> = {
    candidature: "/devenir-prof.html#suivi",
    suppression: "/espace/#/parametres?section=suppression",
    parametres: "/espace/#/parametres",
    revenus: "/espace/#/prof-revenus",
  };
  return next ? destinations[next] || null : null;
}

export function courseEventLabel(type: string): string {
  const labels: Record<string, string> = {
    booking_requested: "Réservation demandée", teacher_accepted: "Réservation acceptée par le professeur",
    teacher_refused: "Réservation refusée", need_matched: "Professeur attribué au besoin",
    details_updated: "Modalités du rendez-vous mises à jour", schedule_proposed: "Créneau proposé",
    schedule_accepted: "Créneau accepté", schedule_declined: "Créneau refusé", cancelled: "Cours annulé",
    attendance_reported: "Compte rendu reçu", admin_resolved: "Décision de l’équipe",
    review_created: "Avis publié", payment_verified: "Paiement vérifié", payment_simulated: "Paiement simulé en démonstration",
    refund_requested: "Remboursement demandé", settlement_decided: "Règlement du cours décidé",
    historical_terms_documented: "Conditions historiques documentées", historical_uncollected: "Ancien encaissement rectifié",
  };
  return labels[type] || "Mise à jour du suivi";
}
