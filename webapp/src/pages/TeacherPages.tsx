import { Link } from "react-router-dom";
import {
  AppShell,
  OfflineBanner,
  Empty,
  ContentCard,
  PageGrid,
  PageStack,
  MenuRow,
  SectionHeading,
  CheckRow,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Clock, GraduationCap, MapPin, MessageCircle, UserRound } from "lucide-react";
import { CoteIvoireOffersMap, distanceKmFromHome, resolveCoords, TEACHER_HOME } from "@/components/OffersMap";

type Dash = typeof fallback.teacherDashboard & {
  profileCompletion?: { percent: number; complete: boolean };
};
type Req = {
  courseId?: number;
  needId?: number | null;
  initials?: string;
  accent?: string;
  name?: string;
  ago?: string;
  subject?: string;
  student?: string;
  slot?: string;
  format?: string;
  frequency?: string | null;
  duration?: string | null;
  startDate?: string | null;
  price?: number;
  netHourly?: number | null;
  isOpportunity?: boolean;
  availabilityWeek?: boolean;
  availabilityWeekend?: boolean;
  availabilityHolidays?: boolean;
};

function parseStudent(student?: string) {
  const s = (student || "").trim();
  if (!s) return { name: "—", level: "—", gender: "" };
  const parts = s.split(/·|-/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) return { name: parts[0], level: parts[1], gender: parts[2] || "" };
  if (/ème|ere|ère|terminale|cm|cp|6e|5e|4e|3e|2nde|1ère/i.test(s)) {
    return { name: "Élève", level: s, gender: "" };
  }
  return { name: s, level: "—", gender: "" };
}

function formatStart(startDate?: string | null) {
  if (!startDate) return null;
  const d = String(startDate).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return null;
  return `${day}/${m}/${y}`;
}

/** Carte offre — disposition Completude desktop */
function OfferCard({
  r,
  onConsult,
  home,
}: {
  r: Req;
  onConsult: () => void;
  home?: [number, number];
}) {
  const place = (r.name || r.slot || "Abidjan").replace(/,?\s*Côte d'Ivoire/i, "").trim();
  const title = place.toUpperCase() || "ABIDJAN";
  const dist = distanceKmFromHome(r.slot || r.name || place, home);
  const { name: pupil, level, gender } = parseStudent(r.student);
  const freq =
    [r.frequency, r.duration].filter(Boolean).join(" - ") ||
    (r.format === "online" || /ligne/i.test(r.format || "") ? "En ligne" : "À domicile");
  const pay =
    r.isOpportunity && r.netHourly != null
      ? `${fcfa(r.netHourly)} F/h net${r.price != null ? ` · ${fcfa(r.price)} F/séance` : ""}`
      : r.price != null
        ? `${fcfa(r.price)} F`
        : "—";
  const start = formatStart(r.startDate);
  const ref = `Réf. ${2000 + Number(r.needId || r.courseId || 0)}`;
  const badges = [
    r.availabilityWeek !== false ? "SE" : null,
    r.availabilityWeekend ? "WE" : null,
    r.availabilityHolidays ? "VS" : null,
  ].filter(Boolean) as string[];

  return (
    <article className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold uppercase tracking-wide text-[#222]">{title}</h3>
        {dist != null ? (
          <div className="flex shrink-0 items-center gap-1 text-[12px] text-[#666]">
            <span>{dist.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km</span>
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1 text-[12px] text-[#666]">
            <span>CI</span>
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-[13px] text-[#333]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-[#888]" />
            {r.subject || "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-[#888]" />
            {level !== "—" ? level : pupil}
          </span>
          {(gender || (pupil !== "Élève" && level !== "—")) ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-[#888]" />
              {gender || pupil}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#888]" />
            {freq}
          </span>
          <span className="font-bold text-[#222]">{pay}</span>
        </div>
      </div>

      {badges.length ? (
        <div className="mt-2.5 flex gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
              title={b === "SE" ? "Semaine" : b === "WE" ? "Week-end" : "Vacances scolaires"}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}

      {start ? <p className="mt-2 text-[12px] text-[#666]">À partir du {start}</p> : null}

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#f0f0f0] pt-3">
        <div>
          <button
            type="button"
            className="mb-1 inline-flex items-center gap-1 rounded bg-[#4a90d9] px-2 py-0.5 text-[11px] font-semibold text-white opacity-80"
            disabled
            title="Bientôt disponible" data-build="20260721b"
          >
            <MessageCircle className="h-3 w-3" />
            Chat
          </button>
          <div className="text-[11px] text-[#999]">
            {ref} — {r.ago || "nouveau"}
          </div>
        </div>
        <button
          type="button"
          onClick={onConsult}
          className="rounded-md bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-welcome"
        >
          Consulter
        </button>
      </div>
    </article>
  );
}

export function TeacherDashboardPage() {
  const { data, offline, reload } = useLive<Dash>("/api/teacher/dashboard", fallback.teacherDashboard);
  return (
    <AppShell title="Accueil" active="prof-espace">
      {data.needsConfirmed === false ? (
        <div className="mb-4 rounded-lg bg-orange-soft px-4 py-3 text-sm text-[#8a5b33]">
          Votre accès aux offres est en cours de validation par l&apos;équipe Mon Prof Perso.
        </div>
      ) : null}
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}

      <PageGrid>
        <ContentCard>
          <h2 className="mb-3 text-[20px] font-bold leading-snug text-[#222] sm:text-[22px]">
            Bonjour, bienvenue sur votre espace professeur Mon Prof Perso !
          </h2>
          <p className="mb-3 text-[15px] leading-relaxed text-[#444]">
            Vous cherchez de nouveaux cours ? Trouvez en quelques clics les{" "}
            <Link to="/prof-offres" className="link-green">
              offres de cours
            </Link>{" "}
            qui vous correspondent.
          </p>
          <p className="mb-5 text-[15px] leading-relaxed text-[#444]">
            Faites le plein de ressources pédagogiques sur{" "}
            <Link to="/ressources" className="link-green">
              Mes documents
            </Link>
            &nbsp;!
          </p>

          <div className="mb-5 overflow-hidden rounded-lg bg-[#e8f2ee]">
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary/15 to-welcome/20 px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-welcome">Espace professeur</p>
                <p className="mt-1 text-xs text-[#666]">
                  {data.pendingRequests
                    ? `${data.pendingRequests} offre${data.pendingRequests > 1 ? "s" : ""} disponible${data.pendingRequests > 1 ? "s" : ""}`
                    : "Consultez les offres parents"}
                </p>
                {data.profileCompletion && !data.profileCompletion.complete ? (
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link to="/prof-profil">Compléter mon profil ({data.profileCompletion.percent}%)</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/prof-offres">Voir les offres</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <p className="text-[14px] leading-relaxed text-[#555]">
            Avez-vous déjà téléchargé l&apos;application Mon Prof Perso ?
          </p>
          <p className="mt-2 text-[14px]">
            Android :{" "}
            <a href="/#download" className="link-green">
              Télécharger maintenant sur Play Store
            </a>
          </p>
          <p className="mt-1 text-[14px]">
            Apple :{" "}
            <a href="/#download" className="link-green">
              Télécharger maintenant sur App Store
            </a>
          </p>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-3 text-[20px] font-bold leading-snug text-[#222] sm:text-[22px]">
            Mon Prof Perso s&apos;engage sur la qualité de son service de soutien scolaire
          </h2>
          <p className="mb-3 text-[15px] font-semibold leading-relaxed text-[#444]">
            Des professeurs vérifiés, un suivi des progrès, et un paiement Mobile Money sécurisé pour les familles
            ivoiriennes.
          </p>
          <p className="mb-4 text-[15px] leading-relaxed text-[#555]">
            Notre équipe contrôle régulièrement le respect des engagements pris en matière de déontologie, d&apos;éthique
            et de qualité de service. Chaque profil est validé avant l&apos;accès aux offres parents. Vous enseignez dans
            le respect des programmes scolaires (standard et français) jusqu&apos;en Terminale.
          </p>
          <Link to="/aide" className="link-green text-[15px]">
            Voir plus…
          </Link>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}

export function TeacherRequestsPage() {
  const { data, offline, reload } = useLive<Req[]>("/api/teacher/requests", fallback.teacherRequests as Req[]);
  const { data: profile } = useLive<{ location?: string } | null>("/api/teacher/profile", null);
  const [sideTab, setSideTab] = useState<"search" | "props">("search");
  const [showResults, setShowResults] = useState(true);
  const [msg, setMsg] = useState("");
  const [sort, setSort] = useState<"recent" | "price">("recent");
  const [location, setLocation] = useState("Cocody, Abidjan");
  const [whenOpts, setWhenOpts] = useState({ week: true, weekend: true, vacations: true });
  const [prefs, setPrefs] = useState({ vehicle: false, home: true, online: true });
  const [channels, setChannels] = useState({ sms: true, notif: true });
  const [filters, setFilters] = useState({ option: true, thinking: true, refused: false });

  // Adresse profil → champ « Mon adresse » (une fois)
  const profileLocApplied = useRef(false);
  useEffect(() => {
    if (profile?.location && !profileLocApplied.current) {
      profileLocApplied.current = true;
      setLocation(profile.location);
    }
  }, [profile?.location]);

  const homeCoords = useMemo(
    () => resolveCoords(location) || resolveCoords(profile?.location) || TEACHER_HOME,
    [location, profile?.location],
  );

  const filtered = useMemo(() => {
    let list = [...data];
    if (!prefs.home) list = list.filter((r) => /ligne|online/i.test(r.format || ""));
    if (!prefs.online) list = list.filter((r) => !/ligne|online/i.test(r.format || ""));
    if (sort === "price") {
      list.sort((a, b) => (b.netHourly || b.price || 0) - (a.netHourly || a.price || 0));
    }
    return list;
  }, [data, prefs.home, prefs.online, sort]);

  async function act(r: Req, accept: boolean) {
    const id = Number(r.needId || r.courseId);
    if (!id) return;
    try {
      if (!accept && r.isOpportunity) {
        setMsg("Les offres publiées restent disponibles pour d'autres professeurs.");
        return;
      }
      await api(`/api/teacher/requests/${id}/${accept ? "accept" : "refuse"}`, { method: "POST", body: {} });
      setMsg(accept ? "Offre acceptée" : "Demande refusée");
      void reload();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    }
  }

  const mapOffers = filtered.map((r) => {
    const id = String(r.needId || r.courseId);
    return {
      id,
      label: r.name || r.slot || "Offre",
      place: r.slot || r.name || r.format,
      subject: r.subject,
      priceLabel:
        r.isOpportunity && r.netHourly != null
          ? `${fcfa(r.netHourly)} F/h net`
          : r.price != null
            ? `${fcfa(r.price)} F`
            : undefined,
    };
  });

  return (
    <AppShell title="Mes offres de cours" active="prof-offres" fullBleed>
      {offline ? (
        <div className="px-4 pt-3">
          <OfflineBanner onRetry={() => void reload()} />
        </div>
      ) : null}
      {msg ? <p className="px-4 pt-2 text-sm font-semibold text-primary">{msg}</p> : null}

      <div className="flex flex-col lg:flex-row lg:items-start">
        {/* Colonne filtres — sticky, hauteur viewport, scroll interne si besoin */}
        <aside className="flex w-full shrink-0 flex-col border-b border-[#e8e8e8] bg-[#f7f7f7] lg:sticky lg:top-[58px] lg:h-[calc(100dvh-58px)] lg:w-[280px] lg:border-b-0 lg:border-r xl:w-[300px]">
          <div className="grid shrink-0 grid-cols-2 border-b border-[#ddd] bg-white">
            <button
              type="button"
              onClick={() => setSideTab("search")}
              className={`px-2 py-3.5 text-center text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-[12px] ${
                sideTab === "search" ? "bg-welcome text-white" : "bg-white text-[#666]"
              }`}
            >
              Nouvelle recherche
            </button>
            <button
              type="button"
              onClick={() => setSideTab("props")}
              className={`px-2 py-3.5 text-center text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-[12px] ${
                sideTab === "props" ? "bg-welcome text-white" : "bg-white text-[#666]"
              }`}
            >
              Propositions et options
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {sideTab === "search" ? (
              <>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-2 text-[14px] font-semibold text-welcome">Mon adresse</div>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Où ?"
                    className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                  <p className="mt-1 text-[11px] text-[#888]">Côte d&apos;Ivoire</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Quand ?</div>
                  <CheckRow
                    label="Pendant la semaine en période scolaire"
                    checked={whenOpts.week}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, week: v }))}
                  />
                  <CheckRow
                    label="Pendant les week-ends en période scolaire"
                    checked={whenOpts.weekend}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, weekend: v }))}
                  />
                  <CheckRow
                    label="Seulement pendant les vacances scolaires"
                    checked={whenOpts.vacations}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, vacations: v }))}
                  />
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Mes préférences</div>
                  <CheckRow
                    label="J'ai un véhicule"
                    checked={prefs.vehicle}
                    onChange={(v) => setPrefs((s) => ({ ...s, vehicle: v }))}
                  />
                  <CheckRow
                    label="J'accepte les cours à domicile"
                    checked={prefs.home}
                    onChange={(v) => setPrefs((s) => ({ ...s, home: v }))}
                  />
                  <CheckRow
                    label="J'accepte les cours en ligne"
                    checked={prefs.online}
                    onChange={(v) => setPrefs((s) => ({ ...s, online: v }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-2 text-[14px] font-semibold text-welcome">Mon adresse</div>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Propositions reçues</div>
                  <CheckRow label="SMS" checked={channels.sms} onChange={(v) => setChannels((s) => ({ ...s, sms: v }))} />
                  <CheckRow
                    label="Notification application"
                    checked={channels.notif}
                    onChange={(v) => setChannels((s) => ({ ...s, notif: v }))}
                  />
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Mes préférences</div>
                  <CheckRow
                    label="Avec option"
                    checked={filters.option}
                    onChange={(v) => setFilters((s) => ({ ...s, option: v }))}
                  />
                  <CheckRow
                    label="En réflexion"
                    checked={filters.thinking}
                    onChange={(v) => setFilters((s) => ({ ...s, thinking: v }))}
                  />
                  <CheckRow
                    label="Refusées"
                    checked={filters.refused}
                    onChange={(v) => setFilters((s) => ({ ...s, refused: v }))}
                  />
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-[#e0e0e0] bg-primary p-0">
            <button
              type="button"
              className="w-full py-3.5 text-center text-[13px] font-bold uppercase tracking-wide text-white"
              onClick={() => setShowResults(true)}
            >
              Voir les offres
            </button>
          </div>
        </aside>

        {/* Liste des offres — hauteur naturelle, scroll = page (barre à droite) */}
        <section className="w-full bg-[#f2f2f2] lg:w-[420px] lg:shrink-0 xl:w-[460px]">
          {!showResults ? (
            <Empty>Lancez une recherche pour voir les offres</Empty>
          ) : (
            <>
              <div className="sticky top-14 z-10 flex gap-2 border-b border-[#e8e8e8] bg-white px-3 py-2.5 lg:top-[58px]">
                <button
                  type="button"
                  className="flex-1 rounded border border-[#ddd] bg-[#fafafa] py-2 text-[12px] font-semibold text-[#444]"
                >
                  Filtrer ({filtered.length} offre{filtered.length > 1 ? "s" : ""})
                </button>
                <button
                  type="button"
                  className="flex-1 rounded border border-[#ddd] bg-[#fafafa] py-2 text-[12px] font-semibold text-[#444]"
                  onClick={() => setSort((s) => (s === "recent" ? "price" : "recent"))}
                >
                  Trier · {sort === "recent" ? "Récent" : "Tarif"}
                </button>
              </div>
              <div className="space-y-3 p-3">
                {!filtered.length ? (
                  <Empty>Aucune offre n&apos;a été trouvée</Empty>
                ) : (
                  filtered.map((r) => (
                    <OfferCard
                      key={`${r.isOpportunity ? "opp" : "req"}-${r.needId || r.courseId}`}
                      r={r}
                      home={homeCoords}
                      onConsult={() => void act(r, true)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* Carte sticky plein hauteur — pas de scroll imbriqué */}
        <section className="relative hidden flex-1 lg:sticky lg:top-[58px] lg:block lg:h-[calc(100dvh-58px)]">
          <CoteIvoireOffersMap offers={mapOffers} home={homeCoords} className="absolute inset-0 h-full w-full" />
        </section>

        <section className="relative h-[240px] w-full border-t border-[#e8e8e8] bg-[#e8e8e8] lg:hidden">
          <CoteIvoireOffersMap offers={mapOffers} home={homeCoords} className="absolute inset-0 h-full w-full" />
        </section>
      </div>
    </AppShell>
  );
}

export function TeacherEarningsPage() {
  const { data, offline, reload } = useLive<typeof fallback.teacherEarnings>(
    "/api/teacher/earnings",
    fallback.teacherEarnings,
  );
  const hasData = (data.total || 0) > 0 || (data.stats || []).length > 0;

  return (
    <AppShell title="Mes revenus" active="prof-revenus">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!hasData ? (
        <Empty>Aucun revenu n&apos;est disponible</Empty>
      ) : (
        <PageStack>
          <ContentCard>
            <SectionHeading>Total</SectionHeading>
            <div className="text-4xl font-black text-primary">{fcfa(data.total)} F</div>
            <p className="mt-1 text-sm text-[#666]">{data.trend}</p>
          </ContentCard>
          <ContentCard>
            <SectionHeading>Indicateurs</SectionHeading>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(data.stats || []).map((s) => (
                <div key={s.label}>
                  <div className="text-xl font-extrabold text-[#222]">{s.value}</div>
                  <div className="text-xs text-[#666]">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-[#eee] pt-2">
              <MenuRow to="/prof-retrait" label="Demander un retrait" />
            </div>
          </ContentCard>
        </PageStack>
      )}
    </AppShell>
  );
}

export function TeacherProfileEditPage() {
  const { data, offline, reload } = useLive<{
    location?: string;
    subjects?: string;
    programs?: string[];
    levels?: string[];
    profileCompletion?: { percent: number };
  } | null>("/api/teacher/profile", null);
  const [msg, setMsg] = useState("");

  return (
    <AppShell title="Mon profil" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack>
        <ContentCard>
          <SectionHeading>Compléter mon profil</SectionHeading>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const split = (s: FormDataEntryValue | null) =>
                String(s || "")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);
              try {
                await api("/api/teacher/profile", {
                  method: "PUT",
                  body: {
                    location: fd.get("location"),
                    subjects: fd.get("subjects"),
                    programs: split(fd.get("programs")),
                    levels: split(fd.get("levels")),
                  },
                });
                setMsg("Profil mis à jour");
                void reload();
              } catch (ex) {
                setMsg(ex instanceof Error ? ex.message : "Erreur");
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <Label className="text-welcome">Localisation</Label>
                <Input name="location" defaultValue={data?.location || ""} key={data?.location} className="mt-1" />
              </div>
              <div>
                <Label className="text-welcome">Matières</Label>
                <Input name="subjects" defaultValue={data?.subjects || ""} key={data?.subjects} className="mt-1" />
              </div>
              <div>
                <Label className="text-welcome">Programmes (virgules)</Label>
                <Input
                  name="programs"
                  defaultValue={(data?.programs || []).join(", ")}
                  key={(data?.programs || []).join()}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-welcome">Niveaux (virgules)</Label>
                <Input
                  name="levels"
                  defaultValue={(data?.levels || []).join(", ")}
                  key={(data?.levels || []).join()}
                  className="mt-1"
                />
              </div>
            </div>
            {data?.profileCompletion ? (
              <p className="text-sm text-[#666]">Profil complété à {data.profileCompletion.percent}%</p>
            ) : null}
            {msg ? <p className="text-sm font-semibold text-primary">{msg}</p> : null}
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

