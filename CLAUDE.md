# Kochrezepte App — Übergabe für Claude

Diese Datei fasst zusammen, was in früheren Sitzungen mit Claude passiert ist, damit die Arbeit
auf jedem Rechner nahtlos weitergehen kann. **Bitte aktuell halten**, wenn sich etwas Wichtiges
ändert (neue Konventionen, offene Punkte erledigt, neue Entscheidungen).

## Zuerst lesen

- **Zusammenarbeits-Regeln:** `.claude/skills/working-together/SKILL.md` — gilt für jede Arbeit
  an diesem Projekt (Deutsch, Anfänger-gerecht erklären, Figma vor Code mit expliziter Freigabe,
  Datei-Änderungen immer als Liste „Neu hinzufügen / Überschreiben“).
- **Fachliches & Setup:** `README.md`
- **Datenmodell (verbindlich):** `supabase/schema.sql`

## Über den Nutzer

- Programmier-Anfänger, arbeitet mit der Claude Desktop-App (Code-Tab).
- Arbeitet abwechselnd auf zwei Rechnern → Projekt liegt auf GitHub (siehe unten).
- Möchte Design-Änderungen immer zuerst in Figma sehen und gibt sie ausdrücklich frei
  („freigegeben“), bevor Code geschrieben wird.

## Technik

- React 18 + Vite 5, Icons über `lucide-react`, Backend Supabase (Auth, Postgres mit
  Row Level Security, Edge Function `import-recipe`).
- Start: `npm install`, dann `npm run dev` → http://localhost:5173
- `.env` (nicht im Repo!) braucht `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`,
  Vorlage: `.env.example`.
- Edge Function `supabase/functions/import-recipe` ruft die Anthropic API auf
  (Modell `claude-haiku-4-5-20251001`). Der `ANTHROPIC_API_KEY` liegt als Supabase Secret —
  wurde am 22.10.2026 erneuert, weil der alte ungültig war.

## Konventionen im Code

- **Versionsnummer:** `src/version.js` bei jedem Update um 0.01 erhöhen (aktuell **0.44**).
  Wird in der Sidebar angezeigt, so sieht der Nutzer, ob Hot Reload den neuen Stand hat.
- Design-Tokens in `src/styles/tokens.css` entsprechen 1:1 den Figma-Variablen —
  keine Werte erfinden.
- Kommentare und Texte im Projekt auf Deutsch.
- Card-Menüs („…“-Button unten rechts) laufen über `src/components/CardOptionsMenu.jsx`;
  Umbenennen in Cards über `src/components/RenamableTitle.jsx`.
- Aktionen: `src/lib/recipeActions.js` (Rezept duplizieren/löschen),
  `src/lib/entityActions.js` (Kochbuch/Sammlung/Kategorie/Tag umbenennen/löschen).
- Die Regel „Projekt zippen und über present_files bereitstellen“ aus der Skill gilt in der
  Desktop-App nicht — Claude bearbeitet die Dateien dort direkt im Projektordner.

## Figma

- Datei: https://www.figma.com/design/ohcJ8ZKOOzS8OhObqlLiGB/Kochrezepte-App-%E2%80%93-Design-System
- Wichtige Seiten: **Screens – User** (Abschnitte pro Bereich, u.a. „Rezept Details“,
  „Card-Optionen“), **Screens – Admin**, Komponenten-Seiten **Recipe Card**, **Entity Cards**,
  **Icon Button** (Komponente mit Icon-Tausch, Icon „More Horizontal“ = „…“), **Icons**.
- Es gibt noch kein Icon für „externer Link“ — auf der Detailseite wird dafür das Zeichen ↗ benutzt.

## Git & GitHub

- Repository (privat): https://github.com/simonius-commits/kochrezepte-app
- Branch `main`. Commit-Autor ist lokal gesetzt auf `simonius-commits` mit der anonymen
  GitHub-Adresse — nicht die private E-Mail verwenden.
- Ablauf: vor dem Arbeiten `git pull`, danach `git add -A`, `git commit`, `git push`.
- In der Claude-Sandbox brauchen Schreibzugriffe auf `.git` die Zustimmung des Nutzers.

## Verlauf (was zuletzt gebaut wurde)

| Version | Änderung |
|---|---|
| 0.39 | User-Feedback-Backlog (Kontaktformular, Admin-Seite „User-Feedback“), Impressum, ein-/ausklappbare Gruppen |
| 0.40 | Sidebar passt immer auf den Bildschirm, unterer Bereich bleibt unten (sticky, Mitte scrollt) |
| 0.41 | Import-Fenster zeigt die echte Fehlermeldung der Edge Function statt „non-2xx status code“ |
| 0.42 | Bugfix: Absturz beim Speichern importierter Rezepte (`ing.notiz.trim`) |
| 0.43 | Rezept-Quelle: Feld „Quelle (Link)“ in Einordnung, Link „Quelle: domain ↗“ auf der Detailseite; beim Link-Import wird Kochbuch = erkanntes Buch, sonst die Domain |
| 0.44 | „…“-Menü unten rechts in allen Cards (Rezept: Bearbeiten/Duplizieren/Löschen; Kochbuch/Sammlung/Kategorie/Tag: Umbenennen/Löschen; Zutaten/Hilfsmittel unverändert, nur verschoben) |

Getroffene Entscheidungen:
- Kochbuch/Sammlung/Kategorie/Tag dürfen gelöscht werden, auch wenn Rezepte zugeordnet sind —
  nach Sicherheitsabfrage, die Rezepte bleiben, nur die Zuordnung fällt weg. (Rezepte →
  Kochbuch/Kategorie haben kein „on delete set null“, deshalb löst `deleteEntity` die
  Zuordnung vorher im Code.)
- Rezept duplizieren: Kopie heißt „… (Kopie)“, enthält alles, öffnet direkt das Bearbeiten-Formular.
- Auf der Detailseite stehen „aus „Kochbuch““ und „Quelle: domain ↗“ beide, auch wenn gleich.

## Offene Punkte / ungeprüft

- **Nicht im Browser getestet:** v0.43 und v0.44 — Claude konnte sich nicht in die App einloggen.
  Vom Nutzer noch nicht bestätigt, ob Quelle und „…“-Menüs funktionieren.
- **Spalte `recipes.quelle`** steht in `schema.sql`, ist aber evtl. in der echten Datenbank
  nie angelegt worden. Falls beim Speichern „column quelle … not found“ kommt:
  `alter table recipes add column if not exists quelle text;` im Supabase SQL Editor.
- **`feedback_items`:** `schema.sql` verweist auf `migration-user-feedback.sql`, die Datei
  existiert nicht. Unklar, ob die Tabelle in Supabase angelegt ist.
- Ideen für später: Import könnte Zutaten-Notizen („fein gehackt“) mit übernehmen;
  echtes „externer Link“-Icon im Design System.
