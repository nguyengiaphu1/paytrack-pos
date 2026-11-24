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
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
    >
      <div className="animate-fade-in glass-panel flex flex-col items-center rounded-[28px] px-10 py-8">
        <div className="glass-icon-orb mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-[22px] p-1.5">
          <BrandMark className="h-16 w-16" />
        </div>
        <p className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
          PayTrack POS
        </p>

        <div className="glass-well mt-4 h-2 w-40 overflow-hidden rounded-full p-0.5">
          <div className="boot-splash-bar h-full w-1/2 rounded-full bg-[var(--brand-jade)]" />
        </div>

        <p className="mt-3 text-[13px] font-medium text-[var(--text-secondary)]">
          {message}
        </p>
      </div>
    </div>
  );
}
