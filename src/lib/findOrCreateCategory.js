import { supabase } from "./supabaseClient.js";

// Kategorien gehören jeweils der eingeloggten Person (Row Level Security filtert die Suche
// automatisch auf die eigenen Kategorien, siehe schema.sql).
export async function findOrCreateCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("categories")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}
