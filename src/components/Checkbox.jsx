import { Check } from "lucide-react";

/**
 * Checkbox (Figma: Seite „Input“ → Komponente „Checkbox“, Varianten Checked=false/true).
 * Darunter liegt eine echte <input type="checkbox">, damit Tastatur und Screenreader
 * funktionieren — sie ist nur unsichtbar, gezeichnet wird das Kästchen per CSS.
 * Alles, was als children übergeben wird, ist mit anklickbar (z.B. der Zutatenname).
 */
export default function Checkbox({ checked, onChange, disabled, className = "", children }) {
  return (
    <label className={`checkbox-row${disabled ? " checkbox-row-disabled" : ""} ${className}`}>
      <input
        type="checkbox"
        className="checkbox-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`checkbox${checked ? " checkbox-checked" : ""}`} aria-hidden="true">
        {checked && <Check size={16} strokeWidth={2} />}
      </span>
      {children}
    </label>
  );
}
