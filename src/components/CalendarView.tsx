import { useState, useRef, TouchEvent, useEffect, useMemo, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, deleteEvent, Event, getPendingCount, saveEvent } from '@/lib/events';
import { format, subDays, addDays, isSameDay, startOfDay, differenceInYears, parse } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { ArrowLeft, ArrowRight, TrendingUp, CalendarIcon, CloudOff, Watch, LayoutGrid, Check } from 'lucide-react';
import TrendAnalysis, { isWeightOutOfBounds } from './TrendAnalysis';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getSettings } from '@/lib/settings';
import { fetchICalEvents, getICalEventsForDate, getKalleOwnerForDate, ICalEvent } from '@/lib/ical';

type SnapPoint = number | string;

const MEDICAL_ICAL_DISMISSED_KEY = 'kalle_medical_ical_dismissed_';

interface CalendarViewProps {
  eventSheetOpen?: boolean;
  initialShowTrends?: boolean;
  initialScrollToChart?: 'weight' | 'ph' | null;
}

/* ── DayPanel: renders entries for a single day ─────────── */

interface DayPanelProps {
  date: Date;
  events: Event[];
  icalEvents: ICalEvent[];
  kalleOwner: { person: string; endDate: Date } | null;
  birthday: Date | null;
  predictionSlots: { avgHour: number; hasPoop: boolean; hasPipi: boolean }[];
  activeEventId: string | null;
  onItemClick: (eventId: string) => void;
  onContextMenu: (e: React.MouseEvent, eventId: string) => void;
  onLongPressStart: (eventId: string) => void;
  onLongPressMove: () => void;
  onLongPressEnd: () => void;
  onDelete: (eventId: string) => void;
  onEventSaved?: () => void;
  onNavigateToToday?: () => void;
}

const DayPanel = ({ date, events: dayEvents, icalEvents: dayIcalEvents, kalleOwner, birthday, predictionSlots, activeEventId, onItemClick, onContextMenu, onLongPressStart, onLongPressMove, onLongPressEnd, onDelete, onEventSaved, onNavigateToToday }: DayPanelProps) => {
  const [checkingIcal, setCheckingIcal] = useState<Set<string>>(new Set());
  const [completedIcal, setCompletedIcal] = useState<Map<string, string>>(new Map());
  const [exitingIcal, setExitingIcal] = useState<Set<string>>(new Set());
  const isBirthdayToday = birthday
    ? date.getDate() === birthday.getDate() && date.getMonth() === birthday.getMonth()
    : false;
  const birthdayAge = birthday && isBirthdayToday ? differenceInYears(date, birthday) : 0;
  
  // Filter out dismissed medical iCal events
  const displayIcalEvents = dayIcalEvents.filter(evt => {
    if (/hat\s+Kalle/i.test(evt.summary || '')) return false;
    const dismissKey = `${MEDICAL_ICAL_DISMISSED_KEY}${evt.uid}_${evt.dtstart}`;
    if (localStorage.getItem(dismissKey)) return false;
    return true;
  });

  if (dayEvents.length === 0 && !isBirthdayToday && displayIcalEvents.length === 0 && predictionSlots.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-center text-[16px] text-white/60">Keine Einträge</p>
      </div>
    );
  }

  // Build unified entry list
  type GroupedEntry = { events: Event[]; timeKey: string; sortTime: number; kind: 'app' };
  type ICalEntry = { icalEvt: ICalEvent; timeKey: string; sortTime: number; kind: 'ical' };
  type PredEntry = { avgHour: number; hasPoop: boolean; hasPipi: boolean; timeKey: string; sortTime: number; kind: 'prediction' };
  type UnifiedEntry = GroupedEntry | ICalEntry | PredEntry;
  const entries: UnifiedEntry[] = [];

  for (const evt of displayIcalEvents) {
    const time = new Date(evt.dtstart);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    entries.push({ icalEvt: evt, timeKey: timeStr, sortTime: time.getTime(), kind: 'ical' });
  }

  for (const slot of predictionSlots) {
    const hours = Math.floor(slot.avgHour);
    const mins = Math.round((slot.avgHour % 1) * 60);
    const timeStr = `${hours}:${mins.toString().padStart(2, '0')}`;
    const d = new Date();
    d.setHours(hours, mins, 0, 0);
    entries.push({ avgHour: slot.avgHour, hasPoop: slot.hasPoop, hasPipi: slot.hasPipi, timeKey: timeStr, sortTime: d.getTime(), kind: 'prediction' });
  }

  const usedIndices = new Set<number>();
  for (let i = 0; i < dayEvents.length; i++) {
    if (usedIndices.has(i)) continue;
    const ev = dayEvents[i];
    const evTime = format(new Date(ev.time), 'HH:mm');
    if (ev.type === 'pipi' || ev.type === 'stuhlgang') {
      const group = [ev];
      for (let j = i + 1; j < dayEvents.length; j++) {
        if (usedIndices.has(j)) continue;
        const ev2 = dayEvents[j];
        if ((ev2.type === 'pipi' || ev2.type === 'stuhlgang') && format(new Date(ev2.time), 'HH:mm') === evTime) {
          group.push(ev2);
          usedIndices.add(j);
        }
      }
      usedIndices.add(i);
      entries.push({ events: group, timeKey: evTime, sortTime: new Date(ev.time).getTime(), kind: 'app' });
    } else {
      usedIndices.add(i);
      entries.push({ events: [ev], timeKey: evTime, sortTime: new Date(ev.time).getTime(), kind: 'app' });
    }
  }

  entries.sort((a, b) => b.sortTime - a.sortTime);

  return (
    <div className="space-y-4 pb-20">
      {isBirthdayToday && birthdayAge > 0 && (
        <div className="flex items-center justify-between p-3 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <span className="text-[16px] text-white flex items-center gap-2">
            <span>🎉</span>
            <span>{birthdayAge}. Geburtstag</span>
          </span>
        </div>
      )}
      {entries.map((entry, gi) => {
        if (entry.kind === 'ical') {
          const summary = entry.icalEvt.summary || '';
          const isMedicalIcal = ['wurmkur', 'parasiten', 'krallen'].some(kw => summary.toLowerCase().includes(kw));
          const medicalEmoji = summary.toLowerCase().includes('wurmkur') ? '🪱' : summary.toLowerCase().includes('parasiten') ? '🦟' : '💅';
          
          if (isMedicalIcal) {
            const icalKey = `${entry.icalEvt.uid}-${entry.icalEvt.dtstart}`;
            const isChecking = checkingIcal.has(icalKey);
            const isExiting = exitingIcal.has(icalKey);
            const today = new Date();
            const isOnDifferentDay = !isSameDay(date, today);
            
            const handleIcalMedicalCheck = () => {
              if (isChecking || isExiting) return;
              setCheckingIcal(prev => new Set([...prev, icalKey]));
              const eventType = summary.toLowerCase().includes('wurmkur') ? 'wurmkur' as const
                : summary.toLowerCase().includes('krallen') ? 'krallen' as const
                : 'parasiten' as const;
              saveEvent(eventType).then(() => {
                // Persist dismissal so it's hidden from the original planned date
                const dismissKey = `${MEDICAL_ICAL_DISMISSED_KEY}${entry.icalEvt.uid}_${entry.icalEvt.dtstart}`;
                localStorage.setItem(dismissKey, new Date().toISOString());
                
                setTimeout(() => {
                  setCheckingIcal(prev => { const n = new Set(prev); n.delete(icalKey); return n; });
                  // Slide out animation then navigate to today
                  setExitingIcal(prev => new Set([...prev, icalKey]));
                  onEventSaved?.();
                  setTimeout(() => {
                    setExitingIcal(prev => { const n = new Set(prev); n.delete(icalKey); return n; });
                    if (isOnDifferentDay) {
                      onNavigateToToday?.();
                    }
                  }, 500);
                }, 600);
              });
            };
            
            return (
              <div
                key={`ical-${gi}`}
                className={`flex items-center gap-3 px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer select-none transition-all duration-500 ${isExiting ? 'opacity-0 scale-95 max-h-0 py-0 overflow-hidden' : 'opacity-100 max-h-[200px]'}`}
                onClick={handleIcalMedicalCheck}
              >
                <span className="text-[20px] shrink-0">{medicalEmoji}</span>
                <span className="text-[14px] text-white truncate flex-1 min-w-0">
                  {summary.replace(/[\s\u{FE0F}\u{200D}\u{20E3}\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]+$/gu, '').trim()}
                </span>
                <div
                  className="w-[28px] h-[28px] rounded-full shrink-0 flex items-center justify-center overflow-hidden"
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.6)',
                    backgroundColor: isChecking ? 'white' : 'transparent',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <Check
                    className="w-[14px] h-[14px]"
                    style={{
                      color: 'black',
                      opacity: isChecking ? 1 : 0,
                      transform: isChecking ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-45deg)',
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    strokeWidth={3}
                  />
                </div>
              </div>
            );
          }
          
          return (
            <div key={`ical-${gi}`} className="flex items-center justify-between px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              <span className="text-[14px] text-white flex items-center gap-2 overflow-hidden">
                <span className="text-[20px] shrink-0">🗓️</span>
                <span className="truncate">{summary}</span>
              </span>
              <span className="text-[14px] text-white/60 whitespace-nowrap shrink-0 ml-2">{entry.timeKey} Uhr</span>
            </div>
          );
        }
        if (entry.kind === 'prediction') {
          return (
            <div key={`pred-${gi}`} className="flex items-center justify-between px-3 py-3.5 rounded-lg opacity-60">
              <span className="text-[14px] text-white flex items-center gap-1.5">
                <span className="text-[20px] shrink-0">{entry.hasPipi && entry.hasPoop ? '💦💩' : entry.hasPoop ? '💩' : '💦'}</span>
                <span>{entry.hasPipi && entry.hasPoop ? 'Pipi & Stuhlgang' : entry.hasPoop ? 'Stuhlgang' : 'Pipi'}</span>
              </span>
              <span className="text-[14px] text-white/60 whitespace-nowrap shrink-0 ml-2">{entry.timeKey} Uhr</span>
            </div>
          );
        }
        const group = entry as GroupedEntry;
        const isPipiGroup = group.events.every(e => e.type === 'pipi' || e.type === 'stuhlgang');
        const firstEvent = group.events[0];
        if (isPipiGroup && group.events.length > 0) {
          const isActive = group.events.some(e => activeEventId === e.id);
          return (
            <div key={`group-${gi}`} className="relative flex w-full items-stretch overflow-hidden">
              <div
                className={`flex items-center justify-between px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer select-none transition-[margin] duration-150 ease-linear min-w-0 flex-1 ${isActive ? 'mr-[90px]' : 'mr-0'}`}
                onClick={() => onItemClick(firstEvent.id)}
                onContextMenu={(e) => onContextMenu(e, firstEvent.id)}
                onTouchStart={() => onLongPressStart(firstEvent.id)}
                onTouchMove={onLongPressMove}
                onTouchEnd={onLongPressEnd}
                onMouseDown={() => onLongPressStart(firstEvent.id)}
                onMouseMove={onLongPressMove}
                onMouseUp={onLongPressEnd}
                onMouseLeave={onLongPressEnd}
              >
                <div className="flex items-center justify-between w-full overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    {group.events.length === 2 && group.events.some(e => e.type === 'pipi') && group.events.some(e => e.type === 'stuhlgang') ? (
                      <>
                        <span className="text-[20px] shrink-0">💦💩</span>
                        <span className="text-[14px] text-white truncate">Pipi & Stuhlgang</span>
                      </>
                    ) : group.events.map((ev, ei) => (
                      <span key={ei} className="flex items-center gap-1.5">
                        <span className="text-[20px] shrink-0">{ev.type === 'pipi' ? '💦' : '💩'}</span>
                        <span className="text-[14px] text-white truncate">{ev.type === 'pipi' ? 'Pipi' : 'Stuhlgang'}</span>
                      </span>
                    ))}
                  </div>
                  <span className="text-[14px] text-white/60 whitespace-nowrap shrink-0 ml-2 flex items-center gap-1.5">
                    {firstEvent.logged_by === 'Watch' && <Watch size={14} className="text-white/60" />}
                    {firstEvent.logged_by === 'Widget' && <LayoutGrid size={14} className="text-white/60" />}
                    {group.timeKey} Uhr
                  </span>
                </div>
              </div>
              <button
                onClick={() => { group.events.forEach(e => onDelete(e.id)); }}
                className={`absolute right-0 top-0 h-full w-[82px] bg-red-500 flex items-center justify-center text-[12px] text-white rounded-lg transition-transform duration-150 ease-linear ${isActive ? 'translate-x-0' : 'translate-x-full'}`}
              >
                Löschen
              </button>
            </div>
          );
        }
        const event = firstEvent;
        const isMedical = ['wurmkur', 'parasiten', 'krallen'].includes(event.type);
        
        if (isMedical) {
          const isActive = activeEventId === event.id;
          // Notification-style: emoji + text + filled checkmark + swipe to delete (undo)
          return (
            <div key={event.id} className="relative flex w-full items-stretch overflow-hidden">
              <div
                className={`flex items-center gap-3 px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer select-none transition-[margin] duration-150 ease-linear min-w-0 flex-1 ${isActive ? 'mr-[90px]' : 'mr-0'}`}
                onClick={() => onItemClick(event.id)}
                onTouchStart={() => onLongPressStart(event.id)}
                onTouchMove={onLongPressMove}
                onTouchEnd={onLongPressEnd}
                onMouseDown={() => onLongPressStart(event.id)}
                onMouseMove={onLongPressMove}
                onMouseUp={onLongPressEnd}
                onMouseLeave={onLongPressEnd}
              >
                <span className="text-[20px] shrink-0">{event.type === 'wurmkur' ? '🪱' : event.type === 'parasiten' ? '🦟' : '💅'}</span>
                <span className="text-[14px] text-white truncate flex-1 min-w-0">
                  {event.type === 'wurmkur' && 'Wurmkur'}
                  {event.type === 'parasiten' && 'Parasiten Tablette'}
                  {event.type === 'krallen' && 'Krallen schneiden'}
                </span>
                <span className="text-[14px] text-white/60 whitespace-nowrap shrink-0">
                  {format(new Date(event.time), 'HH:mm')} Uhr
                </span>
              </div>
              <button
                onClick={() => onDelete(event.id)}
                className={`absolute right-0 top-0 h-full w-[82px] bg-red-500 flex items-center justify-center text-[12px] text-white rounded-lg transition-transform duration-150 ease-linear ${isActive ? 'translate-x-0' : 'translate-x-full'}`}
              >
                Rückgängig
              </button>
            </div>
          );
        }

        const isActive = activeEventId === event.id;
        return (
          <div key={event.id} className="relative flex w-full items-stretch overflow-hidden">
            <div
              className={`flex items-center justify-between px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer select-none transition-[margin] duration-150 ease-linear min-w-0 flex-1 ${isActive ? 'mr-[90px]' : 'mr-0'}`}
              onClick={() => onItemClick(event.id)}
              onContextMenu={(e) => onContextMenu(e, event.id)}
              onTouchStart={() => onLongPressStart(event.id)}
              onTouchMove={onLongPressMove}
              onTouchEnd={onLongPressEnd}
              onMouseDown={() => onLongPressStart(event.id)}
              onMouseMove={onLongPressMove}
              onMouseUp={onLongPressEnd}
              onMouseLeave={onLongPressEnd}
            >
              <span className="text-[14px] text-white whitespace-nowrap flex items-center gap-2 overflow-hidden">
                <span className="text-[20px] shrink-0">{event.type === 'phwert' ? '🧪' : '🏋️'}</span>
                <span className="truncate">
                  {event.type === 'gewicht' && (
                    <>Gewicht: <span className={event.weight_value && isWeightOutOfBounds(Number(event.weight_value), new Date(event.time)) ? 'text-[#FF0000]' : 'text-[#5AD940]'}>{event.weight_value ? `${String(event.weight_value).replace('.', ',')} kg` : '-'}</span></>
                  )}
                  {event.type === 'phwert' && (
                    <>pH-Wert: <span className={['5,6', '5,9', '6,2', '7,4', '7,7', '8,0'].includes(event.ph_value || '') ? 'text-[#FF0000]' : 'text-[#5AD940]'}>{event.ph_value || '-'}</span></>
                  )}
                </span>
              </span>
              <span className="text-[14px] text-white whitespace-nowrap shrink-0 ml-2 flex items-center gap-1.5">
                {event.logged_by === 'Watch' && <Watch size={14} className="text-white/60" />}
                {event.logged_by === 'Widget' && <LayoutGrid size={14} className="text-white/60" />}
                {format(new Date(event.time), 'HH:mm')} Uhr
              </span>
            </div>
            <button
              onClick={() => onDelete(event.id)}
              className={`absolute right-0 top-0 h-full w-[82px] bg-red-500 flex items-center justify-center text-[12px] text-white rounded-lg transition-transform duration-150 ease-linear ${isActive ? 'translate-x-0' : 'translate-x-full'}`}
            >
              Löschen
            </button>
          </div>
        );
      })}
      {kalleOwner && (dayEvents.length > 0 || dayIcalEvents.length > 0) && (
        <div className="flex items-center justify-between px-3 py-3.5 bg-white/[0.08] backdrop-blur-[12px] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <span className="text-[14px] text-white flex items-center gap-2">
            <span className="text-[20px] shrink-0">🐶</span>
            <span>{kalleOwner.person} hat Kalle</span>
          </span>
          <span className="text-[14px] text-white/60 whitespace-nowrap shrink-0 ml-2">
            bis {format(kalleOwner.endDate, 'd. MMM', { locale: de })}
          </span>
        </div>
      )}
    </div>
  );
};

const CalendarView = ({ eventSheetOpen = false, initialShowTrends = false, initialScrollToChart = null }: CalendarViewProps) => {
  const isStandalonePwa = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  }, []);
  const collapsedSnapPoint = isStandalonePwa ? 0.3 : 0.25;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapPoint | null>(initialShowTrends ? 0.9 : collapsedSnapPoint);
  const [showTrends, setShowTrends] = useState(initialShowTrends);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [transitionActive, setTransitionActive] = useState(false);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [isContentScrollable, setIsContentScrollable] = useState(false);
  const [icalEvents, setIcalEvents] = useState<ICalEvent[]>([]);
  const { toast } = useToast();
  
  const toggleSnapPoint = () => {
    setSnap(snap === collapsedSnapPoint ? 0.9 : collapsedSnapPoint);
  };
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Day swipe refs
  const daySwipeStartX = useRef<number>(0);
  const daySwipeEndX = useRef<number>(0);
  const daySwipeStartY = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);
  const swipeDecided = useRef<boolean>(false);
  
  // Long press refs
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  
  // Double tap refs
  const lastTapTime = useRef<number>(0);
  const lastTapId = useRef<string | null>(null);

  const loadEvents = async () => {
    const result = await getEvents();
    setEvents(result.events);
    setIsOffline(result.fromLocal);
    setPendingCount(result.pendingCount);
    
    if (result.fromLocal) {
      toast({
        title: "Offline-Modus",
        description: "Backend nicht erreichbar. Zeige lokale Daten.",
        variant: "destructive",
      });
    } else if (result.syncedCount > 0) {
      toast({
        title: "Synchronisiert",
        description: `${result.syncedCount} Event(s) erfolgreich synchronisiert.`,
      });
    }
  };

  useEffect(() => {
    loadEvents();
    setSelectedDate(new Date());
    // Load birthday from settings
    getSettings().then((settings) => {
      if (settings.birthday) {
        setBirthday(parse(settings.birthday, 'yyyy-MM-dd', new Date()));
      }
    });
    // Load iCal events
    fetchICalEvents().then(setIcalEvents).catch(console.error);
  }, []);

  // Scroll to top when switching views
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [showTrends]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (eventId: string) => {
    // Find the event to check if it's medical — if so, clear the localStorage dismissal
    const evt = events.find(e => e.id === eventId);
    if (evt && ['wurmkur', 'parasiten', 'krallen'].includes(evt.type)) {
      // Clear any matching localStorage dismissal keys so the iCal event reappears
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(MEDICAL_ICAL_DISMISSED_KEY)) {
          localStorage.removeItem(key);
        }
      }
    }
    await deleteEvent(eventId);
    await loadEvents();
    setActiveEventId(null);
  };

  const handleNavigateToToday = () => {
    setSelectedDate(new Date());
  };

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short 10ms vibration
    }
  };

  // Long press handlers
  const handleLongPressStart = (eventId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      // Toggle: if already showing delete, hide it; otherwise show it
      if (activeEventId === eventId) {
        setActiveEventId(null);
      } else {
        setActiveEventId(eventId);
        triggerHaptic();
      }
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLongPressMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Day swipe handlers (for the content area)
  const handleDaySwipeStart = (e: TouchEvent) => {
    daySwipeStartX.current = e.touches[0].clientX;
    daySwipeStartY.current = e.touches[0].clientY;
    daySwipeEndX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = false;
    swipeDecided.current = false;
    setSwipeOffset(0);
  };

  const handleDaySwipeMove = (e: TouchEvent) => {
    daySwipeEndX.current = e.touches[0].clientX;
    const diffX = daySwipeEndX.current - daySwipeStartX.current;
    const diffY = Math.abs(e.touches[0].clientY - daySwipeStartY.current);
    
    // Decide direction once
    if (!swipeDecided.current && (Math.abs(diffX) > 10 || diffY > 10)) {
      swipeDecided.current = true;
      isHorizontalSwipe.current = Math.abs(diffX) > diffY * 1.5;
    }
    
    // Update visual offset for horizontal swipes  
    if (isHorizontalSwipe.current) {
      // Map finger movement to -1..1 progress (full swipe = screen width)
      const containerWidth = scrollContainerRef.current?.clientWidth || window.innerWidth;
      const progress = Math.max(-1, Math.min(1, diffX / containerWidth));
      setSwipeOffset(progress);
    }
    
    // Cancel long press on any movement
    handleLongPressMove();
  };

  const handleDaySwipeEnd = () => {
    const diff = daySwipeStartX.current - daySwipeEndX.current;
    const minSwipeDistance = 50;
    
    if (isHorizontalSwipe.current && Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && canGoNext) {
        // Swipe left → next day: animate progress to -1
        setTransitionActive(true);
        setSwipeOffset(-1);
        setTimeout(() => {
          setSelectedDate(addDays(selectedDate, 1));
          setSwipeOffset(0);
          setTransitionActive(false);
        }, 300);
      } else if (diff < 0 && canGoPrev) {
        // Swipe right → prev day: animate progress to 1
        setTransitionActive(true);
        setSwipeOffset(1);
        setTimeout(() => {
          setSelectedDate(subDays(selectedDate, 1));
          setSwipeOffset(0);
          setTransitionActive(false);
        }, 300);
      } else {
        setTransitionActive(true);
        setSwipeOffset(0);
        setTimeout(() => setTransitionActive(false), 300);
      }
    } else {
      setTransitionActive(true);
      setSwipeOffset(0);
      setTimeout(() => setTransitionActive(false), 300);
    }
    
    daySwipeStartX.current = 0;
    daySwipeEndX.current = 0;
  };

  const handleItemClick = (eventId: string) => {
    // If long press was triggered, don't toggle on click
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    
    // Toggle delete on single click
    setActiveEventId(activeEventId === eventId ? null : eventId);
  };

  const handleContextMenu = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    // Toggle delete on right-click
    setActiveEventId(activeEventId === eventId ? null : eventId);
  };
  
  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => isSameDay(new Date(event.time), date))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [events]);

  const getIcalEventsForDate = useCallback((date: Date) => {
    return getICalEventsForDate(icalEvents, date)
      .sort((a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime());
  }, [icalEvents]);

  const getKalleOwnerForDateCb = useCallback((date: Date) => {
    return getKalleOwnerForDate(icalEvents, date);
  }, [icalEvents]);

  const filteredEvents = getEventsForDate(selectedDate);

  const filteredIcalEvents = useMemo(() => {
    return getIcalEventsForDate(selectedDate);
  }, [getIcalEventsForDate, selectedDate]);

  const kalleOwner = useMemo(() => {
    return getKalleOwnerForDateCb(selectedDate);
  }, [getKalleOwnerForDateCb, selectedDate]);

  // Adjacent dates for carousel
  const prevDate = subDays(selectedDate, 1);
  const nextDate = addDays(selectedDate, 1);

  // Compute average walk predictions per day-of-week (same logic as Wochenplan)
  const avgGassiByDay = useMemo(() => {
    const now = new Date();
    const weekdayCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const weekendCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const byDate = new Map<string, { hour: number; isPoop: boolean }[]>();
    for (const event of events) {
      if (event.type !== 'pipi' && event.type !== 'stuhlgang') continue;
      const d = new Date(event.time);
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const cutoff = isWeekend ? weekendCutoff : weekdayCutoff;
      if (d < cutoff) continue;
      const dateKey = d.toISOString().slice(0, 10);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({ hour: d.getHours() + d.getMinutes() / 60, isPoop: event.type === 'stuhlgang' });
    }
    
    type ClusterInfo = { avgHour: number; hasPoop: boolean };
    const weekdayClusters: ClusterInfo[] = [];
    const weekendClusters: ClusterInfo[] = [];
    
    for (const [dateKey, evts] of byDate) {
      const d = new Date(dateKey + 'T12:00:00');
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const sorted = evts.sort((a, b) => a.hour - b.hour);
      
      const dayClusters: { hours: number[]; hasPoop: boolean }[] = [];
      for (const evt of sorted) {
        const last = dayClusters[dayClusters.length - 1];
        if (last && evt.hour - last.hours[last.hours.length - 1] <= 4) {
          last.hours.push(evt.hour);
          if (evt.isPoop) last.hasPoop = true;
        } else {
          dayClusters.push({ hours: [evt.hour], hasPoop: evt.isPoop });
        }
      }
      
      for (const c of dayClusters) {
        const avgH = c.hours.reduce((a, b) => a + b, 0) / c.hours.length;
        (isWeekend ? weekendClusters : weekdayClusters).push({ avgHour: avgH, hasPoop: c.hasPoop });
      }
    }
    
    const mergeIntoBuckets = (clusters: ClusterInfo[]) => {
      const sorted = clusters.sort((a, b) => a.avgHour - b.avgHour);
      const buckets: { hours: number[]; poopCount: number; totalCount: number }[] = [];
      for (const c of sorted) {
        const last = buckets[buckets.length - 1];
        const lastAvg = last ? last.hours.reduce((a, b) => a + b, 0) / last.hours.length : -99;
        if (last && Math.abs(c.avgHour - lastAvg) <= 4) {
          last.hours.push(c.avgHour);
          last.totalCount++;
          if (c.hasPoop) last.poopCount++;
        } else {
          buckets.push({ hours: [c.avgHour], poopCount: c.hasPoop ? 1 : 0, totalCount: 1 });
        }
      }
      const pipiHours: number[] = [];
      const poopFlags: boolean[] = [];
      for (const b of buckets) {
        const avg = b.hours.reduce((a, v) => a + v, 0) / b.hours.length;
        pipiHours.push(avg);
        poopFlags.push(b.poopCount / b.totalCount >= 0.4);
      }
      return { pipiHours, poopFlags };
    };
    
    const weekdayData = mergeIntoBuckets(weekdayClusters);
    const weekendData = mergeIntoBuckets(weekendClusters);
    
    const dayMap = new Map<number, { pipiHours: number[]; poopFlags: boolean[] }>();
    for (let i = 0; i < 7; i++) {
      const isWeekend = i >= 5;
      dayMap.set(i, isWeekend ? weekendData : weekdayData);
    }
    return dayMap;
  }, [events]);

  // Build prediction slots for today
  const predictionSlots = useMemo(() => {
    const isToday = isSameDay(selectedDate, new Date());
    if (!isToday) return [];
    
    const jsDay = selectedDate.getDay();
    const monBasedDay = (jsDay + 6) % 7;
    const data = avgGassiByDay.get(monBasedDay);
    if (!data) return [];
    
    // Build estimate slots
    type PredSlot = { avgHour: number; hasPoop: boolean; hasPipi: boolean };
    const estimates: PredSlot[] = data.pipiHours.map((h, i) => ({
      avgHour: h, hasPoop: data.poopFlags[i], hasPipi: true,
    }));
    
    // Get real pipi/stuhlgang events for today
    const realHours = filteredEvents
      .filter(e => e.type === 'pipi' || e.type === 'stuhlgang')
      .map(e => {
        const d = new Date(e.time);
        return d.getHours() + d.getMinutes() / 60;
      });
    
    const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
    const usedEstimates = new Set<number>();
    
    // Match estimates to real events within ±2h
    for (let ei = 0; ei < estimates.length; ei++) {
      for (const rh of realHours) {
        if (Math.abs(rh - estimates[ei].avgHour) <= 2) {
          usedEstimates.add(ei);
          break;
        }
      }
    }
    
    // Keep only future unmatched estimates
    return estimates
      .filter((_, i) => !usedEstimates.has(i))
      .filter(e => e.avgHour > currentHour);
  }, [selectedDate, avgGassiByDay, filteredEvents]);

  // Check if content is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        setIsContentScrollable(scrollHeight > clientHeight);
      }
    };
    
    checkScrollable();
    
    // Re-check when snap changes or events change
    const resizeObserver = new ResizeObserver(checkScrollable);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [snap, filteredEvents.length, showTrends]);


  const today = new Date();
  const hundredDaysAgo = subDays(today, 100);
  const hundredDaysFromNow = addDays(today, 100);
  
  const canGoNext = addDays(selectedDate, 1) <= hundredDaysFromNow;
  const canGoPrev = subDays(selectedDate, 1) >= hundredDaysAgo;

  // Calculate which days have entries for the calendar
  const daysWithEntries = useMemo(() => {
    return events.map(event => startOfDay(new Date(event.time)));
  }, [events]);

  const [calendarOpen, setCalendarOpen] = useState(false);

  const changeDate = (direction: 'left' | 'right') => {
    if (direction === 'left' && !canGoNext) return;
    if (direction === 'right' && !canGoPrev) return;
    
    setTransitionActive(true);
    setSwipeOffset(direction === 'left' ? -1 : 1);
    setTimeout(() => {
      if (direction === 'left') {
        setSelectedDate(addDays(selectedDate, 1));
      } else {
        setSelectedDate(subDays(selectedDate, 1));
      }
      setSwipeOffset(0);
      setTransitionActive(false);
    }, 300);
  };

  // Handle clicks outside the drawer to snap to default
  const handleOutsideClick = () => {
    if (snap === 0.9) {
      setSnap(collapsedSnapPoint);
    }
  };

  return (
    <>
      {/* Invisible overlay to catch clicks outside drawer when expanded */}
      {snap === 0.9 && !eventSheetOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleOutsideClick}
        />
      )}
      <Drawer 
        variant="full"
        open={true} 
        dismissible={false}
        modal={false}
        snapPoints={[collapsedSnapPoint, 0.9]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
      <DrawerContent variant="full">
        <DrawerHeader 
          className="sticky top-0 z-10 pb-6 pt-6 cursor-pointer" 
          onClick={toggleSnapPoint}
        >
          <div className="flex items-center justify-between">
            {showTrends ? (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTrends(false); }} 
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <ArrowLeft size={24} className="text-white" />
                </button>
                <DrawerTitle className="text-center text-[16px] text-white leading-6">
                  Trend-Analyse
                </DrawerTitle>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTrends(false); }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <TrendingUp size={20} className="text-[#5AD940]" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 w-[56px]">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {canGoPrev ? (
                      <button onClick={(e) => { e.stopPropagation(); changeDate('right'); }} className="flex items-center justify-center">
                        <ArrowLeft size={24} className="text-white" />
                      </button>
                    ) : (
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                            <CalendarIcon size={20} className="text-white" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black border-white/30" align="start" onClick={(e) => e.stopPropagation()}>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                setCalendarOpen(false);
                              }
                            }}
                            disabled={(date) => date > today}
                            modifiers={{ hasEntry: daysWithEntries }}
                            modifiersClassNames={{ 
                              hasEntry: 'has-entry'
                            }}
                            className="pointer-events-auto bg-black text-white [&_.has-entry]:after:content-[''] [&_.has-entry]:after:absolute [&_.has-entry]:after:bottom-1 [&_.has-entry]:after:left-1/2 [&_.has-entry]:after:-translate-x-1/2 [&_.has-entry]:after:w-1 [&_.has-entry]:after:h-1 [&_.has-entry]:after:bg-[#5AD940] [&_.has-entry]:after:rounded-full [&_.has-entry]:relative [&_button]:text-white [&_.rdp-head_cell]:text-white/60 [&_.rdp-caption]:text-white [&_.rdp-nav_button]:text-white [&_.rdp-nav_button]:hover:bg-white/20 [&_.rdp-day_selected]:bg-[#5AD940] [&_.rdp-day_selected]:text-black"
                            locale={de}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                <DrawerTitle className="text-center text-[16px] text-white leading-6 flex-1">
                  {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                </DrawerTitle>
                <div className="flex items-center gap-2 w-[56px] justify-end">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {canGoNext && (
                      <button onClick={(e) => { e.stopPropagation(); changeDate('left'); }} className="flex items-center justify-center">
                        <ArrowRight size={24} className="text-white" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowTrends(true); setSnap(0.9); }} 
                    className="w-6 h-6 flex items-center justify-center"
                  >
                    <TrendingUp size={20} className="text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        </DrawerHeader>
        <div 
          ref={scrollContainerRef} 
          className="px-4 overflow-y-auto overflow-x-hidden flex-1"
          style={{ 
            minHeight: 0, 
            flexGrow: 1, 
            flexShrink: 1, 
            flexBasis: '100%',
            touchAction: snap === 0.9 && isContentScrollable ? 'pan-y' : 'none'
          }}
          {...(snap === 0.9 && isContentScrollable ? { 'data-vaul-no-drag': true } : {})}
          onTouchStart={(e) => !showTrends && handleDaySwipeStart(e)}
          onTouchMove={(e) => !showTrends && handleDaySwipeMove(e)}
          onTouchEnd={() => !showTrends && handleDaySwipeEnd()}
        >
          {showTrends ? (
            <div data-vaul-no-drag>
              <TrendAnalysis events={events} scrollToChart={initialScrollToChart} />
            </div>
          ) : (() => {
            // swipeOffset: -1 (swiping left/next) to 1 (swiping right/prev), 0 = idle
            const p = swipeOffset; // progress: -1 (left/next) to 1 (right/prev)
            const absP = Math.abs(p);
            
            // Both panels travel the same distance at the same speed
            // Active: 0% → ±100% (exits viewport), no fade
            const activeTranslateX = p * 100;
            const activeScale = 1 - absP * 0.15; // 1 → 0.85
            const activeRotate = p < 0 ? -absP * 3 : absP * 3; // 0 → ±3deg outward
            
            // Incoming: ∓100% → 0% (enters from opposite edge)
            const incomingTranslateX = p < 0 ? (1 - absP) * 100 : -(1 - absP) * 100;
            const incomingScale = 0.85 + absP * 0.15; // 0.85 → 1
            const incomingRotate = p < 0 ? (1 - absP) * 3 : -(1 - absP) * 3; // ±3deg → 0
            
            const transStyle = transitionActive ? 'transform 300ms cubic-bezier(0.42, 0, 0.58, 1)' : 'none';
            
            const incomingDate = p < 0 ? nextDate : prevDate;
            const showIncoming = absP > 0.01;
            
            return (
              <div className="relative min-h-full overflow-hidden">
                {/* Incoming panel */}
                {showIncoming && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      transform: `translateX(${incomingTranslateX}%) scale(${incomingScale}) rotate(${incomingRotate}deg)`,
                      transition: transStyle,
                      transformOrigin: p < 0 ? 'right center' : 'left center',
                    }}
                  >
                    <DayPanel
                      date={incomingDate}
                      events={getEventsForDate(incomingDate)}
                      icalEvents={getIcalEventsForDate(incomingDate)}
                      kalleOwner={getKalleOwnerForDateCb(incomingDate)}
                      birthday={birthday}
                      predictionSlots={[]}
                      activeEventId={null}
                      onItemClick={() => {}}
                      onContextMenu={() => {}}
                      onLongPressStart={() => {}}
                      onLongPressMove={() => {}}
                      onLongPressEnd={() => {}}
                      onDelete={() => {}}
                      onEventSaved={loadEvents}
                      onNavigateToToday={handleNavigateToToday}
                    />
                  </div>
                )}
                {/* Active (current) panel – no opacity fade, just exits viewport */}
                <div 
                  style={{
                    transform: `translateX(${activeTranslateX}%) scale(${activeScale}) rotate(${activeRotate}deg)`,
                    transition: transStyle,
                    transformOrigin: p < 0 ? 'left center' : 'right center',
                  }}
                >
                  <DayPanel
                    date={selectedDate}
                    events={filteredEvents}
                    icalEvents={filteredIcalEvents}
                    kalleOwner={kalleOwner}
                    birthday={birthday}
                    predictionSlots={predictionSlots}
                    activeEventId={activeEventId}
                    onItemClick={handleItemClick}
                    onContextMenu={handleContextMenu}
                    onLongPressStart={handleLongPressStart}
                    onLongPressMove={handleLongPressMove}
                    onLongPressEnd={handleLongPressEnd}
                    onDelete={handleDelete}
                    onEventSaved={loadEvents}
                    onNavigateToToday={handleNavigateToToday}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
};

export default CalendarView;