import React, { useState } from 'react';
import {
  Bell,
  Database,
  CheckCircle2,
  Globe,
  ShieldCheck,
  User,
  Zap
} from 'lucide-react';
import { Alert } from '../../lib/api';
import { soundFx } from '../../lib/soundFx';
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
  onOpenPosMode?: () => void;
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
  onOpenPosMode,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = getTranslations(language);
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical' && a.status === 'active'
  ).length;

  return (
    <header className="sticky top-0 z-30 bg-[#0c1017]/90 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

        {/* ── Brand & Shop Title ────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Refined Brand Emblem */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600
              flex items-center justify-center shadow-sm text-slate-950">
              <span className="font-extrabold text-sm tracking-tight">GR</span>
            </div>
          </div>

          <div className="min-w-0">
            {/* Shop name & Verified Tag */}
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-100 leading-tight truncate max-w-[140px] sm:max-w-[280px]">
                {shopName || t.appName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide
                bg-slate-800/80 text-slate-300 border border-white/[0.06]">
                Kirana OS
              </span>
            </div>

            {/* Realtime Status Indicator */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {isRealtime && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span className={`relative rounded-full h-2 w-2 ${
                    isRealtime ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </span>
                <span className={`font-medium ${isRealtime ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isRealtime ? t.realtimeLive : t.offlineSync}
                </span>
              </span>
              <span className="text-slate-700">•</span>
              <span className="hidden xs:inline text-slate-500 font-medium">{t.location}</span>
            </div>
          </div>
        </div>

        {/* ── Action Controls ───────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Counter POS Mode Toggle */}
          {onOpenPosMode && (
            <button
              onClick={() => {
                soundFx.playTap();
                onOpenPosMode();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold active:scale-95 transition shadow-sm"
              title="Fast Counter POS Mode"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'दुकान मोड' : language === 'te' ? 'కౌంటర్ మోడ్' : 'Counter POS'}
              </span>
            </button>
          )}

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-slate-850 hover:bg-slate-800 border border-white/[0.08]
                hover:border-white/[0.15] text-xs font-semibold text-slate-300 hover:text-white
                active:scale-95 transition-all shadow-sm"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'हिन्दी' : language === 'te' ? 'తెలుగు' : 'English'}
              </span>
              <span className="sm:hidden uppercase font-mono text-[11px]">
                {language}
              </span>
            </button>

            {langMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-slate-900 rounded-xl shadow-xl
                  border border-white/[0.1] p-1 z-50 animate-fade-in-scale">
                  {[
                    { code: 'hi' as const, label: 'हिन्दी', native: 'Hindi' },
                    { code: 'te' as const, label: 'తెలుగు', native: 'Telugu' },
                    { code: 'en' as const, label: 'English', native: 'Global' },
                  ].map(({ code, label, native }) => (
                    <button
                      key={code}
                      onClick={() => { onLanguageChange(code); setLangMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                        transition-all flex items-center justify-between gap-2 ${
                        language === code
                          ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({native})</span>
                      </div>
                      {language === code && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Alerts Bell */}
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenAlerts();
            }}
            className={`relative p-2 rounded-lg border transition-all active:scale-95 ${
              criticalCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : activeAlertsCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-850 hover:bg-slate-800 border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200'
            }`}
            title="Stock Alerts"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1
                rounded-full text-[9px] font-bold flex items-center justify-center text-white
                ${criticalCount > 0 ? 'bg-rose-500' : 'bg-amber-500 text-slate-950 font-black'}`}>
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenSettings();
            }}
            className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800
              border border-white/[0.08] hover:border-white/[0.15]
              text-slate-400 hover:text-slate-200 transition-all active:scale-95"
            title="Database Configuration"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Auth */}
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenAuth();
            }}
            className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800
              border border-white/[0.08] hover:border-white/[0.15]
              text-slate-400 hover:text-emerald-400 transition-all active:scale-95"
            title="Shop Account"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
