import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import Tag from "../components/Tag.jsx";
import CookMode from "../components/CookMode.jsx";
import { getDomain, toAbsoluteUrl } from "../lib/getDomain.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default function RecipeDetail({ recipeId, demoData, onBack, onEdit, onDeleted }) {
  const isDemo = Boolean(demoData);

  const [recipe, setRecipe] = useState(demoData || null);
  const [ingredients, setIngredients] = useState(demoData ? demoData.ingredients : []);
  const [steps, setSteps] = useState(demoData ? demoData.steps : []);
  const [tags, setTags] = useState(demoData ? demoData.tags : []);
  const [hilfsmittel, setHilfsmittel] = useState(demoData ? demoData.hilfsmittel || [] : []);
  const [sammlungen, setSammlungen] = useState(demoData ? demoData.sammlungen || [] : []);
  const [portionen, setPortionen] = useState(demoData ? demoData.portionen_standard : 4);
  const [loading, setLoading] = useState(!demoData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCookMode, setShowCookMode] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemo) return;

    async function load() {
      setLoading(true);
      const [
        { data: recipeRow },
        { data: ingredientRows },
        { data: stepRows },
        { data: tagRows },
        { data: toolRows },
        { data: collectionRows },
      ] = await Promise.all([
        supabase
          .from("recipes")
          .select("*, authors(name), cookbooks(name), categories(name)")
          .eq("id", recipeId)
          .single(),
        supabase
          .from("recipe_ingredients")
          .select("id, menge, einheit, notiz, ingredients(name)")
          .eq("recipe_id", recipeId),
        supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", recipeId)
          .order("reihenfolge", { ascending: true }),
        supabase.from("recipe_tags").select("tags(name)").eq("recipe_id", recipeId),
        supabase.from("recipe_tools").select("tools(name)").eq("recipe_id", recipeId),
        supabase.from("recipe_collections").select("collections(name)").eq("recipe_id", recipeId),
      ]);

      setRecipe(recipeRow || null);
      setIngredients(ingredientRows || []);
      setSteps((stepRows || []).map((s) => s.text));
      setTags((tagRows || []).map((t) => t.tags?.name).filter(Boolean));
      setHilfsmittel((toolRows || []).map((t) => t.tools?.name).filter(Boolean));
      setSammlungen((collectionRows || []).map((c) => c.collections?.name).filter(Boolean));
      setPortionen(recipeRow ? recipeRow.portionen_standard : 4);
      setLoading(false);
    }
    load();
  }, [recipeId, isDemo]);

  const basisPortionen = recipe?.portionen_standard || 1;
  const factor = basisPortionen ? portionen / basisPortionen : 1;
  const isDirty = recipe && portionen !== recipe.portionen_standard;

  async function handleSaveScaling() {
    if (isDemo || !recipe) return;
    setSaving(true);
    setError(null);
    try {
      // Jede Zutatenmenge im gleichen Verhältnis aktualisieren wie die Portionenzahl.
      for (const ing of ingredients) {
        if (ing.menge == null) continue;
        const scaled = round2(ing.menge * factor);
        const { error: updateError } = await supabase
          .from("recipe_ingredients")
          .update({ menge: scaled })
          .eq("id", ing.id);
        if (updateError) throw updateError;
      }

      const { error: recipeError } = await supabase
        .from("recipes")
        .update({ portionen_standard: portionen })
        .eq("id", recipeId);
      if (recipeError) throw recipeError;

      // Neue, jetzt gültige Basiswerte nachladen (Zutaten sind jetzt der neue Ausgangspunkt).
      const { data: refreshed } = await supabase
        .from("recipe_ingredients")
        .select("id, menge, einheit, notiz, ingredients(name)")
        .eq("recipe_id", recipeId);
      setIngredients(refreshed || []);
      setRecipe((r) => ({ ...r, portionen_standard: portionen }));
    } catch (err) {
      setError(err.message || "Speichern der Portionen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isDemo) return;
    if (!window.confirm(`"${recipe.titel}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setDeleting(true);
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", recipeId);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted();
  }

  if (loading) return <div className="screen">Lädt …</div>;
  if (!recipe) return <div className="screen">Rezept nicht gefunden.</div>;

  const gesamtzeit = (recipe.zubereitungszeit_min || 0) + (recipe.kochzeit_min || 0);
  const categoryName = recipe.categories?.name;
  const metaParts = [categoryName, recipe.schwierigkeit, gesamtzeit ? `${gesamtzeit} Min` : null].filter(
    Boolean
  );
  const autorName = recipe.authors?.name;
  const kochbuchName = recipe.cookbooks?.name;
  const sourceParts = [
    autorName ? `von ${autorName}` : null,
    kochbuchName ? `aus „${kochbuchName}“` : null,
  ].filter(Boolean);
  const quelleDomain = getDomain(recipe.quelle);

  return (
    <div className="screen">
      <div className="header">
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          ← Zurück
        </button>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => onEdit(recipeId)}
            disabled={isDemo}
          >
            Bearbeiten
          </button>
          <button
            className="btn btn-ghost detail-delete"
            type="button"
            onClick={handleDelete}
            disabled={isDemo || deleting}
          >
            {deleting ? "Löscht …" : "Löschen"}
          </button>
        </div>
      </div>

      {error && <p className="input-helper-error form-error">{error}</p>}

      {recipe.bild_url ? (
        <img className="detail-hero" src={recipe.bild_url} alt={recipe.titel} />
      ) : (
        <div className="detail-hero" />
      )}

      <div className="detail-title-block">
        <h1>{recipe.titel}</h1>
        {metaParts.length > 0 && <p className="detail-meta">{metaParts.join("  ·  ")}</p>}
        {sourceParts.length > 0 && <p className="detail-source-info">{sourceParts.join("  ·  ")}</p>}
        {quelleDomain && (
          <p className="detail-source-link">
            Quelle:{" "}
            {/* Öffnet die Original-Webseite in einem neuen Tab. "noopener noreferrer" verhindert,
                dass die fremde Seite Zugriff auf unseren Tab bekommt. */}
            <a href={toAbsoluteUrl(recipe.quelle)} target="_blank" rel="noopener noreferrer">
              {quelleDomain} ↗
            </a>
          </p>
        )}
      </div>

      <div className="portionen-stepper">
        <div className="portionen-stepper-left">
          <span className="stepper-label">Portionen</span>
          <div className="stepper-controls">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setPortionen((p) => Math.max(1, p - 1))}
            >
              –
            </button>
            <span className="stepper-value">{portionen}</span>
            <button type="button" className="stepper-btn" onClick={() => setPortionen((p) => p + 1)}>
              +
            </button>
          </div>
        </div>
        <div className="portionen-stepper-right">
          {isDirty && !isDemo && (
            <button
              className="btn btn-primary btn-small"
              type="button"
              onClick={handleSaveScaling}
              disabled={saving}
            >
              {saving ? "Speichert …" : "Änderungen speichern"}
            </button>
          )}
          {isDirty && isDemo && (
            <span className="field-hint">Demo-Rezept — Änderungen werden nicht gespeichert.</span>
          )}
          <button
            type="button"
            className="btn btn-primary cook-mode-start-button"
            onClick={() => setShowCookMode(true)}
          >
            Dieses Rezept zubereiten
          </button>
        </div>
      </div>

      {showCookMode && (
        <CookMode
          recipeTitel={recipe.titel}
          steps={steps}
          ingredients={ingredients.map((ing) => ({
            id: ing.id,
            name: ing.ingredients?.name || ing.name,
            einheit: ing.einheit,
            menge: ing.menge != null ? round2(ing.menge * factor) : null,
          }))}
          toolNames={hilfsmittel}
          onExit={() => setShowCookMode(false)}
        />
      )}

      <div className="form-section">
        <h2 className="form-section-title">Zutaten (für {portionen} Portionen)</h2>
        <div className="detail-ingredient-list">
          {ingredients.map((ing) => {
            const name = ing.ingredients?.name || ing.name;
            const scaled = ing.menge != null ? round2(ing.menge * factor) : null;
            return (
              <div className="detail-ingredient-row" key={ing.id}>
                <span className="ingredient-dot" />
                {scaled != null && (
                  <strong>
                    {scaled}
                    {ing.einheit ? ` ${ing.einheit}` : ""}
                  </strong>
                )}
                <span>
                  {name}
                  {ing.notiz && <span className="detail-ingredient-notiz">, {ing.notiz}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Zubereitung</h2>
        <div className="detail-step-list">
          {steps.map((text, i) => (
            <div className="detail-step-row" key={i}>
              <span className="step-number">{i + 1}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Einordnung</h2>

        {categoryName && (
          <div className="detail-field">
            <span className="detail-field-label">Kategorie</span>
            <div className="tags-row">
              <Tag label={categoryName} />
            </div>
          </div>
        )}

        {recipe.schwierigkeit && (
          <div className="detail-field">
            <span className="detail-field-label">Schwierigkeit</span>
            <div className="tags-row">
              <Tag label={recipe.schwierigkeit} />
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="detail-field">
            <span className="detail-field-label">Tags</span>
            <div className="tags-row">
              {tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          </div>
        )}

        {hilfsmittel.length > 0 && (
          <div className="detail-field">
            <span className="detail-field-label">Hilfsmittel</span>
            <div className="tags-row">
              {hilfsmittel.map((h) => (
                <Tag key={h} label={h} />
              ))}
            </div>
          </div>
        )}

        {sammlungen.length > 0 && (
          <div className="detail-field">
            <span className="detail-field-label">Sammlung</span>
            <div className="tags-row">
              {sammlungen.map((s) => (
                <Tag key={s} label={s} />
              ))}
            </div>
          </div>
        )}

        {kochbuchName && (
          <div className="detail-field">
            <span className="detail-field-label">Kochbuch</span>
            <div className="tags-row">
              <Tag label={kochbuchName} />
            </div>
          </div>
        )}

        {autorName && (
          <div className="detail-field">
            <span className="detail-field-label">Koch/Köchin/Autor:in</span>
            <div className="tags-row">
              <Tag label={autorName} />
            </div>
          </div>
        )}
      </div>

      {(recipe.kalorien_kcal != null ||
        recipe.eiweiss_g != null ||
        recipe.fett_g != null ||
        recipe.kohlenhydrate_g != null ||
        recipe.ballaststoffe_g != null ||
        recipe.zucker_g != null) && (
        <div className="form-section">
          <h2 className="form-section-title">Nährwerte (pro Portion)</h2>
          <div className="naehrwerte-grid">
            {recipe.kalorien_kcal != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Kalorien</span>
                <span className="naehrwerte-stat-value">{recipe.kalorien_kcal} kcal</span>
              </div>
            )}
            {recipe.eiweiss_g != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Eiweiß</span>
                <span className="naehrwerte-stat-value">{recipe.eiweiss_g} g</span>
              </div>
            )}
            {recipe.fett_g != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Fett</span>
                <span className="naehrwerte-stat-value">{recipe.fett_g} g</span>
              </div>
            )}
            {recipe.kohlenhydrate_g != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Kohlenhydrate</span>
                <span className="naehrwerte-stat-value">{recipe.kohlenhydrate_g} g</span>
              </div>
            )}
            {recipe.ballaststoffe_g != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Ballaststoffe</span>
                <span className="naehrwerte-stat-value">{recipe.ballaststoffe_g} g</span>
              </div>
            )}
            {recipe.zucker_g != null && (
              <div className="naehrwerte-stat">
                <span className="naehrwerte-stat-label">Zucker</span>
                <span className="naehrwerte-stat-value">{recipe.zucker_g} g</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
