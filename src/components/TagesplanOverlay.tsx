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
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'expanding' | 'visible' | 'dots-collapsing' | 'dots-hidden'>('idle');

  useEffect(() => {
    if (isOpen && animationPhase === 'idle') {
      setAnimationPhase('expanding');
      // Dots expand, show content after 300ms
      setTimeout(() => {
        document.body.style.backgroundColor = '#3d2b1f';
        setAnimationPhase('visible');
      }, 300);
    }
  }, [isOpen, animationPhase]);

  // Reset body background when fully closed
  useEffect(() => {
    if (animationPhase === 'idle' && !isOpen) {
      document.body.style.backgroundColor = '';
    }
  }, [animationPhase, isOpen]);

  const handleClose = () => {
    // Hide content instantly, color body white, and start dots collapsing
    document.body.style.backgroundColor = '';
    setAnimationPhase('dots-collapsing');
    // After dots collapse, hide them
    setTimeout(() => {
      setAnimationPhase('dots-hidden');
      setTimeout(() => {
        setAnimationPhase('idle');
        onClose();
      }, 50);
    }, 600);
  };

  if (!isOpen && animationPhase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Animated dots background */}
      <svg
        key={animationPhase}
        className={`absolute inset-0 w-full h-full pointer-events-auto ${animationPhase === 'dots-hidden' ? 'hidden' : ''}`}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <clipPath id="dotsClip">
            {/* All dalmatian spots that expand together */}
            {[
              { cx: 30, cy: 35, rx: 16, ry: 20 },
              { cx: 150, cy: 25, rx: 20, ry: 15 },
              { cx: 90, cy: 80, rx: 24, ry: 18 },
              { cx: 170, cy: 100, rx: 14, ry: 22 },
              { cx: 50, cy: 130, rx: 18, ry: 14 },
              { cx: 120, cy: 150, rx: 22, ry: 16 },
              { cx: 25, cy: 180, rx: 15, ry: 12 },
              { cx: 180, cy: 170, rx: 12, ry: 18 },
              { cx: 75, cy: 20, rx: 10, ry: 14 },
              { cx: 140, cy: 75, rx: 12, ry: 10 },
            ].map((spot, i) => (
              <ellipse key={i} cx={spot.cx} cy={spot.cy}>
                <animate
                  attributeName="rx"
                  from={animationPhase === 'dots-collapsing' ? '200' : String(spot.rx)}
                  to={animationPhase === 'expanding' || animationPhase === 'visible' ? '200' : String(spot.rx)}
                  dur={animationPhase === 'dots-collapsing' ? '0.6s' : '1.8s'}
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines={animationPhase === 'dots-collapsing' ? '0.4 0 1 1' : '0 0 0.2 1'}
                />
                <animate
                  attributeName="ry"
                  from={animationPhase === 'dots-collapsing' ? '200' : String(spot.ry)}
                  to={animationPhase === 'expanding' || animationPhase === 'visible' ? '200' : String(spot.ry)}
                  dur={animationPhase === 'dots-collapsing' ? '0.6s' : '1.8s'}
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines={animationPhase === 'dots-collapsing' ? '0.4 0 1 1' : '0 0 0.2 1'}
                />
              </ellipse>
            ))}
          </clipPath>
        </defs>
        <rect
          x="0"
          y="0"
          width="200"
          height="200"
          style={{ fill: 'hsl(var(--spot-color))' }}
          clipPath="url(#dotsClip)"
        />
      </svg>

      {/* Solid brown background */}
      <div
        className={`absolute inset-0 bg-spot pointer-events-auto ${
          animationPhase === 'visible' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col pointer-events-auto ${
          animationPhase === 'visible' ? 'opacity-100' : 'opacity-0'
        }`}
      >
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
    </div>
  );
};

export default TagesplanOverlay;
