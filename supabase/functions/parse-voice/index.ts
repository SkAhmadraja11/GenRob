// Supabase Edge Function: parse-voice
// Specification match: /functions/v1/parse-voice
// Deno runtime - Multilingual Trade NLU for Hindi, Telugu, English & code-mixed kirana speech

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `
You are the NLU Engine for GenRob, an Indian Kirana & Wholesale inventory system.
You parse spoken inputs in Hindi, Telugu, English, and code-mixed trade vernacular (Hinglish/Teluglish).

Trade Vocab & Units:
- "bora" / "katta" / "bag" = bag (usually 50kg or 25kg)
- "tin" / "pipa" / "dabba" = tin (usually 15kg or 15L oil)
- "peti" / "carton" / "box" = carton/box
- "patti" = packet/strip of 12 pcs
- "paav" = 0.25, "aadha" = 0.50, "sawa" = 1.25, "dedh" = 1.50, "dhaai" = 2.50
- Direction cues:
  - IN: "aaya", "aayi", "laaya", "received", "load hua", "వచ్చింది (vachindi)", "దిగింది (digindi)"
  - OUT: "bika", "becha", "diya", "sold", "out", "అమ్మాము (ammamu)", "ఇచ్చాము (ichamu)"
  - KHATA CREDIT: "udhaar", "likho", "baaki", "ఖాతా (khata)", "అప్పు (appu)"
  - KHATA PAYMENT: "jama", "de gaya", "settle", "వసూలు (vasoolu)", "చెల్లించారు (chellincharu)"
  - QUERY: "kitna bacha hai", "kya stock hai", "ఎంత ఉంది (enta undi)", "check stock"

Output ONLY valid JSON:
{
  "intent": "stock_in" | "stock_out" | "khata_credit" | "khata_payment" | "stock_query",
  "product_name": string | null,
  "quantity": number | null,
  "unit": string | null,
  "price": number | null,
  "total_amount": number | null,
  "direction": "in" | "out" | null,
  "customer_name": string | null,
  "confidence": number,
  "summary_text_hi": string,
  "summary_text_te": string,
  "summary_text_en": string
}
Do NOT include markdown backticks. Return pure JSON.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, shop_language = "hi" } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid transcript" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    // 1. Try Gemini API if key exists
    if (geminiApiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: SYSTEM_PROMPT },
                  { text: `Transcribed text to parse: "${transcript}". Preferred language: ${shop_language}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (geminiRes.ok) {
        const gemData = await geminiRes.json();
        const rawJsonText = gemData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // 2. Try OpenAI API if key exists
    if (openAiApiKey) {
      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Parse this transcript: "${transcript}"` },
          ],
        }),
      });

      if (openAiRes.ok) {
        const aiData = await openAiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        return new Response(content, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Fallback Deterministic Parser
    const parsed = ruleBasedNluParser(transcript, shop_language);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to parse NLU" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function ruleBasedNluParser(text: string, lang: string) {
  const lower = text.toLowerCase().trim();

  const isUdhaar = /उधार|likho|khata|खाता|udhar|appu|అప్పు|baki|baaki/i.test(lower);
  const isPayment = /jama|जमा|settle|paid|vasool|వసూలు/i.test(lower);
  const isQuery = /kitna|kitni|bacha|kitna stock|enta|ఎంత|how much|check stock/i.test(lower);
  const isStockIn = /aaya|aayi|laya|received|in|digindi|వచ్చింది|దిగింది|delivered/i.test(lower);
  const isStockOut = /bika|becha|diya|sold|out|ammamu|అమ్మాము|ichamu|ఇచ్చాము/i.test(lower) || (!isStockIn && !isQuery && !isUdhaar);

  let intent = "stock_out";
  let direction: "in" | "out" | null = "out";

  if (isQuery) {
    intent = "stock_query";
    direction = null;
  } else if (isUdhaar) {
    intent = "khata_credit";
    direction = null;
  } else if (isPayment) {
    intent = "khata_payment";
    direction = null;
  } else if (isStockIn) {
    intent = "stock_in";
    direction = "in";
  }

  // Quantity detection
  let quantity = 1;
  const numMatch = lower.match(/\b(\d+(\.\d+)?)\b/);
  if (numMatch) {
    quantity = parseFloat(numMatch[1]);
  } else if (/एक|ek|ఒకటి/i.test(lower)) quantity = 1;
  else if (/दो|do|రెండు/i.test(lower)) quantity = 2;
  else if (/तीन|teen|మూడు/i.test(lower)) quantity = 3;
  else if (/चार|chaar|నాలుగు/i.test(lower)) quantity = 4;
  else if (/पांच|paanch|ఐదు/i.test(lower)) quantity = 5;
  else if (/दस|dus|పది/i.test(lower)) quantity = 10;
  else if (/बीस|bees|ఇరవై/i.test(lower)) quantity = 20;
  else if (/पचास|pachaas|యాభై/i.test(lower)) quantity = 50;
  else if (/डेढ़|dedh/i.test(lower)) quantity = 1.5;
  else if (/ढाई|dhai/i.test(lower)) quantity = 2.5;

  // Unit detection
  let unit = "bag";
  if (/bora|बोरा|कट्टा|katta|bag|बैग|बस्ता|బస్తా/i.test(lower)) unit = "bag";
  else if (/tin|टिन|पीपा|pipa|dabba|డబ్బా|టిన్/i.test(lower)) unit = "tin";
  else if (/carton|कार्टन|पेटी|peti|box|బాక్స్/i.test(lower)) unit = "carton";
  else if (/patti|पट्टी|दर्जन|dozen|డజన్|పట్టీ/i.test(lower)) unit = "patti";
  else if (/packet|पैकेट|pouch|पाकेट|పాకెట్/i.test(lower)) unit = "packet";
  else if (/kg|kilo|किलो|కిలో/i.test(lower)) unit = "kg";
  else if (/litre|liter|लीटर|లీటర్/i.test(lower)) unit = "litre";
  else if (/piece|पीस|నగ|ముక్క/i.test(lower)) unit = "piece";

  // Product detection
  let product_name = "Aashirvaad Shudh Chakki Atta";
  if (/atta|आटा|godhuma|గోధుమ/i.test(lower)) {
    product_name = "Aashirvaad Shudh Chakki Atta";
  } else if (/toor|तूअर|arhar|अरहर|kandi pappu|కందిపప్పు/i.test(lower)) {
    product_name = "Tata Sampann Toor Dal Unpolished";
  } else if (/sunflower|सूरजमुखी|oil|तेल|నూనె|fortune/i.test(lower)) {
    product_name = "Fortune Sunlite Sunflower Oil";
  } else if (/basmati|बासमती|biyyam|బియ్యం|rice|चावल/i.test(lower)) {
    product_name = "India Gate Feast Rozzana Basmati Rice";
  } else if (/soap|साबुन|lifebuoy|लाइफबॉय|సబ్బు/i.test(lower)) {
    product_name = "Lifebuoy Total Germ Protection Soap 125g";
  } else if (/maggi|मैगी|noodles|మ్యాగీ/i.test(lower)) {
    product_name = "Maggi 2-Minute Noodles Masala 70g";
  } else if (/salt|नमक|tata salt|ఉప్పు/i.test(lower)) {
    product_name = "Tata Salt Vacuum Evaporated Iodized";
  }

  // Customer detection
  let customer_name: string | null = null;
  if (/ramesh|रमेश|రమేష్/i.test(lower)) customer_name = "Ramesh Kumar (Tailor)";
  else if (/lakshmi|लक्ष्मी|లక్ష్మి/i.test(lower)) customer_name = "Lakshmi Devi (Teacher)";
  else if (/venkat|वेंकट|వెంకటేష్/i.test(lower)) customer_name = "Venkatesh Goud (Auto)";
  else if (/suresh|सुरेश|సురేష్/i.test(lower)) customer_name = "Suresh Patel (Carpenter)";

  // Price & Total Amount
  let price: number | null = null;
  let total_amount: number | null = null;
  const priceMatches = lower.match(/(?:में|me|at|for|rupaye|रुपये|రూపాయలు)\s*(\d{2,6})/);
  if (priceMatches) {
    total_amount = parseFloat(priceMatches[1]);
    if (quantity > 0) price = total_amount / quantity;
  } else if (intent === 'khata_credit' || intent === 'khata_payment') {
    const amtMatches = lower.match(/(\d{2,6})/);
    if (amtMatches) total_amount = parseFloat(amtMatches[1]);
  }

  return {
    intent,
    product_name: (intent === 'khata_credit' || intent === 'khata_payment') ? null : product_name,
    quantity: (intent === 'khata_credit' || intent === 'khata_payment') ? null : quantity,
    unit: (intent === 'khata_credit' || intent === 'khata_payment') ? null : unit,
    price,
    total_amount,
    direction,
    customer_name,
    confidence: 0.95,
    summary_text_hi: `${quantity} ${unit} ${product_name} (${direction === 'in' ? 'आया' : 'बिका'})`,
    summary_text_te: `${quantity} ${unit} ${product_name} (${direction === 'in' ? 'వచ్చింది' : 'అమ్మాము'})`,
    summary_text_en: `${quantity} ${unit} ${product_name} (${direction === 'in' ? 'Stock IN' : 'Stock OUT'})`,
  };
}
