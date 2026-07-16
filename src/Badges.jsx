import React from "react";
import { ShieldCheck, Flame, Target } from "lucide-react";

// Turns raw public stats { trade_count, is_funded, streak_days } into a
// list of badges to display. Only the highest tier per category is shown.
export function computeBadges(stats) {
  if (!stats) return [];
  const { trade_count = 0, is_funded = false, streak_days = 0 } = stats;
  const badges = [];

  if (is_funded) badges.push({ id: "funded", label: "Funded", icon: ShieldCheck, color: "emerald" });

  if (streak_days >= 100) badges.push({ id: "streak100", label: "100-Day Streak", icon: Flame, color: "orange" });
  else if (streak_days >= 30) badges.push({ id: "streak30", label: "30-Day Streak", icon: Flame, color: "orange" });
  else if (streak_days >= 7) badges.push({ id: "streak7", label: "7-Day Streak", icon: Flame, color: "orange" });

  if (trade_count >= 500) badges.push({ id: "trades500", label: "500 Trades Logged", icon: Target, color: "blue" });
  else if (trade_count >= 100) badges.push({ id: "trades100", label: "100 Trades Logged", icon: Target, color: "blue" });
  else if (trade_count >= 10) badges.push({ id: "trades10", label: "10 Trades Logged", icon: Target, color: "blue" });

  return badges;
}

const colorCls = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const sizes = { xs: "text-[10px] px-1.5 py-0.5 gap-0.5", sm: "text-xs px-2 py-0.5 gap-1" };
const iconSizes = { xs: 10, sm: 12 };

export default function Badges({ badges = [], size = "xs", className = "" }) {
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <span key={b.id} title={b.label}
            className={`inline-flex items-center ${sizes[size] || sizes.xs} rounded-full font-semibold border ${colorCls[b.color]}`}>
            <Icon size={iconSizes[size] || iconSizes.xs} /> {b.label}
          </span>
        );
      })}
    </div>
  );
}
