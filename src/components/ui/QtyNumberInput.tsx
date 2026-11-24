'use client';

import { useState } from 'react';
import { formatQtyForInput, parseQtyDraft, sanitizeQtyInput } from '@/lib/pos-draft';

interface QtyNumberInputProps {
  id?: string;
  value: number;
  onCommit: (nextQty: number) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Allows clearing to "" and typing decimal quantities (e.g. "2.5" or "2,5")
 * without trapping backspace, committing positive values immediately and
 * restoring the last valid quantity on blur if left blank.
 */
export function QtyNumberInput({
  id,
  value,
  onCommit,
  ariaLabel,
  className = '',
}: QtyNumberInputProps) {
  const [draft, setDraft] = useState<{ text: string; syncedValue: number }>(() => ({
    text: formatQtyForInput(value),
    syncedValue: value,
  }));

  const text = draft.syncedValue === value ? draft.text : formatQtyForInput(value);

  function handleChange(raw: string) {
    const cleaned = sanitizeQtyInput(raw);
    const parsed = parseQtyDraft(cleaned);
    if (parsed !== null) {
      setDraft({ text: cleaned, syncedValue: parsed });
      onCommit(parsed);
    } else {
      // Allow temporary empty or "." while editing without breaking value prop
      setDraft({ text: cleaned, syncedValue: value });
    }
  }

  function handleBlur() {
    const parsed = parseQtyDraft(text);
    if (parsed !== null) {
      setDraft({ text: formatQtyForInput(parsed), syncedValue: parsed });
      if (parsed !== value) onCommit(parsed);
    } else {
      setDraft({ text: formatQtyForInput(value), syncedValue: value });
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onFocus={(e) => e.currentTarget.select()}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
