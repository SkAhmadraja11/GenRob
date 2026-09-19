import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Globe, 
  FileAudio,
  Radio
} from 'lucide-react';
import { VoiceRecognizer, STTLanguage, STTResult } from '../../lib/speech/speechRecognition';
import { AudioVisualizer } from '../../lib/speech/audioVisualizer';
import { parseVoiceTranscriptNLU } from '../../lib/api';

interface VoiceMicModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopLanguage: 'hi' | 'te' | 'en';
  onParsedResult: (result: any) => void;
}

export const VoiceMicModal: React.FC<VoiceMicModalProps> = ({
  isOpen,
  onClose,
  shopLanguage,
  onParsedResult,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'hi' | 'te' | 'en'>(shopLanguage);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [frequencies, setFrequencies] = useState<number[]>(new Array(24).fill(10));
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLanguage(shopLanguage);
  }, [shopLanguage]);

  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);

  useEffect(() => {
    recognizerRef.current = new VoiceRecognizer();
    visualizerRef.current = new AudioVisualizer();

    return () => {
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setErrorMsg(null);
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen]);

  const getSttLangCode = (lang: 'hi' | 'te' | 'en'): STTLanguage => {
    if (lang === 'te') return 'te-IN';
    if (lang === 'en') return 'en-IN';
    return 'hi-IN';
  };

  const startListening = async () => {
    setErrorMsg(null);
    setIsListening(true);
    setTranscript('');

    // Start Audio Waveform Visualizer
    if (visualizerRef.current) {
      visualizerRef.current.start((freqs) => {
        // Take 24 bars
        setFrequencies(freqs.slice(0, 24));
      });
    }

    // Start Web Speech Recognizer
    if (recognizerRef.current) {
      recognizerRef.current.setLanguage(getSttLangCode(selectedLanguage));
      recognizerRef.current.start(
        (result: STTResult) => {
          setTranscript(result.transcript);
        },
        (error: string) => {
          console.warn('STT notice:', error);
        },
        () => {
          // Finished utterance
          setIsListening(false);
          if (visualizerRef.current) visualizerRef.current.stop();
        }
      );
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognizerRef.current) recognizerRef.current.stop();
    if (visualizerRef.current) visualizerRef.current.stop();
    setFrequencies(new Array(24).fill(6));
  };

  const handleProcessTranscript = async (textToProcess?: string) => {
    const text = textToProcess || transcript;
    if (!text.trim()) {
      setErrorMsg('Please say something or tap a sample command below');
      return;
    }

    stopListening();
    setIsParsing(true);
    setErrorMsg(null);

    try {
      const parsed = await parseVoiceTranscriptNLU(text, selectedLanguage);
      onParsedResult({
        ...parsed,
        raw_transcript: text,
      });
      onClose();
    } catch (e: any) {
      setErrorMsg('Failed to understand voice command. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const quickSamples = {
    hi: [
      'पांच बोरा आशीर्वाद आटा आया २१०० में',
      'तीस किलो तूअर दाल दिया होटल वाले को',
      'रमेश जी ने आठ सौ पचास का राशन उधार लिया',
      'दो टिन फॉर्च्यून सूरजमुखी तेल बिका',
    ],
    te: [
      'రెండు డబ్బాల ఫార్చూన్ నూనె అమ్మాము',
      'లక్ష్మి గారు ఐదు వందలు జమ చేశారు',
      'ఐదు బస్తాల గోధుమ పిండి వచ్చింది',
      'తీస్ కేజీల కందిపప్పు ఇచ్చాము',
    ],
    en: [
      'Received 5 bags Aashirvaad atta at 2100 rupees',
      'Sold 2 tins Fortune sunflower oil',
      'Record 850 credit to Ramesh tailor',
      'Sold 10 packets Tata salt',
    ],
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/40 p-6 shadow-2xl relative flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Language Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-full border border-slate-700/80 mb-6">
          <button
            onClick={() => {
              setSelectedLanguage('hi');
              if (isListening) startListening();
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              selectedLanguage === 'hi' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 हिन्दी
          </button>
          <button
            onClick={() => {
              setSelectedLanguage('te');
              if (isListening) startListening();
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              selectedLanguage === 'te' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 తెలుగు
          </button>
          <button
            onClick={() => {
              setSelectedLanguage('en');
              if (isListening) startListening();
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              selectedLanguage === 'en' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 English
          </button>
        </div>

        {/* Live Audio Waveform Animation */}
        <div className="w-full h-20 flex items-center justify-center gap-1 sm:gap-1.5 px-4 mb-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden">
          {frequencies.map((freq, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isListening
                  ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300'
                  : 'bg-slate-700'
              }`}
              style={{
                height: `${Math.max(6, Math.min(68, (freq / 100) * 68))}px`,
                opacity: isListening ? 0.9 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Big Animated Mic Circle */}
        <div className="relative my-3">
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping -z-10 scale-125" />
          )}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
              isListening
                ? 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white shadow-rose-500/40 glow-rose scale-105'
                : 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/40 glow-amber hover:scale-105'
            }`}
          >
            {isListening ? (
              <Mic className="w-9 h-9 stroke-[2.5] animate-pulse" />
            ) : (
              <MicOff className="w-9 h-9 stroke-[2.5]" />
            )}
          </button>
        </div>

        <p className="text-xs font-semibold tracking-wide text-amber-400 uppercase mt-2">
          {isListening
            ? selectedLanguage === 'hi'
              ? 'दुकानदार साहब बोलिए, हम सुन रहे हैं...'
              : selectedLanguage === 'te'
              ? 'చెప్పండి, మేము వింటున్నాము...'
              : 'Listening for trade stock entry...'
            : 'Tap mic to speak'}
        </p>

        {/* Live Transcription Box */}
        <div className="w-full mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 min-h-[70px] flex items-center justify-center text-center">
          {transcript ? (
            <p className="text-base font-bold text-slate-100 italic leading-relaxed">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              बोलिए: माल आया (Stock In), माल बिका (Stock Out), या ग्राहक का उधार (Khata)
            </p>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-rose-400 mt-2">{errorMsg}</p>
        )}

        {/* Action Button */}
        <div className="w-full flex gap-2 mt-4">
          <button
            onClick={() => handleProcessTranscript()}
            disabled={isParsing || !transcript}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              transcript
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isParsing ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Parsing Indian Trade NLU...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Understand & Review Card</span>
              </span>
            )}
          </button>
        </div>

        {/* Indian Kirana Quick Voice Suggestions */}
        <div className="w-full mt-5 pt-4 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">
            💡 Tap any realistic kirana phrase to test:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickSamples[selectedLanguage].map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTranscript(sample);
                  handleProcessTranscript(sample);
                }}
                className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
