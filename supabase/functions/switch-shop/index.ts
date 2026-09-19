// supabase/functions/switch-shop/index.ts
// Allows a multi-shop staff member to switch their active shop context.
// Updates JWT app_metadata so current_shop_id() resolves the new shop.

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    const { target_shop_id } = await req.json();
    if (!target_shop_id) {
      return new Response(JSON.stringify({ error: 'target_shop_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Verify user has membership in target shop ───────────────
    const { data: membership } = await supabaseAdmin
      .from('shop_memberships')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('shop_id', target_shop_id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'No active membership in target shop' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Get target shop plan ─────────────────────────────────────
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('plan, trial_ends_at, is_active')
      .eq('id', target_shop_id)
      .single();

    if (!shop?.is_active) {
      return new Response(JSON.stringify({ error: 'Target shop is disabled' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Update JWT app_metadata ──────────────────────────────────
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        shop_id:       target_shop_id,
        plan:          shop.plan,
        role:          membership.role,
        trial_ends_at: shop.trial_ends_at,
      },
    });

    return new Response(
      JSON.stringify({ status: 'switched', shop_id: target_shop_id, plan: shop.plan }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('switch-shop error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
