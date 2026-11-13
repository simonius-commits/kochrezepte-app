// Liest Exportdateien der Rezepte-App „Mela“ und wandelt sie in unser Datenmodell um.
//
// Format (Stand 11/2026, bitte an echten Dateien prüfen):
// - .melarecipes = ZIP-Archiv mit einer .melarecipe-Datei pro Rezept
// - .melarecipe  = JSON mit u.a. id, title, text, ingredients, instructions, notes, nutrition,
//                  yield, prepTime, cookTime, totalTime, categories, link, images (Base64),
//                  favorite, wantToCook, date
// - Zutaten und Anleitung sind EIN Text mit Zeilenumbrüchen; Zeilen mit "#" am Anfang sind
//   Zwischenüberschriften (bei uns: Gruppe).
//
// Diese Datei speichert NICHTS — sie liest nur. Gespeichert wird in melaImport.js.
// JSZip (zum Entpacken) wird erst geladen, wenn wirklich eine Mela-Datei geöffnet wird,
// damit die App für alle anderen Seiten nicht größer wird.

export const OHNE_TITEL = "Ohne Titel";

// Bekannte Einheiten (klein geschrieben) → so wie sie bei uns gespeichert werden.
// Reihenfolge egal; gesucht wird das erste Wort nach der Menge.
const EINHEITEN = {
  g: "g", gr: "g", gramm: "g",
  kg: "kg", kilo: "kg", kilogramm: "kg",
  mg: "mg",
  ml: "ml", milliliter: "ml",
  cl: "cl",
  dl: "dl",
  l: "l", liter: "l",
  el: "EL", "el.": "EL", essl: "EL", "essl.": "EL", esslöffel: "EL",
  tl: "TL", "tl.": "TL", teel: "TL", "teel.": "TL", teelöffel: "TL",
  msp: "Msp.", "msp.": "Msp.", messerspitze: "Msp.",
  prise: "Prise", prisen: "Prise",
  stk: "Stück", "stk.": "Stück", stück: "Stück",
  bund: "Bund", bd: "Bund", "bd.": "Bund",
  dose: "Dose", dosen: "Dose",
  pck: "Päckchen", "pck.": "Päckchen", päckchen: "Päckchen", packung: "Packung", pkg: "Packung",
  zehe: "Zehe", zehen: "Zehe",
  tasse: "Tasse", tassen: "Tasse", cup: "Cup", cups: "Cup",
  scheibe: "Scheibe", scheiben: "Scheibe",
  zweig: "Zweig", zweige: "Zweig",
  handvoll: "Handvoll",
  becher: "Becher",
  glas: "Glas", gläser: "Glas",
  würfel: "Würfel",
  // Englische Rezepte
  tbsp: "EL", tablespoon: "EL", tablespoons: "EL",
  tsp: "TL", teaspoon: "TL", teaspoons: "TL",
  litre: "l", litres: "l", liters: "l",
  pinch: "Prise", handful: "Handvoll", handfuls: "Handvoll",
  oz: "oz", lb: "lb",
};

// Brüche als einzelne Zeichen (½, ¼ …)
const BRUCH_ZEICHEN = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅛": 0.125 };

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** "1,5" → 1.5, "1/2" → 0.5, "1 1/2" → 1.5, "½" → 0.5, "1½" → 1.5 */
function parseZahl(text) {
  let t = text.trim();
  let summe = 0;
  for (const [zeichen, wert] of Object.entries(BRUCH_ZEICHEN)) {
    if (t.includes(zeichen)) {
      summe += wert;
      t = t.replace(zeichen, " ").trim();
    }
  }
  for (const teil of t.split(/\s+/).filter(Boolean)) {
    if (teil.includes("/")) {
      const [a, b] = teil.split("/").map(Number);
      if (!b) return null;
      summe += a / b;
    } else {
      const n = Number(teil.replace(",", "."));
      if (Number.isNaN(n)) return null;
      summe += n;
    }
  }
  return round2(summe);
}

// Menge am Zeilenanfang: Zahlen, Kommas, Brüche, Spannen ("2-3", "2 – 3")
const MENGE_REGEX = /^((?:\d+[.,]?\d*|[½⅓⅔¼¾⅕⅛])(?:\s*\d*\/\d+|[½⅓⅔¼¾⅕⅛])?(?:\s+\d+\/\d+)?)(\s*[-–]\s*\d+[.,]?\d*)?\s*/;

/**
 * Eine Zutatenzeile zerlegen, z.B. „200 g Mehl, gesiebt“ →
 * { menge: 200, einheit: "g", name: "Mehl", notiz: "gesiebt" }.
 * Was nicht erkannt wird, landet komplett im Namen — es geht nichts verloren.
 */
export function parseZutat(zeile) {
  let rest = zeile.trim().replace(/^[-•*]\s+/, ""); // Aufzählungszeichen weg
  let menge = null;
  let einheit = null;
  let spanne = "";

  const m = rest.match(MENGE_REGEX);
  if (m) {
    const zahl = parseZahl(m[1]);
    if (zahl != null) {
      menge = zahl;
      spanne = m[2] ? m[2].replace(/\s+/g, "") : ""; // "2-3": erster Wert ist die Menge
      rest = rest.slice(m[0].length);
    }
  }

  // Einheit auch ohne Zahl erkennen („Prise Zucker“), aber nur, wenn danach noch etwas kommt
  {
    const wort = rest.match(/^(\S+)\s+(?=\S)/);
    if (wort) {
      const key = wort[1].toLowerCase();
      if (EINHEITEN[key]) {
        einheit = EINHEITEN[key];
        rest = rest.slice(wort[0].length);
      }
    }
  }

  // Ware bis zum ersten Komma, Rest = Notiz. Klammern am Ende („(ca. 200 g)“) → Notiz.
  let name = rest.trim();
  let notiz = "";
  const komma = name.indexOf(",");
  if (komma > 0) {
    notiz = name.slice(komma + 1).trim();
    name = name.slice(0, komma).trim();
  }
  const klammer = name.match(/^(.*\S)\s*\(([^)]*)\)$/);
  if (klammer) {
    name = klammer[1];
    notiz = [klammer[2], notiz].filter(Boolean).join(", ");
  }
  if (spanne) notiz = [`Menge ${menge}${spanne}`, notiz].filter(Boolean).join(", ");

  // Nichts Brauchbares erkannt → ganze Zeile als Name
  if (!name) {
    return { menge: null, einheit: null, name: zeile.trim(), notiz: "" };
  }
  return { menge, einheit, name, notiz };
}

// --- Überschriften in der Zutatenliste erkennen ---------------------------------------------
// Reine Portionsangabe / Überschrift: „Zutaten für 4 Personen“, „Für 4 Portionen“, „ERGIBT 12 STÜCK“
const PORTIONS_ZEILE =
  /^(?:zutaten|ingredients)?\s*\(?\s*(?:für|fur|fuer|for|ergibt|makes)?\s*(\d+)\s*(?:personen|person|portionen|portion|stück|stücke|stk\.?|servings?|people)\s*\)?\s*:?$/iu;
const NUR_UEBERSCHRIFT = /^(?:zutaten|ingredients|zutatenliste)?\s*:?$/iu;
// Typische Anfänge von Zwischenüberschriften („Für die Sauce“, „Zum Garnieren“, „Außerdem“)
const UEBERSCHRIFT_ANFANG = /^(?:für|fur|fuer|for|zum|zur|außerdem|ausserdem|dazu|optional|topping|toppings)\b/iu;
// Davon starten diese auch MIT Zutat dahinter eine neue Gruppe („Für die Füllung: 500 g Spinat“).
// Andere Vorsätze („Optional: 1 Paprika“, „alternativ: Rapsöl“) werden zur Notiz der Zutat.
const ABSCHNITT_ANFANG = /^(?:für|fur|fuer|for|zum|zur|außerdem|ausserdem)\b/iu;
// „Portionen: - 12“, „Portionsgröße: Für 12 Stück“, „Maßeinheit: an“ → keine Zutat
const PORTIONS_VORSATZ = /^(?:portionen|portion|portionsgröße|maßeinheit|servings|yield|ergibt)$/iu;

/**
 * Prüft eine Zutatenzeile ohne Mengenangabe am Anfang:
 * → { art: "weg", portionen } für reine Überschriften/Portionsangaben (werden nicht importiert),
 * → { art: "gruppe", gruppe, rest } für Zwischenüberschriften (ggf. mit Zutat nach dem Doppelpunkt),
 * → { art: "notiz", notiz, rest } für „Optional: 1 Paprika“ (Zutat mit Notiz, Gruppe bleibt),
 * → null für eine normale Zutat.
 */
export function pruefeUeberschrift(zeile, { grossIstUeberschrift = true } = {}) {
  if (/^[\d½⅓⅔¼¾⅕⅛]/.test(zeile)) return null; // beginnt mit Menge → Zutat
  const portion = zeile.match(PORTIONS_ZEILE);
  if (portion) return { art: "weg", portionen: zeile.replace(/^(zutaten|ingredients)\s*/iu, "").replace(/[():]/g, "").trim() };
  if (NUR_UEBERSCHRIFT.test(zeile)) return { art: "weg" };

  // „Zutaten Pellkartoffeln“ → Gruppe „Pellkartoffeln“
  const zutatenFuer = zeile.match(/^(?:zutaten|ingredients)\s+(?:für\s+|for\s+)?([^\d:]{2,50})$/iu);
  if (zutatenFuer) return { art: "gruppe", gruppe: normalisiereTitel(zutatenFuer[1].trim()), rest: "" };

  // „Für die Füllung: 500 g Spinat“, „Burger sauce:“, „Optional: 1 Paprika“, „Portionen: 12“
  const doppelpunkt = zeile.match(/^([^:\d½⅓⅔¼¾⅕⅛]{2,50}?)\s*:\s*(.*)$/u);
  if (doppelpunkt) {
    const vorsatz = doppelpunkt[1].trim();
    const rest = doppelpunkt[2].trim();
    if (PORTIONS_VORSATZ.test(vorsatz)) return { art: "weg", portionen: /\d/.test(rest) ? rest.replace(/^[^\wÄÖÜäöü]+/u, "") : null };
    if (!rest || ABSCHNITT_ANFANG.test(vorsatz)) return { art: "gruppe", gruppe: normalisiereTitel(vorsatz), rest };
    return { art: "notiz", notiz: normalisiereTitel(vorsatz), rest };
  }

  if (zeile.length <= 50 && !/\d/.test(zeile)) {
    // „Für die Sauce“, „Zum Garnieren“, „Außerdem“, „OPTIONAL“
    if (UEBERSCHRIFT_ANFANG.test(zeile)) return { art: "gruppe", gruppe: normalisiereTitel(zeile), rest: "" };
    // Komplett in GROSSBUCHSTABEN („DRESSING“, „AUS DEM VORRAT“), mind. 3 Buchstaben —
    // aber nur, wenn die übrige Liste normal geschrieben ist (sonst wäre „SALZ“ eine Überschrift)
    const buchstaben = zeile.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
    if (grossIstUeberschrift && buchstaben.length >= 3 && buchstaben === buchstaben.toUpperCase()) {
      return { art: "gruppe", gruppe: normalisiereTitel(zeile), rest: "" };
    }
  }
  return null;
}

// --- Sammelzeilen aufteilen -------------------------------------------------------------------
// Manche Rezepte (v.a. aus Webseiten kopiert) haben alle Zutaten in EINER Zeile:
// „750 g weißer, geschälter Spargel, 300 g Blätterteig (TK), 100 ml Weißwein, Basilikum, Salz“.
const MENGE_ANFANG = /^(?:\d|[½⅓⅔¼¾⅕⅛]|je\s)/i;

/** An Kommas teilen, aber nicht innerhalb von Klammern */
function teileAnKommas(text) {
  const teile = [];
  let tiefe = 0;
  let aktuell = "";
  for (const zeichen of text) {
    if (zeichen === "(") tiefe++;
    if (zeichen === ")") tiefe = Math.max(0, tiefe - 1);
    if (zeichen === "," && tiefe === 0) {
      teile.push(aktuell.trim());
      aktuell = "";
    } else aktuell += zeichen;
  }
  teile.push(aktuell.trim());
  return teile.filter(Boolean);
}

/**
 * Eine Zutatenzeile mit mehreren Zutaten in einzelne Zeilen teilen. Nur wenn mindestens drei
 * Teile mit einer Menge beginnen (sonst ist das Komma eine Notiz: „Zwiebel, gewürfelt“).
 * „750 g weißer, geschälter Spargel“ bleibt zusammen: Endet der vorige Teil klein geschrieben
 * (Adjektiv) und beginnt der nächste klein, gehören sie zusammen.
 */
export function teileZutatenzeile(zeile) {
  if (/alternativ/i.test(zeile)) return [zeile];
  const teile = teileAnKommas(zeile);
  if (teile.filter((t) => MENGE_ANFANG.test(t)).length < 3) return [zeile];
  const out = [];
  for (const teil of teile) {
    const vorher = out[out.length - 1];
    const letztesWort = vorher?.split(/\s+/).pop() || "";
    if (vorher && !MENGE_ANFANG.test(teil) && /^[a-zäöüß]/.test(teil) && /^[a-zäöüß]/.test(letztesWort)) {
      out[out.length - 1] = `${vorher} ${teil}`;
    } else out.push(teil);
  }
  return out;
}

// Abkürzungen, nach denen ein Punkt KEIN Satzende ist
const ABKUERZUNGEN = /(?:\b(?:ca|z|B|bzw|evtl|ggf|usw|etc|inkl|max|min|Min|Std|Sek|EL|TL|Msp|Pck|Stk|gr|geh|ital|franz|engl|vgl|Nr|s|u|o|d)\.)$/;

/**
 * Einen langen Absatz (ganze Anleitung in einem Schritt) an den Satzenden in einzelne
 * Schritte teilen. Kurze Absätze bleiben unverändert.
 */
export function teileSchritt(text) {
  if (text.length <= 250) return [text];
  // Inline-Nummerierung „1. … 2. …“ → an den Nummern trennen
  const nummeriert = text.split(/\s+(?=\d{1,2}[.)]\s+[A-ZÄÖÜ])/);
  const saetze = [];
  for (const roherBlock of nummeriert) {
    const block = roherBlock.replace(/^\d{1,2}[.)]\s+/, ""); // „1. “ vorne weg
    let aktuell = "";
    const teile = block.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"])/);
    for (const teil of teile) {
      aktuell = aktuell ? `${aktuell} ${teil}` : teil;
      if (!ABKUERZUNGEN.test(aktuell)) {
        saetze.push(aktuell.trim());
        aktuell = "";
      }
    }
    if (aktuell) saetze.push(aktuell.trim());
  }
  return saetze.map((s) => s.replace(/^\d{1,2}[.)]\s+/, "")).filter(Boolean);
}

/**
 * Zutaten-Text → Liste { zeile, gruppe }. „#“-Zeilen und erkannte Überschriften setzen die
 * Gruppe; reine Überschriften („ZUTATEN FÜR 4 PERSONEN“) fallen weg — die Portionsangabe
 * daraus wird zurückgegeben, falls das Rezept selbst keine hat.
 */
function zutatenMitGruppen(text) {
  const out = [];
  let gruppe = null;
  let portionen = null;
  const alleZeilen = String(text || "")
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean)
    .flatMap((z) => (z.startsWith("#") ? [z] : teileZutatenzeile(z)));
  // Wie viele Zeilen enthalten Kleinbuchstaben? Ist fast alles groß geschrieben, sind
  // Großbuchstaben kein Zeichen für eine Überschrift.
  const normaleZeilen = alleZeilen.filter((z) => /[a-zäöüß]/.test(z)).length;
  const grossIstUeberschrift = normaleZeilen >= alleZeilen.length / 2;
  // Nach dieser Zeile kommt keine Zutat mehr? Dann ist sie keine Überschrift (z.B. „SALZ“ am Ende)
  const istLetzte = (i) => alleZeilen.slice(i + 1).every((z) => z.startsWith("#"));
  for (const [i, zeile] of alleZeilen.entries()) {
    if (zeile.startsWith("#")) {
      gruppe = zeile.replace(/^#+\s*/, "").trim() || null;
      continue;
    }
    const u = pruefeUeberschrift(zeile, { grossIstUeberschrift });
    if (u?.art === "weg") {
      if (u.portionen && !portionen) portionen = u.portionen;
      continue;
    }
    if (u?.art === "gruppe" && (u.rest || !istLetzte(i))) {
      gruppe = u.gruppe.replace(/:$/, "").trim() || null;
      if (u.rest) out.push({ zeile: u.rest, gruppe });
      continue;
    }
    if (u?.art === "notiz") {
      out.push({ zeile: u.rest, gruppe, zusatzNotiz: u.notiz });
      continue;
    }
    out.push({ zeile, gruppe });
  }
  return { zeilen: out, portionen };
}

/** Text mit Zeilen → Liste mit Gruppen ("# Für die Soße" setzt die Gruppe für die folgenden Zeilen) */
function zeilenMitGruppen(text) {
  const out = [];
  let gruppe = null;
  for (const roh of String(text || "").split(/\r?\n/)) {
    const zeile = roh.trim();
    if (!zeile) continue;
    if (zeile.startsWith("#")) {
      gruppe = zeile.replace(/^#+\s*/, "").trim() || null;
      continue;
    }
    out.push({ zeile, gruppe });
  }
  return out;
}

/** "15 min", "1 h 30 min", "1 Std. 10 Min.", "PT1H30M", "1:30", "T02:00", "90" → Minuten (oder null) */
export function parseDauer(text) {
  if (text == null || text === "") return null;
  if (typeof text === "number") return Math.round(text);
  const t = String(text).trim().toLowerCase();
  const iso = t.match(/^pt(?:(\d+)h)?(?:(\d+)m)?/);
  if (iso && (iso[1] || iso[2])) return Number(iso[1] || 0) * 60 + Number(iso[2] || 0);
  // Stunden:Minuten, auch mit "T" davor ("T02:00" = 2 Std)
  const uhr = t.match(/^t?(\d{1,2}):(\d{2})$/);
  if (uhr) return Number(uhr[1]) * 60 + Number(uhr[2]);
  let min = 0;
  let gefunden = false;
  const h = t.match(/(\d+[.,]?\d*)\s*(h|std|stunde|stunden|hr|hrs|hour|hours)\b/);
  if (h) {
    min += Number(h[1].replace(",", ".")) * 60;
    gefunden = true;
  }
  const m = t.match(/(\d+)\s*(m|min|mins|minute|minuten|minutes)\b/);
  if (m) {
    min += Number(m[1]);
    gefunden = true;
  }
  if (!gefunden) {
    const nur = t.match(/^(\d+)$/);
    if (nur) return Number(nur[1]);
    return null;
  }
  return Math.round(min);
}

/** "4 Portionen" → { zahl: 4, text: null }; "1 Kuchen (26 cm)" → { zahl: 1, text: "1 Kuchen (26 cm)" } */
function parsePortionen(text) {
  if (text == null || text === "") return { zahl: 4, text: null };
  const t = String(text).trim();
  const m = t.match(/(\d+)/);
  const zahl = m ? Math.max(1, Number(m[1])) : 4;
  // Reine Portionsangaben („4“, „4 Portionen“, „Für 4 Personen“) brauchen keinen Zusatztext
  const nurPortionen = /^(für\s+)?\d+\s*(portionen|portion|personen|person|servings?|pers\.?)?$/i.test(t);
  return { zahl, text: nurPortionen ? null : t };
}

/** Bekannte Nährwerte aus freiem Text ziehen: „450 kcal, 20 g Eiweiß …“ */
function parseNaehrwerte(text) {
  const t = String(text || "").toLowerCase();
  const find = (re) => {
    const m = t.match(re);
    return m ? Number(m[1].replace(",", ".")) : null;
  };
  return {
    kalorien_kcal: find(/(\d+[.,]?\d*)\s*(?:kcal|kalorien)/) ?? find(/(?:kalorien|kcal|energie)\D{0,6}(\d+[.,]?\d*)/),
    eiweiss_g: find(/(\d+[.,]?\d*)\s*g\s*(?:eiweiß|eiweiss|protein)/) ?? find(/(?:eiweiß|eiweiss|protein)\D{0,6}(\d+[.,]?\d*)/),
    fett_g: find(/(\d+[.,]?\d*)\s*g\s*fett/) ?? find(/fett\D{0,6}(\d+[.,]?\d*)/),
    kohlenhydrate_g:
      find(/(\d+[.,]?\d*)\s*g\s*(?:kohlenhydrate|kh|carbs)/) ?? find(/(?:kohlenhydrate|carbs)\D{0,6}(\d+[.,]?\d*)/),
    ballaststoffe_g: find(/(\d+[.,]?\d*)\s*g\s*(?:ballaststoffe|fiber|fibre)/) ?? find(/ballaststoffe\D{0,6}(\d+[.,]?\d*)/),
    zucker_g: find(/(\d+[.,]?\d*)\s*g\s*(?:zucker|sugar)/) ?? find(/(?:zucker|sugar)\D{0,6}(\d+[.,]?\d*)/),
  };
}

// Mela (Apple-App) speichert Datumswerte meist als Sekunden seit dem 1.1.2001
const APPLE_EPOCH = Date.UTC(2001, 0, 1);
function parseDatum(wert) {
  if (wert == null || wert === "") return null;
  let ms;
  if (typeof wert === "number") {
    if (wert > 1e12) ms = wert; // Millisekunden
    else if (wert > 1.2e9) ms = wert * 1000; // Unix-Sekunden
    else ms = APPLE_EPOCH + wert * 1000; // Apple-Sekunden
  } else {
    ms = Date.parse(wert);
  }
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// Kleine Füllwörter bleiben in Titeln klein (außer am Anfang)
const KLEINE_WOERTER = new Set(
  ("mit und oder an am auf aus bei für im in nach ohne vom von zum zur zu der die das den dem des " +
    "ein eine einer einem einen à la al alla a and the of with on or e di del con").split(" ")
);

/**
 * Titel komplett in GROSSBUCHSTABEN („3 MINUTEN-THUNFISCH-DIP MIT FRISCHKÄSE“) → normal
 * („3 Minuten-Thunfisch-Dip mit Frischkäse“). Jedes Wort (auch nach Bindestrich) beginnt groß,
 * Füllwörter bleiben klein. Andere Titel bleiben unverändert.
 */
export function normalisiereTitel(titel) {
  const hatGross = /[A-ZÄÖÜ]/.test(titel);
  const hatKlein = /[a-zäöüß]/.test(titel);
  if (!hatGross || hatKlein || titel.replace(/[^A-ZÄÖÜ]/g, "").length < 4) return titel;
  let erstesWort = true;
  return titel
    .toLowerCase()
    .split(/(\s+)/)
    .map((wort) => {
      if (/^\s+$/.test(wort) || !wort) return wort;
      const klein = !erstesWort && KLEINE_WOERTER.has(wort.replace(/[^a-zäöüß]/g, ""));
      erstesWort = false;
      if (klein) return wort;
      // Großer Anfangsbuchstabe pro Wortteil („thunfisch-dip“ → „Thunfisch-Dip“)
      return wort.replace(/(^|[-/(„"])([a-zäöü])/g, (_, vor, b) => vor + b.toUpperCase());
    })
    .join("");
}

function asText(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("\n");
  return String(v);
}

/** Ein Mela-JSON-Objekt → unser Rezept (noch nicht gespeichert) */
export function melaZuRezept(json) {
  const hinweise = [];
  let titel = normalisiereTitel(asText(json.title).trim());
  if (!titel) {
    titel = OHNE_TITEL;
    hinweise.push("das Rezept hatte keinen Titel");
  }
  const zutatenListe = zutatenMitGruppen(json.ingredients);
  // Keine Portionsangabe im Rezept? Dann die aus „Zutaten für 4 Personen“ nehmen.
  const portionen = parsePortionen(asText(json.yield).trim() ? json.yield : zutatenListe.portionen);
  const naehrwerteText = asText(json.nutrition).trim();
  const link = asText(json.link).trim();

  // Zeiten: Was keine erkennbare Zeit ist (z.B. ein Tipp, der im Zeitfeld gelandet ist),
  // hängen wir an die Notizen an, damit nichts verloren geht.
  const zeitNotizen = [];
  const zeit = (wert, label) => {
    const min = parseDauer(wert);
    const roh = asText(wert).trim();
    if (min == null && roh && !/^(n\/a|-|–|—)$/i.test(roh)) zeitNotizen.push(`${label} (aus Mela): ${roh}`);
    return min;
  };
  const zubereitungszeit = zeit(json.prepTime, "Zubereitungszeit");
  const kochzeit = zeit(json.cookTime, "Kochzeit");
  const gesamtzeit = zeit(json.totalTime, "Gesamtzeit");
  const notizen = [asText(json.notes).trim(), ...zeitNotizen].filter(Boolean).join("\n\n");

  return {
    importId: json.id != null ? String(json.id) : null,
    titel,
    beschreibung: asText(json.text).trim() || null,
    notizen: notizen || null,
    naehrwerteText: naehrwerteText || null,
    naehrwerte: parseNaehrwerte(naehrwerteText),
    portionen: portionen.zahl,
    portionenText: portionen.text,
    zubereitungszeit,
    kochzeit,
    gesamtzeit,
    quelle: link || null,
    kategorien: (Array.isArray(json.categories) ? json.categories : []).map((k) => String(k).trim()).filter(Boolean),
    zutaten: zutatenListe.zeilen.map(({ zeile, gruppe, zusatzNotiz }) => {
      const z = parseZutat(zeile);
      // „Optional: 1 Paprika“ → Notiz „Optional“ (vor eine evtl. vorhandene Notiz)
      if (zusatzNotiz) z.notiz = [zusatzNotiz, z.notiz].filter(Boolean).join(", ");
      return { ...z, gruppe };
    }),
    schritte: (() => {
      const zeilen = zeilenMitGruppen(json.instructions);
      // Ganze Anleitung in EINEM langen Absatz? → an den Satzenden in Schritte teilen
      const quelle =
        zeilen.length === 1
          ? teileSchritt(zeilen[0].zeile).map((zeile) => ({ zeile, gruppe: zeilen[0].gruppe }))
          : zeilen;
      return quelle.map(({ zeile, gruppe }) => ({
        text: zeile.replace(/^\d+[.)]\s+/, ""), // "1. Ofen vorheizen" → Nummer machen wir selbst
        gruppe,
      }));
    })(),
    bilder: (Array.isArray(json.images) ? json.images : []).filter((b) => typeof b === "string" && b.length > 0),
    favorit: Boolean(json.favorite),
    willKochen: Boolean(json.wantToCook),
    erstelltAm: parseDatum(json.date),
    hinweise,
  };
}

/**
 * Datei (aus <input type="file">) einlesen → Liste von Rezepten.
 * .melarecipes = ZIP, .melarecipe = einzelnes JSON. Kaputte Einträge werden übersprungen
 * und als Fehler zurückgegeben.
 */
export async function leseMelaDatei(file) {
  const rezepte = [];
  const fehler = [];
  const name = file.name.toLowerCase();

  const verarbeite = (text, dateiname) => {
    try {
      rezepte.push(melaZuRezept(JSON.parse(text)));
    } catch {
      fehler.push(`${dateiname}: konnte nicht gelesen werden`);
    }
  };

  if (name.endsWith(".melarecipe")) {
    verarbeite(await file.text(), file.name);
  } else {
    let zip;
    try {
      const { default: JSZip } = await import("jszip");
      zip = await JSZip.loadAsync(file);
    } catch {
      throw new Error("Die Datei ist keine gültige Mela-Exportdatei (.melarecipes).");
    }
    const eintraege = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.toLowerCase().endsWith(".melarecipe") && !f.name.startsWith("__MACOSX")
    );
    for (const eintrag of eintraege) {
      verarbeite(await eintrag.async("string"), eintrag.name);
    }
  }

  if (rezepte.length === 0 && fehler.length === 0) {
    throw new Error("In der Datei wurden keine Rezepte gefunden.");
  }
  rezepte.sort((a, b) => a.titel.localeCompare(b.titel, "de"));
  return { rezepte, fehler };
}
