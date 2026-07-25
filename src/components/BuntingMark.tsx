interface Props {
  size?: number;
  className?: string;
}

/**
 * The Flourish Friends "Friends Bunting" logo mark — three party pennants
 * on a sagging string. Transparent background; drop it on any surface.
 * Master source lives in scripts/generateBranding.mjs (keep the two in sync).
 */
export function BuntingMark({ size = 96, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Flourish Friends"
    >
      <path d="M118 214 L196 236 L150 330 Z" fill="#38bdf8" />
      <path d="M220 246 L296 246 L258 340 Z" fill="#863bff" />
      <path d="M318 236 L396 214 L362 330 Z" fill="#fb7185" />
      <circle cx="150" cy="330" r="9" fill="#38bdf8" />
      <circle cx="258" cy="340" r="9" fill="#863bff" />
      <circle cx="362" cy="330" r="9" fill="#fb7185" />
      <path
        d="M92 196 Q256 268 420 196"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={11}
        strokeLinecap="round"
      />
      <circle cx="92" cy="196" r="8" fill="#fbbf24" />
      <circle cx="420" cy="196" r="8" fill="#fbbf24" />
    </svg>
  );
}
