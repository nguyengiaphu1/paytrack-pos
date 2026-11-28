'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Tracks stacked open modals so Escape only closes the topmost dialog
// and body scroll lock releases only when the final modal closes.
const openDialogStack: symbol[] = [];
let savedBodyOverflow: string | null = null;
let savedHtmlOverflow: string | null = null;

export function hasOpenModalDialog(): boolean {
  return openDialogStack.length > 0;
}

function dispatchModalState(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('paytrack:modal-state', {
      detail: { openCount: openDialogStack.length },
    })
  );
}

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  backdropClassName?: string;
  panelClassName: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  disableSwipeDismiss?: boolean;
  children: ReactNode;
}

export function ModalDialog({
  open,
  onClose,
  onExited,
  ariaLabel,
  ariaLabelledBy,
  backdropClassName = 'animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4',
  panelClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
  disableSwipeDismiss = false,
  children,
}: ModalDialogProps) {
  const [closing, setClosing] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  const shouldRender = open || closing;

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onExitedRef = useRef(onExited);
  const pointerDownOnBackdropRef = useRef(false);
  const exitedNotifiedRef = useRef(false);

  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    dy: number;
  }>({
    active: false,
    pointerId: -1,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    dy: 0,
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  useEffect(() => {
    if (open) {
      exitedNotifiedRef.current = false;
    }
  }, [open]);

  const finishClose = useCallback(() => {
    setClosing(false);
    if (!exitedNotifiedRef.current) {
      exitedNotifiedRef.current = true;
      onExitedRef.current?.();
    }
  }, []);

  // Fail-safe timer guarantees modal never freezes in closing state on iOS Safari
  useEffect(() => {
    if (open || !closing) return;
    const failsafeMs = Math.round(GSAP_MOTION.duration.modalOut * 1000) + 160;
    const id = window.setTimeout(finishClose, failsafeMs);
    return () => window.clearTimeout(id);
  }, [open, closing, finishClose]);

  useGSAP(
    () => {
      if (!shouldRender) return;
      ensureGsapInitialized();
      const backdropEl = backdropRef.current;
      const panelEl = panelRef.current;
      if (!panelEl) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          all: 'all',
          isDesktop: '(min-width: 640px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const isDesktop = Boolean(context.conditions?.isDesktop);

          if (!open && closing) {
            if (reduceMotion) {
              const id = window.setTimeout(finishClose, 0);
              return () => window.clearTimeout(id);
            }

            const exitTl = gsap.timeline({
              onComplete: finishClose,
            });
            exitTl.to(
              panelEl,
              {
                y: isDesktop ? 8 : 56,
                scale: isDesktop ? 0.97 : 1,
                opacity: 0,
                duration: GSAP_MOTION.duration.modalOut,
                ease: GSAP_MOTION.ease.exit,
              },
              0
            );
            if (backdropEl) {
              exitTl.to(
                backdropEl,
                {
                  opacity: 0,
                  duration: GSAP_MOTION.duration.modalOut,
                  ease: GSAP_MOTION.ease.exit,
                },
                0
              );
            }
            return;
          }

          if (open) {
            if (reduceMotion) {
              if (backdropEl) {
                gsap.fromTo(
                  backdropEl,
                  { opacity: 0 },
                  {
                    opacity: 1,
                    duration: GSAP_MOTION.duration.reduced,
                    ease: 'power2.out',
                    clearProps: 'opacity',
                  }
                );
              }
              gsap.fromTo(
                panelEl,
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

            const enterTl = gsap.timeline();
            enterTl.addLabel('open', 0);

            if (backdropEl) {
              enterTl.fromTo(
                backdropEl,
                { opacity: 0 },
                {
                  opacity: 1,
                  duration: 0.2,
                  ease: 'power2.out',
                  clearProps: 'opacity',
                },
                'open'
              );
            }

            enterTl.fromTo(
              panelEl,
              {
                y: isDesktop ? 10 : 44,
                scale: isDesktop ? 0.97 : 0.985,
                opacity: 0,
              },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                duration: GSAP_MOTION.duration.modalIn,
                ease: GSAP_MOTION.ease.iosSheet,
                clearProps: 'transform,opacity',
              },
              'open'
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: backdropRef, dependencies: [open, closing, shouldRender, finishClose] }
  );

  useEffect(() => {
    if (!open) return;

    const dialogId = Symbol('modal-dialog');
    openDialogStack.push(dialogId);
    dispatchModalState();

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (openDialogStack.length === 1) {
      savedBodyOverflow = document.body.style.overflow;
      savedHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    const panelEl = panelRef.current;
    if (panelEl) {
      const autoFocusTarget = panelEl.querySelector<HTMLElement>('[data-autofocus]');
      if (autoFocusTarget) {
        autoFocusTarget.focus({ preventScroll: true });
      } else {
        panelEl.focus({ preventScroll: true });
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Only the topmost stacked modal handles keyboard events
      if (openDialogStack[openDialogStack.length - 1] !== dialogId) return;

      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) {
          e.preventDefault();
          panelRef.current.focus({ preventScroll: true });
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || active === panelRef.current || !panelRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const idx = openDialogStack.lastIndexOf(dialogId);
      if (idx >= 0) openDialogStack.splice(idx, 1);
      dispatchModalState();

      if (openDialogStack.length === 0) {
        if (savedBodyOverflow !== null) {
          document.body.style.overflow = savedBodyOverflow;
          savedBodyOverflow = null;
        }
        if (savedHtmlOverflow !== null) {
          document.documentElement.style.overflow = savedHtmlOverflow;
          savedHtmlOverflow = null;
        }
      }

      if (previouslyFocused && document.contains(previouslyFocused)) {
        const isTouchField =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(pointer: coarse)').matches &&
          previouslyFocused.matches('input, textarea, select');
        if (!isTouchField) {
          previouslyFocused.focus({ preventScroll: true });
        }
      }
    };
  }, [open, closeOnEscape]);

  const canSwipeDismiss = open && !closing && closeOnBackdrop && !disableSwipeDismiss;

  function handleSwipePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canSwipeDismiss) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const onGrabber = Boolean(target.closest('[data-modal-grabber]'));
    const onHeader = Boolean(target.closest('.glass-modal-header'));
    if (!onGrabber && !onHeader) return;
    if (target.closest('button, a, input, select, textarea')) return;

    const panelEl = panelRef.current;
    if (!panelEl || panelEl.scrollTop > 0) return;

    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: performance.now(),
      velocity: 0,
      dy: 0,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events without pointer capture
    }
  }

  function handleSwipePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    const panelEl = panelRef.current;
    const backdropEl = backdropRef.current;
    if (!panelEl) return;

    const now = performance.now();
    const dt = Math.max(8, now - drag.lastTime);
    const stepDy = e.clientY - drag.lastY;
    drag.velocity = stepDy / dt;
    drag.lastY = e.clientY;
    drag.lastTime = now;

    const rawDy = e.clientY - drag.startY;
    drag.dy = rawDy;

    ensureGsapInitialized();
    const setY = gsap.quickSetter(panelEl, 'y', 'px');

    if (rawDy >= 0) {
      setY(rawDy);
      if (backdropEl) {
        backdropEl.style.opacity = String(Math.max(0.45, 1 - rawDy / 420));
      }
    } else {
      // Rubber-band resistance when pulling upward past top boundary
      const damped = rawDy / (1 + Math.abs(rawDy) / 140);
      setY(damped);
    }
  }

  function handleSwipePointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    drag.active = false;

    const panelEl = panelRef.current;
    const backdropEl = backdropRef.current;
    if (!panelEl) return;

    ensureGsapInitialized();
    const shouldDismiss = drag.dy > 88 || drag.velocity > 0.55;

    if (shouldDismiss) {
      const speedPxPerSec = Math.max(500, drag.velocity * 1000);
      const remainingDist = Math.max(120, panelEl.offsetHeight * 0.45);
      const flickDuration = gsap.utils.clamp(0.12, 0.22, remainingDist / speedPxPerSec);

      gsap.to(panelEl, {
        y: Math.max(panelEl.offsetHeight * 0.5, 200),
        opacity: 0,
        duration: flickDuration,
        ease: 'power2.out',
      });
      if (backdropEl) {
        gsap.to(backdropEl, {
          opacity: 0,
          duration: flickDuration,
          ease: 'power2.out',
        });
      }
      onCloseRef.current();
    } else {
      gsap.to(panelEl, {
        y: 0,
        duration: 0.32,
        ease: GSAP_MOTION.ease.iosSpring,
        clearProps: 'transform',
      });
      if (backdropEl) {
        gsap.to(backdropEl, {
          opacity: 1,
          duration: 0.22,
          ease: 'power2.out',
          clearProps: 'opacity',
        });
      }
    }
  }

  if (!shouldRender) return null;

  const hasExplicitAnimation = /\banimate-(sheet-up|modal-in|drawer-in|fade-in)\b/.test(
    panelClassName
  );
  const resolvedPanelClassName = hasExplicitAnimation
    ? `overscroll-contain ${panelClassName} outline-none`
    : `animate-sheet-up sm:animate-modal-in overscroll-contain ${panelClassName} outline-none`;

  return (
    <div
      ref={backdropRef}
      className={`overscroll-contain ${backdropClassName} ${closing ? 'pointer-events-none' : ''}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onPointerDown={(e) => {
        pointerDownOnBackdropRef.current =
          !closing && closeOnBackdrop && e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const startedOnBackdrop = pointerDownOnBackdropRef.current;
        pointerDownOnBackdropRef.current = false;
        if (startedOnBackdrop && !closing && closeOnBackdrop && e.target === e.currentTarget) {
          e.stopPropagation();
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={resolvedPanelClassName}
        onPointerDown={handleSwipePointerDown}
        onPointerMove={handleSwipePointerMove}
        onPointerUp={handleSwipePointerEnd}
        onPointerCancel={handleSwipePointerEnd}
      >
        {canSwipeDismiss && (
          <div
            data-modal-grabber="true"
            className="flex shrink-0 touch-none items-center justify-center pt-2 pb-1 sm:hidden"
          >
            <span
              aria-hidden="true"
              className="h-1 w-9 rounded-full bg-[var(--border-default)]"
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
