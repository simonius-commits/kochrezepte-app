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
import Checkbox from "../components/Checkbox.jsx";
import ImportRecipeModal from "../components/ImportRecipeModal.jsx";

const SCHWIERIGKEITEN = ["einfach", "mittel", "schwer"];

function emptyIngredient() {
  return { id: crypto.randomUUID(), menge: "", einheit: "", name: "", notiz: "" };
}
// Gruppen-Zeile („Für die Soße“) — steht in derselben Liste wie die Zutaten/Schritte;
// beim Speichern bekommen alle folgenden Zeilen diese Gruppe.
function emptyGroup() {
  return { id: crypto.randomUUID(), isGroup: true, gruppe: "" };
}
function emptyStep(text = "") {
  return { id: crypto.randomUUID(), text };
}
/** Aus gespeicherten Zeilen (mit Feld „gruppe“) wieder Gruppen-Zeilen dazwischen machen */
function withGroupRows(rows) {
  const out = [];
  let current = "";
  for (const row of rows) {
    const g = (row.gruppe || "").trim();
    if (g !== current) {
      if (g) out.push({ id: crypto.randomUUID(), isGroup: true, gruppe: g });
      current = g;
    }
    out.push(row);
  }
  return out;
}
function numOrNull(v) {
  return v !== "" && v != null ? Number(v) : null;
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
  const [gesamtzeit, setGesamtzeit] = useState("");
  const [portionenText, setPortionenText] = useState("");
  const [images, setImages] = useState([]); // Bild-Adressen; das erste ist das Titelbild
  const [favorit, setFavorit] = useState(false);
  const [willKochen, setWillKochen] = useState(false);
  const [notizen, setNotizen] = useState("");
  const [naehrwerteText, setNaehrwerteText] = useState("");

  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [steps, setSteps] = useState([emptyStep()]);

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
        { data: imageRows },
      ] = await Promise.all([
        supabase
          .from("recipes")
          .select("*, authors(name), cookbooks(name), categories(name)")
          .eq("id", editRecipeId)
          .single(),
        supabase
          .from("recipe_ingredients")
          .select("id, menge, einheit, notiz, gruppe, reihenfolge, ingredients(name)")
          .eq("recipe_id", editRecipeId)
          .order("reihenfolge", { ascending: true, nullsFirst: false }),
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
        supabase
          .from("recipe_images")
          .select("url, reihenfolge")
          .eq("recipe_id", editRecipeId)
          .order("reihenfolge", { ascending: true }),
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
        setGesamtzeit(recipeRow.gesamtzeit_min != null ? String(recipeRow.gesamtzeit_min) : "");
        setPortionenText(recipeRow.portionen_text || "");
        setFavorit(Boolean(recipeRow.favorit));
        setWillKochen(Boolean(recipeRow.will_kochen));
        setNotizen(recipeRow.notizen || "");
        setNaehrwerteText(recipeRow.naehrwerte_text || "");
        // Bilder aus recipe_images; ältere Rezepte haben nur bild_url
        if (imageRows && imageRows.length > 0) setImages(imageRows.map((i) => i.url));
        else if (recipeRow.bild_url) setImages([recipeRow.bild_url]);
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
          withGroupRows(
            ingredientRows.map((ing) => ({
              id: ing.id,
              menge: ing.menge != null ? String(ing.menge) : "",
              einheit: ing.einheit || "",
              name: ing.ingredients?.name || "",
              notiz: ing.notiz || "",
              gruppe: ing.gruppe || "",
            }))
          )
        );
      }
      if (stepRows && stepRows.length > 0) {
        setSteps(withGroupRows(stepRows.map((st) => ({ id: st.id, text: st.text, gruppe: st.gruppe || "" }))));
      }
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

  function addIngredientGroup() {
    setIngredients((list) => [...list, emptyGroup()]);
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

  function updateStep(index, field, value) {
    setSteps((list) => list.map((st, i) => (i === index ? { ...st, [field]: value } : st)));
  }

  function addStep() {
    setSteps((list) => {
      pendingStepFocusIndex.current = list.length; // Index der neuen (letzten) Zeile
      return [...list, emptyStep()];
    });
  }

  function addStepGroup() {
    setSteps((list) => [...list, emptyGroup()]);
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
          // Der Import trennt Ware ("name") und Zubereitung ("notiz"). Immer einen Text setzen,
          // sonst stürzt das Speichern bei ing.notiz.trim() ab.
          notiz: ing.notiz || "",
        }))
      );
    }
    if (importedRecipe.steps && importedRecipe.steps.length > 0) {
      setSteps(importedRecipe.steps.map((text) => emptyStep(text)));
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

  // Mehrere Bilder auf einmal hochladen; sie werden hinten angehängt
  async function handleFileChange(e) {
    const files = [...(e.target.files || [])];
    if (files.length === 0) return;
    setUploading(true);
    setImageError(null);
    try {
      for (const file of files) {
        const filePath = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("recipe-images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("recipe-images").getPublicUrl(filePath);
        setImages((list) => [...list, data.publicUrl]);
      }
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

  // Bild um eine Position verschieben (-1 = nach links, +1 = nach rechts)
  function moveImage(index, delta) {
    setImages((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeImage(index) {
    setImages((list) => list.filter((_, i) => i !== index));
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
      gesamtzeit_min: numOrNull(gesamtzeit),
      portionen_text: portionenText.trim() || null,
      schwierigkeit,
      // bild_url = Kopie des Titelbilds, damit Cards und Listen ohne Extra-Abfrage auskommen
      bild_url: images[0] || null,
      favorit,
      will_kochen: willKochen,
      notizen: notizen.trim() || null,
      naehrwerte_text: naehrwerteText.trim() || null,
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
        await supabase.from("recipe_images").delete().eq("recipe_id", recipeId);
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

      // Bilder (Reihenfolge 0 = Titelbild)
      if (images.length > 0) {
        const { error: imgError } = await supabase
          .from("recipe_images")
          .insert(images.map((url, i) => ({ recipe_id: recipeId, url, reihenfolge: i })));
        if (imgError) throw imgError;
      }

      // Zutaten (jede Zeile: Zutat finden/anlegen, dann Verknüpfung speichern).
      // Gruppen-Zeilen setzen die Gruppe für alle folgenden Zutaten.
      let ingGruppe = null;
      let ingNr = 0;
      for (const ing of ingredients) {
        if (ing.isGroup) {
          ingGruppe = ing.gruppe.trim() || null;
          continue;
        }
        if (!ing.name.trim()) continue;
        const ingredientId = await findOrCreateIngredient(ing.name);
        const { error: riError } = await supabase.from("recipe_ingredients").insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          menge: ing.menge ? Number(String(ing.menge).replace(",", ".")) : null,
          einheit: ing.einheit.trim() || null,
          notiz: ing.notiz.trim() || null,
          gruppe: ingGruppe,
          reihenfolge: ++ingNr,
        });
        if (riError) throw riError;
      }

      // Zubereitungsschritte (Reihenfolge = Position in der Liste, Gruppen wie bei den Zutaten)
      let stepGruppe = null;
      let stepNr = 0;
      for (const st of steps) {
        if (st.isGroup) {
          stepGruppe = st.gruppe.trim() || null;
          continue;
        }
        if (!st.text.trim()) continue;
        const { error: stepError } = await supabase.from("recipe_steps").insert({
          recipe_id: recipeId,
          reihenfolge: ++stepNr,
          text: st.text,
          gruppe: stepGruppe,
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
            <div className="input-group">
              <label htmlFor="gesamtzeit">Gesamtzeit (Min)</label>
              <input
                id="gesamtzeit"
                type="number"
                min="0"
                className="input-field"
                value={gesamtzeit}
                onChange={(e) => setGesamtzeit(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="portionen-text">Portionen-Text (optional)</label>
            <input
              id="portionen-text"
              className="input-field"
              value={portionenText}
              onChange={(e) => setPortionenText(e.target.value)}
              placeholder="z.B. 1 Kuchen (26 cm)"
            />
          </div>

          <div className="input-group">
            <label>Bilder</label>
            {images.length > 0 && (
              <div className="form-images">
                {images.map((url, i) => (
                  <div className="form-image" key={url + i}>
                    <img className={i === 0 ? "is-cover" : ""} src={url} alt={`Bild ${i + 1}`} />
                    <div className="form-image-actions">
                      {i === 0 ? (
                        <span className="form-image-cover">Titelbild</span>
                      ) : (
                        <button type="button" onClick={() => moveImage(i, -1)} aria-label="Nach links">
                          ←
                        </button>
                      )}
                      {i > 0 && i < images.length - 1 && (
                        <button type="button" onClick={() => moveImage(i, 1)} aria-label="Nach rechts">
                          →
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(i)} aria-label="Bild entfernen">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
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
              {uploading ? "Lädt hoch …" : "Bilder hinzufügen"}
            </button>
            <p className="field-hint">
              Mehrere Bilder auf einmal auswählbar. Das erste Bild ist das Titelbild; mit ← → verschieben, ×
              entfernt.
            </p>
            {imageError && <p className="input-helper-error">{imageError}</p>}
          </div>

          <div className="form-checks">
            <Checkbox checked={favorit} onChange={setFavorit}>
              Favorit
            </Checkbox>
            <Checkbox checked={willKochen} onChange={setWillKochen}>
              Möchte ich kochen
            </Checkbox>
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
            {ingredients.map((ing) =>
              ing.isGroup ? (
                <div className="ingredient-row group-row" key={ing.id}>
                  <span className="group-row-label">Gruppe</span>
                  <input
                    className="input-field mini-input-name"
                    placeholder="z.B. Für die Soße"
                    value={ing.gruppe}
                    onChange={(e) => updateIngredient(ing.id, "gruppe", e.target.value)}
                  />
                  <button
                    type="button"
                    className="remove-icon"
                    onClick={() => removeIngredientRow(ing.id)}
                    aria-label="Gruppe entfernen"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                </div>
              ) : (
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
              )
            )}
          </div>
          <div className="form-add-actions">
            <button type="button" className="btn btn-ghost" onClick={addIngredientRow}>
              + Zutat hinzufügen
            </button>
            <button type="button" className="btn btn-ghost" onClick={addIngredientGroup}>
              + Gruppe hinzufügen
            </button>
          </div>
        </div>

        {/* ===== Zubereitung ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Zubereitung</h2>
          <div className="step-rows">
            {steps.map((st, i) => {
              if (st.isGroup) {
                return (
                  <div className="step-row group-row" key={st.id}>
                    <span className="group-row-label">Gruppe</span>
                    <input
                      className="input-field mini-input-name"
                      placeholder="z.B. Teig"
                      value={st.gruppe}
                      onChange={(e) => updateStep(i, "gruppe", e.target.value)}
                    />
                    <button
                      type="button"
                      className="remove-icon"
                      onClick={() => removeStep(i)}
                      aria-label="Gruppe entfernen"
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  </div>
                );
              }
              // Nummer = wie viele echte Schritte bis hierher (Gruppen zählen nicht mit)
              const nr = steps.slice(0, i + 1).filter((x) => !x.isGroup).length;
              return (
              <div className="step-row" key={st.id}>
                <span className="step-number">{nr}</span>
                <textarea
                  ref={(el) => (stepRefs.current[i] = el)}
                  className="input-field step-textarea"
                  value={st.text}
                  onChange={(e) => updateStep(i, "text", e.target.value)}
                  onKeyDown={(e) => handleStepKeyDown(e, i)}
                  placeholder={`Schritt ${nr} …`}
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
              );
            })}
          </div>
          <div className="form-add-actions">
            <button type="button" className="btn btn-ghost" onClick={addStep}>
              + Schritt hinzufügen
            </button>
            <button type="button" className="btn btn-ghost" onClick={addStepGroup}>
              + Gruppe hinzufügen
            </button>
          </div>
        </div>

        {/* ===== Notizen ===== */}
        <div className="form-section">
          <h2 className="form-section-title">Notizen</h2>
          <textarea
            className="input-field form-textarea"
            rows={4}
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="z.B. Tipps, Varianten, was beim letzten Mal aufgefallen ist …"
            aria-label="Notizen"
          />
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
          <div className="input-group">
            <label htmlFor="naehrwerte-text">Nährwerte als Text (optional, z.B. aus einem Import)</label>
            <textarea
              id="naehrwerte-text"
              className="input-field form-textarea"
              rows={2}
              value={naehrwerteText}
              onChange={(e) => setNaehrwerteText(e.target.value)}
            />
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
