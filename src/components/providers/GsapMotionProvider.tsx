'use client';

import type { ReactNode } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, ScrollTrigger, useGSAP } from '@/lib/gsap';

const INTERACTIVE_CONTROL_SELECTOR = [
  '.glass-btn-primary',
  '.glass-btn-secondary',
  '.glass-btn-danger',
  '.glass-solid-control',
  '.glass-chip',
  '.glass-chip-active',
  '.press-tactile',
].join(', ');

const CARD_SELECTOR = '.glass-card-interactive';
const INPUT_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]), select, textarea';

function isDisabledOrPrint(el: HTMLElement): boolean {
  if (el.closest('.print-surface-light')) return true;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return true;
  return false;
}

function getLeadingInputIcon(field: HTMLElement): SVGSVGElement | null {
  const parent = field.parentElement;
  if (!parent) return null;
  const icon = parent.querySelector<SVGSVGElement>('svg');
  if (!icon || icon.closest('button')) return null;
  return icon;
}

function playDampedErrorShake(el: HTMLElement, withFadeIn = false): void {
  if (!el.isConnected || el.closest('.print-surface-light')) return;
  const tl = gsap.timeline();
  if (withFadeIn) {
    tl.fromTo(
      el,
      { autoAlpha: 0, y: -6 },
      { autoAlpha: 1, y: 0, duration: 0.14, ease: 'power2.out' }
    );
  }
  tl.to(el, {
    keyframes: [
      { x: -10, duration: 0.06 },
      { x: 10, duration: 0.06 },
      { x: -6, duration: 0.06 },
      { x: 6, duration: 0.06 },
      { x: -3, duration: 0.06 },
      { x: 0, duration: 0.06 },
    ],
    ease: 'power1.inOut',
    clearProps: 'transform,opacity,visibility',
  });
}

/**
 * Global multi-archetype GSAP choreography engine:
 * - Cards: subtle 3D perspective tilt on fine pointers via gsap.utils.mapRange & clamp
 * - Hover-parent move-child: stable hit target with smooth SVG icon glide
 * - Tactile press (scale: 0.97 / 0.985) with touch scroll-cancel (> 8px) for 60fps iPhone
 * - Wrong-input / alert damped horizontal shake (360ms)
 * - Toasts, badges, [data-gsap-reveal] & [data-gsap-scroll] batches (< 300ms iOS curves)
 */
export function GsapMotionProvider({ children }: { children: ReactNode }) {
  useGSAP(() => {
    ensureGsapInitialized();

    const mm = gsap.matchMedia();
    mm.add(
      {
        all: 'all',
        reduceMotion: '(prefers-reduced-motion: reduce)',
        finePointer: '(hover: hover) and (pointer: fine)',
      },
      (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion);
        const finePointer = Boolean(context.conditions?.finePointer);

        if (reduceMotion) {
          delete document.documentElement.dataset.gsapReady;
          return;
        }

        document.documentElement.dataset.gsapReady = 'true';

        let hoveredCard: HTMLElement | null = null;
        let hoveredControl: HTMLElement | null = null;
        let pressedTarget: HTMLElement | null = null;
        let pressStartX = 0;
        let pressStartY = 0;
        let tiltRafPending = false;
        let lastPointerEvent: PointerEvent | null = null;

        const resetCard = (card: HTMLElement) => {
          gsap.to(card, {
            y: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: GSAP_MOTION.duration.leave,
            ease: GSAP_MOTION.ease.smooth,
            clearProps: 'transform',
          });
        };

        const applyCardTilt = () => {
          tiltRafPending = false;
          if (!finePointer || !hoveredCard || !lastPointerEvent || !hoveredCard.isConnected) {
            return;
          }
          const rect = hoveredCard.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          const relX = lastPointerEvent.clientX - rect.left;
          const relY = lastPointerEvent.clientY - rect.top;
          const rotY = gsap.utils.clamp(
            -2.2,
            2.2,
            gsap.utils.mapRange(0, rect.width, -2.2, 2.2, relX)
          );
          const rotX = gsap.utils.clamp(
            -1.8,
            1.8,
            gsap.utils.mapRange(0, rect.height, 1.8, -1.8, relY)
          );

          gsap.to(hoveredCard, {
            y: GSAP_MOTION.lift.cardY,
            rotateX: rotX,
            rotateY: rotY,
            transformPerspective: 900,
            duration: 0.2,
            ease: GSAP_MOTION.ease.smooth,
            overwrite: 'auto',
          });
        };

        const onPointerMove = (e: PointerEvent) => {
          if (pressedTarget && !finePointer) {
            if (Math.hypot(e.clientX - pressStartX, e.clientY - pressStartY) > 8) {
              const cancelled = pressedTarget;
              pressedTarget = null;
              gsap.to(cancelled, {
                scale: 1,
                duration: 0.12,
                ease: 'power2.out',
                clearProps: 'transform',
              });
            }
          }

          if (!finePointer || !hoveredCard) return;
          lastPointerEvent = e;
          if (!tiltRafPending) {
            tiltRafPending = true;
            window.requestAnimationFrame(applyCardTilt);
          }
        };

        const onPointerOver = (e: PointerEvent) => {
          if (!finePointer) return;
          const target = e.target as HTMLElement | null;
          if (!target) return;

          const card = target.closest<HTMLElement>(CARD_SELECTOR);
          if (card && card !== hoveredCard && !isDisabledOrPrint(card)) {
            if (hoveredCard && !hoveredCard.contains(card)) {
              resetCard(hoveredCard);
            }
            hoveredCard = card;
            gsap.to(card, {
              y: GSAP_MOTION.lift.cardY,
              transformPerspective: 900,
              duration: GSAP_MOTION.duration.hover,
              ease: GSAP_MOTION.ease.smooth,
            });
          }

          // Hover parent, move child icon without shifting hit-area bounds off cursor
          const control = target.closest<HTMLElement>(INTERACTIVE_CONTROL_SELECTOR);
          if (
            control &&
            control !== hoveredControl &&
            !control.matches(CARD_SELECTOR) &&
            !isDisabledOrPrint(control)
          ) {
            if (hoveredControl && !hoveredControl.contains(control)) {
              gsap.to(hoveredControl, {
                y: 0,
                duration: GSAP_MOTION.duration.leave,
                ease: GSAP_MOTION.ease.smooth,
                clearProps: 'transform',
              });
              const prevIcon = hoveredControl.querySelector<SVGSVGElement>('svg');
              if (prevIcon && !prevIcon.classList.contains('animate-spin')) {
                gsap.to(prevIcon, {
                  x: 0,
                  scale: 1,
                  duration: GSAP_MOTION.duration.leave,
                  clearProps: 'transform',
                });
              }
            }
            hoveredControl = control;
            const isPrimary = control.classList.contains('glass-btn-primary');
            if (isPrimary) {
              gsap.to(control, {
                y: GSAP_MOTION.lift.controlY,
                duration: GSAP_MOTION.duration.hover,
                ease: GSAP_MOTION.ease.smooth,
              });
            }
            const icon = control.querySelector<SVGSVGElement>('svg');
            if (icon && !icon.classList.contains('animate-spin')) {
              gsap.to(icon, {
                x: isPrimary ? 2 : 0,
                scale: 1.06,
                duration: GSAP_MOTION.duration.hover,
                ease: GSAP_MOTION.ease.iosSheet,
              });
            }
          }
        };

        const onPointerOut = (e: PointerEvent) => {
          if (!finePointer) return;
          const related = e.relatedTarget as Node | null;

          if (hoveredCard && (!related || !hoveredCard.contains(related))) {
            resetCard(hoveredCard);
            hoveredCard = null;
          }

          if (hoveredControl && (!related || !hoveredControl.contains(related))) {
            gsap.to(hoveredControl, {
              y: 0,
              duration: GSAP_MOTION.duration.leave,
              ease: GSAP_MOTION.ease.smooth,
              clearProps: 'transform',
            });
            const icon = hoveredControl.querySelector<SVGSVGElement>('svg');
            if (icon && !icon.classList.contains('animate-spin')) {
              gsap.to(icon, {
                x: 0,
                scale: 1,
                duration: GSAP_MOTION.duration.leave,
                clearProps: 'transform',
              });
            }
            hoveredControl = null;
          }
        };

        const onPointerDown = (e: PointerEvent) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const interactive =
            target.closest<HTMLElement>(INTERACTIVE_CONTROL_SELECTOR) ??
            target.closest<HTMLElement>(CARD_SELECTOR);
          if (!interactive || isDisabledOrPrint(interactive)) return;

          pressedTarget = interactive;
          pressStartX = e.clientX;
          pressStartY = e.clientY;
          const isCard = interactive.matches(CARD_SELECTOR);
          gsap.to(interactive, {
            scale: isCard ? GSAP_MOTION.lift.cardPressScale : GSAP_MOTION.lift.pressScale,
            duration: GSAP_MOTION.duration.press,
            ease: 'power2.out',
          });
        };

        const releasePressed = () => {
          if (!pressedTarget) return;
          const target = pressedTarget;
          pressedTarget = null;
          const isHovering = finePointer && (target === hoveredCard || target === hoveredControl);
          gsap.to(target, {
            scale: 1,
            duration: GSAP_MOTION.duration.release,
            ease: 'power2.out',
            ...(isHovering ? {} : { clearProps: 'transform' }),
          });
        };

        const onFocusIn = (e: FocusEvent) => {
          const target = e.target as HTMLElement | null;
          if (!target || !target.matches(INPUT_SELECTOR) || isDisabledOrPrint(target)) return;

          const icon = getLeadingInputIcon(target);
          if (icon) {
            gsap.to(icon, {
              x: 1.5,
              scale: 1.08,
              duration: 0.18,
              ease: GSAP_MOTION.ease.iosSheet,
            });
          }
        };

        const onFocusOut = (e: FocusEvent) => {
          const target = e.target as HTMLElement | null;
          if (!target || !target.matches(INPUT_SELECTOR) || isDisabledOrPrint(target)) return;

          const icon = getLeadingInputIcon(target);
          if (icon) {
            gsap.to(icon, {
              x: 0,
              scale: 1,
              duration: GSAP_MOTION.duration.leave,
              clearProps: 'transform',
            });
          }
        };

        // ScrollTrigger.batch wave for below-the-fold [data-gsap-scroll] sections/cards
        const scrollTriggers: ScrollTrigger[] = [];
        const initScrollBatches = () => {
          const nodes = gsap.utils
            .toArray<HTMLElement>('[data-gsap-scroll]')
            .filter(
              (el) =>
                el.dataset.gsapScrollDone !== '1' &&
                !el.closest('.print-surface-light') &&
                !el.closest('[role="dialog"]')
            );
          if (nodes.length === 0) return;

          for (const el of nodes) {
            el.dataset.gsapScrollDone = '1';
          }

          gsap.set(nodes, { y: 16, scale: 0.97, autoAlpha: 0 });
          const created = ScrollTrigger.batch(nodes, {
            start: 'top 94%',
            once: true,
            interval: 0.06,
            batchMax: 6,
            onEnter: (batch) => {
              gsap.to(batch, {
                y: 0,
                scale: 1,
                autoAlpha: 1,
                duration: 0.28,
                stagger: { amount: 0.14, from: 'start' },
                ease: GSAP_MOTION.ease.iosSheet,
                clearProps: 'transform,opacity,visibility',
              });
            },
          });
          scrollTriggers.push(...created);
        };

        initScrollBatches();

        // Dynamic alert shake, toast, badge pop, invalid-field shake & reveal batched on rAF
        const animatedNodes = new WeakSet<Element>();
        const pendingAlerts = new Set<HTMLElement>();
        const pendingInvalidFields = new Set<HTMLElement>();
        const pendingToasts = new Set<HTMLElement>();
        const pendingBadges = new Set<HTMLElement>();
        const pendingReveals = new Set<HTMLElement>();
        let pendingScrollInit = false;
        let rafId: number | null = null;

        const flushMutations = () => {
          rafId = null;

          if (pendingAlerts.size > 0) {
            for (const alertEl of pendingAlerts) {
              playDampedErrorShake(alertEl, true);
            }
            pendingAlerts.clear();
          }

          if (pendingInvalidFields.size > 0) {
            for (const fieldEl of pendingInvalidFields) {
              playDampedErrorShake(fieldEl, false);
            }
            pendingInvalidFields.clear();
          }

          if (pendingToasts.size > 0) {
            for (const toast of pendingToasts) {
              if (!toast.isConnected || toast.closest('.print-surface-light')) continue;
              gsap.fromTo(
                toast,
                { y: -12, scale: 0.97, autoAlpha: 0 },
                {
                  y: 0,
                  scale: 1,
                  autoAlpha: 1,
                  duration: 0.25,
                  ease: GSAP_MOTION.ease.iosSheet,
                  clearProps: 'transform,opacity,visibility',
                }
              );
            }
            pendingToasts.clear();
          }

          if (pendingBadges.size > 0) {
            for (const badge of pendingBadges) {
              if (!badge.isConnected || badge.closest('.print-surface-light')) continue;
              gsap.fromTo(
                badge,
                { scale: 0.92, opacity: 0.75 },
                {
                  scale: 1,
                  opacity: 1,
                  duration: 0.22,
                  ease: GSAP_MOTION.ease.iosSheet,
                  clearProps: 'transform,opacity',
                }
              );
            }
            pendingBadges.clear();
          }

          if (pendingReveals.size > 0) {
            const items = Array.from(pendingReveals)
              .filter((el) => el.isConnected && !el.closest('.print-surface-light'))
              .slice(0, 10);
            if (items.length > 0) {
              gsap.fromTo(
                items,
                { y: 14, scale: 0.97, autoAlpha: 0 },
                {
                  y: 0,
                  scale: 1,
                  autoAlpha: 1,
                  duration: 0.25,
                  stagger: GSAP_MOTION.stagger.cards,
                  ease: GSAP_MOTION.ease.iosSheet,
                  clearProps: 'transform,opacity,visibility',
                }
              );
            }
            pendingReveals.clear();
          }

          if (pendingScrollInit) {
            pendingScrollInit = false;
            initScrollBatches();
            ScrollTrigger.refresh();
          }
        };

        const scheduleFlush = () => {
          if (
            (pendingAlerts.size > 0 ||
              pendingInvalidFields.size > 0 ||
              pendingToasts.size > 0 ||
              pendingBadges.size > 0 ||
              pendingReveals.size > 0 ||
              pendingScrollInit) &&
            rafId === null
          ) {
            rafId = window.requestAnimationFrame(flushMutations);
          }
        };

        const queueElement = (node: Node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest('.print-surface-light')) return;

          const inDialog = Boolean(node.closest('[role="dialog"]'));

          const checkMatch = (el: HTMLElement) => {
            if (animatedNodes.has(el)) return;
            if (el.matches('[role="alert"]')) {
              animatedNodes.add(el);
              pendingAlerts.add(el);
            } else if (el.getAttribute('aria-invalid') === 'true') {
              animatedNodes.add(el);
              pendingInvalidFields.add(el);
            } else if (inDialog) {
              return;
            } else if (el.matches('[data-gsap-toast]')) {
              animatedNodes.add(el);
              pendingToasts.add(el);
            } else if (el.matches('.animate-badge-pop')) {
              animatedNodes.add(el);
              pendingBadges.add(el);
            } else if (el.matches('[data-gsap-reveal]')) {
              animatedNodes.add(el);
              pendingReveals.add(el);
            } else if (el.matches('[data-gsap-scroll]')) {
              pendingScrollInit = true;
            }
          };

          checkMatch(node);
          node
            .querySelectorAll<HTMLElement>(
              '[data-gsap-toast], [role="alert"], [aria-invalid="true"], .animate-badge-pop, [data-gsap-reveal], [data-gsap-scroll]'
            )
            .forEach(checkMatch);

          scheduleFlush();
        };

        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (
              m.type === 'attributes' &&
              m.attributeName === 'aria-invalid' &&
              m.target instanceof HTMLElement &&
              m.target.getAttribute('aria-invalid') === 'true'
            ) {
              pendingInvalidFields.add(m.target);
              scheduleFlush();
              continue;
            }
            for (const added of m.addedNodes) {
              queueElement(added);
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['aria-invalid'],
        });

        document.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('pointerover', onPointerOver, { passive: true });
        document.addEventListener('pointerout', onPointerOut, { passive: true });
        document.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointerup', releasePressed, { passive: true });
        window.addEventListener('pointercancel', releasePressed, { passive: true });
        document.addEventListener('focusin', onFocusIn, { passive: true });
        document.addEventListener('focusout', onFocusOut, { passive: true });

        return () => {
          delete document.documentElement.dataset.gsapReady;
          observer.disconnect();
          for (const st of scrollTriggers) st.kill();
          if (rafId !== null) window.cancelAnimationFrame(rafId);
          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerover', onPointerOver);
          document.removeEventListener('pointerout', onPointerOut);
          document.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointerup', releasePressed);
          window.removeEventListener('pointercancel', releasePressed);
          document.removeEventListener('focusin', onFocusIn);
          document.removeEventListener('focusout', onFocusOut);
        };
      }
    );

    return () => {
      delete document.documentElement.dataset.gsapReady;
      mm.revert();
    };
  });

  return <>{children}</>;
}
