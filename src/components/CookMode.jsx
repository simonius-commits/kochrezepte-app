import { useEffect, useRef, useState } from "react";
import { extractDurationSeconds, formatDuration } from "../lib/extractDuration.js";
import { buildHighlightSegments } from "../lib/highlightStepText.js";

// Timer-Zustände: "idle" (noch nicht gestartet), "running", "paused", "alarming" (abgelaufen,
// wartet auf "Alarm stoppen").

// ingredients: bereits skalierte Liste [{ id, menge, einheit, name }] — der Aufrufer
// (RecipeDetail) übergibt die Mengen passend zur zuletzt eingestellten Portionenzahl.
// toolNames: Liste der Hilfsmittel-Namen des Rezepts, für die Text-Hervorhebung.
export default function CookMode({ recipeTitel, steps, ingredients, toolNames = [], onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [timerState, setTimerState] = useState("idle");
  const audioRef = useRef(null);

  const currentStep = steps[stepIndex];
  const stepDuration = extractDurationSeconds(currentStep);
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;
  const ingredientNames = ingredients.map((ing) => ing.name).filter(Boolean);
  const stepSegments = buildHighlightSegments(currentStep, { ingredientNames, toolNames });

  // Beim Schrittwechsel einen eventuell laufenden Timer zurücksetzen.
  useEffect(() => {
    setRemainingSeconds(null);
    setTimerState("idle");
    stopSound();
  }, [stepIndex]);

  // Countdown, läuft nur im Zustand "running"
  useEffect(() => {
    if (timerState !== "running") return;
    if (remainingSeconds <= 0) {
      setTimerState("alarming");
      playSound();
      return;
    }
    const id = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timerState, remainingSeconds]);

  function playSound() {
    if (!audioRef.current) return;
    audioRef.current.loop = true;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Browser hat Autoplay blockiert — kein Problem, die visuelle Hervorhebung bleibt ja da.
    });
  }

  function stopSound() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  function startTimer() {
    setRemainingSeconds(stepDuration);
    setTimerState("running");
    // Audio-Element einmal im Rahmen dieser Nutzer-Interaktion "aufwecken", damit der spätere
    // automatische play()-Aufruf (wenn der Timer abläuft) von Browsern nicht blockiert wird.
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        })
        .catch(() => {});
    }
  }

  function pauseTimer() {
    setTimerState("paused");
  }

  function resumeTimer() {
    setTimerState("running");
  }

  function cancelTimer() {
    setTimerState("idle");
    setRemainingSeconds(null);
    stopSound();
  }

  function dismissAlarm() {
    setTimerState("idle");
    setRemainingSeconds(null);
    stopSound();
  }

  const displaySeconds = remainingSeconds != null ? remainingSeconds : stepDuration;

  return (
    <div className="cook-mode-overlay">
      <audio ref={audioRef} src="/sounds/timer-alarm.wav" preload="auto" />

      <div className="cook-mode-screen">
        <div className="cook-mode-topbar">
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            × Beenden
          </button>
          <span className="cook-mode-recipe-name">{recipeTitel}</span>
          <button type="button" className="btn btn-secondary" onClick={() => setShowIngredients(true)}>
            Zutaten
          </button>
        </div>

        <div className="cook-mode-progress-block">
          <span className="cook-mode-progress-label">
            Schritt {stepIndex + 1} von {steps.length}
          </span>
          <div className="cook-mode-progress-track">
            <div className="cook-mode-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="cook-mode-center">
          <div className="cook-mode-step-badge">{stepIndex + 1}</div>
          <p className="cook-mode-step-text">
            {stepSegments.map((seg, i) => (
              <span key={i} className={seg.type ? `cook-mode-highlight-${seg.type}` : undefined}>
                {seg.text}
              </span>
            ))}
          </p>

          {stepDuration != null && (
            <div
              className={`cook-mode-timer-card${timerState === "alarming" ? " cook-mode-timer-alarming" : ""}`}
            >
              <span
                className={`cook-mode-timer-value${timerState === "alarming" ? " cook-mode-timer-done" : ""}`}
              >
                {timerState === "alarming" ? "Fertig! ⏰" : formatDuration(displaySeconds)}
              </span>

              {timerState === "idle" && (
                <button type="button" className="btn btn-primary" onClick={startTimer}>
                  Timer starten
                </button>
              )}
              {timerState === "running" && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={pauseTimer}>
                    Pause
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={cancelTimer}>
                    Abbrechen
                  </button>
                </>
              )}
              {timerState === "paused" && (
                <>
                  <button type="button" className="btn btn-primary" onClick={resumeTimer}>
                    Fortsetzen
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={cancelTimer}>
                    Abbrechen
                  </button>
                </>
              )}
              {timerState === "alarming" && (
                <button type="button" className="btn btn-primary" onClick={dismissAlarm}>
                  Alarm stoppen
                </button>
              )}
            </div>
          )}
        </div>

        <div className="cook-mode-nav-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            ← Zurück
          </button>
          {isLastStep ? (
            <button type="button" className="btn btn-primary" onClick={onExit}>
              Fertig ✓
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            >
              Weiter →
            </button>
          )}
        </div>
      </div>

      {showIngredients && (
        <div className="cook-mode-ingredients-overlay" onClick={() => setShowIngredients(false)}>
          <div className="cook-mode-ingredients-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cook-mode-panel-header">
              <h2>Zutaten</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setShowIngredients(false)}>
                × Schließen
              </button>
            </div>
            <div className="detail-ingredient-list">
              {ingredients.map((ing) => (
                <div className="detail-ingredient-row" key={ing.id}>
                  {/* Mengen-Spalte immer da (auch leer), damit alle Zutaten bündig stehen */}
                  <strong>{[ing.menge, ing.einheit].filter((x) => x != null && x !== "").join(" ")}</strong>
                  <span>{ing.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
