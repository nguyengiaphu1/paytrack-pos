'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export function hasOpenModalDialog(): boolean {
  return openDialogStack.length > 0;
}

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  backdropClassName?: string;
  panelClassName: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
}

export function ModalDialog({
  open,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  backdropClassName = 'animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4',
  panelClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
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
          isDesktop: '(min-width: 640px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const isDesktop = Boolean(context.conditions?.isDesktop);

          if (!open && closing) {
            if (reduceMotion) {
              const id = window.setTimeout(() => setClosing(false), 0);
              return () => window.clearTimeout(id);
            }

            const exitTl = gsap.timeline({
              onComplete: () => setClosing(false),
            });
            exitTl.to(
              panelEl,
              {
                y: isDesktop ? 24 : 56,
                scale: isDesktop ? 0.96 : 1,
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
                  duration: 0.22,
                  ease: 'power2.out',
                  clearProps: 'opacity',
                },
                'open'
              );
            }

            enterTl.fromTo(
              panelEl,
              {
                y: isDesktop ? 36 : 64,
                scale: isDesktop ? 0.94 : 0.98,
                opacity: 0,
              },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                duration: GSAP_MOTION.duration.modalIn,
                ease: isDesktop ? GSAP_MOTION.ease.bouncySoft : 'power4.out',
                clearProps: 'transform,opacity',
              },
              'open'
            );

            const directChildren = Array.from(panelEl.children).filter(
              (child): child is HTMLElement =>
                child instanceof HTMLElement && !child.classList.contains('print-surface-light')
            );
            if (directChildren.length > 1) {
              enterTl.from(
                directChildren,
                {
                  y: 12,
                  opacity: 0,
                  duration: 0.28,
                  stagger: GSAP_MOTION.stagger.modalChildren,
                  ease: GSAP_MOTION.ease.enter,
                  clearProps: 'transform,opacity',
                },
                'open+=0.08'
              );
            }
          }
        }
      );

      return () => mm.revert();
    },
    { scope: backdropRef, dependencies: [open, closing, shouldRender] }
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialogId = Symbol('modal-dialog');
    openDialogStack.push(dialogId);

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (openDialogStack.length === 1) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
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

      if (openDialogStack.length === 0 && savedBodyOverflow !== null) {
        document.body.style.overflow = savedBodyOverflow;
        savedBodyOverflow = null;
      }

      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, closeOnEscape]);

  if (!shouldRender) return null;

  const hasExplicitAnimation = /\banimate-(sheet-up|modal-in|drawer-in|fade-in)\b/.test(
    panelClassName
  );
  const resolvedPanelClassName = hasExplicitAnimation
    ? `${panelClassName} outline-none`
    : `animate-sheet-up sm:animate-modal-in ${panelClassName} outline-none`;

  return (
    <div
      ref={backdropRef}
      className={`${backdropClassName} ${closing ? 'pointer-events-none' : ''}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onMouseDown={(e) => {
        if (!closing && closeOnBackdrop && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div ref={panelRef} tabIndex={-1} className={resolvedPanelClassName}>
        {children}
      </div>
    </div>
  );
}
