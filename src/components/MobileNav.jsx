import { useEffect, useState } from "react";
import { Bookmark, ChefHat, Menu, ShoppingCart } from "lucide-react";
import { APP_VERSION } from "../version.js";
import { ADMIN_ITEMS, BOTTOM_ITEMS, TOP_ITEMS } from "./Sidebar.jsx";

/**
 * Navigation auf dem Handy (Figma: Komponente „Mobile Tab Bar“ + Screens – User → Mobil (v0.57)).
 * Leiste unten mit Rezepte · Einkaufen · Sammlungen · Mehr; „Mehr“ öffnet ein Menü von unten
 * mit allen übrigen Bereichen. Sichtbar nur auf schmalen Bildschirmen (< 768 px, siehe
 * index.css) — am Computer bleibt die Sidebar.
 */
const TABS = [
  { key: "rezepte", label: "Rezepte", Icon: ChefHat },
  { key: "einkaufen", label: "Einkaufen", Icon: ShoppingCart },
  { key: "sammlungen", label: "Sammlungen", Icon: Bookmark },
];
const TAB_KEYS = TABS.map((t) => t.key);
// Im „Mehr“-Menü: alle Bereiche, die nicht schon in der Leiste stehen
const MEHR_ITEMS = TOP_ITEMS.filter((i) => !TAB_KEYS.includes(i.key));

export default function MobileNav({ activeView, onNavigate, onSignOut, isAdmin }) {
  const [mehrOffen, setMehrOffen] = useState(false);

  // Escape schließt das Menü
  useEffect(() => {
    if (!mehrOffen) return;
    const onKey = (e) => e.key === "Escape" && setMehrOffen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mehrOffen]);

  function gehe(key) {
    setMehrOffen(false);
    onNavigate(key); // Scroll-Position merkt sich App.jsx pro Bereich
  }

  const mehrAktiv = mehrOffen || !TAB_KEYS.includes(activeView);

  const eintrag = (item) => (
    <button
      key={item.key}
      type="button"
      className={`sidebar-nav-item${activeView === item.key ? " active" : ""}`}
      onClick={() => gehe(item.key)}
    >
      {item.label}
    </button>
  );

  return (
    <>
      {mehrOffen && (
        <div className="mobile-mehr-overlay" onClick={() => setMehrOffen(false)}>
          <div className="mobile-mehr-sheet" role="dialog" aria-label="Weitere Bereiche" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-mehr-griff" aria-hidden="true" />
            <nav className="sidebar-nav">{MEHR_ITEMS.map(eintrag)}</nav>
            {isAdmin && (
              <>
                <div className="sidebar-divider" />
                <div className="sidebar-group-label">Admin</div>
                <nav className="sidebar-nav">{ADMIN_ITEMS.map(eintrag)}</nav>
              </>
            )}
            <div className="sidebar-divider" />
            <nav className="sidebar-nav">
              {BOTTOM_ITEMS.map(eintrag)}
              {eintrag({ key: "impressum", label: "Impressum" })}
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={() => {
                  setMehrOffen(false);
                  onSignOut();
                }}
              >
                Abmelden
              </button>
            </nav>
            <div className="mobile-mehr-version">Kochrezepte App · BETA v{APP_VERSION}</div>
          </div>
        </div>
      )}

      <nav className="mobile-tabbar" aria-label="Hauptnavigation">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`mobile-tab${activeView === key && !mehrOffen ? " active" : ""}`}
            onClick={() => gehe(key)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-tab${mehrAktiv ? " active" : ""}`}
          aria-expanded={mehrOffen}
          onClick={() => setMehrOffen((o) => !o)}
        >
          <Menu size={22} />
          <span>Mehr</span>
        </button>
      </nav>
    </>
  );
}
