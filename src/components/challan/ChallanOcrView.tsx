import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Camera, 
  CheckCircle2, 
  Sparkles, 
  Volume2, 
  RotateCcw, 
  Mic, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertCircle,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseChallanOCR, recordTransaction, Product } from '../../lib/api';
import { ttsEngine } from '../../lib/speech/tts';
import { getTranslations, translateUnit } from '../../lib/i18n';

interface ChallanOcrViewProps {
  products: Product[];
  language: 'hi' | 'te' | 'en';
  onStockUpdated: () => void;
}

export const ChallanOcrView: React.FC<ChallanOcrViewProps> = ({
  products,
  language,
  onStockUpdated,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [challanData, setChallanData] = useState<any | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [confirmedItemIds, setConfirmedItemIds] = useState<number[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const t = getTranslations(language);

  const handleRunOcr = async () => {
    setIsProcessing(true);
    setChallanData(null);
    setConfirmedItemIds([]);
    setActiveItemIndex(0);

    try {
      const data = await parseChallanOCR();
      setChallanData(data);

      if (data.items && data.items.length > 0) {
        const first = data.items[0];
        const speechMsg = language === 'hi'
          ? `पहला सामान: ${first.quantity} ${translateUnit(first.unit, language)} ${first.product_name}, भाव ${first.rate} रुपये. क्या सही है?`
          : language === 'te'
          ? `మొదటి సరుకు: ${first.quantity} ${translateUnit(first.unit, language)} ${first.product_name}, రేటు ${first.rate} రూపాయలు. సరైనదేనా?`
          : `First item: ${first.quantity} ${first.unit} ${first.product_name}, rate ${first.rate} rupees. Is this correct?`;
        ttsEngine.speak(speechMsg, language);
      }
    } catch (err: any) {
      alert('OCR error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceConfirmLine = async (index: number) => {
    if (!challanData || !challanData.items[index]) return;
    const item = challanData.items[index];

    const matchedProduct =
      products.find((p) => p.name.toLowerCase().includes(item.product_name.toLowerCase())) ||
      products[0];

    await recordTransaction({
      shop_id: matchedProduct.shop_id,
      product_id: matchedProduct.id,
      product_name: matchedProduct.name,
      type: 'in',
      qty: item.quantity,
      unit: item.unit,
      base_unit: matchedProduct.base_unit,
      unit_conversion: matchedProduct.unit_conversion,
      price: item.rate,
      total_amount: item.amount,
      source: 'ocr',
      notes: `Challan OCR #${challanData.challan_number} confirmed by voice`,
      confidence: item.confidence,
    });

    setConfirmedItemIds((prev) => [...prev, index]);

    const nextIdx = index + 1;
    if (nextIdx < challanData.items.length) {
      setActiveItemIndex(nextIdx);
      const nextItem = challanData.items[nextIdx];
      const nextMsg = language === 'hi'
        ? `दर्ज हो गया. अगला सामान: ${nextItem.quantity} ${translateUnit(nextItem.unit, language)} ${nextItem.product_name}, भाव ${nextItem.rate} रुपये. क्या सही है?`
        : language === 'te'
        ? `నమోదైంది. తదుపరి సరుకు: ${nextItem.quantity} ${translateUnit(nextItem.unit, language)} ${nextItem.product_name}, రేటు ${nextItem.rate} రూపాయలు. సరైనదేనా?`
        : `Recorded. Next item: ${nextItem.quantity} ${nextItem.unit} ${nextItem.product_name}, rate ${nextItem.rate} rupees. Is this correct?`;
      ttsEngine.speak(nextMsg, language);
    } else {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981'],
      });
      const doneMsg = language === 'hi'
        ? 'चालान के सभी सामान सफलतापूर्वक स्टॉक में दर्ज हो गए हैं!'
        : language === 'te'
        ? 'చలాన్ లోని అన్ని సరుకులు విజయవంతంగా స్టాక్ లో నమోదయ్యాయి!'
        : 'All challan items successfully recorded into stock!';
      ttsEngine.speak(doneMsg, language);
    }

    onStockUpdated();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              {language === 'hi'
                ? 'चालान इनवॉइस स्कैनर'
                : language === 'te'
                ? 'చలాన్ ఇన్వాయిస్ స్కానర్'
                : 'Challan & Invoice OCR Scanner'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-white/[0.06]">
              Vision AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {language === 'hi'
              ? 'थोक सप्लायर डिलीवरी चालान या इनवॉइस अपलोड करें। AI सामान पहचान लेगा, और आप बोलकर तुरंत स्टॉक दर्ज कर सकते हैं।'
              : language === 'te'
              ? 'హోల్‌సేల్ డెలివరీ చలాన్ లేదా ఇన్వాయిస్ అప్‌లోడ్ చేయండి. AI సరుకులను గుర్తిస్తుంది, మాట్లాడి ధృవీకరించండి.'
              : 'Upload wholesale delivery challans or invoices. AI extracts line items for voice verification into inventory.'}
          </p>
        </div>

        <button
          onClick={handleRunOcr}
          disabled={isProcessing}
          className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning OCR...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              <span>{t.parseChallan}</span>
            </span>
          )}
        </button>
      </div>

      {/* OCR Result Display */}
      {challanData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {/* Supplier & Invoice Summary */}
          <div className="bg-slate-900/60 rounded-xl border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{t.extractedItems}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-white/[0.06] space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {language === 'hi' ? 'आपूर्तिकर्ता' : language === 'te' ? 'సరఫరాదారు' : 'Supplier'}
                </span>
                <span className="font-semibold text-white text-sm">{challanData.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Challan #</span>
                  <span className="font-mono text-slate-200">{challanData.challan_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'hi' ? 'दिनांक' : language === 'te' ? 'తేదీ' : 'Date'}
                  </span>
                  <span className="text-slate-200">{challanData.date}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {language === 'hi' ? 'कुल चालान राशि' : language === 'te' ? 'మొత్తం చలాన్ విలువ' : 'Total Challan Amount'}
                </span>
                <span className="text-base font-bold text-white tabular-nums">
                  ₹{challanData.total_invoice_amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/25 text-slate-300 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {confirmedItemIds.length === challanData.items.length
                  ? (language === 'hi'
                      ? 'सभी सामान सत्यापित होकर स्टॉक में दर्ज हो गए!'
                      : language === 'te'
                      ? 'అన్ని సరుకులు విజయవంతంగా స్టాక్‌లో నమోదయ్యాయి!'
                      : 'All items verified and saved to database!')
                  : `${confirmedItemIds.length} of ${challanData.items.length} items confirmed`}
              </span>
            </div>
          </div>

          {/* Line Items Voice-Confirmation Stream */}
          <div className="md:col-span-2 bg-slate-900/60 rounded-xl border border-white/[0.08] p-4 space-y-3">
            <h3 className="font-semibold text-xs text-white flex items-center justify-between">
              <span>
                {language === 'hi' ? 'सामान सत्यापन सूची' : language === 'te' ? 'సరుకుల ధృవీకరణ జాబితా' : 'Line Items Verification'}
              </span>
              <span className="text-slate-400 font-normal">
                {language === 'hi' ? 'बोलें "हाँ" या क्लिक करें' : language === 'te' ? '"అవును" అనండి' : 'Confirm each item'}
              </span>
            </h3>

            <div className="space-y-2">
              {challanData.items.map((item: any, idx: number) => {
                const isConfirmed = confirmedItemIds.includes(idx);
                const isActive = activeItemIndex === idx && !isConfirmed;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-all ${
                      isConfirmed
                        ? 'bg-emerald-950/10 border-emerald-500/25 text-slate-300'
                        : isActive
                        ? 'bg-amber-950/15 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-white/[0.06] text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            #{idx + 1}
                          </span>
                          <h4 className="font-semibold text-white text-xs sm:text-sm">{item.product_name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {Math.round(item.confidence * 100)}% OCR
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs mt-1 text-slate-400">
                          <span>
                            Qty: <strong className="text-slate-200 tabular-nums">{item.quantity} {translateUnit(item.unit, language)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Rate: <strong className="text-slate-200 tabular-nums">₹{item.rate}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total: <strong className="text-slate-100 tabular-nums">₹{item.amount.toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isConfirmed ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-medium text-xs flex items-center gap-1 border border-emerald-500/25">
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {language === 'hi' ? 'दर्ज' : language === 'te' ? 'నమోదైంది' : 'Verified'}
                            </span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVoiceConfirmLine(idx)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>
                              {language === 'hi' ? 'पुष्टि करें' : language === 'te' ? 'ధృవీకరించండి' : 'Confirm'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Initial State */
        <div className="bg-slate-900/60 rounded-xl border border-dashed border-white/[0.12] p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/[0.08] flex items-center justify-center mx-auto text-amber-400 mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-white mb-1">
            {language === 'hi'
              ? 'सप्लायर डिलीवरी चालान या इनवॉइस अपलोड करें'
              : language === 'te'
              ? 'సప్లయర్ డెలివరీ చలాన్ లేదా బిల్లు అప్‌లోడ్ చేయండి'
              : 'Upload Supplier Delivery Challan / Invoice'}
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {language === 'hi'
              ? 'डिस्ट्रीब्यूटर या मंडी का चालान अपलोड करें। AI तुरंत सभी सामान निकालकर बिना टाइप किए स्टॉक में जोड़ देगा।'
              : language === 'te'
              ? 'మార్కెట్ చలాన్ అప్‌లోడ్ చేయండి. మా AI తక్షణమే సరుకులను గుర్తించి స్టాక్‌కు జోడిస్తుంది.'
              : 'Upload wholesale slips. Vision Edge models extract all line items for instant voice-confirmed inventory intake.'}
          </p>
          <button
            onClick={handleRunOcr}
            disabled={isProcessing}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-sm transition inline-flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {language === 'hi'
                ? 'डेमो चालान लोड करें'
                : language === 'te'
                ? 'డెమో చలాన్ లోడ్ చేయండి'
                : 'Load Sample Challan'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
