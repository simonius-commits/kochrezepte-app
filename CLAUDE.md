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

- **Versionsnummer:** `src/version.js` bei jedem Update um 0.01 erhöhen (aktuell **0.57**).
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

## Hosting (online seit 11.11.2026)

- Live unter **https://rezepte.simonius.de** (zusätzlich `kochrezepte-app.vercel.app`).
- Hosting: **Vercel**, Tarif Hobby, per GitHub mit `main` verbunden → jeder `git push`
  veröffentlicht automatisch. Umgebungsvariablen `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  sind in Vercel hinterlegt (Project Settings → Environment Variables).
- Domain simonius.de liegt bei **HostEurope** (DNS über GoDaddy-Server). Dort nur ein
  CNAME `rezepte` → `3a63a6f57e1d87ad.vercel-dns-017.com.` — Rest der Domain unberührt.
- Supabase (Authentication → URL Configuration): Site URL `https://rezepte.simonius.de`,
  Redirect URLs enthalten zusätzlich `http://localhost:5173`. Login live getestet am 11.11.2026.
- Keine `vercel.json` nötig: Die App hat keine Unterseiten-URLs, alles läuft über `/`.
- **Achtung Produkt-Launch:** Vercel Hobby ist nur für nicht-kommerzielle Nutzung. Vor einem
  Verkauf auf Vercel Pro wechseln oder zu Netlify/Cloudflare Pages umziehen (einfach, da
  statische Seite). Außerdem dann: Supabase Pro (Free pausiert bei Inaktivität), EU-Region,
  Datenschutzerklärung/AGB/AV-Verträge.

## Figma

- **Aktuelle Datei (bearbeitbar, in „Simon Beckmann's team“):**
  https://www.figma.com/design/NymEYF5ZmMBEEI4b7VxBXG/Kochrezepte-App-%E2%80%93-Design-System--Copy-
  (fileKey `NymEYF5ZmMBEEI4b7VxBXG`, Node-IDs identisch zur alten Datei).
- Alte Datei `ohcJ8ZKOOzS8OhObqlLiGB` liegt im Team „neusta“ (dort nur View-Seat) — NICHT mehr
  verwenden, Claude kann dort nicht schreiben.
- **Icons:** Lucide-Icons-Datei https://www.figma.com/design/mWkpMMYYqEwP7jNoq4UCX9/Lucide-Icons--Kochrezepte-App-
  (fileKey `mWkpMMYYqEwP7jNoq4UCX9`) — passt zu `lucide-react` im Code.
- Wichtige Seiten: **Screens – User** (Abschnitte pro Bereich, u.a. „Rezept Details“,
  „Card-Optionen“), **Screens – Admin**, Komponenten-Seiten **Recipe Card**, **Entity Cards**,
  **Icon Button** (Komponente mit Icon-Tausch, Icon „More Horizontal“ = „…“), **Icons**.
- Figma-Connector ist in der Desktop-App verbunden (seit 11.11.2026). Variablen auslesen geht
  über die Frames (in der aktuellen Datei) „Farb-Tokens: Light Mode“ (Node `156:4`) und „… Dark Mode“ (Node `156:66`)
  auf der Seite Foundations — ohne konkreten Frame meldet das Tool „nothing selected“.
- Figma-Team ist seit 11.11.2026 auf **Professional** (vorher Starter: MCP-Kontingent war schnell
  aufgebraucht, max. 3 Seiten). Neue Komponenten
  auf passende bestehende Seiten legen — z.B. **Checkbox** liegt auf der Seite „Input“.
- Icons auf der Seite „Icons“ sind aus Lucide nachgebaut (20×20, Strich 2, Farbe text/tertiary),
  u.a. Chevron Down/Up, More Horizontal, Check, Trash 2.
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
| 0.45 | Passwort vergessen: Link im Login → E-Mail mit Link (`resetPasswordForEmail`, redirectTo = aktuelle App-Adresse) → Screen „Neues Passwort festlegen“ (`NewPasswordScreen.jsx`), danach direkt eingeloggt. Abgelaufener Link → Fehlermeldung im Login. Figma: Screens – User → Sonstiges |
| 0.46 | Einkaufsliste: Button „Für das Rezept einkaufen“ (Detailseite) → Modal mit Checkboxen (alle vorausgewählt) → Seite „Einkaufen“ (Akkordeon pro Rezept, abhaken, Rezept entfernen). Rezept schon auf der Liste → Rückfrage Ersetzen / Mengen addieren. Tabellen `shopping_list_recipes` + `shopping_list_items` (`supabase/migration-einkaufsliste.sql`, in Supabase ausgeführt). Figma: Screens – User → Einkaufsliste |
| 0.47 | Einkaufen: Tabs „Nach Rezepten | Alle Zutaten“ (Tags wie im Import-Modal). „Alle Zutaten“: eine Zeile pro Zutat über alle Rezepte, Mengen pro Einheit summiert („150 ml + 10 EL“), Unterzeile mit Rezepten; Umschalter „Nach Kategorie | Alphabetisch“ (ViewSwitcher mit `options`). Abhaken gilt für alle Rezepte. |
| 0.48 | Einkaufen: Sektion „Eingekauft/Vorhanden“ — abgehakte Zutaten wandern sofort nach unten (pro Rezept als kleine graue Überschrift; bei „Alle Zutaten“ eigene Gruppe ganz unten, auch bei „Alphabetisch“), klappbar, standardmäßig offen. Kategorien mit nur Erledigtem verschwinden. Figma: Screens – User → Einkaufsliste (2 neue Screens) |
| 0.49 | Modal „Für das Rezept einkaufen“ zeigt nur noch die Ware, nicht mehr „, Notiz“. Import-Prompt der Edge Function fragt jetzt ausdrücklich `notiz` getrennt vom Namen ab (Stand 12.11.2026: in der DB gab es keine Zutatennamen mit Komma — Notizen lagen schon korrekt in `recipe_ingredients.notiz`) |
| 0.50 | Rezept-Erweiterung (Vorbereitung Mela-Import, „keine Information soll wegfallen“): mehrere Bilder (`recipe_images`, Reihenfolge 0 = Titelbild; Galerie auf der Detailseite, im Formular hinzufügen/← →/×), `notizen`, `naehrwerte_text`, `portionen_text`, `gesamtzeit_min`, `favorit` (Herz auf der Card), `will_kochen` (beide per Klick auf der Detailseite), Gruppen bei Zutaten und Schritten (`gruppe`), `reihenfolge` für Zutaten, `import_quelle`/`import_id`. Migration `supabase/migration-rezept-erweiterung.sql` (in Supabase ausgeführt). Figma: Screens – User → Rezept-Erweiterung (v0.50) |
| 0.51 | Galerie: unter dem großen Bild stehen nur die anderen Bilder (das große nicht doppelt); Klick auf eine Vorschau tauscht sie mit dem großen Bild |
| 0.52 | Seite **Einstellungen** (`SettingsPage.jsx`) mit „Aus Mela importieren“: `.melarecipes`/`.melarecipe` wählen → `MelaImportModal.jsx` (Vorschau mit Häkchen, „Schon vorhanden“ abgewählt → Fortschritt → Zusammenfassung mit Hinweisen). Parser `src/lib/melaParser.js` (JSZip und heic2any, beide erst bei Bedarf geladen), Speichern `src/lib/melaImport.js`. Einheit wird jetzt auch ohne Menge angezeigt („Prise Zimt“). Figma: Screens – User → Mela-Import (v0.52) |
| 0.53 | Zutatenliste (Detailseite + Kochmodus): keine grünen Aufzählungspunkte mehr, Mengen-Spalte (80 px) rechtsbündig und immer vorhanden → Zutaten ohne Menge stehen bündig. Mela-Import: Titel komplett in GROSSBUCHSTABEN werden normal geschrieben (`normalisiereTitel`: jedes Wort groß, Füllwörter wie „mit/und/vom“ klein); englische Einheiten (tablespoon, litre, pinch …) erkannt. Figma: Rezept Detail (erweitert) angepasst |
| 0.54 | Mela-Import erkennt Überschriften in der Zutatenliste (`pruefeUeberschrift`): reine Überschriften/Portionsangaben („ZUTATEN FÜR 4 PERSONEN“, „Ingredients“, „Portionen: 12“) fallen weg (Portionen werden übernommen, wenn das Rezept keine hat); Zwischenüberschriften („Für die Sauce“, „DRESSING“, „Burger sauce:“) → Gruppe; „Optional: 1 Paprika“ → Zutat mit Notiz „Optional“. Großbuchstaben-Regel nur, wenn die übrige Liste normal geschrieben ist. Geprüft an allen 617 Rezepten der Nutzer-Datei |
| 0.55 | „…“-Button sitzt in ALLEN Cards an derselben Stelle (absolut, 16 px von rechts/unten; Footer halten 36 px frei). Menü klappt direkt unter dem Button auf, linke Kante bündig; ragt es aus dem Fenster, klappt es nach links (`useMenuNachLinks`). Gilt auch für „Kategorie zuordnen“ in der Zutaten-Card. Figma: Card-Optionen angepasst; Button-Komponente hat neue Variante **Style=Danger** (feedback/error) |
| 0.56 | Eigener Lösch-Dialog statt `window.confirm` an allen 10 Stellen (folgt Light/Dark Mode): `bestaetigen({ titel, text })` aus `src/lib/bestaetigen.js` liefert ein Promise (true/false), Anzeige über `ConfirmDialogHost.jsx` (einmal in App.jsx). Fokus auf „Abbrechen“, Escape/Klick daneben = Abbrechen. Neuer Button-Stil `.btn-danger`. Figma: Card-Optionen → Lösch-Dialog Light/Dark |
| 0.57 | **Handy-Ansicht** (< 768 px, ein `@media`-Block am Ende von `index.css`): Sidebar weg, `MobileNav.jsx` mit Leiste unten (Rezepte · Einkaufen · Sammlungen · Mehr; „Mehr“ öffnet Menü von unten mit allen übrigen Bereichen, Menüpunkte aus `Sidebar.jsx` exportiert). Ränder 16 px; Detailseite: Buttons untereinander volle Breite, Bild 220 px; Formular: Zutat zweizeilig (Menge·Einheit·Zutat·×, darunter Notiz); Kochmodus kleiner. Am Computer unverändert. Figma: Komponente „Mobile Tab Bar“ (Seite Sidebar), Screens – User → Mobil (v0.57); Recipe-Card-Komponente: Bild dehnt sich mit (Constraints) |

Getroffene Entscheidungen:
- Einkaufsliste: gleiche Zutat + gleiche Einheit innerhalb eines Rezepts wird zu einer Zeile
  zusammengefasst; Addieren nur bei gleicher Einheit (keine Umrechnung). Zutaten-Notizen
  („gewürfelt“) werden nicht auf die Liste übernommen. Sortierung beim Laden: offene zuerst,
  dann alphabetisch. Abgehakte Zutaten springen sofort in „Eingekauft/Vorhanden“ (bewusst so
  gewollt: einfacher beim Einkaufen). Nach dem Hinzufügen schließt das Modal ohne Erfolgsmeldung (nicht im Design).
- Kochbuch/Sammlung/Kategorie/Tag dürfen gelöscht werden, auch wenn Rezepte zugeordnet sind —
  nach Sicherheitsabfrage, die Rezepte bleiben, nur die Zuordnung fällt weg. (Rezepte →
  Kochbuch/Kategorie haben kein „on delete set null“, deshalb löst `deleteEntity` die
  Zuordnung vorher im Code.)
- Rezept duplizieren: Kopie heißt „… (Kopie)“, enthält alles, öffnet direkt das Bearbeiten-Formular.
- Auf der Detailseite stehen „aus „Kochbuch““ und „Quelle: domain ↗“ beide, auch wenn gleich.
- Bilder: `recipes.bild_url` bleibt als Kopie des Titelbilds (wird beim Speichern gesetzt), damit
  Cards/Listen ohne Extra-Abfrage auskommen. Umsortieren per Pfeilen, Drag & Drop bewusst später.
- Gruppen: Gruppen-Zeilen stehen im Formular in derselben Liste wie Zutaten/Schritte und gelten
  für alle folgenden Zeilen. Neue Gruppen werden unten angehängt (Zutaten verschieben gibt es
  noch nicht). Schrittnummern laufen über Gruppen hinweg durch.
- Duplizieren: Import-Kennung (`import_quelle`/`import_id`) bleibt nur beim Original.
- **Mela-Import (umgesetzt in v0.52):** Unvollständige Rezepte werden IMMER importiert
  (kein Titel → „Ohne Titel“, kaputtes Bild → ohne dieses Bild) und als Hinweis gemeldet; nur
  wenn das Rezept selbst nicht gespeichert werden kann, ist es ein Fehler. Kein Abbrechen
  während des Imports. Bewusst doppelt importiert → ohne `import_id` gespeichert.
  Einstellungen → „Aus Mela importieren“ →
  `.melarecipes` (ZIP mit JSON je Rezept, Bilder Base64) im Browser entpacken (JSZip) →
  Vorschau mit Häkchen, Duplikate (gleicher Titel bzw. gleiche `import_id`) markiert und
  abgewählt → Import mit Fortschritt → Zusammenfassung. Zutaten per festen Regeln zerlegen
  (Menge, Einheit, Ware bis zum ersten Komma, Rest = Notiz; `#`-Zeilen = Gruppe). Mela-Kategorien:
  gibt es eine gleichnamige Kategorie, wird die erste davon die Kategorie, der Rest Tags.
  Alle Bilder übernehmen, `date` → `created_at`.

## Offene Punkte / ungeprüft

- **Konvention Handy:** Neue Seiten/Komponenten immer auch bei 375 px Breite prüfen (Browser-Pane
  `resize_window` preset mobile). Mobile Regeln gehören in den `@media (max-width: 767px)`-Block
  am Ende von `index.css`. Geprüft am 12.11.2026: alle 11 Bereiche ohne seitliches Überstehen.
- **Konvention:** Für Sicherheitsabfragen immer `await bestaetigen({ titel, text })` benutzen,
  nie `window.confirm` (sieht im Dark Mode falsch aus).

- **v0.52 Mela-Import:** Ablauf im Browser mit selbst erzeugter Testdatei geprüft (3 Rezepte:
  Bilder, Gruppen, ohne Titel, kaputtes Bild; zweiter Import → alle „Schon vorhanden“).
  Parser-Probelauf (ohne Speichern) mit der echten Datei des Nutzers (617 Rezepte, 177 MB,
  487 Bilder/129 MB): Feldnamen passen, Datum = Apple-Sekunden, 0 Lesefehler. Zeiten auch als
  „1:30“/„T02:00“; Text im Zeitfeld → Notizen; „Für 4 Portionen“ = normale Portionen.
  Beschleunigt: Rezepte/Kategorien/Zutaten/Tags einmal seitenweise geladen (Supabase-Limit
  1000 Zeilen!), fehlende Zutaten/Tags pro Rezept gesammelt angelegt, Zeilen je Tabelle in
  einer Anfrage. HEIC-Bilder (15 Stück in der Datei) werden per `heic2any` (nur bei Bedarf
  geladen) in JPEG umgewandelt. Echter Test am 12.11.2026: Datei (186 MB) in ~3 s gelesen,
  3 echte Rezepte in 3,6 s importiert (inkl. HEIC) → für alle ca. 5–10 Min. erwartet.
  **Offen:** den großen Import macht der Nutzer selbst.
  Testrezepte „Mela-Test: …“, „Ohne Titel“ und Tag „Mela-Test-Tag“ wieder löschen.
- **Rezept-Beschreibung** (`recipes.beschreibung`, Mela `text`) wird gespeichert, aber weder auf
  der Detailseite angezeigt noch im Formular bearbeitbar → Design in Figma nötig.

- **v0.50 geprüft am 12.11.2026 (im Browser, eingeloggt):** Formular lädt bestehendes Rezept
  mit allen neuen Feldern; Testrezept „Testrezept v0.50 (bitte löschen)“ angelegt → Gesamtzeit,
  Portionen-Text, Favorit (Herz auf Card), Gruppen, Notizen, Nährwerte-Text korrekt gespeichert
  und angezeigt; „Möchte ich kochen“ per Klick gespeichert. Mehrere Bilder hochladen hat der
  Nutzer getestet; v0.51-Galerie (4 Bilder → 3 Vorschauen, Tauschen per Klick) im Browser
  geprüft. **Nicht geprüft:** Duplizieren mit Bildern.

- **Geprüft am 12.11.2026 (im Browser, eingeloggt):** v0.48 „Eingekauft/Vorhanden“ in beiden
  Tabs, Abhaken → sofort nach unten, Haken raus → zurück. v0.49 Modal zeigt nur die Ware.
- **v0.49 Import-Prompt:** Edge Function `import-recipe` ist noch nicht neu deployt (kein
  Supabase-CLI installiert → im Dashboard unter Edge Functions den Code ersetzen).


- **v0.45 Passwort vergessen:** Oberfläche im Browser geprüft; der echte Ablauf (E-Mail →
  Link → neues Passwort) ist noch nicht durchgespielt. Voraussetzung in Supabase:
  Authentication → URL Configuration → Redirect URLs muss die App-Adresse enthalten
  (`http://localhost:5173`, ggf. `http://localhost:5174`, später die echte Domain).
- **Geprüft am 11.11.2026 (im Browser, eingeloggt):** v0.43 Quelle-Link auf der Detailseite
  funktioniert, Spalte `recipes.quelle` existiert. v0.44 „…“-Menüs öffnen sich in allen Cards
  mit den richtigen Einträgen (Aktionen selbst wie Löschen/Umbenennen nicht ausgeführt).
  Tabelle `feedback_items` existiert in Supabase (Verweis auf die fehlende
  `migration-user-feedback.sql` in `schema.sql` ist trotzdem noch aufzuräumen).
- **Login-Probleme auf einem Rechner?** Zuerst `.env` prüfen: Auf dem zweiten Rechner war sie
  eine unveränderte Kopie von `.env.example` (Platzhalter) → Fehler „Load failed“.
- Ideen für später: echtes „externer Link“-Icon im Design System.
