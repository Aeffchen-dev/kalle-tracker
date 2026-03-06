import { useRef, useEffect, useState, ReactNode } from 'react';

interface ScrollBreatheProps {
  children: ReactNode;
  /** Scroll container ref */
  root?: React.RefObject<HTMLElement>;
  /** Max vertical stretch factor (default 0.015 = 1.5%) */
  intensity?: number;
  className?: string;
}

/**
 * Subtly stretches children vertically based on how centered they are
 * in the scroll viewport — like a breathing/bulge effect.
 */
const ScrollBreathe = ({ children, root, intensity = 0.015, className = '' }: ScrollBreatheProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scaleY, setScaleY] = useState(1);

  useEffect(() => {
    const container = root?.current;
    const el = ref.current;
    if (!container || !el) return;

    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        
        // Element center relative to container viewport center
        const containerCenter = containerRect.top + containerRect.height / 2;
        const elCenter = elRect.top + elRect.height / 2;
        const distance = Math.abs(elCenter - containerCenter);
        const maxDistance = containerRect.height / 2;
        
        // 1.0 when centered, 0.0 at edges
        const proximity = Math.max(0, 1 - distance / maxDistance);
        // Smooth curve
        const eased = proximity * proximity * (3 - 2 * proximity); // smoothstep
        
        setScaleY(1 + eased * intensity);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial

    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [root, intensity]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `scaleY(${scaleY})`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

export default ScrollBreathe;
