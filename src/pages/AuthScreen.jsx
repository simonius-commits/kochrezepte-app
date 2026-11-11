import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Registrierung erfolgreich. Falls dein Supabase-Projekt E-Mail-Bestätigung verlangt, prüfe dein Postfach — sonst kannst du dich direkt anmelden."
        );
        setMode("login");
      }
    }
    setSubmitting(false);
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <h1>Kochrezepte App</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Melde dich an, um deine Rezepte zu sehen."
            : "Erstelle einen Account, um loszulegen."}
        </p>

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

          {error && <p className="input-helper-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost auth-toggle"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "login"
            ? "Noch keinen Account? Registrieren"
            : "Schon registriert? Anmelden"}
        </button>
      </div>
    </div>
  );
}
