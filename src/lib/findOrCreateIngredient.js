import { supabase } from "./supabaseClient.js";

/**
 * Zutaten sind Stammdaten, die sich alle Nutzer:innen teilen (siehe Datenmodell:
 * "Tomate" soll nur einmal existieren, nicht einmal pro Rezept). Diese Funktion
 * sucht zuerst nach einer vorhandenen Zutat mit demselben Namen (Groß-/Kleinschreibung
 * egal) und legt nur bei Bedarf eine neue an.
 */
export async function findOrCreateIngredient(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("ingredients")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("ingredients")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}
