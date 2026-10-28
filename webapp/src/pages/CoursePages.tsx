import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell, ContentCard, Empty, InfoRow, OfflineBanner, PageGrid, PageStack, SectionHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLive } from "@/hooks/useLive";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCapabilities } from "@/lib/capabilities";
import { canPayCourse } from "@/lib/flows";
import { readPaymentSession, savePaymentSession } from "@/lib/payment-session";
import { courseDate, courseEventLabel, finishOperation, operationKey, safeHttpsUrl, scheduleIso, statusLabel } from "@/lib/operations";
import type { Course, CourseDetail } from "@/lib/course-types";
import { fcfa } from "@/lib/utils";

const EMPTY_COURSES: Course[] = [];

function CourseCard({ course }: { course: Course }) {
  const isTeacher = course.participant_role === "teacher";
  return <ContentCard>
    <SectionHeading>{course.subject} · {course.level}</SectionHeading>
    <p className="mb-1 text-xs text-muted-foreground">{isTeacher ? "J’enseigne ce cours" : "J’ai réservé ce cours"}</p>
    <p>{isTeacher ? course.student_name || course.parent_name || "Élève" : course.teacher_name}</p>
    <p className="mt-2 text-sm">{courseDate(course.starts_at)}</p>
    <p className="mt-1 text-sm text-muted-foreground">{course.duration} · {course.format === "home" ? "À domicile" : "En ligne — lien externe"}</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><Badge>{statusLabel(course.lifecycle_status)}</Badge><strong>{fcfa(course.price)} F</strong></div>
    <p className="mt-2 text-sm">Paiement : {statusLabel(course.payment_status)}</p>
    <Button asChild className="mt-4 w-full" variant="outline"><Link to={`/cours/${course.id}`}>Détails et actions du cours</Link></Button>
  </ContentCard>;
}

export function CoursesPage() {
  const { isTeacher } = useAuth();
  const { data, offline, loading, reload } = useLive<Course[]>("/api/courses", EMPTY_COURSES);
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [filter, setFilter] = useState("all");
  const filtered = data.filter((c) => filter === "all" || (filter === "open"
    ? !["completed", "cancelled", "refused"].includes(c.lifecycle_status)
    : ["completed", "cancelled", "refused"].includes(c.lifecycle_status)));
  return <AppShell title={isTeacher ? "Mes cours et élèves" : "Mes cours"} active="cours">
    {notice ? <p role="status" className="mb-4 rounded-lg bg-secondary p-3 text-sm">{notice}</p> : null}
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Label htmlFor="course-filter">Afficher</Label><Select id="course-filter" className="w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Tous les cours</option><option value="open">Cours en cours de suivi</option><option value="closed">Cours clôturés</option></Select>
      <Button asChild variant="outline"><Link to="/agenda">Mon agenda</Link></Button>
      <Button variant="outline" onClick={() => void reload()} disabled={loading}>Actualiser</Button>
    </div>
    {filtered.length ? <PageGrid>{filtered.map((course) => <CourseCard key={course.id} course={course} />)}</PageGrid> : !offline ? <Empty>{loading ? "Chargement…" : "Aucun cours dans cette sélection."}</Empty> : null}
  </AppShell>;
}

export function AgendaPage() {
  const { data, offline, loading, reload } = useLive<Course[]>("/api/courses", EMPTY_COURSES);
  const [showPast, setShowPast] = useState(false);
  const active = data.filter((c) => !["cancelled", "refused"].includes(c.lifecycle_status));
  const unscheduled = active.filter((c) => !c.starts_at);
  const scheduled = active.filter((c) => c.starts_at && (showPast || new Date(c.starts_at).getTime() + (c.duration_minutes || 90) * 60_000 >= Date.now()))
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
  const groups = new Map<string, Course[]>();
  for (const course of scheduled) { const key = course.starts_at!.slice(0, 10); groups.set(key, [...(groups.get(key) || []), course]); }
  return <AppShell title="Mon agenda" active="agenda">
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Les créneaux confirmés et demandés de vos cours. Heures de Côte d’Ivoire (UTC).</p><Button variant="outline" onClick={() => void reload()} disabled={loading}>Actualiser</Button></div>
    <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />Afficher également les cours passés</label>
    <PageStack>
      {unscheduled.length ? <ContentCard><SectionHeading>Créneaux à convenir</SectionHeading><ul className="space-y-3">{unscheduled.map((c) => <li key={c.id}><Link className="link-green" to={`/cours/${c.id}`}>{c.subject} · {c.participant_role === "teacher" ? c.student_name || c.parent_name || "Élève" : c.teacher_name} — proposer un créneau</Link></li>)}</ul></ContentCard> : null}
      {[...groups].map(([day, courses]) => <section key={day}><SectionHeading>{courseDate(`${day}T00:00:00Z`, false)}</SectionHeading><PageGrid>{courses.map((course) => <CourseCard key={course.id} course={course} />)}</PageGrid></section>)}
      {!scheduled.length && !unscheduled.length && !offline ? <Empty>{loading ? "Chargement…" : "Aucun cours à afficher dans votre agenda."}</Empty> : null}
    </PageStack>
  </AppShell>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { capabilities } = useCapabilities();
  const navigate = useNavigate();
  const { data, loading, offline, reload } = useLive<CourseDetail | null>(id ? `/api/courses/${id}` : null, null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const course = data?.course;
  const can = (permission: string) => Boolean(data?.permissions.includes(permission)) && !offline;

  async function mutate(action: string, body: unknown, success: string, method = "POST") {
    if (!id || busy || offline) return false;
    setBusy(action); setError(""); setNotice("");
    try {
      await api(`/api/courses/${id}/${action}`, { method, body });
      await reload(); setNotice(success); return true;
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Opération impossible"); return false; }
    finally { setBusy(""); }
  }

  async function schedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form);
    try {
      const startAt = scheduleIso(String(fd.get("date")), String(fd.get("time")));
      if (await mutate("schedule", { startAt, reason: fd.get("reason") }, "Proposition envoyée. Le créneau ne change qu’après acceptation par l’autre partie.")) form.reset();
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Date invalide"); }
  }

  async function requestRefund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form);
    const payload = { amount: Number(fd.get("amount")), reason: String(fd.get("reason") || "").trim() };
    const scope = `refund_${user?.id}_${id}`;
    const key = operationKey(scope, payload);
    if (await mutate("refund-requests", { ...payload, idempotencyKey: key }, "Demande de remboursement enregistrée. Aucun remboursement n’est confirmé à ce stade.")) {
      finishOperation(scope); form.reset();
    }
  }

  if (!course || !data) return <AppShell title="Détail du cours" active="cours" back="/cours">{offline ? <OfflineBanner onRetry={() => void reload()} /> : null}{!offline ? <Empty>{loading ? "Chargement du cours…" : "Ce cours n’est pas accessible."}</Empty> : null}</AppShell>;
  const isTeacher = course.participant_role === "teacher";
  const meeting = safeHttpsUrl(course.meeting_url);
  const phone = isTeacher ? data.contacts.parentPhone : data.contacts.teacherPhone;
  const finance = data.finance;
  const actionsDisabled = Boolean(busy) || offline;

  return <AppShell title={`${course.subject} · ${course.level}`} active="cours" back="/cours">
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <div className="mb-4 flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/cours">← Mes cours</Link></Button><Button variant="outline" disabled={Boolean(busy) || loading} onClick={() => void reload()}>Actualiser</Button></div>
    {error ? <p role="alert" className="mb-4 rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p> : null}
    {notice ? <p role="status" className="mb-4 rounded-lg bg-secondary p-3 text-sm">{notice}</p> : null}
    <PageGrid cols={2}>
      <ContentCard><SectionHeading>Votre rendez-vous</SectionHeading>
        <Badge>{statusLabel(course.lifecycle_status)}</Badge>
        <InfoRow label="Cours">{course.subject} · {course.level} · {course.duration}</InfoRow>
        <InfoRow label="Date et heure">{courseDate(course.starts_at)} (Côte d’Ivoire)</InfoRow>
        <InfoRow label={isTeacher ? "Famille / élève" : "Professeur"}>{isTeacher ? course.student_name || course.parent_name : course.teacher_name}</InfoRow>
        <InfoRow label="Contact">{phone && /^\+?\d{8,15}$/.test(phone) ? <a className="link-green" href={`tel:${phone}`}>{phone}</a> : course.accepted ? "Coordonnées indisponibles. Contactez le support." : "Le contact sera disponible après acceptation du cours."}</InfoRow>
        {course.format === "home" ? <InfoRow label="Adresse du cours">{course.private_address || course.location || "L’adresse précise doit être renseignée avant le rendez-vous."}</InfoRow>
          : <InfoRow label="Accès au cours en ligne">{meeting ? <a className="link-green" href={meeting} target="_blank" rel="noopener noreferrer">Ouvrir le lien fourni par le professeur</a> : "Le professeur doit fournir un lien de réunion externe avant le cours."}</InfoRow>}
        {course.access_notes ? <InfoRow label="Précisions d’accès"><span className="whitespace-pre-wrap">{course.access_notes}</span></InfoRow> : null}
        <p className="mt-4 text-sm"><Link to="/aide" className="link-green">Contacter le support</Link> en cas de difficulté à joindre votre interlocuteur.</p>
      </ContentCard>
      <ContentCard><SectionHeading>Paiement et suivi financier</SectionHeading>
        <InfoRow label="Prix du cours">{fcfa(finance.grossAmount)} F</InfoRow>
        <InfoRow label="Montant encaissé">{fcfa(finance.capturedAmount)} F</InfoRow>
        <InfoRow label="Remboursement confirmé">{fcfa(finance.refundAmount)} F</InfoRow>
        {finance.refundPendingAmount > 0 ? <InfoRow label="Remboursement en cours d’examen">{fcfa(finance.refundPendingAmount)} F</InfoRow> : null}
        {isTeacher ? <><InfoRow label="Net prévu pour ce cours">{finance.teacherNetAmount == null ? "Termes historiques à documenter par l’équipe" : `${fcfa(finance.teacherNetAmount)} F`}</InfoRow><InfoRow label="Dû validé">{finance.teacherDue === null ? "En attente de réalisation ou de décision" : `${fcfa(finance.teacherDue)} F`}</InfoRow><InfoRow label="Disponible au reversement">{fcfa(finance.teacherReleasable)} F</InfoRow><InfoRow label="Déjà reversé">{fcfa(finance.teacherPaid)} F</InfoRow></> : null}
        {finance.reviewRequired ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Le règlement de ce cours nécessite l’examen de l’équipe.</p> : null}
        {!isTeacher && canPayCourse(course) && user ? <Button className="mt-4" disabled={actionsDisabled} onClick={() => {
          const current = readPaymentSession(user.id);
          savePaymentSession(current?.courseId === course.id ? current : { userId: user.id, courseId: course.id, amount: course.price }); navigate("/paiement");
        }}>Régler / consulter mon paiement</Button> : null}
        {!course.starts_at && course.accepted ? <p className="mt-3 text-sm">Le paiement sera accessible après accord sur un créneau.</p> : null}
      </ContentCard>
      {can("edit_details") ? <ContentCard><SectionHeading>Préciser les modalités</SectionHeading>
        <form key={`${course.private_address}|${course.meeting_url}|${course.access_notes}`} className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); const fd = new FormData(e.currentTarget);
          await mutate("details", { privateAddress: !isTeacher && course.format === "home" ? fd.get("privateAddress") : undefined,
            meetingUrl: isTeacher && course.format === "online" ? fd.get("meetingUrl") : undefined, accessNotes: fd.get("accessNotes") }, "Les modalités du cours ont été enregistrées.", "PUT");
        }}><fieldset disabled={actionsDisabled} className="space-y-3">
          {!isTeacher && course.format === "home" ? <Field label="Adresse précise du cours" id="private-address"><Textarea id="private-address" name="privateAddress" required maxLength={1000} defaultValue={course.private_address || course.location || ""} /></Field> : null}
          {isTeacher && course.format === "online" ? <Field label="Lien HTTPS de la réunion" id="meeting-url"><Input id="meeting-url" name="meetingUrl" type="url" pattern="https://.*" required maxLength={2000} defaultValue={course.meeting_url || ""} placeholder="https://…" /><p className="text-xs text-muted-foreground">Utilisez un lien prévu pour cette séance. Le service de visioconférence est externe à Mon Prof Perso.</p></Field> : null}
          <Field label="Précisions utiles pour l’accès" id="access-notes"><Textarea id="access-notes" name="accessNotes" maxLength={2000} defaultValue={course.access_notes || ""} /></Field>
          <Button type="submit">Enregistrer les modalités</Button>
        </fieldset></form>
      </ContentCard> : null}
      {data.scheduleRequests.length || can("schedule") ? <ContentCard><SectionHeading>Planification et reports</SectionHeading>
        {data.scheduleRequests.map((proposal) => <div key={proposal.id} className="mb-4 rounded-lg border p-3">
          <p className="font-semibold">{courseDate(proposal.startAt)}</p><p className="text-sm">{statusLabel(proposal.status)} · {proposal.proposedBy === user?.id ? "Votre proposition" : "Proposition de votre interlocuteur"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{proposal.reason}</p>
          {proposal.status === "pending" && proposal.proposedBy !== user?.id && can("respond_schedule") ? <div className="mt-3 flex flex-wrap gap-2"><Button disabled={actionsDisabled} onClick={() => void mutate(`schedule/${proposal.id}/respond`, { decision: "accept" }, "Le nouveau créneau est confirmé.")}>Accepter ce créneau</Button><Button variant="outline" disabled={actionsDisabled} onClick={() => void mutate(`schedule/${proposal.id}/respond`, { decision: "decline", reason: "Créneau non disponible" }, "La proposition a été refusée. Vous pouvez proposer un autre créneau.")}>Refuser</Button></div> : null}
        </div>)}
        {can("schedule") ? <form onSubmit={schedule}><fieldset disabled={actionsDisabled} className="space-y-3">
          <p className="text-sm">Le créneau actuel reste valable jusqu’à l’accord de l’autre partie. Une proposition ne vaut pas confirmation.</p>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Date (Côte d’Ivoire)" id="schedule-date"><Input id="schedule-date" name="date" type="date" required min={new Date().toISOString().slice(0, 10)} /></Field><Field label="Heure (UTC)" id="schedule-time"><Input id="schedule-time" name="time" type="time" required /></Field></div>
          <Field label="Motif / précisions" id="schedule-reason"><Textarea id="schedule-reason" name="reason" required minLength={3} maxLength={1000} /></Field><Button type="submit">Proposer ce créneau</Button>
        </fieldset></form> : null}
      </ContentCard> : null}
      {can("report") ? <ContentCard><SectionHeading>Compte rendu de la séance</SectionHeading>
        <p className="mb-4 text-sm">Indiquez ce qui s’est passé. La réalisation est confirmée lorsque les deux parties la déclarent ; un désaccord est soumis à l’équipe.</p>
        <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); if (await mutate("report", { outcome: fd.get("outcome"), note: fd.get("note"), progressSummary: isTeacher ? fd.get("progressSummary") || undefined : undefined }, "Votre compte rendu a été enregistré.")) form.reset(); }}>
          <fieldset disabled={actionsDisabled} className="space-y-3"><Field label="Déroulement du cours" id="report-outcome"><Select id="report-outcome" name="outcome"><option value="completed">Le cours a été réalisé</option><option value="teacher_absent">Le professeur était absent</option><option value="student_absent">L’élève était absent</option><option value="disputed">Un autre problème est survenu</option></Select></Field>
            <Field label="Votre compte rendu" id="report-note"><Textarea id="report-note" name="note" required minLength={3} maxLength={2000} /></Field>
            {isTeacher && capabilities.progress ? <Field label="Bilan pédagogique partagé avec la famille (facultatif)" id="progress-summary"><Textarea id="progress-summary" name="progressSummary" maxLength={2000} /></Field> : null}
            <Button type="submit">Envoyer mon compte rendu</Button>
          </fieldset>
        </form>
      </ContentCard> : null}
      {can("cancel") ? <ContentCard><SectionHeading>Annuler le cours</SectionHeading><p className="mb-3 text-sm">L’annulation arrête le cours. Si un paiement a été encaissé, le montant à rembourser est examiné séparément ; l’annulation ne confirme aucun remboursement.</p>
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await mutate("cancel", { reason: fd.get("reason") }, "Le cours est annulé. Consultez le suivi financier pour la suite."); }}><fieldset disabled={actionsDisabled} className="space-y-3"><Field label="Motif d’annulation" id="cancel-reason"><Textarea id="cancel-reason" name="reason" required minLength={3} maxLength={1000} /></Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Je confirme l’annulation de ce cours.</label><Button variant="destructive" type="submit">Confirmer l’annulation</Button></fieldset></form>
      </ContentCard> : null}
      {can("request_refund") ? <ContentCard><SectionHeading>Demander un remboursement</SectionHeading><p className="mb-3 text-sm">Votre demande est examinée par l’équipe. Le remboursement sera affiché comme confirmé uniquement après vérification auprès du prestataire de paiement.</p>
        <form onSubmit={requestRefund}><fieldset disabled={actionsDisabled} className="space-y-3"><Field label="Montant demandé (F CFA)" id="refund-amount"><Input id="refund-amount" name="amount" type="number" step="1" min="1" max={Math.max(0, finance.capturedAmount - finance.refundAmount - finance.refundPendingAmount)} required /></Field><Field label="Motif" id="refund-reason"><Textarea id="refund-reason" name="reason" required minLength={3} maxLength={1000} /></Field><Button type="submit">Envoyer la demande de remboursement</Button></fieldset></form>
      </ContentCard> : null}
      {can("review") && capabilities.reviews ? <ContentCard><SectionHeading>Votre avis sur le professeur</SectionHeading><form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); if (await mutate("review", { rating: Number(fd.get("rating")), text: fd.get("text") }, "Votre avis a été enregistré.")) form.reset(); }}><fieldset disabled={actionsDisabled} className="space-y-3"><Field label="Note" id="review-rating"><Select id="review-rating" name="rating" required defaultValue=""><option value="" disabled>Choisir une note</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</Select></Field><Field label="Votre expérience de ce cours" id="review-text"><Textarea id="review-text" name="text" required minLength={3} maxLength={2000} /></Field><Button type="submit">Publier mon avis</Button></fieldset></form></ContentCard> : null}
      {data.review ? <ContentCard><SectionHeading>Avis publié pour ce cours</SectionHeading><p>★ {data.review.rating} / 5</p><p className="mt-2 whitespace-pre-wrap text-sm">{data.review.text}</p></ContentCard> : null}
      {data.reports.length ? <ContentCard><SectionHeading>Comptes rendus</SectionHeading><div className="space-y-4">{data.reports.map((report) => <div key={report.id} className="border-b pb-3"><p className="font-semibold">{report.actorRole === "teacher" ? "Professeur" : report.actorRole === "admin" ? "Équipe" : "Famille"} · {statusLabel(report.outcome)}</p><p className="whitespace-pre-wrap text-sm">{report.note}</p>{report.progressSummary ? <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Bilan pédagogique : </strong>{report.progressSummary}</p> : null}<p className="mt-2 text-xs text-muted-foreground">{courseDate(report.createdAt)}</p></div>)}</div></ContentCard> : null}
      {data.financialOperations?.length ? <ContentCard><SectionHeading>Demandes financières</SectionHeading><div className="space-y-4">{data.financialOperations.map((operation) => <div key={operation.id} className="border-b pb-3"><p className="font-semibold">{operation.kind === "refund" ? "Remboursement" : "Reversement"} n°{operation.id} · {fcfa(operation.amount)} F</p><p className="text-sm">{operation.status === "verified" ? "Confirmé par le prestataire" : statusLabel(operation.status)}</p><p className="text-sm">{operation.decisionReason || operation.reason}</p>{operation.providerReference ? <p className="break-all text-xs">Référence : {operation.providerReference}</p> : null}</div>)}</div></ContentCard> : null}
      <ContentCard><SectionHeading>Historique du cours</SectionHeading>{data.events.length ? <ol className="space-y-3">{data.events.map((event) => <li key={event.id} className="border-b pb-3 text-sm"><strong>{courseEventLabel(event.type)}</strong><p>{courseDate(event.createdAt)}</p>{typeof event.details?.reason === "string" ? <p className="whitespace-pre-wrap">{event.details.reason}</p> : null}</li>)}</ol> : <p className="text-sm">Aucun événement supplémentaire.</p>}</ContentCard>
    </PageGrid>
  </AppShell>;
}
