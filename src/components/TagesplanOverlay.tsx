import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Phone, MapPin, ExternalLink, Copy, Check } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInMonths, format, getDay, getHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { getCachedSettings } from '@/lib/settings';
import { getEvents, Event as AppEvent } from '@/lib/events';
import { fetchICalEvents, getICalEventsForWeek, getICalEventsForRange, getKalleOwnerForDate, ICalEvent } from '@/lib/ical';

interface Ingredient {
  quantity: string;
  name: string;
  description?: string;
  link?: string;
}

interface MealData {
  title: string;
  ingredients: Ingredient[];
}

const mealsData: MealData[] = [
  {
    title: 'Morgens, mittags und abends jeweils',
    ingredients: [
      { quantity: '103g', name: 'Royal Canine Urinary u/c', link: 'https://www.fressnapf.de/ul/p/royal-canin-veterinary-urinary-uc-14-kg-1155812/' },
      { quantity: '309g', name: 'Wasser' },
      { quantity: '25g', name: 'Vet-Concept Nudeln mit Gemüse', description: 'Mit heißem Wasser übergießen und 20 Minuten ziehen lassen\n\nkann ersetzt werden durch\n- 180g Nudeln, gekocht\n- 200g Gemüse, gekocht', link: 'https://www.vet-concept.com/p/fuer-den-hund-nudeln-mit-gemuese' },
      { quantity: '6,6g', name: 'Dicalciumphosphat', link: 'https://www.napfcheck-shop.de/produkt/dicalciumphosphat/' },
      { quantity: '3,3g', name: 'Calciumglukonat', link: 'https://www.napfcheck-shop.de/produkt/napfcheck-calciumgluconat-fuer-hunde-und-katzen/' },
      { quantity: '6,6g', name: 'Futteröl Junior', link: 'https://www.napfcheck-shop.de/produkt/napfcheck-futteroel-junior-fuer-hundewelpen-und-zuchthuendinnen/' },
    ],
  },
];

interface ScheduleCell {
  time: string;
  activity: string;
}

interface DaySchedule {
  day: string;
  type: string;
  slots: ScheduleCell[];
}

const weekSchedule: DaySchedule[] = [
  {
    day: 'Mo',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '19-21 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Di',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Mi',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Joggen + Essen' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Do',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Fr',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Sa',
    type: 'Aktion Tag',
    slots: [
      { time: '7-9 Uhr', activity: 'Joggen im Wald + Essen' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Hundeplatz oder Ausflug' },
      { time: '18-20 Uhr', activity: 'Hundeplatz' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'So',
    type: 'Chill Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
];

interface TagesplanOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TagesplanOverlay = ({ isOpen, onClose }: TagesplanOverlayProps) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'expanding' | 'visible' | 'dots-collapsing'>('idle');
  const [meals, setMeals] = useState<MealData[] | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[] | null>(null);
  const [editingCell, setEditingCell] = useState<{ dayIndex: number; slotIndex: number; field: 'time' | 'activity' } | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ mealIndex: number; ingredientIndex: number; field: 'quantity' | 'name' | 'description' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const isReceivingRealtimeUpdate = useRef(false);
  const [selectedPubertyPhase, setSelectedPubertyPhase] = useState<number | null>(null);
  const [icalEvents, setIcalEvents] = useState<ICalEvent[]>([]);
  const wochenplanScrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);
  const [appEvents, setAppEvents] = useState<AppEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // Load iCal events and app events
  useEffect(() => {
    fetchICalEvents().then(setIcalEvents).catch(console.error);
    getEvents().then(result => setAppEvents(result.events)).catch(console.error);
  }, []);

  // Compute average gassi times, grouped by weekday vs weekend
  // Use 14 days for weekdays, 60 days for weekends (less frequent data)
  const avgGassiByDay = useMemo(() => {
    const now = new Date();
    const weekdayCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const weekendCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const groups = { weekday: { pipiHours: [] as number[], stuhlgangHours: [] as number[] }, weekend: { pipiHours: [] as number[], stuhlgangHours: [] as number[] } };
    
    for (const event of appEvents) {
      if (event.type !== 'pipi' && event.type !== 'stuhlgang') continue;
      const d = new Date(event.time);
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const cutoff = isWeekend ? weekendCutoff : weekdayCutoff;
      if (d < cutoff) continue;
      const group = isWeekend ? groups.weekend : groups.weekday;
      const hour = d.getHours() + d.getMinutes() / 60;
      if (event.type === 'pipi') group.pipiHours.push(hour);
      else group.stuhlgangHours.push(hour);
    }
    
    const dayMap = new Map<number, { pipiHours: number[]; stuhlgangHours: number[] }>();
    for (let i = 0; i < 7; i++) {
      const isWeekend = i >= 5;
      dayMap.set(i, isWeekend ? groups.weekend : groups.weekday);
    }
    
    return dayMap;
  }, [appEvents]);

  // Total days to display
  const TOTAL_DAYS = 62;

  // Compute range start: today, shifted by weekOffset
  const rangeStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);

  // For backward compat keep weekStart for any other usage
  const weekStart = rangeStart;

  // Get iCal events for the range
  const weekIcalEvents = useMemo(() => {
    return getICalEventsForRange(icalEvents, rangeStart, TOTAL_DAYS);
  }, [icalEvents, rangeStart]);

  // Current day index within the range (-1 if today not in range)
  const currentDayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - rangeStart.getTime();
    const idx = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return idx >= 0 && idx < TOTAL_DAYS ? idx : -1;
  }, [rangeStart]);
  const currentHour = useMemo(() => new Date().getHours(), []);

  // Auto-scroll wochenplan to today column every time overlay becomes visible
  useEffect(() => {
    if (animationPhase !== 'visible' || !dataLoaded || currentDayIndex < 0) return;
    const attempts = [100, 300, 600];
    const timers = attempts.map(delay => setTimeout(() => {
      if (todayColRef.current && wochenplanScrollRef.current) {
        const container = wochenplanScrollRef.current;
        const col = todayColRef.current;
        container.scrollLeft = Math.max(0, col.offsetLeft);
      }
    }, delay));
    return () => timers.forEach(clearTimeout);
  }, [animationPhase, dataLoaded, currentDayIndex]);

  const copyAddress = async () => {
    const address = 'Uhlandstraße 151, 10719 Berlin';
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('tagesplan')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      
      if (data) {
        if (data.meals_data && Array.isArray(data.meals_data) && data.meals_data.length > 0) {
          setMeals(data.meals_data as unknown as MealData[]);
        } else {
          setMeals(mealsData);
        }
        if (data.schedule_data && Array.isArray(data.schedule_data) && data.schedule_data.length > 0) {
          setSchedule(data.schedule_data as unknown as DaySchedule[]);
        } else {
          setSchedule(weekSchedule);
        }
      } else {
        // No data in DB, use defaults
        setMeals(mealsData);
        setSchedule(weekSchedule);
      }
      setDataLoaded(true);
    };
    loadData();
  }, []);

  // Track if user is currently editing
  const isEditing = editingCell !== null || editingMeal !== null;

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('tagesplan-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tagesplan',
          filter: 'id=eq.default'
        },
        (payload) => {
          // Don't update while user is editing to prevent overwriting their input
          if (isEditing) return;
          
          // Mark that we're receiving a realtime update to prevent save loop
          isReceivingRealtimeUpdate.current = true;
          const newData = payload.new as { meals_data?: MealData[]; schedule_data?: DaySchedule[] };
          if (newData.meals_data) setMeals(newData.meals_data);
          if (newData.schedule_data) setSchedule(newData.schedule_data);
          // Reset the flag after state updates are processed
          setTimeout(() => {
            isReceivingRealtimeUpdate.current = false;
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEditing]);

  // Save to database only when user makes local changes
  useEffect(() => {
    if (!dataLoaded || meals === null || schedule === null || !hasLocalChanges) return;
    // Don't save if we're receiving a realtime update
    if (isReceivingRealtimeUpdate.current) return;
    
    const saveData = async () => {
      console.log('Saving tagesplan data...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tagesplan') as any).upsert({
        id: 'default',
        meals_data: meals,
        schedule_data: schedule,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) {
        console.error('Error saving tagesplan:', error);
      } else {
        console.log('Tagesplan saved successfully');
        setHasLocalChanges(false);
      }
    };
    
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [meals, schedule, dataLoaded, hasLocalChanges]);

  useEffect(() => {
    if (isOpen && animationPhase === 'idle') {
      setSelectedPubertyPhase(null);
      setAnimationPhase('expanding');
      // Recolor body after dots have mostly expanded
      setTimeout(() => {
        document.body.style.backgroundColor = '#3d2b1f';
      }, 900);
      // Reveal content 200ms later
      setTimeout(() => {
        setAnimationPhase('visible');
      }, 1100);
    }
  }, [isOpen, animationPhase]);

  // Reset when fully closed
  useEffect(() => {
    if (animationPhase === 'idle' && !isOpen) {
      document.body.style.backgroundColor = '';
    }
  }, [animationPhase, isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingMeal && editingMeal.field !== 'description' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingMeal && editingMeal.field === 'description' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingCell, editingMeal]);

  const handleMealClick = (mealIndex: number, ingredientIndex: number, field: 'quantity' | 'name' | 'description') => {
    setEditingMeal({ mealIndex, ingredientIndex, field });
  };

  const handleMealChange = (value: string) => {
    if (!editingMeal) return;
    const { mealIndex, ingredientIndex, field } = editingMeal;
    setHasLocalChanges(true);
    setMeals(prev => {
      if (!prev) return prev;
      const newMeals = [...prev];
      newMeals[mealIndex] = {
        ...newMeals[mealIndex],
        ingredients: newMeals[mealIndex].ingredients.map((ing, i) =>
          i === ingredientIndex ? { ...ing, [field]: value } : ing
        ),
      };
      return newMeals;
    });
  };

  const handleMealBlur = () => {
    setEditingMeal(null);
  };

  const handleMealKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingMeal(null);
    }
    if (e.key === 'Enter' && editingMeal?.field !== 'description') {
      setEditingMeal(null);
    }
  };

  const handleCellClick = (dayIndex: number, slotIndex: number, field: 'time' | 'activity') => {
    setEditingCell({ dayIndex, slotIndex, field });
  };

  const handleCellChange = (value: string) => {
    if (!editingCell) return;
    const { dayIndex, slotIndex, field } = editingCell;
    setHasLocalChanges(true);
    setSchedule(prev => {
      if (!prev) return prev;
      const newSchedule = [...prev];
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        slots: newSchedule[dayIndex].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      };
      return newSchedule;
    });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };


  const handleClose = () => {
    // Start animation immediately
    setAnimationPhase('dots-collapsing');
    document.body.style.backgroundColor = '';
    
    // Close modal after brief delay so animation starts
    requestAnimationFrame(() => {
      onClose();
    });
    
    // Hide SVG after animation completes
    setTimeout(() => {
      setAnimationPhase('idle');
    }, 300);
  };

  if (animationPhase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Animated spots using SVG with SMIL animation for sharp scaling */}
      <div key={animationPhase} className="absolute inset-0 pointer-events-auto overflow-hidden">
        {[
          { left: 5, top: 8, w: 4.8, h: 5.6, rotate: 12, seed: 0 },
          { left: 70, top: 8, w: 6.4, h: 4.8, rotate: -6, seed: 1 },
          { left: 35, top: 18, w: 5.6, h: 6.4, rotate: 45, seed: 2 },
          { left: 82, top: 28, w: 5.2, h: 6, rotate: -12, seed: 3 },
          { left: 8, top: 42, w: 6, h: 4.8, rotate: 30, seed: 4 },
          { left: 65, top: 52, w: 4.8, h: 5.6, rotate: -20, seed: 5 },
          { left: 20, top: 68, w: 6.4, h: 5.2, rotate: 15, seed: 6 },
          { left: 75, top: 78, w: 5.2, h: 6.4, rotate: -35, seed: 7 },
          { left: 45, top: 85, w: 5.6, h: 4.8, rotate: 25, seed: 8 },
          { left: 18, top: 12, w: 4, h: 4.4, rotate: -15, seed: 9 },
          { left: 48, top: 6, w: 4.4, h: 3.6, rotate: 20, seed: 10 },
          { left: 88, top: 22, w: 3.6, h: 4.4, rotate: -8, seed: 11 },
          { left: 55, top: 35, w: 4, h: 3.6, rotate: 35, seed: 12 },
          { left: 30, top: 48, w: 4.4, h: 4, rotate: -25, seed: 13 },
          { left: 92, top: 58, w: 3.6, h: 4, rotate: 10, seed: 14 },
          { left: 50, top: 72, w: 4, h: 4.4, rotate: -40, seed: 15 },
          { left: 10, top: 82, w: 4.4, h: 3.6, rotate: 5, seed: 16 },
          { left: 85, top: 95, w: 3.6, h: 4, rotate: -18, seed: 17 },
          { left: 28, top: 2, w: 2.8, h: 3.2, rotate: 8, seed: 18 },
          { left: 60, top: 15, w: 3.2, h: 2.8, rotate: -12, seed: 19 },
          { left: 3, top: 25, w: 2.8, h: 2.8, rotate: 22, seed: 20 },
          { left: 42, top: 38, w: 3.2, h: 3.2, rotate: -5, seed: 21 },
          { left: 78, top: 45, w: 2.8, h: 3.2, rotate: 15, seed: 22 },
          { left: 38, top: 62, w: 3.2, h: 2.8, rotate: -28, seed: 23 },
          { left: 62, top: 75, w: 2.8, h: 2.8, rotate: 32, seed: 24 },
          { left: 28, top: 85, w: 3.2, h: 3.2, rotate: -10, seed: 25 },
          { left: 68, top: 92, w: 2.8, h: 3.2, rotate: 18, seed: 26 },
          { left: 92, top: 10, w: 1.6, h: 2, rotate: 0, seed: 27 },
          { left: 25, top: 32, w: 2, h: 1.6, rotate: 0, seed: 28 },
          { left: 15, top: 55, w: 1.6, h: 1.6, rotate: 0, seed: 29 },
          { left: 88, top: 65, w: 2, h: 2, rotate: 0, seed: 30 },
          { left: 58, top: 80, w: 1.6, h: 2, rotate: 0, seed: 31 },
        ].map((spot) => {
          // Blob paths centered at origin (0,0)
          const blobPaths = [
            'M0,-45 C25,-45 45,-30 45,-5 C45,20 30,45 0,45 C-30,45 -45,25 -45,0 C-45,-25 -25,-45 0,-45 Z',
            'M0,-42 C30,-42 42,-25 42,0 C42,25 25,42 0,42 C-25,42 -42,20 -42,-5 C-42,-30 -30,-42 0,-42 Z',
            'M-5,-45 C20,-45 45,-25 45,0 C45,30 20,45 -5,45 C-35,45 -45,20 -45,-5 C-45,-35 -30,-45 -5,-45 Z',
            'M5,-42 C35,-42 42,-20 42,5 C42,30 25,42 0,42 C-30,42 -42,15 -42,-10 C-42,-35 -20,-42 5,-42 Z',
          ];
          
          const startScale = animationPhase === 'dots-collapsing' ? 40 : 1;
          const endScale = animationPhase === 'dots-collapsing' ? 1 : 40;
          
          return (
            <svg
              key={spot.seed}
              style={{
                position: 'absolute',
                left: `calc(${spot.left}% + ${spot.w / 2}vw + 4px)`,
                top: `calc(${spot.top}% + ${spot.h / 2}vw + 4px)`,
                width: `${spot.w}vw`,
                height: `${spot.h}vw`,
                overflow: 'visible',
                transform: 'translate(-50%, -50%)',
              }}
              viewBox="-50 -50 100 100"
            >
              <g transform={`rotate(${spot.rotate})`}>
                <path d={blobPaths[spot.seed % 4]} fill="#5c4033">
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    from={`${startScale} ${startScale}`}
                    to={`${endScale} ${endScale}`}
                    dur={animationPhase === 'dots-collapsing' ? '0.32s' : '1.4s'}
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines={animationPhase === 'dots-collapsing' ? "0 0 0.2 1" : "0.8 0 1 1"}
                  />
                </path>
              </g>
            </svg>
          );
        })}
      </div>

      {/* Solid brown background - hide instantly on close */}
      {animationPhase === 'visible' && (
        <div className="absolute inset-0 bg-spot pointer-events-auto" />
      )}

      {/* Content - only render when visible */}
      {animationPhase === 'visible' && (
        <div className="absolute inset-0 flex flex-col pointer-events-auto">
          {/* Header */}
          <header className="p-4 flex justify-between items-center">
            <h1 className="text-[14px] uppercase text-white">Tagesplan</h1>
            <button onClick={handleClose} className="text-white p-1">
              <X size={20} />
            </button>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            
            {/* Loading skeleton for meals */}
            {!dataLoaded && (
              <div className="mb-8">
                <Skeleton className="h-4 w-40 bg-white/10 mb-4" />
                <div className="border border-white/30 rounded-lg overflow-hidden">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`flex p-3 gap-3 ${i !== 6 ? 'border-b border-white/30' : ''}`}>
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-4 flex-1 bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {meals && meals.map((meal, mealIndex) => (
              <div key={mealIndex} className="mb-8">
                <h2 className="text-[14px] text-white mb-4">{meal.title}</h2>
                <div className="border border-white/30 rounded-lg overflow-hidden">
                  {meal.ingredients.map((ingredient, index) => {
                    const isEditingQuantity = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'quantity';
                    const isEditingName = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'name';
                    const isEditingDescription = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'description';
                    
                    return (
                      <div
                        key={index}
                        className={`flex p-3 ${index !== meal.ingredients.length - 1 ? 'border-b border-white/30' : ''}`}
                      >
                        {isEditingQuantity ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={ingredient.quantity}
                            onChange={(e) => handleMealChange(e.target.value)}
                            onBlur={handleMealBlur}
                            onKeyDown={handleMealKeyDown}
                            className="bg-white/10 text-white/60 text-[14px] w-[80px] flex-shrink-0 px-1 py-0.5 rounded border border-white/30 outline-none"
                          />
                        ) : (
                          <span
                            className="text-[14px] text-white/60 w-[80px] flex-shrink-0 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 -mx-1"
                            onClick={() => handleMealClick(mealIndex, index, 'quantity')}
                          >
                            {ingredient.quantity}
                          </span>
                        )}
                        <div className="flex-1">
                          {isEditingName ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={ingredient.name}
                              onChange={(e) => handleMealChange(e.target.value)}
                              onBlur={handleMealBlur}
                              onKeyDown={handleMealKeyDown}
                              className="bg-white/10 text-white/60 text-[14px] w-full px-1 py-0.5 rounded border border-white/30 outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[14px] text-white/60 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 inline-block"
                                onClick={() => handleMealClick(mealIndex, index, 'name')}
                              >
                                {ingredient.name}
                              </span>
                              {ingredient.link && (
                                <a
                                  href={ingredient.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white/40 hover:text-white transition-colors p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          )}
                          {isEditingDescription ? (
                            <textarea
                              ref={textareaRef}
                              value={ingredient.description || ''}
                              onChange={(e) => handleMealChange(e.target.value)}
                              onBlur={handleMealBlur}
                              onKeyDown={handleMealKeyDown}
                              className="bg-white/10 text-white/60 text-[14px] w-full px-1 py-0.5 rounded border border-white/30 outline-none mt-2 min-h-[80px]"
                            />
                          ) : ingredient.description ? (
                            <p
                              className="text-[14px] text-white/60 mt-2 whitespace-pre-line cursor-pointer hover:bg-white/10 rounded px-1 py-0.5"
                              onClick={() => handleMealClick(mealIndex, index, 'description')}
                            >
                              {ingredient.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Emergency Section */}
            <div className="mb-8">
              <h2 className="text-[14px] text-white mb-4">🚑 im Notfall</h2>
              
              {/* Tierarztpraxis Sonnenallee */}
              <div className="border border-white/30 rounded-lg p-4 mb-4">
                <a 
                  href="https://www.tierarztpraxis-sonnenallee.de/?gad_source=1&gad_campaignid=1857807503&gbraid=0AAAAACzVUKlJl2A4d-chpHx705_Kb1tWY&gclid=Cj0KCQiAprLLBhCMARIsAEDhdPc4TJVMjdztujQuW5wFRyIqjwoP6QMboQ8ldcTAc1rpomFMn2XrYpkaAkZoEALw_wcB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[14px] text-white mb-3 hover:text-white/80 transition-colors"
                >
                  <span>Tierarztpraxis Sonnenallee</span>
                  <ExternalLink size={14} className="text-white/60" />
                </a>
                <a 
                  href="tel:+49306814455"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <Phone size={14} className="text-white/60" />
                  <span>Anrufen</span>
                </a>
              </div>

              {/* Tierklinik Bärenwiese */}
              <div className="border border-white/30 rounded-lg p-4">
                <a 
                  href="https://tierarzt-baerenwiese.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[14px] text-white mb-3 hover:text-white/80 transition-colors"
                >
                  <span>Tierklinik: Tierarztpraxis Bärenwiese</span>
                  <ExternalLink size={14} className="text-white/60" />
                </a>
                <a 
                  href="tel:+493023362627"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors mb-3"
                >
                  <Phone size={14} className="text-white/60" />
                  <span>Anrufen</span>
                </a>
                <a 
                  href="http://maps.apple.com/?q=Uhlandstraße+151,+10719+Berlin"
                  onClick={(e) => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (!isIOS) {
                      e.preventDefault();
                      window.open('https://maps.google.com/?q=Uhlandstraße+151,+10719+Berlin', '_blank');
                    }
                  }}
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <MapPin size={14} className="text-white/60" />
                  <span>Wegbeschreibung</span>
                </a>
                <div className="flex items-start justify-between mt-2 ml-6">
                  <a 
                    href="http://maps.apple.com/?q=Uhlandstraße+151,+10719+Berlin"
                    onClick={(e) => {
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      if (!isIOS) {
                        e.preventDefault();
                        window.open('https://maps.google.com/?q=Uhlandstraße+151,+10719+Berlin', '_blank');
                      }
                    }}
                    className="text-[14px] text-white/60 hover:text-white transition-colors"
                  >
                    Uhlandstraße 151<br />
                    10719 Berlin
                  </a>
                  <button
                    onClick={copyAddress}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                    title="Adresse kopieren"
                  >
                    {addressCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Puberty Phase - only shown during puberty (6-30 months) */}
            {(() => {
              const settings = getCachedSettings();
              const birthday = settings.birthday ? new Date(settings.birthday) : new Date('2025-01-20');
              const now = new Date();
              const ageInMonths = differenceInMonths(now, birthday);
              if (ageInMonths < 6 || ageInMonths > 30) return null;
              
              const phases = [
                { min: 6, max: 8, name: 'Vorpubertät', characteristics: 'In dieser Phase beginnen die ersten hormonellen Veränderungen. Kalle wird merklich neugieriger, zeigt erste Anzeichen von Selbstständigkeit und testet vorsichtig seine Grenzen aus. Er könnte anfangen, bekannte Regeln in Frage zu stellen und sich von vertrauten Personen etwas mehr zu lösen.', needs: ['Sichere Umgebung zum Erkunden bieten', 'Positive Verstärkung bei jedem Erfolg', 'Sanfte, aber klare Konsequenz', 'Neue Situationen behutsam einführen'] },
                { min: 8, max: 12, name: 'Frühe Pubertät', characteristics: 'Kalle zeigt möglicherweise erste Unsicherheiten und Trotzverhalten. Selektives Hören wird häufiger – Kommandos, die vorher gut saßen, werden plötzlich ignoriert. Erste Rangordnungstests mit anderen Hunden und auch gegenüber den Bezugspersonen können auftreten.', needs: ['Klare, verlässliche Regeln aufstellen', 'Geduld – er testet nicht aus Bosheit', 'Viel Lob für gewünschtes Verhalten', 'Kurze, motivierende Trainingseinheiten'] },
                { min: 12, max: 18, name: 'Hochphase', characteristics: 'Das ist die intensivste Phase der Pubertät. Kalle kann unberechenbar auf Reize reagieren, die ihn vorher nicht gestört haben. Bekannte Kommandos werden scheinbar „vergessen", die Impulskontrolle ist eingeschränkt und Umweltreize wie andere Hunde, Geräusche oder Wild können extrem ablenkend wirken.', needs: ['Maximale Konsequenz, dabei ruhig bleiben', 'Trainingseinheiten kurz und erfolgreich halten', 'Tägliche Routine unbedingt beibehalten', 'Keine neuen, überfordernden Situationen', 'Rückschritte sind normal – nicht stressen'] },
                { min: 18, max: 24, name: 'Späte Pubertät', characteristics: 'Kalle wird langsam ruhiger und ausgeglichener. Das in den Monaten zuvor Gelernte festigt sich wieder und wird zuverlässiger abrufbar. Die erwachsene Persönlichkeit beginnt sich herauszubilden – man kann erste Züge seines endgültigen Charakters erkennen.', needs: ['Weiterhin konsequent bleiben', 'Training vertiefen und anspruchsvoller gestalten', 'Schrittweise mehr Freiheiten gewähren', 'Wachsende Zuverlässigkeit belohnen'] },
                { min: 24, max: 30, name: 'Junghund-Stabilisierung', characteristics: 'Die letzte Reifephase: Kalle findet sein inneres Gleichgewicht. Sein Verhalten und Charakter stabilisieren sich zunehmend. Reaktionen werden vorhersehbarer, die Bindung zu seinen Bezugspersonen vertieft sich und er zeigt immer mehr Anzeichen eines erwachsenen, souveränen Hundes.', needs: ['Vertrauen weiter stärken', 'Routine festigen', 'Neue Herausforderungen anbieten', 'Die Beziehung genießen – das Schwierigste liegt hinter euch!'] },
              ];
              
              const currentPhaseIndex = phases.findIndex(p => ageInMonths >= p.min && ageInMonths < p.max);
              const displayIndex = selectedPubertyPhase !== null ? selectedPubertyPhase : (currentPhaseIndex >= 0 ? currentPhaseIndex : phases.length - 1);
              const phase = phases[displayIndex];
              const isCurrentPhase = displayIndex === currentPhaseIndex;

              return (
                <div className="mb-8">
                  <h2 className="text-[14px] text-white mb-4">👹 Pubertät</h2>
                  <div 
                    className="border border-white/30 rounded-lg overflow-hidden"
                  >
                    {/* Header with phase name and progress */}
                    <div className="p-4 pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] text-white">{phase.name}</span>
                        <span className="text-[14px] text-white/60">{phase.min}–{phase.max} Monate</span>
                      </div>
                      
                      {/* Clickable progress bar */}
                      <div className="flex gap-1 mb-4">
                        {phases.map((p, i) => {
                          const isActive = displayIndex === i;
                          const isPast = ageInMonths >= p.max;
                          
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedPubertyPhase(i === currentPhaseIndex && selectedPubertyPhase === null ? null : i === selectedPubertyPhase ? null : i)}
                              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                                isActive ? 'bg-white' : isPast ? 'bg-white/30' : 'bg-white/10'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Swipeable content area */}
                    <div
                      className="relative overflow-hidden"
                      onTouchStart={(e) => {
                        const el = e.currentTarget as any;
                        el._swipeStartX = e.touches[0].clientX;
                        el._swipeDeltaX = 0;
                      }}
                      onTouchMove={(e) => {
                        const el = e.currentTarget as any;
                        if (el._swipeStartX === undefined) return;
                        const deltaX = e.touches[0].clientX - el._swipeStartX;
                        el._swipeDeltaX = deltaX;
                        const contentEl = e.currentTarget.querySelector('[data-phase-content]') as HTMLElement;
                        if (contentEl) {
                          contentEl.style.transform = `translateX(${deltaX * 0.5}px)`;
                        }
                      }}
                      onTouchEnd={(e) => {
                        const el = e.currentTarget as any;
                        const deltaX = el._swipeDeltaX || 0;
                        const contentEl = e.currentTarget.querySelector('[data-phase-content]') as HTMLElement;
                        
                        const threshold = 60;
                        let nextIdx = displayIndex;
                        if (deltaX < -threshold) {
                          nextIdx = Math.min(displayIndex + 1, phases.length - 1);
                        } else if (deltaX > threshold) {
                          nextIdx = Math.max(displayIndex - 1, 0);
                        }
                        
                        if (nextIdx !== displayIndex && contentEl) {
                          // Slide out in swipe direction
                          const direction = deltaX < 0 ? -1 : 1;
                          contentEl.style.transition = 'transform 0.15s ease-out';
                          contentEl.style.transform = `translateX(${direction * 300}px)`;
                          setTimeout(() => {
                            setSelectedPubertyPhase(nextIdx === currentPhaseIndex ? null : nextIdx);
                            if (contentEl) {
                              // Reset instantly off-screen on opposite side, then slide in
                              contentEl.style.transition = 'none';
                              contentEl.style.transform = `translateX(${-direction * 300}px)`;
                              requestAnimationFrame(() => {
                                contentEl.style.transition = 'transform 0.15s ease-out';
                                contentEl.style.transform = 'translateX(0)';
                              });
                            }
                          }, 150);
                        } else if (contentEl) {
                          contentEl.style.transition = 'transform 0.15s ease-out';
                          contentEl.style.transform = 'translateX(0)';
                        }
                        
                        setTimeout(() => {
                          if (contentEl) contentEl.style.transition = '';
                        }, 400);
                        
                        el._swipeStartX = undefined;
                        el._swipeDeltaX = 0;
                      }}
                    >
                      <div data-phase-content className="px-4 pb-4" style={{ willChange: 'transform' }}>
                        {!isCurrentPhase && (
                          <p className="text-[12px] text-white/30 mb-3 italic">Diese Phase ist {ageInMonths < phase.min ? 'noch nicht erreicht' : 'bereits abgeschlossen'}</p>
                        )}
                        
                        {/* Characteristics */}
                        <p className="text-[14px] text-white/60 mb-4">{phase.characteristics}</p>
                        
                        {/* Needs as bullet points */}
                        <div className="text-[14px] text-white/60">
                          <span className="text-white">{isCurrentPhase ? 'Was Kalle jetzt braucht:' : 'Was in dieser Phase wichtig ist:'}</span>
                          <ul className="mt-2 space-y-1">
                            {phase.needs.map((need, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-white/30">•</span>
                                <span>{need}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Wochenplan Section */}
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-[14px] text-white">Wochenplan</h2>
              </div>
              
              {!dataLoaded ? (
                <div className="border border-white/30 rounded-[16px] overflow-hidden p-4">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-10 bg-white/10" />
                    ))}
                  </div>
                </div>
              ) : (
              <div
                ref={wochenplanScrollRef}
                className="overflow-x-auto -mx-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="px-4 min-w-fit">
                <div className="border border-white/30 rounded-[16px] overflow-hidden inline-block" style={{ minWidth: `${TOTAL_DAYS * 90}px` }}>
                <table className="w-full text-[14px]" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    {Array.from({ length: TOTAL_DAYS }, (_, i) => (
                      <col key={i} style={{ width: '90px' }} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Row 1: Date and Day */}
                    <tr className="border-b border-white/30">
                      {Array.from({ length: TOTAL_DAYS }, (_, dayIndex) => {
                        const isToday = dayIndex === currentDayIndex;
                        const dayDate = new Date(rangeStart);
                        dayDate.setDate(dayDate.getDate() + dayIndex);
                        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                        const jsDay = dayDate.getDay();
                        
                        return (
                          <th
                            key={dayIndex}
                            ref={isToday ? todayColRef : undefined}
                            className="p-2 text-left border-r border-white/30 last:border-r-0"
                          >
                            <div className="text-[14px] text-white">{dayNames[jsDay]}</div>
                            <div className="text-[14px] text-white/60 font-normal">{format(dayDate, 'd. MMM', { locale: de })}</div>
                          </th>
                        );
                      })}
                    </tr>
                    {/* Row 2: Who has Kalle */}
                    <tr>
                      {(() => {
                        const cells: React.ReactNode[] = [];
                        let skipUntil = -1;
                        
                        for (let dayIndex = 0; dayIndex < TOTAL_DAYS; dayIndex++) {
                          if (dayIndex < skipUntil) continue;
                          
                          const dayDate = new Date(rangeStart);
                          dayDate.setDate(dayDate.getDate() + dayIndex);
                          const owner = getKalleOwnerForDate(icalEvents, dayDate);
                          
                          if (owner) {
                            // Span consecutive days with same owner
                            let span = 1;
                            for (let j = dayIndex + 1; j < TOTAL_DAYS; j++) {
                              const nextDate = new Date(rangeStart);
                              nextDate.setDate(nextDate.getDate() + j);
                              const nextOwner = getKalleOwnerForDate(icalEvents, nextDate);
                              if (nextOwner && nextOwner.person === owner.person) {
                                span++;
                              } else {
                                break;
                              }
                            }
                            skipUntil = dayIndex + span;
                            
                            const endDateStr = format(owner.endDate, 'd. MMM', { locale: de });
                            
                            cells.push(
                              <td
                                key={dayIndex}
                                colSpan={span}
                                className="border-r border-white/30 last:border-r-0"
                              >
                                <div className="flex items-center gap-4 px-3 py-2">
                                  <span className="text-white text-[14px] font-medium whitespace-nowrap">🐶 {owner.person} hat Kalle</span>
                                  <span className="text-white/40 text-[12px] whitespace-nowrap">bis {endDateStr}</span>
                                </div>
                              </td>
                            );
                          } else {
                            cells.push(
                              <td key={dayIndex} className="border-r border-white/30 last:border-r-0" />
                            );
                          }
                        }
                        return cells;
                      })()}
                    </tr>
                    <tr><td colSpan={TOTAL_DAYS} className="h-0 border-b border-white/30"></td></tr>
                  </thead>
                  <tbody>
                    {/* Walk times with 💩 indication from event data */}
                    {(() => {
                      const daySlots = new Map<number, { avgHour: number; hasPoop: boolean }[]>();
                      
                      for (let d = 0; d < TOTAL_DAYS; d++) {
                        // Map each day to its weekday index (Mon=0..Sun=6) for avg data
                        const dayDate = new Date(rangeStart);
                        dayDate.setDate(dayDate.getDate() + d);
                        const jsDay = dayDate.getDay(); // 0=Sun
                        const monBasedDay = (jsDay + 6) % 7; // Mon=0..Sun=6
                        const data = avgGassiByDay.get(monBasedDay);
                        if (!data) { daySlots.set(d, []); continue; }
                        
                        const allEvents: { hour: number; isPoop: boolean }[] = [
                          ...data.pipiHours.map(h => ({ hour: h, isPoop: false })),
                          ...data.stuhlgangHours.map(h => ({ hour: h, isPoop: true })),
                        ].sort((a, b) => a.hour - b.hour);
                        
                        const clusters: { hours: number[]; hasPoop: boolean }[] = [];
                        for (const evt of allEvents) {
                          const last = clusters[clusters.length - 1];
                          if (last && evt.hour - last.hours[last.hours.length - 1] <= 1.5) {
                            last.hours.push(evt.hour);
                            if (evt.isPoop) last.hasPoop = true;
                          } else {
                            clusters.push({ hours: [evt.hour], hasPoop: evt.isPoop });
                          }
                        }
                        
                        daySlots.set(d, clusters.map(c => ({
                          avgHour: c.hours.reduce((a, b) => a + b, 0) / c.hours.length,
                          hasPoop: c.hasPoop,
                        })));
                      }
                      
                      const maxSlots = Math.max(...Array.from(daySlots.values()).map(s => s.length), 0);
                      
                      if (maxSlots === 0) {
                        return (
                          <tr>
                            <td colSpan={TOTAL_DAYS} className="p-4 text-center text-white/30 text-[12px]">
                              Noch keine Gassi-Daten
                            </td>
                          </tr>
                        );
                      }
                      
                      const formatTime = (h: number) => {
                        const rounded = Math.round(h * 2) / 2;
                        const hours = Math.floor(rounded);
                        const mins = rounded % 1 === 0.5 ? 30 : 0;
                        return `${hours}:${mins.toString().padStart(2, '0')}`;
                      };
                      
                      // Collect iCal events per day (excluding "hat Kalle")
                      const dayIcalEvents = new Map<number, { summary: string; time: string }[]>();
                      for (let d = 0; d < TOTAL_DAYS; d++) {
                        const evts = weekIcalEvents.get(d) || [];
                        dayIcalEvents.set(d, evts
                          .filter(e => !e.summary?.match(/hat\s+Kalle/i))
                          .map(e => ({
                            summary: e.summary || '',
                            time: format(new Date(e.dtstart), 'HH:mm'),
                          }))
                          .sort((a, b) => a.time.localeCompare(b.time))
                        );
                      }
                      
                      return Array.from({ length: maxSlots }, (_, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-white/30 last:border-b-0" style={{ height: rowIdx >= 4 ? '120px' : undefined }}>
                          {Array.from({ length: TOTAL_DAYS }, (_, dayIndex) => {
                            const slots = daySlots.get(dayIndex) || [];
                            const slot = slots[rowIdx];
                            // Show iCal events below the last walk slot (or in first row if no walks)
                            const isLastSlotRow = rowIdx === Math.max(slots.length - 1, 0);
                            const icalEvts = isLastSlotRow ? (dayIcalEvents.get(dayIndex) || []) : [];
                            
                            return (
                              <td key={dayIndex} className="p-2 border-r border-white/30 last:border-r-0 align-top">
                                {slot ? (
                                  <div>
                                    <div className="text-white/50 text-[14px]">{formatTime(slot.avgHour)} Uhr</div>
                                    <div className="text-white/60 text-[14px] mt-0.5">
                                      {slot.hasPoop ? '💩' : '💦'}
                                    </div>
                                  </div>
                                ) : null}
                                {icalEvts.map((evt, i) => (
                                  <div key={i} className={slot ? 'mt-2 pt-2 border-t border-white/10' : ''}>
                                    <div className="text-white/40 text-[14px]">{evt.time} Uhr</div>
                                    <div className="text-white/70 text-[14px] mt-0.5">{evt.summary}</div>
                                  </div>
                                ))}
                                {!slot && icalEvts.length === 0 && (
                                  <div className="text-white/15">–</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
                </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagesplanOverlay;
