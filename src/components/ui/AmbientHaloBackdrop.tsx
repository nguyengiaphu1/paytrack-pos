'use client';

import { useRef } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';

interface HaloOrbConfig {
  id: string;
  colorVar: string;
  opacityVar: string;
  className: string;
  driftX: number;
  driftY: number;
  scaleTo: number;
  duration: number;
  delay: number;
}

const HALO_ORBS: readonly HaloOrbConfig[] = [
  {
    id: 'mint-jade',
    colorVar: 'var(--halo-1)',
    opacityVar: 'var(--halo-opacity-strong)',
    className: '-top-[14%] -left-[10%] h-[54vw] max-h-[560px] w-[54vw] max-w-[560px]',
    driftX: 48,
    driftY: 36,
    scaleTo: 1.12,
    duration: 18,
    delay: 0,
  },
  {
    id: 'warm-apricot',
    colorVar: 'var(--halo-2)',
    opacityVar: 'var(--halo-opacity-strong)',
    className: '-top-[12%] -right-[8%] h-[50vw] max-h-[540px] w-[50vw] max-w-[540px]',
    driftX: -44,
    driftY: 42,
    scaleTo: 1.09,
    duration: 21,
    delay: -4,
  },
  {
    id: 'glacier-sky',
    colorVar: 'var(--halo-3)',
    opacityVar: 'var(--halo-opacity-mid)',
    className: 'top-[32%] left-[24%] h-[44vw] max-h-[480px] w-[44vw] max-w-[480px]',
    driftX: 52,
    driftY: -34,
    scaleTo: 1.14,
    duration: 23,
    delay: -8,
  },
  {
    id: 'champagne-gold',
    colorVar: 'var(--halo-4)',
    opacityVar: 'var(--halo-opacity-mid)',
    className: 'bottom-[10%] -left-[6%] h-[48vw] max-h-[500px] w-[48vw] max-w-[500px]',
    driftX: 38,
    driftY: -46,
    scaleTo: 1.1,
    duration: 20,
    delay: -3,
  },
  {
    id: 'seafoam-aqua',
    colorVar: 'var(--halo-5)',
    opacityVar: 'var(--halo-opacity-strong)',
    className: '-bottom-[16%] right-[10%] h-[52vw] max-h-[540px] w-[52vw] max-w-[540px]',
    driftX: -46,
    driftY: -32,
    scaleTo: 1.11,
    duration: 24,
    delay: -10,
  },
  {
    id: 'coral-blush',
    colorVar: 'var(--halo-6)',
    opacityVar: 'var(--halo-opacity-soft)',
    className: 'top-[48%] -right-[10%] h-[40vw] max-h-[420px] w-[40vw] max-w-[420px]',
    driftX: -32,
    driftY: 28,
    scaleTo: 1.08,
    duration: 19,
    delay: -6,
  },
];

/**
 * Multi-color ambient halo backdrop built strictly from solid-color blurred orbs
 * (zero CSS gradients). Gently drifts with GSAP and pauses automatically when
 * the tab is hidden or prefers-reduced-motion is enabled.
 */
export function AmbientHaloBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsapInitialized();
      const container = containerRef.current;
      if (!container) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) {
            return;
          }

          const orbNodes = Array.from(
            container.querySelectorAll<HTMLElement>('[data-halo-orb]')
          );
          const tweens: gsap.core.Tween[] = orbNodes.map((orb, idx) => {
            const cfg = HALO_ORBS[idx];
            return gsap.to(orb, {
              x: cfg.driftX,
              y: cfg.driftY,
              scale: cfg.scaleTo,
              duration: cfg.duration,
              delay: cfg.delay,
              repeat: -1,
              yoyo: true,
              ease: GSAP_MOTION.ease.ambient,
            });
          });

          gsap.to(container, {
            yPercent: -4,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.4,
            },
          });

          const onVisibilityChange = () => {
            const hidden = document.hidden;
            for (const tween of tweens) {
              if (hidden) tween.pause();
              else tween.resume();
            }
          };

          document.addEventListener('visibilitychange', onVisibilityChange);
          return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
          };
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="ambient-halo-canvas no-print"
    >
      {HALO_ORBS.map((orb) => (
        <div
          key={orb.id}
          data-halo-orb={orb.id}
          className={`ambient-halo-orb ${orb.className}`}
          style={{
            backgroundColor: orb.colorVar,
            opacity: orb.opacityVar,
          }}
        />
      ))}
    </div>
  );
}
