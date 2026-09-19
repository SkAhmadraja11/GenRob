import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Package, 
  MessageSquare, 
  Mic, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Send
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

    setTimeout(async () => {
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
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Zap className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'hi' ? 'रीऑर्डर जरूरत' : language === 'te' ? 'రీఆర్డర్ అవసరం' : 'Reorders Needed'}
            </span>
            <span className="text-xl font-bold text-white tabular-nums">{reorderList.length} items</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {t.tiedUpCapital}
            </span>
            <span className="text-xl font-bold text-rose-400 tabular-nums">₹{totalDeadCapital.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] col-span-2 sm:col-span-1 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Activity className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'hi' ? 'स्टोर एफिशिएंसी' : language === 'te' ? 'స్టోర్ సామర్థ్యం' : 'Store Efficiency'}
            </span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">94 / 100</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-1.5 p-1 bg-slate-900 rounded-xl border border-white/[0.08]">
        <button
          onClick={() => setActiveSubTab('predictive')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'predictive'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 stroke-[2]" />
          <span>{t.aiPredictiveTitle}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deadstock')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'deadstock'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 stroke-[2]" />
          <span>{t.deadStockTitle}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'whatsapp'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 stroke-[2]" />
          <span>WhatsApp Bot</span>
        </button>
      </div>

      {/* 1. Predictive Reorder Subtab */}
      {activeSubTab === 'predictive' && (
        <div className="space-y-3">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08]">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{t.aiPredictiveTitle}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t.predictiveSubtitle}
            </p>
          </div>

          <div className="space-y-2">
            {reorderList.map((item) => {
              const isUrgent = item.urgency === 'critical_out_of_stock' || item.urgency === 'urgent_below_threshold';
              return (
                <div
                  key={item.product_id}
                  className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUrgent
                      ? 'bg-rose-950/15 border-rose-500/30'
                      : item.urgency === 'high_risk'
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-slate-900/60 border-white/[0.08]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-white">{item.product_name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium uppercase bg-slate-800 text-slate-400 border border-white/[0.06]">
                        {translateCategory(item.category, language)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                      <span>
                        {language === 'hi' ? 'स्टॉक' : language === 'te' ? 'స్టాక్' : 'Stock'}: <strong className="text-white tabular-nums">{item.current_stock} {translateUnit(item.base_unit, language)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t.dailyBurn}: <strong className="text-slate-200 tabular-nums">{item.daily_consumption_rate} {translateUnit(item.base_unit, language)}/d</strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t.daysLeft}: <strong className={`tabular-nums ${item.days_of_stock_left <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.days_of_stock_left} d</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.06] flex sm:flex-col items-center sm:items-end justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">{t.suggestedReorder}</span>
                      <span className="text-base font-bold text-amber-400 tabular-nums">
                        +{item.suggested_reorder_qty} {translateUnit(item.base_unit, language)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md mt-1 ${
                      isUrgent ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25' : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                    }`}>
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
          <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] flex items-center justify-between">
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
              <span className="text-[10px] text-slate-400 block font-medium">{t.tiedUpCapital}</span>
              <span className="text-lg font-bold text-rose-400 tabular-nums">
                ₹{totalDeadCapital.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {deadStockList.map((item) => (
              <div
                key={item.product_id}
                className="bg-slate-900/60 p-3.5 rounded-xl border border-white/[0.08] flex items-center justify-between"
              >
                <div>
                  <h4 className="font-semibold text-sm text-white">{item.product_name}</h4>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 mt-1">
                    <span>Stock: <strong className="text-slate-200 tabular-nums">{item.current_stock} {translateUnit(item.base_unit, language)}</strong></span>
                    <span>•</span>
                    <span>Cost: <strong className="text-slate-200 tabular-nums">₹{item.cost_price}</strong></span>
                    <span>•</span>
                    <span className="text-rose-400 font-medium">
                      {item.days_since_last_sale > 999 ? t.neverSold : `${item.days_since_last_sale} ${t.daysAgo}`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">{t.tiedUpCapital}</span>
                  <span className="text-sm font-bold text-white tabular-nums">
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
        <div className="bg-slate-900/60 p-5 rounded-xl border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  WhatsApp Cloud Webhook Simulation
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate inbound audio voice-note payloads from WhatsApp to the Edge Function webhook.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="block text-xs font-medium text-slate-300">
              Voice Note Transcript Payload:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={waVoiceTranscript}
                onChange={(e) => setWaVoiceTranscript(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-white/[0.1] text-white font-medium text-xs focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={handleSimulateWhatsApp}
                disabled={waSending}
                className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                {waSending ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{waSending ? 'Processing...' : 'Send Webhook'}</span>
              </button>
            </div>
          </div>

          {/* Webhook Response Preview */}
          {waResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>200 OK — Webhook Ingestion Successful</span>
                </span>
                <span className="font-mono text-slate-500 text-[10px]">
                  ID: {waResult.db_transaction_id.slice(0, 8)}...
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Outgoing Auto-Reply Message:</span>
                <div className="p-3 rounded-lg bg-slate-900 border border-white/[0.06] text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
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
