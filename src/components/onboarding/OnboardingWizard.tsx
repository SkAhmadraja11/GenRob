import React, { useState, useCallback } from 'react';
import { supabase, PLAN_LIMITS } from '../../lib/supabaseClient';
import { useShopAuth } from '../../hooks/useShopAuth';
import { PhoneOtpAuthModal } from '../auth/PhoneOtpAuthModal';
import { Zap, Store, Phone, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;

interface ShopForm {
  shopName: string;
  ownerName: string;
  city: string;
  state: string;
  language: 'hi' | 'te' | 'en';
  tradeCategory: 'kirana' | 'wholesale' | 'medical' | 'textile' | 'electronics' | 'general';
  referralCode: string;
}

interface Props {
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const TRADE_CATEGORIES = [
  { value: 'kirana',       label: 'Kirana / General Store', emoji: '🛒' },
  { value: 'wholesale',    label: 'Wholesale / Distributor',  emoji: '📦' },
  { value: 'medical',      label: 'Medical / Pharmacy',       emoji: '💊' },
  { value: 'textile',      label: 'Textile / Cloth',          emoji: '🧵' },
  { value: 'electronics',  label: 'Electronics / Mobile',     emoji: '📱' },
  { value: 'general',      label: 'General Trade',            emoji: '🏪' },
] as const;

const LANGUAGES = [
  { value: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { value: 'te', label: 'తెలుగు', flag: '🏳️' },
  { value: 'en', label: 'English', flag: '🌐' },
] as const;

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'Forever',
    color: 'from-slate-700 to-slate-800',
    border: 'border-slate-600',
    badge: null,
    features: [
      `${PLAN_LIMITS.free.products} products`,
      `${PLAN_LIMITS.free.voice_per_day} voice entries/day`,
      '1 staff member',
      '7 days analytics',
      'Basic stock alerts',
    ],
    cta: 'Start Free',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹199',
    period: '/month',
    color: 'from-amber-600 to-orange-700',
    border: 'border-amber-500',
    badge: 'Most Popular',
    features: [
      `${PLAN_LIMITS.starter.products} products`,
      `${PLAN_LIMITS.starter.voice_per_day} voice entries/day`,
      '3 staff members',
      '90 days analytics',
      'WhatsApp alerts ✅',
      '50 challan scans/mo',
    ],
    cta: 'Start 14-Day Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹499',
    period: '/month',
    color: 'from-violet-600 to-purple-700',
    border: 'border-violet-500',
    badge: 'Full Power',
    features: [
      'Unlimited products',
      'Unlimited voice entries',
      '10 staff members',
      '1 year analytics',
      'WhatsApp + SMS alerts ✅',
      'Unlimited challan scans',
      'Priority support',
    ],
    cta: 'Start 14-Day Trial',
  },
] as const;

// ─────────────────────────────────────────────────────────────────
// Step indicators
// ─────────────────────────────────────────────────────────────────
function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === current
              ? 'w-8 h-2 bg-amber-400'
              : s < current
              ? 'w-2 h-2 bg-amber-400/60'
              : 'w-2 h-2 bg-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Onboarding Wizard
// ─────────────────────────────────────────────────────────────────
export function OnboardingWizard({ onComplete }: Props) {
  const { user, loginWithPhone, refresh } = useShopAuth();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro'>('starter');
  const [isPhoneAuthOpen, setIsPhoneAuthOpen] = useState(false);

  const urlRef = new URLSearchParams(window.location.search).get('ref') ?? '';
  const [form, setForm] = useState<ShopForm>({
    shopName: '',
    ownerName: user?.user_metadata?.full_name ?? '',
    city: '',
    state: 'Telangana',
    language: 'hi',
    tradeCategory: 'kirana',
    referralCode: urlRef.toUpperCase(),
  });

  const updateForm = (key: keyof ShopForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── 1-Click Instant Demo Login ─────────────────────────────────
  const handleQuickDemo = async () => {
    setSubmitting(true);
    try {
      const demoUser = {
        id: '22222222-2222-2222-2222-222222222222',
        phone: '+919876543210',
        role: 'owner',
        app_metadata: {
          shop_id: '11111111-1111-1111-1111-111111111111',
          role: 'owner',
          plan: 'free',
        },
        user_metadata: {
          full_name: 'Rajesh Sharma',
          shop_name: 'Sri Balaji Kirana & General Stores',
        },
      };
      localStorage.setItem('genrob_onboarded_11111111-1111-1111-1111-111111111111', 'true');
      await loginWithPhone(demoUser);
      await refresh();
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: Create custom shop ─────────────────────────────────
  const handleCreateShop = useCallback(async () => {
    if (!form.shopName.trim() || !form.ownerName.trim() || !form.city.trim()) {
      setError('Please fill in Shop Name, Owner Name, and City.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let activeUser = user;
      if (!activeUser) {
        activeUser = {
          id: 'user-' + Date.now(),
          phone: '+919876543210',
          role: 'owner',
          user_metadata: {
            full_name: form.ownerName.trim(),
            shop_name: form.shopName.trim(),
          },
          app_metadata: {
            role: 'owner',
            plan: selectedPlan,
          },
        };
      }

      let shopId: string | null = null;

      // 1. Try onboard-shop Edge Function
      try {
        const res = await supabase.functions.invoke('onboard-shop', {
          body: {
            user_id: activeUser.id,
            shop_name: form.shopName.trim(),
            owner_name: form.ownerName.trim(),
            city: form.city.trim(),
            state: form.state,
            primary_language: form.language,
            trade_category: form.tradeCategory,
            plan: selectedPlan,
          },
        });

        if (!res.error && res.data?.shop_id) {
          shopId = res.data.shop_id;
        }
      } catch (fnErr) {
        console.warn('onboard-shop function notice:', fnErr);
      }

      // 2. Direct DB fallback if Edge Function is unavailable
      if (!shopId) {
        try {
          const { data: newShop } = await supabase
            .from('shops')
            .insert({
              name: form.shopName.trim(),
              owner_name: form.ownerName.trim(),
              city: form.city.trim(),
              state: form.state,
              primary_language: form.language,
              phone: activeUser.phone || '+919876543210',
              onboarded_at: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();

          if (newShop?.id) {
            shopId = newShop.id;
          }
        } catch (dbErr) {
          console.warn('DB insert notice:', dbErr);
        }
      }

      // 3. Local fallback ID
      if (!shopId) {
        shopId = 'shop-' + Date.now();
      }

      localStorage.setItem(`genrob_onboarded_${shopId}`, 'true');

      // Update active user state
      const updatedUser = {
        ...activeUser,
        app_metadata: {
          ...(activeUser.app_metadata || {}),
          shop_id: shopId,
          role: 'owner',
          plan: selectedPlan,
        },
        user_metadata: {
          ...(activeUser.user_metadata || {}),
          full_name: form.ownerName.trim(),
          shop_name: form.shopName.trim(),
        },
      };

      await loginWithPhone(updatedUser);
      setStep(3);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create shop. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, form, selectedPlan, loginWithPhone]);

  // ── Step 4: Complete onboarding ────────────────────────────────
  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      const cached = localStorage.getItem('genrob_auth_user');
      if (cached) {
        try {
          const u = JSON.parse(cached);
          if (u.app_metadata?.shop_id) {
            localStorage.setItem(`genrob_onboarded_${u.app_metadata.shop_id}`, 'true');
            await supabase
              .from('shops')
              .update({ onboarded_at: new Date().toISOString() })
              .eq('id', u.app_metadata.shop_id);
          }
        } catch {}
      }
      await refresh();
      onComplete();
    } finally {
      setSubmitting(false);
    }
  }, [refresh, onComplete]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl">🏪</span>
            <span className="text-2xl font-black text-amber-400 tracking-tight">GenRob</span>
          </div>
          <p className="text-slate-400 text-sm">Voice-First Inventory for Indian Business</p>
        </div>

        <StepDots current={step} />

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">

          {/* ─── STEP 1: Welcome ──────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center space-y-5">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1 shadow-lg shadow-amber-500/10">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Welcome to GenRob
                </h1>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Voice-First Inventory & Khata OS for Kirana, Wholesale & Retail.
                  Speak in <strong className="text-amber-400">Hindi, Telugu, or English</strong>.
                </p>
              </div>

              {/* Feature Pill Matrix */}
              <div className="grid grid-cols-3 gap-2 py-1">
                {[
                  { icon: '🎙️', label: 'Voice Island' },
                  { icon: '📦', label: '18+ Live Stock' },
                  { icon: '📒', label: 'Khata Ledger' },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-800/80 border border-white/[0.06] rounded-xl p-2.5 text-center">
                    <div className="text-base mb-1">{f.icon}</div>
                    <div className="text-[11px] text-slate-300 font-semibold">{f.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                {/* 1-Click Instant Demo Button */}
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>⚡ 1-Click Instant Demo (Rajesh Sharma Kirana)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Setup New Shop */}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>Set Up My Shop</span>
                  </button>

                  {/* Phone OTP Login */}
                  <button
                    type="button"
                    onClick={() => setIsPhoneAuthOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phone OTP Login</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Shop Details ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-1">Your Shop Details</h2>
              <p className="text-slate-400 text-xs mb-4">This is how your customers and staff will see your shop.</p>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Shop Name *</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                    placeholder="e.g. Sri Balaji Kirana Store"
                    value={form.shopName}
                    onChange={(e) => updateForm('shopName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Owner Name *</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                    placeholder="Your full name"
                    value={form.ownerName}
                    onChange={(e) => updateForm('ownerName', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">City *</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                      placeholder="Hyderabad"
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">State</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                      placeholder="Telangana"
                      value={form.state}
                      onChange={(e) => updateForm('state', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Business Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TRADE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => updateForm('tradeCategory', cat.value)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          form.tradeCategory === cat.value
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <div className="text-xl mb-1">{cat.emoji}</div>
                        <div className="text-xs font-medium leading-tight">{cat.label.split('/')[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Voice Language</label>
                  <div className="flex gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => updateForm('language', lang.value)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                          form.language === lang.value
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-semibold hover:border-slate-500 transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateShop}
                  disabled={submitting}
                  className="flex-[2] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold transition-colors text-sm"
                >
                  {submitting ? 'Creating Shop…' : 'Create My Shop →'}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Plan Selection ───────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
              <p className="text-slate-400 text-xs">All paid plans include a 14-day free trial. No credit card required for Free.</p>

              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as any)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? `${plan.border} bg-gradient-to-r ${plan.color} bg-opacity-20`
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{plan.name}</span>
                        {plan.badge && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-white text-lg">{plan.price}</span>
                        <span className="text-slate-400 text-xs">{plan.period}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {plan.features.map((f) => (
                        <div key={f} className="text-xs text-slate-300 flex items-center gap-1">
                          <span className="text-emerald-400 text-xs">✓</span> {f}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-colors mt-2"
              >
                Continue with {PLANS.find((p) => p.id === selectedPlan)?.name} →
              </button>
            </div>
          )}

          {/* ─── STEP 4: Done ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="text-6xl animate-bounce">🎊</div>
              <h2 className="text-2xl font-bold text-white">You're all set!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your shop is live. Tap the <strong className="text-amber-400">🎙️ mic button</strong> at the bottom and say:
              </p>
              <div className="bg-slate-800 rounded-xl p-4 text-left space-y-2">
                {[
                  '"50 bag chawal aaya"',
                  '"Atta 10 kg gaya"',
                  '"Ramesh ka 500 rupee udhaar"',
                ].map((ex) => (
                  <div key={ex} className="flex items-center gap-2 text-sm">
                    <span className="text-amber-400">🎙️</span>
                    <span className="text-white font-medium italic">{ex}</span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3">
                <p className="text-emerald-400 text-xs font-semibold">
                  🎁 Your 14-day free trial has started. No payment needed yet.
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-base transition-colors"
              >
                {submitting ? 'Loading…' : 'Go to My Shop 🚀'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phone OTP Auth Modal — opened from Step 1 */}
      {isPhoneAuthOpen && (
        <PhoneOtpAuthModal
          isOpen={isPhoneAuthOpen}
          onClose={() => setIsPhoneAuthOpen(false)}
          language="en"
          onAuthSuccess={async (authedUser) => {
            setIsPhoneAuthOpen(false);
            await loginWithPhone(authedUser);
            await refresh();
            onComplete();
          }}
        />
      )}
    </div>
  );
}
