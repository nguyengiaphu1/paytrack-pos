'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function ensureGsapInitialized(): void {
  if (typeof window === 'undefined' || registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);
  gsap.defaults({
    duration: 0.34,
    ease: 'power3.out',
    overwrite: 'auto',
  });
  registered = true;
}

export const GSAP_MOTION = {
  duration: {
    press: 0.1,
    release: 0.3,
    hover: 0.24,
    leave: 0.28,
    enter: 0.34,
    swapOut: 0.12,
    swapIn: 0.28,
    modalIn: 0.42,
    modalOut: 0.2,
    pageIn: 0.38,
    counter: 0.55,
    reduced: 0.12,
  },
  ease: {
    enter: 'power3.out',
    exit: 'power2.in',
    bouncy: 'back.out(1.65)',
    bouncySoft: 'back.out(1.3)',
    bouncySnap: 'back.out(2.1)',
    elastic: 'elastic.out(1, 0.55)',
    flip: 'power3.inOut',
    smooth: 'power2.out',
    ambient: 'sine.inOut',
  },
  stagger: {
    cards: 0.038,
    gridWave: 0.28,
    form: 0.042,
    modalChildren: 0.045,
  },
  lift: {
    cardY: -3,
    controlY: -1.5,
    pressScale: 0.965,
    cardPressScale: 0.988,
  },
} as const;

export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isFinePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export { Flip, ScrollTrigger, gsap, useGSAP };
