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

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase ist noch nicht eingerichtet (.env fehlt) — die App läuft im Demo-Modus mit Beispiel-Rezepten."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
