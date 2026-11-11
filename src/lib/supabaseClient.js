import { createClient } from "@supabase/supabase-js";

// Diese Werte kommen aus deiner .env Datei (siehe .env.example).
// VITE_ Prefix ist Pflicht, damit Vite die Variable ins Frontend durchreicht.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Wichtig: createClient() wirft einen Fehler, wenn URL/Key fehlen — und zwar
// sofort beim Laden der Seite, noch bevor React etwas anzeigen kann. Das würde
// die ganze App mit einem weißen Bildschirm abstürzen lassen. Deshalb rufen
// wir createClient() nur auf, wenn beide Werte wirklich gesetzt sind.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Passwort-Zurücksetzen: Der Link aus der E-Mail öffnet die App mit Infos im
// "#…"-Teil der Adresse (z.B. "#access_token=…&type=recovery"). Supabase liest
// diesen Teil beim Start aus und entfernt ihn danach aus der Adresszeile —
// deshalb merken wir uns HIER, noch bevor der Client erstellt wird, ob die App
// über so einen Link geöffnet wurde.
const authHash = new URLSearchParams(window.location.hash.slice(1));
export const openedViaRecoveryLink = authHash.get("type") === "recovery";
// Abgelaufener oder schon benutzter Link → Supabase hängt eine Fehlermeldung an.
export const authLinkError = authHash.get("error_code")
  ? authHash.get("error_code") === "otp_expired"
    ? "Der Link ist abgelaufen oder wurde schon benutzt. Bitte fordere einen neuen an."
    : authHash.get("error_description") || "Der Link ist ungültig."
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase ist noch nicht eingerichtet (.env fehlt) — die App läuft im Demo-Modus mit Beispiel-Rezepten."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
