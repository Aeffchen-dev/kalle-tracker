import { memo } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Anomaly } from '@/lib/anomalyDetection';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const severityConfig = {
  alert: {
    icon: AlertTriangle,
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    iconColor: 'text-red-400',
    textColor: 'text-red-100'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-100'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-100'
  }
};

const AnomalyAlerts = memo(({ anomalies, onDismiss, compact = false }: AnomalyAlertsProps) => {
  if (anomalies.length === 0) return null;

  if (compact) {
    // Show only the most severe alert in compact mode
    const mostSevere = anomalies[0];
    const config = severityConfig[mostSevere.severity];
    const Icon = config.icon;

    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-xl px-3 py-2 flex items-center gap-2`}>
        <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
        <span className={`text-sm ${config.textColor} truncate`}>
          {mostSevere.title}
        </span>
        {anomalies.length > 1 && (
          <span className="text-xs text-white/60 flex-shrink-0">
            +{anomalies.length - 1}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly) => {
        const config = severityConfig[anomaly.severity];
        const Icon = config.icon;

        return (
          <div
            key={anomaly.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-xl p-3 backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`font-medium ${config.textColor}`}>
                    {anomaly.title}
                  </h4>
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(anomaly.id)}
                      className="text-white/40 hover:text-white/60 p-1 -m-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-white/70 mt-0.5">
                  {anomaly.description}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {format(anomaly.timestamp, 'd. MMM, HH:mm', { locale: de })} Uhr
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

AnomalyAlerts.displayName = 'AnomalyAlerts';

export default AnomalyAlerts;
