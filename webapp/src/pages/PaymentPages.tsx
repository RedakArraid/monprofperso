import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, ContentCard, Empty, OfflineBanner, PageStack, SectionHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canPayCourse, isConfirmedPayment, normalizeCiPhone, paymentStep, type PaymentResult, type PaymentStatus } from "@/lib/flows";
import { readPaymentSession, savePaymentSession, type PaymentSession } from "@/lib/payment-session";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";

type BookingTeacher = { id: number; name: string; subjects: string; price_per_hour: number; formats?: string[] };

export function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const teacherId = Number(params.get("teacherId"));
  const { data: teacher, loading, offline, reload } = useLive<BookingTeacher | null>(
    Number.isInteger(teacherId) && teacherId > 0 ? `/api/teachers/${teacherId}` : null, null,
  );
  const [duration, setDuration] = useState("1h30");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const durations = [{ label: "1 heure", value: "1h00", hours: 1 }, { label: "1 h 30", value: "1h30", hours: 1.5 }, { label: "2 heures", value: "2h00", hours: 2 }];
  const estimate = teacher ? Math.round(teacher.price_per_hour * durations.find((d) => d.value === duration)!.hours) : 0;

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!teacher || !user || busy) return;
    const form = new FormData(e.currentTarget);
    setErr(""); setBusy(true);
    try {
      const startAt = new Date(`${form.get("date")}T${form.get("time")}:00Z`);
      if (!Number.isFinite(startAt.getTime()) || startAt.getTime() <= Date.now()) throw new Error("Choisissez une date et une heure futures.");
      const result = await api<{ course: { id: number; price: number; accepted?: boolean } }>("/api/bookings", {
        method: "POST",
        body: { teacherId: teacher.id, subject: form.get("subject"), level: form.get("level"),
          format: form.get("format"), duration, startAt: startAt.toISOString(), location: form.get("location") },
      });
      if (!Number.isInteger(result.course?.id) || !Number.isFinite(result.course.price)) throw new Error("La réservation n'a pas été confirmée.");
      savePaymentSession({ userId: user.id, courseId: result.course.id, amount: result.course.price });
      navigate("/cours", { state: { notice: "Demande enregistrée. Le paiement sera disponible après acceptation du professeur." } });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Réservation impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Réserver un cours" back="/recherche" active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!teacher ? <Empty>{loading ? "Chargement du professeur…" : "Choisissez un professeur disponible depuis la recherche."}</Empty> : (
        <PageStack narrow><ContentCard>
          <SectionHeading>{teacher.name}</SectionHeading>
          <p className="mb-4 text-sm">{fcfa(teacher.price_per_hour)} F par heure. Le montant est calculé à partir du tarif du professeur et de la durée.</p>
          <form className="space-y-4" onSubmit={book}>
            <fieldset disabled={busy || offline} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="booking-subject">Matière</Label><Input id="booking-subject" name="subject" required maxLength={80} defaultValue={teacher.subjects.split("·")[0]?.trim()} /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-level">Niveau</Label><Input id="booking-level" name="level" required maxLength={40} /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-date">Date (Côte d&apos;Ivoire)</Label><Input id="booking-date" name="date" type="date" required min={new Date().toISOString().slice(0, 10)} /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-time">Heure (Côte d&apos;Ivoire, UTC)</Label><Input id="booking-time" name="time" type="time" required /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-duration">Durée</Label><Select id="booking-duration" value={duration} onChange={(e) => setDuration(e.target.value)}>{durations.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</Select></div>
              <div className="space-y-1.5"><Label htmlFor="booking-format">Format</Label><Select id="booking-format" name="format" defaultValue={teacher.formats?.[0] || "home"}>
                {(!teacher.formats || teacher.formats.includes("home")) && <option value="home">À domicile</option>}
                {(!teacher.formats || teacher.formats.includes("online")) && <option value="online">En ligne</option>}
              </Select></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="booking-location">Lieu / précisions d&apos;accès</Label><Input id="booking-location" name="location" maxLength={200} /></div>
            </fieldset>
            <p className="text-lg font-bold text-primary">Montant estimé : {fcfa(estimate)} F</p>
            <p className="text-sm text-muted-foreground">Le créneau demandé doit être accepté par le professeur.</p>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || offline}>{busy ? "Enregistrement…" : "Enregistrer la demande"}</Button>
          </form>
        </ContentCard></PageStack>
      )}
    </AppShell>
  );
}

type PaymentDetails = PaymentResult & { paid: boolean; coursePaymentStatus: string };
type PayableCourse = { id: number; price: number; accepted: boolean; payment_status: string; status: string };

function PaymentFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<PaymentSession | null>(() => readPaymentSession(user?.id));
  const { data: courses, loading: coursesLoading, offline: coursesOffline, reload: reloadCourses } = useLive<PayableCourse[]>("/api/courses", []);
  const course = courses.find((item) => item.id === session?.courseId);
  const payable = canPayCourse(course);
  const [state, setState] = useState<PaymentStatus | "idle" | "checking">(session?.paymentId ? "checking" : "idle");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pollCycle, setPollCycle] = useState(0);
  const [pollStopped, setPollStopped] = useState(false);
  const shouldPoll = state === "pending" || state === "checking";
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function receive(result: PaymentResult) {
    const next = paymentStep(result);
    if (!session) throw new Error("Réservation introuvable.");
    const saved = { ...session, paymentId: result.paymentId, amount: result.amount ?? session.amount };
    savePaymentSession(saved);
    setSession(saved);
    setState(next);
    setMessage(result.message || "");
    setPollStopped(false);
    if (next === "success") navigate("/confirmation", { replace: true });
  }

  useEffect(() => {
    if (!session?.paymentId || !shouldPoll) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    setPollStopped(false);
    const poll = async () => {
      if (controller.signal.aborted) return;
      const requestController = new AbortController();
      const abortRequest = () => requestController.abort();
      controller.signal.addEventListener("abort", abortRequest, { once: true });
      // The API may perform two provider checks, each limited to 15 seconds.
      const requestTimeout = setTimeout(abortRequest, 35_000);
      try {
        const result = await api<PaymentDetails>(`/api/payments/${session.paymentId}/status`, { signal: requestController.signal });
        if (controller.signal.aborted) return;
        const next = paymentStep(result);
        setState(next);
        setMessage(result.message || "");
        if (next === "success") {
          navigate("/confirmation", { replace: true });
          return;
        }
        if (next !== "pending") return;
        setErr("");
      } catch (ex) {
        if (controller.signal.aborted) return;
        setErr(requestController.signal.aborted
          ? "Le délai de vérification est dépassé. Le paiement reste en attente de confirmation."
          : ex instanceof Error ? ex.message : "Vérification impossible");
      } finally {
        clearTimeout(requestTimeout);
        controller.signal.removeEventListener("abort", abortRequest);
      }
      attempts += 1;
      if (attempts < 30) timer = setTimeout(() => void poll(), 10_000);
      else setPollStopped(true);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session?.paymentId, shouldPoll, pollCycle, navigate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || busy || (state !== "otp_required" && !payable)) return;
    const form = new FormData(e.currentTarget);
    setErr(""); setBusy(true);
    try {
      const result = state === "otp_required"
        ? await api<PaymentResult>("/api/payments/submit-otp", { method: "POST", body: { paymentId: session.paymentId, otp: form.get("code") } })
        : await api<PaymentResult>("/api/payments/charge-mobile", { method: "POST", body: { courseId: session.courseId, provider: form.get("provider"), phone: normalizeCiPhone(String(form.get("phone") || "")) } });
      if (mounted.current) receive(result);
    } catch (ex) {
      if (mounted.current) setErr(ex instanceof Error ? ex.message : "Paiement indisponible");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (!session) return <AppShell title="Paiement" back="/cours"><Empty>Aucune réservation à payer. Ouvrez le cours concerné.</Empty></AppShell>;
  return (
    <AppShell title="Paiement" back="/cours">
      <PageStack narrow><ContentCard>
        <SectionHeading>Montant de la réservation</SectionHeading>
        <p className="text-2xl font-bold text-primary">{fcfa(course?.price ?? session.amount)} F</p>
        {state === "checking" || state === "pending" ? (
          <div className="mt-4 space-y-3" role="status">
            <p>{state === "checking" ? "Vérification du paiement…" : message || "Paiement en attente de confirmation. Suivez les instructions de votre opérateur sur votre téléphone."}</p>
            <p className="text-sm text-muted-foreground">La réservation sera indiquée comme payée après confirmation du paiement.</p>
            {pollStopped ? <><p className="text-sm">La confirmation prend plus de temps. Vous pouvez revenir ici pour vérifier le même paiement.</p><Button onClick={() => setPollCycle((n) => n + 1)}>Vérifier à nouveau</Button></> : <p className="text-sm">Vérification automatique en cours…</p>}
          </div>
        ) : state === "failed" ? (
          <div className="mt-4 space-y-3"><p role="alert">Le paiement a échoué. Aucun succès n&apos;a été confirmé.</p>{message ? <p>{message}</p> : null}
            <Button variant="outline" onClick={() => {
              const next = { ...session, paymentId: undefined };
              savePaymentSession(next); setSession(next); setState("idle"); setErr(""); setMessage("");
            }}>Recommencer le paiement</Button>
          </div>
        ) : state === "idle" && !payable ? (
          <div className="mt-4 space-y-3">
            <p>{coursesLoading ? "Vérification de la réservation…" : course?.payment_status === "paid" ? "Ce cours est déjà payé." : course && !course.accepted ? "Votre demande attend l’accord du professeur. Le paiement sera disponible après son acceptation." : "Cette réservation n’est pas disponible au paiement."}</p>
            {coursesOffline ? <OfflineBanner onRetry={() => void reloadCourses()} /> : <Button variant="outline" onClick={() => void reloadCourses()}>Actualiser la réservation</Button>}
          </div>
        ) : state !== "success" ? (
          <form className="mt-4 space-y-4" onSubmit={submit}>
            {state === "otp_required" ? (
              <><p>{message || "Saisissez le code reçu de votre opérateur pour ce paiement."}</p><Label htmlFor="payment-otp">Code du paiement</Label><Input id="payment-otp" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" required maxLength={10} /></>
            ) : (
              <><div className="space-y-1.5"><Label htmlFor="payment-provider">Opérateur</Label><Select id="payment-provider" name="provider"><option value="orange">Orange Money</option><option value="mtn">MTN</option><option value="wave">Wave</option></Select></div>
                <div className="space-y-1.5"><Label htmlFor="payment-phone">Téléphone Mobile Money</Label><Input id="payment-phone" name="phone" type="tel" required defaultValue={user?.phone} autoComplete="tel" /></div></>
            )}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Traitement…" : state === "otp_required" ? "Valider le code" : "Payer"}</Button>
          </form>
        ) : null}
        {err ? <p role="alert" className="mt-3 text-sm text-destructive">{err}</p> : null}
        <Button asChild variant="ghost" className="mt-3"><Link to="/cours">Retrouver mes cours</Link></Button>
      </ContentCard></PageStack>
    </AppShell>
  );
}

export function PaymentPage() { return <PaymentFlow />; }
export function PaymentOtpPage() { return <PaymentFlow />; }

export function ConfirmationPage() {
  const { user } = useAuth();
  const session = readPaymentSession(user?.id);
  const { data, loading, offline, reload } = useLive<PaymentDetails | null>(session?.paymentId ? `/api/payments/${session.paymentId}/status` : null, null);
  const confirmed = isConfirmedPayment(data);
  return (
    <AppShell title={confirmed ? "Paiement confirmé" : "Statut du paiement"} active="cours">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack narrow><ContentCard className="text-center">
        <SectionHeading>{confirmed ? "Paiement confirmé" : loading ? "Vérification…" : "Paiement non confirmé"}</SectionHeading>
        <p>{confirmed ? `Votre paiement de ${fcfa(data?.amount)} F a été confirmé.` : "Consultez le paiement pour connaître son état et poursuivre si nécessaire."}</p>
        <Button asChild className="mt-4"><Link to={confirmed ? "/cours" : "/paiement"}>{confirmed ? "Voir mes cours" : "Consulter le paiement"}</Link></Button>
      </ContentCard></PageStack>
    </AppShell>
  );
}
