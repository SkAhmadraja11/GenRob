// supabase/functions/process-referral/index.ts
// Validates a referral code during registration and grants rewards
// once the referred shop completes their first paid subscription.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { action, referral_code, referred_shop_id } = await req.json();

    // ── Action 1: Validate referral code ───────────────────────
    if (action === 'validate') {
      if (!referral_code) {
        return jsonResponse({ valid: false, error: 'No code provided' });
      }

      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('id, name, plan')
        .eq('referral_code', referral_code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (!shop) {
        return jsonResponse({ valid: false, error: 'Invalid referral code' });
      }

      return jsonResponse({
        valid:          true,
        referrer_name:  shop.name,
        reward_message: 'Dono ko 1 month Starter plan FREE milega! 🎁',
      });
    }

    // ── Action 2: Apply reward after first payment ──────────────
    if (action === 'apply_reward') {
      if (!referred_shop_id) {
        return jsonResponse({ error: 'referred_shop_id required' }, 400);
      }

      // Find the referral record
      const { data: referral } = await supabaseAdmin
        .from('referrals')
        .select('id, referrer_shop_id, status')
        .eq('referred_shop_id', referred_shop_id)
        .eq('status', 'converted')
        .single();

      if (!referral) {
        return jsonResponse({ status: 'no_referral_found' });
      }

      if (referral.status === 'rewarded') {
        return jsonResponse({ status: 'already_rewarded' });
      }

      // Grant 1 free month to both referrer and referred shop
      const rewardEnd = new Date(Date.now() + 30 * 86400000).toISOString();

      for (const shopId of [referral.referrer_shop_id, referred_shop_id]) {
        // Extend their subscription by 30 days
        const { data: sub } = await supabaseAdmin
          .from('plan_subscriptions')
          .select('current_period_end, plan')
          .eq('shop_id', shopId)
          .single();

        const currentEnd = sub?.current_period_end
          ? new Date(sub.current_period_end)
          : new Date();

        const extendedEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + 30 * 86400000);

        await supabaseAdmin.from('plan_subscriptions').upsert({
          shop_id:             shopId,
          plan:                sub?.plan === 'free' ? 'starter' : (sub?.plan ?? 'starter'),
          status:              'active',
          current_period_end:  extendedEnd.toISOString(),
        }, { onConflict: 'shop_id' });

        // Upgrade free shops to starter for the reward period
        if (!sub?.plan || sub.plan === 'free') {
          await supabaseAdmin.from('shops').update({ plan: 'starter' }).eq('id', shopId);
        }

        // Notify via WhatsApp
        await supabaseAdmin.from('notification_logs').insert({
          shop_id:   shopId,
          channel:   'whatsapp',
          type:      'referral_reward',
          status:    'queued',
          metadata:  {
            reward_type:  'free_month',
            extended_to:  extendedEnd.toISOString(),
            message:      shopId === referral.referrer_shop_id
              ? '🎉 Aapke referral ki wajah se aapko 1 month Starter FREE mila!'
              : '🎉 Referral code use karne ke liye 1 month Starter FREE mila!',
          },
        });
      }

      // Mark referral as rewarded
      await supabaseAdmin
        .from('referrals')
        .update({ status: 'rewarded', reward_applied_at: new Date().toISOString() })
        .eq('id', referral.id);

      return jsonResponse({ status: 'rewards_applied', extended_to: rewardEnd });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    console.error('process-referral error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
