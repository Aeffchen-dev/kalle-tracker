import { memo, useState, useRef } from 'react';
import { Anomaly } from '@/lib/anomalyDetection';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  onDismiss?: (id: string) => void;
  onGassiSettingsTap?: () => void;
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

const AnomalyAlerts = memo(({ anomalies, onDismiss, onGassiSettingsTap, compact = false }: AnomalyAlertsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
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
    
    if (isHorizontalSwipe.current) {
      // Calculate offset based on current state
      const isCurrentlyOpen = activeId === swipingId;
      let newOffset;
      
      if (isCurrentlyOpen) {
        // If open, start from 82 and allow closing (swipe right = negative diff)
        newOffset = Math.max(0, Math.min(82 - (-diffX), 90));
      } else {
        // If closed, start from 0 and allow opening (swipe left = positive diff)
        newOffset = Math.max(0, Math.min(diffX, 90));
      }
      
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!swipingId) return;
    
    // If swiped enough to open, lock it open
    if (swipeOffset >= 50) {
      setActiveId(swipingId);
    } else {
      // Close it
      setActiveId(null);
    }
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleCardClick = (id: string, type: Anomaly['type']) => {
    // If it's a gassi alert, open settings
    if (type === 'upcoming_break' && onGassiSettingsTap) {
      onGassiSettingsTap();
      return;
    }
    // If delete is shown, clicking card closes it
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
        const isSwiping = swipingId === anomaly.id;
        const isOpen = activeId === anomaly.id;
        const showDelete = isSwiping ? swipeOffset : (isOpen ? 82 : 0);
        
        return (
          <div 
            key={anomaly.id} 
            className="relative flex w-full items-stretch overflow-hidden rounded-[16px] gap-1"
            onTouchStart={(e) => handleTouchStart(e, anomaly.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-[16px] select-none min-w-0 flex-1 cursor-pointer"
              onClick={() => handleCardClick(anomaly.id, anomaly.type)}
              style={{ 
                transition: isSwiping ? 'none' : 'all 150ms ease-linear'
              }}
            >
              <span className="text-[20px]">{getEmoji(anomaly.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] text-black truncate">
                    {anomaly.title}
                  </span>
                  <span className="text-[11px] text-black/50 flex-shrink-0">
                    {format(anomaly.timestamp, 'd. MMM', { locale: de })}
                  </span>
                </div>
                <p className="text-[14px] text-black/70 truncate">
                  {anomaly.highlightText ? (
                    <>
                      {anomaly.description.split(anomaly.highlightText)[0]}
                      <span className="text-black/70">{anomaly.highlightText}</span>
                      {anomaly.description.split(anomaly.highlightText)[1]}
                    </>
                  ) : (
                    anomaly.description
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss?.(anomaly.id); }}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex-shrink-0 bg-red-500 flex items-center justify-center text-[14px] text-white rounded-[16px] overflow-hidden self-stretch"
              style={{
                width: showDelete > 0 ? `${showDelete}px` : 0,
                minWidth: showDelete > 0 ? `${showDelete}px` : 0,
                transition: isSwiping ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear'
              }}
            >
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

AnomalyAlerts.displayName = 'AnomalyAlerts';

export default AnomalyAlerts;
