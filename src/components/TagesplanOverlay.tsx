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
      // Reveal content after 500ms (300ms animation + 200ms delay)
      setTimeout(() => {
        document.body.style.backgroundColor = '#3d2b1f';
        setAnimationPhase('visible');
      }, 500);
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
      {/* Animated dots - matches actual dalmatian spot positions from index.html */}
      <svg
        key={animationPhase}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <clipPath id="dotsClip">
            {/* Irregular circle shapes like dalmatian spots */}
            {[
              /* Large spots */
              { cx: 11, cy: 11.5, baseSize: 6.5, seed: 0 },
              { cx: 78, cy: 11.5, baseSize: 7, seed: 1 },
              { cx: 42, cy: 22, baseSize: 7.5, seed: 2 },
              { cx: 88.5, cy: 32, baseSize: 7, seed: 3 },
              { cx: 15.5, cy: 45, baseSize: 6.75, seed: 4 },
              { cx: 71, cy: 55.5, baseSize: 6.5, seed: 5 },
              { cx: 28, cy: 71.5, baseSize: 7.25, seed: 6 },
              { cx: 81.5, cy: 82, baseSize: 7.25, seed: 7 },
              { cx: 52, cy: 88, baseSize: 6.5, seed: 8 },
              /* Medium spots */
              { cx: 23, cy: 14.5, baseSize: 5.25, seed: 9 },
              { cx: 53.5, cy: 8.5, baseSize: 5, seed: 10 },
              { cx: 92.5, cy: 25, baseSize: 5, seed: 11 },
              { cx: 60, cy: 37.5, baseSize: 4.75, seed: 12 },
              { cx: 35.5, cy: 50.5, baseSize: 5.25, seed: 13 },
              { cx: 96.5, cy: 60.5, baseSize: 4.75, seed: 14 },
              { cx: 55, cy: 75, baseSize: 5.25, seed: 15 },
              { cx: 15.5, cy: 84.5, baseSize: 5, seed: 16 },
              { cx: 89.5, cy: 97.5, baseSize: 4.75, seed: 17 },
              /* Small spots */
              { cx: 31.5, cy: 4, baseSize: 3.75, seed: 18 },
              { cx: 64, cy: 17, baseSize: 3.75, seed: 19 },
              { cx: 6.5, cy: 27, baseSize: 3.5, seed: 20 },
              { cx: 46, cy: 40, baseSize: 4, seed: 21 },
              { cx: 81.5, cy: 47, baseSize: 3.75, seed: 22 },
              { cx: 42, cy: 64, baseSize: 3.75, seed: 23 },
              { cx: 65.5, cy: 77, baseSize: 3.5, seed: 24 },
              { cx: 32, cy: 87, baseSize: 4, seed: 25 },
              { cx: 71.5, cy: 94, baseSize: 3.75, seed: 26 },
              /* Extra small spots */
              { cx: 94, cy: 11.2, baseSize: 2.25, seed: 27 },
              { cx: 27.5, cy: 33, baseSize: 2.25, seed: 28 },
              { cx: 17, cy: 56, baseSize: 2, seed: 29 },
              { cx: 90.5, cy: 66.2, baseSize: 2.5, seed: 30 },
              { cx: 60, cy: 81.2, baseSize: 2.25, seed: 31 },
            ].map((spot) => {
              // Create irregular circle using cubic bezier curves
              const generateIrregularCircle = (scale: number) => {
                // Pre-computed random-ish offsets per spot for organic look
                const offsets = [
                  [0.92, 1.08, 0.95, 1.05, 0.88, 1.12, 0.97, 1.03],
                  [1.1, 0.9, 1.05, 0.95, 1.08, 0.92, 0.98, 1.02],
                  [0.88, 1.12, 0.93, 1.07, 0.9, 1.1, 1.05, 0.95],
                  [1.05, 0.95, 1.1, 0.9, 0.92, 1.08, 0.97, 1.03],
                ][spot.seed % 4];
                
                const r = scale;
                const k = 0.552284749831; // Bezier approximation constant for circles
                
                const top = { x: spot.cx, y: spot.cy - r * offsets[0] };
                const right = { x: spot.cx + r * offsets[1], y: spot.cy };
                const bottom = { x: spot.cx, y: spot.cy + r * offsets[2] };
                const left = { x: spot.cx - r * offsets[3], y: spot.cy };
                
                return `M ${top.x} ${top.y} 
                  C ${top.x + r * k * offsets[4]} ${top.y}, ${right.x} ${right.y - r * k * offsets[5]}, ${right.x} ${right.y}
                  C ${right.x} ${right.y + r * k * offsets[6]}, ${bottom.x + r * k * offsets[7]} ${bottom.y}, ${bottom.x} ${bottom.y}
                  C ${bottom.x - r * k * offsets[0]} ${bottom.y}, ${left.x} ${left.y + r * k * offsets[1]}, ${left.x} ${left.y}
                  C ${left.x} ${left.y - r * k * offsets[2]}, ${top.x - r * k * offsets[3]} ${top.y}, ${top.x} ${top.y} Z`;
              };
              
              const startPath = animationPhase === 'dots-collapsing' 
                ? generateIrregularCircle(35) 
                : generateIrregularCircle(spot.baseSize);
              const endPath = animationPhase === 'dots-collapsing' 
                ? generateIrregularCircle(spot.baseSize) 
                : generateIrregularCircle(100);
              
              return (
                <path key={spot.seed} d={startPath}>
                  <animate
                    attributeName="d"
                    from={startPath}
                    to={endPath}
                    dur={animationPhase === 'dots-collapsing' ? '0.32s' : '1.9s'}
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines={animationPhase === 'dots-collapsing' ? "0 0 0.2 1" : "0.42 0 0.58 1"}
                  />
                </path>
              );
            })}
          </clipPath>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="#5c4033"
          clipPath="url(#dotsClip)"
        />
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
