import React from "react";
import { Zap } from "lucide-react";

export const LogoMark = ({ size = 32, rounded = "rounded-xl" }) => (
  <div
    className={`relative flex items-center justify-center ${rounded} shrink-0`}
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 55%, #1d4ed8 100%)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
    }}
  >
    <Zap size={size * 0.56} className="text-[var(--text-inverse)]" strokeWidth={0} fill="currentColor" />
  </div>
);

export const LogoFull = ({ size = 32, textClass = "text-lg" }) => (
  <div className="flex items-center gap-2.5">
    <LogoMark size={size} />
    <span className={`font-extrabold tracking-tight ${textClass}`}>
      <span className="text-[var(--text-primary)]">Strike</span><span className="text-[var(--accent)]">Trading</span>
    </span>
  </div>
);
