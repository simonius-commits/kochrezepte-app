import { useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import Tag from "../components/Tag.jsx";
import CookMode from "../components/CookMode.jsx";
import ShoppingListModal from "../components/ShoppingListModal.jsx";
import { getDomain, toAbsoluteUrl } from "../lib/getDomain.js";
import { bestaetigen } from "../lib/bestaetigen.js";
import { SeiteAktivContext } from "../lib/seitenAktivierung.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Zutaten in fester Reihenfolge laden (Gruppen wie „Für die Soße“ hängen davon ab)
const INGREDIENT_SELECT = "id, ingredient_id, menge, einheit, notiz, gruppe, reihenfolge, ingredients(name)";

/** 70 → "1 Std 10 Min", 45 → "45 Min" */
export function formatMinuten(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} Min`;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}

/** Zeilen mit Gruppen-Überschrift dazwischen: [{gruppe}, item, item, {gruppe}, item …] */
function withGroups(items) {
  const out = [];
  let current = null;
  for (const item of items) {
    const g = (item.gruppe || "").trim();
    if (g && g !== current) out.push({ isGroup: true, gruppe: g });
    current = g || current;
    out.push(item);
  }
  return out;
}

export default function RecipeDetail({ recipeId, demoData, onBack, onEdit, onDeleted }) {
  const isDemo = Boolean(demoData);

  const [recipe, setRecipe] = useState(demoData || null);
  const [ingredients, setIngredients] = useState(demoData ? demoData.ingredients : []);
  const [steps, setSteps] = useState(demoData ? demoData.steps.map((text) => ({ text })) : []);
  const [images, setImages] = useState(demoData?.bild_url ? [{ id: "demo", url: demoData.bild_url }] : []);
  const [activeImage, setActiveImage] = useState(0);
  const [tags, setTags] = useState(demoData ? demoData.tags : []);
  const [hilfsmittel, setHilfsmittel] = useState(demoData ? demoData.hilfsmittel || [] : []);
  const [sammlungen, setSammlungen] = useState(demoData ? demoData.sammlungen || [] : []);
  const [portionen, setPortionen] = useState(demoData ? demoData.portionen_standard : 4);
  const [loading, setLoading] = useState(!demoData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCookMode, setShowCookMode] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [error, setError] = useState(null);

  // Zählt hoch, wenn man zu diesem Bereich zurückkehrt → dann still neu laden (seitenAktivierung.js)
  const aktivierung = useContext(SeiteAktivContext);
  const geladenFuer = useRef(null);

  useEffect(() => {
    if (isDemo) return;

    async function load() {
      // „Lädt …“ nur beim ersten Laden eines Rezepts, nicht beim stillen Neuladen
      if (geladenFuer.current !== recipeId) setLoading(true);
      const [
        { data: recipeRow },
        { data: ingredientRows },
        { data: stepRows },
        { data: tagRows },
        { data: toolRows },
        { data: collectionRows },
        { data: imageRows },
      ] = await Promise.all([
        supabase
          .from("recipes")
          .select("*, authors(name), cookbooks(name), categories(name)")
          .eq("id", recipeId)
          .single(),
        supabase
          .from("recipe_ingredients")
          .select(INGREDIENT_SELECT)
          .eq("recipe_id", recipeId)
          .order("reihenfolge", { ascending: true, nullsFirst: false }),
        supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", recipeId)
          .order("reihenfolge", { ascending: true }),
        supabase.from("recipe_tags").select("tags(name)").eq("recipe_id", recipeId),
        supabase.from("recipe_tools").select("tools(name)").eq("recipe_id", recipeId),
        supabase.from("recipe_collections").select("collections(name)").eq("recipe_id", recipeId),
        supabase
          .from("recipe_images")
          .select("id, url, reihenfolge")
          .eq("recipe_id", recipeId)
          .order("reihenfolge", { ascending: true }),
      ]);

      setRecipe(recipeRow || null);
      setIngredients(ingredientRows || []);
      setSteps((stepRows || []).map((s) => ({ text: s.text, gruppe: s.gruppe })));
      // Ältere Rezepte ohne Eintrag in recipe_images: Titelbild aus bild_url zeigen
      const imgs = imageRows && imageRows.length > 0
        ? imageRows
        : recipeRow?.bild_url ? [{ id: "bild_url", url: recipeRow.bild_url }] : [];
      setImages(imgs);
      setTags((tagRows || []).map((t) => t.tags?.name).filter(Boolean));
      setHilfsmittel((toolRows || []).map((t) => t.tools?.name).filter(Boolean));
      setSammlungen((collectionRows || []).map((c) => c.collections?.name).filter(Boolean));
      // Beim stillen Neuladen gewähltes Bild und eingestellte Portionen behalten
      if (geladenFuer.current !== recipeId) {
        setActiveImage(0);
        setPortionen(recipeRow ? recipeRow.portionen_standard : 4);
      } else {
        // Falls inzwischen Bilder entfernt wurden: Auswahl im gültigen Bereich halten
        setActiveImage((i) => Math.min(i, Math.max(0, imgs.length - 1)));
      }
      geladenFuer.current = recipeId;
      setLoading(false);
    }
    load();
  }, [recipeId, isDemo, aktivierung]);

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
        .select(INGREDIENT_SELECT)
        .eq("recipe_id", recipeId)
        .order("reihenfolge", { ascending: true, nullsFirst: false });
      setIngredients(refreshed || []);
      setRecipe((r) => ({ ...r, portionen_standard: portionen }));
    } catch (err) {
      setError(err.message || "Speichern der Portionen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  // Favorit / „Möchte ich kochen“ per Klick umschalten (sofort anzeigen, bei Fehler zurück)
  async function toggleFlag(field) {
    if (isDemo || !recipe) return;
    const value = !recipe[field];
    setRecipe((r) => ({ ...r, [field]: value }));
    const { error: flagError } = await supabase.from("recipes").update({ [field]: value }).eq("id", recipeId);
    if (flagError) {
      setRecipe((r) => ({ ...r, [field]: !value }));
      setError(flagError.message);
    }
  }

  async function handleDelete() {
    if (isDemo) return;
    if (
      !(await bestaetigen({
        titel: "Rezept löschen?",
        text: `„${recipe.titel}“ wird gelöscht. Das kann nicht rückgängig gemacht werden.`,
      }))
    ) {
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

  const arbeitszeit = (recipe.zubereitungszeit_min || 0) + (recipe.kochzeit_min || 0);
  const categoryName = recipe.categories?.name;
  const metaParts = [
    categoryName,
    recipe.schwierigkeit,
    formatMinuten(arbeitszeit),
    recipe.gesamtzeit_min ? `gesamt ${formatMinuten(recipe.gesamtzeit_min)}` : null,
  ].filter(Boolean);
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

      <div className="detail-gallery">
        {images.length > 0 ? (
          <img className="detail-hero" src={images[activeImage]?.url} alt={recipe.titel} />
        ) : (
          <div className="detail-hero" />
        )}
        {images.length > 1 && (
          <div className="detail-thumbs">
            {/* Nur die anderen Bilder — das große wird nicht noch einmal als Vorschau gezeigt.
                Klick auf eine Vorschau macht sie groß, das bisherige große rutscht in die Reihe. */}
            {images.map((img, i) =>
              i === activeImage ? null : (
                <button
                  key={img.id}
                  type="button"
                  className="detail-thumb"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Bild ${i + 1} anzeigen`}
                >
                  <img src={img.url} alt="" />
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div className="detail-title-block">
        <h1>{recipe.titel}</h1>
        {metaParts.length > 0 && <p className="detail-meta">{metaParts.join("  ·  ")}</p>}
        {!isDemo && (
          <div className="tags-row detail-status">
            <Tag label="♥ Favorit" selected={Boolean(recipe.favorit)} onClick={() => toggleFlag("favorit")} />
            <Tag
              label="Möchte ich kochen"
              selected={Boolean(recipe.will_kochen)}
              onClick={() => toggleFlag("will_kochen")}
            />
          </div>
        )}
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
          {!isDemo && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowShoppingModal(true)}
              disabled={ingredients.length === 0}
            >
              Für das Rezept einkaufen
            </button>
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
      {recipe.portionen_text && <p className="detail-portionen-text">Laut Rezept: {recipe.portionen_text}</p>}

      {showShoppingModal && (
        <ShoppingListModal
          recipe={recipe}
          portionen={portionen}
          ingredients={ingredients.map((ing) => ({
            id: ing.id,
            ingredient_id: ing.ingredient_id,
            name: ing.ingredients?.name || ing.name,
            notiz: ing.notiz,
            einheit: ing.einheit,
            menge: ing.menge != null ? round2(ing.menge * factor) : null,
          }))}
          onClose={() => setShowShoppingModal(false)}
          onAdded={() => setShowShoppingModal(false)}
        />
      )}

      {showCookMode && (
        <CookMode
          recipeTitel={recipe.titel}
          steps={steps.map((s) => s.text)}
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
          {withGroups(ingredients).map((ing, idx) => {
            if (ing.isGroup) {
              return (
                <h3 className="detail-group-title" key={"g" + idx}>
                  {ing.gruppe}
                </h3>
              );
            }
            const name = ing.ingredients?.name || ing.name;
            const scaled = ing.menge != null ? round2(ing.menge * factor) : null;
            return (
              <div className="detail-ingredient-row" key={ing.id}>
                {/* Mengen-Spalte immer da (auch leer), damit alle Zutaten bündig untereinander stehen.
                    Einheit auch ohne Menge zeigen („Prise Zimt“). */}
                <strong>{[scaled, ing.einheit].filter((x) => x != null && x !== "").join(" ")}</strong>
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
          {(() => {
            // Nummern laufen über die Gruppen hinweg durch
            let nr = 0;
            return withGroups(steps).map((step, idx) =>
              step.isGroup ? (
                <h3 className="detail-group-title" key={"g" + idx}>
                  {step.gruppe}
                </h3>
              ) : (
                <div className="detail-step-row" key={idx}>
                  <span className="step-number">{++nr}</span>
                  <p>{step.text}</p>
                </div>
              )
            );
          })()}
        </div>
      </div>

      {recipe.notizen && (
        <div className="form-section">
          <h2 className="form-section-title">Notizen</h2>
          <p className="detail-notizen">{recipe.notizen}</p>
        </div>
      )}

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
        recipe.zucker_g != null ||
        recipe.naehrwerte_text) && (
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
          {recipe.naehrwerte_text && (
            <p className="detail-naehrwerte-text">Laut Quelle: {recipe.naehrwerte_text}</p>
          )}
        </div>
      )}
    </div>
  );
}
