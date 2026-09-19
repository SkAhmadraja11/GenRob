// supabase/functions/create-subscription/index.ts
// Creates a Razorpay subscription/order for plan upgrades.
// Called by BillingPortal.tsx when user clicks "Upgrade".

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Razorpay Plan IDs (set these in Supabase Edge Function secrets)
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  starter: Deno.env.get('RAZORPAY_PLAN_ID_STARTER') ?? '',
  pro:     Deno.env.get('RAZORPAY_PLAN_ID_PRO') ?? '',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan, action } = await req.json();

    // ── Get shop_id from users table ────────────────────────────
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!userRow?.shop_id) {
      return new Response(JSON.stringify({ error: 'Shop not found for user' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shopId = userRow.shop_id;

    // ── Handle downgrade / cancellation ─────────────────────────
    if (action === 'cancel' || plan === 'free') {
      const { data: sub } = await supabaseAdmin
        .from('plan_subscriptions')
        .select('razorpay_subscription_id')
        .eq('shop_id', shopId)
        .single();

      if (sub?.razorpay_subscription_id) {
        // Cancel Razorpay subscription at period end
        const razorpayKey = Deno.env.get('RAZORPAY_KEY_ID')!;
        const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
        const basicAuth = btoa(`${razorpayKey}:${razorpaySecret}`);

        await fetch(
          `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cancel_at_cycle_end: 1 }),
          }
        );
      }

      await supabaseAdmin
        .from('plan_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('shop_id', shopId);

      return new Response(JSON.stringify({ status: 'cancellation_scheduled' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate plan ────────────────────────────────────────────
    if (!['starter', 'pro'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayKey    = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    // ── If no Razorpay keys configured → activate trial directly ─
    if (!razorpayKey || !razorpaySecret) {
      const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
      await supabaseAdmin.from('plan_subscriptions').upsert({
        shop_id: shopId,
        plan,
        status: 'trialing',
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd,
      }, { onConflict: 'shop_id' });

      await supabaseAdmin.from('shops').update({ plan }).eq('id', shopId);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...(user.app_metadata ?? {}), plan },
      });

      return new Response(JSON.stringify({ status: 'trialing', trial_ends_at: trialEnd }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Create Razorpay customer if needed ──────────────────────
    const { data: sub } = await supabaseAdmin
      .from('plan_subscriptions')
      .select('razorpay_customer_id, razorpay_subscription_id')
      .eq('shop_id', shopId)
      .single();

    const basicAuth = btoa(`${razorpayKey}:${razorpaySecret}`);

    let razorpayCustomerId = sub?.razorpay_customer_id;
    if (!razorpayCustomerId) {
      const { data: shopRow } = await supabaseAdmin
        .from('shops')
        .select('name, owner_name, phone')
        .eq('id', shopId)
        .single();

      const custRes = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name:    shopRow?.owner_name ?? 'GenRob User',
          contact: shopRow?.phone ?? user.phone ?? '',
          email:   user.email ?? '',
        }),
      });
      const custData = await custRes.json();
      razorpayCustomerId = custData.id;
    }

    // ── Create Razorpay subscription ────────────────────────────
    const planId = RAZORPAY_PLAN_IDS[plan];
    if (!planId) {
      return new Response(JSON.stringify({ error: `Razorpay plan ID not configured for ${plan}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id:       planId,
        customer_id:   razorpayCustomerId,
        total_count:   12,        // 12-month subscription cycle
        quantity:      1,
        addons:        [],
        notify_info: {
          notify_phone: user.phone ?? '',
          notify_whatsapp: 1,
        },
      }),
    });

    const subData = await subRes.json();

    if (subData.error) {
      console.error('Razorpay error:', subData.error);
      return new Response(JSON.stringify({ error: subData.error.description ?? 'Razorpay error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Persist subscription state ───────────────────────────────
    await supabaseAdmin.from('plan_subscriptions').upsert({
      shop_id:                 shopId,
      plan,
      razorpay_subscription_id: subData.id,
      razorpay_customer_id:    razorpayCustomerId,
      razorpay_plan_id:        planId,
      status:                  'trialing',
      current_period_start:    new Date().toISOString(),
    }, { onConflict: 'shop_id' });

    // ── Return Razorpay checkout URL ─────────────────────────────
    // Frontend will open this URL in a new tab / Razorpay checkout modal
    const checkoutUrl = `https://razorpay.com/payment-link/${subData.short_url ?? subData.id}`;

    return new Response(
      JSON.stringify({
        subscription_id: subData.id,
        checkout_url:    subData.short_url ?? checkoutUrl,
        status:          subData.status,
        plan,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('create-subscription error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
