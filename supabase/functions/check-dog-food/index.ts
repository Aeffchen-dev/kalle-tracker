import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { food } = await req.json();
    
    if (!food || typeof food !== "string" || food.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Kein Lebensmittel angegeben" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für Hundeernährung. Der Nutzer fragt ob ein Hund ein bestimmtes Lebensmittel essen darf.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "status": "ok" | "nicht_optimal" | "schadet" | "giftig",
  "purin": "niedrig" | "mittel" | "hoch",
  "reason": "Kurze Begründung auf Deutsch, max 2 Sätze"
}

"purin" gibt den Puringehalt des Lebensmittels an:
- "niedrig": Purinarm, unbedenklich (z.B. Reis, Karotten, Äpfel, Gurke)
- "mittel": Leicht erhöhter Puringehalt, in kleinen Mengen ok (z.B. Hühnerbrust, Spinat, Blumenkohl)
- "hoch": Purinreich, gefährlich für Dalmatiner mit Harnsteinen (z.B. Innereien, Hülsenfrüchte, fetter Fisch, Hefe)

OBERSTE PRIORITÄT - PURIN- UND PROTEINGEHALT:
Dieser Hund ist ein Dalmatiner mit diagnostizierten Harnsteinen (Uratsteine). Die WICHTIGSTE Bewertungsgrundlage ist IMMER der Purin- und Proteingehalt eines Lebensmittels. Jedes Lebensmittel muss ZUERST auf seinen Puringehalt und dann auf seinen Proteingehalt geprüft werden, BEVOR andere Faktoren berücksichtigt werden.

Purinreiche Lebensmittel sind IMMER mindestens "schadet", oft "giftig":
- Alle Fleischsorten (Rind, Schwein, Wild, Lamm, Ente, Gans) → "schadet" oder "giftig"
- Innereien (Leber, Niere, Herz, Lunge, Pansen) → "giftig"
- Geflügel mit Haut → "schadet"
- Fetter Fisch (Sardinen, Hering, Makrele, Forelle, Lachs, Thunfisch, Anchovis) → "schadet" oder "giftig"
- Meeresfrüchte (Muscheln, Garnelen, Krabben) → "schadet"
- Hefe und Hefeprodukte → "schadet"
- Hülsenfrüchte (Linsen, Erbsen, Bohnen, Kichererbsen, Soja) → "schadet"
- Spinat, Spargel, Blumenkohl, Pilze → "nicht_optimal" bis "schadet"
- Proteinreiche Lebensmittel generell → mindestens "nicht_optimal"

Nur sehr purinarmes Fleisch wie Hühnerbrust ohne Haut in sehr kleinen Mengen kann als "nicht_optimal" gelten. Im Zweifel IMMER strenger bewerten!

WICHTIG FÜR DIE BEGRÜNDUNG: Die "reason" MUSS IMMER mit dem Purin- und/oder Proteingehalt BEGINNEN, wenn das Lebensmittel Purine oder nennenswerte Proteine enthält. Erst DANACH dürfen andere Aspekte wie Laktose, Fett, Gewürze etc. erwähnt werden. Beispiel: "Käse enthält Proteine, die bei Harnsteinen problematisch sind. Zudem kann Laktose Verdauungsprobleme verursachen." NIEMALS Laktose, Fett oder andere Faktoren VOR dem Purin-/Proteingehalt nennen!

Weitere Regeln:
- "giftig": Lebensmittel die für Hunde giftig/toxisch sind (z.B. Schokolade, Weintrauben, Rosinen, Zwiebeln, Knoblauch, Xylit, Macadamia-Nüsse, Avocado) ODER extrem purinreich
- "schadet": Lebensmittel die gesundheitliche Probleme verursachen können (fettiges, gewürztes, roher Teig, Alkohol) ODER purinreich/proteinreich
- "nicht_optimal": Nicht ideal aber in kleinen Mengen ok (Milchprodukte, süßes Obst, Brot) ODER leicht erhöhter Puringehalt
- "ok": Unbedenklich UND purinarm (z.B. Karotten, Reis, Äpfel ohne Kerne, Gurke, Kartoffel)

Antworte AUSSCHLIESSLICH mit dem JSON-Objekt, kein anderer Text.`
          },
          {
            role: "user",
            content: `Darf mein Dalmatiner "${food.trim()}" essen?`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Fehler bei der Prüfung" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
