import { useState, useEffect, useRef } from 'react';
import { X, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Ingredient {
  quantity: string;
  name: string;
  description?: string;
}

interface MealData {
  title: string;
  ingredients: Ingredient[];
}

const mealsData: MealData[] = [
  {
    title: 'Morgens, mittags und abends jeweils',
    ingredients: [
      { quantity: '103g', name: 'Royal Canine Urinary u/c' },
      { quantity: '309g', name: 'Wasser' },
      { quantity: '25g', name: 'Vet-Concept Nudeln mit Gemüse', description: 'Mit heißem Wasser übergießen und 20 Minuten ziehen lassen\n\nkann ersetzt werden durch\n- 180g Nudeln, gekocht\n- 200g Gemüse, gekocht' },
      { quantity: '6,6g', name: 'Dicalciumphosphat' },
      { quantity: '3,3g', name: 'Elements sensitive' },
      { quantity: '6,6g', name: 'Futteröl Junior' },
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
  const [meals, setMeals] = useState<MealData[]>(mealsData);
  const [schedule, setSchedule] = useState<DaySchedule[]>(weekSchedule);
  const [editingCell, setEditingCell] = useState<{ dayIndex: number; slotIndex: number; field: 'time' | 'activity' } | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ mealIndex: number; ingredientIndex: number; field: 'quantity' | 'name' | 'description' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoad = useRef(true);

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
        }
        if (data.schedule_data && Array.isArray(data.schedule_data) && data.schedule_data.length > 0) {
          setSchedule(data.schedule_data as unknown as DaySchedule[]);
        }
      }
      isInitialLoad.current = false;
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
          
          const newData = payload.new as { meals_data?: MealData[]; schedule_data?: DaySchedule[] };
          if (newData.meals_data) setMeals(newData.meals_data);
          if (newData.schedule_data) setSchedule(newData.schedule_data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEditing]);

  // Save to database when data changes
  useEffect(() => {
    if (isInitialLoad.current) return;
    
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
      }
    };
    
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [meals, schedule]);

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
    setMeals(prev => {
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
    setSchedule(prev => {
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
    setSchedule(prev => {
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
            {meals.map((meal, mealIndex) => (
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
                            <span
                              className="text-[14px] text-white/60 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 inline-block"
                              onClick={() => handleMealClick(mealIndex, index, 'name')}
                            >
                              {ingredient.name}
                            </span>
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
              <div className="overflow-x-auto -mx-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="px-4 min-w-fit">
                <div className="border border-white/30 rounded-[16px] overflow-hidden inline-block min-w-[700px]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/30">
                      {weekSchedule.map((day, index) => (
                        <th key={index} className="p-2 text-left border-r border-white/30 last:border-r-0">
                          <div className="text-white">{day.day}</div>
                          <div className="text-white/60 font-normal">{day.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3, 4].map((slotIndex) => (
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
            </div>

            {/* Emergency Section */}
            <div className="mb-8">
              <h2 className="text-[14px] text-white mb-4">🚑 im Notfall</h2>
              
              {/* Tierarztpraxis Sonnenallee */}
              <div className="border border-white/30 rounded-lg p-4 mb-4">
                <a 
                  href="https://www.tierarztpraxis-sonnenallee.de/?gad_source=1&gad_campaignid=1857807503&gbraid=0AAAAACzVUKlJl2A4d-chpHx705_Kb1tWY&gclid=Cj0KCQiAprLLBhCMARIsAEDhdPc4TJVMjdztujQuW5wFRyIqjwoP6QMboQ8ldcTAc1rpomFMn2XrYpkaAkZoEALw_wcB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-white underline block mb-3"
                >
                  Tierarztpraxis Sonnenallee
                </a>
                <a 
                  href="tel:+49306814455"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <Phone size={16} />
                  <span>Anrufen</span>
                </a>
              </div>

              {/* Tierklinik Bärenwiese */}
              <div className="border border-white/30 rounded-lg p-4">
                <a 
                  href="https://tierarzt-baerenwiese.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-white underline block mb-3"
                >
                  Tierklinik: Tierarztpraxis Bärenwiese
                </a>
                <a 
                  href="tel:+493023362627"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors mb-3"
                >
                  <Phone size={16} />
                  <span>Anrufen</span>
                </a>
                <a 
                  href="https://maps.google.com/?q=Uhlandstraße+151,+10719+Berlin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <MapPin size={16} />
                  <span>Wegbeschreibung</span>
                </a>
                <p className="text-[14px] text-white/60 mt-2 ml-6">
                  Uhlandstraße 151<br />
                  10719 Berlin
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagesplanOverlay;
