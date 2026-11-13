import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import IngredientCategoryCard from "../components/IngredientCategoryCard.jsx";
import CreateEntityButton from "../components/CreateEntityButton.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";
import { useGemerkteAnsicht } from "../lib/gemerkteAnsicht.js";
import SortSelect from "../components/SortSelect.jsx";
import { LISTEN_SORTIERUNGEN, keys, sortiereListe } from "../lib/sortierung.js";
import { ladeAlle, zaehleAlle } from "../lib/ladeAlle.js";

export default function IngredientCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  // Ansicht (Cards | Liste | Tabelle) wird dauerhaft gemerkt, bis man sie wechselt
  const [view, setView] = useGemerkteAnsicht("ansicht:zutaten-kategorien", "cards", ["cards", "list", "table"]);
  // Sortierung wird dauerhaft gemerkt, bis man sie wechselt
  const [sort, setSort] = useGemerkteAnsicht("sortierung:zutaten-kategorien", "az", keys(LISTEN_SORTIERUNGEN));
  const sortiert = useMemo(() => sortiereListe(categories, sort), [categories, sort]);

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    // Alle Zutaten zählen (seitenweise, Supabase liefert sonst nur 1000 Zeilen)
    const [{ data: categoryRows }, counts] = await Promise.all([
      supabase.from("ingredient_categories").select("id, name, created_at").order("name", { ascending: true }),
      zaehleAlle("ingredients", "category_id", ["id"]),
    ]);

    setCategories((categoryRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

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
        <div className="sort-view-group">
          <SortSelect value={sort} onChange={setSort} options={LISTEN_SORTIERUNGEN} />
          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>

      {loading ? (
        <p>Lädt …</p>
      ) : sortiert.length === 0 ? (
        <p className="empty-state">Noch keine Kategorien angelegt.</p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {sortiert.map((c) => (
            <IngredientCategoryCard key={c.id} category={c} onRename={handleRename} onDelete={handleDelete} />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={sortiert.map((c) => ({
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
          rows={sortiert.map((c) => ({
            id: c.id,
            name: c.name,
            count: c.count,
          }))}
        />
      )}
    </div>
  );
}
