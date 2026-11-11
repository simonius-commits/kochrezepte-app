import { supabase } from "./supabaseClient.js";

// Umbenennen und Löschen für Kochbücher, Sammlungen, Kategorien und Tags (Card-Menü "…").

export async function renameEntity(table, id, name) {
  const { error } = await supabase.from(table).update({ name }).eq("id", id);
  if (error) throw error;
}

// Rezepte verweisen direkt auf ihr Kochbuch bzw. ihre Kategorie (Spalte cookbook_id /
// category_id). Die Datenbank würde das Löschen sonst verweigern, solange noch ein Rezept darauf
// zeigt — deshalb lösen wir die Zuordnung vorher. Die Rezepte selbst bleiben erhalten.
// Bei Sammlungen und Tags passiert das automatisch (Verknüpfungstabellen mit "on delete cascade").
const RECIPE_COLUMN = {
  cookbooks: "cookbook_id",
  categories: "category_id",
};

export async function deleteEntity(table, id) {
  const column = RECIPE_COLUMN[table];
  if (column) {
    const { error: unlinkError } = await supabase
      .from("recipes")
      .update({ [column]: null })
      .eq(column, id);
    if (unlinkError) throw unlinkError;
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// Text für die Sicherheitsabfrage — erklärt, dass die Rezepte nicht mitgelöscht werden.
export function deleteConfirmText(name, count) {
  if (!count) return `„${name}" wirklich löschen?`;
  const zugeordnet = count === 1 ? "1 Rezept ist" : `${count} Rezepte sind`;
  return `„${name}" wirklich löschen?\n\n${zugeordnet} zugeordnet. Die Rezepte bleiben erhalten, nur die Zuordnung wird entfernt.`;
}
