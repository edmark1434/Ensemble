import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates a number from its previous value to `target` with one requestAnimationFrame loop
 * (~0.7s, ease-out). Jumps straight to the value under reduced motion or in a hidden tab.
 */
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (!Number.isFinite(target) || from === target || prefersReducedMotion() || document.hidden) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}
