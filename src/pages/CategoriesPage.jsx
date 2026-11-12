import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { renameEntity, deleteEntity, deleteConfirmText } from "../lib/entityActions.js";
import CategoryCard from "../components/CategoryCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const [view, setView] = useState("cards");

  async function load() {
    setLoading(true);
    const { data: categoryRows } = await supabase
      .from("categories")
      .select("id, name")
      .order("created_at", { ascending: false });
    const { data: recipeRows } = await supabase.from("recipes").select("category_id");

    const counts = {};
    (recipeRows || []).forEach((r) => {
      if (!r.category_id) return;
      counts[r.category_id] = (counts[r.category_id] || 0) + 1;
    });

    setCategories((categoryRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(name) {
    await supabase.from("categories").insert({ name });
    await load();
  }

  async function handleRename(item, newName) {
    try {
      await renameEntity("categories", item.id, newName);
    } catch (err) {
      alert("Umbenennen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  async function handleDelete(item) {
    if (!(await bestaetigen({ titel: "Kategorie löschen?", text: deleteConfirmText(item.name, item.count) }))) return;
    try {
      await deleteEntity("categories", item.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await load();
  }

  const filtered = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  if (openCategory) {
    return (
      <FilteredRecipesPage
        filterName={openCategory.name}
        filterType="category"
        filterId={openCategory.id}
        onBack={async () => {
          setOpenCategory(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Kategorien</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Kategorie suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateEntityButton label="+ Neue Kategorie" onCreate={handleCreate} />
        </div>
      </div>

      <div className="view-switcher-bar">
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {categories.length === 0 ? "Noch keine Kategorien angelegt." : "Keine Kategorien gefunden."}
        </p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {filtered.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              onClick={() => setOpenCategory(c)}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={filtered.map((c) => ({
            id: c.id,
            title: c.name,
            meta: `${c.count} Rezepte`,
            onClick: () => setOpenCategory(c),
          }))}
        />
      ) : (
        <SimpleTable
          columns={[
            { key: "name", label: "Name", width: 400 },
            { key: "count", label: "Anzahl Rezepte", width: 200 },
          ]}
          rows={filtered.map((c) => ({
            id: c.id,
            name: c.name,
            count: c.count,
            onClick: () => setOpenCategory(c),
          }))}
        />
      )}
    </div>
  );
}
