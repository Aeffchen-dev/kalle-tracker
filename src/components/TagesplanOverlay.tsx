import { useState, useEffect, useRef } from 'react';
import { X, Phone, MapPin, ExternalLink, Copy, Check } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInMonths } from 'date-fns';
import { getCachedSettings } from '@/lib/settings';

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
  person?: 'niklas' | 'jana';
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
      { time: '8-9 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training', person: 'niklas' },
      { time: '19-21 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi', person: 'jana' },
    ],
  },
  {
    day: 'Di',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training', person: 'jana' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen', person: 'niklas' },
      { time: '23 Uhr', activity: 'Pipi', person: 'niklas' },
    ],
  },
  {
    day: 'Mi',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Joggen + Essen', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + Pipi', person: 'jana' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training', person: 'niklas' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen', person: 'jana' },
      { time: '23 Uhr', activity: 'Pipi', person: 'jana' },
    ],
  },
  {
    day: 'Do',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training', person: 'niklas' },
      { time: '18-20 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi', person: 'jana' },
    ],
  },
  {
    day: 'Fr',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '15-16 Uhr', activity: 'Ruhe Training', person: 'niklas' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen', person: 'jana' },
      { time: '23 Uhr', activity: 'Pipi', person: 'jana' },
    ],
  },
  {
    day: 'Sa',
    type: 'Aktion Tag',
    slots: [
      { time: '7-9 Uhr', activity: 'Joggen im Wald + Essen', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + Pipi', person: 'jana' },
      { time: '15-16 Uhr', activity: 'Hundeplatz oder Ausflug', person: 'niklas' },
      { time: '18-20 Uhr', activity: 'Hundeplatz', person: 'niklas' },
      { time: '23 Uhr', activity: 'Pipi', person: 'niklas' },
    ],
  },
  {
    day: 'So',
    type: 'Chill Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde', person: 'niklas' },
      { time: '13 Uhr', activity: 'Essen + Pipi', person: 'jana' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training', person: 'jana' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen', person: 'jana' },
      { time: '23 Uhr', activity: 'Pipi', person: 'jana' },
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

  const togglePerson = (dayIndex: number, slotIndex: number) => {
    setHasLocalChanges(true);
    setSchedule(prev => {
      if (!prev) return prev;
      const newSchedule = [...prev];
      const currentPerson = newSchedule[dayIndex].slots[slotIndex]?.person;
      let nextPerson: 'niklas' | 'jana' | undefined;
      if (currentPerson === 'niklas') nextPerson = 'jana';
      else if (currentPerson === 'jana') nextPerson = undefined;
      else nextPerson = 'niklas';
      
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        slots: newSchedule[dayIndex].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, person: nextPerson } : slot
        ),
      };
      return newSchedule;
    });
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
                  <div className="border border-white/30 rounded-lg p-4">
                    {/* Header with phase name and progress */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] text-white">{phase.name}</span>
                      <span className="text-[14px] text-white/60">{phase.min}–{phase.max} Monate</span>
                    </div>
                    
                    {/* Clickable progress bar */}
                    <div className="flex gap-1 mb-4">
                      {phases.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedPubertyPhase(i === currentPhaseIndex && selectedPubertyPhase === null ? null : i === selectedPubertyPhase ? null : i)}
                          className={`flex-1 h-2 rounded-full transition-all ${
                            displayIndex === i 
                              ? 'bg-white' 
                              : ageInMonths >= p.min 
                                ? 'bg-white/30' 
                                : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    
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
              );
            })()}

            {/* Wochenplan Section */}
            <div className="mb-8">
              <h2 className="text-[14px] text-white mb-4">Wochenplan</h2>
              
              {/* Legend */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">💙</span>
                  <span className="text-[14px] text-white/60">= Niklas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">💗</span>
                  <span className="text-[14px] text-white/60">= Jana</span>
                </div>
              </div>

              {/* Schedule Table */}
              {!dataLoaded ? (
                <div className="border border-white/30 rounded-[16px] overflow-hidden p-4">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-10 bg-white/10" />
                    ))}
                  </div>
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-7 gap-2 mb-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                        <Skeleton key={col} className="h-12 bg-white/10" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
              <div className="overflow-x-auto -mx-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="px-4 min-w-fit">
                <div className="border border-white/30 rounded-[16px] overflow-hidden inline-block min-w-[700px]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/30">
                      {schedule && schedule.map((day, index) => (
                        <th key={index} className="p-2 text-left border-r border-white/30 last:border-r-0">
                          <div className="text-white">{day.day}</div>
                          <div className="text-white/60 font-normal">{day.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule && [0, 1, 2, 3, 4].map((slotIndex) => (
                      <tr key={slotIndex} className="border-b border-white/30 last:border-b-0">
                        {schedule.map((day, dayIndex) => {
                          const slot = day.slots[slotIndex];
                          const isEditingTime = editingCell?.dayIndex === dayIndex && editingCell?.slotIndex === slotIndex && editingCell?.field === 'time';
                          const isEditingActivity = editingCell?.dayIndex === dayIndex && editingCell?.slotIndex === slotIndex && editingCell?.field === 'activity';
                          return (
                            <td
                              key={dayIndex}
                              className={`p-2 border-r border-white/30 last:border-r-0 align-top ${
                                slot?.person === 'niklas'
                                  ? 'bg-blue-500/20'
                                  : slot?.person === 'jana'
                                  ? 'bg-pink-500/20'
                                  : ''
                              }`}
                            >
                              {slot && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => togglePerson(dayIndex, slotIndex)}
                                    className="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center text-[10px] border border-white/30 hover:border-white/50 transition-colors"
                                    title="Person wechseln"
                                  >
                                    {slot.person === 'niklas' ? '💙' : slot.person === 'jana' ? '💗' : '○'}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    {isEditingTime ? (
                                      <input
                                        ref={inputRef}
                                        type="text"
                                        value={slot.time}
                                        onChange={(e) => handleCellChange(e.target.value)}
                                        onBlur={handleCellBlur}
                                        onKeyDown={handleKeyDown}
                                        className="bg-white/10 text-white/60 text-[12px] w-full px-1 py-0.5 rounded border border-white/30 outline-none"
                                      />
                                    ) : (
                                      <div
                                        className="text-white/60 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5"
                                        onClick={() => handleCellClick(dayIndex, slotIndex, 'time')}
                                      >
                                        {slot.time}
                                      </div>
                                    )}
                                    {isEditingActivity ? (
                                      <input
                                        ref={inputRef}
                                        type="text"
                                        value={slot.activity}
                                        onChange={(e) => handleCellChange(e.target.value)}
                                        onBlur={handleCellBlur}
                                        onKeyDown={handleKeyDown}
                                        className="bg-white/10 text-white/60 text-[12px] w-full px-1 py-0.5 rounded border border-white/30 outline-none mt-1"
                                      />
                                    ) : (
                                      <div
                                        className="text-white/60 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5"
                                        onClick={() => handleCellClick(dayIndex, slotIndex, 'activity')}
                                      >
                                        {slot.activity}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
