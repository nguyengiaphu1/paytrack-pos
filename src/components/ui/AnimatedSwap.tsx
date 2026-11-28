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
 * Slot-roll / slide-up/down / icon-flip transition for buttons, labels,
 * icons, and badges whenever their semantic state changes.
 * Uses subtle 2px blur crossfade on fine pointers and transform-only 60fps on touch.
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
        {
          all: 'all',
          finePointer: '(hover: hover) and (pointer: fine)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const finePointer = Boolean(context.conditions?.finePointer);

          if (reduceMotion) {
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
              {
                rotation: -80,
                scale: 0.72,
                opacity: 0,
                ...(finePointer ? { filter: 'blur(2px)' } : {}),
              },
              {
                rotation: 0,
                scale: 1,
                opacity: 1,
                ...(finePointer ? { filter: 'blur(0px)' } : {}),
                duration: GSAP_MOTION.duration.swap,
                ease: GSAP_MOTION.ease.iosSheet,
                clearProps: 'transform,opacity,filter',
              }
            );
            return;
          }

          const fromYPercent = direction === 'down' ? -105 : 105;
          gsap.fromTo(
            slot,
            {
              yPercent: fromYPercent,
              opacity: 0,
              scale: 0.96,
              ...(finePointer ? { filter: 'blur(2px)' } : {}),
            },
            {
              yPercent: 0,
              opacity: 1,
              scale: 1,
              ...(finePointer ? { filter: 'blur(0px)' } : {}),
              duration: GSAP_MOTION.duration.swap,
              ease: GSAP_MOTION.ease.iosSheet,
              clearProps: 'transform,opacity,filter',
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
