import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, OfflineBanner, Empty } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, apiBase } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useState } from "react";

export function NotificationsPage() {
  const { data, offline, reload } = useLive<typeof fallback.notifications>(
    "/api/notifications",
    fallback.notifications,
  );
  return (
    <AppShell title="Notifications" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await api("/api/notifications/read", { method: "POST", body: {} });
          void reload();
        }}
      >
        Tout lire
      </Button>
      {!data.length ? <Empty>Aucune notification.</Empty> : null}
      {data.map((n, i) => (
        <Card key={i}>
          <CardContent className="flex gap-2 pt-4">
            <span>{n.unread ? "🔵" : "⚪"}</span>
            <div>
              <div>{n.text}</div>
              <div className="text-sm text-muted-foreground">{n.time_ago}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}

export function WalletPage() {
  const { data, offline, reload } = useLive<{
    accounts: { provider?: string; number?: string; label?: string }[];
    transactions: { title?: string; label?: string; amount?: number; subtitle?: string }[];
  }>("/api/wallet", fallback.wallet);
  return (
    <AppShell title="Portefeuille" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {(data.accounts || []).map((a, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="font-semibold">{a.label || a.provider}</div>
            <div className="text-sm text-muted-foreground">{a.number}</div>
          </CardContent>
        </Card>
      ))}
      {(data.transactions || []).map((t, i) => (
        <Card key={i}>
          <CardContent className="flex justify-between pt-4">
            <div>
              <div className="font-semibold">{t.title || t.label}</div>
              <div className="text-sm text-muted-foreground">{t.subtitle}</div>
            </div>
            <strong>{fcfa(t.amount)} F</strong>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}

export function GroupsPage() {
  const [sp] = useSearchParams();
  const kind = sp.get("kind");
  const { data, offline, reload } = useLive<typeof fallback.groups>(
    `/api/groups${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`,
    fallback.groups,
  );
  return (
    <AppShell title="Cours en groupe" active="accueil">
      <p className="text-sm text-muted-foreground">
        <Link to="/groupes" className="text-primary">
          Tous
        </Link>{" "}
        ·{" "}
        <Link to="/groupes?kind=stage" className="text-primary">
          Vacances
        </Link>
      </p>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Aucun groupe disponible.</Empty> : null}
      {data.map((g) => (
        <Link key={g.id} to={`/groupes/${g.id}`}>
          <Card>
            <CardContent className="pt-4">
              <div className="font-semibold">{g.title}</div>
              <div className="text-sm text-muted-foreground">
                {g.detail || g.teacher_name} · {fcfa(g.price)} F
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}

export function GroupDetailPage() {
  const { id } = useParams();
  const { data, offline, reload } = useLive<(typeof fallback.groups)[0] | null>(
    id ? `/api/groups/${id}` : null,
    fallback.groups[0],
  );
  if (!data) {
    return (
      <AppShell title="Groupe" back="/groupes" active="accueil">
        <Empty>Introuvable.</Empty>
      </AppShell>
    );
  }
  return (
    <AppShell title="Détail groupe" back="/groupes" active="accueil">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <Card>
        <CardContent className="pt-4">
          <div className="font-display text-lg font-bold">{data.title}</div>
          <div className="text-sm text-muted-foreground">{data.detail}</div>
          <p className="mt-2 font-bold">{fcfa(data.price)} F</p>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Inscription bientôt disponible sur le web.</p>
    </AppShell>
  );
}

export function SubscriptionPage() {
  const plans = useLive<typeof fallback.plans>("/api/subscription/plans", fallback.plans);
  const mine = useLive<{ plan?: string } | null>("/api/subscription/mine", null);
  return (
    <AppShell title="Abonnement" back="/compte" active="compte">
      {plans.offline ? <OfflineBanner onRetry={() => void plans.reload()} /> : null}
      {mine.data?.plan ? (
        <Card className="border-primary/30 bg-secondary">
          <CardContent className="pt-4">
            <div className="font-semibold">Votre formule</div>
            <div className="text-sm text-muted-foreground">{mine.data.plan}</div>
          </CardContent>
        </Card>
      ) : null}
      {plans.data.map((p) => (
        <Card key={p.name}>
          <CardContent className="pt-4">
            <div className="font-semibold">
              {p.name} {p.popular ? <Badge variant="orange">Populaire</Badge> : null}
            </div>
            <div className="text-sm text-muted-foreground">{p.detail}</div>
            <strong>
              {fcfa(p.price)} F{p.suffix || ""}
            </strong>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}

export function ReferralPage() {
  const { data, offline, reload } = useLive<typeof fallback.referral>("/api/referral", fallback.referral);
  return (
    <AppShell title="Parrainage" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <Card>
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Votre code</div>
          <div className="font-display text-2xl font-black">{data.code}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Filleuls : {data.referred || 0} · Gains : {fcfa(data.earned)} F
        </CardContent>
      </Card>
    </AppShell>
  );
}

export function ResourcesPage() {
  const { data, offline, reload } = useLive<typeof fallback.resources>("/api/resources", fallback.resources);
  return (
    <AppShell title="Ressources" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Aucune ressource.</Empty> : null}
      {data.map((r) => (
        <a key={r.id} href={`${apiBase()}/api/files/${r.id}`} target="_blank" rel="noreferrer">
          <Card>
            <CardContent className="pt-4">
              <div className="font-semibold">{r.title}</div>
              <div className="text-sm text-muted-foreground">
                {r.type} · {r.level}
              </div>
            </CardContent>
          </Card>
        </a>
      ))}
    </AppShell>
  );
}

export function BookingPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  return (
    <AppShell title="Réservation" back="/recherche" active="recherche" hideNav>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          const fd = new FormData(e.currentTarget);
          try {
            const r = await api<{ reference?: string; course?: { id: number } }>("/api/bookings", {
              method: "POST",
              body: {
                teacherId: Number(fd.get("teacherId")),
                teacherName: fd.get("teacherName"),
                subject: fd.get("subject"),
                level: fd.get("level"),
                format: fd.get("format"),
                price: Number(fd.get("price")),
                dayLabel: "SAM",
                dayNum: "22",
                time: "16h00",
                duration: "1h30",
                location: "Cocody",
              },
            });
            sessionStorage.setItem("mpp_booking_price", String(fd.get("price")));
            sessionStorage.setItem("mpp_course_id", String(r.course?.id || ""));
            navigate("/paiement");
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "Erreur");
          }
        }}
      >
        <input type="hidden" name="teacherId" value={sp.get("teacherId") || "1"} />
        <div className="space-y-1.5">
          <Label>Professeur</Label>
          <Input name="teacherName" defaultValue={decodeURIComponent(sp.get("name") || "Professeur")} />
        </div>
        <div className="space-y-1.5">
          <Label>Matière</Label>
          <Input name="subject" defaultValue="Maths" />
        </div>
        <div className="space-y-1.5">
          <Label>Niveau</Label>
          <Input name="level" defaultValue="3ème" />
        </div>
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select name="format" defaultValue="home">
            <option value="home">À domicile</option>
            <option value="online">En ligne</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prix (F)</Label>
          <Input name="price" type="number" defaultValue={sp.get("price") || "6000"} />
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <Button type="submit" className="w-full">
          Continuer vers paiement
        </Button>
      </form>
    </AppShell>
  );
}

export function PaymentPage() {
  const navigate = useNavigate();
  const price = sessionStorage.getItem("mpp_booking_price") || "6000";
  const [err, setErr] = useState("");
  return (
    <AppShell title="Paiement" back="/reservation" hideNav>
      <Card>
        <CardContent className="pt-4">
          <div className="font-semibold">Montant : {fcfa(Number(price))} F</div>
          <div className="text-sm text-muted-foreground">Mobile Money (démo)</div>
        </CardContent>
      </Card>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          const courseId = Number(sessionStorage.getItem("mpp_course_id"));
          if (!courseId) {
            setErr("Réservez d'abord un cours");
            return;
          }
          const fd = new FormData(e.currentTarget);
          try {
            const r = await api<{ paymentId?: number; id?: number; needsOtp?: boolean }>(
              "/api/payments/charge-mobile",
              {
                method: "POST",
                body: { courseId, provider: fd.get("provider"), phone: fd.get("phone") },
              },
            );
            sessionStorage.setItem("mpp_payment_id", String(r.paymentId || r.id || ""));
            navigate(r.needsOtp ? "/paiement-otp" : "/confirmation");
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "Erreur");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label>Opérateur</Label>
          <Select name="provider" defaultValue="orange">
            <option value="orange">Orange Money</option>
            <option value="mtn">MTN</option>
            <option value="wave">Wave</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input name="phone" type="tel" placeholder="+22507…" />
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <Button type="submit" className="w-full">
          Payer
        </Button>
      </form>
    </AppShell>
  );
}

export function PaymentOtpPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  return (
    <AppShell title="Code OTP" back="/paiement" hideNav>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await api("/api/payments/submit-otp", {
              method: "POST",
              body: { paymentId: Number(sessionStorage.getItem("mpp_payment_id")), otp: fd.get("code") },
            });
            navigate("/confirmation");
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "Erreur");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label>Code reçu</Label>
          <Input name="code" maxLength={6} />
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <Button type="submit" className="w-full">
          Valider
        </Button>
      </form>
    </AppShell>
  );
}

export function ConfirmationPage() {
  return (
    <AppShell title="Confirmé" active="cours" hideNav>
      <Card>
        <CardContent className="space-y-2 pt-8 text-center">
          <div className="text-5xl">✓</div>
          <div className="font-display text-lg font-bold">Réservation enregistrée</div>
        </CardContent>
      </Card>
      <Button asChild className="w-full">
        <Link to="/cours">Voir mes cours</Link>
      </Button>
    </AppShell>
  );
}

export function MockPage({ title, text, active }: { title: string; text: string; active?: string }) {
  return (
    <AppShell title={title} back="/compte" active={active || "compte"}>
      <Card>
        <CardContent className="space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">{text}</p>
          <p className="text-sm">Interface fidèle à l&apos;app — données de démonstration.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
