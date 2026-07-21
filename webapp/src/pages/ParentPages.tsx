import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, MenuRow, PageGrid, SectionTitle } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-primary/20 bg-primary text-primary-foreground">
          <CardHeader className="space-y-3 p-6 sm:p-8">
            <CardDescription className="text-base text-white/80">
              Bonjour{first ? `, ${first}` : ""}
            </CardDescription>
            <CardTitle className="font-display text-3xl text-white sm:text-4xl">Trouvez le bon prof</CardTitle>
            <p className="max-w-xl text-base text-white/85">
              Cours à domicile ou en ligne, professeurs vérifiés, paiement Mobile Money.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="accent" size="lg">
                <Link to="/recherche">Rechercher un prof</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/exprimer-besoin">Exprimer un besoin</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-4">
          {(unread.data.count || 0) > 0 ? (
            <Card>
              <CardContent className="pt-5">
                <Link to="/notifications" className="text-base font-semibold">
                  🔔 {unread.data.count} notification{(unread.data.count || 0) > 1 ? "s" : ""} ›
                </Link>
              </CardContent>
            </Card>
          ) : null}
          {next ? (
            <Card>
              <CardHeader>
                <CardDescription>Prochain cours</CardDescription>
                <CardTitle>
                  {next.subject} · {next.level}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  <div>{next.teacher_name}</div>
                  <div>
                    {next.day_label} {next.day_num} · {next.time}
                  </div>
                </div>
                <strong className="text-lg">{fcfa(next.price)} F</strong>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-5 text-sm text-muted-foreground">
                Aucun cours à venir. Lancez une recherche ou exprimez un besoin.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle>Raccourcis</SectionTitle>
        <PageGrid className="mt-3 xl:grid-cols-3">
          <MenuRow to="/mes-besoins" label="Mes besoins" />
          <MenuRow to="/enfants" label="Mes enfants" />
          <MenuRow to="/groupes" label="Cours en groupe" />
        </PageGrid>
      </div>
    </AppShell>
  );
}
