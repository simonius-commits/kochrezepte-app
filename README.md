# Kochrezepte App

Startprojekt: React (Vite) + Supabase. Passend zum Design-System aus Figma und zum
besprochenen Datenmodell (Rezepte, Zutaten, Schritte, Tags).

## Was ist schon drin?

- Lauffähige React-App mit Demo-Rezepten (funktioniert sofort, auch ohne Supabase)
- Design-Tokens (`src/styles/tokens.css`) 1:1 aus dem Figma Design System übernommen
- Komponenten: `Tag`, `RecipeCard`
- Seite: `RecipesOverview` (Header, Suche, Filter, Grid) — Pendant zum Figma-Screen
- Supabase-Client vorbereitet (`src/lib/supabaseClient.js`)
- SQL-Schema für die Datenbank (`supabase/schema.sql`) — inkl. Multi-User-Absicherung (Row Level Security)

## Voraussetzungen

- [Node.js](https://nodejs.org) (Version 18 oder neuer) installiert
- Ein [GitHub](https://github.com)-Account (für dein Repository)
- Ein [Supabase](https://supabase.com)-Account (kostenlos)

## 1. Projekt lokal starten

```bash
npm install
npm run dev
```

Öffne danach die angezeigte lokale Adresse (meist `http://localhost:5173`) im Browser.
Du solltest die drei Demo-Rezepte sehen — die App läuft an diesem Punkt bereits vollständig,
nur noch ohne echte Datenbank.

## 2. Supabase einrichten

1. Auf [supabase.com](https://supabase.com) einloggen und **"New Project"** klicken
2. Projektnamen vergeben (z.B. `kochrezepte-app`), Passwort setzen, Region wählen (z.B. Frankfurt)
3. Nach dem Erstellen: **Project Settings → API** öffnen
4. `Project URL` und `anon public` Key kopieren
5. Im Projektordner: `.env.example` zu `.env` kopieren und die beiden Werte eintragen

```bash
cp .env.example .env
```

6. Im Supabase Dashboard: **SQL Editor → New query** öffnen
7. Inhalt von `supabase/schema.sql` einfügen und **Run** klicken — das legt alle Tabellen
   (`recipes`, `ingredients`, `recipe_ingredients`, `recipe_steps`, `recipe_tags`) inkl.
   Zugriffsschutz an
8. **Authentication → Providers** → E-Mail-Login ist standardmäßig aktiv (reicht für den Start)

Nach `npm run dev` neu starten — sobald du über Supabase eigene Rezepte anlegst, ersetzen sie
automatisch die Demo-Daten.

## 3. Auf GitHub sichern

```bash
git init
git add .
git commit -m "Initial commit: Kochrezepte App Grundgerüst"
```

Dann auf GitHub ein neues (leeres) Repository anlegen und den angezeigten Anweisungen
folgen (`git remote add origin ...`, `git push`).

## Projektstruktur

```
src/
  components/    # Tag, RecipeCard — wiederverwendbare UI-Bausteine
  pages/         # RecipesOverview — die Rezeptübersicht
  lib/           # supabaseClient.js — Datenbankverbindung
  styles/        # tokens.css — Design-Tokens aus Figma
supabase/
  schema.sql     # Datenbank-Struktur zum Ausführen in Supabase
```

## Nächste Schritte (siehe Roadmap)

- Formular zum manuellen Anlegen eines Rezepts (Phase 1 abschließen)
- Login/Registrierung über Supabase Auth einbinden
- KI-Import: Foto/Link → automatisch strukturiertes Rezept (Phase 2)

## Edge Function "import-recipe" deployen

Diese Funktion läuft serverseitig bei Supabase und ruft dort sicher die Anthropic API auf
(der API-Key bleibt als Supabase Secret hinterlegt, taucht nie im Frontend-Code auf).

1. [Supabase CLI installieren](https://supabase.com/docs/guides/cli), falls noch nicht vorhanden:
   ```bash
   npm install -g supabase
   ```
2. Im Projektordner einloggen und mit deinem Supabase-Projekt verknüpfen:
   ```bash
   supabase login
   supabase link --project-ref DEIN-PROJEKT-REF
   ```
   (Die Projekt-Ref findest du in der Supabase-Projekt-URL oder unter Project Settings.)
3. Funktion deployen:
   ```bash
   supabase functions deploy import-recipe
   ```
4. Der `ANTHROPIC_API_KEY` sollte bereits als Secret im Supabase Dashboard hinterlegt sein
   (Edge Functions → Secrets). Falls nicht, dort nachtragen — niemals in Code oder `.env`.

## Auf mehreren Rechnern arbeiten

Das Projekt liegt in einem privaten GitHub-Repository. So hältst du die Rechner synchron:

- **Bevor du anfängst:** neuesten Stand holen
  ```bash
  git pull
  ```
- **Wenn du fertig bist:** Änderungen hochladen
  ```bash
  git add -A
  git commit -m "Kurze Beschreibung der Änderung"
  git push
  ```

Auf einem **neuen Rechner** einmalig einrichten:

1. [Node.js](https://nodejs.org) (Version 18 oder neuer) installieren
2. Repository herunterladen und Pakete installieren:
   ```bash
   git clone https://github.com/DEIN-NAME/kochrezepte-app.git
   cd kochrezepte-app
   npm install
   ```
3. `.env` anlegen (`cp .env.example .env`) und die beiden Supabase-Werte eintragen —
   die `.env` ist bewusst nicht im Repository, weil sie Zugangsdaten enthält.
4. `npm run dev` starten
