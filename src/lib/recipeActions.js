import { supabase } from "./supabaseClient.js";

// Löscht ein Rezept. Zutaten-Zeilen, Schritte, Tags, Hilfsmittel und Sammlungs-Zuordnungen
// verschwinden automatisch mit (in der Datenbank als "on delete cascade" hinterlegt).
export async function deleteRecipe(recipeId) {
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw error;
}

// Legt eine vollständige Kopie eines Rezepts an — inkl. Zutaten, Schritten, Tags, Hilfsmitteln,
// Sammlungen und Nährwerten — und gibt die ID der Kopie zurück.
export async function duplicateRecipe(recipeId) {
  const [recipeRes, ingredientsRes, stepsRes, tagsRes, toolsRes, collectionsRes] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", recipeId).single(),
    supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipeId),
    supabase.from("recipe_steps").select("*").eq("recipe_id", recipeId),
    supabase.from("recipe_tags").select("tag_id").eq("recipe_id", recipeId),
    supabase.from("recipe_tools").select("tool_id").eq("recipe_id", recipeId),
    supabase.from("recipe_collections").select("collection_id").eq("recipe_id", recipeId),
  ]);
  const firstError = [recipeRes, ingredientsRes, stepsRes, tagsRes, toolsRes, collectionsRes].find(
    (r) => r.error
  )?.error;
  if (firstError) throw firstError;

  // id, owner_id und created_at vergibt die Datenbank für die Kopie neu.
  const { id, owner_id, created_at, ...recipeFields } = recipeRes.data;
  const { data: copy, error: insertError } = await supabase
    .from("recipes")
    .insert({ ...recipeFields, titel: `${recipeFields.titel} (Kopie)` })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const newId = copy.id;
  const withoutIds = (rows) => (rows || []).map(({ id: _id, ...rest }) => ({ ...rest, recipe_id: newId }));
  const linkRows = (rows) => (rows || []).map((row) => ({ ...row, recipe_id: newId }));

  const inserts = [
    ["recipe_ingredients", withoutIds(ingredientsRes.data)],
    ["recipe_steps", withoutIds(stepsRes.data)],
    ["recipe_tags", linkRows(tagsRes.data)],
    ["recipe_tools", linkRows(toolsRes.data)],
    ["recipe_collections", linkRows(collectionsRes.data)],
  ].filter(([, rows]) => rows.length > 0);

  const results = await Promise.all(inserts.map(([table, rows]) => supabase.from(table).insert(rows)));
  const linkError = results.find((r) => r.error)?.error;
  if (linkError) throw linkError;

  return newId;
}
