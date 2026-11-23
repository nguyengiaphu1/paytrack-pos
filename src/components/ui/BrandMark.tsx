interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'h-9 w-9' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="512" height="512" rx="116" fill="var(--brand-jade)" />
      <rect x="116" y="96" width="244" height="308" rx="34" fill="#FFFFFF" />
      <rect x="158" y="156" width="160" height="24" rx="12" fill="var(--brand-jade)" />
      <rect
        x="158"
        y="208"
        width="118"
        height="24"
        rx="12"
        fill="var(--brand-jade)"
        fillOpacity="0.55"
      />
      <rect
        x="158"
        y="260"
        width="84"
        height="24"
        rx="12"
        fill="var(--brand-jade)"
        fillOpacity="0.35"
      />
      <circle cx="348" cy="348" r="88" fill="var(--brand-jade)" />
      <circle cx="348" cy="348" r="72" fill="#D1FAE5" />
      <path
        d="M314 349L338 373L386 322"
        stroke="var(--brand-jade)"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
