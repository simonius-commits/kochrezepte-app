import { useRef, useState } from "react";
import { FileDown } from "lucide-react";
import MelaImportModal from "../components/MelaImportModal.jsx";

/**
 * Seite „Einstellungen“ (Figma: Screens – User → Mela-Import (v0.52)).
 * Bisher ein Bereich: Rezepte aus anderen Apps importieren (zuerst Mela).
 */
export default function SettingsPage({ onNavigate }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = ""; // erlaubt, dieselbe Datei noch einmal zu wählen
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>Einstellungen</h1>
      </div>
      <p className="impressum-intro">Rezepte aus anderen Apps übernehmen.</p>

      <h2 className="settings-section-title">Rezepte importieren</h2>
      <div className="admin-list">
        <div className="admin-row">
          <FileDown size={24} className="settings-row-icon" aria-hidden="true" />
          <div className="admin-row-text">
            <span className="admin-row-name">Aus Mela importieren</span>
            <span className="settings-row-description">
              Exportdatei aus Mela (.melarecipes oder .melarecipe) auswählen. Alle Rezepte inkl. Bildern werden
              übernommen; du siehst vorher eine Vorschau.
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".melarecipes,.melarecipe"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            Datei auswählen
          </button>
        </div>
      </div>
      <p className="settings-hint">
        Weitere Apps folgen. Schreib uns gerne als Feedback, welche Apps wir zum Importieren von Rezepten anbieten
        sollen.
      </p>

      {file && (
        <MelaImportModal
          file={file}
          onClose={() => setFile(null)}
          onDone={() => {
            setFile(null);
            onNavigate?.("rezepte");
          }}
        />
      )}
    </div>
  );
}
