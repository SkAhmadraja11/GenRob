import React, { useState } from 'react';
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
      name: language === 'hi' ? 'फ्री' : language === 'te' ? 'ఉచితం' : 'Free',
      price: '₹0',
      period: language === 'hi' ? 'सदा के लिए' : language === 'te' ? 'ఎల్లప్పుడూ' : 'Forever',
      highlight: false,
      color: 'border-slate-700',
      badge: null,
      features: [
        { label: `${PLAN_LIMITS.free.products} ${language === 'hi' ? 'सामान' : language === 'te' ? 'సరుకులు' : 'products'}`, ok: true },
        { label: `${PLAN_LIMITS.free.voice_per_day} ${language === 'hi' ? 'वॉइस एंट्री/दिन' : language === 'te' ? 'వాయిస్ ఎంట్రీలు/రోజు' : 'voice entries/day'}`, ok: true },
        { label: language === 'hi' ? '1 स्टाफ सदस्य' : language === 'te' ? '1 సిబ్బంది' : '1 staff member', ok: true },
        { label: language === 'hi' ? '7 दिन एनालिटिक्स' : language === 'te' ? '7 రోజుల విశ్లేషణ' : '7 days analytics', ok: true },
        { label: language === 'hi' ? 'व्हाट्सएप अलर्ट' : language === 'te' ? 'వాట్సాప్ హెచ్చరికలు' : 'WhatsApp alerts', ok: false },
        { label: language === 'hi' ? 'चालान OCR' : language === 'te' ? 'చలాన్ OCR' : 'Challan OCR', ok: false },
      ],
    },
    {
      id: 'starter' as const,
      name: language === 'hi' ? 'स्टार्टर' : language === 'te' ? 'స్టార్టర్' : 'Starter',
      price: '₹199',
      period: language === 'hi' ? '/माह' : language === 'te' ? '/నెలకు' : '/month',
      highlight: true,
      color: 'border-amber-500',
      badge: language === 'hi' ? 'सर्वाधिक लोकप्रिय' : language === 'te' ? 'అత్యంత ప్రజాదరణ' : 'Most Popular',
      features: [
        { label: `${PLAN_LIMITS.starter.products} ${language === 'hi' ? 'सामान' : language === 'te' ? 'సరుకులు' : 'products'}`, ok: true },
        { label: `${PLAN_LIMITS.starter.voice_per_day} ${language === 'hi' ? 'वॉइस एंट्री/दिन' : language === 'te' ? 'వాయిస్ ఎంట్రీలు/రోజు' : 'voice entries/day'}`, ok: true },
        { label: language === 'hi' ? '3 स्टाफ सदस्य' : language === 'te' ? '3 సిబ్బంది' : '3 staff members', ok: true },
        { label: language === 'hi' ? '90 दिन एनालिटिक्स' : language === 'te' ? '90 రోజుల విశ్లేషణ' : '90 days analytics', ok: true },
        { label: language === 'hi' ? 'व्हाट्सएप अलर्ट ✅' : language === 'te' ? 'వాట్సాప్ హెచ్చరికలు ✅' : 'WhatsApp alerts ✅', ok: true },
        { label: language === 'hi' ? '50 चालान स्कैन/माह' : language === 'te' ? 'నెలకు 50 చలాన్ స్కాన్లు' : '50 challan scans/mo', ok: true },
      ],
    },
    {
      id: 'pro' as const,
      name: language === 'hi' ? 'प्रो' : language === 'te' ? 'ప్రో' : 'Pro',
      price: '₹499',
      period: language === 'hi' ? '/माह' : language === 'te' ? '/నెలకు' : '/month',
      highlight: false,
      color: 'border-violet-600',
      badge: language === 'hi' ? 'फुल पावर' : language === 'te' ? 'పూర్తి సామర్థ్యం' : 'Full Power',
      features: [
        { label: language === 'hi' ? 'असीमित सामान' : language === 'te' ? 'అపరిమిత సరుకులు' : 'Unlimited products', ok: true },
        { label: language === 'hi' ? 'असीमित वॉइस एंट्री' : language === 'te' ? 'అపరిమిత వాయిస్ ఎంట్రీలు' : 'Unlimited voice entries', ok: true },
        { label: language === 'hi' ? '10 स्टाफ सदस्य' : language === 'te' ? '10 సిబ్బంది' : '10 staff members', ok: true },
        { label: language === 'hi' ? '1 साल एनालिटिक्स' : language === 'te' ? '1 సంవత్సరం విశ్లేషణ' : '1 year analytics', ok: true },
        { label: language === 'hi' ? 'व्हाट्सएप + SMS ✅' : language === 'te' ? 'వాట్సాప్ + SMS ✅' : 'WhatsApp + SMS ✅', ok: true },
        { label: language === 'hi' ? 'असीमित चालान स्कैन' : language === 'te' ? 'అపరిమిత చలాన్ స్కాన్లు' : 'Unlimited challan scans', ok: true },
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
      : 'Are you sure you want to downgrade to the Free plan?';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-amber-500/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{t.billingTitle}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{t.billingSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = PLANS.findIndex((p) => p.id === plan.id) < PLANS.findIndex((p) => p.id === currentPlan);

            return (
              <div
                key={plan.id}
                className={`border-2 rounded-2xl p-5 flex flex-col gap-4 transition-all ${plan.color} ${
                  isCurrent ? 'ring-2 ring-amber-500/40' : ''
                } ${plan.highlight ? 'bg-amber-500/5' : 'bg-slate-800/40'}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-white text-lg">{plan.name}</span>
                    {plan.badge && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className={`flex items-center gap-2 text-xs ${f.ok ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className={f.ok ? 'text-emerald-400' : 'text-slate-700'}>
                        {f.ok ? '✓' : '✗'}
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="py-2.5 rounded-xl bg-slate-700/50 text-center text-sm text-slate-400 font-semibold">
                    {t.currentPlanBadge}
                  </div>
                ) : isDowngrade ? (
                  <button
                    onClick={handleDowngrade}
                    disabled={loading}
                    className="py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-semibold hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {language === 'hi' ? 'डाउनग्रेड' : language === 'te' ? 'డౌన్‌గ్రేడ్' : 'Downgrade'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id as 'starter' | 'pro')}
                    disabled={loading}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {loading ? '...' : `${t.upgradePlanBtn} (${plan.name})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Referral Card */}
        <div className="px-6 pb-2">
          <ReferralCard language={language} />
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-slate-500">
            {language === 'hi'
              ? '🔒 रेज़रपे द्वारा सुरक्षित भुगतान। UPI, कार्ड और नेट बैंकिंग समर्थित। GST सहित।'
              : language === 'te'
              ? '🔒 రేజర్‌పే ద్వారా సురక్షిత చెల్లింపులు. UPI, కార్డులు మరియు నెట్ బ్యాంకింగ్. GSTతో కలిపి.'
              : '🔒 Payments secured by Razorpay. UPI, cards, net banking accepted. Prices inclusive of GST.'}
          </p>
        </div>
      </div>
    </div>
  );
}
