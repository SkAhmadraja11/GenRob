import React from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  RotateCcw, 
  Package 
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full glass-panel border-l border-amber-500/30 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{t.alertsDrawerTitle}</h3>
                <span className="text-xs text-slate-400">Postgres Trigger Populated</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Spoken Alert Button */}
          {activeAlerts.length > 0 && (
            <button
              onClick={handleReadAlerts}
              className="w-full mb-4 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-2 transition"
            >
              <Volume2 className="w-4 h-4" />
              <span>{t.spokenAlertsBtn}</span>
            </button>
          )}

          {/* List of Active Alerts */}
          <div className="space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-white text-sm">{t.allClearTitle}</p>
                <p className="mt-1">{t.allClearMsg}</p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border ${
                      isCritical
                        ? 'bg-rose-950/30 border-rose-500/50'
                        : 'bg-amber-950/20 border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCritical ? 'bg-rose-400 animate-ping' : 'bg-amber-400'
                          }`}
                        />
                        <h4 className="font-bold text-xs text-white">{alert.product_name}</h4>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-snug mb-3">{alert.message}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                      <span className="text-slate-500 font-mono">
                        {new Date(alert.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold transition"
                      >
                        {t.resolveAlertBtn}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
          Supabase Realtime Channel: <span className="text-amber-400">supabase_realtime.alerts</span>
        </div>
      </div>
    </div>
  );
};
