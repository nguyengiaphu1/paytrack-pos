'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export const MATCH_MEDIA_CONDITIONS = {
  all: 'all',
  isDesktop: '(min-width: 640px)',
  isMobile: '(max-width: 639px)',
  finePointer: '(hover: hover) and (pointer: fine)',
  coarsePointer: '(pointer: coarse)',
  reduceMotion: '(prefers-reduced-motion: reduce)',
} as const;

export function ensureGsapInitialized(): void {
  if (typeof window === 'undefined' || registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, CustomEase);
  CustomEase.create('iosSheet', '0.32, 0.72, 0, 1');
  CustomEase.create('iosMove', '0.645, 0.045, 0.355, 1');
  CustomEase.create('iosAccordion', '0.77, 0, 0.175, 1');
  CustomEase.create('iosSpring', '0.22, 1, 0.36, 1');
  gsap.config({ force3D: true });
  gsap.defaults({
    duration: 0.25,
    ease: 'iosSheet',
    overwrite: 'auto',
  });
  registered = true;
}

export const GSAP_MOTION = {
  duration: {
    press: 0.095,
    release: 0.15,
    hover: 0.18,
    leave: 0.2,
    enter: 0.24,
    swap: 0.22,
    swapOut: 0.1,
    swapIn: 0.22,
    modalIn: 0.25,
    modalOut: 0.19,
    pageIn: 0.24,
    accordion: 0.25,
    shake: 0.36,
    counter: 0.38,
    reduced: 0.12,
  },
  ease: {
    enter: 'iosSheet',
    exit: 'power2.in',
    bouncy: 'back.out(1.45)',
    bouncySoft: 'back.out(1.2)',
    bouncySnap: 'back.out(1.85)',
    elastic: 'elastic.out(1, 0.55)',
    flip: 'iosMove',
    smooth: 'power2.out',
    ambient: 'sine.inOut',
    iosSheet: 'iosSheet',
    iosMove: 'iosMove',
    iosAccordion: 'iosAccordion',
    iosSpring: 'iosSpring',
  },
  stagger: {
    cards: 0.03,
    gridWave: 0.16,
    form: 0.03,
    modalChildren: 0.03,
  },
  lift: {
    cardY: -2,
    controlY: -1,
    pressScale: 0.97,
    cardPressScale: 0.985,
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

export { CustomEase, Flip, ScrollTrigger, gsap, useGSAP };
