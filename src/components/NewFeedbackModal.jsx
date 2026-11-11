import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const BETREFF_OPTIONS = ["Feature Request", "Report a Bug", "Feedback", "Sonstiges"];

export default function NewFeedbackModal({ onClose, onCreated }) {
  const [betreff, setBetreff] = useState(BETREFF_OPTIONS[0]);
  const [nachricht, setNachricht] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd() {
    if (!nachricht.trim()) {
      setError("Bitte eine kurze Beschreibung eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("feedback_items").insert({
        category: betreff,
        message: nachricht.trim(),
        source: "admin",
        created_by: user?.id ?? null,
      });
      if (insertError) throw insertError;

      onCreated();
    } catch (err) {
      setError(err.message || "Hinzufügen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Neuer Eintrag</h2>
        <p className="modal-subtitle">Feature-Idee, Bug oder Notiz direkt ins Backlog eintragen.</p>

        <div className="input-group">
          <label htmlFor="new-feedback-betreff">Betreff</label>
          <select
            id="new-feedback-betreff"
            className="input-field"
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
          >
            {BETREFF_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="new-feedback-nachricht">Nachricht</label>
          <textarea
            id="new-feedback-nachricht"
            className="input-field textarea-field"
            rows={5}
            placeholder="Kurze Beschreibung …"
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
          />
        </div>

        {error && <p className="input-helper-error">{error}</p>}

        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? "Fügt hinzu …" : "Hinzufügen"}
          </button>
        </div>
      </div>
    </div>
  );
}
