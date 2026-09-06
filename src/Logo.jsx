import React, { useId } from "react";

// The mark: "Strike" — three ascending blade segments tapering to a point,
// built from flat geometric shapes so it holds up at any size with zero
// raster artifacts. Rendered as inline SVG (not an <img>) so it's crisp on
// every display and needs no extra network request. `bare`/`rounded` are
// kept as accepted props so existing call sites don't need to change, even
// though this mark has no separate background square to add/remove.
export const LogoMark = ({ size = 32, rounded = "", className = "", bare = true }) => {
  const gradId = useId();
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Strike Journal"
      className={`shrink-0 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0.7" y2="0">
          <stop offset="0%" stopColor="#4F7CFF" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <path d="M13,78 L55,78 L48,64 L20,64 Z" fill={`url(#${gradId})`} />
      <path d="M23,60 L65,60 L58,46 L30,46 Z" fill={`url(#${gradId})`} />
      <path d="M40,42 L75,42 L60,20 Z" fill={`url(#${gradId})`} />
    </svg>
  );
};

export const LogoFull = ({ size = 32, textClass = "text-lg", forceLight = false }) => (
  <div className="flex items-center gap-2.5">
    <LogoMark size={size} />
    <span className={`font-extrabold tracking-tight ${textClass}`}>
      <span className={forceLight ? "text-white" : "text-[var(--text-primary)]"}>Strike</span><span className="text-[var(--accent)]">Journal</span>
    </span>
  </div>
);
