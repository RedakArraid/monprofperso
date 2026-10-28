import { Link } from "react-router-dom";
import { Bell, BookOpen, CalendarDays, Search } from "lucide-react";
import { AppShell, OfflineBanner, ContentCard, PageGrid, DocLink, SectionHeading } from "@/components/layout";
import { BrandIllustration } from "@/components/brand-illustration";
import { Button } from "@/components/ui/button";
import { useCapabilities } from "@/lib/capabilities";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";

const EMPTY_UNREAD = { count: 0 };

export function HomePage() {
  const { user } = useAuth();
  const { capabilities } = useCapabilities();
  const unread = useLive<{ count: number }>("/api/notifications/unread", EMPTY_UNREAD);
  const courses = useLive<typeof fallback.courses>("/api/courses?status=upcoming", fallback.courses);
  const offline = unread.offline || courses.offline;
  const next = courses.data[0];
  const first = user?.full_name?.split(" ")[0];

  return (
    <AppShell title="Accueil" active="accueil" welcome={false}>
      {offline ? <OfflineBanner onRetry={() => { void unread.reload(); void courses.reload(); }} /> : null}
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="grid min-w-0 items-center gap-6 rounded-3xl border border-border bg-[#f5f2eb] p-5 sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" aria-labelledby="home-welcome">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-primary">Votre espace d’apprentissage</p>
            <h2 id="home-welcome" className="font-display text-3xl font-extrabold leading-tight text-welcome sm:text-4xl">Bonjour{first ? ` ${first}` : ""}.</h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">Un professeur à vos côtés, des cours à votre rythme. Retrouvez ici les prochaines étapes de votre accompagnement.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/recherche"><Search className="h-4 w-4" aria-hidden="true" />Trouver un professeur</Link></Button>
              {capabilities.needs ? <Button asChild variant="outline" size="lg"><Link to="/exprimer-besoin">Exprimer un besoin</Link></Button> : null}
            </div>
          </div>
          <BrandIllustration className="hidden w-full max-w-sm justify-self-end rounded-2xl md:block" />
        </section>
        <PageGrid cols={2}>
          <ContentCard>
            <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-secondary p-3 text-primary"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span><SectionHeading className="mb-0">Votre prochain cours</SectionHeading></div>
            {courses.loading ? <p role="status" className="py-4 text-sm text-muted-foreground">Chargement de votre prochain cours…</p> : courses.offline ? <p className="py-4 text-sm text-muted-foreground">Le planning est momentanément indisponible.</p> : next ? (
              <div className="rounded-xl bg-secondary/50 p-4 sm:p-5">
                <p className="text-xl font-bold text-welcome">{next.subject} · {next.level}</p>
                <p className="mt-2 text-sm text-muted-foreground">Avec {next.teacher_name}</p>
                <p className="mt-3 font-semibold">{next.day_label} {next.day_num} · {next.time}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-primary">{fcfa(next.price)} F</p><Button asChild><Link to={`/cours/${next.id}`}>Voir le cours</Link></Button></div>
              </div>
            ) : <div className="rounded-xl border border-dashed border-border p-5"><BookOpen className="mb-3 h-7 w-7 text-primary" aria-hidden="true" /><p className="font-semibold text-welcome">Votre prochain cours commence ici.</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Vous n’avez pas encore de cours à venir. Recherchez un professeur ou décrivez votre besoin pour commencer.</p></div>}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1"><DocLink to="/cours">Tous mes cours</DocLink>{capabilities.agenda ? <DocLink to="/agenda">Mon agenda</DocLink> : null}</div>
          </ContentCard>
          <ContentCard>
            <SectionHeading>Votre accompagnement</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">Gérez les besoins de votre famille et retrouvez les bilans partagés après les cours.</p>
            <div className="divide-y divide-border">
              {capabilities.needs ? <DocLink to="/mes-besoins">Suivre mes demandes de cours</DocLink> : null}
              <DocLink to="/enfants">Gérer les profils de mes enfants</DocLink>
              {capabilities.progress ? <DocLink to="/progres">Lire les bilans pédagogiques</DocLink> : null}
              <DocLink to="/aide">Obtenir de l’aide</DocLink>
            </div>
            {!unread.loading && !unread.offline && unread.data.count > 0 ? <Link to="/notifications" className="mt-5 flex min-h-11 items-center gap-3 rounded-xl bg-orange-soft p-4 text-sm font-semibold text-[#744521]"><Bell className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{unread.data.count} notification{unread.data.count > 1 ? "s" : ""} non lue{unread.data.count > 1 ? "s" : ""}</span></Link> : null}
          </ContentCard>
        </PageGrid>
      </div>
    </AppShell>
  );
}
