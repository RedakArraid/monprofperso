import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, ContentCard, PageStack, SectionHeading, OfflineBanner } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiBase, ApiError, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCapabilities } from "@/lib/capabilities";
import { useLive } from "@/hooks/useLive";
import { courseDate } from "@/lib/operations";

type Blocker = { code: string; message: string; count?: number };
type DeletionState = {
  request: null | { id: number; status: "pending" | "cancelled" | "completed"; requestedAt: string; completedAt: string | null; cancelledAt: string | null };
  blockers: Blocker[];
};
const EMPTY: DeletionState = { request: null, blockers: [] };
type Preferences = { notificationsWhatsapp: boolean; notificationsEmail: boolean; whatsappAvailable: boolean; emailAvailable: boolean };
type ConsentState = { version: string; accepted: boolean; documents: { slug: string; title: string; version: string }[] };
type ExportDocument = { path: string; name: string };
type AccountExport = {
  applications?: { id: number; id_card_file_name?: string | null; diploma_file_name?: string | null; photo_file_name?: string | null }[];
  needs?: { data: { id: number; document_name?: string | null } }[];
};

export function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const { capabilities } = useCapabilities();
  const state = useLive<DeletionState>("/api/account/deletion-request", EMPTY);
  const preferences = useLive<Preferences | null>("/api/account/preferences", null);
  const consent = useLive<ConsentState | null>("/api/account/consent", null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const [documents, setDocuments] = useState<ExportDocument[]>([]);

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = Array.from(filename, (char) => char.charCodeAt(0) < 32 || char === "/" || char === "\\" ? "_" : char).join("");
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function exportAccount() {
    setBusy("export"); setError(""); setNotice("");
    try {
      const data = await api<AccountExport>("/api/account/export");
      download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `monprofperso-compte-${user?.id}-${new Date().toISOString().slice(0, 10)}.json`);
      const files: ExportDocument[] = [];
      for (const need of data.needs || []) if (need.data?.document_name && Number.isInteger(need.data.id)) files.push({ path: `/api/account/documents/need/${need.data.id}`, name: need.data.document_name });
      for (const application of data.applications || []) {
        if (!Number.isInteger(application.id)) continue;
        for (const kind of ["id_card", "diploma", "photo"] as const) {
          const name = application[`${kind}_file_name`];
          if (name) files.push({ path: `/api/account/documents/${kind}/${application.id}`, name });
        }
      }
      setDocuments(files);
      setNotice("Votre export a été téléchargé. Conservez ce fichier dans un endroit privé.");
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Export impossible"); if (ex instanceof ApiError && (ex.status === 401 || ex.status === 403)) setReauthRequired(true); }
    finally { setBusy(""); }
  }

  async function downloadDocument(document: ExportDocument) {
    setBusy(document.path); setError("");
    try {
      const response = await fetch(apiBase() + document.path, { cache: "no-store", headers: { Authorization: `Bearer ${tokenStore.get() || ""}` } });
      if (!response.ok) throw new Error("Ce document n’a pas pu être téléchargé. Reconnectez-vous ou contactez le support si le problème persiste.");
      download(await response.blob(), document.name);
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Téléchargement impossible"); }
    finally { setBusy(""); }
  }

  async function changeDeletion(cancel = false) {
    if (busy || (!cancel && confirmation !== "SUPPRIMER")) return;
    setBusy("deletion"); setError(""); setNotice(""); setReauthRequired(false);
    try {
      const data = await api<DeletionState>("/api/account/deletion-request", {
        method: cancel ? "DELETE" : "POST", body: cancel ? undefined : { confirmation: "SUPPRIMER" },
      });
      if (data.request?.status === "completed") {
        sessionStorage.setItem("mpp_deletion_completed", String(Date.now()));
        logout(); window.location.href = "/suppression-compte.html"; return;
      }
      state.setData(data); setConfirmation("");
      setNotice(cancel ? "La demande de suppression a été annulée." : "Votre demande est enregistrée. Les obligations en cours doivent être réglées avant sa finalisation.");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Demande impossible");
      if (ex instanceof ApiError && (ex.status === 401 || ex.status === 403)) setReauthRequired(true);
    } finally { setBusy(""); }
  }

  async function acceptCurrentTerms() {
    if (busy || !acceptTerms || !consent.data || (user?.role === "student" && !parentalConsent)) return;
    setBusy("consent"); setError(""); setNotice("");
    try {
      const result = await api<ConsentState>("/api/account/consent", { method: "POST", body: {
        consent: true, consentVersion: consent.data.version, parentalConsent: user?.role === "student" ? parentalConsent : undefined,
      } });
      consent.setData(result); setAcceptTerms(false); setParentalConsent(false);
      setNotice("Votre acceptation de la version présentée a été enregistrée. Vous pouvez reprendre votre réservation ou votre paiement.");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Acceptation impossible");
      if (ex instanceof ApiError && (ex.data as { error?: string } | null)?.error === "consent_version_changed") {
        setAcceptTerms(false); setParentalConsent(false);
        await consent.reload();
        setError("Les documents ont changé. Consultez les versions actualisées et confirmez à nouveau votre acceptation.");
      }
    } finally { setBusy(""); }
  }

  return <AppShell title="Paramètres du compte" active="compte" back="/compte">
    {state.offline ? <OfflineBanner onRetry={() => void state.reload()} /> : null}
    <PageStack narrow>
      <ContentCard><SectionHeading>Conditions d’utilisation et confidentialité</SectionHeading>
        {consent.offline ? <OfflineBanner onRetry={() => { setAcceptTerms(false); setParentalConsent(false); void consent.reload(); }} /> : null}
        {consent.data ? <div className="space-y-3">
          <p className="text-sm">{consent.data.accepted ? "Vous avez accepté les versions actuellement publiées." : "Consultez les documents publiés et acceptez cette version avant de réserver ou de payer un cours."}</p>
          <ul className="space-y-2 text-sm">{consent.data.documents.map((document) => <li key={document.slug}><a className="link-green" target="_blank" rel="noreferrer" href={`${apiBase()}/api/legal/${encodeURIComponent(document.slug)}/file?v=${encodeURIComponent(document.version)}`}>{document.title}</a> — version {document.version}</li>)}</ul>
          <p className="text-xs text-muted-foreground">Version présentée : {consent.data.version}</p>
          {!consent.data.accepted ? <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void acceptCurrentTerms(); }}><fieldset disabled={Boolean(busy) || consent.offline || consent.loading} className="space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1" /><span>J’accepte les conditions d’utilisation et la politique de confidentialité présentées ci-dessus.</span></label>
            {user?.role === "student" ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} className="mt-1" /><span>Je dispose de l’accord de mon responsable légal.</span></label> : null}
            <Button type="submit" disabled={!acceptTerms || (user?.role === "student" && !parentalConsent)}>{busy === "consent" ? "Enregistrement…" : "Accepter cette version"}</Button>
          </fieldset></form> : null}
        </div> : <p className="text-sm">{consent.loading ? "Chargement des documents…" : "Les documents ne sont pas disponibles actuellement. Réessayez avant de réserver ou de payer."}</p>}
      </ContentCard>
      <ContentCard><SectionHeading>Alertes de cours et de paiement</SectionHeading>
        <p className="mb-4 text-sm">Recevez les actions à suivre et les rappels utiles en dehors de l’application. Ces préférences concernent vos cours et vos paiements, sans messages promotionnels. Les notifications restent consultables dans votre espace.</p>
        {preferences.offline ? <OfflineBanner onRetry={() => void preferences.reload()} /> : null}
        {preferences.data ? <form key={`${preferences.data.notificationsWhatsapp}-${preferences.data.notificationsEmail}`} onSubmit={async (e) => {
          e.preventDefault(); if (busy) return; const fd = new FormData(e.currentTarget);
          setBusy("preferences"); setError(""); setNotice("");
          try {
            const whatsapp = fd.get("whatsapp") === "on", email = fd.get("email") === "on";
            const data = await api<Preferences>("/api/account/preferences", { method: "PUT", body: {
              notificationsWhatsapp: whatsapp !== preferences.data?.notificationsWhatsapp ? whatsapp : undefined,
              notificationsEmail: email !== preferences.data?.notificationsEmail ? email : undefined,
            } });
            preferences.setData(data); setNotice("Vos préférences d’alertes ont été enregistrées.");
          } catch (ex) { setError(ex instanceof Error ? ex.message : "Enregistrement impossible"); }
          finally { setBusy(""); }
        }}><fieldset disabled={Boolean(busy) || preferences.offline} className="space-y-4">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="whatsapp" defaultChecked={preferences.data.notificationsWhatsapp} disabled={!preferences.data.whatsappAvailable && !preferences.data.notificationsWhatsapp} className="mt-1" /><span><strong>WhatsApp</strong><br />{preferences.data.whatsappAvailable ? "Alertes sur votre numéro vérifié." : "Indisponible actuellement pour ce compte. Un numéro vérifié par WhatsApp et un canal actif sont nécessaires."}</span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="email" defaultChecked={preferences.data.notificationsEmail} disabled={!preferences.data.emailAvailable && !preferences.data.notificationsEmail} className="mt-1" /><span><strong>E-mail</strong><br />{preferences.data.emailAvailable ? "Alertes sur l’adresse vérifiée de votre compte." : "Indisponible : une adresse déjà vérifiée et un canal e-mail actif sont nécessaires."}</span></label>
          <Button type="submit" variant="outline">Enregistrer mes préférences</Button>
        </fieldset></form> : <p className="text-sm">{preferences.loading ? "Chargement des préférences…" : "Préférences indisponibles."}</p>}
      </ContentCard>
      <ContentCard><SectionHeading>Mes données</SectionHeading>
        <p className="mb-4 text-sm">L’export regroupe les données de votre compte. Il peut contenir des coordonnées et des informations sur vos cours.</p>
        <Button variant="outline" disabled={Boolean(busy) || !capabilities.accountExport} onClick={() => void exportAccount()}>{busy === "export" ? "Préparation…" : "Télécharger mes données"}</Button>
        {documents.length ? <div className="mt-4"><h3 className="font-semibold">Pièces jointes de mon export</h3><p className="mt-1 text-sm">Téléchargez les fichiers originaux séparément avant de supprimer le compte.</p><ul className="mt-3 space-y-2">{documents.map((document) => <li key={document.path}><Button variant="outline" disabled={Boolean(busy)} onClick={() => void downloadDocument(document)}>{document.name}</Button></li>)}</ul></div> : null}
      </ContentCard>
      <ContentCard><SectionHeading>Suppression du compte</SectionHeading>
        <p className="text-sm">La suppression retire votre accès et anonymise les données personnelles qui peuvent être supprimées. Les justificatifs comptables, preuves de paiement et éléments nécessaires au règlement d’un litige peuvent être conservés avec un accès limité selon les obligations applicables.</p>
        <p className="mt-3 text-sm">Les cours, paiements, remboursements ou reversements encore ouverts doivent être réglés avant la finalisation. Vous pouvez annuler une demande en attente. Une suppression finalisée est irréversible.</p>
        <p className="mt-3 text-sm"><Link className="link-green" to="/legal">Consulter la politique de confidentialité</Link> · <Link className="link-green" to="/aide">Contacter le support</Link></p>
        {state.data.request?.status === "pending" ? <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold">Demande en attente depuis le {courseDate(state.data.request.requestedAt, false)}</p>
          {state.data.blockers.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{state.data.blockers.map((b) => <li key={b.code}>{b.message}{b.count ? ` (${b.count})` : ""}</li>)}</ul> : <p className="mt-2 text-sm">La demande peut être finalisée par l’équipe. Actualisez pour consulter son état.</p>}
          <Button variant="outline" className="mt-4" disabled={Boolean(busy) || state.offline} onClick={() => void changeDeletion(true)}>Annuler la demande</Button>
        </div> : <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void changeDeletion(); }}>
          <Label htmlFor="delete-confirmation">Pour confirmer, saisissez SUPPRIMER</Label>
          <Input id="delete-confirmation" required autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          <Button variant="destructive" disabled={Boolean(busy) || state.loading || state.offline || !capabilities.accountDeletion || confirmation !== "SUPPRIMER"} type="submit">{busy === "deletion" ? "Traitement…" : "Demander la suppression de mon compte"}</Button>
        </form>}
        <p className="mt-4 text-xs text-muted-foreground">Une vérification récente de votre identité est nécessaire. <Link className="underline" to="/login?next=suppression&reauth=1">Recevoir un nouveau code de connexion</Link>.</p>
        {reauthRequired ? <Button asChild className="mt-3"><Link to="/login?next=suppression&reauth=1">Vérifier mon identité puis revenir ici</Link></Button> : null}
      </ContentCard>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg bg-secondary p-4 text-sm">{notice}</p> : null}
      <Button variant="outline" disabled={Boolean(busy)} onClick={() => void state.reload()}>Actualiser l’état de ma demande</Button>
    </PageStack>
  </AppShell>;
}
