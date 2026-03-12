import { useState, useEffect, useRef } from 'react';

/**
 * Hook to lazy-load a section when it enters the viewport.
 * Returns [ref, isVisible] — attach ref to a wrapper div.
 * Uses IntersectionObserver with rootMargin to start loading
 * slightly before the section enters viewport.
 */
export function useLazySection(rootMargin = '200px 0px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver is not supported, always show
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref as React.RefObject<HTMLDivElement>, isVisible];
}
