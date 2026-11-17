import { BookOpenCheck, Loader2 } from 'lucide-react';

interface BrandLoadingScreenProps {
  message?: string;
}

export function BrandLoadingScreen({
  message = 'Đang mở sổ bán hàng...',
}: BrandLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 text-center"
    >
      <div className="animate-fade-in flex flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-[var(--brand-jade)] text-white">
          <BookOpenCheck className="h-7 w-7" />
        </div>
        <p className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
          PayTrack POS
        </p>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          Sổ bán hàng &amp; công nợ cho cửa hàng
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-[14px] font-medium text-[var(--text-primary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-jade-text)]" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
