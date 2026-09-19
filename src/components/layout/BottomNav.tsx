import React from 'react';
import {
  Package,
  BookOpen,
  Mic,
  FileText,
  TrendingUp,
  Radio,
} from 'lucide-react';

export type NavTab = 'inventory' | 'khata' | 'challan' | 'analytics' | 'briefing';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoiceMic: () => void;
  language: 'hi' | 'te' | 'en';
}

const TAB_CONFIG: { id: NavTab; Icon: React.FC<any>; labelHi: string; labelTe: string; labelEn: string }[] = [
  { id: 'inventory', Icon: Package,    labelHi: 'स्टॉक',          labelTe: 'స్టాక్',     labelEn: 'Stock' },
  { id: 'khata',     Icon: BookOpen,   labelHi: 'खाता',           labelTe: 'ఖాతా',       labelEn: 'Khata' },
  { id: 'challan',   Icon: FileText,   labelHi: 'चालान',          labelTe: 'చలాన్',      labelEn: 'Challan' },
  { id: 'analytics', Icon: TrendingUp, labelHi: 'पूर्वानुमान',     labelTe: 'విశ్లేషణ',   labelEn: 'Insights' },
  { id: 'briefing',  Icon: Radio,      labelHi: 'बुलेटिन',        labelTe: 'సారాంశం',    labelEn: 'Briefing' },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenVoiceMic,
  language,
}) => {
  const getLabel = (tab: typeof TAB_CONFIG[0]) =>
    language === 'hi' ? tab.labelHi : language === 'te' ? tab.labelTe : tab.labelEn;

  const voiceLabel = language === 'hi' ? 'बोलें' : language === 'te' ? 'మాట్లాడండి' : 'Voice';

  // Split tabs around the center mic button
  const leftTabs  = TAB_CONFIG.slice(0, 2);
  const rightTabs = TAB_CONFIG.slice(2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0c1017]/95 backdrop-blur-lg border-t border-white/[0.08] shadow-2xl">
      <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between px-3 py-1.5 relative">

        {/* ── Left tabs ─────────────────────────────── */}
        {leftTabs.map(({ id, Icon, ...rest }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 relative
                transition-all duration-150 active:scale-95 rounded-lg ${
                isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.7]'}`} />
              <span className="text-[11px] leading-none">
                {getLabel({ id, Icon, ...rest })}
              </span>
            </button>
          );
        })}

        {/* ── Center Voice Action Button ──────────────── */}
        <div className="flex-1 flex flex-col items-center -mt-5 gap-0.5">
          <button
            onClick={onOpenVoiceMic}
            className="relative w-14 h-14 rounded-2xl
              bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600
              flex items-center justify-center text-slate-950
              shadow-lg shadow-amber-500/25
              border-2 border-[#0c1017]
              hover:scale-105 active:scale-95
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            title="Voice Stock Entry"
          >
            <Mic className="w-6 h-6 stroke-[2.4]" />
          </button>
          <span className="text-[10px] font-bold text-amber-400/90 tracking-wide">{voiceLabel}</span>
        </div>

        {/* ── Right tabs ────────────────────────────── */}
        {rightTabs.map(({ id, Icon, ...rest }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 relative
                transition-all duration-150 active:scale-95 rounded-lg ${
                isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.7]'}`} />
              <span className="text-[11px] leading-none">
                {getLabel({ id, Icon, ...rest })}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
