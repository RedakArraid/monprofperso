import { Fragment, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/ParentPages";
import {
  AccountPage,
  FiltersPage,
  LegalPage,
  ProgressPage,
  SearchPage,
  TeacherProfilePage,
} from "@/pages/SearchAccount";
import { AgendaPage, CourseDetailPage, CoursesPage } from "@/pages/CoursePages";
import { AccountSettingsPage } from "@/pages/AccountSettingsPage";
import { TeacherFinancePage } from "@/pages/TeacherFinancePage";
import { CapabilityGate } from "@/components/capabilities";
import { ChildrenPage, ExpressNeedPage, MyNeedsPage } from "@/pages/NeedsPages";
import {
  TeacherDashboardPage,
  TeacherProfileEditPage,
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

// Mapping tools are only needed when a professor opens the offers page.
const TeacherRequestsPage = lazy(() => import("@/pages/TeacherOffersPage").then((module) => ({ default: module.TeacherRequestsPage })));

function RequireAuth({ children }: { children: import("react").ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Chargement…</div>
    );
  }
  if (!user) return <Navigate to={location.pathname === "/parametres" ? "/login?next=suppression" : "/login"} replace />;
  if (user.role === "admin" && location.pathname !== "/parametres") {
    localStorage.setItem("mpp_admin_jwt", localStorage.getItem("mpp_user_jwt") || "");
    window.location.href = "/admin/";
    return null;
  }
  return <Fragment key={user.id}>{children}</Fragment>;
}

function RequireTeacher({ children }: { children: import("react").ReactNode }) {
  const { isTeacher } = useAuth();
  return isTeacher ? children : <Navigate to="/accueil" replace />;
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
              <Route path="/cours/:id" element={<CourseDetailPage />} />
              <Route path="/progres" element={<CapabilityGate name="progress" title="Bilans pédagogiques"><ProgressPage /></CapabilityGate>} />
              <Route path="/compte" element={<AccountPage />} />
              <Route path="/enfants" element={<ChildrenPage />} />
              <Route path="/exprimer-besoin" element={<ExpressNeedPage />} />
              <Route path="/mes-besoins" element={<MyNeedsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/portefeuille" element={<WalletPage />} />
              <Route path="/groupes" element={<CapabilityGate name="groups" title="Cours en groupe"><GroupsPage /></CapabilityGate>} />
              <Route path="/groupes/:id" element={<CapabilityGate name="groups" title="Cours en groupe"><GroupDetailPage /></CapabilityGate>} />
              <Route path="/abonnement" element={<CapabilityGate name="subscriptions" title="Abonnement"><SubscriptionPage /></CapabilityGate>} />
              <Route path="/parrainage" element={<CapabilityGate name="referrals" title="Parrainage"><ReferralPage /></CapabilityGate>} />
              <Route path="/ressources" element={<ResourcesPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/reservation" element={<BookingPage />} />
              <Route path="/paiement" element={<PaymentPage />} />
              <Route path="/paiement-otp" element={<PaymentOtpPage />} />
              <Route path="/confirmation" element={<ConfirmationPage />} />
              <Route path="/prof-espace" element={<RequireTeacher><TeacherDashboardPage /></RequireTeacher>} />
              <Route path="/prof-offres" element={<RequireTeacher><Suspense fallback={<p className="p-6">Chargement des offres…</p>}><TeacherRequestsPage /></Suspense></RequireTeacher>} />
              <Route path="/prof-revenus" element={<RequireTeacher><CapabilityGate name="payouts" title="Mes revenus"><TeacherFinancePage /></CapabilityGate></RequireTeacher>} />
              <Route path="/prof-profil" element={<RequireTeacher><TeacherProfileEditPage /></RequireTeacher>} />
              <Route path="/prof-retrait" element={<RequireTeacher><Navigate to="/prof-revenus" replace /></RequireTeacher>} />
              <Route path="/aide" element={<ContactsPage />} />
              <Route path="/parametres" element={<AccountSettingsPage />} />
              <Route path="/agenda" element={<CapabilityGate name="agenda" title="Mon agenda"><AgendaPage /></CapabilityGate>} />
              <Route path="/messages" element={<CapabilityGate name="messaging" title="Messagerie"><MockPage title="Messages" text="Ce service est indisponible." /></CapabilityGate>} />
              <Route path="/cours-en-ligne" element={<Navigate to="/cours" replace />} />
              <Route path="/avis" element={<Navigate to="/cours" replace />} />
              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
