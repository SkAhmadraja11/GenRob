import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useShopAuth } from '../../hooks/useShopAuth';

interface PlatformStats {
  total_shops: number;
  active_shops_7d: number;
  total_voice_txns: number;
  total_gmv: number;
  shops_by_plan: { plan: string; count: number }[];
  shops_by_city: { city: string; count: number }[];
  daily_stats: { day: string; active_shops: number; voice_transactions: number; total_gmv_inr: number }[];
}

interface ShopRow {
  id: string;
  name: string;
  owner_name: string;
  city: string;
  plan: string;
  is_active: boolean;
  onboarded_at: string | null;
  created_at: string;
}

export function AdminDashboard() {
  const { user } = useShopAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'shops'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Guard: only superadmin can access
  const isSuperAdmin = (user?.app_metadata as any)?.role === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAdminData();
  }, [isSuperAdmin]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Parallel fetch all admin data
      const [shopsRes, txnsRes, dailyRes] = await Promise.all([
        supabase.from('shops').select('id, name, owner_name, city, plan, is_active, onboarded_at, created_at').order('created_at', { ascending: false }),
        supabase.from('transactions').select('id, shop_id, source, total_amount, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('platform_daily_stats').select('*').order('day', { ascending: false }).limit(14),
      ]);

      const allShops: ShopRow[] = shopsRes.data ?? [];
      const allTxns = txnsRes.data ?? [];
      const dailyStats = dailyRes.data ?? [];

      const activeShopIds = new Set(allTxns.map((t) => t.shop_id));

      const planCounts = allShops.reduce<Record<string, number>>((acc, s) => {
        acc[s.plan] = (acc[s.plan] ?? 0) + 1;
        return acc;
      }, {});

      const cityCounts = allShops.reduce<Record<string, number>>((acc, s) => {
        acc[s.city] = (acc[s.city] ?? 0) + 1;
        return acc;
      }, {});

      setShops(allShops);
      setStats({
        total_shops: allShops.length,
        active_shops_7d: activeShopIds.size,
        total_voice_txns: allTxns.filter((t) => t.source === 'voice').length,
        total_gmv: allTxns.reduce((sum, t) => sum + (t.total_amount ?? 0), 0),
        shops_by_plan: Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
        shops_by_city: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })),
        daily_stats: dailyStats,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (shopId: string, newPlan: string) => {
    await supabase.from('shops').update({ plan: newPlan }).eq('id', shopId);
    await supabase.from('plan_subscriptions').update({ plan: newPlan }).eq('shop_id', shopId);
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user!.id,
      action: 'plan_change',
      target_shop_id: shopId,
      metadata: { new_plan: newPlan },
    });
    loadAdminData();
  };

  const handleToggleShop = async (shopId: string, isActive: boolean) => {
    await supabase.from('shops').update({ is_active: !isActive }).eq('id', shopId);
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user!.id,
      action: isActive ? 'shop_disable' : 'shop_enable',
      target_shop_id: shopId,
      metadata: {},
    });
    loadAdminData();
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">Super-admin access required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PLAN_COLORS: Record<string, string> = {
    free: 'bg-slate-700 text-slate-300',
    starter: 'bg-amber-900/40 text-amber-400',
    pro: 'bg-violet-900/40 text-violet-400',
    enterprise: 'bg-emerald-900/40 text-emerald-400',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Admin Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-amber-400">GenRob</span>
            <span className="text-xs bg-red-900/40 text-red-400 border border-red-700/40 px-2 py-0.5 rounded-full font-bold">
              SUPER ADMIN
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-2">
          {(['overview', 'shops'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'overview' ? '📊 Platform Overview' : '🏪 All Shops'}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Shops', value: stats.total_shops, icon: '🏪', color: 'amber' },
                { label: 'Active (7d)', value: stats.active_shops_7d, icon: '✅', color: 'emerald' },
                { label: 'Voice Txns (7d)', value: stats.total_voice_txns, icon: '🎙️', color: 'violet' },
                { label: 'GMV (7d) ₹', value: `₹${(stats.total_gmv / 1000).toFixed(1)}K`, icon: '💰', color: 'orange' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-2xl mb-1">{kpi.icon}</div>
                  <div className="text-2xl font-black text-white">{kpi.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Plan Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Shops by Plan</h3>
                <div className="space-y-3">
                  {stats.shops_by_plan.map(({ plan, count }) => (
                    <div key={plan} className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan] ?? 'bg-slate-700 text-slate-300'}`}>
                        {plan}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.round((count / stats.total_shops) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Top Cities</h3>
                <div className="space-y-3">
                  {stats.shops_by_city.map(({ city, count }) => (
                    <div key={city} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-24 truncate">{city}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.round((count / stats.total_shops) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Activity Chart (text-based) */}
            {stats.daily_stats.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Daily Activity (Last 14 Days)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 font-semibold">Date</th>
                        <th className="text-right py-2 font-semibold">Active Shops</th>
                        <th className="text-right py-2 font-semibold">Voice Txns</th>
                        <th className="text-right py-2 font-semibold">GMV (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.daily_stats.map((d) => (
                        <tr key={d.day} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 text-slate-300">{new Date(d.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">{d.active_shops}</td>
                          <td className="py-2 text-right text-violet-400 font-bold">{d.voice_transactions}</td>
                          <td className="py-2 text-right text-amber-400 font-bold">₹{(d.total_gmv_inr / 1000).toFixed(1)}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SHOPS TAB ── */}
        {tab === 'shops' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Search by name, owner, or city…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="text-sm text-slate-500">{filteredShops.length} shops</span>
            </div>

            <div className="space-y-2">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className={`bg-slate-900 border rounded-xl p-4 flex items-center gap-4 transition-opacity ${
                    shop.is_active ? 'border-slate-800' : 'border-red-900/40 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-white text-sm truncate">{shop.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${PLAN_COLORS[shop.plan] ?? 'bg-slate-700 text-slate-300'}`}>
                        {shop.plan}
                      </span>
                      {!shop.is_active && (
                        <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full">disabled</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {shop.owner_name} · {shop.city} · Joined {new Date(shop.created_at).toLocaleDateString('en-IN')}
                      {shop.onboarded_at ? ' · ✅ Onboarded' : ' · ⏳ Setup Pending'}
                    </div>
                  </div>

                  {/* Plan quick-change */}
                  <select
                    value={shop.plan}
                    onChange={(e) => handlePlanChange(shop.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>

                  {/* Enable/disable */}
                  <button
                    onClick={() => handleToggleShop(shop.id, shop.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      shop.is_active
                        ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                        : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                    }`}
                  >
                    {shop.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
