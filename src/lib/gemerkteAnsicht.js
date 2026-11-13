// Merkt sich eine Auswahl (z.B. Ansicht „Cards | Liste | Tabelle“) dauerhaft im Browser
// (localStorage) — auch nach dem Schließen, bis man sie wieder ändert. Pro Browser/Gerät.
// Ist der Speicher nicht verfügbar (z.B. privates Fenster), gilt einfach der Standardwert.
import { useState } from "react";

const PREFIX = "kochrezepte:";

function lesen(schluessel, standard, erlaubt) {
  try {
    const wert = window.localStorage.getItem(PREFIX + schluessel);
    if (wert != null && (!erlaubt || erlaubt.includes(wert))) return wert;
  } catch {
    // kein Zugriff auf den Speicher → Standardwert
  }
  return standard;
}

/**
 * Wie useState, nur dauerhaft gemerkt.
 * `erlaubt` (optional): gültige Werte — veraltete gespeicherte Werte werden ignoriert.
 */
export function useGemerkteAnsicht(schluessel, standard, erlaubt) {
  const [wert, setWert] = useState(() => lesen(schluessel, standard, erlaubt));
  function aendern(neu) {
    setWert(neu);
    try {
      window.localStorage.setItem(PREFIX + schluessel, neu);
    } catch {
      // nicht speicherbar → gilt nur bis zum Neuladen
    }
  }
  return [wert, aendern];
}
