// Bereiche (Rezepte, Einkaufen, Sammlungen …) bleiben beim Wechseln im Hintergrund erhalten,
// damit man beim Zurückkommen dort weitermacht, wo man war (geöffnetes Rezept, Filter, Tabs,
// Scroll-Position). Siehe App.jsx.
//
// Damit die Daten trotzdem aktuell sind, zählt App.jsx pro Bereich mit, wie oft man
// zurückgekehrt ist, und gibt die Zahl über diesen Context weiter. Seiten laden ihre Daten
// bei jeder Rückkehr „still“ neu (ohne „Lädt …“, damit nichts springt).
import { createContext, useContext, useEffect, useRef } from "react";

export const SeiteAktivContext = createContext(0);

/**
 * Ruft `fn` jedes Mal auf, wenn man zu diesem Bereich zurückkehrt — nicht beim ersten Öffnen
 * (da lädt die Seite ohnehin selbst).
 */
export function useBeiRueckkehr(fn) {
  const aktivierung = useContext(SeiteAktivContext);
  const ersterLauf = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    fnRef.current();
  }, [aktivierung]);
}
