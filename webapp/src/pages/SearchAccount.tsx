import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, MenuRow, PageGrid, PageStack, ContentCard, SectionHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { apiBase } from "@/lib/api";
import { useCapabilities } from "@/lib/capabilities";
import { reviewedRating, courseDate } from "@/lib/operations";

type Teacher = {
  id: number;
  initials?: string;
  name: string;
  subjects?: string;
  rating?: number;
  reviews_count?: number;
  location?: string;
  price_per_hour?: number;
  reviews?: { rating: number; author_name?: string; text?: string }[];
};

export function SearchPage() {
  const [sp] = useSearchParams();
  const format = sp.get("format");
  const level = sp.get("level");
  const qs = [format && `format=${encodeURIComponent(format)}`, level && `level=${encodeURIComponent(level)}`]
    .filter(Boolean)
    .join("&");
  const { data, loading, offline, reload } = useLive<Teacher[]>(`/api/teachers${qs ? `?${qs}` : ""}`, fallback.teachers);

  return (
    <AppShell title="Recherche" active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <ContentCard className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#222]">Trouver un professeur</h2>
            <p className="mt-1 text-sm text-[#666]">{loading ? "Chargement des professeurs…" : offline ? "Résultats momentanément indisponibles" : `${data.length} professeur${data.length > 1 ? "s" : ""} disponible${data.length > 1 ? "s" : ""}`}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/recherche/filtres">Filtres</Link>
          </Button>
        </div>
      </ContentCard>
      {!data.length && !offline ? <Empty>{loading ? "Chargement des professeurs…" : "Aucun professeur trouvé."}</Empty> : null}
      <PageGrid cols={4}>
        {data.map((t) => (
          <Link key={t.id} to={`/prof/${t.id}`} className="block h-full">
            <ContentCard className="h-full transition hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-lg font-extrabold text-primary">
                  {t.initials || t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-[#222]">{t.name}</div>
                  <div className="mt-1 text-sm text-[#666]">
                    {t.subjects} · {t.location}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-primary">
                    {reviewedRating(t.rating, t.reviews_count)} · {fcfa(t.price_per_hour)} F/h
                  </div>
                </div>
              </div>
            </ContentCard>
          </Link>
        ))}
      </PageGrid>
    </AppShell>
  );
}

export function FiltersPage() {
  const navigate = useNavigate();
  const { capabilities } = useCapabilities();
  return (
    <AppShell title="Filtres" back="/recherche" active="recherche">
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Affiner la recherche</SectionHeading>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const parts = [];
              if (fd.get("format")) parts.push(`format=${fd.get("format")}`);
              if (fd.get("level")) parts.push(`level=${fd.get("level")}`);
              navigate(`/recherche${parts.length ? `?${parts.join("&")}` : ""}`);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="filter-format" className="text-welcome">Format</Label>
                <Select id="filter-format" name="format" defaultValue="">
                  <option value="">Tous</option>
                  <option value="home">À domicile</option>
                  {capabilities.onlineCourses ? <option value="online">En ligne (lien externe)</option> : null}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-level" className="text-welcome">Niveau</Label>
                <Select id="filter-level" name="level" defaultValue="">
                  <option value="">Tous</option>
                  <option value="college">Collège</option>
                  <option value="lycee">Lycée</option>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Appliquer
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function TeacherProfilePage() {
  const { id } = useParams();
  const { data, loading, offline, reload } = useLive<Teacher | null>(
    id ? `/api/teachers/${id}` : null,
    null,
  );
  if (!data) {
    return (
      <AppShell title="Profil" back active="recherche">
        {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
        {!offline ? <Empty>{loading ? "Chargement du professeur…" : "Professeur introuvable."}</Empty> : null}
      </AppShell>
    );
  }
  return (
    <AppShell title="Profil prof" back active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageGrid cols={2}>
        <ContentCard>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-2xl font-extrabold text-primary">
              {data.initials || "?"}
            </div>
            <div className="min-w-0">
              <SectionHeading className="mb-1">{data.name}</SectionHeading>
              <div className="text-[15px] text-[#555]">{data.subjects}</div>
              <div className="mt-2 text-sm text-[#666]">
                {reviewedRating(data.rating, data.reviews_count)} · {data.location}
              </div>
              <div className="mt-3 text-xl font-bold text-primary">{fcfa(data.price_per_hour)} F/h</div>
              <Button asChild className="mt-5 w-full sm:w-auto">
                <Link
                  to={`/reservation?teacherId=${data.id}`}
                >
                  Réserver un cours
                </Link>
              </Button>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <SectionHeading>Avis</SectionHeading>
          {(data.reviews || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore d&apos;avis.</p>
          ) : null}
          <div className="divide-y divide-[#eee]">
            {(data.reviews || []).map((r, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="text-sm text-[#666]">
                  ★ {r.rating} · {r.author_name}
                </div>
                <p className="mt-1 text-[15px] text-[#444]">{r.text}</p>
              </div>
            ))}
          </div>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}

export function ProgressPage() {
  type Progress = { entries: { courseId: number; subject: string; teacherName: string; studentName: string | null; completedAt: string | null; summary: string }[] };
  const { data, loading, offline, reload } = useLive<Progress>("/api/progress", { entries: [] });
  return <AppShell title="Bilans pédagogiques" active="progres">
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <p className="mb-5 text-sm">Les comptes rendus rédigés par vos professeurs après les cours réalisés et confirmés.</p>
    {data.entries?.length ? <PageGrid>{data.entries.map((entry) => <ContentCard key={entry.courseId}>
      <SectionHeading>{entry.subject}{entry.studentName ? ` · ${entry.studentName}` : ""}</SectionHeading>
      <p className="mb-2 text-sm text-muted-foreground">{entry.teacherName} · {courseDate(entry.completedAt, false)}</p>
      <p className="whitespace-pre-wrap text-sm">{entry.summary}</p>
      <Link className="link-green mt-4 inline-block" to={`/cours/${entry.courseId}`}>Consulter le cours</Link>
    </ContentCard>)}</PageGrid> : !offline ? <Empty>{loading ? "Chargement…" : "Aucun bilan pédagogique partagé pour le moment."}</Empty> : null}
  </AppShell>;
}

export function AccountPage() {
  const { user, isTeacher, logout } = useAuth();
  const { capabilities } = useCapabilities();
  return (
    <AppShell title="Mon compte" active="compte">
      <PageGrid cols={2}>
        <ContentCard>
          <SectionHeading>Mon profil</SectionHeading>
          <div className="text-[18px] font-bold text-[#222]">{user?.full_name || "Utilisateur"}</div>
          <div className="mt-1 text-[#666]">{user?.phone}</div>
          <Button
            variant="destructive"
            className="mt-5 w-full sm:w-auto"
            onClick={() => {
              logout();
              window.location.href = "/connexion.html";
            }}
          >
            Déconnexion
          </Button>
        </ContentCard>
        <ContentCard>
          <SectionHeading>Raccourcis</SectionHeading>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <MenuRow to="/notifications" label="Notifications" />
              <MenuRow to="/portefeuille" label="Portefeuille" />
              <MenuRow to="/mes-besoins" label="Mes besoins" />
              <MenuRow to="/enfants" label="Mes enfants" />
              <MenuRow to="/ressources" label={isTeacher ? "Mes documents" : "Ressources"} />
              {capabilities.subscriptions ? <MenuRow to="/abonnement" label="Abonnement" /> : null}
            </div>
            <div>
              {capabilities.referrals ? <MenuRow to="/parrainage" label="Parrainage" /> : null}
              <MenuRow to="/legal" label="Documents légaux" />
              <MenuRow to="/aide" label={isTeacher ? "Mes contacts" : "Aide"} />
              <MenuRow to="/parametres" label="Mes données / suppression du compte" />
              {isTeacher ? (
                <MenuRow to="/prof-profil" label="Compléter mon profil" />
              ) : (
                <MenuRow to="/devenir-prof.html" label="Devenir professeur" external />
              )}
            </div>
          </div>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}

export function LegalPage() {
  const { data, offline, loading, reload } = useLive<{ slug: string; title?: string; hasFile?: boolean }[]>("/api/legal", []);
  return (
    <AppShell title="Documents légaux" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? (
        !offline ? <Empty>{loading ? "Chargement des documents…" : "Aucun document disponible pour le moment."}</Empty> : null
      ) : (
        <ContentCard>
          <SectionHeading>Documents utiles</SectionHeading>
          <a className="link-green mb-4 inline-block" href="/informations-service.html">Informations et règles du service</a>
          <ul className="list-disc space-y-1 pl-5 marker:text-primary">
            {data.map((d) => (
              <li key={d.slug}>
                <a
                  aria-disabled={!d.hasFile}
                  href={d.hasFile ? `${apiBase()}/api/legal/${d.slug}/file` : undefined}
                  className="link-green text-[15px]"
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.title || d.slug}
                </a>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </AppShell>
  );
}
