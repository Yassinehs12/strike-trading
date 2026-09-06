import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight, ShieldCheck, BookOpen, BarChart3, CalendarDays,
  Banknote, Gauge, CheckCircle2, TrendingUp, TrendingDown, Menu, X,
  MessagesSquare, Users, Send, ChevronDown, Lock, Zap, Plug, Brain,
  AlertTriangle, XCircle, Flame, NotebookPen,
} from "lucide-react";
import { LogoMark, LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { fetchLandingStats } from "./db";
import { FAQS } from "./faqData";
import { usePageMeta } from "./lib/seo";

const XLogoIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7.1L4.8 22H1.7l8-9.2L1 2h7.1l4.9 6.5L18.9 2zm-1.2 18h1.9L7.4 4H5.3l12.4 16z" />
  </svg>
);

/* ============================================================
   DESIGN SYSTEM
   Base: near-black (#050507) with a live electric-blue -> violet gradient
   as the single bold accent, reserved for the hero and CTAs — everything
   else stays disciplined so that gradient reads as the memorable thing,
   not wallpaper. Green/red keep their existing trading semantics (win/
   loss), used sparingly as signal, never decoration.
   Type: Space Grotesk (display, heavy weight) for the kinetic headline
   moments; Inter for everything readable; JetBrains Mono for every
   number, price, and stat — the "instrument panel" register.
   Motion: one orchestrated hero sequence (ticker scrolls in, headline
   rises, equity line draws itself) on load. After that, only
   action-driven motion (hover states, accordion open) — no scroll-
   triggered fade-ins on every section.
   ============================================================ */
const LandingStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
    .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; background: var(--bg-primary); color: var(--text-primary); }
    .lp-display { font-family: 'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
    .lp-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }

    .lp-gradient-text {
      background: linear-gradient(100deg, #5B8CFF 0%, #A855F7 55%, #F472B6 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .lp-gradient-bg { background: linear-gradient(100deg, #4F7CFF 0%, #9333EA 60%, #EC4899 100%); }
    .lp-gradient-border { border-image: linear-gradient(100deg, #4F7CFF, #A855F7) 1; }

    .lp-glow { position: absolute; border-radius: 999px; filter: blur(120px); pointer-events: none; opacity: 0.35; }

    @keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .lp-marquee-track { display: flex; width: max-content; animation: lp-marquee 32s linear infinite; }
    .lp-marquee-track:hover { animation-play-state: paused; }

    @keyframes lp-draw { to { stroke-dashoffset: 0; } }
    .lp-draw-line { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: lp-draw 2.2s cubic-bezier(0.65,0,0.35,1) 0.3s forwards; }

    @keyframes lp-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    .lp-rise-1 { animation: lp-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
    .lp-rise-2 { animation: lp-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
    .lp-rise-3 { animation: lp-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.30s both; }
    .lp-rise-4 { animation: lp-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.42s both; }

    @keyframes lp-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    .lp-pulse-dot { animation: lp-pulse-dot 1.6s ease-in-out infinite; }

    .lp-card { background: var(--card-bg); border: 1px solid var(--card-border); box-shadow: var(--card-shadow); }
    .lp-card-hover { transition: border-color 0.25s ease, transform 0.25s ease; }
    .lp-card-hover:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }

    @media (prefers-reduced-motion: reduce) {
      .lp-marquee-track, .lp-draw-line, .lp-rise-1, .lp-rise-2, .lp-rise-3, .lp-rise-4, .lp-pulse-dot { animation: none !important; }
      .lp-draw-line { stroke-dashoffset: 0; }
    }
  `}</style>
);

/* ---------- shared bits ---------- */

const SYMBOLS = ["XAUUSD +0.62%", "NAS100 −0.18%", "EURUSD +0.09%", "US30 +0.34%", "GBPUSD −0.05%", "BTCUSD +1.21%", "SPX500 +0.27%", "USDJPY −0.11%"];

const TickerTape = () => (
  <div className="border-y border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden py-2.5">
    <div className="lp-marquee-track">
      {[...SYMBOLS, ...SYMBOLS].map((s, i) => {
        const up = s.includes("+");
        return (
          <span key={i} className={`lp-mono text-xs font-semibold px-6 shrink-0 flex items-center gap-1.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s}
          </span>
        );
      })}
    </div>
  </div>
);

const Accordion = ({ q, a, open, onToggle }) => (
  <div className="border-b border-[var(--border-primary)]">
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 py-5 text-left">
      <span className="text-base font-semibold text-[var(--text-primary)]">{q}</span>
      <ChevronDown size={18} className={`shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
    </button>
    <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="overflow-hidden">
        <p className="text-sm text-[var(--text-tertiary)] leading-relaxed max-w-2xl">{a}</p>
      </div>
    </div>
  </div>
);

/* ---------- hero ---------- */

const HeroEquityLine = () => (
  <svg viewBox="0 0 640 220" className="w-full h-auto" fill="none">
    <defs>
      <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4F7CFF" />
        <stop offset="55%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#F472B6" />
      </linearGradient>
      <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 170 L60 165 L100 178 L150 140 L190 150 L230 100 L270 118 L320 70 L360 85 L410 45 L460 60 L510 25 L560 38 L640 10 L640 220 L0 220 Z" fill="url(#heroFill)" />
    <path className="lp-draw-line" d="M0 170 L60 165 L100 178 L150 140 L190 150 L230 100 L270 118 L320 70 L360 85 L410 45 L460 60 L510 25 L560 38 L640 10" stroke="url(#heroLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="640" cy="10" r="5" fill="#F472B6" />
  </svg>
);

const Hero = ({ onGetStarted, onSignIn, stats }) => (
  <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 overflow-hidden">
    <div className="lp-glow lp-gradient-bg w-[600px] h-[600px] -top-64 left-1/2 -translate-x-1/2" />
    <div className="relative max-w-5xl mx-auto text-center">
      <div className="lp-rise-1 inline-flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-full pl-2 pr-4 py-1.5 mb-8">
        <span className="w-2 h-2 rounded-full bg-emerald-400 lp-pulse-dot" />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Live rule tracking for prop firm evaluations</span>
      </div>

      <h1 className="lp-rise-2 lp-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6 text-[var(--text-primary)]">
        Trade with data.<br />Not vibes.
      </h1>
      <p className="lp-rise-2 text-lg md:text-xl text-[var(--text-tertiary)] max-w-2xl mx-auto mb-10 leading-relaxed">
        <span className="lp-gradient-text font-semibold">Strike Journal</span> logs every trade, tracks every prop firm rule in real time, and shows you exactly which setup, session, or emotion is actually costing you money.
      </p>

      <div className="lp-rise-3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
        <button onClick={onGetStarted} className="group flex items-center gap-2 lp-gradient-bg text-white font-bold px-7 py-3.5 rounded-xl shadow-[0_0_40px_-8px_rgba(168,85,247,0.6)] hover:shadow-[0_0_55px_-6px_rgba(168,85,247,0.8)] transition-shadow">
          Start free — no card required <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button onClick={onSignIn} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold px-7 py-3.5 transition-colors">
          Sign in
        </button>
      </div>

      <div className="lp-rise-4 relative max-w-3xl mx-auto">
        <div className="lp-card rounded-2xl p-5 md:p-8">
          <HeroEquityLine />
          <div className="flex items-center justify-between mt-2 pt-4 border-t border-[var(--border-primary)]">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">Net P&L, this month</div>
              <div className="lp-mono text-2xl font-bold text-emerald-400">+$4,218.60</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">Daily loss limit</div>
              <div className="lp-mono text-2xl font-bold text-[var(--text-primary)]">12% used</div>
            </div>
          </div>
        </div>
      </div>

      {(stats?.traders || stats?.trades) && (
        <div className="lp-rise-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 mt-14 text-[var(--text-tertiary)]">
          {stats.traders != null && <span className="text-sm"><span className="lp-mono font-bold text-[var(--text-primary)]">{stats.traders.toLocaleString()}</span> traders</span>}
          {stats.trades != null && <span className="text-sm"><span className="lp-mono font-bold text-[var(--text-primary)]">{stats.trades.toLocaleString()}</span> trades logged</span>}
          {stats.posts != null && <span className="text-sm"><span className="lp-mono font-bold text-[var(--text-primary)]">{stats.posts.toLocaleString()}</span> community posts</span>}
        </div>
      )}
    </div>
  </section>
);

/* ---------- problem ---------- */

const PROBLEMS = [
  { icon: Flame, title: "Revenge trading after a loss", desc: "You take an emotional entry to \"win it back\" instead of sticking to your plan." },
  { icon: XCircle, title: "Breaking your own rules", desc: "No daily loss limit, no max drawdown check — until it's too late and the challenge is over." },
  { icon: AlertTriangle, title: "No idea what's actually costing you", desc: "You know your win rate, but not which setup, session, or emotional state is bleeding your account." },
];

const ProblemSection = () => (
  <section className="py-20 md:py-28 px-4 border-t border-[var(--border-primary)]">
    <div className="max-w-5xl mx-auto">
      <div className="max-w-2xl mb-14">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Most traders don't fail on strategy. They fail on discipline.</h2>
        <p className="text-[var(--text-tertiary)] text-lg">A losing streak rarely comes from one bad idea — it comes from three or four small breaks in a row that nobody was tracking in real time.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {PROBLEMS.map((p, i) => (
          <div key={i} className="lp-card lp-card-hover rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center mb-5">
              <p.icon size={18} className="text-rose-400" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">{p.title}</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- flagship features (restructured: fewer, bigger, alternating) ---------- */

const FLAGSHIP = [
  {
    tag: "Compliance", icon: ShieldCheck, title: "Live funding challenge tracking",
    desc: "Enter your firm's rules once — daily loss limit, max drawdown, profit target, minimum trading days — and watch compliance update after every single trade, not at the end of the week.",
    stat: { label: "Daily loss used", value: "12%", color: "text-emerald-400" },
  },
  {
    tag: "Psychology", icon: Brain, title: "A discipline score, not just a P&L number",
    desc: "Every emotion tag you log feeds a real analysis: which negative states cost you the most, whether you're revenge trading after losses, and how your checklist discipline correlates with results.",
    stat: { label: "Discipline score", value: "84", color: "lp-gradient-text" },
  },
  {
    tag: "Risk", icon: Gauge, title: "Risk gauges that warn you before the breach",
    desc: "Instrument-style gauges show exactly how close you are to a daily or total loss limit — the moment you're at risk, not after you've already blown the evaluation.",
    stat: { label: "Max drawdown", value: "3.2 / 10%", color: "text-[var(--text-primary)]" },
  },
];

const FlagshipSection = () => (
  <section id="features" className="py-20 md:py-28 px-4 border-t border-[var(--border-primary)]">
    <div className="max-w-5xl mx-auto">
      <div className="max-w-2xl mb-16">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Built around the moments that actually break traders.</h2>
      </div>
      <div className="space-y-20">
        {FLAGSHIP.map((f, i) => (
          <div key={i} className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wide lp-gradient-text">{f.tag}</span>
              <h3 className="lp-display text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-2 mb-4">{f.title}</h3>
              <p className="text-[var(--text-tertiary)] leading-relaxed">{f.desc}</p>
            </div>
            <div className="lp-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 aspect-[4/3]">
              <f.icon size={40} className="text-[var(--text-faint)]" />
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{f.stat.label}</div>
                <div className={`lp-mono text-4xl font-bold ${f.stat.color}`}>{f.stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- compact feature grid (everything else) ---------- */

const MORE_FEATURES = [
  { icon: BookOpen, title: "Trade Journal", desc: "Entry/exit, setup tags, session, psychology notes, and chart screenshots on every trade." },
  { icon: NotebookPen, title: "Daily Market Plan", desc: "Write your bias and key levels before the session — trade the plan, not the moment." },
  { icon: Plug, title: "Broker Sync", desc: "Connect Robinhood, Schwab, Fidelity, IBKR, and 20+ brokerages — no manual entry." },
  { icon: CalendarDays, title: "P&L Calendar", desc: "Every day shaded by profit or loss so your best and worst days jump out fast." },
  { icon: BarChart3, title: "Analytics", desc: "Win rate, profit factor, R:R, streaks, and setup performance side by side." },
  { icon: Banknote, title: "Payout Tracking", desc: "Once you're funded, track profit splits and payout history in one place." },
  { icon: MessagesSquare, title: "Community & Live Chat", desc: "Post setups with screenshots and jump into real-time chat with other traders." },
  { icon: Users, title: "Trader Profiles & Friends", desc: "A profile with stats and an avatar. Build your circle of trading peers." },
  { icon: Send, title: "Private Messaging", desc: "Message any trader directly, with instant friend-request notifications." },
];

const MoreFeaturesSection = () => (
  <section className="py-20 md:py-28 px-4 border-t border-[var(--border-primary)]">
    <div className="max-w-5xl mx-auto">
      <h2 className="lp-display text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-12">Everything else you'd expect, and then some.</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MORE_FEATURES.map((f, i) => (
          <div key={i} className="lp-card lp-card-hover rounded-xl p-5">
            <f.icon size={18} className="text-[var(--text-muted)] mb-3" />
            <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1.5">{f.title}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- FAQ ---------- */

const FAQSection = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="py-20 md:py-28 px-4 border-t border-[var(--border-primary)]">
      <div className="max-w-3xl mx-auto">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-12">Questions, answered.</h2>
        <div>
          {FAQS.map((f, i) => (
            <Accordion key={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- final CTA ---------- */

const FinalCTA = ({ onGetStarted }) => (
  <section className="relative py-24 px-4 border-t border-[var(--border-primary)] overflow-hidden">
    <div className="lp-glow lp-gradient-bg w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    <div className="relative max-w-2xl mx-auto text-center">
      <h2 className="lp-display text-3xl md:text-5xl font-bold text-[var(--text-primary)] mb-5">Start trading like the data's actually watching.</h2>
      <p className="text-[var(--text-tertiary)] mb-9 text-lg">Free to start. No credit card. Your first trade takes under a minute to log.</p>
      <button onClick={onGetStarted} className="group inline-flex items-center gap-2 lp-gradient-bg text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_40px_-8px_rgba(168,85,247,0.6)] hover:shadow-[0_0_55px_-6px_rgba(168,85,247,0.8)] transition-shadow">
        Create your free account <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  </section>
);

/* ---------- nav + footer ---------- */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "#faq" },
];

const Nav = ({ onGetStarted, onSignIn }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <LogoFull size={28} forceLight />
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => <a key={l.label} href={l.href} className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{l.label}</a>)}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <button onClick={onSignIn} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2">Sign in</button>
          <button onClick={onGetStarted} className="lp-gradient-bg text-white text-sm font-bold px-4 py-2 rounded-lg">Get started</button>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} className="md:hidden text-[var(--text-primary)] p-2">{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-primary)] px-4 py-4 space-y-3">
          {NAV_LINKS.map((l) => <a key={l.label} href={l.href} className="block text-sm font-medium text-[var(--text-secondary)] py-1.5">{l.label}</a>)}
          <div className="flex gap-2 pt-2">
            <button onClick={onSignIn} className="flex-1 text-sm font-semibold text-[var(--text-secondary)] border border-[var(--border-secondary)] rounded-lg py-2.5">Sign in</button>
            <button onClick={onGetStarted} className="flex-1 lp-gradient-bg text-white text-sm font-bold rounded-lg py-2.5">Get started</button>
          </div>
        </div>
      )}
    </header>
  );
};

const RESOURCES_LINKS = [
  { label: "How it works", href: "#features" },
  { label: "Position Size Calculator", href: "/tools/position-size-calculator" },
  { label: "Blog", href: "/blog" },
  { label: "Changelog", href: "/changelog" },
];

const Footer = () => (
  <footer className="border-t border-[var(--border-primary)] py-14 px-4">
    <div className="max-w-6xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-10">
      <div>
        <LogoFull size={26} forceLight />
        <p className="text-sm text-[var(--text-muted)] mt-4 max-w-[220px]">A trading journal and prop firm challenge tracker built for traders who want the data, not the vibes.</p>
        <div className="flex items-center gap-3 mt-5">
          <a href="https://x.com" className="w-8 h-8 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><XLogoIcon size={14} /></a>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-4">Product</h4>
        <ul className="space-y-2.5">
          {NAV_LINKS.map((l) => <li key={l.label}><a href={l.href} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{l.label}</a></li>)}
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-4">Resources</h4>
        <ul className="space-y-2.5">
          {RESOURCES_LINKS.map((l) => <li key={l.label}><a href={l.href} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{l.label}</a></li>)}
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-4">Legal</h4>
        <ul className="space-y-2.5">
          <li><a href="/privacy" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a></li>
          <li><a href="/terms" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-[var(--border-primary)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-faint)]">
      <span>© {new Date().getFullYear()} Strike Journal. All rights reserved.</span>
      <span className="flex items-center gap-1.5"><Lock size={12} /> Your trade data is private by default.</span>
    </div>
  </footer>
);

/* ---------- page ---------- */

export default function LandingPage({ onGetStarted, onSignIn }) {
  usePageMeta({
    title: "Strike Journal — Trading Journal & Prop Firm Challenge Tracker",
    description: "Log trades, track prop firm challenge rules in real time, and see the analytics that explain your edge. Free trading journal — no credit card required.",
    path: "/",
  });

  const [stats, setStats] = useState(null);
  useEffect(() => { fetchLandingStats().then(setStats).catch(() => {}); }, []);

  return (
    <div className="lp-root min-h-screen">
      <LandingStyle />
      <Nav onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <TickerTape />
      <Hero onGetStarted={onGetStarted} onSignIn={onSignIn} stats={stats} />
      <ProblemSection />
      <FlagshipSection />
      <MoreFeaturesSection />
      <FAQSection />
      <FinalCTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
