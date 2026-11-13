// Supabase liefert pro Abfrage höchstens 1000 Zeilen. Diese Funktion lädt eine Tabelle
// seitenweise komplett — z.B. alle Rezepte oder alle Zutaten-Zuordnungen (seit dem
// Mela-Import mehrere Tausend). Ohne das würden Zählungen („12 Rezepte“) zu niedrig ausfallen.
import { supabase } from "./supabaseClient.js";

const SEITE = 1000;

/**
 * @param tabelle    z.B. "recipe_tags"
 * @param spalten    wie bei .select(), z.B. "tag_id" oder "*, categories(name)"
 * @param sortierung Spalten für eine eindeutige Reihenfolge beim Blättern (Standard: "id";
 *                   Verknüpfungstabellen ohne id z.B. ["recipe_id", "tag_id"])
 */
export async function ladeAlle(tabelle, spalten, sortierung = ["id"]) {
  const alle = [];
  for (let von = 0; ; von += SEITE) {
    let abfrage = supabase.from(tabelle).select(spalten);
    for (const s of sortierung) abfrage = abfrage.order(s, { ascending: true });
    const { data, error } = await abfrage.range(von, von + SEITE - 1);
    if (error) throw error;
    alle.push(...(data || []));
    if (!data || data.length < SEITE) return alle;
  }
}

/** Zählt pro Wert einer Spalte, z.B. wie viele Rezepte pro Tag: { tagId: anzahl } */
export async function zaehleAlle(tabelle, spalte, sortierung) {
  const zeilen = await ladeAlle(tabelle, spalte, sortierung || [spalte]);
  const zaehler = {};
  for (const z of zeilen) if (z[spalte]) zaehler[z[spalte]] = (zaehler[z[spalte]] || 0) + 1;
  return zaehler;
}
