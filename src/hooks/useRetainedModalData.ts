'use client';

import { useCallback, useState } from 'react';

/**
 * Retains the last non-null modal payload while ModalDialog runs its exit
 * transition so unmount-gated drawers/modals slide out cleanly instead of snapping.
 */
export function useRetainedModalData<T>(open: boolean, data: T | null) {
  const [retained, setRetained] = useState<T | null>(data);

  if (open && data !== null && retained !== data) {
    setRetained(data);
  }

  const handleExited = useCallback(() => {
    setRetained(null);
  }, []);

  return {
    renderedData: open && data !== null ? data : retained,
    isOpen: Boolean(open && data !== null),
    handleExited,
  };
}
