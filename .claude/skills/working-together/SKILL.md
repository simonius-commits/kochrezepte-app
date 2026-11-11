---
name: working-together
description: Wie Claude mit dem Nutzer an der Kochrezepte App zusammenarbeitet — Kommunikationsregeln, Design-vor-Code-Workflow, Datenmodell-Konventionen. IMMER anwenden, wenn an diesem Projekt (Kochrezepte App) gearbeitet wird: neue Features, Bugfixes, Design-Änderungen in Figma, Datenbank-Änderungen. Auch anwenden, wenn der Nutzer nach dem nächsten Schritt fragt oder unsicher ist, wie es weitergeht.
---

# Zusammenarbeit an der Kochrezepte App

Der Nutzer ist Programmier-Anfänger und baut mit Claude eine Rezepte-App (React + Vite +
Supabase), die später auch als Produkt verkauft werden könnte. Diese Skill hält fest, wie
wir dabei zusammenarbeiten — nicht was die App tut (siehe README.md und supabase/schema.sql
im Projekt für die fachlichen Details).

## Regel 1: Datei-Änderungen IMMER explizit auflisten

Das ist die wichtigste Regel. Nach JEDER Code-Änderung eine klare Liste liefern, bevor
irgendetwas anderes erklärt wird:

```
Neu hinzufügen (existieren noch nicht):
- src/pfad/zur/datei.jsx

Überschreiben (bereits vorhanden):
- src/pfad/zur/anderen/datei.jsx
```

Nicht einfach "hier sind die Änderungen" sagen und es dem Nutzer überlassen, herauszufinden,
was neu und was aktualisiert ist. Kein Schritt darf übersprungen werden, nur weil er trivial
erscheint — der Nutzer hat explizit darum gebeten, weil ihm sonst Dateien fehlen (siehe
Vorfall: Rezept-Detailseite hat nicht funktioniert, weil zwei neue Dateien nicht mitkopiert
wurden).

Nach der Liste immer das komplette Projekt neu zippen und über `present_files` bereitstellen,
damit der Nutzer bei Bedarf auch einfach alles neu entpacken kann, statt einzeln zu kopieren.

## Regel 2: Design vor Code — Figma ist die Quelle der Wahrheit fürs Aussehen

Neue UI-Screens oder -Komponenten werden zuerst in Figma gebaut (Design System:
Button, Input, Tag, Card, RecipeCard — alle tokenbasiert), dem Nutzer gezeigt und bestätigt,
bevor sie in React umgesetzt werden. Bei der Umsetzung:

- Design-Tokens müssen in `src/styles/tokens.css` (CSS-Variablen) exakt den Figma-Variablen
  entsprechen (Farben, Spacing, Radius). Nie einen Wert erfinden, der nicht aus Figma kommt.
- Komponentennamen und Struktur im Code sollen den Figma-Komponenten entsprechen (z.B.
  `RecipeCard.jsx` ↔ Figma-Komponente "Recipe Card").
- Wenn eine Design-Entscheidung technische Konsequenzen hat (z.B. Tag-basierte Single-Select
  statt Dropdown), das dem Nutzer VOR der Umsetzung transparent machen und fragen, ob das so
  gewollt ist — nicht einfach stillschweigend die einfachere Variante bauen.

**Explizite Freigabe zwischen Figma und Code (Pflicht-Stopp):** Nachdem ein Screen oder eine
Komponente in Figma gebaut wurde, NICHT direkt mit der Code-Umsetzung weitermachen. Der Nutzer
schaut sich das Design in Figma noch einmal in Ruhe an und möchte es ggf. selbst anpassen.
Nach dem Figma-Teil explizit fragen, ob das Design freigegeben ist ("Passt das Design so, oder
möchtest du noch etwas ändern, bevor ich es in Code umsetze?") und auf eine klare Bestätigung
warten, bevor die Implementierung beginnt. Das gilt für jeden neuen Screen/jede neue Komponente,
nicht nur einmalig.

## Regel 3: Klein anfangen, iterieren

Neue Features erst in einer einfachen Version bauen (z.B. Bild-URL statt echtem Datei-Upload,
Demo-Daten als Fallback ohne Supabase), das transparent als bewusste Vereinfachung kennzeichnen,
und den vollständigeren Ausbau als klaren nächsten Schritt benennen. Nicht ungefragt alles auf
einmal bauen. Bei mehreren sinnvollen nächsten Schritten: kurz die Optionen nennen und fragen,
womit weitergemacht werden soll (siehe `ask_user_input_v0`-Nutzung in diesem Projekt).

## Regel 4: Datenmodell ist der gemeinsame Nenner

Das Datenmodell (`supabase/schema.sql`) ist verbindlich für Figma-Inhalte, React-Komponenten
und Formulare gleichermaßen. Kern-Entitäten: `recipes`, `ingredients` (geteilter Stammdaten-Pool,
nicht pro Rezept dupliziert), `recipe_ingredients` (Verknüpfung mit Menge/Einheit),
`recipe_steps`, `recipe_tags`. Multi-User-Absicherung über Row Level Security ist von Anfang an
Teil des Schemas (`owner_id` + Policies) — nicht nachträglich hinzufügen, sondern bei jeder
neuen Tabelle mitdenken.

Portionen-Skalierung: Menge in `recipe_ingredients` ist eine reine Zahl; Skalierung erfolgt
über einen einfachen Faktor (`neue_portionen / portionen_standard`), keine Einheiten-Umrechnung
zwischen z.B. Gramm und EL (das ist bewusst nicht sauber lösbar und wird nicht versucht).

## Regel 5: Sprache, Ton, Erklärtiefe

- Durchgehend Deutsch, auch in Code-Kommentaren und `.md`-Dateien im Projekt.
- Der Nutzer ist Anfänger: Fachbegriffe kurz erklären, wenn sie zum ersten Mal auftauchen
  (z.B. "Row Level Security", "Hooks", "Hot Reload"). Nicht herablassend, aber auch nichts
  als bekannt voraussetzen, was nicht vorher erklärt wurde.
- Bei Bugs/Fehlern: erst gezielt Diagnose-Fragen stellen (Browser-Konsole, Network-Tab,
  Dateiinhalt prüfen), bevor spekuliert oder eine Lösung vorgeschlagen wird. Schritt-für-Schritt-
  Anleitungen (`step_card_display_v0`) für alles, was mehrere UI-Klicks außerhalb des Codes
  erfordert (Supabase Dashboard, Terminal, Finder/Explorer).
- Eigene Fehler (z.B. ein Bug im gelieferten Code) offen benennen und korrigieren, nicht
  beschönigen.

## Wann diese Skill NICHT gilt

Bei allgemeinen Fragen, die nichts mit diesem Projekt zu tun haben, gelten diese Regeln nicht.
