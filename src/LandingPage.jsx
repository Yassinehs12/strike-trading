import React from "react";
import {
  ArrowRight, ShieldCheck, BookOpen, BarChart3, CalendarDays,
  Banknote, Gauge, CheckCircle2, TrendingUp, Menu, X,
  MessagesSquare, Users, Send,
} from "lucide-react";
import { LogoMark } from "./Logo";

const LandingStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');
    .lp-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .lp-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .lp-glow {
      background: radial-gradient(60% 50% at 50% 0%, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0) 70%);
    }
    .lp-card-glow {
      background: radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 60%);
    }
    @keyframes lp-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    .lp-float { animation: lp-float 6s ease-in-out infinite; }
    @keyframes lp-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .lp-fade-up { animation: lp-fade-up 0.6s ease-out both; }
  `}</style>
);

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

const FEATURES = [
  { icon: BookOpen, title: "Trade Journal", desc: "Log every trade with entry/exit, setup tags, session, and psychology notes — plus chart screenshots attached right to the trade." },
  { icon: ShieldCheck, title: "Funding Challenge Tracker", desc: "Live rule compliance for prop firm evaluations — daily loss limits, max drawdown, and profit targets monitored automatically. Optional for retail and self-funded traders." },
  { icon: Gauge, title: "Risk Gauges", desc: "Instrument-style gauges show exactly how close you are to breaching a daily or total loss limit, before it happens." },
  { icon: CalendarDays, title: "P&L Calendar Heatmap", desc: "See your trading patterns at a glance — every day shaded by profit or loss so you can spot your best and worst days fast." },
  { icon: BarChart3, title: "Analytics & Insights", desc: "Win rate, profit factor, R:R, streaks, and performance broken down by asset, session, and day of the week." },
  { icon: Banknote, title: "Payout Tracking", desc: "Once you're funded, track profit splits and payout history in the same place you tracked the evaluation." },
  { icon: MessagesSquare, title: "Community & Live Chat", desc: "Post setups with screenshots, reply to other traders, and jump into a real-time live chat with the whole community." },
  { icon: Users, title: "Trader Profiles & Friends", desc: "Every trader has a profile with an avatar, bio, and stats. Add friends and build your circle of trading peers." },
  { icon: Send, title: "Private Messaging", desc: "Message any trader directly, and get notified instantly when someone sends you a friend request." },
];

const STEPS = [
  { n: "01", title: "Create your account", desc: "Sign up free with email or Google — no credit card required." },
  { n: "02", title: "Set up your account", desc: "Trading a prop firm challenge? Enter its rules once and let the app track compliance. Trading your own capital? Skip straight to journaling." },
  { n: "03", title: "Log trades as you go", desc: "Every trade you journal updates your equity curve, analytics, and challenge status in real time." },
];

const NavBar = ({ onSignIn, onGetStarted }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center"><LogoMark size={17} className="text-black" /></div>
          <span className="font-bold text-white text-lg tracking-tight">Strike Trading</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onSignIn} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-2">Sign In</button>
          <button onClick={onGetStarted} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-all active:scale-95">
            Get Started <ArrowRight size={14} />
          </button>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen((o) => !o)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-4 space-y-3 bg-black">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-zinc-400">{l.label}</a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={onSignIn} className="w-full text-sm font-medium text-zinc-300 border border-white/10 rounded-lg py-2">Sign In</button>
            <button onClick={onGetStarted} className="w-full bg-blue-500 text-black font-semibold text-sm py-2 rounded-lg">Get Started</button>
          </div>
        </div>
      )}
    </header>
  );
};

// Stylized illustrative dashboard preview (not a literal screenshot)
const DashboardMock = () => (
  <div className="lp-float rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-blue-500/10 p-4 md:p-6 max-w-3xl mx-auto">
    <div className="flex items-center gap-1.5 mb-4">
      <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" /><span className="w-2.5 h-2.5 rounded-full bg-zinc-700" /><span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
    </div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[["Net Profit", "$7,069.50", "text-emerald-400"], ["Win Rate", "49.0%", "text-white"], ["Profit Factor", "1.94", "text-white"]].map(([label, val, color], i) => (
        <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">{label}</div>
          <div className={`lp-mono text-sm md:text-base font-bold ${color}`}>{val}</div>
        </div>
      ))}
    </div>
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
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
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">FTMO — Daily Loss</div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 bg-blue-500 rounded-full" /></div>
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Progress to Target</div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-4/5 bg-emerald-500 rounded-full" /></div>
      </div>
    </div>
  </div>
);

const Hero = ({ onGetStarted }) => (
  <section className="relative overflow-hidden pt-16 md:pt-24 pb-20 md:pb-28 px-4">
    <div className="absolute inset-0 lp-glow pointer-events-none" />
    <div className="relative max-w-4xl mx-auto text-center">
      <div className="lp-fade-up inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-zinc-400 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Built for every kind of trader
      </div>
      <h1 className="lp-fade-up text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5" style={{ animationDelay: "0.05s" }}>
        The trading journal built for<br className="hidden md:block" /> <span className="text-blue-400">all types of traders.</span>
      </h1>
      <p className="lp-fade-up text-base md:text-lg text-zinc-400 max-w-xl mx-auto mb-8" style={{ animationDelay: "0.1s" }}>
        Journal every trade, track funding challenge rules in real time, see the analytics that explain your edge, and connect with a community of traders — whether you're funded, self-funded, or just getting started.
      </p>
      <div className="lp-fade-up flex flex-col sm:flex-row items-center justify-center gap-3 mb-4" style={{ animationDelay: "0.15s" }}>
        <button onClick={onGetStarted} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-black font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 w-full sm:w-auto justify-center">
          Start Free <ArrowRight size={16} />
        </button>
      </div>
      <p className="lp-fade-up text-xs text-zinc-600" style={{ animationDelay: "0.2s" }}>No credit card required</p>
    </div>
    <div className="relative mt-14 md:mt-16 px-2 lp-fade-up" style={{ animationDelay: "0.25s" }}>
      <DashboardMock />
    </div>
  </section>
);

const Features = () => (
  <section id="features" className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="max-w-6xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to trade with discipline</h2>
        <p className="text-zinc-400">From your first evaluation trade to a fully funded, payout-eligible account — plus a community to trade alongside.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="lp-card-glow relative rounded-2xl border border-white/10 p-6 hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
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
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Up and running in minutes</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {STEPS.map((s, i) => (
          <div key={i} className="relative">
            <div className="lp-mono text-5xl font-bold text-blue-500/20 mb-3">{s.n}</div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> {s.title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA = ({ onGetStarted }) => (
  <section className="py-20 md:py-28 px-4 border-t border-white/5">
    <div className="relative max-w-3xl mx-auto text-center rounded-3xl border border-white/10 lp-card-glow p-10 md:p-14 overflow-hidden">
      <TrendingUp size={28} className="text-blue-400 mx-auto mb-5" />
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start journaling your next challenge today</h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">Free to start. Your trades, your rules monitor, your analytics — all in one dashboard.</p>
      <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-black font-semibold px-6 py-3 rounded-xl transition-all active:scale-95">
        Get Started Free <ArrowRight size={16} />
      </button>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 py-10 px-4">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center"><LogoMark size={14} className="text-black" /></div>
        <span className="font-bold text-white text-sm">Strike Trading</span>
      </div>
      <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Strike Trading. All rights reserved.</p>
    </div>
  </footer>
);

export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="lp-root min-h-screen bg-black text-white">
      <LandingStyle />
      <NavBar onSignIn={onSignIn} onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <Features />
      <HowItWorks />
      <FinalCTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
