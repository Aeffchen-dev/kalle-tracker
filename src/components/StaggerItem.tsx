import { useRef, useEffect, useState, ReactNode } from 'react';

interface StaggerItemProps {
  children: ReactNode;
  /** Delay per index in ms (default 60) */
  index: number;
  /** Root element for IntersectionObserver */
  root?: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * Stagger-animates a list item: fades in + slides up with index-based delay.
 */
const StaggerItem = ({ children, index, root, className = '' }: StaggerItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 60);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, root: root?.current || null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, root]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
        transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
      }}
    >
      {children}
    </div>
  );
};

export default StaggerItem;
