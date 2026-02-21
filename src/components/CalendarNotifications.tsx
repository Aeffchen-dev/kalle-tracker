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
      // In debug mode, show all events; otherwise filter to today
      const todayEvents = DEBUG_SHOW_ALL
        ? allEvents.filter((e, i, arr) => arr.findIndex(x => x.summary === e.summary) === i)
        : getICalEventsForDate(allEvents, today);
      setEvents(todayEvents);

      // Load dismissed medical events from localStorage
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

  // Filter: skip "hat Kalle" ownership events, skip dismissed medical
  const visibleEvents = events.filter(evt => {
    if (/hat\s+Kalle/i.test(evt.summary)) return false;
    if (isMedicalEvent(evt.summary) && dismissed.has(evt.uid)) return false;
    if (exiting.has(evt.uid)) return true; // keep during exit animation
    return true;
  });

  if (visibleEvents.length === 0) return null;

  const handleCheck = (evt: ICalEvent) => {
    if (checking.has(evt.uid)) return;
    setChecking(prev => new Set([...prev, evt.uid]));

    // After fill animation (400ms), start exit
    setTimeout(() => {
      setExiting(prev => new Set([...prev, evt.uid]));
      // After exit animation (400ms), dismiss
      setTimeout(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        localStorage.setItem(getDismissKey(evt.uid, todayStr), '1');
        setDismissed(prev => new Set([...prev, evt.uid]));
        setChecking(prev => { const n = new Set(prev); n.delete(evt.uid); return n; });
        setExiting(prev => { const n = new Set(prev); n.delete(evt.uid); return n; });
      }, 400);
    }, 600);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {visibleEvents.map(evt => {
        const medical = isMedicalEvent(evt.summary);
        const isChecked = checking.has(evt.uid);
        const isExitingEvt = exiting.has(evt.uid);

        return (
          <div
            key={`${evt.uid}-${evt.dtstart}`}
            className={`w-full bg-white/20 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 px-4 py-3 flex items-center justify-between transition-all duration-400 ${isExitingEvt ? 'opacity-0 scale-95' : 'animate-fade-in-up opacity-100'}`}
            style={{ animationFillMode: 'backwards' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-black truncate">{evt.summary}</p>
              {!medical && evt.dtstart && (
                <p className="text-[12px] text-black/50">
                  {(() => {
                    const d = new Date(evt.dtstart);
                    const h = d.getHours();
                    const m = d.getMinutes();
                    if (h === 0 && m === 0) return 'Ganztägig';
                    return `${h}:${m.toString().padStart(2, '0')} Uhr`;
                  })()}
                </p>
              )}
            </div>
            {medical && (
              <button
                onClick={() => handleCheck(evt)}
                className="relative w-[28px] h-[28px] rounded-full shrink-0 ml-3 flex items-center justify-center transition-all duration-300"
                style={{
                  border: '2px solid black',
                  backgroundColor: isChecked ? 'black' : 'transparent',
                }}
              >
                <Check
                  className="w-[14px] h-[14px] transition-all duration-300"
                  style={{
                    color: 'white',
                    opacity: isChecked ? 1 : 0,
                    transform: isChecked ? 'scale(1)' : 'scale(0.3)',
                  }}
                  strokeWidth={3}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CalendarNotifications;
