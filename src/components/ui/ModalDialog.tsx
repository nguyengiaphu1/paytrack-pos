'use client';

import { useEffect, useRef, type ReactNode } from 'react';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

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

  if (!open) return null;

  const hasExplicitAnimation = /\banimate-(sheet-up|modal-in|drawer-in|fade-in)\b/.test(
    panelClassName
  );
  const resolvedPanelClassName = hasExplicitAnimation
    ? `${panelClassName} outline-none`
    : `animate-sheet-up sm:animate-modal-in ${panelClassName} outline-none`;

  return (
    <div
      className={backdropClassName}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
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
