import { supabase } from "./supabaseClient.js";

// Kochbücher gehören jeweils der eingeloggten Person (Row Level Security filtert die Suche
// automatisch auf die eigenen Kochbücher, siehe schema.sql).
export async function findOrCreateCookbook(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("cookbooks")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("cookbooks")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}

// Sammlungen funktionieren genauso, gehören aber zu einer n:m-Verknüpfung (ein Rezept kann in
// mehreren Sammlungen sein), siehe recipe_collections.
export async function findOrCreateCollection(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("collections")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("collections")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}
