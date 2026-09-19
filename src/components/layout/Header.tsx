import React, { useState } from 'react';
import { 
  Radio, 
  Bell, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { Alert } from '../../lib/api';
import { getTranslations } from '../../lib/i18n';

interface HeaderProps {
  shopName: string;
  isRealtime: boolean;
  alerts: Alert[];
  language: 'hi' | 'te' | 'en';
  onLanguageChange: (lang: 'hi' | 'te' | 'en') => void;
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  shopName,
  isRealtime,
  alerts,
  language,
  onLanguageChange,
  onOpenAlerts,
  onOpenSettings,
  onOpenAuth,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = getTranslations(language);
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-amber-500/20 px-4 py-3 sm:px-6 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Shop Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30">
            <span className="font-extrabold text-slate-950 text-xl tracking-tight">GR</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                {shopName || t.appName}
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Kirana V1
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {isRealtime ? t.realtimeLive : t.offlineSync}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 hidden xs:inline">{t.location}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-amber-300 border border-slate-700 transition active:scale-95"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {language === 'hi' ? '🇮🇳 हिन्दी' : language === 'te' ? '🇮🇳 తెలుగు' : '🌐 English'}
              </span>
            </button>

            {langMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setLangMenuOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-36 glass-panel rounded-xl shadow-2xl border border-amber-500/40 p-1.5 z-50 bg-slate-900/95 backdrop-blur-xl">
                  <button
                    onClick={() => { 
                      onLanguageChange('hi'); 
                      setLangMenuOpen(false); 
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      language === 'hi' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>🇮🇳 हिन्दी</span>
                    {language === 'hi' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { 
                      onLanguageChange('te'); 
                      setLangMenuOpen(false); 
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      language === 'te' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>🇮🇳 తెలుగు</span>
                    {language === 'te' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { 
                      onLanguageChange('en'); 
                      setLangMenuOpen(false); 
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      language === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>🌐 English</span>
                    {language === 'en' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Low Stock Alerts Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Stock Alerts"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${criticalCount > 0 ? 'bg-rose-500 animate-pulse glow-rose' : 'bg-amber-500'}`}>
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Database / Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
            title="Supabase Settings"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Phone-OTP Auth Identity */}
          <button
            onClick={onOpenAuth}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
            title="Phone-OTP Shop Owner Auth"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
