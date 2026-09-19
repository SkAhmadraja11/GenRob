// supabase/functions/razorpay-webhook/index.ts
// Processes Razorpay payment and subscription lifecycle events.
// Upgrades/downgrades shop plans, logs billing events, and updates JWT metadata.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

    // ── Verify Razorpay webhook signature ───────────────────────
    if (webhookSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const expectedSig = Array.from(new Uint8Array(signed))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedSig !== signature) {
        console.warn('Invalid Razorpay webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.event ?? '';
    const entity = payload.payload?.subscription?.entity ?? payload.payload?.payment?.entity ?? {};
    const razorpaySubId: string = entity.subscription_id ?? entity.id ?? '';

    console.log(`Razorpay webhook received: ${eventType} | sub: ${razorpaySubId}`);

    // ── Idempotency check ───────────────────────────────────────
    const eventId = payload.id ?? `${eventType}-${Date.now()}`;
    const { data: existingEvent } = await supabaseAdmin
      .from('billing_events')
      .select('id')
      .eq('razorpay_event_id', eventId)
      .single();

    if (existingEvent) {
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Resolve shop from subscription_id ───────────────────────
    const { data: subRow } = await supabaseAdmin
      .from('plan_subscriptions')
      .select('shop_id, plan')
      .eq('razorpay_subscription_id', razorpaySubId)
      .single();

    const shopId = subRow?.shop_id ?? null;

    // ── Log billing event ────────────────────────────────────────
    await supabaseAdmin.from('billing_events').insert({
      shop_id:          shopId,
      razorpay_event_id: eventId,
      event_type:       eventType,
      amount:           entity.amount ? entity.amount / 100 : null,
      currency:         entity.currency ?? 'INR',
      raw_payload:      payload,
      processed_at:     new Date().toISOString(),
    });

    // ── Process event ────────────────────────────────────────────
    if (!shopId) {
      return new Response(JSON.stringify({ status: 'shop_not_found', event: eventType }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (eventType) {
      // ── Payment captured → activate plan ─────────────────────
      case 'payment.captured':
      case 'subscription.charged': {
        const planId = entity.plan_id ?? subRow?.plan ?? 'starter';
        const newPlan = resolvePlanFromRazorpayId(planId);
        const periodEnd = new Date(
          (entity.current_end ?? entity.charge_at ?? Date.now() / 1000) * 1000
        ).toISOString();

        await supabaseAdmin
          .from('plan_subscriptions')
          .update({
            status:               'active',
            plan:                 newPlan,
            current_period_start: new Date().toISOString(),
            current_period_end:   periodEnd,
            cancel_at_period_end: false,
            updated_at:           new Date().toISOString(),
          })
          .eq('shop_id', shopId);

        await supabaseAdmin
          .from('shops')
          .update({ plan: newPlan, updated_at: new Date().toISOString() })
          .eq('id', shopId);

        // Update JWT metadata for all users of this shop
        await updateShopUsersJwt(supabaseAdmin, shopId, newPlan);

        console.log(`Plan activated: shop ${shopId} → ${newPlan}`);
        break;
      }

      // ── Subscription activated (first payment) ────────────────
      case 'subscription.activated': {
        const newPlan = subRow?.plan ?? 'starter';
        await supabaseAdmin
          .from('plan_subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('shop_id', shopId);

        await supabaseAdmin.from('shops').update({ plan: newPlan }).eq('id', shopId);
        await updateShopUsersJwt(supabaseAdmin, shopId, newPlan);
        break;
      }

      // ── Payment failed → notify, grace period ────────────────
      case 'payment.failed':
      case 'subscription.payment.failed': {
        await supabaseAdmin
          .from('plan_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('shop_id', shopId);

        // Log a notification for the shop owner
        await supabaseAdmin.from('notification_logs').insert({
          shop_id:   shopId,
          channel:   'whatsapp',
          type:      'payment_failed',
          status:    'queued',
          metadata:  { event: eventType, amount: entity.amount / 100 },
        });
        break;
      }

      // ── Subscription cancelled / completed → downgrade ────────
      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.expired': {
        await supabaseAdmin
          .from('plan_subscriptions')
          .update({
            status:  'cancelled',
            plan:    'free',
            updated_at: new Date().toISOString(),
          })
          .eq('shop_id', shopId);

        await supabaseAdmin.from('shops').update({ plan: 'free' }).eq('id', shopId);
        await updateShopUsersJwt(supabaseAdmin, shopId, 'free');
        console.log(`Plan downgraded: shop ${shopId} → free`);
        break;
      }

      // ── Subscription paused ───────────────────────────────────
      case 'subscription.paused': {
        await supabaseAdmin
          .from('plan_subscriptions')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('shop_id', shopId);
        break;
      }

      default:
        console.log(`Unhandled event: ${eventType}`);
    }

    return new Response(JSON.stringify({ status: 'ok', event: eventType }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('razorpay-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function resolvePlanFromRazorpayId(planId: string): string {
  const starterPlanId = Deno.env.get('RAZORPAY_PLAN_ID_STARTER') ?? '';
  const proPlanId     = Deno.env.get('RAZORPAY_PLAN_ID_PRO') ?? '';
  if (planId === proPlanId)     return 'pro';
  if (planId === starterPlanId) return 'starter';
  return 'starter'; // Safe default
}

async function updateShopUsersJwt(
  supabaseAdmin: ReturnType<typeof createClient>,
  shopId: string,
  newPlan: string
) {
  // Get all user IDs for this shop
  const { data: members } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('shop_id', shopId);

  if (!members?.length) return;

  // Update JWT app_metadata for each member in parallel
  await Promise.all(
    members.map((member: { id: string; role: string }) =>
      supabaseAdmin.auth.admin.updateUserById(member.id, {
        app_metadata: {
          shop_id: shopId,
          plan:    newPlan,
          role:    member.role,
        },
      })
    )
  );
}
