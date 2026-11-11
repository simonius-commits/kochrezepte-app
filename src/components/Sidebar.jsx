import { APP_VERSION } from "../version.js";

const TOP_ITEMS = [
  { key: "rezepte", label: "Rezepte" },
  { key: "einkaufen", label: "Einkaufen" },
  { key: "sammlungen", label: "Sammlungen" },
  { key: "kochbuecher", label: "Kochbücher" },
  { key: "kategorien", label: "Kategorien" },
  { key: "zutaten", label: "Zutaten" },
  { key: "tags", label: "Tags" },
  { key: "hilfsmittel", label: "Hilfsmittel" },
];

const ADMIN_ITEMS = [
  { key: "zutaten-kategorien", label: "Zutaten-Kategorien" },
  { key: "nutzer", label: "Nutzer:innen" },
  { key: "user-feedback", label: "User-Feedback" },
];

const BOTTOM_ITEMS = [
  { key: "einstellungen", label: "Einstellungen" },
  { key: "benutzerprofil", label: "Benutzerprofil" },
];

export default function Sidebar({ activeView, onNavigate, onSignOut, isAdmin }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title-block">
        <div className="sidebar-app-name">Kochrezepte App</div>
        <div className="sidebar-meta-row">
          <span className="beta-tag">BETA</span>
          <span className="sidebar-version">v{APP_VERSION}</span>
        </div>
      </div>

      {/* Mittelteil: scrollt bei zu kleinem Fenster in sich selbst, damit der untere Bereich
          (Einstellungen, Abmelden, Impressum) immer unten sichtbar bleibt. */}
      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          {TOP_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-item${activeView === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-group-label">Admin</div>
            <nav className="sidebar-nav">
              {ADMIN_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`sidebar-nav-item${activeView === item.key ? " active" : ""}`}
                  onClick={() => onNavigate(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        {BOTTOM_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-nav-item${activeView === item.key ? " active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="sidebar-nav-item" onClick={onSignOut}>
          Abmelden
        </button>
        <button
          type="button"
          className={`sidebar-nav-item${activeView === "impressum" ? " active" : ""}`}
          onClick={() => onNavigate("impressum")}
        >
          Impressum
        </button>
      </nav>
    </aside>
  );
}
