import { useState } from "react";
import Checkbox from "./Checkbox.jsx";
import { addRecipeToShoppingList, findShoppingListEntry } from "../lib/shoppingList.js";

/**
 * Modal „Für das Rezept einkaufen“ (Figma: Screens – User → Einkaufsliste).
 * Schritt 1: Zutaten auswählen (alle vorausgewählt).
 * Schritt 2 (nur falls das Rezept schon auf der Liste steht): „Schon auf der Einkaufsliste“
 *            → Abbrechen / Mengen addieren / Ersetzen.
 *
 * ingredients: Zutaten des Rezepts, Mengen schon auf `portionen` umgerechnet
 *              ({ id, ingredient_id, name, notiz, menge, einheit }).
 */
export default function ShoppingListModal({ recipe, portionen, ingredients, onClose, onAdded }) {
  const [selected, setSelected] = useState(() => new Set(ingredients.map((i) => i.id)));
  const [existing, setExisting] = useState(null); // gesetzt → Rückfrage-Schritt anzeigen
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggle(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function save(mode, existingEntry) {
    setSaving(true);
    setError(null);
    try {
      await addRecipeToShoppingList({
        recipeId: recipe.id,
        portionen,
        items: ingredients
          .filter((i) => selected.has(i.id))
          .map((i) => ({ ingredient_id: i.ingredient_id, menge: i.menge, einheit: i.einheit })),
        mode,
        existing: existingEntry,
      });
      onAdded();
    } catch (err) {
      setError(err.message || "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const entry = await findShoppingListEntry(recipe.id);
      if (entry) {
        setExisting(entry); // Nutzer:in fragen: ersetzen oder addieren?
        setSaving(false);
      } else {
        await save("neu");
      }
    } catch (err) {
      setError(err.message || "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {existing ? (
          <>
            <h2>Schon auf der Einkaufsliste</h2>
            <p className="modal-subtitle">
              „{recipe.titel}“ steht bereits auf deiner Einkaufsliste. Möchtest du die bisherige
              Auswahl ersetzen oder die Mengen addieren?
            </p>
            {error && <p className="input-helper-error">{error}</p>}
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => save("addieren", existing)}
                disabled={saving}
              >
                Mengen addieren
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => save("ersetzen", existing)}
                disabled={saving}
              >
                Ersetzen
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Für das Rezept einkaufen</h2>
            <p className="modal-subtitle">
              {recipe.titel} · {portionen} {portionen === 1 ? "Portion" : "Portionen"}. Hake an, was
              du einkaufen möchtest – Zutaten, die du schon zu Hause hast, kannst du abwählen.
            </p>

            <div className="shopping-select-list">
              {ingredients.map((ing) => (
                <Checkbox
                  key={ing.id}
                  checked={selected.has(ing.id)}
                  onChange={(checked) => toggle(ing.id, checked)}
                  disabled={saving}
                  className="shopping-select-row"
                >
                  <strong className="shopping-select-menge">
                    {[ing.menge, ing.einheit].filter((x) => x != null && x !== "").join(" ")}
                  </strong>
                  {/* Nur die Ware — Zubereitungs-Notizen („ungeschält, längshalbiert“) gehören nicht auf die Einkaufsliste */}
                  <span className="shopping-select-name">{ing.name}</span>
                </Checkbox>
              ))}
            </div>

            {error && <p className="input-helper-error">{error}</p>}

            <div className="form-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving || selected.size === 0}
              >
                {saving ? "Speichert …" : `Auf die Einkaufsliste (${selected.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
