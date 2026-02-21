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
  schadet: { emoji: '❌', label: 'Das schadet Kalle', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  giftig: { emoji: '☠️', label: 'Das ist giftig!', color: 'text-red-400', bg: 'bg-red-500/20' },
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
  const measureRef = useRef<HTMLSpanElement>(null);
  const charIndexRef = useRef(0);
  const [inputWidth, setInputWidth] = useState(48);
  const [minInputWidth, setMinInputWidth] = useState(48);

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

  // Measure longest placeholder word once to set min width
  useEffect(() => {
    if (measureRef.current) {
      let maxW = 0;
      for (const food of PLACEHOLDER_FOODS) {
        measureRef.current.textContent = food;
        maxW = Math.max(maxW, measureRef.current.offsetWidth);
      }
      const w = maxW + 4;
      setMinInputWidth(w);
      setInputWidth(w);
    }
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

  // Measure text width for input sizing
  useEffect(() => {
    if (measureRef.current && query) {
      measureRef.current.textContent = query;
      setInputWidth(Math.max(minInputWidth, measureRef.current.offsetWidth + 4));
    } else if (!query) {
      setInputWidth(minInputWidth);
    }
  }, [query, minInputWidth]);

  const config = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div className="mb-8" ref={containerRef}>
      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 overflow-hidden relative border border-white/5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)]" style={{ borderRadius: '99px', padding: '4px 4px 4px 14px', background: 'rgba(0,0,0,0.10)' }}>
          <div className="flex items-center gap-2 flex-1">
          <span className="text-[16px] shrink-0">🐶</span>
          <span className="text-[13px] leading-none text-white/90 shrink-0" style={{ lineHeight: '1' }}>Darf Kalle</span>
          <div className="relative" style={{ width: `${inputWidth}px` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResult(null); }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 bg-transparent text-[13px] leading-none text-white outline-none text-center transition-all duration-150 p-0 m-0 relative -top-[1.5px]"
              style={{ caretColor: 'white', lineHeight: '1' }}
              placeholder=""
            />
            {!query && !isFocused && (
              <span className="absolute inset-0 flex items-center justify-center text-[13px] leading-none text-white/30 pointer-events-none">
                {placeholderText}
                <span className="animate-pulse ml-[1px]">|</span>
              </span>
            )}
          </div>
          <span ref={measureRef} className="absolute invisible whitespace-pre text-[13px] leading-none" style={{ pointerEvents: 'none' }} />
          <span className="text-[13px] leading-none text-white/90 shrink-0 -ml-1" style={{ lineHeight: '1' }}>essen?</span>
          </div>
          <div className="ml-auto">
          <button
            onClick={checkFood}
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-full bg-black border border-black active:scale-95 transition-all flex items-center justify-center w-[36px] h-[36px] cursor-pointer shadow-md"
          >
            {loading ? (
              <div className="w-[14px] h-[14px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={16} className="text-white" />
            )}
          </button>
          </div>
        </div>

        {result && config ? (
          <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{config.emoji}</span>
                <span className="text-[13px] font-medium text-white/80">{config.label}</span>
              </div>
              <p className="text-[12px] text-white/40">{result.reason}</p>
            </div>
        ) : (
          <p className="text-[12px] text-white/40 leading-relaxed">
            Kalle hat Harnsteine, die eine Operation erforderlich machen können, wenn seine Ernährung nicht konsequent purinfrei ist. Bestimmte Futtermittel begünstigen die Neubildung von Steinen im Harntrakt, weshalb er ausschließlich purinfreies, speziell abgestimmtes Futter bekommen darf.
          </p>
        )}
      </div>
    </div>
  );
};

export default DogFoodChecker;
