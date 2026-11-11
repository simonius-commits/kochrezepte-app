// Liest eine Zeitangabe aus einem Zubereitungsschritt-Text heraus, z.B. "10 Minuten köcheln"
// oder "1 Stunde ruhen lassen". Das ist eine bewusste Vereinfachung: Unser Datenmodell hat
// (noch) kein eigenes Zeit-Feld pro Schritt, nur den Freitext. Erkennt daher nicht jede
// Formulierung — funktioniert aber für die gängigen Muster gut genug für einen Kochmodus-Timer.
export function extractDurationSeconds(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(minuten|minute|min\.?|stunden|stunde|std\.?)/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();
  const isHours = unit.startsWith("stund") || unit.startsWith("std");
  return Math.round(value * (isHours ? 3600 : 60));
}

export function formatDuration(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
