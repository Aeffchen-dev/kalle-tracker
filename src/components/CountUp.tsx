import { useRef, useEffect, useState } from 'react';

interface CountUpProps {
  /** Target number to count up to */
  value: number;
  /** Duration in ms (default 800) */
  duration?: number;
  /** Decimal places (default 0) */
  decimals?: number;
  /** Suffix to append (e.g. "kg", "%") */
  suffix?: string;
  /** Prefix to prepend */
  prefix?: string;
  /** Root element for IntersectionObserver */
  root?: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * Animates the last few digits of a number when scrolled into view.
 * Starts near the target value for a subtle, refined effect.
 */
const CountUp = ({ value, duration = 1800, decimals = 0, suffix = '', prefix = '', root, className }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  // Start from ~80% of the value so only the last digits animate
  const startValue = value * 0.8;
  const [display, setDisplay] = useState(startValue.toFixed(decimals).replace('.', ','));
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.unobserve(el);

          const range = value - startValue;
          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min(1, (now - startTime) / duration);
            // ease-out quint — gentle deceleration
            const eased = 1 - Math.pow(1 - progress, 5);
            const current = startValue + eased * range;
            setDisplay(current.toFixed(decimals).replace('.', ','));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1, root: root?.current || null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, decimals, root, startValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
};

export default CountUp;
