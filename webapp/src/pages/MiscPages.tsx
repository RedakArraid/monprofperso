import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AppShell,
  OfflineBanner,
  Empty,
  PageStack,
  PageGrid,
  ContentCard,
  SectionHeading,
  InfoRow,
  DocLink,
} from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, apiBase } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useMemo, useState } from "react";

export function NotificationsPage() {
  const { data, offline, reload } = useLive<typeof fallback.notifications>(
    "/api/notifications",
    fallback.notifications,
  );
  return (
    <AppShell title="Notifications" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? (
        <Empty>Aucune notification n&apos;est disponible</Empty>
      ) : (
        <ContentCard>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <SectionHeading className="mb-0">Mes notifications</SectionHeading>
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
          </div>
          <div className="grid gap-0 divide-y divide-[#eee] md:grid-cols-2 md:gap-x-8 md:divide-y-0">
            {data.map((n, i) => (
              <div key={i} className="flex gap-3 border-b border-[#eee] py-3 md:border-b md:py-3">
                <span className={n.unread ? "text-primary" : "text-[#ccc]"}>●</span>
                <div>
                  <div className="text-[15px] text-[#333]">{n.text}</div>
                  <div className="text-sm text-[#888]">{n.time_ago}</div>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}
    </AppShell>
  );
}

export function WalletPage() {
  const { data, offline, reload } = useLive<{
    accounts: { provider?: string; number?: string; label?: string }[];
    transactions: { title?: string; label?: string; amount?: number; subtitle?: string }[];
  }>("/api/wallet", fallback.wallet);
  const empty = !(data.accounts || []).length && !(data.transactions || []).length;
  return (
    <AppShell title="Portefeuille" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {empty ? (
        <Empty>Aucun acompte n&apos;est disponible</Empty>
      ) : (
        <PageGrid cols={2}>
          {(data.accounts || []).map((a, i) => (
            <ContentCard key={i}>
              <SectionHeading>{a.label || a.provider || "Compte"}</SectionHeading>
              <p className="text-[15px] text-[#444]">{a.number}</p>
            </ContentCard>
          ))}
          <ContentCard className={(data.accounts || []).length ? "sm:col-span-2" : undefined}>
            <SectionHeading>Transactions</SectionHeading>
            <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
              {(data.transactions || []).map((t, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-[#eee] py-3">
                  <div>
                    <div className="text-[15px] font-medium text-[#333]">{t.title || t.label}</div>
                    <div className="text-sm text-[#888]">{t.subtitle}</div>
                  </div>
                  <strong className="text-primary">{fcfa(t.amount)} F</strong>
                </div>
              ))}
            </div>
          </ContentCard>
        </PageGrid>
      )}
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
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="mb-4">
        <ContentCard>
          <SectionHeading>Filtres</SectionHeading>
          <div className="flex flex-wrap gap-4 text-[15px]">
            <Link to="/groupes" className={!kind ? "font-bold text-welcome" : "link-green"}>
              Tous
            </Link>
            <Link to="/groupes?kind=stage" className={kind === "stage" ? "font-bold text-welcome" : "link-green"}>
              Vacances
            </Link>
          </div>
        </ContentCard>
      </div>
      {!data.length ? (
        <Empty>Aucun groupe n&apos;a été trouvé</Empty>
      ) : (
        <PageGrid>
          {data.map((g) => (
            <Link key={g.id} to={`/groupes/${g.id}`} className="block h-full">
              <ContentCard className="transition hover:shadow-md">
                <SectionHeading className="mb-1">{g.title}</SectionHeading>
                <p className="text-[15px] text-[#555]">
                  {g.detail || g.teacher_name} · {fcfa(g.price)} F
                </p>
              </ContentCard>
            </Link>
          ))}
        </PageGrid>
      )}
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
        <Empty>Aucun groupe n&apos;a été trouvé</Empty>
      </AppShell>
    );
  }
  return (
    <AppShell title="Détail groupe" back="/groupes" active="accueil">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>{data.title}</SectionHeading>
          <p className="text-[15px] text-[#555]">{data.detail}</p>
          <p className="mt-3 text-lg font-bold text-primary">{fcfa(data.price)} F</p>
          <p className="mt-4 text-sm text-[#888]">Inscription bientôt disponible sur le web.</p>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function SubscriptionPage() {
  const plans = useLive<typeof fallback.plans>("/api/subscription/plans", fallback.plans);
  const mine = useLive<{ plan?: string } | null>("/api/subscription/mine", null);
  return (
    <AppShell title="Abonnement" back="/compte" active="compte">
      {plans.offline ? <OfflineBanner onRetry={() => void plans.reload()} /> : null}
      <PageGrid>
        {mine.data?.plan ? (
          <ContentCard className="sm:col-span-2 xl:col-span-3">
            <SectionHeading>Votre formule</SectionHeading>
            <p className="text-[15px] text-[#444]">{mine.data.plan}</p>
          </ContentCard>
        ) : null}
        {plans.data.map((p) => (
          <ContentCard key={p.name}>
            <SectionHeading>
              {p.name} {p.popular ? <Badge variant="orange">Populaire</Badge> : null}
            </SectionHeading>
            <p className="text-[15px] text-[#555]">{p.detail}</p>
            <strong className="mt-2 block text-primary">
              {fcfa(p.price)} F{p.suffix || ""}
            </strong>
          </ContentCard>
        ))}
      </PageGrid>
    </AppShell>
  );
}

export function ReferralPage() {
  const { data, offline, reload } = useLive<typeof fallback.referral>("/api/referral", fallback.referral);
  return (
    <AppShell title="Parrainage" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageGrid cols={2}>
        <ContentCard>
          <SectionHeading>Votre code</SectionHeading>
          <div className="font-display text-3xl font-black text-primary sm:text-4xl">{data.code}</div>
        </ContentCard>
        <ContentCard>
          <InfoRow label="Filleuls">{data.referred || 0}</InfoRow>
          <InfoRow label="Gains">{fcfa(data.earned)} F</InfoRow>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}

export function ResourcesPage() {
  const { isTeacher } = useAuth();
  const { data, offline, reload } = useLive<typeof fallback.resources>("/api/resources", fallback.resources);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const r of data) {
      const key = r.level || "Autres";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <AppShell title={isTeacher ? "Mes documents" : "Ressources"} active="ressources">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? (
        <Empty>Aucun document n&apos;est disponible</Empty>
      ) : (
        <div className="space-y-5">
          <ContentCard>
            <SectionHeading>Documents utiles</SectionHeading>
            <ul className="grid list-disc gap-1 pl-5 marker:text-primary sm:grid-cols-2 xl:grid-cols-3">
              {data.slice(0, 6).map((r) => (
                <li key={`top-${r.id}`}>
                  <a href={`${apiBase()}/api/files/${r.id}`} className="link-green text-[15px]" target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </ContentCard>
          <PageGrid>
            {grouped.map(([level, items]) => (
              <ContentCard key={level}>
                <h3 className="mb-3 text-[15px] font-bold text-[#333]">{level}</h3>
                <ul className="list-none space-y-1 pl-1">
                  {items.map((r) => (
                    <li key={r.id} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" />
                      <a
                        href={`${apiBase()}/api/files/${r.id}`}
                        className="link-green text-[15px]"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.title}
                        <span className="text-[#888] no-underline"> — {r.type}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </ContentCard>
            ))}
          </PageGrid>
        </div>
      )}
    </AppShell>
  );
}

export function ContactsPage() {
  const { isTeacher } = useAuth();
  const { data, offline, reload } = useLive<Record<string, string>>("/api/settings", {});
  const phone = data.contact_phone || "+225 07 00 00 00 00";
  const email = data.contact_email || "contact@monprofperso.com";
  return (
    <AppShell title={isTeacher ? "Mes contacts" : "Aide"} active="aide">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageGrid cols={2}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <p className="text-[15px] font-semibold text-welcome underline">Mon support&nbsp;:</p>
            <span className="text-[15px] text-[#444]">Abidjan · Côte d&apos;Ivoire</span>
          </div>
          <ContentCard>
            <InfoRow label="Adresse">Abidjan, Côte d&apos;Ivoire</InfoRow>
            <InfoRow label="Horaires">Du lundi au vendredi de 8h à 18h</InfoRow>
            <InfoRow label="Téléphone">
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="link-green">
                {phone}
              </a>
            </InfoRow>
            <InfoRow label="E-mail">
              <a href={`mailto:${email}`} className="link-green">
                {email}
              </a>
            </InfoRow>
          </ContentCard>
        </div>
        <ContentCard>
          <SectionHeading>Liens utiles</SectionHeading>
          <DocLink to="/legal">Documents légaux</DocLink>
          <DocLink to="/ressources">{isTeacher ? "Mes documents" : "Ressources pédagogiques"}</DocLink>
          {data.social_whatsapp ? (
            <DocLink to={data.social_whatsapp} external>
              WhatsApp
            </DocLink>
          ) : null}
          {data.social_facebook ? (
            <DocLink to={data.social_facebook} external>
              Facebook
            </DocLink>
          ) : null}
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}

export function BookingPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  return (
    <AppShell title="Réservation" back="/recherche" active="recherche">
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Réserver un cours</SectionHeading>
          <form
            className="space-y-4"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-welcome">Professeur</Label>
                <Input name="teacherName" defaultValue={decodeURIComponent(sp.get("name") || "Professeur")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Matière</Label>
                <Input name="subject" defaultValue="Maths" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Niveau</Label>
                <Input name="level" defaultValue="3ème" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Format</Label>
                <Select name="format" defaultValue="home">
                  <option value="home">À domicile</option>
                  <option value="online">En ligne</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Prix (F)</Label>
                <Input name="price" type="number" defaultValue={sp.get("price") || "6000"} />
              </div>
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full">
              Continuer vers paiement
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function PaymentPage() {
  const navigate = useNavigate();
  const price = sessionStorage.getItem("mpp_booking_price") || "6000";
  const [err, setErr] = useState("");
  return (
    <AppShell title="Paiement" back="/reservation">
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Montant</SectionHeading>
          <div className="text-2xl font-bold text-primary">{fcfa(Number(price))} F</div>
          <div className="text-sm text-[#666]">Mobile Money (démo)</div>
        </ContentCard>
        <ContentCard>
          <SectionHeading>Payer</SectionHeading>
          <form
            className="space-y-4"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-welcome">Opérateur</Label>
                <Select name="provider" defaultValue="orange">
                  <option value="orange">Orange Money</option>
                  <option value="mtn">MTN</option>
                  <option value="wave">Wave</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Téléphone</Label>
                <Input name="phone" type="tel" placeholder="+22507…" />
              </div>
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full">
              Payer
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function PaymentOtpPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  return (
    <AppShell title="Code OTP" back="/paiement" hideNav>
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Code reçu</SectionHeading>
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
            <Input name="code" maxLength={6} />
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full">
              Valider
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function ConfirmationPage() {
  return (
    <AppShell title="Confirmé" active="cours" hideNav>
      <PageStack narrow>
        <ContentCard className="text-center">
          <div className="text-5xl text-primary">✓</div>
          <SectionHeading className="mt-3">Réservation enregistrée</SectionHeading>
          <Button asChild className="mt-4 w-full">
            <Link to="/cours">Voir mes cours</Link>
          </Button>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function MockPage({ title, text, active }: { title: string; text: string; active?: string }) {
  return (
    <AppShell title={title} active={active || "compte"}>
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>{title}</SectionHeading>
          <p className="text-[15px] leading-relaxed text-[#555]">{text}</p>
          <p className="mt-3 text-sm text-[#888]">Interface web — données de démonstration.</p>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}
