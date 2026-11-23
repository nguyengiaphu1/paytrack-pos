'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  detectLikelyFullVndMistake,
  formatVndToKInput,
  parseKToVnd,
  sanitizeKInput,
} from '@/lib/currency-k';
import { formatVND } from '@/lib/vietnamese';

interface VndKInputProps {
  valueVnd: number | null;
  onChangeVnd: (vnd: number | null) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  compact?: boolean;
  align?: 'left' | 'right';
  showPreview?: boolean;
  className?: string;
}

export function VndKInput({
  valueVnd,
  onChangeVnd,
  id,
  placeholder = '0',
  required = false,
  disabled = false,
  ariaLabel,
  compact = false,
  align = 'left',
  showPreview = false,
  className = '',
}: VndKInputProps) {
  const [draft, setDraft] = useState<{ text: string; syncedVnd: number | null }>(() => ({
    text: formatVndToKInput(valueVnd),
    syncedVnd: valueVnd,
  }));

  const text = draft.syncedVnd === valueVnd ? draft.text : formatVndToKInput(valueVnd);
  const mistake = detectLikelyFullVndMistake(text);

  function handleChange(raw: string) {
    const cleaned = sanitizeKInput(raw);
    const parsed = parseKToVnd(cleaned);
    setDraft({ text: cleaned, syncedVnd: parsed });
    onChangeVnd(parsed);
  }

  function handleApplySuggested() {
    if (!mistake) return;
    setDraft({ text: mistake.suggestedK, syncedVnd: mistake.suggestedVnd });
    onChangeVnd(mistake.suggestedVnd);
  }

  return (
    <div className={className}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          value={text}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          className={`font-mono-tabular w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[16px] font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-jade)] disabled:opacity-60 ${
            compact ? 'min-h-[44px] py-1.5 pl-2.5 pr-[58px]' : 'min-h-[46px] py-2 pl-3.5 pr-[66px]'
          } ${align === 'right' ? 'text-right' : 'text-left'}`}
        />
        <span
          aria-hidden="true"
          className={`font-mono-tabular pointer-events-none absolute right-2.5 select-none font-semibold text-[var(--text-secondary)] ${
            compact ? 'text-[13px]' : 'text-[14px]'
          }`}
        >
          .000đ
        </span>
      </div>

      {showPreview && valueVnd !== null && valueVnd > 0 && !mistake && (
        <p className="font-mono-tabular mt-1 text-[12px] text-[var(--text-secondary)]">
          = {formatVND(valueVnd)}
        </p>
      )}

      {mistake && (
        <div
          role="alert"
          className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] px-2.5 py-1.5 text-[12px] text-[var(--status-debt)]"
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Đang là <strong className="font-mono-tabular">{formatVND(mistake.enteredVnd)}</strong>{' '}
              — ý bạn là <strong className="font-mono-tabular">{formatVND(mistake.suggestedVnd)}</strong>?
            </span>
          </span>
          <button
            type="button"
            onClick={handleApplySuggested}
            className="press-tactile min-h-[44px] shrink-0 rounded-md border border-[var(--status-debt)] bg-[var(--bg-surface)] px-2.5 text-[12px] font-bold text-[var(--status-debt)]"
          >
            Đổi thành {mistake.suggestedK}
          </button>
        </div>
      )}
    </div>
  );
}
