import { useId } from "react";

/** MDEV-Reader mark: an open book with a bookmark ribbon on an indigo tile. */
export function LogoMark({ className }: { className?: string }) {
  const gradient = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradient} x1="3" y1="2" x2="29" y2="30">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradient})`} />
      <path d="M6 10c3.5-1 7-.5 10 1.5v13c-3-2-6.5-2.5-10-1.5z" fill="#fff" />
      <path
        d="M26 10c-3.5-1-7-.5-10 1.5v13c3-2 6.5-2.5 10-1.5z"
        fill="#fff"
        fillOpacity=".82"
      />
      <path d="M20.5 6h4.5v8.5l-2.25-1.7-2.25 1.7z" fill="#fbbf24" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-7" />
      <span className="font-semibold tracking-tight">MDEV-Reader</span>
    </span>
  );
}
