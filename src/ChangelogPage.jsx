import React from "react";
import { ArrowLeft, Sparkles, Wrench, Bug, Rocket } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

/* ============================================================
   CHANGELOG ENTRIES
   Add a new object to the TOP of this array every time you ship
   something worth telling the community about. That's it — the
   page below renders automatically from this list.

   type: "feature" | "improvement" | "fix"
   ============================================================ */
export const CHANGELOG = [
  {
    date: "2026-07-28",
    title: "Drawdown Heat Bar, prop-firm presets, and a pace projection for your challenges",
    type: "feature",
    items: [
      "Daily Loss and Max Total Loss bars on the Challenges page are now live heat gradients — green through amber to red — with a glowing marker that pulses as you approach a breach, instead of a flat progress bar.",
      "New Challenge form now has a prop-firm preset dropdown (FTMO, MyFundedFX, Apex Trader Funding, The5%ers, Alpha Capital Group) that auto-fills profit target, daily/total loss limits, minimum trading days, and profit split.",
      "Added an editable Minimum Trading Days field to the New Challenge form instead of a fixed default.",
      "In-progress challenges now show a pace projection — \"at your current pace (~$X/trading day), you'll hit the profit target in ~Y trading days\" — computed from your own logged trades.",
    ],
  },
  {
    date: "2026-07-28",
    title: "Notebook, a smarter Weekly/Monthly Review, and an Admin Panel fix",
    type: "feature",
    items: [
      "New Notebook — a free-form space for playbooks, psychology notes, checklists, and anything worth remembering, separate from your trade log. Supports pinned notes, color labels, tags, search, and starter templates.",
      "Weekly/Monthly Review upgraded with an equity curve for the period, a fuller stat grid (profit factor, avg win, avg loss), period-over-period comparison arrows, auto-generated insights, and a one-click Copy Summary button.",
      "Fixed a bug where the Admin Panel's Users tab failed to load with \"column profiles.plan does not exist.\"",
    ],
  },
  {
    date: "2026-07-26",
    title: "Expanded asset list, theme polish, and more reliable signups",
    type: "improvement",
    items: [
      "Asset dropdown is now grouped by category — Forex, Metals, Energy, Indices, Crypto, and Stocks — instead of one long flat list.",
      "Added a bunch of new symbols: USOIL, UKOIL, NATGAS, SP500, GER40, UK100, JPN225, FRA40, plus more forex pairs (USDCHF, EURJPY, GBPJPY, EURGBP), crypto (SOLUSD, XRPUSD), and stocks (AAPL, TSLA, MSFT).",
      "Light theme redesigned with a proper professional palette instead of a flat black/white inversion — softer background, refined card shadows, and fixed several spots where cards and the sign-in page were nearly invisible in light mode.",
      "Dark theme softened from pure black to a richer near-black for a less harsh, more premium look.",
      "New accounts now get their username and age saved to the database immediately at signup, instead of depending on a temporary local save that could get lost if you confirmed your email on a different browser or device.",
      "Fixed an issue where a temporary connection hiccup could force-sign-out a user instead of quietly retrying.",
    ],
  },
  {
    date: "2026-07-25",
    title: "Psychology Report",
    type: "feature",
    items: [
      "New Psychology Report on the dashboard, replacing Performance Insights — a discipline score plus emotional-pattern breakdowns computed from your own emotion tags and setup grades.",
      "Detects overtrading patterns, possible revenge-trading (emotional entries right after a loss), and low-grade setups taken under emotional strain.",
      "Surfaces which emotional state is costing you the most win rate, and calls out when your neutral-state trading is outperforming.",
      "Report now unlocks from your very first closed trade instead of requiring a minimum sample size.",
      "Added Psychology Report to the landing page feature list.",
    ],
  },
  {
    date: "2026-07-19",
    title: "Public launch",
    type: "feature",
    items: [
      "Strike Journal is live — trade journal, funding challenge tracker, analytics, and community, all in one place.",
      "Added Privacy Policy and Terms of Service pages.",
    ],
  },
  // {
  //   date: "2026-07-26",
  //   title: "Example: Payout tracking improvements",
  //   type: "improvement",
  //   items: [
  //     "Payout history now shows profit split percentage per payout.",
  //     "Fixed a bug where challenge stage didn't update after a payout.",
  //   ],
  // },
];

const TYPE_META = {
  feature: { label: "New", icon: Sparkles, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  improvement: { label: "Improved", icon: Wrench, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  fix: { label: "Fixed", icon: Bug, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const formatDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const ChangelogEntry = ({ entry }) => {
  const meta = TYPE_META[entry.type] || TYPE_META.improvement;
  const Icon = meta.icon;
  return (
    <div className="relative pl-8 pb-10 border-l border-white/10 last:pb-0 last:border-transparent">
      <div className="absolute -left-[7px] top-0 w-3.5 h-3.5 rounded-full bg-[var(--accent)]" />
      <p className="text-xs text-[var(--text-faint)] mb-2">{formatDate(entry.date)}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.className}`}>
          <Icon size={11} /> {meta.label}
        </span>
        <h3 className="font-bold text-[var(--text-primary)] text-base">{entry.title}</h3>
      </div>
      <ul className="space-y-1.5">
        {entry.items.map((item, i) => (
          <li key={i} className="text-sm text-[var(--text-tertiary)] leading-relaxed flex gap-2">
            <span className="text-[var(--text-faint)] mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ChangelogPage() {
  return (
    <div className="lp-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <LogoFull size={26} textClass="text-sm" />
          </a>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} /> Back to site
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-1">
          <Rocket size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">What's new</h1>
        </div>
        <p className="text-sm text-[var(--text-faint)] mb-8">
          Every update we ship to Strike Journal, in one place.
        </p>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 pb-8 border-b border-white/10">
          <a href="/blog" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Blog</a>
          <a href="/privacy" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
          <a href="/terms" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
          <a href="/changelog" className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Changelog</a>
        </nav>

        {CHANGELOG.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">Nothing here yet — check back soon.</p>
        ) : (
          <div>
            {CHANGELOG.map((entry, i) => (
              <ChangelogEntry key={i} entry={entry} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-8 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-xs text-[var(--text-faint)] text-center">
          © {new Date().getFullYear()} Strike Journal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
