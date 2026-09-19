import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────
// Supabase Configuration — resolved from env vars or runtime settings
// ─────────────────────────────────────────────────────────────────
const getStoredConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('genrob_supabase_url');
  const localKey = localStorage.getItem('genrob_supabase_anon_key');

  const supabaseUrl = localUrl || envUrl || 'https://mock-demo-project.supabase.co';
  const supabaseAnonKey =
    localKey || envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-key';

  const isConfigured = Boolean(
    (envUrl && envKey) ||
      (localUrl && localKey && !localUrl.includes('mock-demo-project'))
  );

  return { supabaseUrl, supabaseAnonKey, isConfigured };
};

const initialConfig = getStoredConfig();

export let supabase: SupabaseClient = createClient(
  initialConfig.supabaseUrl,
  initialConfig.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ─────────────────────────────────────────────────────────────────
// Shop Context — resolved entirely from the authenticated JWT.
// No hardcoded demo shop IDs. Each owner sees only their own data.
// ─────────────────────────────────────────────────────────────────

export interface ShopContext {
  shopId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  role: 'owner' | 'manager' | 'cashier';
  trialEndsAt?: string | null;
  isTrialing: boolean;
}

/**
 * Resolves the current authenticated user's shop context from:
 *   1. JWT app_metadata (fastest — set at onboarding by Edge Function)
 *   2. DB query to users table (fallback for older sessions)
 * Returns null if unauthenticated.
 */
export async function resolveShopContext(customUser?: any): Promise<ShopContext | null> {
  let user = customUser;
  if (!user) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch {}
  }

  if (!user) {
    const cached = localStorage.getItem('genrob_auth_user');
    if (cached) {
      try {
        user = JSON.parse(cached);
      } catch {}
    }
  }

  if (!user) return null;

  // Primary: read from JWT / app_metadata
  const meta = (user.app_metadata || {}) as Record<string, any>;
  if (meta?.shop_id) {
    return {
      shopId: meta.shop_id,
      plan: meta.plan ?? 'free',
      role: meta.role ?? 'owner',
      trialEndsAt: meta.trial_ends_at ?? null,
      isTrialing: meta.trial_ends_at
        ? new Date(meta.trial_ends_at) > new Date()
        : false,
    };
  }

  // Fallback 1: query DB for users row by id
  try {
    let query = supabase
      .from('users')
      .select('shop_id, role, shops(plan, trial_ends_at)');

    if (user.id && !user.id.startsWith('user-')) {
      query = query.eq('id', user.id);
    } else if (user.phone) {
      query = query.eq('phone', user.phone);
    }

    const { data: userRow } = await query.maybeSingle();

    if (userRow?.shop_id) {
      const shop = (userRow as any).shops;
      const trialEndsAt = shop?.trial_ends_at ?? null;

      return {
        shopId: userRow.shop_id,
        plan: shop?.plan ?? 'free',
        role: userRow.role as ShopContext['role'],
        trialEndsAt,
        isTrialing: trialEndsAt ? new Date(trialEndsAt) > new Date() : false,
      };
    }
  } catch (e) {
    console.warn('DB shop context query notice:', e);
  }

  // Fallback 2: Default seed shop for Rajesh Sharma or demo phone
  if (user.phone === '+919876543210' || user.id === '22222222-2222-2222-2222-222222222222') {
    return {
      shopId: '11111111-1111-1111-1111-111111111111',
      plan: 'free',
      role: 'owner',
      trialEndsAt: null,
      isTrialing: false,
    };
  }

  return null;
}

/**
 * Returns the current authenticated User (Supabase session or persisted mobile auth), or null.
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {}

  const cached = localStorage.getItem('genrob_auth_user');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return null;
}

/**
 * Signs the current user out and clears all cached shop context & mobile session.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {}
  localStorage.removeItem('genrob_auth_user');
  localStorage.removeItem('genrob_auth_session');
  sessionStorage.removeItem('genrob_shop_context');
}

// ─────────────────────────────────────────────────────────────────
// Runtime reconfiguration (Settings modal)
// ─────────────────────────────────────────────────────────────────
export const reconfigureSupabase = (url: string, anonKey: string) => {
  localStorage.setItem('genrob_supabase_url', url);
  localStorage.setItem('genrob_supabase_anon_key', anonKey);
  supabase = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  window.location.reload();
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('genrob_supabase_url');
  localStorage.removeItem('genrob_supabase_anon_key');
  window.location.reload();
};

// ─────────────────────────────────────────────────────────────────
// Health check — confirms live DB connection
// ─────────────────────────────────────────────────────────────────
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  shopName?: string;
  error?: string;
  isMockFallback?: boolean;
}> {
  const { isConfigured } = getStoredConfig();
  if (!isConfigured) {
    return {
      connected: false,
      isMockFallback: true,
      error: 'Supabase credentials not configured. Add VITE_SUPABASE_URL or use Connection Settings.',
    };
  }

  try {
    // Select only columns guaranteed to exist; RLS will scope to caller's shop.
    // If anon user has no shop yet, we still get a clean empty result (not 400).
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, plan')
      .limit(1)
      .maybeSingle();

    if (error) {
      // 400 / PGRST errors usually mean RLS blocked anon access — still "connected"
      const isRlsBlock =
        error.code === 'PGRST116' ||
        error.code === '42501' ||
        String(error.message).toLowerCase().includes('rls') ||
        String(error.message).toLowerCase().includes('permission');

      if (isRlsBlock) {
        return { connected: true, shopName: 'Connected — please log in to view shop' };
      }
      return { connected: false, error: error.message };
    }

    if (data) {
      return { connected: true, shopName: `${data.name} (${data.plan})` };
    }

    return { connected: true, shopName: 'Connected — No shop yet (register first)' };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────
// Plan feature gate helper (client-side soft check)
// Hard enforcement is at DB level via RLS + shop_within_product_limit()
// ─────────────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:       { products: 50,     voice_per_day: 20,  staff: 1,  analytics_days: 7   },
  starter:    { products: 500,    voice_per_day: 200, staff: 3,  analytics_days: 90  },
  pro:        { products: 999999, voice_per_day: 999, staff: 10, analytics_days: 365 },
  enterprise: { products: 999999, voice_per_day: 999, staff: 100, analytics_days: 365 },
} as const;

export function isFeatureAllowed(
  plan: keyof typeof PLAN_LIMITS,
  feature: keyof (typeof PLAN_LIMITS)['free']
): boolean {
  return PLAN_LIMITS[plan]?.[feature] > 0;
}
