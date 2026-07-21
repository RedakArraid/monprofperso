import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/ParentPages";
import {
  AccountPage,
  CoursesPage,
  FiltersPage,
  LegalPage,
  ProgressPage,
  SearchPage,
  TeacherProfilePage,
} from "@/pages/SearchAccount";
import { ChildrenPage, ExpressNeedPage, MyNeedsPage } from "@/pages/NeedsPages";
import {
  TeacherDashboardPage,
  TeacherEarningsPage,
  TeacherProfileEditPage,
  TeacherRequestsPage,
} from "@/pages/TeacherPages";
import {
  BookingPage,
  ConfirmationPage,
  ContactsPage,
  GroupDetailPage,
  GroupsPage,
  MockPage,
  NotificationsPage,
  PaymentOtpPage,
  PaymentPage,
  ReferralPage,
  ResourcesPage,
  SubscriptionPage,
  WalletPage,
} from "@/pages/MiscPages";

function RequireAuth({ children }: { children: import("react").ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Chargement…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") {
    localStorage.setItem("mpp_admin_jwt", localStorage.getItem("mpp_user_jwt") || "");
    window.location.href = "/admin/";
    return null;
  }
  return children;
}

function DefaultRedirect() {
  const { isTeacher } = useAuth();
  return <Navigate to={isTeacher ? "/prof-espace" : "/accueil"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inscription" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Routes>
              <Route path="/" element={<DefaultRedirect />} />
              <Route path="/accueil" element={<HomePage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/recherche/filtres" element={<FiltersPage />} />
              <Route path="/prof/:id" element={<TeacherProfilePage />} />
              <Route path="/cours" element={<CoursesPage />} />
              <Route path="/progres" element={<ProgressPage />} />
              <Route path="/compte" element={<AccountPage />} />
              <Route path="/enfants" element={<ChildrenPage />} />
              <Route path="/exprimer-besoin" element={<ExpressNeedPage />} />
              <Route path="/mes-besoins" element={<MyNeedsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/portefeuille" element={<WalletPage />} />
              <Route path="/groupes" element={<GroupsPage />} />
              <Route path="/groupes/:id" element={<GroupDetailPage />} />
              <Route path="/abonnement" element={<SubscriptionPage />} />
              <Route path="/parrainage" element={<ReferralPage />} />
              <Route path="/ressources" element={<ResourcesPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/reservation" element={<BookingPage />} />
              <Route path="/paiement" element={<PaymentPage />} />
              <Route path="/paiement-otp" element={<PaymentOtpPage />} />
              <Route path="/confirmation" element={<ConfirmationPage />} />
              <Route path="/prof-espace" element={<TeacherDashboardPage />} />
              <Route path="/prof-offres" element={<TeacherRequestsPage />} />
              <Route path="/prof-revenus" element={<TeacherEarningsPage />} />
              <Route path="/prof-profil" element={<TeacherProfileEditPage />} />
              <Route
                path="/prof-retrait"
                element={<MockPage title="Retrait" text="Demande de retrait vers Mobile Money." active="prof-revenus" />}
              />
              <Route path="/aide" element={<ContactsPage />} />
              <Route
                path="/parametres"
                element={<MockPage title="Paramètres" text="Notifications, langue, confidentialité." />}
              />
              <Route
                path="/agenda"
                element={
                  <MockPage
                    title="Mon agenda"
                    text="Vos créneaux de cours cette semaine. Synchronisation calendrier bientôt disponible."
                    active="agenda"
                  />
                }
              />
              <Route path="/messages" element={<MockPage title="Messages" text="Messagerie avec vos professeurs." />} />
              <Route
                path="/cours-en-ligne"
                element={<MockPage title="Cours en ligne" text="Salle de visioconférence." />}
              />
              <Route path="/avis" element={<MockPage title="Laisser un avis" text="Notez votre dernier cours." />} />
              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
