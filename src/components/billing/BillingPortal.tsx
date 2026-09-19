import React, { useState } from 'react';
import { Check, X, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { useShopAuth } from '../../hooks/useShopAuth';
import { supabase, PLAN_LIMITS } from '../../lib/supabaseClient';
import { getTranslations, SupportedLanguage } from '../../lib/i18n';
import { ReferralCard } from '../referral/ReferralCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language?: SupportedLanguage;
}

export function BillingPortal({ isOpen, onClose, language = 'hi' }: Props) {
  const { shopContext, refresh } = useShopAuth();
  const currentPlan = shopContext?.plan ?? 'free';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = getTranslations(language);

  if (!isOpen) return null;

  const PLANS = [
    {
      id: 'free' as const,
      name: language === 'hi' ? 'बेसिक (फ्री)' : language === 'te' ? 'బేసిక్ (ఉచితం)' : 'Free',
      price: '₹0',
      period: language === 'hi' ? 'सदा के लिए' : language === 'te' ? 'ఎల్లప్పుడూ' : 'forever',
      description: language === 'hi' ? 'छोटे किराना स्टोर के लिए शुरुआती टूल्स' : language === 'te' ? 'చిన్న దుకాణాల కోసం' : 'Essential tools for small retail shops',
      highlight: false,
      badge: null,
      features: [
        { label: `${PLAN_LIMITS.free.products} ${language === 'hi' ? 'प्रोडक्ट्स कैटलॉग' : language === 'te' ? 'సరుకుల జాబితా' : 'Products catalog'}`, ok: true },
        { label: `${PLAN_LIMITS.free.voice_per_day} ${language === 'hi' ? 'वॉइस एंट्रीज़ / दिन' : language === 'te' ? 'వాయిస్ ఎంట్రీలు / రోజు' : 'Voice entries / day'}`, ok: true },
        { label: language === 'hi' ? '1 ऑपरेटर अकाउंट' : language === 'te' ? '1 ఆపరేటర్' : '1 Operator account', ok: true },
        { label: language === 'hi' ? '7 दिन हिस्टोरिकल डेटा' : language === 'te' ? '7 రోజుల విశ్లేషణ' : '7 Days data history', ok: true },
        { label: language === 'hi' ? 'WhatsApp ऑटोमेशन' : language === 'te' ? 'వాట్సాప్ అలర్ట్‌లు' : 'WhatsApp automation', ok: false },
        { label: language === 'hi' ? 'चालान OCR स्कैनर' : language === 'te' ? 'చలాన్ OCR స్కానర్' : 'Challan OCR scanner', ok: false },
      ],
    },
    {
      id: 'starter' as const,
      name: language === 'hi' ? 'स्टार्टर' : language === 'te' ? 'స్టార్టర్' : 'Starter',
      price: '₹199',
      period: language === 'hi' ? '/माह' : language === 'te' ? '/నెలకు' : '/month',
      description: language === 'hi' ? 'बढ़ते व्यापार के लिए वॉइस और WhatsApp' : language === 'te' ? 'పెరుగుతున్న వ్యాపారం కోసం' : 'Ideal for active neighborhood grocery stores',
      highlight: true,
      badge: language === 'hi' ? 'सर्वाधिक लोकप्रिय' : language === 'te' ? 'అత్యంత ప్రజాదరణ' : 'Most Popular',
      features: [
        { label: `${PLAN_LIMITS.starter.products} ${language === 'hi' ? 'प्रोडक्ट्स कैटलॉग' : language === 'te' ? 'సరుకుల జాబితా' : 'Products catalog'}`, ok: true },
        { label: `${PLAN_LIMITS.starter.voice_per_day} ${language === 'hi' ? 'वॉइस एंट्रीज़ / दिन' : language === 'te' ? 'వాయిస్ ఎంట్రీలు / రోజు' : 'Voice entries / day'}`, ok: true },
        { label: language === 'hi' ? '3 स्टाफ ऑपरेटर' : language === 'te' ? '3 సిబ్బంది' : '3 Staff accounts', ok: true },
        { label: language === 'hi' ? '90 दिन बिक्री रिपोर्ट' : language === 'te' ? '90 రోజుల విశ్లేషణ' : '90 Days report history', ok: true },
        { label: language === 'hi' ? 'WhatsApp स्टॉक अलर्ट' : language === 'te' ? 'వాట్సాప్ అలర్ట్‌లు' : 'WhatsApp alerts & bot', ok: true },
        { label: language === 'hi' ? '50 चालान स्कैन प्रति माह' : language === 'te' ? 'నెలకు 50 చలాన్ స్కాన్లు' : '50 Challan scans/mo', ok: true },
      ],
    },
    {
      id: 'pro' as const,
      name: language === 'hi' ? 'प्रो एंटरप्राइज' : language === 'te' ? 'ప్రో' : 'Pro',
      price: '₹499',
      period: language === 'hi' ? '/माह' : language === 'te' ? '/నెలకు' : '/month',
      description: language === 'hi' ? 'होलसेल और बड़े सुपरमार्केट के लिए' : language === 'te' ? 'హోల్‌సేల్ & పెద్ద దుకాణాలకు' : 'Full power for high-volume supermarkets',
      highlight: false,
      badge: null,
      features: [
        { label: language === 'hi' ? 'असीमित प्रोडक्ट्स कैटलॉग' : language === 'te' ? 'అపరిమిత సరుకులు' : 'Unlimited products', ok: true },
        { label: language === 'hi' ? 'असीमित वॉइस एंट्रीज़' : language === 'te' ? 'అపరిమిత వాయిస్ ఎంట్రీలు' : 'Unlimited voice entries', ok: true },
        { label: language === 'hi' ? '10 स्टाफ मेंबर्स' : language === 'te' ? '10 సిబ్బంది' : '10 Staff members', ok: true },
        { label: language === 'hi' ? '1 साल पूरी रिपोर्ट' : language === 'te' ? '1 సంవత్సరం విశ్లేషణ' : '1 Year analytics history', ok: true },
        { label: language === 'hi' ? 'WhatsApp + SMS गेटवे' : language === 'te' ? 'వాట్సాప్ + SMS' : 'WhatsApp + SMS gateway', ok: true },
        { label: language === 'hi' ? 'असीमित चालान OCR' : language === 'te' ? 'అపరిమిత చలాన్ స్కాన్లు' : 'Unlimited Challan OCR', ok: true },
      ],
    },
  ];

  const handleUpgrade = async (targetPlan: 'starter' | 'pro') => {
    if (!shopContext?.shopId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await supabase.functions.invoke('create-subscription', {
        body: {
          shop_id: shopContext.shopId,
          plan:    targetPlan,
        },
      });

      if (res.error) throw new Error(res.error.message);

      const { checkout_url, short_url, mode } = res.data;

      if (mode === 'trial') {
        await refresh();
        onClose();
        return;
      }

      const payUrl = checkout_url ?? short_url;
      if (payUrl) {
        window.location.href = payUrl;
      } else {
        await refresh();
        onClose();
      }
    } catch (err: any) {
      setError(err.message ?? 'Subscription creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!shopContext?.shopId) return;
    const confirmMsg = language === 'hi'
      ? 'क्या आप निश्चित रूप से फ्री प्लान पर डाउनग्रेड करना चाहते हैं?'
      : language === 'te'
      ? 'మీరు ఖచ్చితంగా ఉచిత ప్లాన్‌కు డౌన్‌గ్రేడ్ చేయాలనుకుంటున్నారా?'
      : 'Are you sure you want to switch to the Free plan?';

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await supabase
        .from('shops')
        .update({ plan: 'free', trial_ends_at: null })
        .eq('id', shopContext.shopId);

      await refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-[#0f172a] rounded-2xl border border-white/[0.09] shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{t.billingTitle}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{t.billingSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = PLANS.findIndex((p) => p.id === plan.id) < PLANS.findIndex((p) => p.id === currentPlan);
            const isFeatured = plan.highlight;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-5 flex flex-col justify-between transition-all duration-150 ${
                  isFeatured
                    ? 'bg-slate-900/90 border-2 border-amber-500/50 shadow-md'
                    : 'bg-slate-900/50 border border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-base tracking-tight">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md font-semibold">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3 leading-snug">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-4 pb-4 border-b border-white/[0.06]">
                    <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-slate-400 text-xs font-normal">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f.label} className={`flex items-start gap-2.5 text-xs ${f.ok ? 'text-slate-200' : 'text-slate-500'}`}>
                        {f.ok ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="leading-tight">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2 rounded-lg bg-slate-800/80 border border-white/[0.06] text-center text-xs text-slate-400 font-medium">
                      Active Plan
                    </div>
                  ) : isDowngrade ? (
                    <button
                      onClick={handleDowngrade}
                      disabled={loading}
                      className="w-full py-2 rounded-lg border border-white/[0.1] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition disabled:opacity-50"
                    >
                      {language === 'hi' ? 'डाउनग्रेड करें' : language === 'te' ? 'డౌన్‌గ్రేడ్' : 'Downgrade'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id as 'starter' | 'pro')}
                      disabled={loading}
                      className={`w-full py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50 ${
                        isFeatured
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/[0.1]'
                      }`}
                    >
                      <span>{loading ? 'Processing...' : `${t.upgradePlanBtn}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Referral Card */}
        <div className="px-6 pb-2">
          <ReferralCard language={language} />
        </div>

        {/* Secure Checkout Note */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {language === 'hi'
              ? 'रेज़रपे द्वारा 256-बिट SSL सुरक्षित भुगतान • UPI, कार्ड और नेट बैंकिंग समर्थित'
              : language === 'te'
              ? 'రేజర్‌పే ద్వారా సురక్షిత చెల్లింపులు • UPI, కార్డులు & నెట్ బ్యాంకింగ్'
              : 'Payments securely processed by Razorpay • UPI, debit/credit cards & net banking'}
          </span>
        </div>
      </div>
    </div>
  );
}
