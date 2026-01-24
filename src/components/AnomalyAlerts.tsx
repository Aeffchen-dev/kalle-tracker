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
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const swipeDecided = useRef(false);

  if (anomalies.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setSwipingId(id);
    isHorizontalSwipe.current = false;
    swipeDecided.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = startXRef.current - currentX;
    const diffY = Math.abs(currentY - startYRef.current);
    
    // Decide direction once
    if (!swipeDecided.current && (Math.abs(diffX) > 10 || diffY > 10)) {
      swipeDecided.current = true;
      isHorizontalSwipe.current = Math.abs(diffX) > diffY;
    }
    
    if (isHorizontalSwipe.current && diffX > 0) {
      setSwipeOffset(Math.min(diffX, 90));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 82 && swipingId && onDismiss) {
      onDismiss(swipingId);
    }
    setSwipingId(null);
    setSwipeOffset(0);
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
        const isActive = swipingId === anomaly.id;
        const currentOffset = isActive ? swipeOffset : 0;
        
        return (
          <div 
            key={anomaly.id} 
            className="relative flex w-full items-stretch overflow-hidden rounded-[16px]"
            onTouchStart={(e) => handleTouchStart(e, anomaly.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-[16px] select-none min-w-0 flex-1"
              style={{ 
                transition: isActive ? 'none' : 'flex 150ms ease-linear'
              }}
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
              className="flex-shrink-0 h-full bg-red-500 flex items-center justify-center text-[14px] text-white rounded-r-[16px] overflow-hidden"
              style={{
                width: currentOffset > 0 ? `${currentOffset}px` : 0,
                minWidth: currentOffset > 0 ? `${currentOffset}px` : 0,
                transition: isActive ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear'
              }}
            >
              <span className="whitespace-nowrap">Löschen</span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

AnomalyAlerts.displayName = 'AnomalyAlerts';

export default AnomalyAlerts;
