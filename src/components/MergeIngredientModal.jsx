import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function MergeIngredientModal({ ingredient, onClose, onMerged }) {
  const [targetName, setTargetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleMerge() {
    if (!targetName.trim()) {
      setError("Bitte eine Ziel-Zutat eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: target, error: searchError } = await supabase
        .from("ingredients")
        .select("id, name")
        .ilike("name", targetName.trim())
        .limit(1)
        .maybeSingle();
      if (searchError) throw searchError;
      if (!target) {
        throw new Error("Diese Zutat existiert nicht. Bitte eine bestehende Zutat auswählen.");
      }
      if (target.id === ingredient.id) {
        throw new Error("Bitte eine andere Zutat als Ziel auswählen.");
      }

      // Alle Rezepte, die die alte Zutat verwenden, auf die Ziel-Zutat umhängen.
      const { error: updateError } = await supabase
        .from("recipe_ingredients")
        .update({ ingredient_id: target.id })
        .eq("ingredient_id", ingredient.id);
      if (updateError) throw updateError;

      // Alte Zutat ist jetzt garantiert unbenutzt und kann gelöscht werden.
      const { error: deleteError } = await supabase.from("ingredients").delete().eq("id", ingredient.id);
      if (deleteError) throw deleteError;

      onMerged();
    } catch (err) {
      setError(err.message || "Zusammenführen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Zutat zusammenführen</h2>
        <p className="modal-subtitle">
          Alle Rezepte, die „{ingredient.name}“ verwenden, werden auf die ausgewählte Zutat
          umgehängt. „{ingredient.name}“ wird danach gelöscht.
        </p>

        <div className="input-group">
          <label htmlFor="merge-target">Ziel-Zutat</label>
          <input
            id="merge-target"
            className="input-field"
            list="ingredient-merge-suggestions"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="z.B. Tomate"
            autoFocus
          />
        </div>

        {error && <p className="input-helper-error">{error}</p>}

        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={handleMerge} disabled={saving}>
            {saving ? "Führt zusammen …" : "Zusammenführen"}
          </button>
        </div>
      </div>
    </div>
  );
}
