import React, { useEffect, useState } from "react";
import { Check, X as XIcon, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { isProPlan } from "./lib/plan";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { usePageMeta } from "./lib/seo";

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

const PRICES = {
  monthly: { amount: "9.99", suffix: "/month", note: "Billed monthly" },
  yearly: { amount: "99", suffix: "/year", note: "Save ~17% vs monthly ($19.89 less per year)" },
};

export default function PricingPage() {
  const [interval, setInterval_] = useState("monthly");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).maybeSingle();
        if (!cancelled) setProfile(p);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const alreadyPro = isProPlan(profile);

  const startCheckout = async () => {
    if (!session) { window.location.href = "/"; return; }
    setBusy(true); setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("nowpayments-create-invoice", { body: { interval } });
      if (fnError) throw new Error(data?.error || fnError.message);
      if (!data?.url) throw new Error(data?.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  usePageMeta({
    title: "Pricing",
    description: "Strike Journal is free to start — full trade journal, funding challenge tracker, and community access. Upgrade to Pro for unlimited accounts and advanced analytics.",
    path: "/pricing",
  });
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
              {alreadyPro ? "Free tier" : "Your current plan"}
            </button>
          </div>

          <div className="rounded-2xl border-2 border-[var(--accent)] p-6 relative" style={{ backgroundColor: "var(--card-bg)" }}>
            <span className="absolute -top-3 left-6 bg-[var(--accent)] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">MOST POPULAR</span>
            <h2 className="font-bold text-lg mb-1">Pro</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">For traders running multiple accounts or funded challenges.</p>
            <div className="inline-flex rounded-lg p-0.5 mb-4 bg-[var(--bg-tertiary)] text-xs font-semibold">
              {["monthly", "yearly"].map((k) => (
                <button key={k} onClick={() => setInterval_(k)}
                  className={`px-3 py-1.5 rounded-md transition-all capitalize ${interval === k ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>
                  {k}
                </button>
              ))}
            </div>
            <div className="text-3xl font-extrabold mb-1">
              ${PRICES[interval].amount}<span className="text-sm font-medium text-[var(--text-muted)]">{PRICES[interval].suffix}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-5">{PRICES[interval].note}</p>
            <button
              onClick={startCheckout}
              disabled={busy || alreadyPro}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all mb-2 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {alreadyPro ? "You're on Pro" : session ? "Pay with crypto" : "Sign in to upgrade"}
            </button>
            {error && <p className="text-xs text-center text-red-400">{error}</p>}
            <p className="text-[11px] text-center text-[var(--text-muted)]">
              Secure crypto checkout via NOWPayments (BTC, ETH, USDT and more). One-time payment per period, no auto-renewal.
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
