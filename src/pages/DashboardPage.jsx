import React, { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck, BookOpen, Plus, X, TrendingUp, Percent, Target, Activity, CheckCircle2, Wallet, Sparkles, Check, ShieldAlert, Shield, Loader2,
} from "lucide-react";
import { computePsychologyReport } from "../psychology";
import { filterTradesByPeriod } from "../insights";
import { computeChallengeStats, computeKPIs, equityCurve } from "../lib/tradeCalculations";
import { CalendarCard } from "../pages/JournalPage";
import { PRE_MARKET_CHECKLIST_ITEMS, SCORE_RING_COLORS } from "../constants";
import { Card, CustomTooltip, EmptyState, KPICard, ProgressBar, StatusPill, UpgradeGate } from "../components/ui/Primitives";
import { fmtUSD, fmtUSD2, isoWeekKey, todayISO } from "../lib/format";
import { RuleViolationAlerts } from "../components/trades/TradeComponents";
import { fetchChecklistState, saveChecklistState } from "../db";

export const PsychologyReportCard = ({ trades }) => {
  const [period, setPeriod] = useState("week"); // "week" | "month"
  const scoped = useMemo(() => filterTradesByPeriod(trades, period === "week" ? 7 : 30), [trades, period]);
  const { findings, score, scoreMeta, sampleSize, ready } = useMemo(
    () => computePsychologyReport(scoped, period === "week" ? "week" : "month"),
    [scoped, period]
  );

  const iconFor = (type) => {
    if (type === "strength") return <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />;
    if (type === "risk") return <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />;
    if (type === "summary") return <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />;
    return <Shield size={14} className="text-[var(--text-tertiary)] shrink-0 mt-0.5" />;
  };

  const ringColor = ready ? SCORE_RING_COLORS[scoreMeta.color] : "#3378ff";
  const ringPct = ready ? score : 0;
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - ringPct / 100);

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Psychology Report</h3>
          <p className="text-xs text-[var(--text-muted)]">Emotional state and discipline patterns from your own trade history — not advice, just what the data shows.</p>
        </div>
        <div className="flex items-center bg-[var(--bg-primary)] border border-white/10 rounded-lg p-0.5 shrink-0">
          <button onClick={() => setPeriod("week")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "week" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Week</button>
          <button onClick={() => setPeriod("month")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "month" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Month</button>
        </div>
      </div>

      {!ready ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">No closed trades this {period} yet.</p>
          <p className="text-xs text-[var(--text-faint)] mt-1">Keep logging emotion tags — your report unlocks once there's enough data to spot real patterns.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mt-3 pb-3 border-b border-white/10">
            <div className="relative w-16 h-16 shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--bg-primary)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke={ringColor} strokeWidth="6"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold tj-mono text-[var(--text-primary)]">{score}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{scoreMeta.label}</div>
              <div className="text-xs text-[var(--text-muted)]">Discipline score, based on {sampleSize} closed trades</div>
            </div>
          </div>

          <div className="space-y-2.5 mt-3">
            {findings.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm ${f.type === "summary" ? "hidden" : "text-[var(--text-secondary)]"}`}>
                {iconFor(f.type)}
                <span><span className="font-semibold text-[var(--text-primary)]">{f.title}.</span> {f.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

// Returns a stable per-week key (e.g. "2026-W29") so we can remember whether
// the person already dismissed this week's recap without needing a backend.


export const WeeklyRecapCard = ({ trades }) => {
  const weekKey = isoWeekKey();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("weeklyRecap.dismissedWeek") === weekKey; } catch { return false; }
  });

  const thisWeek = useMemo(() => filterTradesByPeriod(trades, 7), [trades]);
  const prevWeek = useMemo(() => {
    const last14 = filterTradesByPeriod(trades, 14);
    const thisWeekIds = new Set(thisWeek.map((t) => t.id));
    return last14.filter((t) => !thisWeekIds.has(t.id));
  }, [trades, thisWeek]);

  if (dismissed || thisWeek.length === 0) return null;

  const kpis = computeKPIs(thisWeek);
  const prevKpis = computeKPIs(prevWeek);
  const netDelta = kpis.netProfit - prevKpis.netProfit;
  const winRateDelta = prevWeek.length ? kpis.winRate - prevKpis.winRate : null;
  const bestDay = [...thisWeek].sort((a, b) => (b.pnl - b.fees) - (a.pnl - a.fees))[0];

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("weeklyRecap.dismissedWeek", weekKey); } catch {}
  };

  const isUp = kpis.netProfit >= 0;

  return (
    <Card className="p-4 md:p-5 relative overflow-hidden border-[var(--accent)]/30">
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ background: "radial-gradient(60% 100% at 0% 0%, #3b82f6 0%, transparent 70%)" }} />
      <button onClick={dismiss} className="absolute top-3 right-3 text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors z-10" aria-label="Dismiss weekly recap">
        <X size={16} />
      </button>

      <div className="relative flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Your week in review</h3>
          <p className="text-xs text-[var(--text-muted)]">Last 7 days, compared to the week before</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Net P&L</p>
          <p className={`text-lg font-bold tj-mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>{isUp ? "+" : ""}{fmtUSD2(kpis.netProfit)}</p>
          {prevWeek.length > 0 && (
            <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{netDelta >= 0 ? "▲" : "▼"} {fmtUSD2(Math.abs(netDelta))} vs last week</p>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
          <p className="text-lg font-bold tj-mono text-[var(--text-primary)]">{kpis.winRate.toFixed(0)}%</p>
          {winRateDelta !== null && (
            <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{winRateDelta >= 0 ? "▲" : "▼"} {Math.abs(winRateDelta).toFixed(0)}pt vs last week</p>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Trades Logged</p>
          <p className="text-lg font-bold tj-mono text-[var(--text-primary)]">{thisWeek.length}</p>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{prevWeek.length} last week</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Best Trade</p>
          <p className="text-lg font-bold tj-mono text-emerald-400">{bestDay ? fmtUSD2(bestDay.pnl - bestDay.fees) : "—"}</p>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{bestDay ? bestDay.asset : "No trades yet"}</p>
        </div>
      </div>
    </Card>
  );
};


export const PreMarketChecklistCard = ({ userId, accounts = [] }) => {
  const [accountId, setAccountId] = useState(null); // null = shared/"All accounts" checklist
  const [day, setDay] = useState(todayISO());
  const [checked, setChecked] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Load from the server whenever the user, selected account, or day
  // changes — this is what makes the checklist follow you across devices
  // instead of being stuck in whichever browser you checked it in.
  useEffect(() => {
    if (!userId) { setChecked({}); setLoaded(true); return; }
    setLoaded(false);
    fetchChecklistState(userId, accountId, day)
      .then(setChecked)
      .catch(() => setChecked({}))
      .finally(() => setLoaded(true));
  }, [userId, accountId, day]);

  // If the tab is left open across midnight, roll over to a fresh checklist
  // without needing a page refresh.
  useEffect(() => {
    const id = setInterval(() => {
      const now = todayISO();
      if (now !== day) setDay(now);
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [day]);

  const toggle = (i) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next); // optimistic — feels instant, persists in the background
    if (userId) saveChecklistState(userId, accountId, day, next).catch(() => {});
  };
  const doneCount = PRE_MARKET_CHECKLIST_ITEMS.filter((_, i) => checked[i]).length;
  const allDone = doneCount === PRE_MARKET_CHECKLIST_ITEMS.length;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Pre-Market Checklist</h3>
          <p className="text-xs text-[var(--text-muted)]">Syncs across your devices · resets every day · {doneCount}/{PRE_MARKET_CHECKLIST_ITEMS.length} done today</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {accounts.length > 0 && (
            <select
              value={accountId || ""}
              onChange={(e) => setAccountId(e.target.value || null)}
              className="text-xs font-semibold rounded-lg border px-2.5 py-1.5 bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)] focus:outline-none focus:border-[var(--accent)]/60 cursor-pointer transition-colors"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          {loaded ? (
            <CheckCircle2 size={18} className={allDone ? "text-emerald-400" : "text-[var(--text-tertiary)]"} />
          ) : (
            <Loader2 size={16} className="text-[var(--text-tertiary)] animate-spin" />
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {PRE_MARKET_CHECKLIST_ITEMS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
              checked[i] ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[var(--bg-primary)] border-white/10 hover:border-white/20"
            }`}
          >
            <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border ${checked[i] ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}>
              {checked[i] && <Check size={11} className="text-white" />}
            </span>
            <span className={`text-sm ${checked[i] ? "text-emerald-400 line-through decoration-emerald-400/50" : "text-[var(--text-secondary)]"}`}>{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
};

// Live prop-firm rule violation alerts. Reuses computeChallengeStats (same
// numbers already driving the challenge progress bars) so there's no second
// source of truth — a challenge that's failed here is failed everywhere else
// too. Only renders when there's something worth flagging: a breach, or a
// challenge that's used 80%+ of its daily or total loss allowance.


export const DashboardPage = ({ trades, challenges, onOpenTrade, profile, onLogTrade, setActive, userId, accounts = [] }) => {
  const kpis = computeKPIs(trades);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const recent = trades.slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {trades.length === 0 && (
        <Card className="p-5 md:p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 15% 20%, var(--accent), transparent 55%)" }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Welcome{profile?.username ? `, ${profile.username}` : ""} — let's get your first entry in</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Log a trade to see your equity curve and analytics come alive, or set up a funding challenge if you're on a prop firm evaluation.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => onLogTrade && onLogTrade()}
                className="flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} /> Log your first trade
              </button>
              <button
                onClick={() => setActive && setActive("challenges")}
                className="flex items-center justify-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all active:scale-95"
              >
                <ShieldCheck size={15} /> Set up a challenge
              </button>
            </div>
          </div>
        </Card>
      )}

      <WeeklyRecapCard trades={trades} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KPICard icon={Wallet} label="Net Profit" value={fmtUSD2(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} sub="all-time" />
        <KPICard icon={Percent} label="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} sub={`${trades.filter(t=>t.status==='Win').length} wins`} />
        <KPICard icon={Target} label="Profit Factor" value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)} sub="gross win / gross loss" />
        <KPICard icon={Activity} label="Total Trades" value={kpis.total} sub="logged entries" />
        <KPICard icon={ShieldCheck} label="Active Challenges" value={challenges.length} accent="text-[var(--accent)]" sub="funding evaluations" />
      </div>

      <RuleViolationAlerts challenges={challenges} trades={trades} />

      <UpgradeGate profile={profile} feature="Psychology Report" description="Discipline scoring and emotional-pattern breakdowns computed from your trade tags.">
        <PsychologyReportCard trades={trades} />
      </UpgradeGate>

      <PreMarketChecklistCard userId={userId} accounts={accounts} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-bold text-[var(--text-primary)] text-sm">Equity Curve</h3><p className="text-xs text-[var(--text-muted)]">Cumulative net P&L over time</p></div>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          {curve.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={curve}>
                <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip prefix="$" />} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fill="url(#eqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} title="No trades yet" sub="Log your first trade to see your equity curve." />}
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Active Challenges</h3>
          <div className="space-y-5">
            {challenges.slice(0, 2).map((c) => {
              const s = computeChallengeStats(c, trades);
              return (
                <div key={c.id} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{c.firm}</span>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1"><span>{fmtUSD(s.currentBalance)}</span><span>Target {fmtUSD(s.targetBalance)}</span></div>
                  <ProgressBar pct={s.progressToTarget} />
                </div>
              );
            })}
            {challenges.length === 0 && <EmptyState icon={ShieldCheck} title="No challenges yet" sub="Create a funding challenge to start tracking rules." />}
          </div>
        </Card>
      </div>

      <CalendarCard trades={trades} onOpenTrade={onOpenTrade} />

      <Card className="p-4 md:p-5">
        <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Recent Trades</h3>
        {recent.length ? (
          <div className="overflow-x-auto tj-scrollbar">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-white/10">
                  <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Asset</th><th className="pb-2 font-medium">Dir</th>
                  <th className="pb-2 font-medium">Setup</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} onClick={() => onOpenTrade(t)} className="border-b border-[var(--border-primary)] last:border-0 cursor-pointer hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <td className="py-2.5 text-[var(--text-tertiary)] tj-mono text-xs">{t.date}</td>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">{t.asset}</td>
                    <td className={`py-2.5 ${t.direction === "Long" ? "text-emerald-400" : "text-rose-400"}`}>{t.direction}</td>
                    <td className="py-2.5 text-[var(--text-tertiary)]">{t.setup}</td>
                    <td className="py-2.5"><StatusPill status={t.status} /></td>
                    <td className={`py-2.5 text-right tj-mono font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl >= 0 ? "+" : ""}{fmtUSD2(t.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={BookOpen} title="No trades logged" sub="Click “Log Trade” in the top bar to add your first entry." />}
      </Card>
    </div>
  );
};

/* ============================================================
   CHALLENGES PAGE (cards + compare + payouts)
   ============================================================ */
