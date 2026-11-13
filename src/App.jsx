import { useLayoutEffect, useRef, useState } from "react";
import { useSession } from "./hooks/useSession.js";
import { useProfile } from "./hooks/useProfile.js";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient.js";
import AuthScreen from "./pages/AuthScreen.jsx";
import NewPasswordScreen from "./pages/NewPasswordScreen.jsx";
import RecipesOverview from "./pages/RecipesOverview.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import CollectionsPage from "./pages/CollectionsPage.jsx";
import CookbooksPage from "./pages/CookbooksPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import IngredientsPage from "./pages/IngredientsPage.jsx";
import TagsPage from "./pages/TagsPage.jsx";
import ToolsPage from "./pages/ToolsPage.jsx";
import IngredientCategoriesPage from "./pages/IngredientCategoriesPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import ImpressumPage from "./pages/ImpressumPage.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import ShoppingListPage from "./pages/ShoppingListPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import ConfirmDialogHost from "./components/ConfirmDialogHost.jsx";
import { SeiteAktivContext } from "./lib/seitenAktivierung.js";

const VIEW_TITLES = {
  benutzerprofil: "Benutzerprofil",
};

export default function App() {
  const { session, loading, passwordRecovery, finishPasswordRecovery } = useSession();
  const { profile } = useProfile(session);
  const isAdmin = Boolean(profile?.is_admin);
  const [activeView, setActiveView] = useState("rezepte");
  // Bereiche, die schon einmal geöffnet wurden, bleiben im Hintergrund erhalten (nur
  // ausgeblendet) — so steigt man beim Zurückwechseln dort ein, wo man war.
  const [besucht, setBesucht] = useState(["rezepte"]);
  // Pro Bereich: wie oft man zurückgekehrt ist → Seiten laden dann still neu (seitenAktivierung.js)
  const [aktivierungen, setAktivierungen] = useState({});
  const scrollPositionen = useRef({});
  const zielScroll = useRef(null);

  // Nach dem Wechsel die gemerkte Scroll-Position des Bereichs wiederherstellen
  useLayoutEffect(() => {
    if (zielScroll.current != null) {
      window.scrollTo(0, zielScroll.current);
      zielScroll.current = null;
    }
  }, [activeView]);

  // Ohne konfiguriertes Supabase bleibt die App im offenen Demo-Modus
  // (kein Login nötig, siehe supabaseClient.js) — Sidebar bleibt trotzdem sichtbar.
  if (isSupabaseConfigured) {
    if (loading) {
      return <div className="screen">Lädt …</div>;
    }
    if (!session) {
      return <AuthScreen />;
    }
    // Über den "Passwort zurücksetzen"-Link gekommen → erst neues Passwort festlegen.
    if (passwordRecovery) {
      return <NewPasswordScreen onDone={finishPasswordRecovery} />;
    }
  }

  function handleSignOut() {
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
  }

  function navigate(view) {
    if (view === activeView) return;
    scrollPositionen.current[activeView] = window.scrollY;
    zielScroll.current = scrollPositionen.current[view] ?? 0;
    if (besucht.includes(view)) {
      setAktivierungen((a) => ({ ...a, [view]: (a[view] || 0) + 1 }));
    } else {
      setBesucht((b) => [...b, view]);
    }
    setActiveView(view);
  }

  function renderPage(view) {
    switch (view) {
      case "rezepte":
        return <RecipesOverview />;
      case "einkaufen":
        return <ShoppingListPage />;
      case "sammlungen":
        return <CollectionsPage />;
      case "kochbuecher":
        return <CookbooksPage />;
      case "kategorien":
        return <CategoriesPage />;
      case "zutaten":
        return <IngredientsPage isAdmin={isAdmin} />;
      case "tags":
        return <TagsPage />;
      case "hilfsmittel":
        return <ToolsPage />;
      case "zutaten-kategorien":
        // Zusätzliche Absicherung im Code — die Sidebar blendet den Punkt für
        // Nicht-Admins zwar aus, die eigentliche Absicherung übernimmt aber die
        // Datenbank (RLS), diese Prüfung ist nur eine zweite, clientseitige Hürde.
        return isAdmin ? <IngredientCategoriesPage /> : <PlaceholderPage title="Kein Zugriff" />;
      case "nutzer":
        return isAdmin ? (
          <UsersPage currentUserId={session?.user?.id} />
        ) : (
          <PlaceholderPage title="Kein Zugriff" />
        );
      case "user-feedback":
        return isAdmin ? <FeedbackPage /> : <PlaceholderPage title="Kein Zugriff" />;
      case "impressum":
        return <ImpressumPage />;
      case "einstellungen":
        return <SettingsPage onNavigate={navigate} />;
      default:
        return <PlaceholderPage title={VIEW_TITLES[view] || view} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        isAdmin={isAdmin}
      />
      {/* key: nach Ab- und neuem Anmelden alles frisch aufbauen (keine Daten der alten Sitzung) */}
      <div className="app-shell-content" key={session?.user?.id || "demo"}>
        {besucht.map((view) => (
          <div key={view} hidden={view !== activeView}>
            <SeiteAktivContext.Provider value={aktivierungen[view] || 0}>{renderPage(view)}</SeiteAktivContext.Provider>
          </div>
        ))}
      </div>
      {/* Nur auf dem Handy sichtbar (index.css): Leiste unten statt Sidebar */}
      <MobileNav
        activeView={activeView}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        isAdmin={isAdmin}
      />
      <ConfirmDialogHost />
    </div>
  );
}
