// Detail-Daten für die Demo-Rezepte aus RecipesOverview.jsx.
// Wird verwendet, solange Supabase noch keine echten Rezepte enthält.
export const DEMO_RECIPE_DETAILS = {
  "demo-1": {
    id: "demo-1",
    titel: "Pasta Carbonara",
    kategorie: "Hauptgericht",
    schwierigkeit: "mittel",
    zubereitungszeit_min: 10,
    kochzeit_min: 15,
    portionen_standard: 4,
    bild_url: null,
    tags: ["vegetarisch", "schnell"],
    ingredients: [
      { id: "d1-1", menge: 200, einheit: "g", name: "Spaghetti" },
      { id: "d1-2", menge: 100, einheit: "g", name: "Speck, gewürfelt" },
      { id: "d1-3", menge: 2, einheit: "Stück", name: "Eier" },
      { id: "d1-4", menge: 50, einheit: "g", name: "Parmesan, gerieben" },
    ],
    steps: [
      "Wasser für die Pasta salzen und aufkochen. Spaghetti nach Packungsanweisung kochen.",
      "Speck in einer Pfanne knusprig braten.",
      "Eier mit Parmesan verquirlen, mit den heißen Spaghetti und dem Speck vermengen.",
    ],
  },
  "demo-2": {
    id: "demo-2",
    titel: "Griechischer Salat",
    kategorie: "Beilage",
    schwierigkeit: "einfach",
    zubereitungszeit_min: 15,
    kochzeit_min: 0,
    portionen_standard: 4,
    bild_url: null,
    tags: ["vegan", "schnell"],
    ingredients: [
      { id: "d2-1", menge: 2, einheit: "Stück", name: "Tomaten" },
      { id: "d2-2", menge: 1, einheit: "Stück", name: "Gurke" },
      { id: "d2-3", menge: 100, einheit: "g", name: "Kalamata-Oliven" },
      { id: "d2-4", menge: 150, einheit: "g", name: "Feta" },
    ],
    steps: [
      "Tomaten und Gurke in Stücke schneiden.",
      "Mit Oliven und Feta vermengen, mit Olivenöl beträufeln.",
    ],
  },
  "demo-3": {
    id: "demo-3",
    titel: "Linsen-Curry",
    kategorie: "Hauptgericht",
    schwierigkeit: "einfach",
    zubereitungszeit_min: 10,
    kochzeit_min: 25,
    portionen_standard: 4,
    bild_url: null,
    tags: ["vegan"],
    ingredients: [
      { id: "d3-1", menge: 250, einheit: "g", name: "rote Linsen" },
      { id: "d3-2", menge: 400, einheit: "ml", name: "Kokosmilch" },
      { id: "d3-3", menge: 1, einheit: "Stück", name: "Zwiebel" },
      { id: "d3-4", menge: 2, einheit: "EL", name: "Currypaste" },
    ],
    steps: [
      "Zwiebel anbraten, Currypaste kurz mitrösten.",
      "Linsen und Kokosmilch dazugeben, 20 Minuten köcheln lassen.",
    ],
  },
};
