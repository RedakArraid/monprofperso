import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, MenuRow, PageGrid, PageStack, ContentCard, SectionHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { apiBase } from "@/lib/api";

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
  const { data, offline, reload } = useLive<Teacher[]>(`/api/teachers${qs ? `?${qs}` : ""}`, fallback.teachers);

  return (
    <AppShell title="Recherche" active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <ContentCard className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#222]">Trouver un professeur</h2>
            <p className="mt-1 text-sm text-[#666]">{data.length} professeur(s) disponible(s)</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/recherche/filtres">Filtres</Link>
          </Button>
        </div>
      </ContentCard>
      {!data.length ? <Empty>Aucun professeur trouvé.</Empty> : null}
      <PageGrid>
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
                    ★ {t.rating ?? "—"} · {fcfa(t.price_per_hour)} F/h
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
  return (
    <AppShell title="Filtres" back="/recherche" active="recherche">
      <PageStack>
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
                <Label className="text-welcome">Format</Label>
                <Select name="format" defaultValue="">
                  <option value="">Tous</option>
                  <option value="home">À domicile</option>
                  <option value="online">En ligne</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Niveau</Label>
                <Select name="level" defaultValue="">
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
  const { data, offline, reload } = useLive<Teacher | null>(
    id ? `/api/teachers/${id}` : null,
    fallback.teachers[0],
  );
  if (!data) {
    return (
      <AppShell title="Profil" back active="recherche">
        <Empty>Professeur introuvable.</Empty>
      </AppShell>
    );
  }
  return (
    <AppShell title="Profil prof" back active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack>
        <ContentCard>
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-2xl font-extrabold text-primary">
              {data.initials || "?"}
            </div>
            <div>
              <SectionHeading className="mb-1">{data.name}</SectionHeading>
              <div className="text-[15px] text-[#555]">{data.subjects}</div>
              <div className="mt-2 text-sm text-[#666]">
                ★ {data.rating} ({data.reviews_count || 0} avis) · {data.location}
              </div>
              <div className="mt-3 text-xl font-bold text-primary">{fcfa(data.price_per_hour)} F/h</div>
              <Button asChild className="mt-5">
                <Link
                  to={`/reservation?teacherId=${data.id}&name=${encodeURIComponent(data.name)}&price=${data.price_per_hour || 6000}`}
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
            <p className="text-sm text-[#888]">Pas encore d&apos;avis.</p>
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
      </PageStack>
    </AppShell>
  );
}

export function CoursesPage() {
  const { isTeacher } = useAuth();
  const { data, offline, reload } = useLive<typeof fallback.courses>("/api/courses", fallback.courses);
  const title = isTeacher ? "Mes élèves" : "Mes cours";
  return (
    <AppShell title={title} active="cours">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? (
        <Empty>{isTeacher ? "Aucun élève n'a été trouvé" : "Aucun cours n'a été trouvé"}</Empty>
      ) : (
        <PageStack>
          {data.map((c) => (
            <ContentCard key={c.id}>
              <SectionHeading>
                {c.subject} · {c.level}
              </SectionHeading>
              <div className="text-[15px] text-[#444]">{c.teacher_name}</div>
              <div className="mt-1 text-sm text-[#666]">
                {c.day_label} {c.day_num} · {c.time}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {c.badge ? <Badge>{c.badge}</Badge> : <span />}
                <strong className="text-[15px] text-primary">{fcfa(c.price)} F</strong>
              </div>
            </ContentCard>
          ))}
        </PageStack>
      )}
    </AppShell>
  );
}

export function ProgressPage() {
  const { data, offline, reload } = useLive<typeof fallback.progress>("/api/progress", fallback.progress);
  return (
    <AppShell title="Progrès" active="progres">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack>
        <ContentCard>
          <SectionHeading>Moyenne générale</SectionHeading>
          <div className="font-display text-5xl font-black text-primary">{data.average}</div>
          <p className="mt-2 text-sm text-[#666]">
            {data.trend} · {data.goal}
          </p>
        </ContentCard>
        <ContentCard>
          <SectionHeading>Par matière</SectionHeading>
          <div className="space-y-5">
            {data.subjects.map((s) => (
              <div key={s.subject} className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>{s.subject}</span>
                  <span className={s.warn ? "text-accent" : "text-primary"}>{s.grade}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#eee]">
                  <div
                    className={`h-full rounded-full ${s.warn ? "bg-accent" : "bg-primary"}`}
                    style={{ width: `${Math.round((s.fraction || 0) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function AccountPage() {
  const { user, isTeacher, logout } = useAuth();
  return (
    <AppShell title="Mon compte" active="compte">
      <PageStack>
        <ContentCard>
          <SectionHeading>Mon profil</SectionHeading>
          <div className="text-[18px] font-bold text-[#222]">{user?.full_name || "Utilisateur"}</div>
          <div className="mt-1 text-[#666]">{user?.phone}</div>
          <Button
            variant="destructive"
            className="mt-5 w-full"
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
          <MenuRow to="/notifications" label="Notifications" />
          <MenuRow to="/portefeuille" label="Portefeuille" />
          <MenuRow to="/mes-besoins" label="Mes besoins" />
          <MenuRow to="/enfants" label="Mes enfants" />
          <MenuRow to="/ressources" label={isTeacher ? "Mes documents" : "Ressources"} />
          <MenuRow to="/abonnement" label="Abonnement" />
          <MenuRow to="/parrainage" label="Parrainage" />
          <MenuRow to="/legal" label="Documents légaux" />
          <MenuRow to="/aide" label={isTeacher ? "Mes contacts" : "Aide"} />
          <MenuRow to="/parametres" label="Paramètres" />
          {isTeacher ? (
            <MenuRow to="/prof-profil" label="Compléter mon profil" />
          ) : (
            <MenuRow to="/devenir-prof.html" label="Devenir professeur" external />
          )}
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function LegalPage() {
  const { data, offline, reload } = useLive<{ slug: string; title?: string; hasFile?: boolean }[]>("/api/legal", []);
  return (
    <AppShell title="Documents légaux" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? (
        <Empty>Aucun document n&apos;est disponible</Empty>
      ) : (
        <ContentCard>
          <SectionHeading>Documents utiles</SectionHeading>
          <ul className="list-disc space-y-1 pl-5 marker:text-primary">
            {data.map((d) => (
              <li key={d.slug}>
                <a
                  href={d.hasFile ? `${apiBase()}/api/legal/${d.slug}/file` : "#"}
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
