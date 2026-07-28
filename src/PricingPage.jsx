import React from "react";
import { Check, X as XIcon, Sparkles } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

const FEATURES = [
  { label: "Trade journal", free: true, pro: true },
  { label: "Funding challenge tracker", free: true, pro: true },
  { label: "Dashboard & basic analytics", free: true, pro: true },
  { label: "Community, leaderboard & badges", free: true, pro: true },
  { label: "Public Report Card", free: true, pro: true },
  { label: "Trading accounts", free: "2 accounts", pro: "Unlimited" },
  { label: "Broker Sync (MT4/MT5, live brokerages)", free: false, pro: true },
  { label: "Psychology Report", free: false, pro: true },
  { label: "CSV / PDF export", free: false, pro: true },
  { label: "Weekly / Monthly Review", free: false, pro: true },
];

const Cell = ({ value }) => {
  if (value === true) return <Check size={16} className="text-emerald-400 mx-auto" />;
  if (value === false) return <XIcon size={16} className="text-[var(--text-faint)] mx-auto" />;
  return <span className="text-xs font-medium text-[var(--text-secondary)]">{value}</span>;
};

export default function PricingPage() {
  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-6">
        <a href="/"><LogoFull size={28} textClass="text-base" /></a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Back to home</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] mb-4">
            <Sparkles size={12} /> Simple pricing
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Free to start. Upgrade when you're serious.</h1>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Strike Journal is free to use for journaling and tracking your funding challenges. Pro unlocks
            automated broker sync, deeper analytics, and export tools for traders running multiple accounts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10">
          <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="font-bold text-lg mb-1">Free</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Everything you need to start journaling seriously.</p>
            <div className="text-3xl font-extrabold mb-6">$0</div>
            <button disabled className="w-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold text-sm px-4 py-2.5 rounded-lg mb-2 cursor-default">
              Your current plan
            </button>
          </div>

          <div className="rounded-2xl border-2 border-[var(--accent)] p-6 relative" style={{ backgroundColor: "var(--card-bg)" }}>
            <span className="absolute -top-3 left-6 bg-[var(--accent)] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">MOST POPULAR</span>
            <h2 className="font-bold text-lg mb-1">Pro</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">For traders running multiple accounts or funded challenges.</p>
            <div className="text-3xl font-extrabold mb-6">Coming soon</div>
            <button
              onClick={(e) => { e.currentTarget.nextSibling.classList.remove("hidden"); e.currentTarget.classList.add("hidden"); }}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all mb-2"
            >
              Get notified
            </button>
            <p className="hidden text-xs text-center text-[var(--text-muted)]">
              Billing isn't live yet — drop in the Strike community and an admin can get you early Pro access.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden max-w-3xl mx-auto" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                <th className="text-left font-semibold px-5 py-3 text-[var(--text-secondary)]">Feature</th>
                <th className="text-center font-semibold px-5 py-3 text-[var(--text-secondary)] w-28">Free</th>
                <th className="text-center font-semibold px-5 py-3 text-[var(--accent)] w-28">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.label} className={i !== FEATURES.length - 1 ? "border-b" : ""} style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-5 py-3 text-[var(--text-primary)]">{f.label}</td>
                  <td className="px-5 py-3 text-center"><Cell value={f.free} /></td>
                  <td className="px-5 py-3 text-center"><Cell value={f.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
