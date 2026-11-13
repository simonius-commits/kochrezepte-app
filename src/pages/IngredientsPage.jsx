import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import IngredientCard from "../components/IngredientCard.jsx";
import CreateIngredientButton from "../components/CreateIngredientButton.jsx";
import MergeIngredientModal from "../components/MergeIngredientModal.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import CollapsibleGroupHeader from "../components/CollapsibleGroupHeader.jsx";
import FilteredRecipesPage from "./FilteredRecipesPage.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";
import { useGemerkteAnsicht } from "../lib/gemerkteAnsicht.js";
import SortSelect from "../components/SortSelect.jsx";
import { LISTEN_SORTIERUNGEN, keys, sortiereListe } from "../lib/sortierung.js";
import { ladeAlle, zaehleAlle } from "../lib/ladeAlle.js";

const OHNE_KATEGORIE = "Ohne Kategorie";
const EXPANDED_STORAGE_KEY = "kochrezepte-zutaten-aufgeklappte-kategorien";

function loadExpandedFromStorage() {
  try {
    const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function IngredientsPage({ isAdmin }) {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openIngredient, setOpenIngredient] = useState(null);
  const [mergingIngredient, setMergingIngredient] = useState(null);
  // Ansicht (Cards | Liste | Tabelle) wird dauerhaft gemerkt, bis man sie wechselt
  const [view, setView] = useGemerkteAnsicht("ansicht:zutaten", "cards", ["cards", "list", "table"]);
  // Sortierung wird dauerhaft gemerkt, bis man sie wechselt
  const [sort, setSort] = useGemerkteAnsicht("sortierung:zutaten", "az", keys(LISTEN_SORTIERUNGEN));
  // Standardmäßig sind alle Kategorien eingeklappt (leeres Set = nichts aufgeklappt).
  // Einmal aufgeklappte Kategorien bleiben es auch nach einem Neuladen der Seite.
  const [expanded, setExpanded] = useState(loadExpandedFromStorage);

  function toggleExpanded(kategorie) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kategorie)) {
        next.delete(kategorie);
      } else {
        next.add(kategorie);
      }
      try {
        window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage kann fehlschlagen (z.B. Private Mode) — dann bleibt der Zustand nur
        // für die aktuelle Sitzung erhalten, kein Grund die App zu unterbrechen.
      }
      return next;
    });
  }

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    // Zutaten sind ein geteilter Pool (siehe Datenmodell) — die Liste zeigt daher alle,
    // aber die Rezept-Anzahl bezieht sich (durch Row Level Security) nur auf eigene Rezepte.
    // Alle Zeilen laden (seitenweise, Supabase liefert sonst nur 1000 Zeilen — seit dem
    // Mela-Import gibt es mehrere Tausend Zutaten und Zuordnungen)
    const [ingredientRows, counts, { data: categoryRows }] = await Promise.all([
      ladeAlle("ingredients", "id, name, created_at, category_id, ingredient_categories(name)"),
      zaehleAlle("recipe_ingredients", "ingredient_id", ["id"]),
      supabase.from("ingredient_categories").select("id, name").order("name", { ascending: true }),
    ]);

    setIngredients(
      (ingredientRows || []).map((i) => ({
        ...i,
        kategorieName: i.ingredient_categories?.name || null,
        count: counts[i.id] || 0,
      }))
    );
    setCategories(categoryRows || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useBeiRueckkehr(() => load({ still: true }));

  async function handleCreate(name, categoryId) {
    await supabase.from("ingredients").insert({ name, category_id: categoryId || null });
    await load();
  }

  async function handleRename(ingredient, newName) {
    const { error } = await supabase.from("ingredients").update({ name: newName }).eq("id", ingredient.id);
    if (error) {
      alert("Umbenennen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleDelete(ingredient) {
    if (ingredient.count > 0) return; // Button ist in diesem Fall ohnehin deaktiviert
    if (!(await bestaetigen({ titel: "Zutat löschen?", text: `„${ingredient.name}“ wird gelöscht.` }))) return;
    const { error } = await supabase.from("ingredients").delete().eq("id", ingredient.id);
    if (error) {
      alert("Löschen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  async function handleAssignCategory(ingredient, categoryId) {
    const { error } = await supabase
      .from("ingredients")
      .update({ category_id: categoryId })
      .eq("id", ingredient.id);
    if (error) {
      alert("Kategorie zuordnen fehlgeschlagen: " + error.message);
      return;
    }
    await load();
  }

  const filtered = useMemo(() => {
    // Normale Nutzer:innen sehen nur Zutaten, die in mindestens einem eigenen Rezept
    // verwendet werden. Admins sehen weiterhin den kompletten geteilten Pool.
    const visible = isAdmin ? ingredients : ingredients.filter((i) => i.count > 0);
    // Sortierung gilt innerhalb jeder Kategorie-Gruppe (Gruppierung behält die Reihenfolge)
    return sortiereListe(
      visible.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
      sort
    );
  }, [ingredients, search, isAdmin, sort]);

  // Nach Kategorie gruppieren, "Ohne Kategorie" kommt zuletzt. Gilt für Cards und Liste.
  const groups = useMemo(() => {
    const map = {};
    for (const ing of filtered) {
      const key = ing.kategorieName || OHNE_KATEGORIE;
      if (!map[key]) map[key] = [];
      map[key].push(ing);
    }
    const keys = Object.keys(map)
      .filter((k) => k !== OHNE_KATEGORIE)
      .sort((a, b) => a.localeCompare(b, "de"));
    if (map[OHNE_KATEGORIE]) keys.push(OHNE_KATEGORIE);
    return keys.map((key) => ({ kategorie: key, items: map[key] }));
  }, [filtered]);

  if (openIngredient) {
    return (
      <FilteredRecipesPage
        filterName={openIngredient.name}
        filterType="ingredient"
        filterId={openIngredient.id}
        onBack={async () => {
          setOpenIngredient(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Zutaten</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Zutat suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateIngredientButton categories={categories} onCreate={handleCreate} />
        </div>
      </div>

      <div className="view-switcher-bar">
        <div className="sort-view-group">
          <SortSelect value={sort} onChange={setSort} options={LISTEN_SORTIERUNGEN} />
          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>

      {/* Vorschlagsliste für das Ziel-Feld im Zusammenführen-Dialog */}
      <datalist id="ingredient-merge-suggestions">
        {ingredients
          .filter((i) => i.id !== mergingIngredient?.id)
          .map((i) => (
            <option key={i.id} value={i.name} />
          ))}
      </datalist>

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {ingredients.length === 0
            ? "Noch keine Zutaten vorhanden."
            : !isAdmin && !search
            ? "Du verwendest noch keine Zutaten in deinen Rezepten."
            : "Keine Zutaten gefunden."}
        </p>
      ) : view === "cards" ? (
        groups.map((group) => (
          <div key={group.kategorie} className="ingredient-group">
            <CollapsibleGroupHeader
              title={group.kategorie}
              muted={group.kategorie === OHNE_KATEGORIE}
              collapsed={!expanded.has(group.kategorie)}
              onToggle={() => toggleExpanded(group.kategorie)}
            />
            {expanded.has(group.kategorie) && (
              <div className="recipe-grid">
                {group.items.map((i) => (
                  <IngredientCard
                    key={i.id}
                    ingredient={i}
                    categories={categories}
                    onClick={() => setOpenIngredient(i)}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onMergeRequest={setMergingIngredient}
                    onAssignCategory={handleAssignCategory}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      ) : view === "list" ? (
        // Liste bleibt wie Cards nach Kategorie gruppiert.
        groups.map((group) => (
          <div key={group.kategorie} className="ingredient-group">
            <CollapsibleGroupHeader
              title={group.kategorie}
              muted={group.kategorie === OHNE_KATEGORIE}
              collapsed={!expanded.has(group.kategorie)}
              onToggle={() => toggleExpanded(group.kategorie)}
            />
            {expanded.has(group.kategorie) && (
              <SimpleList
                items={group.items.map((i) => ({
                  id: i.id,
                  title: i.name,
                  meta: `${i.count} Rezepte`,
                  onClick: () => setOpenIngredient(i),
                }))}
              />
            )}
          </div>
        ))
      ) : (
        // Tabelle ist bewusst NICHT gruppiert — Kategorie ist hier eine eigene Spalte.
        <SimpleTable
          columns={[
            { key: "name", label: "Name", width: 280 },
            { key: "kategorie", label: "Kategorie", width: 220 },
            { key: "count", label: "Anzahl Rezepte", width: 160 },
          ]}
          rows={filtered.map((i) => ({
            id: i.id,
            name: i.name,
            kategorie: i.kategorieName || "–",
            count: i.count,
            onClick: () => setOpenIngredient(i),
          }))}
        />
      )}

      {mergingIngredient && (
        <MergeIngredientModal
          ingredient={mergingIngredient}
          onClose={() => setMergingIngredient(null)}
          onMerged={async () => {
            setMergingIngredient(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
