import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  IndianRupee,
  ShoppingBag
} from 'lucide-react';
import { fetchDailyBriefingStats, DailyBriefingStats } from '../../lib/api';
import { ttsEngine } from '../../lib/speech/tts';
import { getTranslations } from '../../lib/i18n';

interface DailyVoiceBriefingProps {
  language: 'hi' | 'te' | 'en';
  shopName: string;
}

export const DailyVoiceBriefing: React.FC<DailyVoiceBriefingProps> = ({
  language,
  shopName,
}) => {
  const [stats, setStats] = useState<DailyBriefingStats | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = getTranslations(language);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    setLoading(true);
    const data = await fetchDailyBriefingStats();
    setStats(data);
    setLoading(false);
  };

  const generateSpokenScript = (s: DailyBriefingStats): string => {
    if (language === 'te') {
      return `నమస్కారం! గత ఇరవై నాలుగు గంటల్లో మీ దుకాణంలో ${s.total_sales_amount} రూపాయల అమ్మకాలు జరిగాయి. మొత్తం ${s.total_transactions_24h} లావాదేవీలు పూర్తయ్యాయి. అత్యధికంగా అమ్ముడైన సరుకు ${s.top_moving_product}. ${s.items_below_threshold_count} వస్తువులు రీ-ఆర్డర్ పరిమితి కంటే తక్కువగా ఉన్నాయి. కందిపప్పు మరియు నూనె డబ్బా వెంటనే ఆర్డర్ చేయండి. మార్కెట్ ఉధార్ ${s.new_udhaar_amount} రూపాయలు నమోదయ్యాయి. మీ వ్యాపారం శుభప్రదం కావాలని కోరుకుంటున్నాము!`;
    }

    if (language === 'en') {
      return `Good morning! Over the past 24 hours, your store recorded rupees ${s.total_sales_amount} in sales across ${s.total_transactions_24h} transactions. Your top-moving item was ${s.top_moving_product}. You have ${s.items_below_threshold_count} products below safe reorder thresholds. Rupees ${s.new_udhaar_amount} in new customer khata credit was recorded. Have a profitable trade day!`;
    }

    // Default Hindi
    return `नमस्ते राजेश जी! पिछले चौबीस घंटे में आपकी दुकान पर कुल ₹${s.total_sales_amount} की बिक्री दर्ज हुई है। कुल ${s.total_transactions_24h} लेन-देन हुए, और सबसे ज्यादा बिकने वाला सामान ${s.top_moving_product} रहा। ${s.items_below_threshold_count} सामान री-ऑर्डर सीमा से नीचे हैं—तूअर दाल और सूरजमुखी तेल तुरंत मंगवाएं। ₹${s.new_udhaar_amount} का नया ग्राहक उधार दर्ज हुआ है। आपका आज का व्यापार मंगलमय हो!`;
  };

  const handlePlayVoiceBriefing = () => {
    if (!stats) return;

    if (isPlaying) {
      ttsEngine.stop();
      setIsPlaying(false);
      return;
    }

    const script = generateSpokenScript(stats);
    setIsPlaying(true);
    ttsEngine.speak(script, language, () => {
      setIsPlaying(false);
    });
  };

  if (loading || !stats) {
    return (
      <div className="glass-card rounded-2xl border border-slate-800 p-8 text-center text-xs text-slate-400">
        Computing 24-hour database statistics...
      </div>
    );
  }

  const script = generateSpokenScript(stats);

  return (
    <div className="space-y-4 pb-24">
      {/* Hero Daily Briefing Card */}
      <div className="glass-card-amber p-6 rounded-3xl border border-amber-500/40 relative shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {t.briefingTitle}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Feature #5
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {t.briefingSubtitle}
              </p>
            </div>
          </div>

          {/* Audio Speaker Play / Pause Button */}
          <button
            onClick={handlePlayVoiceBriefing}
            className={`py-3 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all ${
              isPlaying
                ? 'bg-rose-500 text-white shadow-rose-500/40 glow-rose animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/40 glow-amber hover:scale-105'
            }`}
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-5 h-5 stroke-[2.5]" />
                <span>{t.stopBriefing}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 stroke-[2.5]" />
                <span>{t.listenBriefing}</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Metrics Grid (24-Hour Real Aggregates) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">{t.total24hSales}</span>
            <span className="text-xl font-black text-amber-400 mt-1 block">
              ₹{stats.total_sales_amount.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500">{stats.stock_out_count} {t.stockOutCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">{t.stockInCount}</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">
              {stats.stock_in_count}
            </span>
            <span className="text-[10px] text-slate-500">Inward deliveries</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">कम स्टॉक चेतावनी</span>
            <span className="text-xl font-black text-rose-400 mt-1 block">
              {stats.items_below_threshold_count}
            </span>
            <span className="text-[10px] text-rose-400/80">Need reorder urgently</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">नया उधार (New Khata)</span>
            <span className="text-xl font-black text-amber-300 mt-1 block">
              ₹{stats.new_udhaar_amount.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500">Credit logged today</span>
          </div>
        </div>

        {/* Spoken Script Transcript Preview */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>जनरेटेड वॉइस स्क्रिप्ट (Synthesized Voice Script):</span>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
            "{script}"
          </p>
        </div>
      </div>
    </div>
  );
};
