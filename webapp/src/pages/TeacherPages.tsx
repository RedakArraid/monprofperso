import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, ContentCard, PageGrid, MenuRow } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useState } from "react";

type Dash = typeof fallback.teacherDashboard & {
  profileCompletion?: { percent: number; complete: boolean };
};
type Req = {
  courseId?: number;
  needId?: number | null;
  subject?: string;
  student?: string;
  slot?: string;
  format?: string;
  price?: number;
  netHourly?: number | null;
  isOpportunity?: boolean;
};

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
          <h2 className="mb-3 text-xl font-bold text-[#222] sm:text-[22px]">
            Bonjour, bienvenue sur votre espace professeur Mon Prof Perso !
          </h2>
          <p className="mb-3 text-[15px] leading-relaxed text-[#555]">
            Vous cherchez de nouveaux cours ? Trouvez en quelques clics les{" "}
            <Link to="/prof-offres" className="link-green">
              offres de cours
            </Link>{" "}
            qui vous correspondent.
          </p>
          <p className="mb-5 text-[15px] leading-relaxed text-[#555]">
            Suivez vos revenus, complétez votre profil et consultez les ressources pédagogiques depuis votre espace.
          </p>

          <div className="mb-5 grid grid-cols-3 gap-3 rounded-lg bg-[#f7f7f7] p-4 text-center">
            <div>
              <div className="text-2xl font-extrabold text-primary">{fcfa(data.revenue)}</div>
              <div className="text-xs text-muted-foreground">F ce mois</div>
            </div>
            {(data.stats || []).slice(0, 2).map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold text-[#222]">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/prof-offres">
                Voir les offres{data.pendingRequests ? ` (${data.pendingRequests})` : ""}
              </Link>
            </Button>
            {data.profileCompletion && !data.profileCompletion.complete ? (
              <Button asChild variant="outline">
                <Link to="/prof-profil">Compléter mon profil ({data.profileCompletion.percent}%)</Link>
              </Button>
            ) : null}
          </div>

          <p className="mt-6 text-sm text-[#555]">
            Avez-vous déjà téléchargé l&apos;application Mon Prof Perso ?{" "}
            <a href="/#download" className="link-green">
              Télécharger sur Play Store
            </a>{" "}
            ·{" "}
            <a href="/#download" className="link-green">
              App Store
            </a>
          </p>
        </ContentCard>

        <ContentCard>
          <h2 className="mb-3 text-xl font-bold text-[#222] sm:text-[22px]">
            Mon Prof Perso s&apos;engage sur la qualité du soutien scolaire
          </h2>
          <p className="mb-3 text-[15px] font-semibold leading-relaxed text-[#444]">
            Des professeurs vérifiés, un suivi des progrès, et un paiement Mobile Money sécurisé pour les familles
            ivoiriennes.
          </p>
          <p className="mb-4 text-[15px] leading-relaxed text-[#555]">
            Notre équipe valide chaque profil avant l&apos;accès aux offres parents. Vous enseignez dans le respect des
            programmes scolaires (standard et français) jusqu&apos;en Terminale.
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
  const [msg, setMsg] = useState("");

  async function act(id: number, accept: boolean) {
    try {
      await api(`/api/teacher/requests/${id}/${accept ? "accept" : "refuse"}`, { method: "POST", body: {} });
      setMsg(accept ? "Demande acceptée" : "Demande refusée");
      void reload();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    }
  }

  return (
    <AppShell title="Mes offres de cours" active="prof-offres">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {msg ? <p className="mb-3 text-sm font-semibold text-primary">{msg}</p> : null}
      <ContentCard className="mb-5">
        <h2 className="mb-2 text-lg font-bold">Propositions et options</h2>
        <p className="text-sm text-[#555]">
          Consultez les besoins parents publiés et les demandes de réservation qui vous sont adressées. Les montants
          affichés sont vos gains nets (commission plateforme déjà déduite).
        </p>
      </ContentCard>
      {!data.length ? <Empty>Aucune offre pour le moment.</Empty> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((r) => {
          const id = r.needId || r.courseId;
          return (
            <ContentCard key={String(id)}>
              <div className="text-lg font-bold text-[#222]">
                {r.subject} · {r.student}
              </div>
              <div className="mt-1 text-sm text-[#666]">{r.slot || r.format}</div>
              {r.price != null ? (
                <div className="mt-3 text-base font-bold text-primary">
                  {fcfa(r.price)} F
                  {r.netHourly != null ? ` · ${fcfa(r.netHourly)} F/h net` : ""}
                </div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => void act(Number(id), true)}>
                  Accepter
                </Button>
                <Button size="sm" variant="outline" onClick={() => void act(Number(id), false)}>
                  Refuser
                </Button>
              </div>
            </ContentCard>
          );
        })}
      </div>
    </AppShell>
  );
}

export function TeacherEarningsPage() {
  const { data, offline, reload } = useLive<typeof fallback.teacherEarnings>(
    "/api/teacher/earnings",
    fallback.teacherEarnings,
  );
  return (
    <AppShell title="Mes revenus" active="prof-revenus">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageGrid>
        <ContentCard>
          <div className="text-sm text-[#666]">Total</div>
          <div className="mt-1 text-4xl font-black text-primary">{fcfa(data.total)} F</div>
          <p className="mt-1 text-sm text-[#666]">{data.trend}</p>
        </ContentCard>
        <ContentCard>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(data.stats || []).map((s) => (
              <div key={s.label}>
                <div className="text-xl font-extrabold">{s.value}</div>
                <div className="text-xs text-[#666]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <MenuRow to="/prof-retrait" label="Demander un retrait" />
          </div>
        </ContentCard>
      </PageGrid>
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
    <AppShell title="Mon profil" back="/compte" active="compte" welcome={false}>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <ContentCard className="mx-auto max-w-2xl">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Localisation</Label>
              <Input name="location" defaultValue={data?.location || ""} key={data?.location} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Matières</Label>
              <Input name="subjects" defaultValue={data?.subjects || ""} key={data?.subjects} />
            </div>
            <div className="space-y-1.5">
              <Label>Programmes (virgules)</Label>
              <Input name="programs" defaultValue={(data?.programs || []).join(", ")} key={(data?.programs || []).join()} />
            </div>
            <div className="space-y-1.5">
              <Label>Niveaux (virgules)</Label>
              <Input name="levels" defaultValue={(data?.levels || []).join(", ")} key={(data?.levels || []).join()} />
            </div>
          </div>
          {data?.profileCompletion ? (
            <p className="text-sm text-muted-foreground">Profil complété à {data.profileCompletion.percent}%</p>
          ) : null}
          {msg ? <p className="text-sm font-semibold text-primary">{msg}</p> : null}
          <Button type="submit">Enregistrer</Button>
        </form>
      </ContentCard>
    </AppShell>
  );
}

