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
 * Animates a number from 0 to `value` when scrolled into view.
 */
const CountUp = ({ value, duration = 800, decimals = 0, suffix = '', prefix = '', root, className }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('0');
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.unobserve(el);

          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min(1, (now - startTime) / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * value;
            setDisplay(current.toFixed(decimals));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5, root: root?.current || null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, decimals, root]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
};

export default CountUp;
