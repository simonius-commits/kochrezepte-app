import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import IngredientCategoryCard from "../components/IngredientCategoryCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";

export default function IngredientCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");

  async function load() {
    setLoading(true);
    const [{ data: categoryRows }, { data: ingredientRows }] = await Promise.all([
      supabase.from("ingredient_categories").select("id, name").order("name", { ascending: true }),
      supabase.from("ingredients").select("category_id"),
    ]);

    const counts = {};
    (ingredientRows || []).forEach((i) => {
      if (!i.category_id) return;
      counts[i.category_id] = (counts[i.category_id] || 0) + 1;
    });

    setCategories((categoryRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(name) {
    const { error } = await supabase.from("ingredient_categories").insert({ name });
    if (error) {
      alert("Anlegen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleRename(category, newName) {
    const { error } = await supabase
      .from("ingredient_categories")
      .update({ name: newName })
      .eq("id", category.id);
    if (error) {
      alert("Umbenennen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleDelete(category) {
    if (category.count > 0) return; // Button ist in diesem Fall ohnehin deaktiviert
    if (!(await bestaetigen({ titel: "Zutaten-Kategorie löschen?", text: `„${category.name}“ wird gelöscht.` }))) return;
    const { error } = await supabase.from("ingredient_categories").delete().eq("id", category.id);
    if (error) {
      alert("Löschen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Zutaten-Kategorien</h1>
        <CreateEntityButton label="+ Neue Kategorie" onCreate={handleCreate} />
      </div>

      <div className="view-switcher-bar">
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : categories.length === 0 ? (
        <p className="empty-state">Noch keine Kategorien angelegt.</p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {categories.map((c) => (
            <IngredientCategoryCard key={c.id} category={c} onRename={handleRename} onDelete={handleDelete} />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={categories.map((c) => ({
            id: c.id,
            title: c.name,
            meta: `${c.count} Zutaten`,
          }))}
        />
      ) : (
        <SimpleTable
          columns={[
            { key: "name", label: "Name", width: 400 },
            { key: "count", label: "Anzahl Zutaten", width: 200 },
          ]}
          rows={categories.map((c) => ({
            id: c.id,
            name: c.name,
            count: c.count,
          }))}
        />
      )}
    </div>
  );
}
