// Macht aus einem vollständigen Link den kurzen Namen der Webseite, z.B.
// "https://www.chefkoch.de/rezepte/1234/pasta.html" → "chefkoch.de".
// Wird für die Quelle-Anzeige auf der Detailseite und als Kochbuch-Name beim Link-Import benutzt.
// Gibt null zurück, wenn der Text kein gültiger Link ist.
export function getDomain(url) {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

// Ergänzt "https://", falls jemand den Link ohne eingetippt hat (z.B. "chefkoch.de/rezept"),
// damit der Link im Browser nicht als Unterseite unserer eigenen App geöffnet wird.
export function toAbsoluteUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
