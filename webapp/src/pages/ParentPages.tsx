import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, ContentCard, PageGrid, DocLink } from "@/components/layout";
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
          <h2 className="mb-3 text-[20px] font-bold leading-snug text-[#222] sm:text-[22px]">
            Bonjour{first ? ` ${first}` : ""}, bienvenue sur votre espace Mon Prof Perso !
          </h2>
          <p className="mb-3 text-[15px] leading-relaxed text-[#444]">
            Vous cherchez un professeur ? Trouvez en quelques clics le profil qui vous correspond grâce à la{" "}
            <Link to="/recherche" className="link-green">
              recherche
            </Link>
            , ou{" "}
            <Link to="/exprimer-besoin" className="link-green">
              exprimez votre besoin
            </Link>{" "}
            : nous vous proposons un tarif adapté.
          </p>
          <p className="mb-5 text-[15px] leading-relaxed text-[#444]">
            Suivez les cours, les progrès et les ressources pédagogiques depuis cet espace, aussi disponible sur mobile.
          </p>

          <div className="mb-5 overflow-hidden rounded-lg bg-[#e8f2ee]">
            <div className="flex aspect-[16/9] max-h-48 items-center justify-center bg-gradient-to-br from-primary/15 to-welcome/20 px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-welcome">Votre prochain cours</p>
                {next ? (
                  <>
                    <p className="mt-1 text-[15px] font-bold text-[#222]">
                      {next.subject} · {next.level}
                    </p>
                    <p className="text-xs text-[#666]">
                      {next.teacher_name} · {next.day_label} {next.day_num} · {next.time}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">{fcfa(next.price)} F</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-[#666]">Aucun cours à venir pour le moment</p>
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link to="/recherche">Rechercher un prof</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/exprimer-besoin">Exprimer un besoin</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {(unread.data.count || 0) > 0 ? (
            <p className="mb-4 text-[14px]">
              <Link to="/notifications" className="link-green">
                {unread.data.count} notification{(unread.data.count || 0) > 1 ? "s" : ""} non lue
                {(unread.data.count || 0) > 1 ? "s" : ""}
              </Link>
            </p>
          ) : null}

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
            Notre équipe valide chaque profil avant la mise en relation. Les programmes scolaires (standard et français)
            sont couverts jusqu&apos;en Terminale, avec un accompagnement dédié pour le BEPC et le BAC.
          </p>
          <div className="mb-4 space-y-1 border-t border-[#eee] pt-3">
            <DocLink to="/mes-besoins">Mes besoins</DocLink>
            <DocLink to="/enfants">Mes enfants</DocLink>
            <DocLink to="/groupes">Cours en groupe & stages vacances</DocLink>
          </div>
          <Link to="/aide" className="link-green text-[15px]">
            Voir plus…
          </Link>
        </ContentCard>
      </PageGrid>
    </AppShell>
  );
}
