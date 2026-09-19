import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Check, 
  X, 
  Volume2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  BookOpen, 
  Sparkles,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { VoiceRecognizer, STTResult } from '../../lib/speech/speechRecognition';
import { parseVoiceTranscriptNLU, recordTransaction, Product, Customer } from '../../lib/api';
import { soundFx } from '../../lib/soundFx';
import { getTranslations, SupportedLanguage, translateUnit } from '../../lib/i18n';

interface DynamicVoiceIslandProps {
  products: Product[];
  customers: Customer[];
  language: SupportedLanguage;
  onStockUpdated: () => void;
  onOpenFullMicModal: () => void;
}

export const DynamicVoiceIsland: React.FC<DynamicVoiceIslandProps> = ({
  products,
  customers,
  language,
  onStockUpdated,
  onOpenFullMicModal,
}) => {
  const [islandState, setIslandState] = useState<'idle' | 'listening' | 'parsed' | 'saving'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [frequencies, setFrequencies] = useState<number[]>([12, 24, 40, 60, 45, 30, 15, 8]);
  const [isMuted, setIsMuted] = useState(soundFx.getMuted());
  const t = getTranslations(language);

  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    recognizerRef.current = new VoiceRecognizer();
    const sttLang = language === 'te' ? 'te-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
    recognizerRef.current.setLanguage(sttLang);

    return () => {
      if (recognizerRef.current) recognizerRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [language]);

  // Simulate audio visualizer bars when listening
  useEffect(() => {
    if (islandState === 'listening') {
      const updateFrequencies = () => {
        setFrequencies((prev) =>
          prev.map(() => Math.floor(Math.random() * 65) + 10)
        );
        animationFrameRef.current = requestAnimationFrame(updateFrequencies);
      };
      animationFrameRef.current = requestAnimationFrame(updateFrequencies);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setFrequencies([10, 15, 20, 25, 20, 15, 10, 8]);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [islandState]);

  const startListening = () => {
    soundFx.playMicStart();
    setLiveTranscript('');
    setParsedData(null);
    setIslandState('listening');

    if (!recognizerRef.current) return;

    recognizerRef.current.start(
      (res: STTResult) => {
        setLiveTranscript(res.transcript);
        if (res.isFinal) {
          processTranscript(res.transcript);
        }
      },
      (err) => {
        console.warn('Dynamic Island STT:', err);
        // If voice ends without final result, check if we have transcript
        if (liveTranscript) {
          processTranscript(liveTranscript);
        } else {
          setIslandState('idle');
        }
      },
      () => {
        // Recognition ended
      }
    );
  };

  const stopListening = () => {
    if (recognizerRef.current) recognizerRef.current.stop();
    if (liveTranscript) {
      processTranscript(liveTranscript);
    } else {
      setIslandState('idle');
    }
  };

  const processTranscript = async (text: string) => {
    if (!text.trim()) {
      setIslandState('idle');
      return;
    }

    try {
      const parsed = await parseVoiceTranscriptNLU(text, language);
      setParsedData(parsed);
      setIslandState('parsed');
      soundFx.playTap();
    } catch (err) {
      console.warn('NLU Error in Island:', err);
      setIslandState('idle');
    }
  };

  const handleQuickConfirm = async () => {
    if (!parsedData) return;
    setIslandState('saving');

    try {
      const matchedProd =
        products.find(
          (p) =>
            p.name.toLowerCase().includes(parsedData.product_name.toLowerCase()) ||
            parsedData.product_name.toLowerCase().includes(p.name.toLowerCase())
        ) || products[0];

      await recordTransaction({
        shop_id: matchedProd.shop_id,
        product_id: matchedProd.id,
        product_name: matchedProd.name,
        type: parsedData.direction === 'in' ? 'in' : 'out',
        qty: parsedData.quantity || 1,
        unit: parsedData.unit || matchedProd.unit,
        base_unit: matchedProd.base_unit,
        unit_conversion: matchedProd.unit_conversion,
        price: parsedData.price || matchedProd.price,
        total_amount: (parsedData.quantity || 1) * (parsedData.price || matchedProd.price),
        source: 'voice',
        raw_transcript: liveTranscript || parsedData.raw_transcript,
        confidence: parsedData.confidence || 0.95,
      });

      soundFx.playSuccessChime();
      onStockUpdated();
      setIslandState('idle');
      setLiveTranscript('');
      setParsedData(null);
    } catch (err) {
      console.error('Island commit error:', err);
      soundFx.playAlert();
      setIslandState('idle');
    }
  };

  const handleCancel = () => {
    if (recognizerRef.current) recognizerRef.current.stop();
    setIslandState('idle');
    setLiveTranscript('');
    setParsedData(null);
  };

  return (
    <div className="sticky top-16 z-25 max-w-lg mx-auto px-3 pointer-events-auto transition-all duration-300">
      {/* ── STATE 1: IDLE MINI PILL ───────────────────────────── */}
      {islandState === 'idle' && (
        <div
          onClick={startListening}
          className="group cursor-pointer bg-slate-900/90 hover:bg-slate-850/95 backdrop-blur-md border border-white/[0.1] hover:border-amber-500/40 rounded-full px-3.5 py-1.5 shadow-lg flex items-center justify-between gap-3 transition-all duration-200 active:scale-98"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
              <span className="text-amber-400 font-semibold">{language === 'hi' ? 'बोलें:' : language === 'te' ? 'వాయిస్:' : 'Voice:'} </span>
              <span className="text-slate-400">"{language === 'hi' ? '५ बोरा आटा आया' : language === 'te' ? 'రెండు నూనె అమ్మాము' : 'Received 5 bags atta'}"</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
            <Sparkles className="w-2.5 h-2.5" />
            <span>AI Fast HUD</span>
          </div>
        </div>
      )}

      {/* ── STATE 2: LISTENING EXPANDED ISLAND ────────────────── */}
      {islandState === 'listening' && (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 shadow-2xl animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {language === 'hi' ? 'सुन रहा हूँ...' : language === 'te' ? 'వింటున్నాను...' : 'Listening...'}
              </span>
            </div>

            {/* Audio Waveform Bars */}
            <div className="flex items-center gap-1 h-5 px-2 bg-slate-950/60 rounded-md border border-white/[0.06]">
              {frequencies.map((f, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, Math.min(18, (f / 100) * 18))}px` }}
                />
              ))}
            </div>

            <button
              onClick={handleCancel}
              className="p-1 rounded-md text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Real-time Transcription text */}
          <div className="min-h-[36px] px-3 py-2 bg-slate-950/80 rounded-xl border border-white/[0.06] text-xs sm:text-sm font-medium text-slate-100 flex items-center">
            {liveTranscript ? (
              <span>"{liveTranscript}"</span>
            ) : (
              <span className="text-slate-500 italic">
                {language === 'hi'
                  ? 'सामान का नाम और मात्रा बोलें...'
                  : language === 'te'
                  ? 'సరుకు మరియు పరిమాణం మాట్లాడండి...'
                  : 'Speak product name and quantity...'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={stopListening}
              className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-sm"
            >
              Done / प्रोसेस करें
            </button>
            <button
              onClick={handleCancel}
              className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STATE 3 & 4: PARSED ENTITY HIGHLIGHTER & QUICK CONFIRM ─── */}
      {(islandState === 'parsed' || islandState === 'saving') && parsedData && (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-4 shadow-2xl animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                {language === 'hi' ? 'पहचाने गए विवरण (AI Verified)' : language === 'te' ? 'ధృవీకరించబడిన వివరాలు' : 'Entities Extracted'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-semibold">
              {Math.round((parsedData.confidence || 0.95) * 100)}% Match
            </span>
          </div>

          {/* Raw Audio Transcript Preview */}
          <div className="text-[11px] text-slate-400 italic px-2">
            🎙️ "{liveTranscript || parsedData.raw_transcript}"
          </div>

          {/* Real-time Entity Badges (Quantity, Product, Direction, Price) */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-950/80 rounded-xl border border-white/[0.06]">
            {/* Direction Pill */}
            <span className={`text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 ${
              parsedData.direction === 'in'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              {parsedData.direction === 'in' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              <span>{parsedData.direction === 'in' ? 'Stock IN (+)' : 'Stock OUT (-)'}</span>
            </span>

            {/* Quantity Pill */}
            <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {parsedData.quantity} {translateUnit(parsedData.unit || 'piece', language)}
            </span>

            {/* Product Pill */}
            <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
              {parsedData.product_name}
            </span>

            {/* Price Pill if detected */}
            {parsedData.price > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                ₹{parsedData.price}
              </span>
            )}
          </div>

          {/* Quick Confirmation Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleQuickConfirm}
              disabled={islandState === 'saving'}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {islandState === 'saving' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>1-Tap Confirm & Record</span>
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/[0.08]"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
