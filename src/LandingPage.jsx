import React, { useState, useEffect } from "react";
import {
  ArrowRight, ShieldCheck, BookOpen, BarChart3, CalendarDays,
  Banknote, Gauge, CheckCircle2, TrendingUp, TrendingDown, Menu, X,
  MessagesSquare, Users, Send, Quote, Sparkles, ChevronDown, Lock, Zap, Instagram, Plug,
} from "lucide-react";
import { LogoMark } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { fetchLandingStats } from "./db";

const XLogoIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7.1L4.8 22H1.7l8-9.2L1 2h7.1l4.9 6.5L18.9 2zm-1.2 18h1.9L7.4 4H5.3l12.4 16z" />
  </svg>
);

const LandingStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
    .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .lp-display { font-family: 'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
    .lp-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }

    /* Chart-grid backdrop — graph-paper lines that fade toward the edges,
       standing in for the literal glow-blob. Uses theme border color so it
       adapts automatically between the light and dark variants. */
    .lp-chart-grid {
      background-image:
        linear-gradient(to right, var(--border-primary) 1px, transparent 1px),
        linear-gradient(to bottom, var(--border-primary) 1px, transparent 1px);
      background-size: 44px 44px;
      -webkit-mask-image: radial-gradient(ellipse 65% 55% at 50% 0%, black 30%, transparent 78%);
      mask-image: radial-gradient(ellipse 65% 55% at 50% 0%, black 30%, transparent 78%);
      opacity: 0.55;
    }
    .lp-glow {
      background: radial-gradient(50% 40% at 50% 0%, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 70%);
    }
    .lp-card-glow {
      background: radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 60%);
    }

    @keyframes lp-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    .lp-float { animation: lp-float 6s ease-in-out infinite; }
    @keyframes lp-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .lp-fade-up { animation: lp-fade-up 0.6s ease-out both; }

    /* Ticker tape — the page's signature element. Two copies of the same
       track back to back, animated exactly -50%, gives a seamless loop. */
    @keyframes lp-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .lp-ticker-track { animation: lp-ticker 34s linear infinite; }
    .lp-ticker-row:hover .lp-ticker-track { animation-play-state: paused; }

    @media (prefers-reduced-motion: reduce) {
      .lp-float, .lp-fade-up, .lp-ticker-track { animation: none !important; }
    }
  `}</style>
);

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Blog", href: "#/blog" },
  { label: "Changelog", href: "#/changelog" },
];

const FEATURES = [
  { tag: "Journal", icon: BookOpen, title: "Trade Journal", desc: "Log every trade with entry/exit, setup tags, session, and psychology notes — plus chart screenshots attached right to the trade." },
  { tag: "Sync", icon: Plug, title: "Broker Sync", desc: "Connect Robinhood, Schwab, Fidelity, IBKR, and 20+ other brokerages — trades and balances import automatically, no manual entry." },
  { tag: "Compliance", icon: ShieldCheck, title: "Funding Challenge Tracker", desc: "Live rule compliance for prop firm evaluations — daily loss limits, max drawdown, and profit targets monitored automatically. Optional for retail and self-funded traders." },
  { tag: "Risk", icon: Gauge, title: "Risk Gauges", desc: "Instrument-style gauges show exactly how close you are to breaching a daily or total loss limit, before it happens." },
  { tag: "Patterns", icon: CalendarDays, title: "P&L Calendar Heatmap", desc: "See your trading patterns at a glance — every day shaded by profit or loss so you can spot your best and worst days fast." },
  { tag: "Analytics", icon: BarChart3, title: "Analytics & Insights", desc: "Win rate, profit factor, R:R, streaks, and performance broken down by asset, session, and day of the week." },
  { tag: "Payouts", icon: Banknote, title: "Payout Tracking", desc: "Once you're funded, track profit splits and payout history in the same place you tracked the evaluation." },
  { tag: "Community", icon: MessagesSquare, title: "Community & Live Chat", desc: "Post setups with screenshots, reply to other traders, and jump into a real-time live chat with the whole community." },
  { tag: "Profiles", icon: Users, title: "Trader Profiles & Friends", desc: "Every trader has a profile with an avatar, bio, and stats. Add friends and build your circle of trading peers." },
  { tag: "Messaging", icon: Send, title: "Private Messaging", desc: "Message any trader directly, and get notified instantly when someone sends you a friend request." },
];

const STEPS = [
  { n: "01", title: "Create your account", desc: "Sign up free with your email — no credit card required." },
  { n: "02", title: "Set up your account", desc: "Trading a prop firm challenge? Enter its rules once and let the app track compliance. Trading your own capital? Skip straight to journaling." },
  { n: "03", title: "Log trades as you go", desc: "Every trade you journal updates your equity curve, analytics, and challenge status in real time." },
];

// Real testimonials only — add a quote here once you have genuine feedback
// from actual users. The section below only renders if this array is
// non-empty, so it's safe to leave blank until you have real quotes.
// Shape: { quote: "...", name: "First L.", role: "Funded trader" }
const TESTIMONIALS = [];

const FAQS = [
  { q: "Is Strike Journal free to use?", a: "Yes — journaling, analytics, and the community are free to start. No credit card is required to sign up." },
  { q: "Do I need to be in a prop firm challenge to use this?", a: "No. The funding challenge tracker is optional. If you trade your own capital, you can skip it entirely and just use the journal, analytics, and risk gauges." },
  { q: "Which prop firms does the challenge tracker work with?", a: "You enter your firm's rules once — daily loss limit, max drawdown, profit target, and minimum trading days — and the app tracks compliance against those numbers in real time, so it works with any firm's rule set." },
  { q: "Is my trading data private?", a: "Your individual trades and P&L are private by default. You control what's public on your profile, including whether your stats appear on the leaderboard — that's off unless you opt in." },
  { q: "Can I use this on my phone?", a: "Yes, the app is fully responsive and works in any mobile browser. Log trades, check your gauges, and catch up on the community from your phone." },
];

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-5">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left">
        <span className="text-sm md:text-base font-semibold text-[var(--text-primary)]">{q}</span>
        <ChevronDown size={16} className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mt-3 pr-8">{a}</p>}
    </div>
  );
};

const FAQ = () => (
  <section id="faq" className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Frequently asked questions</h2>
      </div>
      <div>
        {FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
      </div>
    </div>
  </section>
);

const TICKER_SYMBOLS = [
  { sym: "EUR/USD", chg: "+0.14%", up: true },
  { sym: "XAU/USD", chg: "+0.62%", up: true },
  { sym: "US30", chg: "-0.21%", up: false },
  { sym: "NAS100", chg: "+0.38%", up: true },
  { sym: "GBP/JPY", chg: "-0.09%", up: false },
  { sym: "BTC/USD", chg: "+1.85%", up: true },
  { sym: "WTI", chg: "-0.47%", up: false },
  { sym: "ETH/USD", chg: "+0.93%", up: true },
];

const TickerTape = () => {
  const row = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS];
  return (
    <div className="lp-ticker-row overflow-hidden border-b border-white/5 bg-white/[0.015]">
      <div className="lp-ticker-track flex items-center w-max py-2.5">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {row.map((t, i) => (
              <div key={`${copy}-${i}`} className="flex items-center gap-2 px-5 whitespace-nowrap">
                <span className="lp-mono text-xs font-medium text-[var(--text-tertiary)]">{t.sym}</span>
                <span className={`lp-mono flex items-center gap-0.5 text-xs font-semibold ${t.up ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {t.chg}
                </span>
                <span className="w-px h-3 bg-white/10 ml-3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const NavBar = ({ onSignIn, onGetStarted }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center"><LogoMark size={17} bare className="text-[var(--text-inverse)]" /></div>
          <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">Strike Journal</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <button onClick={onSignIn} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2">Sign In</button>
          <button onClick={onGetStarted} className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2 rounded-lg transition-all active:scale-95">
            Get Started <ArrowRight size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="text-[var(--text-primary)]" onClick={() => setOpen((o) => !o)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-4 space-y-3 bg-[var(--bg-primary)]">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-[var(--text-tertiary)]">{l.label}</a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={onSignIn} className="w-full text-sm font-medium text-[var(--text-secondary)] border border-white/10 rounded-lg py-2">Sign In</button>
            <button onClick={onGetStarted} className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-semibold text-sm py-2 rounded-lg">Get Started</button>
          </div>
        </div>
      )}
    </header>
  );
};

// Stylized illustrative dashboard preview (not a literal screenshot)
const DashboardMock = () => {
  const candles = [
    { o: 40, c: 30, h: 46, l: 26 }, { o: 30, c: 38, h: 42, l: 27 }, { o: 38, c: 33, h: 41, l: 30 },
    { o: 33, c: 22, h: 35, l: 18 }, { o: 22, c: 28, h: 31, l: 19 }, { o: 28, c: 16, h: 30, l: 13 },
    { o: 16, c: 24, h: 27, l: 12 }, { o: 24, c: 14, h: 26, l: 10 }, { o: 14, c: 20, h: 23, l: 9 },
    { o: 20, c: 9, h: 22, l: 6 }, { o: 9, c: 15, h: 17, l: 5 }, { o: 15, c: 6, h: 18, l: 3 },
  ];
  return (
    <div className="lp-float rounded-2xl border border-white/10 bg-[var(--bg-primary)]/80 shadow-2xl shadow-blue-500/10 p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--bg-quaternary)]" /><span className="w-2.5 h-2.5 rounded-full bg-[var(--bg-quaternary)]" /><span className="w-2.5 h-2.5 rounded-full bg-[var(--bg-quaternary)]" />
        </div>
        <span className="lp-mono text-[10px] text-[var(--text-faint)] uppercase tracking-wider">EURUSD · 15m</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[["Net Profit", "$7,069.50", "text-emerald-400"], ["Win Rate", "49.0%", "text-[var(--text-primary)]"], ["Profit Factor", "1.94", "text-[var(--text-primary)]"]].map(([label, val, color], i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</div>
            <div className={`lp-mono text-sm md:text-base font-bold ${color}`}>{val}</div>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
        <svg viewBox="0 0 400 60" className="w-full h-14 mb-1">
          {candles.map((c, i) => {
            const x = i * 33 + 8;
            const up = c.c < c.o; // svg y grows downward, so a lower c value here reads as "up"
            return (
              <g key={i} stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1.5">
                <line x1={x} y1={c.h} x2={x} y2={c.l} />
                <rect x={x - 4} y={Math.min(c.o, c.c)} width="8" height={Math.max(Math.abs(c.o - c.c), 2)} fill={up ? "#34d399" : "#fb7185"} fillOpacity="0.85" />
              </g>
            );
          })}
        </svg>
        <svg viewBox="0 0 400 120" className="w-full h-24 md:h-28">
          <defs>
            <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,90 L30,85 L60,70 L90,75 L120,55 L150,60 L180,40 L210,45 L240,25 L270,30 L300,15 L330,20 L360,10 L400,18 L400,120 L0,120 Z" fill="url(#lpArea)" />
          <path d="M0,90 L30,85 L60,70 L90,75 L120,55 L150,60 L180,40 L210,45 L240,25 L270,30 L300,15 L330,20 L360,10 L400,18" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">FTMO — Daily Loss</div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 bg-[var(--accent)] rounded-full" /></div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">Progress to Target</div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-4/5 bg-emerald-500 rounded-full" /></div>
        </div>
      </div>
    </div>
  );
};

const Hero = ({ onGetStarted }) => (
  <section className="relative overflow-hidden pt-14 md:pt-20 pb-20 md:pb-28 px-4">
    <div className="absolute inset-0 lp-chart-grid pointer-events-none" />
    <div className="absolute inset-0 lp-glow pointer-events-none" />
    <div className="relative max-w-4xl mx-auto text-center">
      <div className="lp-fade-up inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="lp-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Built for every kind of trader</span>
      </div>
      <h1 className="lp-fade-up lp-display text-4xl md:text-6xl font-bold text-[var(--text-primary)] leading-[1.08] mb-5" style={{ animationDelay: "0.05s" }}>
        The trading journal built for<br className="hidden md:block" /> <span className="text-[var(--accent)]">all types of traders.</span>
      </h1>
      <p className="lp-fade-up text-base md:text-lg text-[var(--text-tertiary)] max-w-xl mx-auto mb-8" style={{ animationDelay: "0.1s" }}>
        Journal every trade, track funding challenge rules in real time, see the analytics that explain your edge, and connect with a community of traders — whether you're funded, self-funded, or just getting started.
      </p>
      <div className="lp-fade-up flex flex-col sm:flex-row items-center justify-center gap-3 mb-4" style={{ animationDelay: "0.15s" }}>
        <button onClick={onGetStarted} className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 w-full sm:w-auto justify-center shadow-lg shadow-blue-500/20">
          Start Free <ArrowRight size={16} />
        </button>
      </div>
      <div className="lp-fade-up flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2 text-xs text-[var(--text-tertiary)]" style={{ animationDelay: "0.22s" }}>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Free to start</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> No credit card</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Cancel anytime</span>
      </div>
    </div>
    <div className="relative mt-14 md:mt-16 px-2 lp-fade-up" style={{ animationDelay: "0.25s" }}>
      <DashboardMock />
    </div>
  </section>
);

const SocialProof = () => {
  const [stats, setStats] = useState(null); // null = loading/unavailable

  useEffect(() => {
    fetchLandingStats().then(setStats).catch(() => setStats({ traders: null, trades: null, posts: null }));
  }, []);

  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

  const items = stats
    ? [
        { label: "Traders", value: stats.traders },
        { label: "Trades logged", value: stats.trades },
        { label: "Community posts", value: stats.posts },
      ].filter((i) => typeof i.value === "number" && i.value > 0)
    : [];

  // Don't show a stats bar with fake/placeholder numbers. Once real usage
  // exists it appears automatically; until then, show an honest early-access
  // framing instead of a hollow "0 traders" row.
  if (items.length === 0) {
    return (
      <section className="px-4 -mt-6 md:-mt-8 relative">
        <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] border border-white/10 rounded-full px-4 py-2 w-fit mx-auto bg-white/[0.02]">
          <Sparkles size={13} className="text-[var(--accent)]" /> Early access — be one of the first traders on the platform
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 -mt-6 md:-mt-8 relative">
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3 md:gap-6">
        {items.map((i) => (
          <div key={i.label} className="text-center border border-white/10 rounded-xl bg-white/[0.02] py-4">
            <div className="lp-mono text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{fmt(i.value)}+</div>
            <div className="text-[11px] md:text-xs text-[var(--text-muted)] mt-1">{i.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Testimonials = () => {
  if (TESTIMONIALS.length === 0) return null;
  return (
    <section className="py-20 md:py-28 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">What traders are saying</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-6">
              <Quote size={18} className="text-[var(--accent)]/60 mb-3" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{t.quote}</p>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</div>
              {t.role && <div className="text-xs text-[var(--text-muted)]">{t.role}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Features = () => (
  <section id="features" className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="max-w-6xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Everything you need to trade with discipline</h2>
        <p className="text-[var(--text-tertiary)]">From your first evaluation trade to a fully funded, payout-eligible account — plus a community to trade alongside.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="lp-card-glow group relative rounded-2xl border border-white/10 border-t-2 border-t-white/10 hover:border-t-[var(--accent)] p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                  <Icon size={18} className="text-[var(--accent)]" />
                </div>
                <span className="lp-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors">{f.tag}</span>
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section id="how-it-works" className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="max-w-5xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Up and running in minutes</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 relative">
        <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {STEPS.map((s, i) => (
          <div key={i} className="relative">
            <div className="lp-mono text-5xl font-bold text-[var(--accent)]/20 mb-3">{s.n}</div>
            <h3 className="text-[var(--text-primary)] font-semibold mb-2 flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--accent)]" /> {s.title}</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA = ({ onGetStarted }) => (
  <section className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="relative max-w-3xl mx-auto text-center rounded-3xl border border-white/10 p-10 md:p-14 overflow-hidden">
      <div className="absolute inset-0 lp-chart-grid pointer-events-none" />
      <div className="absolute inset-0 lp-card-glow pointer-events-none" />
      <TrendingUp size={28} className="relative text-[var(--accent)] mx-auto mb-5" />
      <h2 className="relative lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Start journaling your next challenge today</h2>
      <p className="relative text-[var(--text-tertiary)] mb-8 max-w-md mx-auto">Free to start. Your trades, your rules monitor, your analytics — all in one dashboard.</p>
      <button onClick={onGetStarted} className="relative inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">
        Get Started Free <ArrowRight size={16} />
      </button>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 py-12 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center"><LogoMark size={14} bare className="text-[var(--text-inverse)]" /></div>
            <span className="font-bold text-[var(--text-primary)] text-sm">Strike Journal</span>
          </div>
          <p className="text-xs text-[var(--text-faint)] max-w-xs mb-3">A trading journal and funding challenge tracker for traders who take their edge seriously.</p>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <a
              href="https://x.com/strikejournals?s=11"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Strike Journal on X"
              className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
            >
              <XLogoIcon size={14} />
            </a>
            <a
              href="https://www.instagram.com/strikejournals?igsh=MXVrbWZzMmUxZDQzZg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Strike Journal on Instagram"
              className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
            >
              <Instagram size={15} />
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{l.label}</a>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
        <p className="text-xs text-[var(--text-faint)]">© {new Date().getFullYear()} Strike Journal. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a href="#/blog" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Blog</a>
          <a href="#/privacy" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
          <a href="#/terms" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
          <a href="https://discord.gg/WuJSsCb3AW" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Discord</a>
          <a href="mailto:support@strikejournal.com?subject=Bug%20report" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors">Report a bug</a>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]"><Lock size={12} /> Your trade data stays private by default</span>
        </div>
      </div>
    </div>
  </footer>
);

export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="lp-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LandingStyle />
      <NavBar onSignIn={onSignIn} onGetStarted={onGetStarted} />
      <TickerTape />
      <Hero onGetStarted={onGetStarted} />
      <SocialProof />
      <Features />
      <Testimonials />
      <HowItWorks />
      <FAQ />
      <FinalCTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
