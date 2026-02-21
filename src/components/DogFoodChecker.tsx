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
  const [isVisible, setIsVisible] = useState(false);
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const charIndexRef = useRef(0);

  // IntersectionObserver to start animation when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Typing animation - runs endlessly when visible
  useEffect(() => {
    if (!isVisible || isFocused || query) return;

    const currentFood = PLACEHOLDER_FOODS[placeholderIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (charIndexRef.current <= currentFood.length) {
        timer = setTimeout(() => {
          charIndexRef.current++;
          setPlaceholderText(currentFood.slice(0, charIndexRef.current));
          setTick(t => t + 1);
        }, 80);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
          setTick(t => t + 1);
        }, 2000);
      }
    } else {
      if (charIndexRef.current > 0) {
        timer = setTimeout(() => {
          charIndexRef.current--;
          setPlaceholderText(currentFood.slice(0, charIndexRef.current));
          setTick(t => t + 1);
        }, 35);
      } else {
        setPlaceholderText('');
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_FOODS.length);
        setIsTyping(true);
        setTick(t => t + 1);
      }
    }

    return () => clearTimeout(timer);
  }, [tick, isVisible, isFocused, query]);

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
    <div className="mb-8" ref={containerRef}>
      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 border border-white/10 overflow-hidden relative" style={{ borderRadius: '99px', padding: '4px 4px 4px 14px', background: 'rgba(0,0,0,0.15)' }}>
          <span className="text-[18px] shrink-0">🐶</span>
          <span className="text-[13px] text-white shrink-0">Darf Kalle</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResult(null); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="w-24 min-w-0 bg-transparent text-[13px] text-white outline-none text-center"
            style={{ caretColor: 'white' }}
            placeholder=""
          />
          {!query && !isFocused && (
            <span className="absolute left-1/2 -translate-x-1/2 text-[13px] text-white/25 pointer-events-none flex items-center">
              {placeholderText}
              <span className="animate-pulse ml-[1px]">|</span>
            </span>
          )}
          <span className="text-[13px] text-white shrink-0">essen?</span>
          <button
            onClick={checkFood}
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-full bg-white active:scale-95 transition-all flex items-center justify-center w-[36px] h-[36px] cursor-pointer"
          >
            {loading ? (
              <div className="w-[14px] h-[14px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={16} className="text-[#3d2b1f]" />
            )}
          </button>
        </div>

        <p className="text-[12px] text-white/40 leading-relaxed">
          Kalle hat Harnsteine – du musst aufpassen, was du ihm gibst. Falsches Futter kann neue Steine verursachen und eine OP nötig machen.
        </p>

        {result && config && (
          <div className="mt-3">
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
