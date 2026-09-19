// supabase/functions/whatsapp-ingest/index.ts
// Handles incoming WhatsApp Business API webhooks from Meta.
// Supports text messages and voice notes from shop owners.
// Routes: text → NLU parse, voice note → Whisper → NLU parse → auto-confirm or ask.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_VERIFY_TOKEN  = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? 'genrob-verify';
const META_ACCESS_TOKEN  = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const META_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const OPENAI_API_KEY     = Deno.env.get('OPENAI_API_KEY') ?? '';
const GEMINI_API_KEY     = Deno.env.get('GEMINI_API_KEY') ?? '';

serve(async (req: Request) => {
  // ── Meta Webhook Verification (GET) ────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value?.messages?.length) {
      return new Response('ok', { status: 200 });
    }

    const message = value.messages[0];
    const from    = message.from; // Sender's WhatsApp phone number
    const msgId   = message.id;

    // ── Idempotency: skip already-processed messages ─────────────
    const { data: existing } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('whatsapp_message_id', msgId)
      .single();

    if (existing) {
      return new Response('ok', { status: 200 });
    }

    // ── Resolve shop by phone number ─────────────────────────────
    const normalizedPhone = normalizePhone(from);
    const { data: shopRow } = await supabaseAdmin
      .from('shops')
      .select('id, name, primary_language, plan, settings')
      .eq('phone', normalizedPhone)
      .eq('is_active', true)
      .single();

    if (!shopRow) {
      await sendWhatsAppReply(from,
        '❌ This number is not registered with GenRob. Visit genrob.in to sign up!'
      );
      return new Response('ok', { status: 200 });
    }

    // ── Check plan: WhatsApp only for starter+ ───────────────────
    if (shopRow.plan === 'free') {
      await sendWhatsAppReply(from,
        '⚠️ WhatsApp integration requires Starter or Pro plan. Upgrade at genrob.in/billing'
      );
      return new Response('ok', { status: 200 });
    }

    const shopId   = shopRow.id;
    const language = shopRow.primary_language ?? 'hi';
    let transcript = '';

    // ── Handle text message ──────────────────────────────────────
    if (message.type === 'text') {
      transcript = message.text?.body ?? '';
    }

    // ── Handle audio (voice note) → Whisper transcription ────────
    else if (message.type === 'audio') {
      const audioId   = message.audio?.id;
      const audioUrl  = await getWhatsAppMediaUrl(audioId);

      if (audioUrl && OPENAI_API_KEY) {
        transcript = await transcribeWithWhisper(audioUrl, language);
      } else {
        await sendWhatsAppReply(from,
          '⚠️ Voice note support requires OpenAI Whisper. Please send text for now.'
        );
        return new Response('ok', { status: 200 });
      }
    }

    // ── Unsupported message type ─────────────────────────────────
    else {
      await sendWhatsAppReply(from,
        '📝 Please send text or a voice note. Example:\n"50 bag chawal aaya"\n"Atta 10 kg gaya"'
      );
      return new Response('ok', { status: 200 });
    }

    if (!transcript.trim()) {
      return new Response('ok', { status: 200 });
    }

    // ── NLU Parse ────────────────────────────────────────────────
    const parsed = await parseTranscriptViaEdgeFunction(transcript, language, shopId, supabaseAdmin);

    if (!parsed || parsed.confidence < 0.5) {
      await sendWhatsAppReply(from,
        `❓ Samajh nahi aaya: "${transcript}"\n\nPlease try again. Example:\n"50 bag chawal aaya"\n"Ramesh ka 500 udhaar"`
      );
      return new Response('ok', { status: 200 });
    }

    // ── Auto-confirm if confidence ≥ threshold ────────────────────
    const autoConfirmThreshold = shopRow.settings?.voice_confidence_threshold ?? 0.75;

    if (parsed.confidence >= autoConfirmThreshold && parsed.product_id) {
      // Insert transaction directly
      const { error: txErr } = await supabaseAdmin.from('transactions').insert({
        shop_id:              shopId,
        product_id:           parsed.product_id,
        type:                 parsed.direction === 'in' ? 'in' : 'out',
        qty:                  parsed.quantity,
        unit:                 parsed.unit,
        qty_in_base_unit:     parsed.quantity,
        price:                parsed.price ?? 0,
        total_amount:         (parsed.quantity * (parsed.price ?? 0)),
        source:               'whatsapp',
        raw_transcript:       transcript,
        confidence:           parsed.confidence,
        whatsapp_message_id:  msgId,
      });

      if (txErr) {
        console.error('Transaction insert error:', txErr);
        await sendWhatsAppReply(from, '❌ Stock update failed. Please try again.');
        return new Response('ok', { status: 200 });
      }

      // Log notification
      await supabaseAdmin.from('notification_logs').insert({
        shop_id:   shopId,
        channel:   'whatsapp',
        type:      'stock_update_confirmed',
        recipient: from,
        status:    'delivered',
        metadata:  { transcript, parsed },
      });

      const dirWord  = parsed.direction === 'in' ? 'add ho gaya ✅' : 'nikla ✅';
      const replyMsg = `✅ *${parsed.product_name}*: ${parsed.quantity} ${parsed.unit} ${dirWord}\n` +
                       `📦 Stock: "${transcript}"\n` +
                       `🕐 ${new Date().toLocaleTimeString('en-IN')}`;

      await sendWhatsAppReply(from, replyMsg);

    } else if (parsed.product_id) {
      // Low confidence: ask for confirmation
      const dirWord  = parsed.direction === 'in' ? 'aaya (stock in)' : 'gaya (stock out)';
      const replyMsg = `❓ Confirm karo:\n\n` +
                       `*${parsed.product_name}*: ${parsed.quantity} ${parsed.unit} ${dirWord}\n\n` +
                       `Reply *HAAN* to confirm\nReply *NAHI* to cancel`;

      await sendWhatsAppReply(from, replyMsg);

      // Store pending confirmation in notification_logs for retrieval
      await supabaseAdmin.from('notification_logs').insert({
        shop_id:   shopId,
        channel:   'whatsapp',
        type:      'pending_confirmation',
        recipient: from,
        status:    'queued',
        metadata:  { transcript, parsed, original_message_id: msgId },
      });

    } else {
      // Ambiguous — could not match product
      await sendWhatsAppReply(from,
        `❓ *"${parsed.product_name ?? transcript}"* ka stock mein koi product nahi mila.\n\n` +
        `GenRob app mein product add karein: genrob.in`
      );
    }

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('whatsapp-ingest error:', err);
    return new Response('ok', { status: 200 }); // Always 200 to Meta
  }
});

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  // Meta sends numbers without '+': "919876543210" → "+919876543210"
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12
    ? `+${digits}`
    : `+${digits}`;
}

async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
  if (!META_ACCESS_TOKEN) return null;
  const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
  });
  const data = await res.json();
  return data.url ?? null;
}

async function transcribeWithWhisper(audioUrl: string, language: string): Promise<string> {
  // Download the audio file from Meta's CDN
  const audioRes = await fetch(audioUrl, {
    headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
  });
  const audioBlob = await audioRes.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', language === 'hi' ? 'hi' : language === 'te' ? 'te' : 'en');

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  const whisperData = await whisperRes.json();
  return whisperData.text ?? '';
}

async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp reply to ${to}]: ${message}`);
    return;
  }

  await fetch(`https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });
}

async function parseTranscriptViaEdgeFunction(
  transcript: string,
  language:   string,
  shopId:     string,
  supabase:   ReturnType<typeof createClient>
): Promise<any> {
  // Try pgvector fuzzy match first (fast, no LLM cost)
  const { data: aliasMatches } = await supabase.rpc('match_product_aliases', {
    p_shop_id:         shopId,
    p_query_text:      transcript,
    p_query_embedding: null,
    p_match_threshold: 0.3,
    p_match_count:     3,
  });

  const bestMatch = aliasMatches?.[0];

  // Extract quantity from transcript with simple regex
  const qtyMatch = transcript.match(/(\d+(?:\.\d+)?)/);
  const quantity  = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

  // Direction detection
  const stockInWords  = ['aaya', 'aai', 'aayi', 'mila', 'mili', 'add', 'in', 'stock in', 'purchase'];
  const stockOutWords = ['gaya', 'gayi', 'becha', 'beci', 'sold', 'out', 'stock out', 'nikla'];
  const lowerTx = transcript.toLowerCase();
  const direction = stockOutWords.some((w) => lowerTx.includes(w)) ? 'out' : 'in';

  if (bestMatch && bestMatch.similarity_score > 0.3) {
    return {
      product_id:   bestMatch.product_id,
      product_name: bestMatch.product_name,
      quantity,
      unit:         bestMatch.unit,
      direction,
      confidence:   Math.min(bestMatch.similarity_score + 0.2, 0.99),
      price:        bestMatch.price,
    };
  }

  // Fallback: LLM parse via Gemini
  if (GEMINI_API_KEY) {
    try {
      const prompt = `Extract inventory transaction from this Indian shop message: "${transcript}"
Return JSON: {"product": "...", "quantity": N, "unit": "...", "direction": "in|out", "confidence": 0.0-1.0}
Only return valid JSON, nothing else.`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      const geminiData = await geminiRes.json();
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      return {
        product_id:   null, // Will show as unmatched
        product_name: parsed.product ?? '',
        quantity:     parsed.quantity ?? quantity,
        unit:         parsed.unit ?? 'piece',
        direction:    parsed.direction ?? direction,
        confidence:   parsed.confidence ?? 0.4,
        price:        0,
      };
    } catch (e) {
      console.error('LLM parse error:', e);
    }
  }

  return { product_id: null, product_name: '', quantity, unit: 'piece', direction, confidence: 0 };
}
