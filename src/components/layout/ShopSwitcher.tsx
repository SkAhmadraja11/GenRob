import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useShopAuth } from '../../hooks/useShopAuth';

interface ShopMembership {
  shop_id: string;
  shop_name: string;
  role: string;
  plan: string;
  is_active: boolean;
}

interface Props {
  onShopSwitch?: (shopId: string) => void;
}

const PLAN_BADGES: Record<string, string> = {
  free:       'bg-slate-700 text-slate-400',
  starter:    'bg-amber-900/50 text-amber-400',
  pro:        'bg-violet-900/50 text-violet-400',
  enterprise: 'bg-emerald-900/50 text-emerald-400',
};

export function ShopSwitcher({ onShopSwitch }: Props) {
  const { user, shopContext } = useShopAuth();
  const [memberships, setMemberships] = useState<ShopMembership[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadMemberships();
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadMemberships = async () => {
    const { data } = await supabase
      .from('shop_memberships')
      .select(`
        shop_id,
        role,
        is_active,
        shops!inner(name, plan, is_active)
      `)
      .eq('user_id', user!.id)
      .eq('is_active', true);

    if (!data) return;

    setMemberships(
      data.map((m: any) => ({
        shop_id:   m.shop_id,
        shop_name: m.shops.name,
        role:      m.role,
        plan:      m.shops.plan,
        is_active: m.shops.is_active,
      }))
    );
  };

  const handleSwitch = async (shopId: string) => {
    if (shopId === shopContext?.shopId) {
      setIsOpen(false);
      return;
    }
    setSwitching(shopId);

    try {
      // Call Edge Function to update JWT app_metadata with new shop_id
      const res = await supabase.functions.invoke('switch-shop', {
        body: { target_shop_id: shopId },
      });

      if (res.error) throw new Error(res.error.message);

      // Refresh auth session to pick up new JWT
      await supabase.auth.refreshSession();
      onShopSwitch?.(shopId);

      // Hard reload to re-initialize all data for new shop
      window.location.reload();
    } catch (err) {
      console.error('Shop switch failed:', err);
    } finally {
      setSwitching(null);
      setIsOpen(false);
    }
  };

  // Only render if user has 2+ shop memberships
  if (memberships.length <= 1) return null;

  const currentShop = memberships.find((m) => m.shop_id === shopContext?.shopId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm"
        title="Switch Shop"
      >
        <span className="text-amber-400">🏪</span>
        <span className="text-white font-semibold text-xs truncate max-w-[100px]">
          {currentShop?.shop_name ?? 'My Shop'}
        </span>
        <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400">Switch Shop</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {memberships.length} shops linked to your account
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {memberships.map((m) => {
              const isActive = m.shop_id === shopContext?.shopId;
              const isLoading = switching === m.shop_id;

              return (
                <button
                  key={m.shop_id}
                  onClick={() => handleSwitch(m.shop_id)}
                  disabled={isActive || isLoading || !m.is_active}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 cursor-default'
                      : m.is_active
                      ? 'hover:bg-slate-800 cursor-pointer'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '🏪'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">
                        {m.shop_name}
                      </span>
                      {isActive && (
                        <span className="text-xs text-amber-400 font-bold shrink-0">✓ Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold capitalize ${PLAN_BADGES[m.plan] ?? PLAN_BADGES.free}`}>
                        {m.plan}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">{m.role}</span>
                      {!m.is_active && (
                        <span className="text-xs text-red-500">Disabled</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-600">
              💡 To add a new shop, register a new account.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
