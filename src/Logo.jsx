import React from "react";

// The mark: a strike (lightning bolt) cutting through a journal page,
// represented by two short ruled lines beneath it. Rendered as inline SVG
// so it matches favicon.svg exactly at every size.
//
// Pass `bare` when LogoMark sits inside a container that already provides
// its own colored background (e.g. a nav badge) — this renders just the
// bolt + lines using currentColor, with no background square of its own.
export const LogoMark = ({ size = 32, rounded = "rounded-xl", className = "", bare = false }) => {
  if (bare) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`}>
        <path d="M17.8 6.5 9.6 18.2h5.1l-1.1 7.3 8.8-12.4h-5.4l0.8-6.6z" fill="currentColor" />
        <rect x="8.5" y="24.6" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
        <rect x="16" y="24.6" width="7.5" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${rounded} ${className}`}
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset" }}
    >
      <defs>
        <linearGradient id="sj-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#sj-grad)" />
      <path d="M17.8 6.5 9.6 18.2h5.1l-1.1 7.3 8.8-12.4h-5.4l0.8-6.6z" fill="#09090b" />
      <rect x="8.5" y="24.6" width="6" height="1.5" rx="0.75" fill="#09090b" opacity="0.5" />
      <rect x="16" y="24.6" width="7.5" height="1.5" rx="0.75" fill="#09090b" opacity="0.5" />
    </svg>
  );
};

export const LogoFull = ({ size = 32, textClass = "text-lg" }) => (
  <div className="flex items-center gap-2.5">
    <LogoMark size={size} />
    <span className={`font-extrabold tracking-tight ${textClass}`}>
      <span className="text-[var(--text-primary)]">Strike</span><span className="text-[var(--accent)]">Journal</span>
    </span>
  </div>
);
