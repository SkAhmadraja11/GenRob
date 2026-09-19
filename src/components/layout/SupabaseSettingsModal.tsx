import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { checkSupabaseHealth, reconfigureSupabase } from '../../lib/supabaseClient';
import { getTranslations, SupportedLanguage } from '../../lib/i18n';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: SupportedLanguage;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  language = 'hi',
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    connected: boolean;
    shopName?: string;
    error?: string;
    isMockFallback?: boolean;
  } | null>(null);

  const t = getTranslations(language);

  useEffect(() => {
    if (isOpen) {
      const storedUrl = localStorage.getItem('genrob_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
      const storedKey = localStorage.getItem('genrob_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      setUrl(storedUrl);
      setAnonKey(storedKey);
      testConnection();
    }
  }, [isOpen]);

  const testConnection = async () => {
    setIsTesting(true);
    const result = await checkSupabaseHealth();
    setHealthStatus(result);
    setIsTesting(false);
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      alert('Please provide both Supabase URL and Anon Key');
      return;
    }
    reconfigureSupabase(url.trim(), anonKey.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t.settingsModalTitle}</h2>
            <p className="text-xs text-slate-400">{t.settingsModalSubtitle}</p>
          </div>
        </div>

        {/* Connection Status Banner */}
        <div className={`p-4 rounded-xl mb-5 border flex items-start gap-3 ${
          healthStatus?.connected 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : healthStatus?.isMockFallback 
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {healthStatus?.connected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <div className="font-semibold text-sm">
              {healthStatus?.connected 
                ? `${language === 'hi' ? 'सुपाबेस से कनेक्टेड' : language === 'te' ? 'సుపాబేస్‌కు కనెక్ట్ చేయబడింది' : 'Connected to Supabase'} (${healthStatus.shopName})` 
                : healthStatus?.isMockFallback 
                ? (language === 'hi' ? 'सीडेड किराना मोड' : language === 'te' ? 'సీడెడ్ కిరాణా మోడ్' : 'Running in Local Kirana Seed Mode')
                : (language === 'hi' ? 'कनेक्शन विफल' : language === 'te' ? 'కనెక్షన్ విఫలమైంది' : 'Connection Failed')}
            </div>
            <div className="mt-1 text-slate-300">
              {healthStatus?.connected 
                ? (language === 'hi' ? 'सभी डेटाबेस क्वेरी, ट्रिगर और रियल-टाइम सुपाबेस पोस्टग्रेस से जुड़े हैं।' : language === 'te' ? 'అన్ని క్వెరీలు మరియు రియల్-టైమ్ అప్‌డేట్లు నేరుగా పోస్ట్‌గ్రెస్ నుండి నడుస్తున్నాయి.' : 'Queries, triggers, and Realtime publications are executing directly against your Supabase Postgres database.')
                : healthStatus?.error || (language === 'hi' ? 'सभी 18 किराना सामान, ट्रेड कन्वर्शन और खाता सक्रिय हैं।' : language === 'te' ? 'అన్ని 18 సరుకులు, ట్రేడ్ కన్వర్షన్లు మరియు ఖాతా యాక్టివ్‌గా ఉన్నాయి.' : 'All 18 seeded products, trade conversions, alerts, and khata balances are active.')}
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t.urlLabel} (VITE_SUPABASE_URL)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t.keyLabel} (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 text-xs"
            >
              {t.saveConnBtn}
            </button>
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5 transition text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{t.testConnBtn}</span>
            </button>
          </div>
        </div>

        {/* Database Migration Checklist */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
          <div className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
            <span>{language === 'hi' ? 'डेटाबेस माइग्रेशन (SQL Migrations):' : language === 'te' ? 'డేటాబేస్ మైగ్రేషన్లు (SQL Migrations):' : 'SQL Migrations Included in Repo:'}</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
              supabase/migrations/
            </span>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span><code className="text-slate-300">000001_initial_schema.sql</code> (10 tables, pgvector, indices)</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span><code className="text-slate-300">000002_triggers_and_functions.sql</code> (Stock & alert triggers, pgvector search)</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span><code className="text-slate-300">000003_rls_policies.sql</code> (Strict shop_id isolation policies)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
