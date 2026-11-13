import { ChevronDown } from "lucide-react";

/**
 * Sortier-Auswahl (Figma: Seite „Select“ → Komponente „Sort Select“). Steht links neben dem
 * Umschalter Cards | Liste | Tabelle. Ein echtes <select>: auf dem Handy öffnet sich die
 * gewohnte Auswahl von iOS/Android, Tastatur und Screenreader funktionieren automatisch.
 */
export default function SortSelect({ value, onChange, options }) {
  return (
    <label className="sort-select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sortieren">
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="sort-select-icon" aria-hidden="true" />
    </label>
  );
}
