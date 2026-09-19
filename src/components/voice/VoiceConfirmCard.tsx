import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Volume2, 
  Sparkles,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { recordTransaction, addKhataEntry, Product, Customer } from '../../lib/api';
import { TRADE_UNITS, calculateBaseQuantity } from '../../lib/tradeVocabulary';
import { ttsEngine } from '../../lib/speech/tts';
import { enqueueOfflineTransaction } from '../../lib/offlineQueue';

interface VoiceConfirmCardProps {
  parsedData: {
    intent: 'stock_in' | 'stock_out' | 'khata_credit' | 'khata_payment' | 'stock_query';
    product_id?: string;
    product_name?: string;
    category?: string;
    quantity: number;
    unit: string;
    base_unit?: string;
    price?: number;
    total_amount?: number;
    direction?: 'in' | 'out';
    customer_name?: string;
    confidence: number;
    raw_transcript?: string;
    summary_text_hi?: string;
    summary_text_te?: string;
    summary_text_en?: string;
  };
  products: Product[];
  customers: Customer[];
  language: 'hi' | 'te' | 'en';
  onClose: () => void;
  onSuccess: () => void;
}

export const VoiceConfirmCard: React.FC<VoiceConfirmCardProps> = ({
  parsedData,
  products,
  customers,
  language,
  onClose,
  onSuccess,
}) => {
  const [qty, setQty] = useState<number>(parsedData.quantity || 1);
  const [unit, setUnit] = useState<string>(parsedData.unit || 'bag');
  const [price, setPrice] = useState<number>(parsedData.price || 100);
  const [direction, setDirection] = useState<'in' | 'out'>(parsedData.direction || 'out');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    parsedData.product_id || products[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const matchedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const baseUnit = matchedProduct?.base_unit || 'piece';
  const baseQty = calculateBaseQuantity(qty, unit, baseUnit, matchedProduct?.unit_conversion);
  const totalAmount = qty * price;

  const confidencePct = Math.round((parsedData.confidence || 0.92) * 100);
  const confidenceColor =
    confidencePct >= 85
      ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
      : confidencePct >= 65
      ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
      : 'text-rose-400 bg-rose-500/15 border-rose-500/30';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (parsedData.intent === 'khata_credit' || parsedData.intent === 'khata_payment') {
        // Record customer Khata Udhaar
        const cust = customers.find((c) =>
          parsedData.customer_name ? c.name.toLowerCase().includes(parsedData.customer_name.toLowerCase()) : true
        ) || customers[0];

        await addKhataEntry({
          shop_id: cust.shop_id,
          customer_id: cust.id,
          type: parsedData.intent === 'khata_credit' ? 'credit' : 'payment',
          amount: totalAmount || price,
          source: 'voice',
          raw_transcript: parsedData.raw_transcript,
          notes: `Voice logged: ${parsedData.raw_transcript}`,
        });

        // TTS regional voice confirmation
        const speechMsg = language === 'hi' 
          ? `${cust.name} के खाते में ${totalAmount || price} रुपये दर्ज हो गए हैं`
          : `${cust.name} ఖాతాలో ${totalAmount || price} రూపాయలు నమోదయ్యాయి`;
        ttsEngine.speak(speechMsg, language);

      } else {
        // Check if offline: enqueue to IndexedDB offline queue
        if (!navigator.onLine) {
          await enqueueOfflineTransaction({
            shop_id: matchedProduct.shop_id,
            product_id: matchedProduct.id,
            product_name: matchedProduct.name,
            type: direction,
            qty,
            unit,
            qty_in_base_unit: baseQty,
            price,
            total_amount: totalAmount,
            source: 'voice',
            raw_transcript: parsedData.raw_transcript,
            confidence: parsedData.confidence,
            notes: 'Saved offline in PWA IndexedDB queue',
          });

          const offlineMsg = language === 'hi'
            ? 'ऑफ़लाइन सेव हो गया, इंटरनेट आने पर सिंक होगा'
            : language === 'te'
            ? 'ఆఫ్‌లైన్‌లో భద్రపరచబడింది, నెట్ రాగానే సింక్ అవుతుంది'
            : 'Saved to offline queue. Will auto-sync when online.';
          ttsEngine.speak(offlineMsg, language);
        } else {
          // Online: Record directly to Supabase Postgres (Triggers recalculate stock & alerts)
          await recordTransaction({
            shop_id: matchedProduct.shop_id,
            product_id: matchedProduct.id,
            product_name: matchedProduct.name,
            type: direction,
            qty,
            unit,
            base_unit: matchedProduct.base_unit,
            unit_conversion: matchedProduct.unit_conversion,
            price,
            total_amount: totalAmount,
            source: 'voice',
            raw_transcript: parsedData.raw_transcript,
            confidence: parsedData.confidence,
          });

          // TTS regional voice confirmation
          const actionWord = direction === 'in'
            ? language === 'hi' ? 'स्टॉक में जमा हो गया' : 'స్టాక్ లో జమ చేయబడింది'
            : language === 'hi' ? 'बिक्री दर्ज हो गई' : 'అమ్మకం నమోదైంది';

          const speechMsg = `${qty} ${unit} ${matchedProduct.name} ${actionWord}`;
          ttsEngine.speak(speechMsg, language);
        }
      }

      // Celebratory confetti animation on successful confirmation!
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981', '#fbbf24'],
      });

      onSuccess();
    } catch (err: any) {
      alert('Error recording transaction: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/40 p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header & Confidence Badge */}
        <div className="flex items-center justify-between mb-4 pr-8">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${confidenceColor}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Confidence: {confidencePct}%</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {parsedData.intent === 'khata_credit' ? '📖 KHATA' : direction === 'in' ? '🟢 STOCK IN' : '🔴 STOCK OUT'}
          </div>
        </div>

        {/* Original Spoken Transcript Quote */}
        {parsedData.raw_transcript && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs italic text-amber-300/90 flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0 text-amber-400" />
            <span>"{parsedData.raw_transcript}"</span>
          </div>
        )}

        {/* Product Selection & Direction Pill */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Matched Product (Trade Vocabulary Engine)
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              if (p) setPrice(p.price);
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category}) - ₹{p.price}/{p.unit}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Direction Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setDirection('in')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              direction === 'in'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>माल आया (Stock IN)</span>
          </button>
          <button
            onClick={() => setDirection('out')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              direction === 'out'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>माल बिका (Stock OUT)</span>
          </button>
        </div>

        {/* Interactive Quantity & Trade Unit Steppers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Quantity */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="block text-[11px] font-medium text-slate-400 mb-1">Quantity</span>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-lg text-white">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Trade Unit */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="block text-[11px] font-medium text-slate-400 mb-1">Trade Unit</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-transparent text-amber-300 font-bold text-sm focus:outline-none capitalize"
            >
              <option value="bag">Bora / Bag (50kg)</option>
              <option value="tin">Tin / Pipa (15kg/L)</option>
              <option value="carton">Carton / Peti (24 pcs)</option>
              <option value="patti">Patti / Dozen (12 pcs)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="litre">Litre (L)</option>
              <option value="packet">Packet</option>
              <option value="piece">Piece</option>
            </select>
          </div>
        </div>

        {/* Unit Conversion Breakdown */}
        {unit !== baseUnit && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <span>Trade conversion to base unit:</span>
            <span className="font-bold">
              {qty} {unit} = {baseQty} {baseUnit}
            </span>
          </div>
        )}

        {/* Rate & Total Amount */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Rate per {unit}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-slate-400 font-bold">₹</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-20 bg-transparent text-white font-bold text-sm focus:outline-none border-b border-slate-700"
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Transaction Value</span>
            <span className="text-lg font-black text-amber-400">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Final Confirmation Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
          >
            रद्द करें (Cancel)
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>{isSubmitting ? 'Saving to Postgres...' : 'हाँ, पक्का करें (Confirm & Save)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
