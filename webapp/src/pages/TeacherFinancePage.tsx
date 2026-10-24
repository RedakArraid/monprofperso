import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppShell, ContentCard, Empty, InfoRow, OfflineBanner, PageGrid, SectionHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useLive } from "@/hooks/useLive";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { courseDate, finishOperation, operationKey, statusLabel } from "@/lib/operations";
import { fcfa } from "@/lib/utils";
import type { Earnings } from "@/lib/course-types";

export function TeacherFinancePage() {
  const { user } = useAuth();
  const { data, loading, offline, reload } = useLive<Earnings | null>("/api/teacher/earnings", null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  async function requestPayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || offline) return;
    const form = e.currentTarget; const fd = new FormData(form);
    const payload = { amount: Number(fd.get("amount")), provider: String(fd.get("provider")) };
    const scope = `payout_${user?.id}`;
    setBusy(true); setError(""); setNotice(""); setReauthRequired(false);
    try {
      await api("/api/teacher/payout-requests", { method: "POST", body: { ...payload, idempotencyKey: operationKey(scope, payload) } });
      finishOperation(scope); form.reset(); await reload();
      setNotice("Votre demande est enregistrée et le montant réservé. Le versement n’est confirmé qu’après vérification du prestataire.");
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Demande impossible"); if (ex instanceof ApiError && [401, 403, 409].includes(ex.status)) setReauthRequired(["reauthentication_required", "verified_phone_required", "unauthorized"].includes((ex.data as { error?: string })?.error || "")); }
    finally { setBusy(false); }
  }
  return <AppShell title="Mes revenus et reversements" active="prof-revenus">
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Montants en F CFA (XOF), issus des cours et paiements enregistrés.</p><Button variant="outline" onClick={() => void reload()} disabled={busy || loading}>Actualiser</Button></div>
    {error ? <p role="alert" className="mb-4 text-destructive">{error}</p> : null}
    {reauthRequired ? <Button asChild className="mb-4"><Link to="/login?next=revenus&reauth=1&phone=1">Vérifier mon numéro puis revenir à mes revenus</Link></Button> : null}
    {notice ? <p role="status" className="mb-4 rounded-lg bg-secondary p-4 text-sm">{notice}</p> : null}
    {!data ? <Empty>{loading ? "Chargement…" : "Le relevé n’est pas disponible."}</Empty> : <PageGrid cols={2}>
      <ContentCard><SectionHeading>Mon relevé</SectionHeading>
        <InfoRow label="Net prévisionnel des cours">{fcfa(data.summary.expected)} F</InfoRow>
        <InfoRow label="Dû validé">{fcfa(data.summary.due)} F</InfoRow>
        <InfoRow label="Disponible pour un reversement"><strong>{fcfa(data.summary.releasable)} F</strong></InfoRow>
        <InfoRow label="Réservé dans des demandes en cours">{fcfa(data.summary.reserved)} F</InfoRow>
        <InfoRow label="Versements confirmés par le prestataire">{fcfa(data.summary.paid)} F</InfoRow>
        <p className="mt-4 text-sm">Le prévisionnel n’est pas un solde disponible. Le dû est validé après la réalisation du cours ou la résolution d’un problème, puis libéré par l’équipe.</p>
        <Link className="link-green mt-3 inline-block" to="/cours">Voir le détail de mes cours</Link>
      </ContentCard>
      <ContentCard><SectionHeading>Demander un reversement</SectionHeading>
        <p className="mb-4 text-sm">Le reversement est destiné au numéro de votre compte : <strong>{user?.phone}</strong>. Choisissez l’opérateur du compte Mobile Money associé à ce numéro.</p>
        <p className="mb-4 text-xs text-muted-foreground">Une connexion récente et un numéro vérifié par WhatsApp sont nécessaires. <Link className="underline" to="/login?next=revenus&reauth=1&phone=1">Renouveler ma vérification</Link>.</p>
        <form onSubmit={requestPayout}><fieldset disabled={busy || offline || data.summary.releasable <= 0} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="payout-provider">Opérateur</Label><Select id="payout-provider" name="provider" required defaultValue=""><option value="" disabled>Choisir un opérateur</option><option value="orange">Orange Money</option><option value="mtn">MTN MoMo</option><option value="wave">Wave</option></Select></div>
          <div className="space-y-1.5"><Label htmlFor="payout-amount">Montant (F CFA)</Label><Input id="payout-amount" name="amount" type="number" min="1" step="1" max={data.summary.releasable} required /></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Je confirme que le numéro indiqué correspond à mon compte Mobile Money auprès de cet opérateur.</label>
          <Button type="submit">{busy ? "Enregistrement…" : "Enregistrer ma demande"}</Button>
        </fieldset></form>
        {data.summary.releasable <= 0 ? <p className="mt-4 text-sm">Aucun montant n’est actuellement disponible au reversement.</p> : null}
        <p className="mt-4 text-sm">En cas de numéro incorrect, <Link className="link-green" to="/aide">contactez le support</Link> avant toute demande.</p>
      </ContentCard>
      <ContentCard className="md:col-span-2"><SectionHeading>Historique de mes demandes</SectionHeading>
        {data.payoutRequests.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Demande</th><th className="p-3">Montant</th><th className="p-3">Destination</th><th className="p-3">État</th><th className="p-3">Preuve</th></tr></thead><tbody>{data.payoutRequests.map((request) => <tr key={request.id} className="border-b align-top"><td className="p-3">N° {request.id}<div className="text-xs">{courseDate(request.createdAt)}</div></td><td className="p-3">{fcfa(request.amount)} F</td><td className="p-3">{request.provider}<div>{request.beneficiaryPhone}</div></td><td className="p-3">{request.status === "verified" ? "Confirmé par le prestataire" : statusLabel(request.status)}<div className="mt-1 text-xs">{request.decisionReason || request.reason}</div></td><td className="break-all p-3">{request.providerReference || "—"}{request.verifiedAt ? <div className="text-xs">{courseDate(request.verifiedAt)}</div> : null}</td></tr>)}</tbody></table></div> : <p className="text-sm">Aucune demande de reversement enregistrée.</p>}
      </ContentCard>
    </PageGrid>}
  </AppShell>;
}
