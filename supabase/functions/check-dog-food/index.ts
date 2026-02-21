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
  "reason": "Kurze Begründung auf Deutsch, max 2 Sätze"
}

Regeln:
- "giftig": Lebensmittel die für Hunde giftig/toxisch sind (z.B. Schokolade, Weintrauben, Rosinen, Zwiebeln, Knoblauch, Xylit, Macadamia-Nüsse, Avocado)
- "schadet": Lebensmittel die gesundheitliche Probleme verursachen können aber nicht direkt giftig sind (z.B. sehr fettiges, stark gewürztes, roher Teig, Alkohol)
- "nicht_optimal": Lebensmittel die nicht ideal sind aber in kleinen Mengen ok (z.B. Milchprodukte bei Laktoseintoleranz, sehr süßes Obst, Brot)
- "ok": Lebensmittel die unbedenklich für Hunde sind (z.B. Karotten, Reis, Hühnchen gekocht, Äpfel ohne Kerne)

WICHTIG - Puringehalt für Dalmatiner: Dieser Hund ist ein Dalmatiner mit diagnostizierten Harnsteinen. Purinreiche Lebensmittel sind extrem gefährlich! Folgende Lebensmittel haben hohen Puringehalt und müssen als "schadet" oder "giftig" eingestuft werden: Fleisch (Rind, Schwein, Wild, Lamm), Innereien (Leber, Niere, Herz), Geflügel mit Haut, fetter Fisch (Sardinen, Hering, Makrele, Forelle, Lachs), Hefe, Hülsenfrüchte (Linsen, Erbsen, Bohnen), Spinat, Spargel. Nur sehr purinarmes Fleisch wie Hühnerbrust ohne Haut in kleinen Mengen kann als "nicht_optimal" gelten. Im Zweifel immer strenger bewerten!

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
