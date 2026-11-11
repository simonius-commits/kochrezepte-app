// Supabase Edge Function: import-recipe
//
// Nimmt einen Link, ein Foto (Base64) oder eingefügten Text entgegen, schickt den Inhalt
// an die Anthropic API und bekommt ein strukturiertes Rezept zurück (passend zu unserem
// Datenmodell: titel, zutaten, schritte, tags, ...).
//
// WICHTIG: Der Anthropic API-Key liegt NUR hier als Umgebungsvariable (Supabase Secret),
// niemals im Frontend-Code. Diese Funktion läuft serverseitig bei Supabase, nicht im Browser.

const RECIPE_SCHEMA_BESCHREIBUNG = `
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Markdown, kein Fließtext drumherum) in genau diesem Format:
{
  "titel": string,
  "beschreibung": string oder null,
  "portionen_standard": number,
  "zubereitungszeit_min": number oder null,
  "kochzeit_min": number oder null,
  "kategorie": string oder null (z.B. "Hauptgericht", "Frühstück" — freier Text, keine feste Liste),
  "schwierigkeit": eine von "einfach" | "mittel" | "schwer" | null,
  "autor": string oder null (Name des/der Koch/Köchin/Autor:in, falls erkennbar),
  "kochbuch": string oder null (Titel des Kochbuchs, falls die Quelle eines ist),
  "ingredients": [ { "menge": number oder null, "einheit": string oder null, "name": string } ],
  "steps": [ string ],
  "tags": [ string ],
  "kalorien_kcal": number oder null (pro Portion),
  "eiweiss_g": number oder null (pro Portion),
  "fett_g": number oder null (pro Portion),
  "kohlenhydrate_g": number oder null (pro Portion),
  "ballaststoffe_g": number oder null (pro Portion),
  "zucker_g": number oder null (pro Portion)
}
Wenn ein Wert nicht zweifelsfrei aus der Quelle hervorgeht, benutze null (bei Zahlen/Kategorie/Schwierigkeit/Autor/Kochbuch)
bzw. eine leere Liste (bei ingredients/steps/tags). Erfinde keine Angaben, insbesondere keine Nährwerte —
wenn sie nicht explizit in der Quelle stehen, alle sechs Nährwert-Felder auf null lassen.
`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripJsonFences(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function callClaude(content) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht als Supabase Secret gesetzt.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: `Du extrahierst Kochrezepte aus Text, Webseiten-Inhalten oder Fotos und strukturierst sie. ${RECIPE_SCHEMA_BESCHREIBUNG}`,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API Fehler (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Keine Text-Antwort von Claude erhalten.");

  const jsonText = stripJsonFences(textBlock.text);
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("Antwort konnte nicht als JSON gelesen werden: " + jsonText.slice(0, 300));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { type, url, imageBase64, imageMediaType, text } = await req.json();

    let content;

    if (type === "link") {
      if (!url) throw new Error("Kein Link angegeben.");
      const pageResponse = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KochrezepteAppBot/1.0)" },
      });
      if (!pageResponse.ok) {
        throw new Error(`Seite konnte nicht geladen werden (Status ${pageResponse.status}).`);
      }
      const html = await pageResponse.text();
      const plainText = stripHtml(html).slice(0, 15000); // Tokens/Kosten begrenzen
      content = [
        {
          type: "text",
          text: `Hier ist der Text einer Rezept-Webseite (${url}). Extrahiere das Rezept:\n\n${plainText}`,
        },
      ];
    } else if (type === "photo") {
      if (!imageBase64 || !imageMediaType) throw new Error("Kein Bild angegeben.");
      content = [
        {
          type: "image",
          source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
        },
        { type: "text", text: "Extrahiere das Rezept von diesem Foto." },
      ];
    } else if (type === "text") {
      if (!text || !text.trim()) throw new Error("Kein Text angegeben.");
      content = [{ type: "text", text: `Extrahiere das Rezept aus diesem Text:\n\n${text}` }];
    } else {
      throw new Error(`Unbekannter Import-Typ: ${type}`);
    }

    const recipe = await callClaude(content);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Unbekannter Fehler" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }
});
