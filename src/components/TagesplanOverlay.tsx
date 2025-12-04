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
      // Reveal content after 300ms
      setTimeout(() => {
        document.body.style.backgroundColor = '#3d2b1f';
        setAnimationPhase('visible');
      }, 300);
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
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id="dotsClip">
            {/* Organic blob shapes matching dalmatian spots */}
            {[
              /* Large spots */
              { cx: 11, cy: 11.5, size: 7, blob: "M0.3,0.5 C0.3,0.2 0.5,0 0.7,0.1 C0.9,0.2 1,0.5 0.9,0.7 C0.8,0.9 0.5,1 0.3,0.9 C0.1,0.8 0.1,0.6 0.3,0.5" },
              { cx: 78, cy: 11.5, size: 8, blob: "M0.2,0.4 C0.2,0.1 0.6,0 0.8,0.2 C1,0.4 0.9,0.7 0.7,0.9 C0.5,1 0.2,0.9 0.1,0.7 C0,0.5 0.1,0.4 0.2,0.4" },
              { cx: 42, cy: 22, size: 8, blob: "M0.5,0.1 C0.8,0.1 1,0.4 0.9,0.7 C0.8,1 0.4,1 0.2,0.8 C0,0.6 0.1,0.3 0.3,0.1 C0.4,0 0.5,0.1 0.5,0.1" },
              { cx: 88.5, cy: 32, size: 7, blob: "M0.4,0.1 C0.7,0 0.9,0.3 0.9,0.6 C0.9,0.9 0.6,1 0.3,0.9 C0,0.8 0,0.4 0.2,0.2 C0.3,0.1 0.4,0.1 0.4,0.1" },
              { cx: 15.5, cy: 45, size: 7, blob: "M0.3,0.2 C0.6,0 0.9,0.2 1,0.5 C1,0.8 0.7,1 0.4,0.9 C0.1,0.8 0,0.5 0.1,0.3 C0.2,0.2 0.3,0.2 0.3,0.2" },
              { cx: 71, cy: 55.5, size: 7, blob: "M0.5,0 C0.8,0.1 1,0.4 0.9,0.7 C0.8,1 0.4,1 0.2,0.8 C0,0.5 0.2,0.2 0.4,0.1 C0.5,0 0.5,0 0.5,0" },
              { cx: 28, cy: 71.5, size: 8, blob: "M0.2,0.3 C0.3,0 0.7,0 0.9,0.3 C1,0.6 0.8,0.9 0.5,1 C0.2,1 0,0.7 0.1,0.4 C0.1,0.3 0.2,0.3 0.2,0.3" },
              { cx: 81.5, cy: 82, size: 7, blob: "M0.4,0.1 C0.7,0 1,0.3 0.9,0.6 C0.8,0.9 0.5,1 0.2,0.9 C0,0.7 0,0.4 0.2,0.2 C0.3,0.1 0.4,0.1 0.4,0.1" },
              { cx: 52, cy: 88, size: 7, blob: "M0.3,0.2 C0.6,0 0.9,0.2 0.9,0.5 C0.9,0.8 0.6,1 0.3,0.9 C0,0.8 0,0.4 0.2,0.2 C0.3,0.2 0.3,0.2 0.3,0.2" },
              /* Medium spots */
              { cx: 23, cy: 14.5, size: 5.5, blob: "M0.3,0.3 C0.5,0 0.9,0.2 0.9,0.5 C0.9,0.8 0.6,1 0.3,0.9 C0,0.7 0,0.4 0.3,0.3" },
              { cx: 53.5, cy: 8.5, size: 5, blob: "M0.4,0.1 C0.8,0.1 1,0.4 0.8,0.8 C0.6,1 0.2,0.9 0.1,0.6 C0,0.3 0.2,0.1 0.4,0.1" },
              { cx: 92.5, cy: 25, size: 5, blob: "M0.5,0.1 C0.8,0.2 0.9,0.5 0.8,0.8 C0.6,1 0.2,0.9 0.1,0.6 C0.1,0.3 0.3,0.1 0.5,0.1" },
              { cx: 60, cy: 37.5, size: 5, blob: "M0.2,0.4 C0.3,0.1 0.7,0 0.9,0.3 C1,0.6 0.8,0.9 0.5,0.9 C0.2,0.9 0,0.6 0.2,0.4" },
              { cx: 35.5, cy: 50.5, size: 5.5, blob: "M0.4,0.2 C0.7,0 1,0.3 0.9,0.6 C0.8,0.9 0.4,1 0.2,0.8 C0,0.5 0.2,0.2 0.4,0.2" },
              { cx: 96.5, cy: 60.5, size: 5, blob: "M0.3,0.3 C0.6,0 0.9,0.2 0.9,0.6 C0.9,0.9 0.5,1 0.2,0.8 C0,0.5 0.1,0.3 0.3,0.3" },
              { cx: 55, cy: 75, size: 5.5, blob: "M0.5,0.1 C0.8,0.2 1,0.5 0.8,0.8 C0.6,1 0.2,0.9 0.1,0.5 C0.1,0.2 0.3,0.1 0.5,0.1" },
              { cx: 15.5, cy: 84.5, size: 5, blob: "M0.3,0.2 C0.6,0 0.9,0.3 0.9,0.6 C0.8,0.9 0.5,1 0.2,0.8 C0,0.5 0.1,0.2 0.3,0.2" },
              { cx: 89.5, cy: 97.5, size: 5, blob: "M0.4,0.1 C0.7,0.1 0.9,0.4 0.8,0.7 C0.7,1 0.3,1 0.1,0.7 C0,0.4 0.2,0.1 0.4,0.1" },
              /* Small spots */
              { cx: 31.5, cy: 4, size: 4, blob: "M0.5,0.2 C0.8,0.2 0.9,0.5 0.8,0.8 C0.6,1 0.3,0.9 0.2,0.6 C0.1,0.3 0.3,0.2 0.5,0.2" },
              { cx: 64, cy: 17, size: 4, blob: "M0.3,0.3 C0.5,0.1 0.8,0.2 0.9,0.5 C0.9,0.8 0.6,0.9 0.3,0.8 C0.1,0.6 0.1,0.4 0.3,0.3" },
              { cx: 6.5, cy: 27, size: 3.5, blob: "M0.4,0.2 C0.7,0.1 0.9,0.4 0.8,0.7 C0.7,0.9 0.3,0.9 0.2,0.6 C0.1,0.3 0.2,0.2 0.4,0.2" },
              { cx: 46, cy: 40, size: 4, blob: "M0.5,0.1 C0.8,0.2 0.9,0.5 0.7,0.8 C0.5,1 0.2,0.8 0.1,0.5 C0.1,0.2 0.3,0.1 0.5,0.1" },
              { cx: 81.5, cy: 47, size: 4, blob: "M0.3,0.2 C0.6,0.1 0.9,0.3 0.9,0.6 C0.8,0.9 0.5,1 0.2,0.8 C0.1,0.5 0.1,0.3 0.3,0.2" },
              { cx: 42, cy: 64, size: 4, blob: "M0.4,0.2 C0.7,0.1 0.9,0.4 0.8,0.7 C0.6,0.9 0.3,0.9 0.2,0.6 C0.1,0.3 0.2,0.2 0.4,0.2" },
              { cx: 65.5, cy: 77, size: 3.5, blob: "M0.5,0.2 C0.8,0.3 0.9,0.6 0.7,0.8 C0.5,0.9 0.2,0.8 0.1,0.5 C0.2,0.3 0.3,0.2 0.5,0.2" },
              { cx: 32, cy: 87, size: 4, blob: "M0.3,0.3 C0.6,0.1 0.9,0.3 0.9,0.6 C0.8,0.9 0.4,1 0.2,0.7 C0,0.5 0.1,0.3 0.3,0.3" },
              { cx: 71.5, cy: 94, size: 4, blob: "M0.4,0.2 C0.7,0.1 0.9,0.4 0.8,0.7 C0.7,0.9 0.3,0.9 0.2,0.6 C0.1,0.3 0.2,0.2 0.4,0.2" },
              /* Extra small spots */
              { cx: 94, cy: 11.2, size: 2.5, blob: "M0.5,0.2 C0.8,0.3 0.9,0.6 0.7,0.8 C0.4,0.9 0.2,0.7 0.2,0.4 C0.3,0.2 0.4,0.2 0.5,0.2" },
              { cx: 27.5, cy: 33, size: 2.5, blob: "M0.4,0.3 C0.7,0.2 0.9,0.5 0.8,0.7 C0.6,0.9 0.3,0.8 0.2,0.5 C0.2,0.3 0.3,0.3 0.4,0.3" },
              { cx: 17, cy: 56, size: 2, blob: "M0.5,0.2 C0.8,0.3 0.9,0.6 0.7,0.8 C0.4,0.9 0.2,0.6 0.3,0.3 C0.4,0.2 0.5,0.2 0.5,0.2" },
              { cx: 90.5, cy: 66.2, size: 2.5, blob: "M0.4,0.2 C0.7,0.2 0.9,0.5 0.8,0.8 C0.6,0.9 0.2,0.8 0.2,0.5 C0.2,0.3 0.3,0.2 0.4,0.2" },
              { cx: 60, cy: 81.2, size: 2.5, blob: "M0.5,0.3 C0.8,0.3 0.9,0.6 0.7,0.8 C0.4,0.9 0.2,0.7 0.2,0.4 C0.3,0.2 0.4,0.3 0.5,0.3" },
            ].map((spot, i) => {
              const scale = animationPhase === 'dots-collapsing' ? 5 : (animationPhase === 'expanding' || animationPhase === 'visible' ? 50 : 1);
              const fromScale = animationPhase === 'dots-collapsing' ? 50 : 1;
              const toScale = animationPhase === 'dots-collapsing' ? 1 : 50;
              return (
                <g key={i} transform={`translate(${spot.cx}, ${spot.cy})`}>
                  <path
                    d={spot.blob}
                    transform={`translate(${-spot.size/2}, ${-spot.size/2}) scale(${spot.size})`}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      from={`${spot.size * fromScale}`}
                      to={`${spot.size * toScale}`}
                      dur={animationPhase === 'dots-collapsing' ? '0.3s' : '1.8s'}
                      fill="freeze"
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.4 0 0.2 1"
                      additive="replace"
                    />
                  </path>
                </g>
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
              <div className="border border-white/30 rounded-lg overflow-x-auto">
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
      )}
    </div>
  );
};

export default TagesplanOverlay;
