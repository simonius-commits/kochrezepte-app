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
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";
import { useGemerkteAnsicht } from "../lib/gemerkteAnsicht.js";
import SortSelect from "../components/SortSelect.jsx";
import { LISTEN_SORTIERUNGEN, keys, sortiereListe } from "../lib/sortierung.js";
import { ladeAlle, zaehleAlle } from "../lib/ladeAlle.js";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  // Ansicht (Cards | Liste | Tabelle) wird dauerhaft gemerkt, bis man sie wechselt
  const [view, setView] = useGemerkteAnsicht("ansicht:kategorien", "cards", ["cards", "list", "table"]);
  // Sortierung wird dauerhaft gemerkt, bis man sie wechselt
  const [sort, setSort] = useGemerkteAnsicht("sortierung:kategorien", "neueste", keys(LISTEN_SORTIERUNGEN));

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    const { data: categoryRows } = await supabase
      .from("categories")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    // Alle Rezepte zählen (seitenweise, Supabase liefert sonst nur 1000 Zeilen)
    const counts = await zaehleAlle("recipes", "category_id", ["id"]);

    setCategories((categoryRows || []).map((c) => ({ ...c, count: counts[c.id] || 0 })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

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
    () => sortiereListe(categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())), sort),
    [categories, search, sort]
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
        <div className="sort-view-group">
          <SortSelect value={sort} onChange={setSort} options={LISTEN_SORTIERUNGEN} />
          <ViewSwitcher view={view} onChange={setView} />
        </div>
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
