import { BrandMark } from './BrandMark';

interface BrandLoadingScreenProps {
  message?: string;
}

export function BrandLoadingScreen({
  message = 'Đang mở sổ...',
}: BrandLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 text-center"
    >
      <div className="animate-fade-in flex flex-col items-center">
        <BrandMark className="mb-4 h-16 w-16" />
        <p className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
          PayTrack POS
        </p>

        <div className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <div className="boot-splash-bar h-full w-1/2 rounded-full bg-[var(--brand-jade)]" />
        </div>

        <p className="mt-3 text-[13px] font-medium text-[var(--text-secondary)]">
          {message}
        </p>
      </div>
    </div>
  );
}
