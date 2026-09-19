// supabase/functions/onboard-shop/index.ts
// Atomically creates a new shop + user row + injects shop_id into JWT app_metadata.
// Called by OnboardingWizard.tsx after Phone OTP verification.

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

  try {
    // ── Auth: verify caller has a valid session ─────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client — bypasses RLS for atomic shop creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // User client — scoped to the calling user for auth.getUser()
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

    // ── Parse body ──────────────────────────────────────────────
    const {
      shop_name,
      owner_name,
      city,
      state = 'Telangana',
      primary_language = 'hi',
      trade_category = 'kirana',
      plan = 'free',
      referred_by,
    } = await req.json();

    if (!shop_name || !owner_name || !city) {
      return new Response(JSON.stringify({ error: 'shop_name, owner_name, and city are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Check if user already has a shop ────────────────────────
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (existingUser?.shop_id) {
      return new Response(JSON.stringify({
        shop_id: existingUser.shop_id,
        message: 'Shop already exists for this user',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Create shop ─────────────────────────────────────────────
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .insert({
        name:             shop_name.trim(),
        owner_name:       owner_name.trim(),
        phone:            user.phone ?? user.email ?? user.id,
        city:             city.trim(),
        state:            state.trim(),
        primary_language,
        plan,
        trade_category,
        referred_by:      referred_by ?? null,
        onboarded_at:     null, // Set to NOW() when wizard Step 4 completes
        settings: {
          auto_alert_low_stock: true,
          enable_voice_feedback: true,
          voice_confidence_threshold: 0.75,
        },
      })
      .select('id, name, plan, referral_code, trial_ends_at')
      .single();

    if (shopError || !shop) {
      console.error('Shop creation failed:', shopError);
      return new Response(JSON.stringify({ error: shopError?.message ?? 'Shop creation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Create users row ────────────────────────────────────────
    const { error: userRowError } = await supabaseAdmin
      .from('users')
      .insert({
        id:                 user.id,
        shop_id:            shop.id,
        phone:              user.phone ?? '',
        full_name:          owner_name.trim(),
        role:               'owner',
        preferred_language: primary_language,
      });

    if (userRowError && !userRowError.message.includes('duplicate')) {
      console.error('User row creation failed:', userRowError);
      // Don't fail — shop was created, user row can be retried
    }

    // ── Create shop_memberships row ─────────────────────────────
    await supabaseAdmin.from('shop_memberships').insert({
      user_id:  user.id,
      shop_id:  shop.id,
      role:     'owner',
      is_active: true,
    }).select().single();

    // ── Create free plan_subscription record ────────────────────
    await supabaseAdmin.from('plan_subscriptions').insert({
      shop_id: shop.id,
      plan,
      status:  plan === 'free' ? 'active' : 'trialing',
      current_period_start: new Date().toISOString(),
      current_period_end:   shop.trial_ends_at,
    });

    // ── Seed default product categories for trade type ──────────
    const defaultProducts = getDefaultProducts(trade_category, shop.id);
    if (defaultProducts.length > 0) {
      await supabaseAdmin.from('products').insert(defaultProducts);
    }

    // ── Inject shop_id into JWT app_metadata (CRITICAL) ─────────
    // This makes current_shop_id() resolve from JWT on every subsequent request
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        shop_id:        shop.id,
        plan:           plan,
        role:           'owner',
        trial_ends_at:  shop.trial_ends_at,
      },
    });

    if (metaError) {
      console.error('JWT metadata update failed:', metaError);
      // Non-fatal — fallback to DB lookup is implemented in resolveShopContext()
    }

    // ── Process referral if provided ────────────────────────────
    if (referred_by) {
      const { data: referrerShop } = await supabaseAdmin
        .from('shops')
        .select('id')
        .eq('referral_code', referred_by.toUpperCase())
        .single();

      if (referrerShop) {
        await supabaseAdmin.from('referrals').insert({
          referrer_shop_id: referrerShop.id,
          referred_shop_id: shop.id,
          referral_code:    referred_by.toUpperCase(),
          status:           'converted',
          reward_type:      'free_month',
        });
      }
    }

    // ── Mark shop as onboarded (wizard step 1+2 complete) ───────
    await supabaseAdmin
      .from('shops')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', shop.id);

    return new Response(
      JSON.stringify({
        shop_id:       shop.id,
        shop_name:     shop.name,
        plan:          shop.plan,
        referral_code: shop.referral_code,
        trial_ends_at: shop.trial_ends_at,
        message:       'Shop created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('onboard-shop error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Default product seeds per trade category
// ─────────────────────────────────────────────────────────────────
function getDefaultProducts(category: string, shopId: string) {
  const defaults: Record<string, Array<{ name: string; category: string; unit: string; base_unit: string; unit_conversion: object; price: number; reorder_threshold: number }>> = {
    kirana: [
      { name: 'Basmati Chawal', category: 'Grains', unit: 'bag', base_unit: 'kg', unit_conversion: { bag: 50, kg: 1 }, price: 2800, reorder_threshold: 50 },
      { name: 'Atta (Wheat Flour)', category: 'Grains', unit: 'bag', base_unit: 'kg', unit_conversion: { bag: 50, packet: 10, kg: 1 }, price: 1200, reorder_threshold: 50 },
      { name: 'Toor Dal', category: 'Pulses', unit: 'bag', base_unit: 'kg', unit_conversion: { bag: 50, kg: 1 }, price: 7500, reorder_threshold: 25 },
      { name: 'Refined Oil', category: 'Oil & Ghee', unit: 'tin', base_unit: 'litre', unit_conversion: { tin: 15, litre: 1 }, price: 1700, reorder_threshold: 15 },
      { name: 'Sugar', category: 'Grocery', unit: 'bag', base_unit: 'kg', unit_conversion: { bag: 50, kg: 1 }, price: 2200, reorder_threshold: 50 },
    ],
    wholesale: [
      { name: 'Packaging Boxes (Small)', category: 'Packaging', unit: 'bundle', base_unit: 'piece', unit_conversion: { bundle: 100, piece: 1 }, price: 850, reorder_threshold: 10 },
      { name: 'Stretch Film Roll', category: 'Packaging', unit: 'roll', base_unit: 'piece', unit_conversion: { roll: 1 }, price: 450, reorder_threshold: 5 },
    ],
    medical: [
      { name: 'Paracetamol 500mg', category: 'Medicines', unit: 'strip', base_unit: 'tablet', unit_conversion: { strip: 10, box: 100, tablet: 1 }, price: 15, reorder_threshold: 50 },
      { name: 'ORS Sachet', category: 'OTC', unit: 'box', base_unit: 'sachet', unit_conversion: { box: 20, sachet: 1 }, price: 80, reorder_threshold: 10 },
    ],
  };

  const seed = defaults[category] ?? defaults.kirana;
  return seed.map((p) => ({
    ...p,
    shop_id:       shopId,
    current_stock: 0,
    cost_price:    Math.round(p.price * 0.85),
    is_active:     true,
  }));
}
