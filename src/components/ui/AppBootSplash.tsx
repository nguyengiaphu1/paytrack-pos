'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';

const SESSION_BOOT_KEY = 'paytrack-boot-splash-shown';

/**
 * Lightweight zero-flash launch splash shown briefly once per browser/PWA session.
 * Respects Light/Dark canvas immediately and exits without artificial delay or
 * animation under prefers-reduced-motion.
 */
export function AppBootSplash() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible');

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_BOOT_KEY) === '1';
      window.sessionStorage.setItem(SESSION_BOOT_KEY, '1');
    } catch {
      // Ignore private browsing restrictions
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (alreadyShown || reducedMotion) {
      const immediate = window.setTimeout(() => setPhase('done'), 0);
      return () => window.clearTimeout(immediate);
    }

    const fadeTimer = window.setTimeout(() => setPhase('fading'), 240);
    const doneTimer = window.setTimeout(() => setPhase('done'), 480);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`no-print fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 transition-opacity duration-200 ease-out ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="glass-panel flex flex-col items-center rounded-[28px] px-10 py-8">
        <div className="glass-icon-orb mb-3.5 flex h-[74px] w-[74px] items-center justify-center rounded-[22px] p-1.5">
          <BrandMark className="h-16 w-16" />
        </div>
        <p className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
          PayTrack POS
        </p>
        <div className="glass-well mt-4 h-1.5 w-32 overflow-hidden rounded-full">
          <div className="boot-splash-bar h-full w-1/2 rounded-full bg-[var(--brand-jade)]" />
        </div>
      </div>
    </div>
  );
}
