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
      { quantity: '25g', name: 'Vet-Concept Nudeln mit Germüse', description: 'Die vorgegebene Menge Nudeln mit heißem Wasser übergießen und 10 bis 20 Minuten ziehen lassen\n\nkann ersetzt werden durch\n- 180g Nudeln, gekocht\n- 200g Gemüse, gekocht' },
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

interface TagesplanOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TagesplanOverlay = ({ isOpen, onClose }: TagesplanOverlayProps) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'expanding' | 'visible' | 'collapsing'>('idle');

  useEffect(() => {
    if (isOpen && animationPhase === 'idle') {
      setAnimationPhase('expanding');
      setTimeout(() => setAnimationPhase('visible'), 600);
    }
  }, [isOpen, animationPhase]);

  const handleClose = () => {
    setAnimationPhase('collapsing');
    setTimeout(() => {
      setAnimationPhase('idle');
      onClose();
    }, 600);
  };

  if (!isOpen && animationPhase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Animated dots background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <clipPath id="dotsClip">
            {/* Dalmatian spots that expand */}
            <ellipse cx="30" cy="35" rx="16" ry="20" className={`transition-all duration-500 ${animationPhase === 'expanding' || animationPhase === 'visible' ? 'origin-center' : ''}`}>
              <animate
                attributeName="rx"
                from={animationPhase === 'collapsing' ? '200' : '16'}
                to={animationPhase === 'expanding' || animationPhase === 'visible' ? '200' : '16'}
                dur="0.6s"
                fill="freeze"
              />
              <animate
                attributeName="ry"
                from={animationPhase === 'collapsing' ? '200' : '20'}
                to={animationPhase === 'expanding' || animationPhase === 'visible' ? '200' : '20'}
                dur="0.6s"
                fill="freeze"
              />
            </ellipse>
          </clipPath>
        </defs>
        <rect
          x="0"
          y="0"
          width="200"
          height="200"
          fill="hsl(30 30% 25%)"
          clipPath="url(#dotsClip)"
          className={`transition-opacity duration-300 ${animationPhase === 'collapsing' ? 'opacity-0' : 'opacity-100'}`}
        />
      </svg>

      {/* Solid brown background that fades in */}
      <div
        className={`absolute inset-0 bg-spot transition-opacity duration-500 pointer-events-auto ${
          animationPhase === 'visible' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: 'hsl(30 30% 25%)' }}
      />

      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col pointer-events-auto transition-opacity duration-300 ${
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
                    <span className="text-[14px] text-white w-[80px] flex-shrink-0">{ingredient.quantity}</span>
                    <div className="flex-1">
                      <span className="text-[14px] text-white/60 underline">{ingredient.name}</span>
                      {ingredient.description && (
                        <p className="text-[14px] text-white/60 mt-2 whitespace-pre-line">{ingredient.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagesplanOverlay;
