import React from "react";
import {
  ShieldCheck, Flame, Target, Award, Crown, Trophy, Star, Gem, Rocket, Heart,
  GraduationCap, Mic, Handshake, Users, Sparkles, Zap, BookOpen, Video, Gift, Anchor,
} from "lucide-react";

/* ---------- automatic badges (computed from live stats) ---------- */
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

/* ---------- admin-assignable badge catalog ----------
   Grant/revoke these from AdminPanel via grant_member_badge / revoke_member_badge.
   Keep `id` values stable once badges have been granted to anyone — they're
   stored as badge_key in the member_badges table. */
export const BADGE_CATALOG = [
  // Trading achievement
  { id: "verified_funded", label: "Verified Funded Trader", icon: ShieldCheck, color: "emerald", group: "Trading" },
  { id: "prop_firm_passer", label: "Prop Firm Challenge Passer", icon: Trophy, color: "emerald", group: "Trading" },
  { id: "consistent_trader", label: "Consistency Award", icon: Target, color: "blue", group: "Trading" },
  { id: "risk_manager", label: "Risk Management Pro", icon: ShieldCheck, color: "blue", group: "Trading" },
  { id: "top_performer_month", label: "Top Performer of the Month", icon: Crown, color: "amber", group: "Trading" },
  { id: "trade_of_the_week", label: "Trade of the Week Winner", icon: Star, color: "amber", group: "Trading" },

  // Community contribution
  { id: "mentor", label: "Mentor", icon: GraduationCap, color: "violet", group: "Community" },
  { id: "top_helper", label: "Top Helper", icon: Handshake, color: "violet", group: "Community" },
  { id: "community_veteran", label: "Community Veteran", icon: Anchor, color: "slate", group: "Community" },
  { id: "founding_member", label: "Founding Member", icon: Gem, color: "amber", group: "Community" },
  { id: "moderator", label: "Moderator", icon: ShieldCheck, color: "rose", group: "Community" },
  { id: "event_host", label: "Event Host", icon: Mic, color: "violet", group: "Community" },

  // Growth / referrals
  { id: "recruiter", label: "Recruiter (5+ invites)", icon: Users, color: "cyan", group: "Growth" },
  { id: "super_recruiter", label: "Super Recruiter (20+ invites)", icon: Rocket, color: "cyan", group: "Growth" },

  // Content / education
  { id: "content_creator", label: "Content Contributor", icon: Video, color: "pink", group: "Content" },
  { id: "playbook_author", label: "Playbook Author", icon: BookOpen, color: "pink", group: "Content" },

  // Fun / seasonal
  { id: "early_supporter", label: "Early Supporter", icon: Heart, color: "rose", group: "Fun" },
  { id: "mvp", label: "MVP", icon: Award, color: "amber", group: "Fun" },
  { id: "og", label: "OG", icon: Sparkles, color: "slate", group: "Fun" },
  { id: "gift_giver", label: "Gift Giver", icon: Gift, color: "pink", group: "Fun" },
  { id: "lightning", label: "Fast Responder", icon: Zap, color: "cyan", group: "Fun" },
];

export function badgeFromKey(key) {
  return BADGE_CATALOG.find((b) => b.id === key) || { id: key, label: key, icon: Award, color: "slate" };
}

// Merge automatic badges with admin-granted ones (by badge_key from get_member_badges)
export function mergeBadges(autoBadges = [], grantedKeys = []) {
  const granted = grantedKeys.map((k) => badgeFromKey(typeof k === "string" ? k : k.badge_key));
  return [...autoBadges, ...granted];
}

const colorCls = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  blue: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  violet: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  slate: "bg-[var(--text-muted)]/15 text-[var(--text-secondary)] border-[var(--text-muted)]/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  pink: "bg-pink-500/15 text-pink-400 border-pink-500/30",
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
            className={`inline-flex items-center ${sizes[size] || sizes.xs} rounded-full font-semibold border ${colorCls[b.color] || colorCls.slate}`}>
            <Icon size={iconSizes[size] || iconSizes.xs} /> {b.label}
          </span>
        );
      })}
    </div>
  );
}
