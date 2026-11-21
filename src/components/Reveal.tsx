import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react';

/** Gentle fade/slide when a major section first scrolls into view. Off under reduced motion (CSS). */
export function Reveal({ children, as: Tag = 'div', className = '' }: { children: ReactNode; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal${visible ? ' is-visible' : ''} ${className}`}>{children}</Tag>;
}
