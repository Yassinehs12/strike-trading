import React from "react";
import { Star } from "lucide-react";

// Small inline badge marking a user as a supporter. Drop next to any username.
export default function SupporterBadge({ size = "xs", className = "" }) {
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-0.5",
    sm: "text-xs px-2 py-0.5 gap-1",
  };
  const iconSizes = { xs: 10, sm: 12 };
  return (
    <span
      className={`inline-flex items-center ${sizes[size] || sizes.xs} rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 ${className}`}
      title="Supporter"
    >
      <Star size={iconSizes[size] || iconSizes.xs} /> Supporter
    </span>
  );
}
