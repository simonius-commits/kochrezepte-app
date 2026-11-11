import { supabase } from "./supabaseClient.js";

/**
 * Datenzugriff für die Einkaufsliste (Tabellen shopping_list_recipes + shopping_list_items,
 * siehe supabase/migration-einkaufsliste.sql). Row Level Security sorgt dafür, dass jede
 * Person nur ihre eigene Liste sieht — deshalb wird hier nirgends nach owner_id gefiltert.
 */

/** Steht das Rezept schon auf der Liste? Liefert den Eintrag ({ id, portionen }) oder null. */
export async function findShoppingListEntry(recipeId) {
  const { data, error } = await supabase
    .from("shopping_list_recipes")
    .select("id, portionen")
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Setzt ein Rezept mit den ausgewählten Zutaten auf die Einkaufsliste.
 * items: [{ ingredient_id, menge, einheit }] — Mengen schon auf `portionen` umgerechnet.
 * mode:
 *   "neu"       → Rezept steht noch nicht auf der Liste
 *   "ersetzen"  → bisherige Auswahl für dieses Rezept wird komplett ersetzt
 *   "addieren"  → Mengen gleicher Zutaten (gleiche Einheit) werden zusammengezählt
 */
export async function addRecipeToShoppingList({ recipeId, portionen, items: rawItems, mode, existing }) {
  // Kommt eine Zutat im Rezept mehrfach vor (z.B. Knoblauch fürs Püree UND fürs Topping),
  // steht sie auf der Einkaufsliste nur einmal — mit der Summe der Mengen.
  const items = mergeSameIngredients(rawItems);

  if (mode === "neu") {
    const { data: entry, error } = await supabase
      .from("shopping_list_recipes")
      .insert({ recipe_id: recipeId, portionen })
      .select("id")
      .single();
    if (error) throw error;
    await insertItems(entry.id, items);
    return;
  }

  if (mode === "ersetzen") {
    const { error: updateError } = await supabase
      .from("shopping_list_recipes")
      .update({ portionen })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    const { error: deleteError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("list_recipe_id", existing.id);
    if (deleteError) throw deleteError;
    await insertItems(existing.id, items);
    return;
  }

  // "addieren"
  const { error: updateError } = await supabase
    .from("shopping_list_recipes")
    .update({ portionen: existing.portionen + portionen })
    .eq("id", existing.id);
  if (updateError) throw updateError;

  const { data: currentItems, error: loadError } = await supabase
    .from("shopping_list_items")
    .select("id, ingredient_id, menge, einheit")
    .eq("list_recipe_id", existing.id);
  if (loadError) throw loadError;

  const newItems = [];
  const used = new Set(); // jede bestehende Zeile höchstens einmal verrechnen
  for (const item of items) {
    // Nur zusammenzählen, wenn Zutat UND Einheit gleich sind — "200 g" + "1 Packung"
    // lässt sich nicht sinnvoll addieren (bewusst keine Einheiten-Umrechnung).
    const match = currentItems.find((c) => !used.has(c.id) && isSameEntry(c, item));
    if (match) {
      used.add(match.id);
      // Ohne Menge (z.B. "Salz"): steht schon drauf, nur den Haken wieder entfernen.
      const menge = match.menge != null ? round2(match.menge + item.menge) : null;
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ menge, erledigt: false })
        .eq("id", match.id);
      if (error) throw error;
    } else {
      newItems.push(item);
    }
  }
  await insertItems(existing.id, newItems);
}

async function insertItems(listRecipeId, items) {
  if (items.length === 0) return;
  const { error } = await supabase.from("shopping_list_items").insert(
    items.map((i) => ({
      list_recipe_id: listRecipeId,
      ingredient_id: i.ingredient_id,
      menge: i.menge,
      einheit: i.einheit || null,
    }))
  );
  if (error) throw error;
}

/** Ganze Einkaufsliste laden: Rezepte (älteste zuerst) mit ihren Zutaten. */
export async function loadShoppingList() {
  const { data, error } = await supabase
    .from("shopping_list_recipes")
    .select(
      "id, portionen, created_at, recipes(id, titel), shopping_list_items(id, menge, einheit, erledigt, created_at, ingredients(name))"
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((entry) => ({
    ...entry,
    // Beim Laden: offene Zutaten zuerst, darin alphabetisch. (Die Reihenfolge aus dem Rezept
    // ist nicht gespeichert — alle Zeilen eines Rezepts haben denselben Zeitstempel.)
    // Während man im Laden abhakt, wird bewusst NICHT neu sortiert, damit nichts herumspringt.
    shopping_list_items: [...(entry.shopping_list_items || [])].sort(
      (a, b) =>
        Number(a.erledigt) - Number(b.erledigt) ||
        (a.ingredients?.name || "").localeCompare(b.ingredients?.name || "", "de")
    ),
  }));
}

/** Zutat im Laden abhaken (oder Haken wieder entfernen). */
export async function setShoppingItemDone(itemId, erledigt) {
  const { error } = await supabase.from("shopping_list_items").update({ erledigt }).eq("id", itemId);
  if (error) throw error;
}

/** Rezept samt seinen Zutaten von der Liste nehmen (Zutaten werden per "on delete cascade" mitgelöscht). */
export async function removeRecipeFromShoppingList(listRecipeId) {
  const { error } = await supabase.from("shopping_list_recipes").delete().eq("id", listRecipeId);
  if (error) throw error;
}

// Gleiche Zutat, gleiche Einheit, und entweder beide mit oder beide ohne Mengenangabe.
function isSameEntry(a, b) {
  return (
    a.ingredient_id === b.ingredient_id &&
    (a.einheit || "") === (b.einheit || "") &&
    (a.menge == null) === (b.menge == null)
  );
}

function mergeSameIngredients(items) {
  const merged = [];
  for (const item of items) {
    const same = merged.find((m) => isSameEntry(m, item));
    if (!same) merged.push({ ...item });
    else if (same.menge != null) same.menge = round2(same.menge + item.menge);
  }
  return merged;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
