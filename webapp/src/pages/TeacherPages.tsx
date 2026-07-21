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
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useState } from "react";

export { TeacherRequestsPage } from "@/pages/TeacherOffersPage";

type Dash = typeof fallback.teacherDashboard & {
  profileCompletion?: { percent: number; complete: boolean };
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

      <PageGrid cols={2}>
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
        <PageGrid cols={2}>
          <ContentCard>
            <SectionHeading>Total</SectionHeading>
            <div className="text-4xl font-black text-primary sm:text-5xl">{fcfa(data.total)} F</div>
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
        </PageGrid>
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
    pricePerHour?: number;
    negotiable?: boolean;
    profileCompletion?: { percent: number };
  } | null>("/api/teacher/profile", null);
  const [msg, setMsg] = useState("");

  return (
    <AppShell title="Mon profil" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack narrow>
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
                const price = fd.get("pricePerHour");
                await api("/api/teacher/profile", {
                  method: "PUT",
                  body: {
                    location: fd.get("location"),
                    subjects: fd.get("subjects"),
                    programs: split(fd.get("programs")),
                    levels: split(fd.get("levels")),
                    pricePerHour: price ? Number(price) : undefined,
                    negotiable: fd.get("negotiable") === "on",
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
              <div>
                <Label className="text-welcome">Tarif horaire souhaité (F)</Label>
                <Input
                  name="pricePerHour"
                  type="number"
                  min={0}
                  step={500}
                  defaultValue={data?.pricePerHour ?? ""}
                  key={data?.pricePerHour}
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="negotiable" defaultChecked={data?.negotiable ?? false} key={String(data?.negotiable)} />
                <span>Tarif négociable</span>
              </label>
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

