import React, { useEffect, useState } from "react";
import { Check, X as XIcon, Sparkles, Loader2, Lock, BarChart3, RefreshCw, Download, Layers, ChevronDown, ArrowRight } from "lucide-react";
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
  { label: "Trading accounts", free: "1 account", pro: "Unlimited" },
  { label: "Broker Sync (MT4/MT5, live brokerages)", free: false, pro: true },
  { label: "Psychology Report", free: false, pro: true },
  { label: "CSV / PDF export", free: false, pro: true },
  { label: "Daily Review & Daily Market Plan", free: false, pro: true },
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

const FREE_LIST = [
  "Trade journal",
  "Dashboard & basic analytics",
  "Funding challenge tracker",
  "1 trading account",
  "Community, leaderboard & badges",
  "Public Report Card",
];
const PRO_LIST = [
  "Everything in Free",
  "Unlimited trading accounts",
  "Broker Sync (MT4/MT5, live brokerages)",
  "Psychology Report",
  "Daily Review & Daily Market Plan",
  "Weekly / Monthly Review",
  "CSV / PDF export",
];
const VALUE = [
  { icon: BarChart3, title: "Psychology Report", text: "Discipline scoring and emotional-pattern breakdowns computed from your trade tags." },
  { icon: RefreshCw, title: "Broker Sync", text: "Sync trades from MT4/MT5 and supported brokerages instead of entering them by hand." },
  { icon: Download, title: "CSV & PDF Exports", text: "Export your journal and performance data whenever you need it." },
  { icon: Layers, title: "Unlimited Accounts", text: "Track every funded challenge and trading account in one place." },
];
const PRO_FAQS = [
  { q: "Can I use Strike Journal for free?", a: "Yes. The journal, dashboard, funding challenge tracker, community and 1 trading account are free, with no credit card required. New accounts also get a 3-day Pro trial." },
  { q: "What's included in Pro?", a: "Unlimited trading accounts, Broker Sync, the Psychology Report, Daily Review, Daily Market Plan, Weekly/Monthly Review, and CSV/PDF export. New accounts start with a 3-day Pro trial." },
  { q: "Can I switch between monthly and yearly?", a: "Yes. Each payment is for a single period, so you can choose monthly or yearly the next time you pay. Early payments stack onto your current expiry." },
  { q: "Does Pro automatically renew?", a: "No. Every payment covers one period only and there is no auto-renewal." },
  { q: "What payment methods are supported?", a: "Crypto through NOWPayments, including BTC, ETH, USDT and more." },
  { q: "Can I cancel or let my Pro period expire?", a: "There is nothing to cancel. When your period ends, your account returns to the Free plan unless you pay again." },
];

const FaqItem = ({ q, a, id }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "var(--card-border)" }}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`faq-${id}`} onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-4 text-left py-4 text-sm font-semibold rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          {q}
          <ChevronDown size={16} className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={`faq-${id}`} role="region" hidden={!open} className="pb-4 text-sm text-[var(--text-muted)] leading-relaxed">{a}</div>
    </div>
  );
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
  // Trial is available only when the column exists (null) and Pro isn't active.
  const trialAvailable = !!session && !alreadyPro && profile && profile.trial_started_at === null;
  const [trialBusy, setTrialBusy] = useState(false);

  const startTrial = async () => {
    setTrialBusy(true); setError("");
    try {
      const { error: rpcError } = await supabase.rpc("start_pro_trial");
      if (rpcError) throw new Error(rpcError.message);
      window.location.href = "/";
    } catch (e) {
      setError(e.message || "Could not start the trial. Please try again.");
      setTrialBusy(false);
    }
  };

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

  const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  const ListItem = ({ children, accent }) => (
    <li className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
      <Check size={16} className={`mt-0.5 shrink-0 ${accent ? "text-[var(--accent)]" : "text-emerald-400"}`} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-6 py-5 sm:py-6">
        <a href="/" className={`rounded ${focus}`}><LogoFull size={28} textClass="text-base" /></a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/" className={`text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded ${focus}`}>Back to home</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-6 pb-24">
        <section className="text-center max-w-2xl mx-auto pt-6 sm:pt-10 mb-12 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] mb-6">
            <Sparkles size={12} aria-hidden="true" /> Simple pricing
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">Free to start. Upgrade when you're serious.</h1>
          <p className="text-[var(--text-muted)] text-base leading-relaxed">
            Everything you need to journal, analyze, and improve your trading. Start free and unlock advanced tools when you're ready.
          </p>
        </section>

        {trialAvailable && (
          <div className="max-w-3xl mx-auto mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-emerald-400">
              <Sparkles size={16} className="shrink-0" aria-hidden="true" />
              <span><span className="font-semibold">Claim your 3-day free Pro trial</span> — full access, no card required, cancel anytime.</span>
            </div>
            <button
              onClick={startTrial}
              disabled={trialBusy}
              className={`shrink-0 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-all inline-flex items-center justify-center gap-2 ${focus}`}
            >
              {trialBusy && <Loader2 size={14} className="animate-spin" />}
              Claim free trial <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        {!session && (
          <div className="max-w-3xl mx-auto mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-emerald-400">
              <Sparkles size={16} className="shrink-0" aria-hidden="true" />
              <span><span className="font-semibold">3-day free Pro trial</span> — create an account to claim it, no card required.</span>
            </div>
            <a
              href="/"
              className={`shrink-0 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-all inline-flex items-center justify-center gap-2 ${focus}`}
            >
              Create free account <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-16 items-stretch">
          <div className="rounded-2xl border p-6 sm:p-7 flex flex-col transition-colors hover:border-[var(--text-faint)]" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="font-bold text-lg mb-1">Free</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">Everything you need to start journaling seriously.</p>
            <div className="text-4xl font-extrabold tracking-tight mb-1">$0</div>
            <p className="text-xs text-[var(--text-muted)] mb-6">Free forever, plus a 3-day Pro trial when you sign up</p>
            <button disabled className="w-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold text-sm px-4 py-3 rounded-lg mb-6 cursor-default">
              {alreadyPro ? "Free tier" : "Your current plan"}
            </button>
            <ul className="space-y-3 border-t pt-6" style={{ borderColor: "var(--card-border)" }}>
              {FREE_LIST.map((f) => <ListItem key={f}>{f}</ListItem>)}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-[var(--accent)] p-6 sm:p-7 relative flex flex-col shadow-[0_8px_40px_-12px_rgba(139,92,246,0.45)]"
            style={{ backgroundColor: "var(--card-bg)", backgroundImage: "linear-gradient(180deg, var(--accent-soft), transparent 40%)" }}>
            <span className="absolute -top-3 left-6 bg-[var(--accent)] text-white text-[10px] tracking-wider font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
            <h2 className="font-bold text-lg mb-1">Pro</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">For traders running multiple accounts or funded challenges.</p>
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <span className="font-semibold">3-day free trial</span> of Pro. Create an account and start it in one click. No card required.
            </div>
            <div role="group" aria-label="Billing interval" className="inline-flex self-start rounded-lg p-0.5 mb-5 bg-[var(--bg-tertiary)] text-xs font-semibold">
              {["monthly", "yearly"].map((k) => (
                <button key={k} type="button" aria-pressed={interval === k} onClick={() => setInterval_(k)}
                  className={`px-3.5 py-1.5 rounded-md transition-all capitalize inline-flex items-center gap-1.5 ${focus} ${interval === k ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                  {k}
                  {k === "yearly" && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${interval === k ? "bg-white/20" : "bg-emerald-500/15 text-emerald-400"}`}>Save 17%</span>}
                </button>
              ))}
            </div>
            <div className="text-4xl font-extrabold tracking-tight mb-1">
              ${PRICES[interval].amount}<span className="text-sm font-medium text-[var(--text-muted)]">{PRICES[interval].suffix}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-6" aria-live="polite">{PRICES[interval].note}</p>
            {trialAvailable && (
              <button
                onClick={startTrial}
                disabled={trialBusy || busy}
                className={`w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-semibold text-sm px-4 py-3 rounded-lg transition-all mb-2 inline-flex items-center justify-center gap-2 ${focus}`}
              >
                {trialBusy && <Loader2 size={14} className="animate-spin" />}
                Start your 3-day free trial <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
            <button
              onClick={startCheckout}
              disabled={busy || trialBusy || alreadyPro}
              className={trialAvailable
                ? `w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60 font-semibold text-sm px-4 py-2.5 rounded-lg border mb-2 inline-flex items-center justify-center gap-2 transition-colors ${focus}`
                : `w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-semibold text-sm px-4 py-3 rounded-lg transition-all mb-2 inline-flex items-center justify-center gap-2 ${focus}`}
              style={trialAvailable ? { borderColor: "var(--card-border)" } : undefined}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {alreadyPro ? "You're on Pro" : session ? (trialAvailable ? "Or upgrade now" : <>Upgrade to Pro <ArrowRight size={15} aria-hidden="true" /></>) : "Start your 3-day free trial"}
            </button>
            {error && <p role="alert" className="text-xs text-center text-red-400 mb-1">{error}</p>}
            <p className="text-[11px] text-center text-[var(--text-muted)] mb-6">
              Secure crypto checkout via NOWPayments<br />BTC · ETH · USDT and more. One-time payment per period, no auto-renewal.
            </p>
            <ul className="space-y-3 border-t pt-6 mt-auto" style={{ borderColor: "var(--card-border)" }}>
              {PRO_LIST.map((f) => <ListItem key={f} accent>{f}</ListItem>)}
            </ul>
          </div>
        </div>

        <section className="max-w-3xl mx-auto mb-16" aria-labelledby="why-pro">
          <h2 id="why-pro" className="text-2xl font-bold text-center mb-8 tracking-tight">Why upgrade to Pro?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/50" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/12 flex items-center justify-center mb-3"><Icon size={18} className="text-[var(--accent)]" aria-hidden="true" /></div>
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto mb-16" aria-labelledby="compare">
          <h2 id="compare" className="text-2xl font-bold text-center mb-8 tracking-tight">Compare plans</h2>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                  <th scope="col" className="text-left font-semibold px-4 sm:px-5 py-3 text-[var(--text-secondary)]">Feature</th>
                  <th scope="col" className="text-center font-semibold px-2 sm:px-5 py-3 text-[var(--text-secondary)] w-24 sm:w-28">Free</th>
                  <th scope="col" className="text-center font-semibold px-2 sm:px-5 py-3 text-[var(--accent)] w-24 sm:w-28">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.label} className={i !== FEATURES.length - 1 ? "border-b" : ""} style={{ borderColor: "var(--card-border)" }}>
                    <th scope="row" className="font-normal text-left px-4 sm:px-5 py-3 text-[var(--text-primary)]">{f.label}</th>
                    <td className="px-2 sm:px-5 py-3 text-center"><Cell value={f.free} /></td>
                    <td className="px-2 sm:px-5 py-3 text-center"><Cell value={f.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="max-w-3xl mx-auto mb-16 rounded-xl border px-5 py-4 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 text-center text-sm" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <span className="inline-flex items-center gap-2 font-semibold"><Lock size={14} className="text-[var(--accent)]" aria-hidden="true" /> Secure checkout</span>
          <span className="text-[var(--text-muted)]">BTC · ETH · USDT · and more</span>
          <span className="text-[var(--text-muted)]">One-time payment · No automatic renewal</span>
        </div>

        <section className="max-w-2xl mx-auto" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold text-center mb-6 tracking-tight">Frequently asked questions</h2>
          <div className="border-t" style={{ borderColor: "var(--card-border)" }}>
            {PRO_FAQS.map((f, i) => <FaqItem key={f.q} id={i} q={f.q} a={f.a} />)}
          </div>
        </section>
      </main>
    </div>
  );
}
