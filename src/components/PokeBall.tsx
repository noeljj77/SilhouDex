/** A Poké Ball: used for navigation, loading and empty states. Decorative. */
export function PokeBall({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="14" fill="#fff" stroke="#1b2236" strokeWidth="2.5" />
      <path d="M2 16a14 14 0 0 1 28 0Z" fill="#d3202b" stroke="#1b2236" strokeWidth="2.5" />
      <path d="M2 16h28" stroke="#1b2236" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#1b2236" strokeWidth="2.5" />
    </svg>
  );
}
