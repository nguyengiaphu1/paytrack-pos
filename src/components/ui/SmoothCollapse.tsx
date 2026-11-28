'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';

interface SmoothCollapseProps {
  open: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Safari-safe 60fps accordion / collapsible panel matching Reel 6 #5
 * (`250ms cubic-bezier(0.77, 0, 0.175, 1)` + `overflow: clip`) without relying
 * on `interpolate-size: allow-keywords`.
 */
export function SmoothCollapse({
  open,
  id,
  className = '',
  children,
}: SmoothCollapseProps) {
  const [rendered, setRendered] = useState(open);
  const [lastOpen, setLastOpen] = useState(open);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setRendered(true);
    }
  }

  useGSAP(
    () => {
      ensureGsapInitialized();
      const el = containerRef.current;

      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }

      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          all: 'all',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);

          if (open) {
            if (reduceMotion) {
              gsap.set(el, { height: 'auto', opacity: 1, overflow: 'visible' });
              return;
            }
            const targetHeight = el.scrollHeight;
            gsap.fromTo(
              el,
              { height: 0, opacity: 0, overflow: 'clip' },
              {
                height: targetHeight,
                opacity: 1,
                duration: GSAP_MOTION.duration.accordion,
                ease: GSAP_MOTION.ease.iosAccordion,
                clearProps: 'height,opacity,overflow',
              }
            );
          } else {
            if (reduceMotion) {
              const t = window.setTimeout(() => setRendered(false), 0);
              return () => window.clearTimeout(t);
            }
            const currentHeight = el.offsetHeight || el.scrollHeight;
            gsap.fromTo(
              el,
              { height: currentHeight, opacity: 1, overflow: 'clip' },
              {
                height: 0,
                opacity: 0,
                duration: 0.21,
                ease: GSAP_MOTION.ease.iosAccordion,
                onComplete: () => setRendered(false),
              }
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [open, rendered] }
  );

  if (!open && !rendered) return null;

  return (
    <div ref={containerRef} id={id} className={className}>
      {children}
    </div>
  );
}
