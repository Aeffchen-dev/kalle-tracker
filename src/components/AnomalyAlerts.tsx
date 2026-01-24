import { memo, useState, useRef } from 'react';
import { Anomaly } from '@/lib/anomalyDetection';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const getEmoji = (type: Anomaly['type']): string => {
  switch (type) {
    case 'weight_deviation':
      return '🏋️';
    case 'ph_deviation':
      return '🧪';
    case 'missed_break':
    case 'upcoming_break':
      return '🐕';
    case 'pattern_change':
      return '📊';
    default:
      return '💡';
  }
};

const AnomalyAlerts = memo(({ anomalies, onDismiss, compact = false }: AnomalyAlertsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef<boolean>(false);

  if (anomalies.length === 0) return null;

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Long press handlers
  const handleLongPressStart = (id: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (activeId === id) {
        setActiveId(null);
      } else {
        setActiveId(id);
        triggerHaptic();
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLongPressMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (id: string) => {
    if (longPressTriggered.current) return;
    if (activeId === id) {
      setActiveId(null);
    }
  };

  if (compact) {
    const mostSevere = anomalies[0];
    return (
      <div className="bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-sm">{getEmoji(mostSevere.type)}</span>
        <span className="text-sm text-black truncate">
          {mostSevere.title}
        </span>
        {anomalies.length > 1 && (
          <span className="text-xs text-black/60 flex-shrink-0">
            +{anomalies.length - 1}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly) => {
        const isActive = activeId === anomaly.id;
        
        return (
          <div key={anomaly.id} className="relative flex w-full items-stretch overflow-hidden rounded-[16px]">
            <div
              className={`flex items-center gap-3 p-3 bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-[16px] cursor-pointer select-none transition-[margin] duration-150 ease-linear min-w-0 flex-1 ${isActive ? 'mr-[90px]' : 'mr-0'}`}
              onClick={() => handleItemClick(anomaly.id)}
              onTouchStart={() => handleLongPressStart(anomaly.id)}
              onTouchMove={handleLongPressMove}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(anomaly.id)}
              onMouseMove={handleLongPressMove}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              <span className="text-[20px]">{getEmoji(anomaly.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] text-black">
                    {anomaly.title}
                  </span>
                  <span className="text-[11px] text-black/50 flex-shrink-0">
                    {format(anomaly.timestamp, 'd. MMM', { locale: de })}
                  </span>
                </div>
                <p className="text-[14px] text-black/70">
                  {anomaly.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDismiss?.(anomaly.id)}
              className={`absolute right-0 top-0 h-full w-[82px] bg-red-500 flex items-center justify-center text-[14px] text-white rounded-[16px] transition-transform duration-150 ease-linear ${isActive ? 'translate-x-0' : 'translate-x-full'}`}
            >
              Löschen
            </button>
          </div>
        );
      })}
    </div>
  );
});

AnomalyAlerts.displayName = 'AnomalyAlerts';

export default AnomalyAlerts;
