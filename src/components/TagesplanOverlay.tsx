import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
    title: 'Morgens, mittags, abends',
    ingredients: [
      { quantity: '103g', name: 'Royal Canine Urinary u/c' },
      { quantity: '309g', name: 'Wasser' },
      { quantity: '25g', name: 'Vet-Concept Nudeln mit Gemüse', description: 'Mit heißem Wasser übergießen und 20 Minuten ziehen lassen\n\nkann ersetzt werden durch\n- 180g Nudeln, gekocht\n- 200g Gemüse, gekocht' },
      { quantity: '6,6g', name: 'Dicalciumphosphat' },
      { quantity: '3,3g', name: 'Elements sensitive' },
      { quantity: '6,6g', name: 'Futteröl Junior' },
    ],
  },
  {
    title: 'Schleckpaste',
    ingredients: [
      { quantity: '60g', name: 'Ei ohne Schale, gekocht' },
      { quantity: '100g', name: 'Joghurt 1,5% Fett' },
      { quantity: '100g', name: 'Karotten, gekocht' },
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

  useEffect(() => {
    if (isOpen && animationPhase === 'idle') {
      setAnimationPhase('expanding');
      // Recolor body after dots have mostly expanded
      setTimeout(() => {
        document.body.style.backgroundColor = '#3d2b1f';
      }, 800);
      // Reveal content 300ms later
      setTimeout(() => {
        setAnimationPhase('visible');
      }, 900);
    }
  }, [isOpen, animationPhase]);

  // Reset when fully closed
  useEffect(() => {
    if (animationPhase === 'idle' && !isOpen) {
      document.body.style.backgroundColor = '';
    }
  }, [animationPhase, isOpen]);

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
      {/* Animated spots - rendered as filled shapes */}
      <svg
        key={animationPhase}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {[
          { cx: 7.4, cy: 10.8, w: 4.8, h: 5.6, rotate: 12, seed: 0 },
          { cx: 73.2, cy: 10.4, w: 6.4, h: 4.8, rotate: -6, seed: 1 },
          { cx: 37.8, cy: 21.2, w: 5.6, h: 6.4, rotate: 45, seed: 2 },
          { cx: 84.6, cy: 31, w: 5.2, h: 6, rotate: -12, seed: 3 },
          { cx: 11, cy: 44.4, w: 6, h: 4.8, rotate: 30, seed: 4 },
          { cx: 67.4, cy: 54.8, w: 4.8, h: 5.6, rotate: -20, seed: 5 },
          { cx: 23.2, cy: 70.6, w: 6.4, h: 5.2, rotate: 15, seed: 6 },
          { cx: 77.6, cy: 81.2, w: 5.2, h: 6.4, rotate: -35, seed: 7 },
          { cx: 47.8, cy: 87.4, w: 5.6, h: 4.8, rotate: 25, seed: 8 },
          { cx: 20, cy: 14.2, w: 4, h: 4.4, rotate: -15, seed: 9 },
          { cx: 50.2, cy: 7.8, w: 4.4, h: 3.6, rotate: 20, seed: 10 },
          { cx: 89.8, cy: 24.2, w: 3.6, h: 4.4, rotate: -8, seed: 11 },
          { cx: 57, cy: 36.8, w: 4, h: 3.6, rotate: 35, seed: 12 },
          { cx: 32.2, cy: 50, w: 4.4, h: 4, rotate: -25, seed: 13 },
          { cx: 93.8, cy: 60, w: 3.6, h: 4, rotate: 10, seed: 14 },
          { cx: 52, cy: 74.2, w: 4, h: 4.4, rotate: -40, seed: 15 },
          { cx: 12.2, cy: 83.8, w: 4.4, h: 3.6, rotate: 5, seed: 16 },
          { cx: 86.8, cy: 97, w: 3.6, h: 4, rotate: -18, seed: 17 },
          { cx: 29.4, cy: 3.6, w: 2.8, h: 3.2, rotate: 8, seed: 18 },
          { cx: 61.6, cy: 16.4, w: 3.2, h: 2.8, rotate: -12, seed: 19 },
          { cx: 4.4, cy: 26.4, w: 2.8, h: 2.8, rotate: 22, seed: 20 },
          { cx: 43.6, cy: 39.6, w: 3.2, h: 3.2, rotate: -5, seed: 21 },
          { cx: 79.4, cy: 46.6, w: 2.8, h: 3.2, rotate: 15, seed: 22 },
          { cx: 39.6, cy: 63.4, w: 3.2, h: 2.8, rotate: -28, seed: 23 },
          { cx: 63.4, cy: 76.4, w: 2.8, h: 2.8, rotate: 32, seed: 24 },
          { cx: 29.6, cy: 86.6, w: 3.2, h: 3.2, rotate: -10, seed: 25 },
          { cx: 69.4, cy: 93.6, w: 2.8, h: 3.2, rotate: 18, seed: 26 },
          { cx: 92.8, cy: 11, w: 1.6, h: 2, rotate: 0, seed: 27 },
          { cx: 26, cy: 32.8, w: 2, h: 1.6, rotate: 0, seed: 28 },
          { cx: 15.8, cy: 55.8, w: 1.6, h: 1.6, rotate: 0, seed: 29 },
          { cx: 89, cy: 66, w: 2, h: 2, rotate: 0, seed: 30 },
          { cx: 58.8, cy: 81, w: 1.6, h: 2, rotate: 0, seed: 31 },
        ].map((spot) => {
          const offsets = [
            [0.92, 1.08, 0.95, 1.05, 0.88, 1.12, 0.97, 1.03],
            [1.1, 0.9, 1.05, 0.95, 1.08, 0.92, 0.98, 1.02],
            [0.88, 1.12, 0.93, 1.07, 0.9, 1.1, 1.05, 0.95],
            [1.05, 0.95, 1.1, 0.9, 0.92, 1.08, 0.97, 1.03],
          ][spot.seed % 4];
          
          const rx = spot.w / 2;
          const ry = spot.h / 2;
          const k = 0.552284749831;
          
          // Path centered at origin
          const top = { x: 0, y: -ry * offsets[0] };
          const right = { x: rx * offsets[1], y: 0 };
          const bottom = { x: 0, y: ry * offsets[2] };
          const left = { x: -rx * offsets[3], y: 0 };
          
          const path = `M ${top.x} ${top.y} 
            C ${top.x + rx * k * offsets[4]} ${top.y}, ${right.x} ${right.y - ry * k * offsets[5]}, ${right.x} ${right.y}
            C ${right.x} ${right.y + ry * k * offsets[6]}, ${bottom.x + rx * k * offsets[7]} ${bottom.y}, ${bottom.x} ${bottom.y}
            C ${bottom.x - rx * k * offsets[0]} ${bottom.y}, ${left.x} ${left.y + ry * k * offsets[1]}, ${left.x} ${left.y}
            C ${left.x} ${left.y - ry * k * offsets[2]}, ${top.x - rx * k * offsets[3]} ${top.y}, ${top.x} ${top.y} Z`;
          
          const startScale = animationPhase === 'dots-collapsing' ? 20 : 1;
          const endScale = animationPhase === 'dots-collapsing' ? 1 : 40;
          
          return (
            <path
              key={spot.seed}
              d={path}
              fill="#5c4033"
              transform={`translate(${spot.cx}, ${spot.cy}) rotate(${spot.rotate}) scale(${startScale})`}
            >
              <animateTransform
                attributeName="transform"
                type="scale"
                from={`${startScale}`}
                to={`${endScale}`}
                dur={animationPhase === 'dots-collapsing' ? '0.32s' : '1.9s'}
                fill="freeze"
                calcMode="spline"
                keyTimes="0;1"
                keySplines={animationPhase === 'dots-collapsing' ? "0 0 0.2 1" : "0.8 0 1 1"}
                additive="sum"
              />
            </path>
          );
        })}
      </svg>

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
            {mealsData.map((meal, mealIndex) => (
              <div key={mealIndex} className="mb-8">
                <h2 className="text-[14px] text-white mb-4">{meal.title}</h2>
                <div className="border border-white/30 rounded-lg overflow-hidden">
                  {meal.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className={`flex p-3 ${index !== meal.ingredients.length - 1 ? 'border-b border-white/30' : ''}`}
                    >
                      <span className="text-[14px] text-white/60 w-[80px] flex-shrink-0">{ingredient.quantity}</span>
                      <div className="flex-1">
                        <span className="text-[14px] text-white/60">{ingredient.name}</span>
                        {ingredient.description && (
                          <p className="text-[14px] text-white/60 mt-2 whitespace-pre-line">{ingredient.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
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
                        {weekSchedule.map((day, dayIndex) => {
                          const slot = day.slots[slotIndex];
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
                                <>
                                  <div className="text-white/60">{slot.time}</div>
                                  <div className="text-white/60">{slot.activity}</div>
                                </>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TagesplanOverlay;
