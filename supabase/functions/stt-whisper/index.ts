// Supabase Edge Function: stt-whisper
// Deno runtime - Handles speech-to-text for audio blobs and WhatsApp voice notes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "hi"; // hi, te, en

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided in request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      // Graceful fallback simulation if external API key is not configured in local environment
      return new Response(
        JSON.stringify({
          transcript: "दो बोरा आशीर्वाद आटा आया 2100 में",
          confidence: 0.94,
          language_detected: language,
          duration_seconds: 3.2,
          provider: "fallback_simulation",
          note: "Set OPENAI_API_KEY in Supabase secrets for production Whisper STT"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", language === "te" ? "te" : language === "hi" ? "hi" : "en");
    whisperFormData.append("prompt", "Kirana store trade stock in out: bora, tin, peti, patti, packet, kg, quintal, udhaar, khata");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      return new Response(
        JSON.stringify({ error: "Whisper API failure", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const whisperData = await whisperRes.json();

    return new Response(
      JSON.stringify({
        transcript: whisperData.text,
        confidence: 0.95,
        language_detected: language,
        provider: "openai_whisper",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal STT error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
