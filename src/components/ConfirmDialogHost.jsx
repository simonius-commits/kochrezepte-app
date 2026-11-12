import { useEffect, useRef, useState } from "react";
import { registriereBestaetigenDialog } from "../lib/bestaetigen.js";

/**
 * Sicherheitsabfrage, z.B. „Rezept löschen?“ (Figma: Screens – User → Card-Optionen,
 * „Lösch-Dialog – Light/Dark Mode“). Wird einmal in App.jsx eingebunden; geöffnet wird er über
 * bestaetigen() aus src/lib/bestaetigen.js. Abbrechen: Button, Escape-Taste oder Klick daneben.
 */
export default function ConfirmDialogHost() {
  const [dialog, setDialog] = useState(null); // { titel, text, bestaetigenLabel, resolve }
  const abbrechenRef = useRef(null);

  useEffect(() => registriereBestaetigenDialog(setDialog), []);

  function schliessen(ergebnis) {
    dialog?.resolve(ergebnis);
    setDialog(null);
  }

  useEffect(() => {
    if (!dialog) return;
    // Fokus auf „Abbrechen“ — versehentliches Enter löscht so nichts
    abbrechenRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") schliessen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  if (!dialog) return null;

  return (
    <div className="modal-overlay" onClick={() => schliessen(false)}>
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bestaetigen-titel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bestaetigen-titel">{dialog.titel}</h2>
        {dialog.text && <p className="modal-subtitle bestaetigen-text">{dialog.text}</p>}
        <div className="form-footer">
          <button ref={abbrechenRef} type="button" className="btn btn-secondary" onClick={() => schliessen(false)}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-danger" onClick={() => schliessen(true)}>
            {dialog.bestaetigenLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
