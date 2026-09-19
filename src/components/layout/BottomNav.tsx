import React from 'react';
import { 
  Package, 
  BookOpen, 
  Mic, 
  FileText, 
  TrendingUp, 
  Radio 
} from 'lucide-react';

export type NavTab = 'inventory' | 'khata' | 'challan' | 'analytics' | 'briefing';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoiceMic: () => void;
  language: 'hi' | 'te' | 'en';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenVoiceMic,
  language,
}) => {
  const labels = {
    inventory: language === 'hi' ? 'स्टॉक' : language === 'te' ? 'స్టాక్' : 'Stock',
    khata: language === 'hi' ? 'खाता' : language === 'te' ? 'ఖాతా' : 'Khata',
    voice: language === 'hi' ? 'बोलें' : language === 'te' ? 'మాట్లాడండి' : 'Speak',
    challan: language === 'hi' ? 'चालान' : language === 'te' ? 'చలాన్' : 'Challan',
    analytics: language === 'hi' ? 'पूर्वानुमान' : language === 'te' ? 'విశ్లేషణ' : 'Insights',
    briefing: language === 'hi' ? 'बुलेटिन' : language === 'te' ? 'సారాంశం' : 'Briefing',
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-amber-500/20 px-2 py-2 sm:py-3 shadow-2xl">
      <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between relative">
        {/* 1. Inventory Tab */}
        <button
          onClick={() => onSelectTab('inventory')}
          className={`flex-1 flex flex-col items-center gap-1 transition ${currentTab === 'inventory' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Package className={`w-5 h-5 ${currentTab === 'inventory' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-medium">{labels.inventory}</span>
        </button>

        {/* 2. Khata Tab */}
        <button
          onClick={() => onSelectTab('khata')}
          className={`flex-1 flex flex-col items-center gap-1 transition ${currentTab === 'khata' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <BookOpen className={`w-5 h-5 ${currentTab === 'khata' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-medium">{labels.khata}</span>
        </button>

        {/* Central Floating Voice Entry Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenVoiceMic}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/50 border-4 border-slate-950 hover:scale-105 active:scale-95 transition-all glow-amber"
            title="Voice Stock Entry"
          >
            <Mic className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* 3. Challan OCR Tab */}
        <button
          onClick={() => onSelectTab('challan')}
          className={`flex-1 flex flex-col items-center gap-1 transition ${currentTab === 'challan' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className={`w-5 h-5 ${currentTab === 'challan' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-medium">{labels.challan}</span>
        </button>

        {/* 4. Analytics Tab */}
        <button
          onClick={() => onSelectTab('analytics')}
          className={`flex-1 flex flex-col items-center gap-1 transition ${currentTab === 'analytics' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <TrendingUp className={`w-5 h-5 ${currentTab === 'analytics' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-medium">{labels.analytics}</span>
        </button>

        {/* 5. Daily Voice Briefing Tab */}
        <button
          onClick={() => onSelectTab('briefing')}
          className={`flex-1 flex flex-col items-center gap-1 transition ${currentTab === 'briefing' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Radio className={`w-5 h-5 ${currentTab === 'briefing' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-medium">{labels.briefing}</span>
        </button>
      </div>
    </nav>
  );
};
