import { supabase } from "./supabaseClient.js";

// Tags gehören jeweils der eingeloggten Person (Row Level Security filtert die Suche
// automatisch auf die eigenen Tags, siehe schema.sql).
export async function findOrCreateTag(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("tags")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("tags")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}
