const OPTIONS = [
  { key: "cards", label: "Cards" },
  { key: "list", label: "Liste" },
  { key: "table", label: "Tabelle" },
];

export default function ViewSwitcher({ view, onChange }) {
  return (
    <div className="view-switcher">
      {OPTIONS.map((opt) => (
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
