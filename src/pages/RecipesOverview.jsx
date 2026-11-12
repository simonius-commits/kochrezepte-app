import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import RecipeCard from "../components/RecipeCard.jsx";
import { duplicateRecipe, deleteRecipe } from "../lib/recipeActions.js";
import Tag from "../components/Tag.jsx";
import ViewSwitcher from "../components/ViewSwitcher.jsx";
import SimpleList from "../components/SimpleList.jsx";
import SimpleTable from "../components/SimpleTable.jsx";
import NewRecipeForm from "./NewRecipeForm.jsx";
import RecipeDetail from "./RecipeDetail.jsx";
import { DEMO_RECIPE_DETAILS } from "../lib/demoRecipeDetails.js";
import { bestaetigen } from "../lib/bestaetigen.js";

// Demo-Daten — werden nur angezeigt, solange die Supabase-Tabelle "recipes" leer ist.
// So kannst du die App sofort sehen, bevor Supabase eingerichtet ist.
const DEMO_RECIPES = [
  {
    id: "demo-1",
    titel: "Pasta Carbonara",
    kategorie: "Hauptgericht",
    zubereitungszeit_min: 10,
    kochzeit_min: 15,
    bild_url: null,
    tags: ["vegetarisch", "schnell"],
  },
  {
    id: "demo-2",
    titel: "Griechischer Salat",
    kategorie: "Beilage",
    zubereitungszeit_min: 15,
    kochzeit_min: 0,
    bild_url: null,
    tags: ["vegan", "schnell"],
  },
  {
    id: "demo-3",
    titel: "Linsen-Curry",
    kategorie: "Hauptgericht",
    zubereitungszeit_min: 10,
    kochzeit_min: 25,
    bild_url: null,
    tags: ["vegan"],
  },
];

export default function RecipesOverview() {
  const [recipes, setRecipes] = useState(DEMO_RECIPES);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [view, setView] = useState("cards");

  async function loadRecipes() {
    if (!isSupabaseConfigured) {
      // Noch keine .env angelegt — bewusst im Demo-Modus bleiben, kein Fetch-Versuch.
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*, recipe_tags(tags(name)), categories(name)")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((r) => ({
        ...r,
        kategorie: r.categories?.name || null,
        tags: (r.recipe_tags || []).map((t) => t.tags?.name).filter(Boolean),
      }));
      setRecipes(mapped);
      setUsingDemoData(false);
    }
    // Bei Fehler oder leerer Tabelle: Demo-Daten bleiben sichtbar.
    setLoading(false);
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  // Kopie anlegen und direkt im Bearbeiten-Formular öffnen.
  async function handleDuplicate(recipe) {
    try {
      const newId = await duplicateRecipe(recipe.id);
      await loadRecipes();
      setEditingRecipeId(newId);
    } catch (err) {
      alert("Duplizieren fehlgeschlagen: " + err.message);
    }
  }

  async function handleDelete(recipe) {
    if (!(await bestaetigen({ titel: "Rezept löschen?", text: `„${recipe.titel}“ wird gelöscht. Das kann nicht rückgängig gemacht werden.` }))) return;
    try {
      await deleteRecipe(recipe.id);
    } catch (err) {
      alert("Löschen fehlgeschlagen: " + err.message);
    }
    await loadRecipes();
  }

  const filterOptions = useMemo(() => {
    const distinctKategorien = [...new Set(recipes.map((r) => r.kategorie).filter(Boolean))];
    return ["Alle", ...distinctKategorien];
  }, [recipes]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesFilter = activeFilter === "Alle" || r.kategorie === activeFilter;
      const matchesSearch = r.titel.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [recipes, activeFilter, search]);

  if (editingRecipeId) {
    return (
      <NewRecipeForm
        editRecipeId={editingRecipeId}
        onCancel={() => setEditingRecipeId(null)}
        onSaved={async () => {
          setEditingRecipeId(null);
          setLoading(true);
          await loadRecipes();
        }}
      />
    );
  }

  if (selectedRecipeId) {
    return (
      <RecipeDetail
        recipeId={selectedRecipeId}
        demoData={usingDemoData ? DEMO_RECIPE_DETAILS[selectedRecipeId] : null}
        onBack={() => setSelectedRecipeId(null)}
        onEdit={(id) => setEditingRecipeId(id)}
        onDeleted={async () => {
          setSelectedRecipeId(null);
          setLoading(true);
          await loadRecipes();
        }}
      />
    );
  }

  if (showForm) {
    return (
      <NewRecipeForm
        onCancel={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          setLoading(true);
          await loadRecipes();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Meine Rezepte</h1>
        <div className="header-actions">
          <div className="input-group">
            <input
              className="input-field"
              type="text"
              placeholder="Rezept suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}>
            + Neues Rezept
          </button>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-row-tags">
          {filterOptions.map((f) => (
            <Tag
              key={f}
              label={f}
              selected={f === activeFilter}
              onClick={() => setActiveFilter(f)}
            />
          ))}
        </div>
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {usingDemoData && !loading && (
        <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, marginTop: -8 }}>
          Zeige Demo-Rezepte — sobald Supabase eingerichtet ist und Rezepte enthält,
          erscheinen automatisch deine echten Daten.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="empty-state">Keine Rezepte gefunden.</p>
      ) : view === "cards" ? (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipeId(recipe.id)}
              // Demo-Rezepte liegen nicht in der Datenbank — dort gibt es kein "…"-Menü.
              {...(usingDemoData
                ? {}
                : {
                    onEdit: (r) => setEditingRecipeId(r.id),
                    onDuplicate: handleDuplicate,
                    onDelete: handleDelete,
                  })}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <SimpleList
          items={filtered.map((r) => {
            const gesamtzeit = (r.zubereitungszeit_min || 0) + (r.kochzeit_min || 0);
            return {
              id: r.id,
              title: r.titel,
              meta: [r.kategorie, gesamtzeit ? `${gesamtzeit} Min` : null].filter(Boolean).join(" · "),
              thumbnail: r.bild_url ? (
                <img className="simple-list-thumb" src={r.bild_url} alt="" />
              ) : (
                <div className="simple-list-thumb simple-list-thumb-placeholder" />
              ),
              extra: (
                <span className="simple-list-tags">
                  {(r.tags || []).map((t) => (
                    <Tag key={t} label={t} />
                  ))}
                </span>
              ),
              onClick: () => setSelectedRecipeId(r.id),
            };
          })}
        />
      ) : (
        <SimpleTable
          columns={[
            { key: "titel", label: "Titel", width: 260 },
            { key: "kategorie", label: "Kategorie", width: 160 },
            { key: "zeit", label: "Zeit", width: 100 },
            { key: "schwierigkeit", label: "Schwierigkeit", width: 140 },
            { key: "tags", label: "Tags", width: 220 },
          ]}
          rows={filtered.map((r) => {
            const gesamtzeit = (r.zubereitungszeit_min || 0) + (r.kochzeit_min || 0);
            return {
              id: r.id,
              titel: r.titel,
              kategorie: r.kategorie || "–",
              zeit: gesamtzeit ? `${gesamtzeit} Min` : "–",
              schwierigkeit: r.schwierigkeit || "–",
              tags: (r.tags || []).join(", ") || "–",
              onClick: () => setSelectedRecipeId(r.id),
            };
          })}
        />
      )}
    </div>
  );
}
