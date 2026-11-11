// Zerlegt einen Zubereitungsschritt-Text in Abschnitte, die im Kochmodus farbig markiert werden
// sollen: Zeit (per Muster-Erkennung), Zutaten und Hilfsmittel (per Textabgleich gegen die
// jeweilige Liste des Rezepts). Bewusste Vereinfachung: reiner Textabgleich, keine Grammatik-
// Analyse — erkennt daher nicht jede Beugung eines Wortes ("Zwiebeln" vs. "Zwiebel").
export function buildHighlightSegments(text, { ingredientNames = [], toolNames = [] } = {}) {
  if (!text) return [];

  const matches = [];

  const timeRegex = /\d+(?:[.,]\d+)?\s*(?:minuten|minute|min\.?|stunden|stunde|std\.?)/gi;
  let timeMatch;
  while ((timeMatch = timeRegex.exec(text))) {
    matches.push({ start: timeMatch.index, end: timeMatch.index + timeMatch[0].length, type: "zeit" });
  }

  const candidates = [
    ...ingredientNames.map((name) => ({ name, type: "zutat" })),
    ...toolNames.map((name) => ({ name, type: "hilfsmittel" })),
  ]
    .filter((c) => c.name && c.name.trim())
    .sort((a, b) => b.name.length - a.name.length); // längere Namen zuerst, verhindert Teil-Treffer

  for (const { name, type } of candidates) {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match;
    while ((match = regex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matches.some((m) => start < m.end && end > m.start);
      if (!overlaps) matches.push({ start, end, type });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), type: null });
    segments.push({ text: text.slice(m.start, m.end), type: m.type });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), type: null });

  return segments;
}
