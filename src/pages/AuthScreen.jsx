import { useState } from "react";
import { supabase, authLinkError } from "../lib/supabaseClient.js";

// Texte pro Modus (Figma: Screens – User → Sonstiges → Login / Passwort vergessen)
const TITLES = {
  login: "Kochrezepte App",
  signup: "Kochrezepte App",
  forgot: "Passwort zurücksetzen",
};
const SUBTITLES = {
  login: "Melde dich an, um deine Rezepte zu sehen.",
  signup: "Erstelle einen Account, um loszulegen.",
  forgot:
    "Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst.",
};

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Falls die App über einen abgelaufenen Passwort-Link geöffnet wurde, direkt anzeigen.
  const [error, setError] = useState(authLinkError);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    setError(null);
    setMessage(null);
    setResetLinkSent(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Registrierung erfolgreich. Falls dein Supabase-Projekt E-Mail-Bestätigung verlangt, prüfe dein Postfach — sonst kannst du dich direkt anmelden."
        );
        setMode("login");
      }
    } else {
      // Passwort vergessen: Supabase verschickt eine E-Mail mit einem Link zurück
      // in diese App. redirectTo = die Adresse, unter der die App gerade läuft.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setError(error.message);
      } else {
        // Bewusst neutral formuliert: verrät nicht, ob die E-Mail registriert ist.
        setResetLinkSent(true);
      }
    }
    setSubmitting(false);
  }

  const submitLabel = { login: "Anmelden", signup: "Registrieren", forgot: "Link senden" }[mode];

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <h1>{TITLES[mode]}</h1>
        <p className="auth-subtitle">{SUBTITLES[mode]}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          {mode !== "forgot" && (
            <div className="input-group">
              <label htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                className={`input-field${error ? " has-error" : ""}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>
          )}

          {error && <p className="input-helper-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
          {resetLinkSent && (
            <p className="auth-message">
              Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Link geschickt.
              Bitte prüfe dein Postfach (auch den Spam-Ordner).
            </p>
          )}

          {!resetLinkSent && (
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Bitte warten …" : submitLabel}
            </button>
          )}
        </form>

        {mode === "login" && (
          <button type="button" className="btn btn-ghost auth-toggle" onClick={() => switchMode("forgot")}>
            Passwort vergessen?
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost auth-toggle"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Noch keinen Account? Registrieren"
            : mode === "signup"
              ? "Schon registriert? Anmelden"
              : "Zurück zur Anmeldung"}
        </button>
      </div>
    </div>
  );
}
