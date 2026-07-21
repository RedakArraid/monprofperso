import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, MenuRow } from "@/components/layout";
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
      {offline ? <OfflineBanner onRetry={() => { void unread.reload(); void courses.reload(); }} /> : null}
      <Card className="border-primary/20 bg-primary text-primary-foreground">
        <CardHeader>
          <CardDescription className="text-white/80">Bonjour{first ? `, ${first}` : ""}</CardDescription>
          <CardTitle className="text-xl text-white">Trouvez le bon prof</CardTitle>
          <p className="text-sm text-white/85">Cours à domicile ou en ligne, profs vérifiés.</p>
        </CardHeader>
      </Card>
      <Button asChild className="w-full">
        <Link to="/recherche">Rechercher un prof</Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link to="/exprimer-besoin">Exprimer un besoin</Link>
      </Button>
      {(unread.data.count || 0) > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <Link to="/notifications" className="font-semibold">
              🔔 {unread.data.count} notification{(unread.data.count || 0) > 1 ? "s" : ""} ›
            </Link>
          </CardContent>
        </Card>
      ) : null}
      {next ? (
        <>
          <h2 className="font-display text-sm font-bold">Prochain cours</h2>
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <div className="font-semibold">
                  {next.subject} · {next.level}
                </div>
                <div className="text-sm text-muted-foreground">{next.teacher_name}</div>
                <div className="text-sm text-muted-foreground">
                  {next.day_label} {next.day_num} · {next.time}
                </div>
              </div>
              <strong>{fcfa(next.price)} F</strong>
            </CardContent>
          </Card>
        </>
      ) : null}
      <h2 className="font-display pt-2 text-sm font-bold">Raccourcis</h2>
      <MenuRow to="/mes-besoins" label="Mes besoins" />
      <MenuRow to="/enfants" label="Mes enfants" />
      <MenuRow to="/groupes" label="Cours en groupe" />
    </AppShell>
  );
}
