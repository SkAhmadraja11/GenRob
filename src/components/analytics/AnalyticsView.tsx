import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ArrowRight, 
  DollarSign, 
  Package, 
  MessageSquare, 
  Mic, 
  CheckCircle2, 
  RotateCcw,
  Sparkles 
} from 'lucide-react';
import { 
  fetchPredictiveReorderSuggestions, 
  fetchDeadStockReport, 
  PredictiveReorderItem, 
  DeadStockItem,
  recordTransaction,
  Product 
} from '../../lib/api';
import { getTranslations, translateCategory, translateUnit } from '../../lib/i18n';

interface AnalyticsViewProps {
  products: Product[];
  language: 'hi' | 'te' | 'en';
  onStockUpdated: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  products,
  language,
  onStockUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'predictive' | 'deadstock' | 'whatsapp'>('predictive');
  const [reorderList, setReorderList] = useState<PredictiveReorderItem[]>([]);
  const [deadStockList, setDeadStockList] = useState<DeadStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getTranslations(language);

  // WhatsApp simulation state
  const [waVoiceTranscript, setWaVoiceTranscript] = useState('दो बोरा आशीर्वाद आटा आया २१०० में');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [reorders, deadstock] = await Promise.all([
      fetchPredictiveReorderSuggestions(),
      fetchDeadStockReport(),
    ]);
    setReorderList(reorders);
    setDeadStockList(deadstock);
    setLoading(false);
  };

  const handleSimulateWhatsApp = async () => {
    setWaSending(true);
    setWaResult(null);

    // Simulate WhatsApp Cloud Webhook payload processing
    setTimeout(async () => {
      // Find matching product (Atta)
      const prod = products[0];
      const tx = await recordTransaction({
        shop_id: prod.shop_id,
        product_id: prod.id,
        product_name: prod.name,
        type: 'in',
        qty: 2,
        unit: 'bag',
        base_unit: prod.base_unit,
        unit_conversion: prod.unit_conversion,
        price: 2100,
        total_amount: 4200,
        source: 'whatsapp',
        raw_transcript: waVoiceTranscript,
        confidence: 0.96,
        notes: 'Ingested via WhatsApp voice-note webhook',
      });

      setWaResult({
        status: 'success',
        sender: '+919876543210',
        transcript: waVoiceTranscript,
        db_transaction_id: tx.id,
        product_name: prod.name,
        added_stock: `2 bag (${tx.qty_in_base_unit} ${prod.base_unit})`,
        whatsapp_reply: `✅ *GenRob Kirana Update*\n\n📝 *Recorded*: 2 bag ${prod.name} (Stock IN)\n📊 *Trigger Executed*: current_stock updated directly in Postgres!`,
      });
      setWaSending(false);
      onStockUpdated();
    }, 900);
  };

  const totalDeadCapital = deadStockList.reduce((acc, item) => acc + item.tied_up_capital, 0);

  return (
    <div className="space-y-4 pb-24">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveSubTab('predictive')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'predictive'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{t.aiPredictiveTitle}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deadstock')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'deadstock'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t.deadStockTitle}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'whatsapp'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp Voice Webhook</span>
        </button>
      </div>

      {/* 1. Predictive Reorder Subtab */}
      {activeSubTab === 'predictive' && (
        <div className="space-y-3">
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{t.aiPredictiveTitle}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t.predictiveSubtitle}
            </p>
          </div>

          <div className="space-y-2.5">
            {reorderList.map((item) => {
              const isUrgent = item.urgency === 'critical_out_of_stock' || item.urgency === 'urgent_below_threshold';
              return (
                <div
                  key={item.product_id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUrgent
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : item.urgency === 'high_risk'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'glass-card border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{item.product_name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-400">
                        {translateCategory(item.category, language)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1.5">
                      <span>
                        {language === 'hi' ? 'मौजूदा' : language === 'te' ? 'ప్రస్తుతం' : 'Current'}: <b className="text-white">{item.current_stock} {translateUnit(item.base_unit, language)}</b>
                      </span>
                      <span>
                        {t.dailyBurn}: <b className="text-amber-400">{item.daily_consumption_rate} {translateUnit(item.base_unit, language)}/{language === 'hi' ? 'दिन' : language === 'te' ? 'రోజు' : 'day'}</b>
                      </span>
                      <span>
                        {t.daysLeft}: <b className={`${item.days_of_stock_left <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.days_of_stock_left} {language === 'hi' ? 'दिन' : language === 'te' ? 'రోజులు' : 'Days'}</b>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{t.suggestedReorder}</span>
                    <span className="text-base font-extrabold text-amber-300 block">
                      +{item.suggested_reorder_qty} {translateUnit(item.base_unit, language)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${isUrgent ? 'text-rose-400' : 'text-amber-400'}`}>
                      {item.urgency === 'critical_out_of_stock'
                        ? t.urgencyCritical
                        : item.urgency === 'urgent_below_threshold'
                        ? t.urgencyHigh
                        : item.urgency.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Dead Stock Report Subtab */}
      {activeSubTab === 'deadstock' && (
        <div className="space-y-3">
          <div className="glass-card p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>{t.deadStockTitle}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {t.deadStockSubtitle}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">{t.tiedUpCapital}</span>
              <span className="text-lg font-black text-rose-400">
                ₹{totalDeadCapital.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {deadStockList.map((item) => (
              <div
                key={item.product_id}
                className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{item.product_name}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Stock: {item.current_stock} {translateUnit(item.base_unit, language)}</span>
                    <span>•</span>
                    <span>Wholesale Cost: ₹{item.cost_price}</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">
                      {item.days_since_last_sale > 999 ? t.neverSold : `${item.days_since_last_sale} ${t.daysAgo}`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{t.tiedUpCapital}</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    ₹{item.tied_up_capital.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. WhatsApp Voice-Note Ingestion Simulator */}
      {activeSubTab === 'whatsapp' && (
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  WhatsApp वॉइस नोट इनजेशन (WhatsApp Webhook Engine)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Feature #1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kirana owners send quick WhatsApp voice notes while busy at the counter. The Edge Function processes it and replies with instant confirmation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Simulate Incoming WhatsApp Voice Note Audio Transcript:
            </label>
            <input
              type="text"
              value={waVoiceTranscript}
              onChange={(e) => setWaVoiceTranscript(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />

            <button
              onClick={handleSimulateWhatsApp}
              disabled={waSending}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 transition flex items-center gap-2"
            >
              {waSending ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Executing Edge Function Webhook...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Send Voice Note to Webhook & Update Stock</span>
                </>
              )}
            </button>
          </div>

          {/* Webhook Response Preview */}
          {waResult && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-3 text-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>WhatsApp Webhook Processed Successfully</span>
                </span>
                <span className="font-mono text-slate-500 text-[10px]">
                  Tx ID: {waResult.db_transaction_id}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Outgoing WhatsApp Auto-Reply:</span>
                <div className="mt-1 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 font-mono text-[11px] whitespace-pre-wrap">
                  {waResult.whatsapp_reply}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
