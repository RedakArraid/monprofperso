import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, MenuRow, ContentCard, PageGrid } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";

const EMPTY_UNREAD = { count: 0 };

export function HomePage() {
  const { user } = useAuth();
  const unread = useLive<{ count: number }>("/api/notifications/unread", EMPTY_UNREAD);
  const courses = useLive<typeof fallback.courses>("/api/courses?status=upcoming", fallback.courses);
  const offline = unread.offline || courses.offline;
  const next = courses.data[0];
  const first = user?.full_name?.split(" ")[0];

  return (
    <AppShell title="Accueil" active="accueil">
      {offline ? (
        <OfflineBanner
          onRetry={() => {
            void unread.reload();
            void courses.reload();
          }}
        />
      ) : null}

      <PageGrid>
        <ContentCard>
          <h2 className="mb-3 text-xl font-bold text-[#222] sm:text-[22px]">
            Bonjour{first ? ` ${first}` : ""}, bienvenue sur votre espace Mon Prof Perso !
          </h2>
          <p className="mb-3 text-[15px] leading-relaxed text-[#555]">
            Trouvez un professeur vérifié en quelques clics grâce à la{" "}
            <Link to="/recherche" className="link-green">
              recherche
            </Link>
            , ou{" "}
            <Link to="/exprimer-besoin" className="link-green">
              exprimez votre besoin
            </Link>{" "}
            : nous vous proposons un tarif adapté.
          </p>
          <p className="mb-5 text-[15px] leading-relaxed text-[#555]">
            Suivez les cours, les progrès et les notifications depuis cet espace web, aussi disponible sur mobile.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/recherche">Rechercher un prof</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/exprimer-besoin">Exprimer un besoin</Link>
            </Button>
          </div>
          {(unread.data.count || 0) > 0 ? (
            <p className="mt-5 text-sm">
              <Link to="/notifications" className="link-green">
                {unread.data.count} notification{(unread.data.count || 0) > 1 ? "s" : ""} non lue
                {(unread.data.count || 0) > 1 ? "s" : ""}
              </Link>
            </p>
          ) : null}
        </ContentCard>

        <ContentCard>
          <h2 className="mb-3 text-xl font-bold text-[#222] sm:text-[22px]">Votre prochain cours</h2>
          {next ? (
            <>
              <div className="text-lg font-semibold">
                {next.subject} · {next.level}
              </div>
              <div className="mt-1 text-sm text-[#666]">{next.teacher_name}</div>
              <div className="mt-1 text-sm text-[#666]">
                {next.day_label} {next.day_num} · {next.time}
              </div>
              <div className="mt-3 text-lg font-bold text-primary">{fcfa(next.price)} F</div>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/cours">Voir tous mes cours</Link>
              </Button>
            </>
          ) : (
            <p className="text-[15px] text-[#555]">
              Aucun cours à venir. Lancez une recherche ou déposez un besoin pour être mis en relation.
            </p>
          )}
          <div className="mt-6 space-y-2 border-t border-[#eee] pt-4">
            <MenuRow to="/mes-besoins" label="Mes besoins" />
            <MenuRow to="/enfants" label="Mes enfants" />
            <MenuRow to="/groupes" label="Cours en groupe" />
          </div>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}
