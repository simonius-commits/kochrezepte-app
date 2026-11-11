import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

/**
 * Screen "Neues Passwort festlegen" (Figma: Screens – User → Sonstiges).
 * Erscheint, wenn die App über den Link aus der "Passwort zurücksetzen"-E-Mail
 * geöffnet wurde. Supabase hat den Nutzer dabei schon eingeloggt — hier wird nur
 * noch das neue Passwort gespeichert. Danach geht es direkt in die App (onDone).
 */
export default function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== passwordRepeat) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      onDone();
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <h1>Neues Passwort festlegen</h1>
        <p className="auth-subtitle">Wähle ein neues Passwort mit mindestens 6 Zeichen.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="new-password">Neues Passwort</label>
            <input
              id="new-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="new-password-repeat">Passwort wiederholen</label>
            <input
              id="new-password-repeat"
              type="password"
              className={`input-field${error ? " has-error" : ""}`}
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="input-helper-error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Bitte warten …" : "Passwort speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
