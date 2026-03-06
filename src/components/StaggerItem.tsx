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
          setTimeout(() => setIsVisible(true), Math.min(index * 30, 150));
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
        transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
};

export default StaggerItem;
