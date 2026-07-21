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
  PageTabs,
  CheckRow,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useMemo, useState } from "react";

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
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12.5px] text-[#888]">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-[#222]">{value}</span>
    </div>
  );
}

/** Carte offre style Completude (parité apps natives) */
function OfferCard({
  r,
  onAccept,
  onRefuse,
}: {
  r: Req;
  onAccept: () => void;
  onRefuse: () => void;
}) {
  const title = (r.name || r.slot || r.format || "Offre").toUpperCase();
  const priceLabel =
    r.isOpportunity && r.netHourly != null && r.price != null
      ? `${fcfa(r.netHourly)} F/h · ${fcfa(r.price)} F/séance nets`
      : r.price != null
        ? `${fcfa(r.price)} F`
        : "—";
  const start =
    r.startDate != null
      ? String(r.startDate).slice(0, 10).split("-").reverse().join("/")
      : null;

  return (
    <article className="rounded-[20px] border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold uppercase tracking-wide text-[#222]">{title}</div>
          <div className="mt-0.5 text-[11.5px] text-[#aaa]">{r.ago || "nouveau"}</div>
        </div>
        <div className="max-w-[48%] text-right text-[13px] font-extrabold leading-snug text-primary">{priceLabel}</div>
      </div>

      <div className="mt-3.5 space-y-0.5">
        <DetailLine label="Élève" value={r.student || "—"} />
        <DetailLine label="Matière" value={r.subject || "—"} />
        {r.frequency ? <DetailLine label="Fréquence" value={r.frequency} /> : null}
        {r.duration ? <DetailLine label="Durée" value={r.duration} /> : null}
        <DetailLine label="Lieu / format" value={r.format || r.slot || "—"} />
        {start ? <DetailLine label="À partir du" value={start} /> : null}
      </div>

      {r.isOpportunity ? (
        <p className="mt-2 text-[11px] text-[#888]">Tarif fixe — gains nets avant impôts</p>
      ) : null}

      <div className="mt-3.5 flex gap-2.5">
        {!r.isOpportunity ? (
          <button
            type="button"
            onClick={onRefuse}
            className="flex-1 rounded-xl border border-[#e5e5e5] bg-white py-3 text-center text-[13.5px] font-bold text-[#888] transition hover:bg-[#fafafa]"
          >
            Refuser
          </button>
        ) : null}
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-xl bg-primary py-3 text-center text-[13.5px] font-bold text-white transition hover:bg-welcome"
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
  const [tab, setTab] = useState<"search" | "results" | "props">("results");
  const [msg, setMsg] = useState("");
  const [location, setLocation] = useState("");
  const [whenOpts, setWhenOpts] = useState({ week: true, weekend: true, vacations: true });
  const [prefs, setPrefs] = useState({ vehicle: false, home: true, online: true });
  const [channels, setChannels] = useState({ sms: true, notif: true });
  const [filters, setFilters] = useState({ option: true, thinking: true, refused: false });

  const filtered = useMemo(() => {
    let list = data;
    if (location.trim()) {
      const q = location.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.student || "").toLowerCase().includes(q) ||
          (r.subject || "").toLowerCase().includes(q) ||
          (r.format || "").toLowerCase().includes(q) ||
          (r.slot || "").toLowerCase().includes(q),
      );
    }
    if (!prefs.home) list = list.filter((r) => (r.format || "").toLowerCase().includes("ligne"));
    if (!prefs.online) list = list.filter((r) => !(r.format || "").toLowerCase().includes("ligne"));
    return list;
  }, [data, location, prefs.home, prefs.online]);

  async function act(r: Req, accept: boolean) {
    const id = Number(r.needId || r.courseId);
    if (!id) return;
    try {
      if (!accept && r.isOpportunity) {
        setMsg("Les offres publiées se retirent en les laissant à d'autres professeurs.");
        return;
      }
      await api(`/api/teacher/requests/${id}/${accept ? "accept" : "refuse"}`, { method: "POST", body: {} });
      setMsg(accept ? "Offre acceptée" : "Demande refusée");
      void reload();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    }
  }

  const canSearch = location.trim().length > 0;

  return (
    <AppShell
      title="Mes offres de cours"
      active="prof-offres"
      stickyFooter={
        tab === "search" ? (
          <button
            type="button"
            disabled={!canSearch}
            className="w-full py-4 text-center text-[15px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
            onClick={() => setTab("results")}
          >
            Voir les offres
          </button>
        ) : undefined
      }
    >
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {msg ? <p className="mb-3 text-sm font-semibold text-primary">{msg}</p> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-[#222] sm:text-xl">Mes offres de cours</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">{filtered.length}</span>
      </div>

      <PageTabs
        tabs={[
          { id: "search", label: "Nouvelle recherche" },
          { id: "results", label: "Offres" },
          { id: "props", label: "Propositions et options" },
        ]}
        value={tab}
        onChange={(id) => setTab(id as "search" | "results" | "props")}
      />

      {tab === "search" ? (
        <PageStack>
          <ContentCard>
            <SectionHeading>Mon adresse</SectionHeading>
            <Label className="sr-only">Où ?</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Où ?"
              className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {!location.trim() ? <p className="mt-1 text-sm text-destructive">Obligatoire</p> : null}
          </ContentCard>

          <ContentCard>
            <SectionHeading>Quand ?</SectionHeading>
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
          </ContentCard>

          <ContentCard>
            <SectionHeading>Mes préférences</SectionHeading>
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
          </ContentCard>
        </PageStack>
      ) : null}

      {tab === "props" ? (
        <PageStack>
          <ContentCard>
            <SectionHeading>Mon adresse</SectionHeading>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Où ?"
              className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </ContentCard>

          <ContentCard>
            <SectionHeading>Propositions reçues</SectionHeading>
            <CheckRow label="SMS" checked={channels.sms} onChange={(v) => setChannels((s) => ({ ...s, sms: v }))} />
            <CheckRow
              label="Notification application"
              checked={channels.notif}
              onChange={(v) => setChannels((s) => ({ ...s, notif: v }))}
            />
          </ContentCard>

          <ContentCard>
            <SectionHeading>Mes préférences</SectionHeading>
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
          </ContentCard>

          <Button type="button" className="w-full" onClick={() => setTab("results")}>
            Voir les offres
          </Button>
        </PageStack>
      ) : null}

      {tab === "results" ? (
        !filtered.length ? (
          <Empty>Aucune offre n&apos;a été trouvée</Empty>
        ) : (
          <div className="mx-auto grid w-full max-w-3xl gap-3.5 sm:gap-4 lg:max-w-none lg:grid-cols-2">
            {filtered.map((r) => {
              const id = r.needId || r.courseId;
              return (
                <OfferCard
                  key={`${r.isOpportunity ? "opp" : "req"}-${id}`}
                  r={r}
                  onAccept={() => void act(r, true)}
                  onRefuse={() => void act(r, false)}
                />
              );
            })}
          </div>
        )
      ) : null}
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
