import { supabase } from "./supabaseClient.js";

// Hilfsmittel sind wie Zutaten ein geteilter Pool über alle Nutzer:innen hinweg.
export async function findOrCreateTool(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from("tools")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("tools")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}
