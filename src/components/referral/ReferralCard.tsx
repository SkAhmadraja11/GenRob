import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useShopAuth } from '../../hooks/useShopAuth';
import { getTranslations } from '../../lib/i18n';

interface ReferralStats {
  referral_code: string;
  total_referred: number;
  converted: number;
  rewards_earned: number;
}

interface ReferralCardProps {
  language: 'hi' | 'te' | 'en';
}

export function ReferralCard({ language }: ReferralCardProps) {
  const { shopContext } = useShopAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = getTranslations(language);

  useEffect(() => {
    if (!shopContext?.shopId) return;
    loadReferralStats();
  }, [shopContext?.shopId]);

  const loadReferralStats = async () => {
    setLoading(true);
    const { data: shopRow } = await supabase
      .from('shops')
      .select('referral_code')
      .eq('id', shopContext!.shopId)
      .single();

    if (!shopRow?.referral_code) {
      setLoading(false);
      return;
    }

    const { data: referrals } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_shop_id', shopContext!.shopId);

    const total     = referrals?.length ?? 0;
    const converted = referrals?.filter((r) => r.status !== 'pending').length ?? 0;
    const rewarded  = referrals?.filter((r) => r.status === 'rewarded').length ?? 0;

    setStats({
      referral_code:   shopRow.referral_code,
      total_referred:  total,
      converted,
      rewards_earned:  rewarded,
    });
    setLoading(false);
  };

  const handleCopy = () => {
    if (!stats?.referral_code) return;
    const shareText = language === 'hi'
      ? `जेनरॉब पर अपनी दुकान आवाज़ से मैनेज करें! हिंदी/तेलुगु में बोलें और स्टॉक ट्रैक करें। मेरे कोड ${stats.referral_code} से साइनअप करें और 1 महीना मुफ्त पाएं: https://genrob.in/register?ref=${stats.referral_code}`
      : language === 'te'
      ? `జెన్‌రాబ్‌లో మీ దుకాణాన్ని వాయిస్ ద్వారా నిర్వహించండి! తెలుగు/హిందీలో మాట్లాడి స్టాక్ ట్రాక్ చేయండి. నా కోడ్ ${stats.referral_code}తో సైన్ అప్ చేసి 1 నెల ఉచితంగా పొందండి: https://genrob.in/register?ref=${stats.referral_code}`
      : `Manage your store by voice on GenRob! Speak in Hindi/Telugu/English to track stock. Sign up with my code ${stats.referral_code} and get 1 month FREE: https://genrob.in/register?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!stats?.referral_code) return;
    const msg = encodeURIComponent(
      language === 'hi'
        ? `🏪 GenRob पर आवाज़ से दुकान मैनेज करें!\n\nहिंदी में बोलें:\n• "50 बोरा चावल आया"\n• "आटा 10 किलो गया"\n\nकोड *${stats.referral_code}* से FREE साइनअप करें:\nhttps://genrob.in/register?ref=${stats.referral_code}\n\nदोनों को 1 महीना मुफ्त मिलेगा! 🎁`
        : language === 'te'
        ? `🏪 GenRob లో వాయిస్ ద్వారా మీ దుకాణాన్ని నిర్వహించండి!\n\nతెలుగులో మాట్లాడండి:\n• "50 బస్తా బియ్యం వచ్చింది"\n• "పిండి 10 కిలో అమ్మాము"\n\nకోడ్ *${stats.referral_code}*తో FREE సైన్ అప్:\nhttps://genrob.in/register?ref=${stats.referral_code}\n\nఇద్దరికీ 1 నెల ఉచితం! 🎁`
        : `🏪 Manage your store by voice on GenRob!\n\nSpeak in English:\n• "50 bags rice arrived"\n• "Atta 10 kg sold"\n\nSign up FREE with code *${stats.referral_code}*:\nhttps://genrob.in/register?ref=${stats.referral_code}\n\nBoth get 1 month FREE! 🎁`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-3" />
        <div className="h-10 bg-slate-800 rounded mb-3" />
        <div className="h-8 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-base">🎁 {t.referralTitle}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.referralSubtitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{t.rewardsEarnedLabel}</div>
          <div className="text-xl font-black text-amber-400">{stats.rewards_earned}</div>
          <div className="text-xs text-slate-500">
            {language === 'hi' ? 'मुफ्त महीने' : language === 'te' ? 'ఉచిత నెలలు' : 'free months'}
          </div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            {language === 'hi' ? 'आपका रेफरल कोड' : language === 'te' ? 'మీ రెఫరల్ కోడ్' : 'Your Referral Code'}
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-widest">
            {stats.referral_code}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
          }`}
        >
          {copied ? t.copiedLinkBtn : t.copyLinkBtn}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-white">{stats.total_referred}</div>
          <div className="text-xs text-slate-400">{t.totalReferredLabel}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-emerald-400">{stats.converted}</div>
          <div className="text-xs text-slate-400">{t.rewardsEarnedLabel}</div>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-1.5">
        {(language === 'hi'
          ? [
              '1️⃣ अपने कोड को अन्य दुकानदारों के साथ शेयर करें',
              '2️⃣ वे आपके कोड से GenRob पर साइनअप करें',
              '3️⃣ दोनों को 1 महीना Starter प्लान मुफ्त मिलेगा!',
            ]
          : language === 'te'
          ? [
              '1️⃣ మీ కోడ్‌ను ఇతర దుకాణదారులతో పంచుకోండి',
              '2️⃣ వారు మీ కోడ్‌తో GenRob లో సైన్ అప్ చేస్తారు',
              '3️⃣ ఇద్దరికీ 1 నెల Starter ప్లాన్ ఉచితం!',
            ]
          : [
              '1️⃣ Share your code with other shop owners',
              '2️⃣ They sign up on GenRob with your code',
              '3️⃣ Both of you get 1 month Starter FREE!',
            ]
        ).map((step) => (
          <div key={step} className="text-xs text-slate-400 flex items-center gap-2">
            <span>{step}</span>
          </div>
        ))}
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleWhatsAppShare}
          className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <span>📱</span>
          {language === 'hi' ? 'WhatsApp पर शेयर करें' : language === 'te' ? 'WhatsApp లో పంచుకోండి' : 'WhatsApp Share'}
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold transition-colors"
        >
          🔗 {language === 'hi' ? 'कॉपी' : language === 'te' ? 'కాపీ' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
