import React from "react";
import { ShieldCheck } from "lucide-react";

// Small inline badge marking a user as an admin. Drop next to any username.
export default function AdminBadge({ size = "xs", className = "" }) {
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-0.5",
    sm: "text-xs px-2 py-0.5 gap-1",
  };
  const iconSizes = { xs: 10, sm: 12 };
  return (
    <span
      className={`inline-flex items-center ${sizes[size] || sizes.xs} rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30 ${className}`}
      title="Admin"
    >
      <ShieldCheck size={iconSizes[size] || iconSizes.xs} /> Admin
    </span>
  );
}
