import React from "react";
import {
  LayoutDashboard, ShieldCheck, BookOpen, BarChart3, Target, AlertTriangle, Gauge, Link2, Settings as SettingsIcon, CalendarClock, Grid3x3, Mail, MessagesSquare, UserCircle, ShieldAlert, Trophy, Star, BookMarked, Shield, Palette, Calculator, Plug, NotebookPen, AtSign, UserPlus, MessageCircle, Percent,
} from "lucide-react";
import { supabase } from "./supabaseClient";

export const ASSET_GROUPS = {
  Forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURJPY", "GBPJPY", "EURGBP"],
  Metals: ["XAUUSD", "XAGUSD"],
  Energy: ["USOIL", "UKOIL", "NATGAS"],
  Indices: ["US30", "NAS100", "SP500", "GER40", "UK100", "JPN225", "FRA40"],
  Crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD"],
  Stocks: ["NVDA", "AAPL", "TSLA", "MSFT"],
};


export const ASSETS = Object.values(ASSET_GROUPS).flat();


export const SETUPS = ["Breakout", "FVG", "Trend Following", "Reversal", "Liquidity Grab", "Range"];


export const SESSIONS = ["London", "New York", "Asia"];


export const EMOTIONS = ["Neutral", "Greed", "FOMO", "Overtrading", "Fear"];


export const SETUP_GRADES = ["A+", "A", "B"];


export const NAV_GROUPS = [
  {
    label: "Trading",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "challenges", label: "Challenges", icon: ShieldCheck },
      { id: "journal", label: "Trade Journal", icon: BookOpen },
      { id: "journaling", label: "Weekly/Monthly Review", icon: BookMarked },
      { id: "notebook", label: "Notebook", icon: NotebookPen },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "goals", label: "Goals", icon: Target },
      { id: "econ-calendar", label: "Economic Calendar", icon: CalendarClock },
      { id: "heatmaps", label: "Market Heatmaps", icon: Grid3x3 },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "calculator", label: "Pips Calculator", icon: Calculator },
      { id: "position-calculator", label: "Position Calculator", icon: Percent },
      { id: "risk-tools", label: "Risk of Ruin", icon: Gauge },
      { id: "correlation", label: "Correlation Checker", icon: Link2 },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "forum", label: "Community", icon: MessagesSquare },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "messages", label: "Messages", icon: Mail },
    ],
  },
  {
    label: null,
    items: [
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];


export const ADMIN_NAV_ITEM = { id: "admin", label: "Admin Panel", icon: ShieldAlert };

// Every tab the app can be on, used to keep the URL in sync so a refresh
// stays on the current page instead of bouncing back to the dashboard.


export const VALID_TAB_IDS = [
  ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
  ADMIN_NAV_ITEM.id,
  "profile",
  "friends",
];

// Reads the tab out of the URL path (e.g. "/settings" -> "settings") on
// first load. Anything unrecognized falls back to the dashboard.


export const tabFromPath = () => {
  const raw = window.location.pathname.replace(/^\/+/, "").split(/[/?#]/)[0];
  return VALID_TAB_IDS.includes(raw) ? raw : "dashboard";
};


export const CHECKLIST_ITEMS = [
  { key: "setupConfirmed", label: "Setup confirmed", hint: "Matches a setup on your plan, not a hunch" },
  { key: "riskSized", label: "Risk sized", hint: "Position size matches your risk rules" },
  { key: "newsChecked", label: "News checked", hint: "No high-impact news/calendar risk into the trade" },
];

// Pre-trade discipline checklist. Deliberately just three checks — the goal
// is a 5-second habit before hitting submit, not a form. Feeds directly into
// the discipline score in psychology.js, separate from setup grade/emotion.


export const PRE_MARKET_CHECKLIST_ITEMS = [
  "Reviewed economic calendar",
  "Checked higher timeframe bias",
  "Marked key levels",
  "Defined max loss for the day",
  "Mentally ready — no revenge trading",
];

// Dashboard pre-market checklist. Keyed by user + today's date in
// localStorage, so it reads back empty the moment the calendar day changes
// — no server round-trip needed, and it won't bleed into tomorrow's session.
// Scoping by userId also keeps it from bleeding across accounts that share
// a browser/device.


export const ACCOUNT_TYPES = [
  { value: "live", label: "Live" },
  { value: "demo", label: "Demo" },
  { value: "funded", label: "Funded" },
  { value: "prop_challenge", label: "Prop Challenge" },
];


export const IMPACT_LEVELS = [
  { value: "1", label: "High Impact", dot: "bg-rose-500", active: "bg-rose-500/10 border-rose-500/60 text-rose-400" },
  { value: "0", label: "Medium Impact", dot: "bg-amber-400", active: "bg-amber-400/10 border-amber-400/60 text-amber-400" },
  { value: "-1", label: "Low Impact", dot: "bg-emerald-500", active: "bg-emerald-500/10 border-emerald-500/60 text-emerald-400" },
];


export const ECON_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "eu", label: "Euro Zone" },
  { code: "gb", label: "United Kingdom" },
  { code: "jp", label: "Japan" },
  { code: "cn", label: "China" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "ch", label: "Switzerland" },
  { code: "nz", label: "New Zealand" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
];


export const SETTINGS_TABS = [
  { id: "account", label: "Account", icon: UserCircle },
  { id: "security", label: "Security", icon: Shield },
  { id: "trading", label: "Trading", icon: Target },
  { id: "broker", label: "Broker Sync", icon: Plug },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

/* ============================================================
   BROKER SYNC — powered by SnapTrade (snaptrade.com).

   Unlike the old MT4/MT5-only flow, SnapTrade connects real stock/
   options brokerages (Robinhood, Schwab, Fidelity, IBKR, etc.) through
   each broker's own OAuth-style login — no password ever passes through
   this app or gets stored anywhere here. See src/db.js's SnapTrade
   helpers, supabase/functions/snaptrade-connect|sync|disconnect, and
   supabase-migrations/snaptrade.sql for the full flow.
   ============================================================ */


export const PAGE_SIZE = 8;


export const PIE_COLORS = ["#10b981", "#f43f5e", "#71717a"];


export const SCORE_RING_COLORS = {
  emerald: "#34d399",
  sky: "#38bdf8",
  amber: "#fbbf24",
  rose: "#fb7185",
};


export const NOTIF_ICON = {
  reply: { icon: MessageCircle, className: "bg-blue-500/15 text-blue-400" },
  message: { icon: Mail, className: "bg-blue-500/15 text-blue-400" },
  friend_accepted: { icon: UserPlus, className: "bg-emerald-500/15 text-emerald-400" },
  mention: { icon: AtSign, className: "bg-violet-500/15 text-violet-400" },
  spotlight: { icon: Star, className: "bg-amber-500/15 text-amber-400" },
  leaderboard_reset: { icon: Trophy, className: "bg-amber-500/15 text-amber-400" },
  badge_granted: { icon: Trophy, className: "bg-amber-500/15 text-amber-400" },
};


export const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";
