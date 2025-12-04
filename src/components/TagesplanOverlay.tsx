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
            {/* Positions adjusted: HTML top-left + offset for center (cx=left+w/2, cy=top+h/2) */}
            {[
              /* Large spots (offset ~+6 left, ~+3.5 top) */
              { cx: 11, cy: 11.5, rx: 6, ry: 7 },
              { cx: 78, cy: 11.5, rx: 8, ry: 6 },
              { cx: 42, cy: 22, rx: 7, ry: 8 },
              { cx: 88.5, cy: 32, rx: 6.5, ry: 7.5 },
              { cx: 15.5, cy: 45, rx: 7.5, ry: 6 },
              { cx: 71, cy: 55.5, rx: 6, ry: 7 },
              { cx: 28, cy: 71.5, rx: 8, ry: 6.5 },
              { cx: 81.5, cy: 82, rx: 6.5, ry: 8 },
              { cx: 52, cy: 88, rx: 7, ry: 6 },
              /* Medium spots (offset ~+5 left, ~+2.5 top) */
              { cx: 23, cy: 14.5, rx: 5, ry: 5.5 },
              { cx: 53.5, cy: 8.5, rx: 5.5, ry: 4.5 },
              { cx: 92.5, cy: 25, rx: 4.5, ry: 5.5 },
              { cx: 60, cy: 37.5, rx: 5, ry: 4.5 },
              { cx: 35.5, cy: 50.5, rx: 5.5, ry: 5 },
              { cx: 96.5, cy: 60.5, rx: 4.5, ry: 5 },
              { cx: 55, cy: 75, rx: 5, ry: 5.5 },
              { cx: 15.5, cy: 84.5, rx: 5.5, ry: 4.5 },
              { cx: 89.5, cy: 97.5, rx: 4.5, ry: 5 },
              /* Small spots (offset ~+3.5 left, ~+2 top) */
              { cx: 31.5, cy: 4, rx: 3.5, ry: 4 },
              { cx: 64, cy: 17, rx: 4, ry: 3.5 },
              { cx: 6.5, cy: 27, rx: 3.5, ry: 3.5 },
              { cx: 46, cy: 40, rx: 4, ry: 4 },
              { cx: 81.5, cy: 47, rx: 3.5, ry: 4 },
              { cx: 42, cy: 64, rx: 4, ry: 3.5 },
              { cx: 65.5, cy: 77, rx: 3.5, ry: 3.5 },
              { cx: 32, cy: 87, rx: 4, ry: 4 },
              { cx: 71.5, cy: 94, rx: 3.5, ry: 4 },
              /* Extra small spots (offset ~+2 left, ~+1.2 top) */
              { cx: 94, cy: 11.2, rx: 2, ry: 2.5 },
              { cx: 27.5, cy: 33, rx: 2.5, ry: 2 },
              { cx: 17, cy: 56, rx: 2, ry: 2 },
              { cx: 90.5, cy: 66.2, rx: 2.5, ry: 2.5 },
              { cx: 60, cy: 81.2, rx: 2, ry: 2.5 },
            ].map((spot, i) => (
              <ellipse key={i} cx={spot.cx} cy={spot.cy}>
                <animate
                  attributeName="rx"
                  from={animationPhase === 'dots-collapsing' ? '35' : String(spot.rx)}
                  to={animationPhase === 'dots-collapsing' ? String(spot.rx) : '100'}
                  dur={animationPhase === 'dots-collapsing' ? '0.3s' : '1.8s'}
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.4 0 0.2 1"
                />
                <animate
                  attributeName="ry"
                  from={animationPhase === 'dots-collapsing' ? '35' : String(spot.ry)}
                  to={animationPhase === 'dots-collapsing' ? String(spot.ry) : '100'}
                  dur={animationPhase === 'dots-collapsing' ? '0.35s' : '2s'}
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.35 0 0.25 1"
                />
              </ellipse>
            ))}
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
