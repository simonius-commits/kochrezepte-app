import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function MergeToolModal({ tool, onClose, onMerged }) {
  const [targetName, setTargetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleMerge() {
    if (!targetName.trim()) {
      setError("Bitte ein Ziel-Hilfsmittel eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: target, error: searchError } = await supabase
        .from("tools")
        .select("id, name")
        .ilike("name", targetName.trim())
        .limit(1)
        .maybeSingle();
      if (searchError) throw searchError;
      if (!target) {
        throw new Error("Dieses Hilfsmittel existiert nicht. Bitte ein bestehendes auswählen.");
      }
      if (target.id === tool.id) {
        throw new Error("Bitte ein anderes Hilfsmittel als Ziel auswählen.");
      }

      const { error: updateError } = await supabase
        .from("recipe_tools")
        .update({ tool_id: target.id })
        .eq("tool_id", tool.id);
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase.from("tools").delete().eq("id", tool.id);
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
        <h2>Hilfsmittel zusammenführen</h2>
        <p className="modal-subtitle">
          Alle Rezepte, die „{tool.name}“ verwenden, werden auf das ausgewählte Hilfsmittel
          umgehängt. „{tool.name}“ wird danach gelöscht.
        </p>

        <div className="input-group">
          <label htmlFor="merge-tool-target">Ziel-Hilfsmittel</label>
          <input
            id="merge-tool-target"
            className="input-field"
            list="tool-merge-suggestions"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="z.B. Bratpfanne"
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
