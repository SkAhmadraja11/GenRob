import React from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  Volume2, 
  RotateCcw, 
  Package,
  Check
} from 'lucide-react';
import { Alert, resolveAlert } from '../../lib/api';
import { ttsEngine } from '../../lib/speech/tts';
import { getTranslations } from '../../lib/i18n';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  language: 'hi' | 'te' | 'en';
  onAlertResolved: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  language,
  onAlertResolved,
}) => {
  if (!isOpen) return null;

  const t = getTranslations(language);
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId);
    onAlertResolved();
  };

  const handleReadAlerts = () => {
    if (activeAlerts.length === 0) return;
    const msg = language === 'hi'
      ? `दुकान में ${activeAlerts.length} सामान की कमी है। ${activeAlerts.map((a) => a.product_name).join(', ')} का ऑर्डर तुरंत लगाएं।`
      : language === 'te'
      ? `దుకాణంలో ${activeAlerts.length} వస్తువుల స్టాక్ తక్కువగా ఉంది. ${activeAlerts.map((a) => a.product_name).join(', ')} వెంటనే ఆర్డర్ చేయండి.`
      : `The store has ${activeAlerts.length} items running low on stock. Please reorder ${activeAlerts.map((a) => a.product_name).join(', ')} immediately.`;
    ttsEngine.speak(msg, language);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-[#0f172a] border-l border-white/[0.08]
        p-6 flex flex-col justify-between shadow-2xl overflow-y-auto animate-slide-in-right">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-white/[0.06]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{t.alertsDrawerTitle}</h3>
                <span className="text-[11px] text-slate-400">Automated inventory triggers</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Spoken Alert Button */}
          {activeAlerts.length > 0 && (
            <button
              onClick={handleReadAlerts}
              className="w-full mb-4 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-xs border border-white/[0.08] flex items-center justify-center gap-2 transition"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>{t.spokenAlertsBtn}</span>
            </button>
          )}

          {/* List of Active Alerts */}
          <div className="space-y-2.5">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-90" />
                <p className="font-bold text-white text-sm">{t.allClearTitle}</p>
                <p className="mt-1 text-slate-400">{t.allClearMsg}</p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      isCritical
                        ? 'bg-rose-950/15 border-rose-500/30'
                        : 'bg-slate-900/60 border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-xs text-white leading-snug">{alert.product_name}</h4>
                      </div>
                      <span className={`text-[9px] font-medium px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                      }`}>
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug mb-3 pl-6">{alert.message}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] pl-6">
                      <span className="text-slate-500 font-mono">
                        {new Date(alert.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700
                          text-slate-200 font-medium border border-white/[0.08]
                          transition active:scale-95 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{t.resolveAlertBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.06] text-center text-[11px] text-slate-500 font-mono">
          Live sync: <span className="text-slate-400">realtime.alerts</span>
        </div>
      </div>
    </div>
  );
};
