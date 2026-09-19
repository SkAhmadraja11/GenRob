import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  resolveShopContext,
  ShopContext,
  PLAN_LIMITS,
} from '../lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface AuthState {
  user: any | null;
  shopContext: ShopContext | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  /** Whether the current shop's plan allows a given feature */
  canUse: (feature: keyof (typeof PLAN_LIMITS)['free']) => boolean;
  /** Current product count against plan limit */
  productLimit: number;
  loginWithPhone: (userData: any) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface ShopProviderProps {
  children: ReactNode;
}

// ─────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────
const ShopAuthContext = createContext<AuthState>({
  user: null,
  shopContext: null,
  loading: true,
  isAuthenticated: false,
  isOnboarded: false,
  canUse: () => false,
  productLimit: 50,
  loginWithPhone: async () => {},
  refresh: async () => {},
  signOut: async () => {},
});

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────
export function ShopAuthProvider({ children }: ShopProviderProps) {
  const [user, setUser] = useState<any | null>(null);
  const [shopContext, setShopContext] = useState<ShopContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const checkOnboardedState = async (shopId: string): Promise<boolean> => {
    // Seed Kirana is always onboarded with its live 18 products
    if (shopId === '11111111-1111-1111-1111-111111111111') return true;
    if (localStorage.getItem(`genrob_onboarded_${shopId}`)) return true;

    try {
      const { data: shopRow } = await supabase
        .from('shops')
        .select('onboarded_at, name')
        .eq('id', shopId)
        .maybeSingle();

      if (shopRow?.onboarded_at) return true;

      // Also check if products exist for this shop
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  };

  const loginWithPhone = useCallback(async (userData: any) => {
    localStorage.setItem('genrob_auth_user', JSON.stringify(userData));
    setUser(userData);
    const ctx = await resolveShopContext(userData);
    setShopContext(ctx);
    if (ctx?.shopId) {
      const isDone = await checkOnboardedState(ctx.shopId);
      setIsOnboarded(isDone);
    } else {
      setIsOnboarded(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let currentUser: any = null;
      try {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user ?? null;
      } catch (e) {
        console.warn('Supabase auth session fetch notice:', e);
      }

      if (!currentUser) {
        const cached = localStorage.getItem('genrob_auth_user');
        if (cached) {
          try {
            currentUser = JSON.parse(cached);
          } catch {}
        }
      }

      setUser(currentUser);

      if (currentUser) {
        const ctx = await resolveShopContext(currentUser);
        setShopContext(ctx);

        if (ctx?.shopId) {
          const isDone = await checkOnboardedState(ctx.shopId);
          setIsOnboarded(isDone);
        } else {
          setIsOnboarded(false);
        }
      } else {
        setShopContext(null);
        setIsOnboarded(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Subscribe to Supabase auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          if (session?.user) {
            localStorage.setItem('genrob_auth_user', JSON.stringify(session.user));
            const ctx = await resolveShopContext(session.user);
            setShopContext(ctx);
            if (ctx?.shopId) {
              const isDone = await checkOnboardedState(ctx.shopId);
              setIsOnboarded(isDone);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('genrob_auth_user');
          localStorage.removeItem('genrob_auth_session');
          sessionStorage.removeItem('genrob_shop_context');
          setUser(null);
          setShopContext(null);
          setIsOnboarded(false);
        }
        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  const canUse = useCallback(
    (feature: keyof (typeof PLAN_LIMITS)['free']): boolean => {
      const plan = shopContext?.plan ?? 'free';
      return (PLAN_LIMITS[plan]?.[feature] ?? 0) > 0;
    },
    [shopContext]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('genrob_auth_user');
    localStorage.removeItem('genrob_auth_session');
    sessionStorage.removeItem('genrob_shop_context');
    setUser(null);
    setShopContext(null);
    setIsOnboarded(false);
  }, []);

  const value: AuthState = {
    user,
    shopContext,
    loading,
    isAuthenticated: Boolean(user),
    isOnboarded,
    canUse,
    productLimit: PLAN_LIMITS[shopContext?.plan ?? 'free'].products,
    loginWithPhone,
    refresh,
    signOut: handleSignOut,
  };

  return (
    <ShopAuthContext.Provider value={value}>
      {children}
    </ShopAuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook — use anywhere in the app
// ─────────────────────────────────────────────────────────────────
export function useShopAuth() {
  return useContext(ShopAuthContext);
}
