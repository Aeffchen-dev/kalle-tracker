import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const PLACEHOLDER_FOODS = [
  'Schokolade', 'Karotten', 'Weintrauben', 'Reis', 'Käse', 'Banane',
  'Erdnussbutter', 'Avocado', 'Hühnchen', 'Zwiebeln', 'Äpfel', 'Lachs',
  'Gurke', 'Wassermelone', 'Knoblauch', 'Blaubeeren', 'Ei', 'Joghurt',
  'Tomaten', 'Spinat', 'Brokkoli', 'Nudeln', 'Brot', 'Honig',
];

type FoodStatus = 'ok' | 'nicht_optimal' | 'schadet' | 'giftig';

interface FoodResult {
  status: FoodStatus;
  reason: string;
}

const STATUS_CONFIG: Record<FoodStatus, { emoji: string; label: string; color: string; bg: string }> = {
  ok: { emoji: '✅', label: 'Kein Problem', color: 'text-green-400', bg: 'bg-green-500/20' },
  nicht_optimal: { emoji: '⚠️', label: 'Nicht optimal', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  schadet: { emoji: '❌', label: 'Das schadet mir', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  giftig: { emoji: '☠️', label: 'Das ist für mich giftig!', color: 'text-red-400', bg: 'bg-red-500/20' },
};

const DogFoodChecker = () => {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const charIndexRef = useRef(0);

  // Typing animation, cycle every ~4s
  useEffect(() => {
    if (isFocused || query) return;

    const currentFood = PLACEHOLDER_FOODS[placeholderIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (charIndexRef.current <= currentFood.length) {
        timer = setTimeout(() => {
          setPlaceholderText(currentFood.slice(0, charIndexRef.current));
          charIndexRef.current++;
        }, 80);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (charIndexRef.current > 0) {
        timer = setTimeout(() => {
          charIndexRef.current--;
          setPlaceholderText(currentFood.slice(0, charIndexRef.current));
        }, 35);
      } else {
        charIndexRef.current = 0;
        setPlaceholderText('');
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_FOODS.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timer);
  }, [placeholderText, isTyping, placeholderIndex, isFocused, query]);

  const checkFood = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-dog-food`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ food: trimmed }),
        }
      );

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      
      if (data.status && data.reason) {
        setResult(data);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('Food check error:', err);
      setResult({ status: 'schadet', reason: 'Konnte nicht geprüft werden. Bitte versuche es erneut.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') checkFood();
  };

  const config = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div className="mb-8">
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 pl-3 py-3">
          <span className="text-[18px] shrink-0">🐶</span>
          <span className="text-[13px] text-white/60 shrink-0">Kann ich</span>
          <div
            className="flex-1 min-w-0 bg-white/[0.12] rounded-full px-3 py-2 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setResult(null); }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                className="bg-transparent text-[13px] text-white w-full outline-none placeholder-transparent text-center"
                style={{ caretColor: 'white' }}
              />
              {!query && (
              <span className="absolute inset-0 text-[13px] text-white/30 pointer-events-none flex items-center justify-center">
                  {placeholderText}
                  <span className="animate-pulse ml-[1px]">|</span>
                </span>
              )}
            </div>
          </div>
          <span className="text-[13px] text-white/60 shrink-0 pr-1">essen?</span>
          <button
            onClick={checkFood}
            disabled={loading || !query.trim()}
            className="shrink-0 self-stretch aspect-square rounded-r-lg bg-black active:scale-95 transition-transform disabled:opacity-100 flex items-center justify-center"
            style={{ marginTop: '-12px', marginBottom: '-12px', marginRight: '0', paddingTop: '12px', paddingBottom: '12px' }}
          >
            {loading ? (
              <div className="w-[16px] h-[16px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={18} className="text-white" />
            )}
          </button>
        </div>
        {result && config && (
          <div className="px-3 pb-3">
            <div className={`${config.bg} rounded-lg p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{config.emoji}</span>
                <span className={`text-[13px] font-medium ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-[12px] text-white/60">{result.reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DogFoodChecker;
