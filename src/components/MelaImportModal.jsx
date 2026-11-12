import { useEffect, useMemo, useState } from "react";
import Checkbox from "./Checkbox.jsx";
import Tag from "./Tag.jsx";
import { leseMelaDatei } from "../lib/melaParser.js";
import { importiereMelaRezept, istSchonVorhanden, ladeImportKontext } from "../lib/melaImport.js";

/**
 * Fenster „Aus Mela importieren“ (Figma: Screens – User → Mela-Import (v0.52)).
 * Ablauf: Datei lesen → Vorschau mit Häkchen → Import mit Fortschritt → Zusammenfassung.
 * Schon vorhandene Rezepte (gleiche Mela-Kennung oder gleicher Titel) sind abgewählt.
 */
export default function MelaImportModal({ file, onClose, onDone }) {
  const [phase, setPhase] = useState("lesen"); // lesen | vorschau | laeuft | fertig | fehler
  const [rezepte, setRezepte] = useState([]);
  const [lesefehler, setLesefehler] = useState([]);
  const [kontext, setKontext] = useState(null);
  const [vorhanden, setVorhanden] = useState(new Set()); // Indizes
  const [selected, setSelected] = useState(new Set()); // Indizes
  const [fortschritt, setFortschritt] = useState({ nr: 0, gesamt: 0, titel: "" });
  const [ergebnis, setErgebnis] = useState({ importiert: 0, hinweise: [], fehler: [] });
  const [fehlertext, setFehlertext] = useState(null);

  // Datei einlesen und mit vorhandenen Rezepten abgleichen
  useEffect(() => {
    let abgebrochen = false;
    async function lade() {
      try {
        const [{ rezepte: gelesen, fehler }, ctx] = await Promise.all([leseMelaDatei(file), ladeImportKontext()]);
        if (abgebrochen) return;
        const dup = new Set(gelesen.map((r, i) => (istSchonVorhanden(r, ctx) ? i : -1)).filter((i) => i >= 0));
        setRezepte(gelesen);
        setLesefehler(fehler);
        setKontext(ctx);
        setVorhanden(dup);
        setSelected(new Set(gelesen.map((_, i) => i).filter((i) => !dup.has(i))));
        setPhase("vorschau");
      } catch (err) {
        if (abgebrochen) return;
        setFehlertext(err.message || "Die Datei konnte nicht gelesen werden.");
        setPhase("fehler");
      }
    }
    lade();
    return () => {
      abgebrochen = true;
    };
  }, [file]);

  function toggle(i, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(i);
      else next.delete(i);
      return next;
    });
  }

  async function starteImport() {
    const auswahl = [...selected].sort((a, b) => a - b).map((i) => rezepte[i]);
    setPhase("laeuft");
    let importiert = 0;
    const hinweise = [];
    const fehler = lesefehler.map((f) => ({ titel: f, grund: "" }));
    for (let n = 0; n < auswahl.length; n++) {
      const r = auswahl[n];
      setFortschritt({ nr: n + 1, gesamt: auswahl.length, titel: r.titel });
      try {
        const res = await importiereMelaRezept(r, kontext);
        importiert++;
        if (res.hinweise.length > 0) hinweise.push({ titel: r.titel, text: res.hinweise.join("; ") });
      } catch (err) {
        fehler.push({ titel: r.titel, grund: err.message || "unbekannter Fehler" });
      }
    }
    setErgebnis({ importiert, hinweise, fehler });
    setPhase("fertig");
  }

  const anzahl = selected.size;
  const beschreibungVorschau = useMemo(() => {
    const gefunden = `${rezepte.length} ${rezepte.length === 1 ? "Rezept" : "Rezepte"} gefunden.`;
    if (vorhanden.size === 0) return gefunden;
    return `${gefunden} ${vorhanden.size} gibt es schon in deiner Sammlung – sie sind abgewählt, du kannst sie trotzdem ankreuzen.`;
  }, [rezepte, vorhanden]);

  const laeuft = phase === "laeuft";

  return (
    <div className="modal-overlay" onClick={() => !laeuft && phase !== "fertig" && onClose()}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        {phase === "lesen" && (
          <>
            <h2>Aus Mela importieren</h2>
            <p className="modal-subtitle">Datei wird gelesen …</p>
          </>
        )}

        {phase === "fehler" && (
          <>
            <h2>Aus Mela importieren</h2>
            <p className="input-helper-error">{fehlertext}</p>
            <div className="form-footer">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Schließen
              </button>
            </div>
          </>
        )}

        {phase === "vorschau" && (
          <>
            <h2>Aus Mela importieren</h2>
            <p className="modal-subtitle">{beschreibungVorschau}</p>
            {lesefehler.length > 0 && (
              <p className="field-hint">
                {lesefehler.length} Eintrag/Einträge in der Datei konnten nicht gelesen werden.
              </p>
            )}
            <div className="mela-auswahl-links">
              <button type="button" className="link-button" onClick={() => setSelected(new Set(rezepte.map((_, i) => i)))}>
                Alle auswählen
              </button>
              <button type="button" className="link-button" onClick={() => setSelected(new Set())}>
                Keine
              </button>
            </div>
            <div className="mela-liste">
              {rezepte.map((r, i) => {
                const meta = [
                  r.kategorien.join(", "),
                  r.favorit ? "Favorit" : null,
                  r.bilder.length === 0 ? "ohne Bild" : `${r.bilder.length} ${r.bilder.length === 1 ? "Bild" : "Bilder"}`,
                ].filter(Boolean);
                const dup = vorhanden.has(i);
                return (
                  <Checkbox key={i} checked={selected.has(i)} onChange={(c) => toggle(i, c)} className="mela-row">
                    <span className="mela-thumb" aria-hidden="true">
                      {r.bilder[0] && (
                        <img
                          src={`data:image/jpeg;base64,${r.bilder[0]}`}
                          alt=""
                          // Kaputtes Bild → leere Fläche statt „Bild fehlt“-Symbol
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      )}
                    </span>
                    <span className="mela-row-text">
                      <span className={`mela-row-titel${dup ? " is-vorhanden" : ""}`}>{r.titel}</span>
                      <span className="mela-row-meta">{meta.join(" · ")}</span>
                    </span>
                    {dup && <Tag label="Schon vorhanden" />}
                  </Checkbox>
                );
              })}
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary" onClick={starteImport} disabled={anzahl === 0}>
                {anzahl} {anzahl === 1 ? "Rezept" : "Rezepte"} importieren
              </button>
            </div>
          </>
        )}

        {phase === "laeuft" && (
          <>
            <h2>Rezepte werden importiert …</h2>
            <p className="modal-subtitle">
              {fortschritt.nr} von {fortschritt.gesamt} · {fortschritt.titel}
            </p>
            <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={fortschritt.gesamt} aria-valuenow={fortschritt.nr}>
              <div
                className="progress-fill"
                style={{ width: `${fortschritt.gesamt ? (fortschritt.nr / fortschritt.gesamt) * 100 : 0}%` }}
              />
            </div>
            <p className="field-hint">Bitte das Fenster offen lassen, bis der Import fertig ist.</p>
          </>
        )}

        {phase === "fertig" && (
          <>
            <h2>Import abgeschlossen</h2>
            <p className="modal-subtitle">
              {ergebnis.importiert} {ergebnis.importiert === 1 ? "Rezept" : "Rezepte"} importiert.
            </p>
            {ergebnis.hinweise.length > 0 && (
              <div className="mela-meldungen">
                <strong>
                  Bei {ergebnis.hinweise.length} {ergebnis.hinweise.length === 1 ? "Rezept" : "Rezepten"} fehlte
                  etwas – {ergebnis.hinweise.length === 1 ? "es wurde" : "sie wurden"} trotzdem importiert:
                </strong>
                <ul>
                  {ergebnis.hinweise.map((h, i) => (
                    <li key={i}>
                      {h.titel} – {h.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ergebnis.fehler.length > 0 && (
              <div className="mela-meldungen">
                <strong className="input-helper-error">
                  {ergebnis.fehler.length} {ergebnis.fehler.length === 1 ? "Rezept konnte" : "Rezepte konnten"} nicht
                  gespeichert werden:
                </strong>
                <ul>
                  {ergebnis.fehler.map((f, i) => (
                    <li key={i}>
                      {f.titel}
                      {f.grund ? ` – ${f.grund}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="form-footer">
              <button type="button" className="btn btn-primary" onClick={onDone}>
                Fertig
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
