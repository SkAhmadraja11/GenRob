import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, Users, Award, ExternalLink } from 'lucide-react';
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
      <div className="bg-slate-900/60 rounded-xl p-5 border border-white/[0.08] animate-pulse space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-9 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-slate-900/60 rounded-xl p-5 border border-white/[0.08] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm tracking-tight">{t.referralTitle}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.referralSubtitle}
          </p>
        </div>
        <div className="text-right bg-slate-850 px-3 py-1.5 rounded-lg border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">{t.rewardsEarnedLabel}</span>
          <span className="text-base font-bold text-amber-400 tabular-nums leading-tight">
            {stats.rewards_earned} <span className="text-xs font-normal text-slate-400">{language === 'hi' ? 'माह' : language === 'te' ? 'నెలలు' : 'mo'}</span>
          </span>
        </div>
      </div>

      {/* Referral Code Box */}
      <div className="bg-[#0b0f17] border border-white/[0.08] rounded-lg p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-0.5">
            {language === 'hi' ? 'आपका रेफरल कोड' : language === 'te' ? 'మీ రెఫరల్ కోడ్' : 'Your Referral Code'}
          </div>
          <div className="text-base font-bold text-white font-mono tracking-wider">
            {stats.referral_code}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            copied
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08]'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? t.copiedLinkBtn : t.copyLinkBtn}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-850/60 border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.totalReferredLabel}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{stats.total_referred}</div>
        </div>
        <div className="bg-slate-850/60 border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.rewardsEarnedLabel}</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 tabular-nums">{stats.converted}</div>
        </div>
      </div>

      {/* Step by Step Flow */}
      <div className="space-y-1.5 pt-1">
        {(language === 'hi'
          ? [
              { num: '1', text: 'अपने कोड को अन्य दुकानदारों के साथ शेयर करें' },
              { num: '2', text: 'वे आपके कोड से GenRob पर साइनअप करें' },
              { num: '3', text: 'दोनों को 1 महीना Starter प्लान मुफ्त मिलेगा' },
            ]
          : language === 'te'
          ? [
              { num: '1', text: 'మీ కోడ్‌ను ఇతర దుకాణదారులతో పంచుకోండి' },
              { num: '2', text: 'వారు మీ కోడ్‌తో GenRob లో సైన్ అప్ చేస్తారు' },
              { num: '3', text: 'ఇద్దరికీ 1 నెల Starter ప్లాన్ ఉచితం' },
            ]
          : [
              { num: '1', text: 'Share your referral code with other retailers' },
              { num: '2', text: 'They register their store using your code' },
              { num: '3', text: 'Both of you receive 1 month Starter free' },
            ]
        ).map((step) => (
          <div key={step.num} className="text-xs text-slate-300 flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 border border-white/[0.08] text-[10px] font-bold text-slate-400 flex items-center justify-center flex-shrink-0">
              {step.num}
            </span>
            <span>{step.text}</span>
          </div>
        ))}
      </div>

      {/* Share Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleWhatsAppShare}
          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'WhatsApp पर शेयर करें' : language === 'te' ? 'WhatsApp లో పంచుకోండి' : 'Share on WhatsApp'}</span>
        </button>
        <button
          onClick={handleCopy}
          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-slate-300 text-xs font-medium transition"
        >
          {language === 'hi' ? 'लिंक कॉपी' : language === 'te' ? 'లింక్ కాపీ' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
