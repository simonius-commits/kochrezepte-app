// Speichert Rezepte aus einem Mela-Export (siehe melaParser.js) in Supabase.
//
// Grundsatz: lieber unvollständig importieren als gar nicht. Fehlt etwas (z.B. ein Bild lässt
// sich nicht hochladen), wird das Rezept trotzdem gespeichert und der Grund als Hinweis
// zurückgegeben. Nur wenn das Rezept selbst nicht gespeichert werden kann, gilt es als Fehler.
//
// Tempo: Bei Hunderten Rezepten wäre es sehr langsam, jede Zutat einzeln in der Datenbank zu
// suchen. Deshalb werden alle vorhandenen Zutaten und Tags EINMAL am Anfang geladen und im
// Speicher gehalten (Name → ID); pro Rezept werden fehlende Zutaten/Tags gesammelt angelegt
// und alle Zeilen eines Rezepts in einem Rutsch gespeichert.
import { supabase } from "./supabaseClient.js";
import { ladeAlle } from "./ladeAlle.js";

export const IMPORT_QUELLE_MELA = "mela";

// Supabase liefert pro Abfrage höchstens 1000 Zeilen → seitenweise laden (ladeAlle.js)

const schluessel = (name) => name.trim().toLowerCase();

/**
 * Lädt, was für Vorschau und Import gebraucht wird: vorhandene Rezepte (für „Schon vorhanden“),
 * eigene Kategorien (Mela-Kategorie mit gleichem Namen → Kategorie statt Tag), alle Zutaten
 * (geteilter Pool) und die eigenen Tags.
 */
export async function ladeImportKontext() {
  const [rezepte, kategorien, zutaten, tags] = await Promise.all([
    ladeAlle("recipes", "id, titel, import_quelle, import_id"),
    ladeAlle("categories", "id, name"),
    ladeAlle("ingredients", "id, name"),
    ladeAlle("tags", "id, name"),
  ]);
  // Bei doppelten Namen gewinnt der erste (älteste) Eintrag — wie bei der bisherigen Suche
  const zuMap = (rows) => {
    const m = new Map();
    for (const r of rows) if (!m.has(schluessel(r.name))) m.set(schluessel(r.name), r.id);
    return m;
  };
  return {
    titel: new Set(rezepte.map((r) => schluessel(r.titel))),
    melaIds: new Set(rezepte.filter((r) => r.import_quelle === IMPORT_QUELLE_MELA && r.import_id).map((r) => r.import_id)),
    kategorien: zuMap(kategorien),
    zutaten: zuMap(zutaten),
    tags: zuMap(tags),
  };
}

/** Gibt es das Rezept schon? Gleiche Mela-Kennung oder gleicher Titel. */
export function istSchonVorhanden(rezept, kontext) {
  if (rezept.importId && kontext.melaIds.has(rezept.importId)) return true;
  return kontext.titel.has(schluessel(rezept.titel));
}

/**
 * Sorgt dafür, dass es für alle Namen einen Eintrag in `tabelle` gibt (Zutaten oder Tags).
 * Fehlende werden in EINER Anfrage angelegt; `map` (Name → ID) wird ergänzt.
 */
async function sicherstellen(tabelle, namen, map) {
  const fehlend = [];
  const gesehen = new Set();
  for (const n of namen) {
    const k = schluessel(n);
    if (!k || map.has(k) || gesehen.has(k)) continue;
    gesehen.add(k);
    fehlend.push(n.trim());
  }
  if (fehlend.length === 0) return;
  const { data, error } = await supabase
    .from(tabelle)
    .insert(fehlend.map((name) => ({ name })))
    .select("id, name");
  if (error) throw error;
  for (const r of data || []) map.set(schluessel(r.name), r.id);
}

// Base64 → Datei-Inhalt. Dateityp an den ersten Bytes erkennen (Mela speichert meist JPEG).
function base64ZuBlob(base64) {
  const sauber = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const binaer = atob(sauber);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  let typ = "image/jpeg";
  let endung = "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) [typ, endung] = ["image/png", "png"];
  else if (bytes[0] === 0x47 && bytes[1] === 0x49) [typ, endung] = ["image/gif", "gif"];
  else if (bytes[8] === 0x57 && bytes[9] === 0x45) [typ, endung] = ["image/webp", "webp"];
  else if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) [typ, endung] = ["image/heic", "heic"];
  return { blob: new Blob([bytes], { type: typ }), endung };
}

async function ladeBildHoch(base64) {
  let { blob, endung } = base64ZuBlob(base64);
  // HEIC (Apple-Format) zeigen Chrome und Firefox nicht an → vorher in JPEG umwandeln.
  // Die Umwandlungs-Bibliothek wird nur geladen, wenn wirklich ein HEIC-Bild vorkommt.
  if (blob.type === "image/heic") {
    const { default: heic2any } = await import("heic2any");
    const jpeg = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
    blob = Array.isArray(jpeg) ? jpeg[0] : jpeg;
    endung = "jpg";
  }
  const pfad = `${crypto.randomUUID()}-mela.${endung}`;
  const { error } = await supabase.storage.from("recipe-images").upload(pfad, blob, { contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from("recipe-images").getPublicUrl(pfad).data.publicUrl;
}

/**
 * Ein Rezept speichern. Gibt { hinweise: [...] } zurück; wirft nur, wenn das Rezept selbst
 * nicht angelegt werden konnte.
 */
export async function importiereMelaRezept(rezept, kontext) {
  const hinweise = [...rezept.hinweise];

  // 1) Bilder hochladen (gleichzeitig) — fehlgeschlagene einzeln überspringen
  const uploads = await Promise.allSettled(rezept.bilder.map((b) => ladeBildHoch(b)));
  const bildUrls = uploads.filter((u) => u.status === "fulfilled").map((u) => u.value);
  const bildFehler = uploads.length - bildUrls.length;
  if (bildFehler) {
    hinweise.push(
      rezept.bilder.length === 1
        ? "das Bild konnte nicht übernommen werden"
        : `${bildFehler} von ${rezept.bilder.length} Bildern ${bildFehler === 1 ? "konnte" : "konnten"} nicht übernommen werden`
    );
  }

  // 2) Mela-Kategorien: erste mit gleichnamiger Kategorie → Kategorie, alle übrigen → Tags
  let categoryId = null;
  const tagNamen = [];
  for (const name of rezept.kategorien) {
    const id = kontext.kategorien.get(schluessel(name));
    if (id && !categoryId) categoryId = id;
    else tagNamen.push(name);
  }

  // 3) Rezept anlegen
  const payload = {
    titel: rezept.titel,
    beschreibung: rezept.beschreibung,
    notizen: rezept.notizen,
    naehrwerte_text: rezept.naehrwerteText,
    ...rezept.naehrwerte,
    portionen_standard: rezept.portionen,
    portionen_text: rezept.portionenText,
    zubereitungszeit_min: rezept.zubereitungszeit,
    kochzeit_min: rezept.kochzeit,
    gesamtzeit_min: rezept.gesamtzeit,
    quelle: rezept.quelle,
    category_id: categoryId,
    favorit: rezept.favorit,
    will_kochen: rezept.willKochen,
    bild_url: bildUrls[0] || null,
    import_quelle: IMPORT_QUELLE_MELA,
    // Bewusst noch einmal importiert (trotz „Schon vorhanden“)? Dann ohne Kennung speichern,
    // sonst lehnt die Datenbank das Rezept ab (Kennung darf pro Person nur einmal vorkommen).
    import_id: rezept.importId && !kontext.melaIds.has(rezept.importId) ? rezept.importId : null,
  };
  if (rezept.erstelltAm) payload.created_at = rezept.erstelltAm;

  const { data: neu, error } = await supabase.from("recipes").insert(payload).select("id").single();
  if (error) throw error;
  const recipeId = neu.id;

  // Ab hier: Fehler machen das Rezept nicht kaputt, sie werden zu Hinweisen.
  // 4) Fehlende Zutaten und Tags anlegen (je eine Anfrage)
  const zutaten = rezept.zutaten.filter((z) => z.name.trim());
  const [zutatenBereit, tagsBereit] = await Promise.all([
    sicherstellen("ingredients", zutaten.map((z) => z.name), kontext.zutaten).then(() => true, () => false),
    sicherstellen("tags", tagNamen, kontext.tags).then(() => true, () => false),
  ]);

  // 5) Alle Zeilen des Rezepts gleichzeitig speichern (je Tabelle eine Anfrage)
  const auftraege = [];
  if (bildUrls.length > 0) {
    auftraege.push([
      "die Bilder konnten nicht zugeordnet werden",
      supabase.from("recipe_images").insert(bildUrls.map((url, i) => ({ recipe_id: recipeId, url, reihenfolge: i }))),
    ]);
  }
  if (zutaten.length > 0) {
    if (!zutatenBereit) hinweise.push("die Zutaten konnten nicht übernommen werden");
    else {
      auftraege.push([
        "die Zutaten konnten nicht übernommen werden",
        supabase.from("recipe_ingredients").insert(
          zutaten.map((z, i) => ({
            recipe_id: recipeId,
            ingredient_id: kontext.zutaten.get(schluessel(z.name)),
            menge: z.menge,
            einheit: z.einheit,
            notiz: z.notiz || null,
            gruppe: z.gruppe,
            reihenfolge: i + 1,
          }))
        ),
      ]);
    }
  }
  if (rezept.schritte.length > 0) {
    auftraege.push([
      "die Zubereitungsschritte konnten nicht übernommen werden",
      supabase
        .from("recipe_steps")
        .insert(rezept.schritte.map((s, i) => ({ recipe_id: recipeId, reihenfolge: i + 1, text: s.text, gruppe: s.gruppe }))),
    ]);
  }
  if (tagNamen.length > 0) {
    if (!tagsBereit) hinweise.push("die Tags konnten nicht übernommen werden");
    else {
      // Gleiche Tag-ID nur einmal verknüpfen (z.B. „Pasta“ und „pasta“ in Mela)
      const tagIds = [...new Set(tagNamen.map((n) => kontext.tags.get(schluessel(n))).filter(Boolean))];
      auftraege.push([
        "die Tags konnten nicht übernommen werden",
        supabase.from("recipe_tags").insert(tagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id }))),
      ]);
    }
  }
  const ergebnisse = await Promise.all(auftraege.map(([, p]) => p));
  ergebnisse.forEach((res, i) => {
    if (res.error) hinweise.push(auftraege[i][0]);
  });

  // Damit ein zweiter Import in derselben Sitzung das Rezept als „vorhanden“ erkennt
  kontext.titel.add(schluessel(rezept.titel));
  if (payload.import_id) kontext.melaIds.add(payload.import_id);

  return { hinweise };
}

/**
 * Nachträgliche Reparatur eines schon importierten Mela-Rezepts: ersetzt NUR die Zutaten
 * und/oder Schritte durch die (neu aufgeteilten) aus dem Parser. Alles andere am Rezept
 * (Titel, Bilder, Notizen, Favorit …) bleibt unverändert.
 * Benutzt z.B. für Rezepte, bei denen in Mela alle Zutaten in einer Zeile standen.
 */
export async function ersetzeZutatenUndSchritte(recipeId, rezept, kontext, { zutaten = false, schritte = false }) {
  if (zutaten) {
    const liste = rezept.zutaten.filter((z) => z.name.trim());
    const { error: delErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
    if (delErr) throw delErr;
    // Achtung: Beim Löschen räumt die Datenbank Zutaten weg, die in keinem Rezept mehr
    // vorkommen (Trigger cleanup_orphaned_ingredient). Gemerkte IDs können also veraltet sein
    // → prüfen, welche noch existieren, und fehlende neu anlegen.
    const gemerkt = [...new Set(liste.map((z) => kontext.zutaten.get(schluessel(z.name))).filter(Boolean))];
    if (gemerkt.length > 0) {
      const { data: noch, error: qErr } = await supabase.from("ingredients").select("id").in("id", gemerkt);
      if (qErr) throw qErr;
      const vorhanden = new Set((noch || []).map((r) => r.id));
      for (const [name, id] of [...kontext.zutaten]) if (gemerkt.includes(id) && !vorhanden.has(id)) kontext.zutaten.delete(name);
    }
    await sicherstellen("ingredients", liste.map((z) => z.name), kontext.zutaten);
    const { error } = await supabase.from("recipe_ingredients").insert(
      liste.map((z, i) => ({
        recipe_id: recipeId,
        ingredient_id: kontext.zutaten.get(schluessel(z.name)),
        menge: z.menge,
        einheit: z.einheit,
        notiz: z.notiz || null,
        gruppe: z.gruppe,
        reihenfolge: i + 1,
      }))
    );
    if (error) throw error;
  }
  if (schritte) {
    const { error: delErr } = await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
    if (delErr) throw delErr;
    const { error } = await supabase
      .from("recipe_steps")
      .insert(rezept.schritte.map((s, i) => ({ recipe_id: recipeId, reihenfolge: i + 1, text: s.text, gruppe: s.gruppe })));
    if (error) throw error;
  }
}
