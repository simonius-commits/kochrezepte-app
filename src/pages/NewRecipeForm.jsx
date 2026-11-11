import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { findOrCreateIngredient } from "../lib/findOrCreateIngredient.js";
import { findOrCreateAuthor } from "../lib/findOrCreateAuthor.js";
import { findOrCreateCategory } from "../lib/findOrCreateCategory.js";
import { findOrCreateTag } from "../lib/findOrCreateTag.js";
import { findOrCreateCookbook, findOrCreateCollection } from "../lib/findOrCreateCookbookOrCollection.js";
import { findOrCreateTool } from "../lib/findOrCreateTool.js";
import { getDomain } from "../lib/getDomain.js";
import Tag from "../components/Tag.jsx";
import ImportRecipeModal from "../components/ImportRecipeModal.jsx";

const SCHWIERIGKEITEN = ["einfach", "mittel", "schwer"];

function emptyIngredient() {
  return { id: crypto.randomUUID(), menge: "", einheit: "", name: "", notiz: "" };
}

// editRecipeId gesetzt → Bearbeiten-Modus (lädt bestehende Daten, aktualisiert statt anzulegen)
export default function NewRecipeForm({ editRecipeId, onCancel, onSaved }) {
  const isEditing = Boolean(editRecipeId);

  const [titel, setTitel] = useState("");
  const [portionen, setPortionen] = useState("4");
  const [zubereitungszeit, setZubereitungszeit] = useState("");
  const [kochzeit, setKochzeit] = useState("");
  const [kategorie, setKategorie] = useState(""); // jetzt freies Textfeld, siehe Einordnung-Sektion
  const [schwierigkeit, setSchwierigkeit] = useState(null);
  const [bildUrl, setBildUrl] = useState("");

  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [steps, setSteps] = useState([""]);

  // Für "Tab am Zeilenende → neue Zeile + Fokus springt automatisch rein"
  const mengeRefs = useRef({});
  const pendingIngredientFocusId = useRef(null);
  const stepRefs = useRef([]);
  const pendingStepFocusIndex = useRef(null);

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const [hilfsmittel, setHilfsmittel] = useState([]);
  const [hilfsmittelInput, setHilfsmittelInput] = useState("");

  const [sammlungen, setSammlungen] = useState([]);
  const [sammlungInput, setSammlungInput] = useState("");
  const [kochbuch, setKochbuch] = useState("");
  const [autor, setAutor] = useState("");
  const [quelle, setQuelle] = useState("");

  const [kalorien, setKalorien] = useState("");
  const [eiweiss, setEiweiss] = useState("");
  const [fett, setFett] = useState("");
  const [kohlenhydrate, setKohlenhydrate] = useState("");
  const [ballaststoffe, setBallaststoffe] = useState("");
  const [zucker, setZucker] = useState("");

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [ingredientSuggestions, setIngredientSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  const [showImportModal, setShowImportModal] = useState(false);

  // Im Bearbeiten-Modus: bestehendes Rezept inkl. Zutaten/Schritte/Tags laden und Formular befüllen
  useEffect(() => {
    if (!isEditing) return;

    async function loadExisting() {
      setLoadingExisting(true);
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
          .eq("id", editRecipeId)
          .single(),
        supabase
          .from("recipe_ingredients")
          .select("id, menge, einheit, notiz, ingredients(name)")
          .eq("recipe_id", editRecipeId),
        supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", editRecipeId)
          .order("reihenfolge", { ascending: true }),
        supabase.from("recipe_tags").select("tags(name)").eq("recipe_id", editRecipeId),
        supabase.from("recipe_tools").select("tools(name)").eq("recipe_id", editRecipeId),
        supabase
          .from("recipe_collections")
          .select("collections(name)")
          .eq("recipe_id", editRecipeId),
      ]);

      if (recipeRow) {
        setTitel(recipeRow.titel || "");
        setPortionen(String(recipeRow.portionen_standard || 4));
        setZubereitungszeit(
          recipeRow.zubereitungszeit_min != null ? String(recipeRow.zubereitungszeit_min) : ""
        );
        setKochzeit(recipeRow.kochzeit_min != null ? String(recipeRow.kochzeit_min) : "");
        setKategorie(recipeRow.categories?.name || "");
        setSchwierigkeit(recipeRow.schwierigkeit || null);
        setBildUrl(recipeRow.bild_url || "");
        setKochbuch(recipeRow.cookbooks?.name || "");
        setAutor(recipeRow.authors?.name || "");
        setQuelle(recipeRow.quelle || "");
        setKalorien(recipeRow.kalorien_kcal != null ? String(recipeRow.kalorien_kcal) : "");
        setEiweiss(recipeRow.eiweiss_g != null ? String(recipeRow.eiweiss_g) : "");
        setFett(recipeRow.fett_g != null ? String(recipeRow.fett_g) : "");
        setKohlenhydrate(recipeRow.kohlenhydrate_g != null ? String(recipeRow.kohlenhydrate_g) : "");
        setBallaststoffe(recipeRow.ballaststoffe_g != null ? String(recipeRow.ballaststoffe_g) : "");
        setZucker(recipeRow.zucker_g != null ? String(recipeRow.zucker_g) : "");
      }
      if (ingredientRows && ingredientRows.length > 0) {
        setIngredients(
          ingredientRows.map((ing) => ({
            id: ing.id,
            menge: ing.menge != null ? String(ing.menge) : "",
            einheit: ing.einheit || "",
            name: ing.ingredients?.name || "",
            notiz: ing.notiz || "",
          }))
        );
      }
      if (stepRows && stepRows.length > 0) setSteps(stepRows.map((s) => s.text));
      if (tagRows) setTags(tagRows.map((t) => t.tags?.name).filter(Boolean));
      if (toolRows) setHilfsmittel(toolRows.map((t) => t.tools?.name).filter(Boolean));
      if (collectionRows) setSammlungen(collectionRows.map((c) => c.collections?.name).filter(Boolean));
      setLoadingExisting(false);
    }
    loadExisting();
  }, [editRecipeId, isEditing]);

  // Vorschlagsliste für das Autocomplete im Zutat-Feld (bestehende Zutaten aus dem geteilten Pool)
  useEffect(() => {
    async function loadSuggestions() {
      const { data } = await supabase.from("ingredients").select("name").order("name", { ascending: true });
      setIngredientSuggestions((data || []).map((i) => i.name));
    }
    loadSuggestions();
  }, []);

  // Neue Zutaten-Zeile wurde hinzugefügt (per Button oder Tab) → Fokus auf ihr Mengen-Feld setzen
  useEffect(() => {
    const id = pendingIngredientFocusId.current;
    if (id && mengeRefs.current[id]) {
      mengeRefs.current[id].focus();
      pendingIngredientFocusId.current = null;
    }
  }, [ingredients]);

  // Neuer Zubereitungsschritt wurde hinzugefügt (per Button oder Tab) → Fokus auf sein Textfeld setzen
  useEffect(() => {
    const index = pendingStepFocusIndex.current;
    if (index !== null && stepRefs.current[index]) {
      stepRefs.current[index].focus();
      pendingStepFocusIndex.current = null;
    }
  }, [steps]);

  function updateIngredient(id, field, value) {
    setIngredients((list) =>
      list.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  }

  function addIngredientRow() {
    const newIngredient = emptyIngredient();
    pendingIngredientFocusId.current = newIngredient.id;
    setIngredients((list) => [...list, newIngredient]);
  }

  function handleIngredientNotizKeyDown(e, ing) {
    if (e.key !== "Tab" || e.shiftKey) return; // nur "vorwärts"-Tab abfangen, Shift+Tab normal lassen
    const isLastRow = ingredients[ingredients.length - 1]?.id === ing.id;
    if (isLastRow) {
      e.preventDefault();
      addIngredientRow();
    }
    // sonst: normales Tab-Verhalten springt (dank tabIndex=-1 auf dem ×-Button) direkt in die nächste Zeile
  }

  function removeIngredientRow(id) {
    setIngredients((list) => list.filter((ing) => ing.id !== id));
  }

  function updateStep(index, value) {
    setSteps((list) => list.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    setSteps((list) => {
      pendingStepFocusIndex.current = list.length; // Index der neuen (letzten) Zeile
      return [...list, ""];
    });
  }

  function handleStepKeyDown(e, index) {
    if (e.key !== "Tab" || e.shiftKey) return;
    const isLastRow = index === steps.length - 1;
    if (isLastRow) {
      e.preventDefault();
      addStep();
    }
  }

  function removeStep(index) {
    setSteps((list) => list.filter((_, i) => i !== index));
  }

  function addTag() {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) {
      setTags((list) => [...list, value]);
    }
    setTagInput("");
  }

  function removeTag(tag) {
    setTags((list) => list.filter((t) => t !== tag));
  }

  function addHilfsmittel() {
    const value = hilfsmittelInput.trim();
    if (value && !hilfsmittel.includes(value)) {
      setHilfsmittel((list) => [...list, value]);
    }
    setHilfsmittelInput("");
  }

  function removeHilfsmittel(item) {
    setHilfsmittel((list) => list.filter((h) => h !== item));
  }

  function addSammlung() {
    const value = sammlungInput.trim();
    if (value && !sammlungen.includes(value)) {
      setSammlungen((list) => [...list, value]);
    }
    setSammlungInput("");
  }

  function removeSammlung(name) {
    setSammlungen((list) => list.filter((s) => s !== name));
  }

  function handleImported(importedRecipe) {
    if (!importedRecipe) return;

    setTitel(importedRecipe.titel || "");
    setPortionen(String(importedRecipe.portionen_standard || 4));
    setZubereitungszeit(
      importedRecipe.zubereitungszeit_min != null ? String(importedRecipe.zubereitungszeit_min) : ""
    );
    setKochzeit(importedRecipe.kochzeit_min != null ? String(importedRecipe.kochzeit_min) : "");
    setKategorie(importedRecipe.kategorie || "");
    setSchwierigkeit(
      SCHWIERIGKEITEN.includes(importedRecipe.schwierigkeit) ? importedRecipe.schwierigkeit : null
    );

    if (importedRecipe.ingredients && importedRecipe.ingredients.length > 0) {
      setIngredients(
        importedRecipe.ingredients.map((ing) => ({
          id: crypto.randomUUID(),
          menge: ing.menge != null ? String(ing.menge) : "",
          einheit: ing.einheit || "",
          name: ing.name || "",
          // Der Import liefert (noch) keine Notiz — trotzdem immer einen Text setzen,
          // sonst stürzt das Speichern bei ing.notiz.trim() ab.
          notiz: ing.notiz || "",
        }))
      );
    }
    if (importedRecipe.steps && importedRecipe.steps.length > 0) {
      setSteps(importedRecipe.steps);
    }
    if (importedRecipe.tags && importedRecipe.tags.length > 0) {
      setTags(importedRecipe.tags);
    }
    if (importedRecipe.autor) setAutor(importedRecipe.autor);
    // Kochbuch: Hat Claude auf der Seite ein Buch erkannt, nehmen wir das. Sonst beim Link-Import
    // die Domain (z.B. "chefkoch.de"), damit alle Rezepte einer Webseite im selben Kochbuch landen.
    const kochbuchAusQuelle = getDomain(importedRecipe.quelle);
    if (importedRecipe.kochbuch) setKochbuch(importedRecipe.kochbuch);
    else if (kochbuchAusQuelle) setKochbuch(kochbuchAusQuelle);
    if (importedRecipe.quelle) setQuelle(importedRecipe.quelle);
    if (importedRecipe.kalorien_kcal != null) setKalorien(String(importedRecipe.kalorien_kcal));
    if (importedRecipe.eiweiss_g != null) setEiweiss(String(importedRecipe.eiweiss_g));
    if (importedRecipe.fett_g != null) setFett(String(importedRecipe.fett_g));
    if (importedRecipe.kohlenhydrate_g != null) setKohlenhydrate(String(importedRecipe.kohlenhydrate_g));
    if (importedRecipe.ballaststoffe_g != null) setBallaststoffe(String(importedRecipe.ballaststoffe_g));
    if (importedRecipe.zucker_g != null) setZucker(String(importedRecipe.zucker_g));

    setShowImportModal(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setImageError(null);
    try {
      const filePath = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("recipe-images").getPublicUrl(filePath);
      setBildUrl(data.publicUrl);
    } catch (err) {
      setImageError(
        `Bild-Upload fehlgeschlagen: ${err.message || "unbekannter Fehler"}. ` +
          `Ist der Storage-Bucket "recipe-images" in Supabase eingerichtet?`
      );
    } finally {
      setUploading(false);
      e.target.value = ""; // erlaubt erneute Auswahl derselben Datei
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!titel.trim()) {
      setError("Bitte einen Rezepttitel eingeben.");
      return;
    }
    setError(null);
    setSaving(true);

    const payload = {
      titel: titel.trim(),
      portionen_standard: Number(portionen) || 4,
      zubereitungszeit_min: zubereitungszeit ? Number(zubereitungszeit) : null,
      kochzeit_min: kochzeit ? Number(kochzeit) : null,
      schwierigkeit,
      bild_url: bildUrl.trim() || null,
      quelle: quelle.trim() || null,
      kalorien_kcal: kalorien ? Number(kalorien) : null,
      eiweiss_g: eiweiss ? Number(eiweiss) : null,
      fett_g: fett ? Number(fett) : null,
      kohlenhydrate_g: kohlenhydrate ? Number(kohlenhydrate) : null,
      ballaststoffe_g: ballaststoffe ? Number(ballaststoffe) : null,
      zucker_g: zucker ? Number(zucker) : null,
    };

    try {
      // Kategorie, Autor:in und Kochbuch sind Einzelwerte aus geteilten/eigenen Pools — vor dem
      // Speichern auflösen (finden oder anlegen), damit wir die IDs im Rezept ablegen können.
      payload.category_id = kategorie.trim() ? await findOrCreateCategory(kategorie) : null;
      payload.author_id = autor.trim() ? await findOrCreateAuthor(autor) : null;
      payload.cookbook_id = kochbuch.trim() ? await findOrCreateCookbook(kochbuch) : null;

      let recipeId = editRecipeId;

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("recipes")
          .update(payload)
          .eq("id", recipeId);
        if (updateError) throw updateError;

        // Einfachster verlässlicher Ansatz für diese App-Größe: bestehende Zutaten/Schritte/
        // Tags löschen und aus dem aktuellen Formularstand neu anlegen, statt sie einzeln
        // abzugleichen.
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_tags").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_tools").delete().eq("recipe_id", recipeId);
        await supabase.from("recipe_collections").delete().eq("recipe_id", recipeId);
      } else {
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert(payload)
          .select()
          .single();
        if (recipeError) throw recipeError;
        recipeId = recipe.id;
      }

      // Zutaten (jede Zeile: Zutat finden/anlegen, dann Verknüpfung speichern)
      for (const ing of ingredients) {
        if (!ing.name.trim()) continue;
        const ingredientId = await findOrCreateIngredient(ing.name);
        const { error: riError } = await supabase.from("recipe_ingredients").insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          menge: ing.menge ? Number(ing.menge) : null,
          einheit: ing.einheit.trim() || null,
          notiz: ing.notiz.trim() || null,
        });
        if (riError) throw riError;
      }

      // Zubereitungsschritte (Reihenfolge = Position in der Liste)
      const nonEmptySteps = steps.filter((s) => s.trim());
      for (let i = 0; i < nonEmptySteps.length; i++) {
        const { error: stepError } = await supabase.from("recipe_steps").insert({
          recipe_id: recipeId,
          reihenfolge: i + 1,
          text: nonEmptySteps[i],
        });
        if (stepError) throw stepError;
      }

      // Tags (jeder: finden/anlegen, dann verknüpfen)
      for (const tagName of tags) {
        const tagId = await findOrCreateTag(tagName);
        const { error: tagError } = await supabase
          .from("recipe_tags")
          .insert({ recipe_id: recipeId, tag_id: tagId });
        if (tagError) throw tagError;
      }

      // Hilfsmittel (jedes: finden/anlegen, dann verknüpfen)
      for (const toolName of hilfsmittel) {
        const toolId = await findOrCreateTool(toolName);
        const { error: toolError } = await supabase
          .from("recipe_tools")
          .insert({ recipe_id: recipeId, tool_id: toolId });
        if (toolError) throw toolError;
      }

      // Sammlungen (jede: finden/anlegen, dann verknüpfen)
      for (const sammlungName of sammlungen) {
        const collectionId = await findOrCreateCollection(sammlungName);
        const { error: collError } = await supabase
          .from("recipe_collections")
          .insert({ recipe_id: recipeId, collection_id: collectionId });
        if (collError) throw collError;
      }

      onSaved();
    } catch (err) {
      setError(err.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingExisting) {
    return <div className="screen">Lädt …</div>;
  }

  const saveLabel = saving ? "Speichert …" : isEditing ? "Änderungen speichern" : "Rezept speichern";

  return (
    <div className="screen">
      <form onSubmit={handleSubmit}>
        <div className="header">
          <h1>{isEditing ? "Rezept bearbeiten" : "Neues Rezept"}</h1>
          <div className="header-actions">
            {!isEditing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowImportModal(true)}
              >
                ↓ Rezept importieren
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saveLabel}
            </button>
          </div>
        </div>

        {showImportModal && (
          <ImportRecipeModal
            onClose={() => setShowImportModal(false)}
            onImported={handleImported}
          />
        )}

        {error && <p className="input-helper-error form-error">{error}</p>}

        {/* ===== Basisinfos ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Basisinfos</h2>

          <div className="input-group">
            <label htmlFor="titel">Rezepttitel</label>
            <input
              id="titel"
              className="input-field"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Pasta Carbonara"
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="portionen">Portionen</label>
              <input
                id="portionen"
                type="number"
                min="1"
                className="input-field"
                value={portionen}
                onChange={(e) => setPortionen(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="zubereitungszeit">Zubereitungszeit (Min)</label>
              <input
                id="zubereitungszeit"
                type="number"
                min="0"
                className="input-field"
                value={zubereitungszeit}
                onChange={(e) => setZubereitungszeit(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="kochzeit">Kochzeit (Min)</label>
              <input
                id="kochzeit"
                type="number"
                min="0"
                className="input-field"
                value={kochzeit}
                onChange={(e) => setKochzeit(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Bild</label>
            {bildUrl && (
              <img className="image-preview" src={bildUrl} alt="Vorschau" />
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-secondary image-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Lädt hoch …" : bildUrl ? "Anderes Bild wählen" : "Bild hochladen"}
            </button>
            {imageError && <p className="input-helper-error">{imageError}</p>}
          </div>
        </div>

        {/* ===== Zutaten ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Zutaten</h2>
          <datalist id="ingredient-suggestions">
            {ingredientSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="ingredient-rows">
            {ingredients.map((ing) => (
              <div className="ingredient-row" key={ing.id}>
                <input
                  ref={(el) => (mengeRefs.current[ing.id] = el)}
                  className="input-field mini-input mini-input-menge"
                  placeholder="Menge"
                  value={ing.menge}
                  onChange={(e) => updateIngredient(ing.id, "menge", e.target.value)}
                />
                <input
                  className="input-field mini-input mini-input-einheit"
                  placeholder="Einheit"
                  value={ing.einheit}
                  onChange={(e) => updateIngredient(ing.id, "einheit", e.target.value)}
                />
                <input
                  className="input-field mini-input mini-input-name"
                  placeholder="Zutat"
                  list="ingredient-suggestions"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                />
                <input
                  className="input-field mini-input mini-input-notiz"
                  placeholder="Notiz (optional)"
                  value={ing.notiz}
                  onChange={(e) => updateIngredient(ing.id, "notiz", e.target.value)}
                  onKeyDown={(e) => handleIngredientNotizKeyDown(e, ing)}
                />
                <button
                  type="button"
                  className="remove-icon"
                  onClick={() => removeIngredientRow(ing.id)}
                  aria-label="Zutat entfernen"
                  tabIndex={-1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={addIngredientRow}>
            + Zutat hinzufügen
          </button>
        </div>

        {/* ===== Zubereitung ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Zubereitung</h2>
          <div className="step-rows">
            {steps.map((text, i) => (
              <div className="step-row" key={i}>
                <span className="step-number">{i + 1}</span>
                <textarea
                  ref={(el) => (stepRefs.current[i] = el)}
                  className="input-field step-textarea"
                  value={text}
                  onChange={(e) => updateStep(i, e.target.value)}
                  onKeyDown={(e) => handleStepKeyDown(e, i)}
                  placeholder={`Schritt ${i + 1} …`}
                  rows={2}
                />
                <button
                  type="button"
                  className="remove-icon"
                  onClick={() => removeStep(i)}
                  aria-label="Schritt entfernen"
                  tabIndex={-1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={addStep}>
            + Schritt hinzufügen
          </button>
        </div>

        {/* ===== Einordnung ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Einordnung</h2>

          <div className="input-group">
            <label htmlFor="kategorie">Kategorie</label>
            <input
              id="kategorie"
              className="input-field"
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              placeholder="z.B. Hauptgericht"
            />
          </div>

          <div className="input-group">
            <label>Schwierigkeit</label>
            <div className="tag-select-row">
              {SCHWIERIGKEITEN.map((s) => (
                <Tag
                  key={s}
                  label={s}
                  selected={schwierigkeit === s}
                  onClick={() => setSchwierigkeit(schwierigkeit === s ? null : s)}
                />
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Tags</label>
            <div className="tags-input-row">
              {tags.map((tag) => (
                <span key={tag} className="tag removable-tag" onClick={() => removeTag(tag)}>
                  {tag} ×
                </span>
              ))}
              <input
                className="input-field mini-input-name"
                placeholder="Tag hinzufügen …"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Hilfsmittel</label>
            <div className="tags-input-row">
              {hilfsmittel.map((item) => (
                <span key={item} className="tag removable-tag" onClick={() => removeHilfsmittel(item)}>
                  {item} ×
                </span>
              ))}
              <input
                className="input-field mini-input-name"
                placeholder="Hilfsmittel hinzufügen …"
                value={hilfsmittelInput}
                onChange={(e) => setHilfsmittelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHilfsmittel();
                  }
                }}
                onBlur={addHilfsmittel}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Sammlung</label>
            <div className="tags-input-row">
              {sammlungen.map((s) => (
                <span key={s} className="tag removable-tag" onClick={() => removeSammlung(s)}>
                  {s} ×
                </span>
              ))}
              <input
                className="input-field mini-input-name"
                placeholder="Sammlung hinzufügen …"
                value={sammlungInput}
                onChange={(e) => setSammlungInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSammlung();
                  }
                }}
                onBlur={addSammlung}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="kochbuch">Kochbuch</label>
            <input
              id="kochbuch"
              className="input-field"
              value={kochbuch}
              onChange={(e) => setKochbuch(e.target.value)}
              placeholder="z.B. Simple"
            />
          </div>

          <div className="input-group">
            <label htmlFor="autor">Koch/Köchin/Autor:in</label>
            <input
              id="autor"
              className="input-field"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              placeholder="z.B. Ottolenghi"
            />
          </div>

          <div className="input-group">
            <label htmlFor="quelle">Quelle (Link)</label>
            <input
              id="quelle"
              inputMode="url"
              className="input-field"
              value={quelle}
              onChange={(e) => setQuelle(e.target.value)}
              placeholder="z.B. https://www.chefkoch.de/rezepte/…"
            />
          </div>
        </div>

        {/* ===== Nährwerte ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Nährwerte</h2>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="kalorien">Kalorien (kcal)</label>
              <input
                id="kalorien"
                type="number"
                min="0"
                className="input-field"
                value={kalorien}
                onChange={(e) => setKalorien(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="eiweiss">Eiweiß (g)</label>
              <input
                id="eiweiss"
                type="number"
                min="0"
                className="input-field"
                value={eiweiss}
                onChange={(e) => setEiweiss(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="fett">Fett (g)</label>
              <input
                id="fett"
                type="number"
                min="0"
                className="input-field"
                value={fett}
                onChange={(e) => setFett(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="kohlenhydrate">Kohlenhydrate (g)</label>
              <input
                id="kohlenhydrate"
                type="number"
                min="0"
                className="input-field"
                value={kohlenhydrate}
                onChange={(e) => setKohlenhydrate(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="ballaststoffe">Ballaststoffe (g)</label>
              <input
                id="ballaststoffe"
                type="number"
                min="0"
                className="input-field"
                value={ballaststoffe}
                onChange={(e) => setBallaststoffe(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="zucker">Zucker (g)</label>
              <input
                id="zucker"
                type="number"
                min="0"
                className="input-field"
                value={zucker}
                onChange={(e) => setZucker(e.target.value)}
              />
            </div>
          </div>
          <p className="field-hint">Angaben pro Portion, manuell eingetragen.</p>
        </div>

        {/* ===== Footer (Abbrechen/Speichern auch unten, ohne Trennlinie) ===== */}
        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
