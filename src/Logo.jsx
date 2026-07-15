import React from "react";

// Strike Trading mark: a bold, angular "strike" bolt inside a rounded square.
// Reads clearly at 16px (nav) up to 40px+ (marketing) and works on light or dark fills.
export const LogoMark = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M14.2 2L4.5 13.2H10.8L9.4 22L19.5 10.2H12.9L14.2 2Z"
      fill="currentColor"
    />
  </svg>
);

// Full logo lockup: mark + wordmark. Used in the nav and footer.
export const Logo = ({ size = 32, textClassName = "", showText = true }) => (
  <div className="flex items-center gap-2">
    <div
      className="rounded-lg bg-blue-500 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.55)} className="text-black" />
    </div>
    {showText && (
      <span className={`font-bold text-white tracking-tight ${textClassName}`}>
        Strike Trading
      </span>
    )}
  </div>
);

export default Logo;
