import React, { useState, useEffect } from 'react';
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

const getDismissKey = (uid: string, date: string) => `${DISMISSED_KEY}${uid}_${date}`;

const CalendarNotifications: React.FC = () => {
  const [events, setEvents] = useState<ICalEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());

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
        if (isMedicalEvent(evt.summary)) {
          const key = getDismissKey(evt.uid, todayStr);
          if (localStorage.getItem(key)) {
            dismissedSet.add(evt.uid);
          }
        }
      });
      setDismissed(dismissedSet);
    };
    load();
  }, []);

  const visibleEvents = events.filter(evt => {
    if (/hat\s+Kalle/i.test(evt.summary)) return false;
    if (isMedicalEvent(evt.summary) && dismissed.has(evt.uid)) return false;
    return true;
  });

  if (visibleEvents.length === 0) return null;

  const handleCheck = (evt: ICalEvent) => {
    if (checking.has(evt.uid)) return;
    setChecking(prev => new Set([...prev, evt.uid]));

    // After check animation, start exit
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

        return (
          <div
            key={`${evt.uid}-${evt.dtstart}`}
            className={`relative flex w-full items-stretch overflow-hidden rounded-[16px] transition-all duration-500 ${isExitingEvt ? 'opacity-0 scale-95 max-h-0' : 'opacity-100 max-h-[200px] animate-fade-in-up'}`}
            style={{ animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-[8px] border border-[#FFFEF5]/40 rounded-[16px] select-none min-w-0 flex-1">
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
                  <span className="text-[11px] text-black/50 flex-shrink-0">
                    Heute
                  </span>
                </div>
                <p className="text-[14px] text-black/70 truncate">
                  {getTimeLabel(evt)}
                </p>
              </div>

              {/* Medical: checkmark button */}
              {medical && (
                <button
                  onClick={() => handleCheck(evt)}
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
          </div>
        );
      })}
    </div>
  );
};

export default CalendarNotifications;
