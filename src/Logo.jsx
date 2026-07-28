import React from "react";

// The mark: the new candlestick-"S" logo, shipped as a single transparent
// PNG (it has internal shading/gradient baked in that isn't easily
// reproducible as flat currentColor SVG paths). Rendered at whatever size
// is requested; `bare` vs non-bare no longer changes rendering since the
// image has no separate background square to add/remove, but the prop is
// kept so existing call sites don't need to change.
export const LogoMark = ({ size = 32, rounded = "", className = "", bare = true }) => (
  <img
    src="/logo-mark.png"
    alt="Strike Journal"
    width={size}
    height={size}
    className={`shrink-0 object-contain ${rounded} ${className}`}
    style={{ width: size, height: size }}
  />
);

export const LogoFull = ({ size = 32, textClass = "text-lg", forceLight = false }) => (
  <div className="flex items-center gap-2.5">
    <LogoMark size={size} />
    <span className={`font-extrabold tracking-tight ${textClass}`}>
      <span className={forceLight ? "text-white" : "text-[var(--text-primary)]"}>Strike</span><span className="text-[var(--accent)]">Journal</span>
    </span>
  </div>
);
