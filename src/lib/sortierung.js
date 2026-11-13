// Sortier-Optionen und -Logik für die Übersichtsseiten (Figma: Screens – User → Sortierung (v0.59)).
// Die Wahl wird pro Bereich dauerhaft gemerkt (useGemerkteAnsicht).

export const REZEPT_SORTIERUNGEN = [
  { key: "neueste", label: "Neueste zuerst" },
  { key: "aelteste", label: "Älteste zuerst" },
  { key: "az", label: "A–Z" },
  { key: "za", label: "Z–A" },
  { key: "zeit", label: "Kürzeste Zeit zuerst" },
  { key: "aufwand", label: "Wenig Aufwand zuerst" },
];

// Kochbücher, Sammlungen, Kategorien, Tags, Zutaten, Hilfsmittel, Zutaten-Kategorien
export const LISTEN_SORTIERUNGEN = [
  { key: "az", label: "A–Z" },
  { key: "za", label: "Z–A" },
  { key: "meiste", label: "Meiste Rezepte zuerst" },
  { key: "neueste", label: "Neueste zuerst" },
  { key: "aelteste", label: "Älteste zuerst" },
];

export const keys = (optionen) => optionen.map((o) => o.key);

const nachName = (a, b) => (a || "").localeCompare(b || "", "de", { sensitivity: "base" });
const zeitpunkt = (x) => (x ? Date.parse(x) || 0 : 0);

/** Gesamtzeit eines Rezepts in Minuten (oder null, wenn keine Angabe) */
export function rezeptZeit(r) {
  if (r.gesamtzeit_min) return r.gesamtzeit_min;
  const summe = (r.zubereitungszeit_min || 0) + (r.kochzeit_min || 0);
  return summe || null;
}

/** Aufwand = Anzahl Zutaten + Anzahl Schritte */
export function rezeptAufwand(r) {
  return (r.anzahlZutaten || 0) + (r.anzahlSchritte || 0);
}

/** Rezepte sortieren. Erwartet titel, created_at, Zeiten und anzahlZutaten/anzahlSchritte. */
export function sortiereRezepte(liste, key) {
  const l = [...liste];
  switch (key) {
    case "aelteste":
      return l.sort((a, b) => zeitpunkt(a.created_at) - zeitpunkt(b.created_at));
    case "az":
      return l.sort((a, b) => nachName(a.titel, b.titel));
    case "za":
      return l.sort((a, b) => nachName(b.titel, a.titel));
    case "zeit":
      // Ohne Zeitangabe ans Ende; bei gleicher Zeit A–Z
      return l.sort((a, b) => {
        const za = rezeptZeit(a), zb = rezeptZeit(b);
        if (za == null && zb == null) return nachName(a.titel, b.titel);
        if (za == null) return 1;
        if (zb == null) return -1;
        return za - zb || nachName(a.titel, b.titel);
      });
    case "aufwand":
      // Rezepte ohne Zutaten oder ohne Schritte (unvollständig, z.B. aus Mela) ans Ende —
      // ihr Aufwand ist unbekannt, nicht gering. Bei gleichem Aufwand A–Z.
      return l.sort((a, b) => {
        const wert = (r) => (r.anzahlZutaten && r.anzahlSchritte ? rezeptAufwand(r) : Infinity);
        const xa = wert(a), xb = wert(b);
        return (xa === xb ? 0 : xa < xb ? -1 : 1) || nachName(a.titel, b.titel);
      });
    case "neueste":
    default:
      return l.sort((a, b) => zeitpunkt(b.created_at) - zeitpunkt(a.created_at));
  }
}

/** Kochbücher, Tags, Zutaten … sortieren. Erwartet name, count, created_at. */
export function sortiereListe(liste, key) {
  const l = [...liste];
  switch (key) {
    case "za":
      return l.sort((a, b) => nachName(b.name, a.name));
    case "meiste":
      return l.sort((a, b) => (b.count || 0) - (a.count || 0) || nachName(a.name, b.name));
    case "neueste":
      return l.sort((a, b) => zeitpunkt(b.created_at) - zeitpunkt(a.created_at));
    case "aelteste":
      return l.sort((a, b) => zeitpunkt(a.created_at) - zeitpunkt(b.created_at));
    case "az":
    default:
      return l.sort((a, b) => nachName(a.name, b.name));
  }
}
