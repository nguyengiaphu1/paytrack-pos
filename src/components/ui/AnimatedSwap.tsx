'use client';

import { useRef, type ReactNode } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';

interface AnimatedSwapProps {
  swapKey: string | number;
  direction?: 'up' | 'down' | 'flip';
  className?: string;
  children: ReactNode;
}

/**
 * Slot-roll / bouncy slide-up/down / icon-flip transition for buttons, labels,
 * icons, and badges whenever their semantic state changes.
 */
export function AnimatedSwap({
  swapKey,
  direction = 'up',
  className = '',
  children,
}: AnimatedSwapProps) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const hasMountedRef = useRef(false);

  useGSAP(
    () => {
      ensureGsapInitialized();
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }

      const slot = slotRef.current;
      if (!slot) return;

      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: '(prefers-reduced-motion: reduce)' },
        (context) => {
          if (context.conditions?.reduceMotion) {
            gsap.fromTo(
              slot,
              { opacity: 0 },
              {
                opacity: 1,
                duration: GSAP_MOTION.duration.reduced,
                ease: 'power2.out',
                clearProps: 'opacity',
              }
            );
            return;
          }

          if (direction === 'flip') {
            gsap.fromTo(
              slot,
              { rotation: -95, scale: 0.55, opacity: 0 },
              {
                rotation: 0,
                scale: 1,
                opacity: 1,
                duration: 0.34,
                ease: GSAP_MOTION.ease.bouncySnap,
                clearProps: 'transform,opacity',
              }
            );
            return;
          }

          const fromYPercent = direction === 'down' ? -115 : 115;
          gsap.fromTo(
            slot,
            { yPercent: fromYPercent, opacity: 0, scale: 0.92 },
            {
              yPercent: 0,
              opacity: 1,
              scale: 1,
              duration: 0.3,
              ease: GSAP_MOTION.ease.bouncy,
              clearProps: 'transform,opacity',
            }
          );
        }
      );

      return () => mm.revert();
    },
    { scope: clipRef, dependencies: [swapKey, direction] }
  );

  return (
    <span
      ref={clipRef}
      className={`inline-flex items-center overflow-hidden align-middle ${className}`.trim()}
    >
      <span ref={slotRef} className="inline-flex items-center gap-1.5 will-change-transform">
        {children}
      </span>
    </span>
  );
}
