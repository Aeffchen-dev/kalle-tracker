import { useRef, useEffect, useState, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Root element to use as IntersectionObserver root (e.g. a scroll container) */
  root?: React.RefObject<HTMLElement>;
  /** Delay in ms before the animation triggers */
  delay?: number;
}

/**
 * Blur-to-sharp scroll reveal: children start blurred + transparent,
 * then sharpen into view when scrolled into the viewport.
 */
const ScrollReveal = ({ children, className = '', root, delay = 0 }: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, root: root?.current || null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [root, delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        filter: isVisible ? 'blur(0px)' : 'blur(2px)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'filter 0.6s ease-out, opacity 0.6s ease-out, transform 0.6s ease-out',
        willChange: 'filter, opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
