import { useEffect, useRef, useState } from "react";

// Titel einer Card, der sich per "Umbenennen" in ein Eingabefeld verwandelt.
// Enter oder Klick daneben speichert, Escape bricht ab.
// onDone(neuerName) — neuerName ist null, wenn nichts geändert wurde oder abgebrochen.
export default function RenamableTitle({ name, renaming, onDone }) {
  const [value, setValue] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) {
      setValue(name);
      inputRef.current?.focus();
    }
  }, [renaming, name]);

  if (!renaming) return <h3 className="entity-card-title">{name}</h3>;

  function finish() {
    const trimmed = value.trim();
    onDone(trimmed && trimmed !== name ? trimmed : null);
  }

  return (
    <input
      ref={inputRef}
      className="input-field entity-card-rename-input"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish();
        }
        if (e.key === "Escape") onDone(null);
      }}
      onBlur={finish}
    />
  );
}
