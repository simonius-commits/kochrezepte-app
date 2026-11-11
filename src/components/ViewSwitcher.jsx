// Standard-Optionen (Cards | Liste | Tabelle). Über `options` lassen sich andere Optionen
// übergeben, z.B. auf der Seite „Einkaufen“: Nach Kategorie | Alphabetisch.
const DEFAULT_OPTIONS = [
  { key: "cards", label: "Cards" },
  { key: "list", label: "Liste" },
  { key: "table", label: "Tabelle" },
];

export default function ViewSwitcher({ view, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div className="view-switcher">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`view-switcher-btn${view === opt.key ? " active" : ""}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
