'use client';

import { useRef } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';
import { formatVND } from '@/lib/vietnamese';

interface AnimatedVndProps {
  value: number;
  className?: string;
  highlightOnChange?: boolean;
}

/**
 * Smooth rolling VND currency counter using gsap.utils.snap so KPI totals and
 * cart summaries count fluidly when filters or line items change.
 */
export function AnimatedVnd({
  value,
  className = '',
  highlightOnChange = false,
}: AnimatedVndProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef<number>(value);
  const hasMountedRef = useRef(false);

  useGSAP(
    () => {
      ensureGsapInitialized();
      const el = spanRef.current;
      if (!el) return;

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        prevValueRef.current = value;
        el.textContent = formatVND(value);
        return;
      }

      const startVal = prevValueRef.current;
      if (startVal === value) {
        el.textContent = formatVND(value);
        return;
      }
      prevValueRef.current = value;

      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: '(prefers-reduced-motion: reduce)' },
        (context) => {
          if (context.conditions?.reduceMotion) {
            el.textContent = formatVND(value);
            return;
          }

          const proxy = { val: startVal };
          const stepSnap = Math.abs(value - startVal) >= 10000 ? 1000 : 1;

          gsap.to(proxy, {
            val: value,
            duration: GSAP_MOTION.duration.counter,
            ease: GSAP_MOTION.ease.smooth,
            snap: { val: stepSnap },
            onUpdate: () => {
              el.textContent = formatVND(Math.round(proxy.val));
            },
            onComplete: () => {
              el.textContent = formatVND(value);
            },
          });

          if (highlightOnChange) {
            gsap.fromTo(
              el,
              { y: value > startVal ? -4 : 4, scale: 1.03 },
              {
                y: 0,
                scale: 1,
                duration: 0.34,
                ease: GSAP_MOTION.ease.bouncySnap,
                clearProps: 'transform',
              }
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: spanRef, dependencies: [value, highlightOnChange] }
  );

  return (
    <span ref={spanRef} className={`inline-block ${className}`.trim()}>
      {formatVND(value)}
    </span>
  );
}
