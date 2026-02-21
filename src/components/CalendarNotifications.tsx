import React, { useState, useEffect, useRef } from 'react';
import { fetchICalEvents, getICalEventsForDate, ICalEvent } from '@/lib/ical';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

// DEBUG: Set to true to show ALL events regardless of date
const DEBUG_SHOW_ALL = true;
const DEBUG_TODAY: Date | null = new Date('2026-03-02T10:00:00');

const MEDICAL_KEYWORDS = ['Parasiten Tablette', 'Wurmkur'];

const isMedicalEvent = (summary: string): boolean =>
  MEDICAL_KEYWORDS.some(kw => summary.toLowerCase().includes(kw.toLowerCase()));

const getMedicalEmoji = (summary: string): string => {
  if (summary.toLowerCase().includes('wurmkur')) return '🪱';
  if (summary.toLowerCase().includes('parasiten')) return '🦟';
  return '💊';
};

const DISMISSED_KEY = 'kalle_dismissed_medical_';
const DISMISSED_CAL_KEY = 'kalle_dismissed_cal_';

const getDismissKey = (uid: string, date: string) => `${DISMISSED_KEY}${uid}_${date}`;
const getCalDismissKey = (uid: string, date: string) => `${DISMISSED_CAL_KEY}${uid}_${date}`;

interface CalendarNotificationsProps {
  onCalendarEventTap?: () => void;
}

const CalendarNotifications: React.FC<CalendarNotificationsProps> = ({ onCalendarEventTap }) => {
  const [events, setEvents] = useState<ICalEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  
  // Swipe state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const swipeDecided = useRef(false);

  useEffect(() => {
    const load = async () => {
      const allEvents = await fetchICalEvents();
      const today = DEBUG_TODAY || new Date();
      const todayEvents = DEBUG_SHOW_ALL
        ? allEvents.filter((e, i, arr) => arr.findIndex(x => x.summary === e.summary) === i)
        : getICalEventsForDate(allEvents, today);
      setEvents(todayEvents);

      const todayStr = format(today, 'yyyy-MM-dd');
      const dismissedSet = new Set<string>();
      todayEvents.forEach(evt => {
        const medKey = getDismissKey(evt.uid, todayStr);
        const calKey = getCalDismissKey(evt.uid, todayStr);
        if (localStorage.getItem(medKey) || localStorage.getItem(calKey)) {
          dismissedSet.add(evt.uid);
        }
      });
      setDismissed(dismissedSet);
    };
    load();
  }, []);

  const visibleEvents = events.filter(evt => {
    if (/hat\s+Kalle/i.test(evt.summary)) return false;
    if (dismissed.has(evt.uid)) return false;
    return true;
  });

  // Sort: medical first, then newest first
  visibleEvents.sort((a, b) => {
    const aMed = isMedicalEvent(a.summary) ? 0 : 1;
    const bMed = isMedicalEvent(b.summary) ? 0 : 1;
    if (aMed !== bMed) return aMed - bMed;
    return new Date(b.dtstart).getTime() - new Date(a.dtstart).getTime();
  });

  if (visibleEvents.length === 0) return null;

  const getEvtKey = (evt: ICalEvent) => `${evt.uid}-${evt.dtstart}`;

  const handleCheck = (evt: ICalEvent) => {
    if (checking.has(evt.uid)) return;
    setChecking(prev => new Set([...prev, evt.uid]));

    setTimeout(() => {
      setExiting(prev => new Set([...prev, evt.uid]));
      setTimeout(() => {
        const todayStr = format(DEBUG_TODAY || new Date(), 'yyyy-MM-dd');
        localStorage.setItem(getDismissKey(evt.uid, todayStr), '1');
        setDismissed(prev => new Set([...prev, evt.uid]));
        setChecking(prev => { const n = new Set(prev); n.delete(evt.uid); return n; });
        setExiting(prev => { const n = new Set(prev); n.delete(evt.uid); return n; });
      }, 600);
    }, 600);
  };

  const handleSwipeDelete = (evt: ICalEvent) => {
    setExiting(prev => new Set([...prev, evt.uid]));
    setActiveId(null);
    setTimeout(() => {
      const todayStr = format(DEBUG_TODAY || new Date(), 'yyyy-MM-dd');
      if (isMedicalEvent(evt.summary)) {
        localStorage.setItem(getDismissKey(evt.uid, todayStr), '1');
      } else {
        localStorage.setItem(getCalDismissKey(evt.uid, todayStr), '1');
      }
      setDismissed(prev => new Set([...prev, evt.uid]));
      setExiting(prev => { const n = new Set(prev); n.delete(evt.uid); return n; });
    }, 400);
  };

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

    if (!swipeDecided.current && (Math.abs(diffX) > 10 || diffY > 10)) {
      swipeDecided.current = true;
      isHorizontalSwipe.current = Math.abs(diffX) > diffY;
    }

    if (isHorizontalSwipe.current) {
      const isCurrentlyOpen = activeId === swipingId;
      let newOffset;
      if (isCurrentlyOpen) {
        newOffset = Math.max(0, Math.min(82 - (-diffX), 90));
      } else {
        newOffset = Math.max(0, Math.min(diffX, 90));
      }
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!swipingId) return;
    if (swipeOffset >= 50) {
      setActiveId(swipingId);
    } else {
      setActiveId(null);
    }
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleCardClick = (id: string, evt: ICalEvent) => {
    if (activeId === id) {
      setActiveId(null);
      return;
    }
    // Non-medical calendar events open Wochenplan
    if (!isMedicalEvent(evt.summary) && onCalendarEventTap) {
      onCalendarEventTap();
    }
  };

  const getTimeLabel = (evt: ICalEvent): string => {
    const d = new Date(evt.dtstart);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return 'Ganztägig';
    return `${h}:${m.toString().padStart(2, '0')} Uhr`;
  };

  return (
    <div className="w-full space-y-2">
      {visibleEvents.map(evt => {
        const medical = isMedicalEvent(evt.summary);
        const isChecked = checking.has(evt.uid);
        const isExitingEvt = exiting.has(evt.uid);
        const key = getEvtKey(evt);
        const isSwiping = swipingId === key;
        const isOpen = activeId === key;
        const showDelete = isSwiping ? swipeOffset : (isOpen ? 82 : 0);

        return (
          <div
            key={key}
            className={`relative flex w-full items-stretch overflow-hidden rounded-[16px] gap-1 transition-all duration-500 ${isExitingEvt ? 'opacity-0 scale-95 max-h-0' : 'opacity-100 max-h-[200px] animate-fade-in-up'}`}
            style={{ animationFillMode: 'backwards' }}
            onTouchStart={(e) => handleTouchStart(e, key)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-[16px] select-none min-w-0 flex-1 cursor-pointer"
              onClick={() => handleCardClick(key, evt)}
              style={{ transition: isSwiping ? 'none' : 'all 150ms ease-linear' }}
            >
              {/* Left emoji */}
              <span className="text-[20px] shrink-0">
                {medical ? getMedicalEmoji(evt.summary) : '📅'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] text-black truncate">
                    {evt.summary}
                  </span>
                  {!medical && (
                    <span className="text-[11px] text-black/50 flex-shrink-0">
                      Heute
                    </span>
                  )}
                </div>
                {!medical && (
                  <p className="text-[14px] text-black/70 truncate">
                    {getTimeLabel(evt)}
                  </p>
                )}
              </div>

              {/* Medical: checkmark button */}
              {medical && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCheck(evt); }}
                  className="relative w-[28px] h-[28px] rounded-full shrink-0 ml-1 flex items-center justify-center overflow-hidden"
                  style={{
                    border: '2px solid black',
                    backgroundColor: isChecked ? 'black' : 'transparent',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <Check
                    className="w-[14px] h-[14px]"
                    style={{
                      color: 'white',
                      opacity: isChecked ? 1 : 0,
                      transform: isChecked ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-45deg)',
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    strokeWidth={3}
                  />
                </button>
              )}
            </div>

            {/* Swipe delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSwipeDelete(evt); }}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex-shrink-0 bg-red-500 flex items-center justify-center text-[14px] text-white rounded-[16px] overflow-hidden self-stretch"
              style={{
                width: showDelete > 0 ? `${showDelete}px` : 0,
                minWidth: showDelete > 0 ? `${showDelete}px` : 0,
                transition: isSwiping ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear',
              }}
            >
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarNotifications;
