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
  AlertCircle 
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

      // Prompt the owner via Voice TTS for the first item
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

    // Find product in catalog
    const matchedProduct =
      products.find((p) => p.name.toLowerCase().includes(item.product_name.toLowerCase())) ||
      products[0];

    // Commit Stock IN transaction
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

    // Speak audio confirmation & move to next line
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
      // All items confirmed!
      confetti({
        particleCount: 60,
        spread: 70,
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
      <div className="glass-card p-4 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {language === 'hi'
                ? 'चालान फोटो + आवाज़ संयोजन प्रविष्टि'
                : language === 'te'
                ? 'చలాన్ ఫోటో + వాయిస్ కాంబో ఎంట్రీ'
                : 'Challan Photo + Voice Combo Entry'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Feature #2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {language === 'hi'
              ? 'थोक सप्लायर डिलीवरी चालान या इनवॉइस अपलोड करें। AI सामान पहचान लेगा, और आप बिना टाइप किए बोलकर तुरंत स्टॉक दर्ज कर सकते हैं।'
              : language === 'te'
              ? 'హోల్‌సేల్ డెలివరీ చలాన్ లేదా ఇన్వాయిస్ అప్‌లోడ్ చేయండి. AI సరుకులను గుర్తిస్తుంది, టైప్ చేయకుండా మాట్లాడి ధృవీకరించండి.'
              : 'Upload or capture supplier wholesale delivery slip / invoice. The Edge Function extracts line items, and you confirm each line by speaking without typing.'}
          </p>
        </div>

        <button
          onClick={handleRunOcr}
          disabled={isProcessing}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition shrink-0"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Scanning Challan OCR...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{t.parseChallan}</span>
            </span>
          )}
        </button>
      </div>

      {/* OCR Result Display */}
      {challanData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {/* Supplier & Invoice Summary */}
          <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <FileText className="w-4 h-4" />
              <span>{t.extractedItems}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {language === 'hi' ? 'आपूर्तिकर्ता' : language === 'te' ? 'సరఫరాదారు' : 'Supplier'}
                </span>
                <span className="font-bold text-white text-sm">{challanData.supplier_name}</span>
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
                <span className="text-base font-extrabold text-amber-400">
                  ₹{challanData.total_invoice_amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {confirmedItemIds.length === challanData.items.length
                  ? (language === 'hi'
                      ? 'सभी सामान सत्यापित होकर सुपाबेस में दर्ज हो गए!'
                      : language === 'te'
                      ? 'అన్ని సరుకులు విజయవంతంగా సుపాబేస్‌లో నమోదయ్యాయి!'
                      : 'All items verified and saved to Supabase Postgres!')
                  : (language === 'hi'
                      ? `${challanData.items.length} में से ${confirmedItemIds.length} सामान सत्यापित हुए`
                      : language === 'te'
                      ? `${challanData.items.length} లో ${confirmedItemIds.length} సరుకులు వాయిస్ ద్వారా ధృవీకరించబడ్డాయి`
                      : `${confirmedItemIds.length} of ${challanData.items.length} items confirmed by voice`)}
              </span>
            </div>
          </div>

          {/* Line Items Voice-Confirmation Stream */}
          <div className="md:col-span-2 glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center justify-between">
              <span>
                {language === 'hi' ? 'सामान सत्यापन सूची' : language === 'te' ? 'సరుకుల ధృవీకరణ జాబితా' : 'Line Items Voice Loop'}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                {language === 'hi' ? 'बोलें "हाँ / सही है" या क्लिक करें' : language === 'te' ? '"అవును / సరైనదే" అనండి' : 'Tap or say "Yes, correct"'}
              </span>
            </h3>

            <div className="space-y-2.5">
              {challanData.items.map((item: any, idx: number) => {
                const isConfirmed = confirmedItemIds.includes(idx);
                const isActive = activeItemIndex === idx && !isConfirmed;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isConfirmed
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                        : isActive
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.01]'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            #{idx + 1}
                          </span>
                          <h4 className="font-bold text-white text-sm">{item.product_name}</h4>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {Math.round(item.confidence * 100)}% OCR confidence
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs mt-1 text-slate-300">
                          <span>
                            {language === 'hi' ? 'मात्रा' : language === 'te' ? 'పరిమాణం' : 'Qty'}: <b className="text-white">{item.quantity} {translateUnit(item.unit, language)}</b>
                          </span>
                          <span>
                            {language === 'hi' ? 'दर' : language === 'te' ? 'ధర' : 'Rate'}: <b className="text-white">₹{item.rate}</b>
                          </span>
                          <span>
                            {language === 'hi' ? 'कुल' : language === 'te' ? 'మొత్తం' : 'Total'}: <b className="text-amber-300">₹{item.amount.toLocaleString('en-IN')}</b>
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isConfirmed ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>
                              {language === 'hi' ? 'दर्ज' : language === 'te' ? 'నమోదైంది' : 'Saved'}
                            </span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVoiceConfirmLine(idx)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-110 transition active:scale-95"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>
                              {language === 'hi' ? 'हाँ, पक्का करो' : language === 'te' ? 'అవును, నమోదు చేయండి' : 'Yes, Confirm'}
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
        <div className="glass-card rounded-2xl border border-dashed border-slate-700 p-8 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400 mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white mb-1">
            {language === 'hi'
              ? 'सप्लायर डिलीवरी चालान या इनवॉइस अपलोड करें'
              : language === 'te'
              ? 'సప్లయర్ డెలివరీ చలాన్ లేదా బిల్లు అప్‌లోడ్ చేయండి'
              : 'Upload Supplier Delivery Challan / Invoice'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {language === 'hi'
              ? 'बेगम बाज़ार थोक मंडी या डिस्ट्रीब्यूटर का चालान अपलोड करें। हमारी AI तुरंत सभी सामान निकालकर बिना टाइप किए स्टॉक में जोड़ देगी।'
              : language === 'te'
              ? 'బేగంబజార్ హోల్‌సేల్ మార్కెట్ చలాన్ అప్‌లోడ్ చేయండి. మా AI తక్షణమే సరుకులను గుర్తించి స్టాక్‌కు జోడిస్తుంది.'
              : 'Upload delivery slip from wholesale mandi. Our Vision Edge function will extract all line items for instant voice-confirmed stock IN.'}
          </p>
          <button
            onClick={handleRunOcr}
            disabled={isProcessing}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 transition inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {language === 'hi'
                ? 'डेमो चालान स्कैन करें'
                : language === 'te'
                ? 'డెమో చలాన్ స్కాన్ చేయండి'
                : 'Load Sample Demo Challan'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
