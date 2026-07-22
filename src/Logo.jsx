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
        <path d="M19.4 3.6 8.2 19.4h6.3l-1.5 9 12.8-15.8h-6.6l1.2-9z" fill="currentColor" />
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
      <rect width="32" height="32" rx="7" fill="url(#sj-grad)" />
      <path d="M19.4 3.6 8.2 19.4h6.3l-1.5 9 12.8-15.8h-6.6l1.2-9z" fill="#09090b" />
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
