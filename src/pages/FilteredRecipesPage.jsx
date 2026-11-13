import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import RecipeCard from "../components/RecipeCard.jsx";
import { duplicateRecipe, deleteRecipe } from "../lib/recipeActions.js";
import RecipeDetail from "./RecipeDetail.jsx";
import NewRecipeForm from "./NewRecipeForm.jsx";
import { bestaetigen } from "../lib/bestaetigen.js";
import { useBeiRueckkehr } from "../lib/seitenAktivierung.js";

function mapRecipe(r) {
  return {
    ...r,
    kategorie: r.categories?.name || null,
    tags: (r.recipe_tags || []).map((t) => t.tags?.name).filter(Boolean),
  };
}

const SELECT = "*, recipe_tags(tags(name)), categories(name)";

const TITLE_PREFIX = {
  collection: "Rezepte in Sammlung: ",
  tag: "Rezepte mit Tag: ",
  cookbook: "Rezepte aus Kochbuch: ",
  category: "Rezepte in Kategorie: ",
  ingredient: "Rezepte mit Zutat: ",
  tool: "Rezepte mit Hilfsmittel: ",
};

async function fetchByFilter(filterType, filterId) {
  if (filterType === "collection") {
    const { data } = await supabase
      .from("recipe_collections")
      .select(`recipes(${SELECT})`)
      .eq("collection_id", filterId);
    return (data || []).map((r) => r.recipes).filter(Boolean);
  }
  if (filterType === "tag") {
    const { data } = await supabase
      .from("recipe_tags")
      .select(`recipes(${SELECT})`)
      .eq("tag_id", filterId);
    return (data || []).map((r) => r.recipes).filter(Boolean);
  }
  if (filterType === "ingredient") {
    const { data } = await supabase
      .from("recipe_ingredients")
      .select(`recipes(${SELECT})`)
      .eq("ingredient_id", filterId);
    return (data || []).map((r) => r.recipes).filter(Boolean);
  }
  if (filterType === "tool") {
    const { data } = await supabase
      .from("recipe_tools")
      .select(`recipes(${SELECT})`)
      .eq("tool_id", filterId);
    return (data || []).map((r) => r.recipes).filter(Boolean);
  }
  if (filterType === "cookbook") {
    const { data } = await supabase.from("recipes").select(SELECT).eq("cookbook_id", filterId);
    return data || [];
  }
  if (filterType === "category") {
    const { data } = await supabase.from("recipes").select(SELECT).eq("category_id", filterId);
    return data || [];
  }
  return [];
}

// filterType: "collection" | "tag" | "cookbook" | "ingredient" | "category"
export default function FilteredRecipesPage({ filterType, filterId, filterName, onBack }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  // Für die "Zutat bearbeiten"-Sektion (nur bei filterType === "ingredient")
  const [displayName, setDisplayName] = useState(filterName);
  const [editName, setEditName] = useState(filterName);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [ingredientCategories, setIngredientCategories] = useState([]);
  const [savingIngredient, setSavingIngredient] = useState(false);
  const [ingredientError, setIngredientError] = useState(null);
  const [ingredientSaved, setIngredientSaved] = useState(false);

  // still = beim Zurückkehren neu laden, ohne „Lädt …“ (siehe seitenAktivierung.js)
  async function load({ still = false } = {}) {
    if (!still) setLoading(true);
    const rows = await fetchByFilter(filterType, filterId);
    setRecipes(rows.map(mapRecipe));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterType, filterId]);
  useBeiRueckkehr(() => load({ still: true }));

  // Kopie anlegen und direkt im Bearbeiten-Formular öffnen.
  async function handleDuplicate(recipe) {
    try {
      const newId = await duplicateRecipe(recipe.id);
      await load();
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
    await load();
  }

  useEffect(() => {
    if (filterType !== "ingredient") return;

    async function loadIngredientEditData() {
      const [{ data: ingredientRow }, { data: categoryRows }] = await Promise.all([
        supabase.from("ingredients").select("id, name, category_id").eq("id", filterId).single(),
        supabase.from("ingredient_categories").select("id, name").order("name", { ascending: true }),
      ]);
      if (ingredientRow) {
        setEditName(ingredientRow.name);
        setEditCategoryId(ingredientRow.category_id || "");
        setDisplayName(ingredientRow.name);
      }
      setIngredientCategories(categoryRows || []);
    }
    loadIngredientEditData();
  }, [filterType, filterId]);

  async function handleSaveIngredient() {
    if (!editName.trim()) {
      setIngredientError("Bitte einen Namen eingeben.");
      return;
    }
    setSavingIngredient(true);
    setIngredientError(null);
    setIngredientSaved(false);
    const { error } = await supabase
      .from("ingredients")
      .update({ name: editName.trim(), category_id: editCategoryId || null })
      .eq("id", filterId);
    setSavingIngredient(false);
    if (error) {
      setIngredientError(error.message);
      return;
    }
    setDisplayName(editName.trim());
    setIngredientSaved(true);
    setTimeout(() => setIngredientSaved(false), 2500);
  }

  const title = `${TITLE_PREFIX[filterType] || ""}${displayName}`;

  const filtered = useMemo(
    () => recipes.filter((r) => r.titel.toLowerCase().includes(search.toLowerCase())),
    [recipes, search]
  );

  if (editingRecipeId) {
    return (
      <NewRecipeForm
        editRecipeId={editingRecipeId}
        onCancel={() => setEditingRecipeId(null)}
        onSaved={async () => {
          setEditingRecipeId(null);
          await load();
        }}
      />
    );
  }

  if (selectedRecipeId) {
    return (
      <RecipeDetail
        recipeId={selectedRecipeId}
        onBack={() => setSelectedRecipeId(null)}
        onEdit={(id) => setEditingRecipeId(id)}
        onDeleted={async () => {
          setSelectedRecipeId(null);
          await load();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <div className="title-group">
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            ← Zurück
          </button>
          <h1>{title}</h1>
        </div>
        <div className="input-group">
          <input
            className="input-field"
            type="text"
            placeholder="Rezept suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filterType === "ingredient" && (
        <div className="form-section">
          <h2 className="form-section-title">Zutat bearbeiten</h2>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="edit-ingredient-name">Name</label>
              <input
                id="edit-ingredient-name"
                className="input-field"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-ingredient-category">Kategorie</label>
              <select
                id="edit-ingredient-category"
                className="input-field"
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
              >
                <option value="">Keine Kategorie</option>
                {ingredientCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveIngredient}
              disabled={savingIngredient}
            >
              {savingIngredient ? "Speichert …" : "Speichern"}
            </button>
          </div>
          {ingredientError && <p className="input-helper-error">{ingredientError}</p>}
          {ingredientSaved && <p className="field-success">Gespeichert.</p>}
        </div>
      )}

      {loading ? (
        <p>Lädt …</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {recipes.length === 0 ? "Keine Rezepte gefunden." : "Keine Treffer für diese Suche."}
        </p>
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipeId(recipe.id)}
              onEdit={(r) => setEditingRecipeId(r.id)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
