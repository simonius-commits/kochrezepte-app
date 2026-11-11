import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import Tag from "./Tag.jsx";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result sieht aus wie "data:image/png;base64,AAAA..." — wir brauchen nur den Teil nach dem Komma
      const base64 = String(reader.result).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImportRecipeModal({ onClose, onImported }) {
  const [activeTab, setActiveTab] = useState("link"); // "link" | "foto" | "text"
  const [url, setUrl] = useState("");
  const [textValue, setTextValue] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  async function handleImport() {
    setError(null);

    let body;
    if (activeTab === "link") {
      if (!url.trim()) {
        setError("Bitte einen Link eingeben.");
        return;
      }
      body = { type: "link", url: url.trim() };
    } else if (activeTab === "text") {
      if (!textValue.trim()) {
        setError("Bitte Rezepttext einfügen.");
        return;
      }
      body = { type: "text", text: textValue };
    } else {
      if (!photoFile) {
        setError("Bitte ein Foto auswählen.");
        return;
      }
      const base64 = await fileToBase64(photoFile);
      body = { type: "photo", imageBase64: base64, imageMediaType: photoFile.type };
    }

    setImporting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-recipe", { body });
      if (fnError) {
        // Bei einem Fehler-Status (z.B. 400) liefert Supabase nur eine allgemeine Meldung
        // ("non-2xx status code"). Die eigentliche Fehlermeldung unserer Edge Function steckt
        // in der Antwort selbst — die lesen wir hier aus, damit sie im Formular sichtbar wird.
        let message = fnError.message;
        try {
          const errorBody = await fnError.context?.json();
          if (errorBody?.error) message = errorBody.error;
        } catch {
          // Antwort war kein JSON — dann bleibt es bei der allgemeinen Meldung.
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      // Beim Link-Import merken wir uns den Link als Quelle des Rezepts.
      onImported({ ...data.recipe, quelle: body.type === "link" ? body.url : null });
    } catch (err) {
      setError(err.message || "Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !importing && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Rezept importieren</h2>
        <p className="modal-subtitle">Claude liest den Inhalt und füllt das Formular automatisch aus.</p>

        <div className="modal-tabs">
          <Tag label="Link" selected={activeTab === "link"} onClick={() => setActiveTab("link")} />
          <Tag label="Foto" selected={activeTab === "foto"} onClick={() => setActiveTab("foto")} />
          <Tag label="Text" selected={activeTab === "text"} onClick={() => setActiveTab("text")} />
        </div>

        {activeTab === "link" && (
          <div className="input-group">
            <label htmlFor="import-link">Link zur Rezeptseite</label>
            <input
              id="import-link"
              className="input-field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        )}

        {activeTab === "foto" && (
          <div className="input-group">
            <label>Foto vom Rezept</label>
            <input
              type="file"
              accept="image/*"
              id="import-photo-input"
              style={{ display: "none" }}
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => document.getElementById("import-photo-input").click()}
            >
              {photoFile ? photoFile.name : "Foto auswählen"}
            </button>
          </div>
        )}

        {activeTab === "text" && (
          <div className="input-group">
            <label htmlFor="import-text">Rezepttext</label>
            <textarea
              id="import-text"
              className="input-field modal-textarea"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Rezepttext hier einfügen …"
              rows={6}
            />
          </div>
        )}

        {error && <p className="input-helper-error">{error}</p>}

        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? "Importiert …" : "Importieren"}
          </button>
        </div>
      </div>
    </div>
  );
}
