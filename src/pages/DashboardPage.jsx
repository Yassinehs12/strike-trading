import React, { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck, BookOpen, Plus, X, TrendingUp, TrendingDown, Sparkles, ShieldAlert, Shield,
  ArrowRight, Target, NotebookPen, ClipboardList, Brain, Lightbulb, Trophy,
} from "lucide-react";
import { computePsychologyReport } from "../psychology";
import { filterTradesByPeriod, computeInsights } from "../insights";
import { computeChallengeStats, computeKPIs, computeDrawdownSeries, equityCurve } from "../lib/tradeCalculations";
import { CalendarCard } from "../pages/JournalPage";
import { SCORE_RING_COLORS } from "../constants";
import { Card, CustomTooltip, EmptyState, ProgressBar, StatusPill, UpgradeGate, SemicircleGauge, RingGauge } from "../components/ui/Primitives";
import { fmtUSD, fmtUSD2, isoWeekKey } from "../lib/format";
import { RuleViolationAlerts } from "../components/trades/TradeComponents";
import { fetchGoals } from "../db";

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
      <div className="flex items-center justify-between mb-1 gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/12 flex items-center justify-center shrink-0 mt-0.5">
            <Brain size={15} className="text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Psychology</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">Understand the emotional and behavioral patterns behind your trades.</p>
          </div>
        </div>
        <div className="flex items-center bg-[var(--bg-primary)] border border-white/10 rounded-lg p-0.5 shrink-0">
          <button onClick={() => setPeriod("week")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "week" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Week</button>
          <button onClick={() => setPeriod("month")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "month" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Month</button>
        </div>
      </div>

      {!ready ? (
        <div className="py-8 text-center flex flex-col items-center">
          <div className="w-11 h-11 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-3">
            <Sparkles size={18} className="text-[var(--accent)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Your psychology profile is still developing.</p>
          <p className="text-xs text-[var(--text-faint)] mt-1 max-w-xs">Log more trades and emotion tags to uncover behavioral patterns — no closed trades this {period} yet.</p>
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


// Live prop-firm rule violation alerts. Reuses computeChallengeStats (same
// numbers already driving the challenge progress bars) so there's no second
// source of truth — a challenge that's failed here is failed everywhere else
// too. Only renders when there's something worth flagging: a breach, or a
// challenge that's used 80%+ of its daily or total loss allowance.


/* ---------- small dashboard-only building blocks ---------- */

// Compact secondary-tier metric tile — used for win rate / profit factor /
// trade count / avg win-loss beside the Net P&L hero. Deliberately smaller
// and quieter than the hero card so hierarchy reads instantly.
const MetricTile = ({ label, value, valueClassName = "text-[var(--text-primary)]", sub, graphic }) => (
  <Card className="p-3.5 md:p-4 tj-animate-in">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 truncate">{label}</div>
        <div className={`tj-mono text-xl md:text-2xl font-bold leading-none ${valueClassName}`}>{value}</div>
        {sub && <div className="text-[11px] text-[var(--text-faint)] mt-1.5">{sub}</div>}
      </div>
      {graphic && <div className="shrink-0">{graphic}</div>}
    </div>
  </Card>
);

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
  >
    <Icon size={14} className="text-[var(--accent)] shrink-0" />
    {label}
  </button>
);

// Small dashboard-scoped goal widget. Reads goals the same way GoalsPage does
// (fetchGoals + the trades already on hand) but only ever displays a single
// nearest active "profit" or "trade_count" / "win_rate" goal — never
// duplicates the full Goals page. Silently renders nothing if the request
// fails or there's no active goal, since this is a supplementary widget.
const useNearestGoal = (userId, trades) => {
  const [goals, setGoals] = useState(null); // null = not loaded yet
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setGoals([]); return; }
    fetchGoals(userId).then((g) => { if (!cancelled) setGoals(g); }).catch(() => { if (!cancelled) setGoals([]); });
    return () => { cancelled = true; };
  }, [userId]);

  return useMemo(() => {
    if (!goals) return { loading: true, goal: null };
    const active = goals.filter((g) => g.status === "active" && g.metric !== "custom");
    if (!active.length) return { loading: false, goal: null };
    const withEnd = active.filter((g) => g.endDate).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    const g = withEnd[0] || active[0];

    const inRange = trades.filter((t) => {
      if (g.startDate && t.date < g.startDate) return false;
      if (g.endDate && t.date > g.endDate) return false;
      return true;
    });
    let current = 0;
    if (g.metric === "profit") current = inRange.reduce((s, t) => s + (t.pnl || 0), 0);
    else if (g.metric === "trade_count") current = inRange.length;
    else if (g.metric === "win_rate") {
      const closed = inRange.filter((t) => t.status === "Win" || t.status === "Loss");
      current = closed.length ? (closed.filter((t) => t.status === "Win").length / closed.length) * 100 : 0;
    }
    const target = g.targetValue ?? 0;
    const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
    return { loading: false, goal: { ...g, current, target, pct } };
  }, [goals, trades]);
};

const formatGoalValue = (metric, v) => {
  if (v == null) return "—";
  if (metric === "profit") return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (metric === "win_rate") return `${v.toFixed(0)}%`;
  return Math.round(v).toLocaleString();
};

const GoalWidgetCard = ({ userId, trades, setActive }) => {
  const { loading, goal } = useNearestGoal(userId, trades);
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Target size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Goal</h3></div>
        <button onClick={() => setActive && setActive("goals")} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-0.5">
          View Goals <ArrowRight size={11} />
        </button>
      </div>
      {loading ? (
        <div className="h-16" />
      ) : goal ? (
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate mb-2">{goal.title}</div>
          <div className="flex items-end justify-between mb-2">
            <span className="tj-mono text-xl font-bold text-[var(--text-primary)]">{formatGoalValue(goal.metric, goal.current)}</span>
            <span className="text-xs text-[var(--text-muted)]">of {formatGoalValue(goal.metric, goal.target)}</span>
          </div>
          <ProgressBar pct={goal.pct} />
          <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--text-faint)]">
            <span>{goal.pct.toFixed(0)}% achieved</span>
            {goal.metric !== "win_rate" && goal.target > goal.current && (
              <span>{formatGoalValue(goal.metric, goal.target - goal.current)} remaining</span>
            )}
          </div>
        </div>
      ) : (
        <EmptyState icon={Target} title="No active goal" sub="Set a monthly target to track progress right from the dashboard." />
      )}
    </Card>
  );
};

// Compact insights card, reusing the same client-side pattern detector that
// powers Analytics — never fabricated, just the top standout pattern(s) in
// the member's own history, if the sample is large enough to say anything.
const InsightsCard = ({ trades }) => {
  const { insights, ready } = useMemo(() => computeInsights(trades, "all time"), [trades]);
  const shown = insights.filter((i) => i.type !== "summary").slice(0, 3);

  const iconFor = (type) => {
    if (type === "strength") return <TrendingUp size={13} className="text-emerald-400 shrink-0 mt-0.5" />;
    if (type === "weakness") return <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" />;
    return <Lightbulb size={13} className="text-[var(--accent)] shrink-0 mt-0.5" />;
  };

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4"><Lightbulb size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Insights</h3></div>
      {ready && shown.length ? (
        <div className="space-y-3">
          {shown.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {iconFor(f.type)}
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Lightbulb} title="Not enough data yet" sub="Log a few more trades and we'll surface patterns across your assets, sessions, and setups." />
      )}
    </Card>
  );
};

export const DashboardPage = ({ trades, challenges, onOpenTrade, profile, onLogTrade, setActive, userId, accounts = [] }) => {
  const kpis = computeKPIs(trades);
  const drawdownStats = useMemo(() => computeDrawdownSeries(trades), [trades]);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const recent = trades.slice(0, 5);
  const isUp = kpis.netProfit >= 0;
  const avgRRRatio = kpis.avgLoss ? kpis.avgWin / kpis.avgLoss : null;

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
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

      {/* ---------- QUICK ACTIONS ---------- */}
      <div className="flex flex-wrap gap-2">
        <QuickAction icon={Plus} label="Log Trade" onClick={() => onLogTrade && onLogTrade()} />
        <QuickAction icon={NotebookPen} label="Daily Market Plan" onClick={() => setActive && setActive("market-plan")} />
        <QuickAction icon={ClipboardList} label="Review Trades" onClick={() => setActive && setActive("journal")} />
        <QuickAction icon={Target} label="Set Goal" onClick={() => setActive && setActive("goals")} />
      </div>

      {/* ---------- PERFORMANCE HERO: Net P&L anchor + secondary metrics ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-3 md:gap-4">
        <Card className="p-5 md:p-6 tj-animate-in relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 85% 0%, ${isUp ? "#10b981" : "#f43f5e"}, transparent 60%)` }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Net P&amp;L</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-faint)]">{kpis.total} trades</span>
            </div>
            <div className={`tj-mono text-3xl md:text-4xl font-extrabold leading-none ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
              {isUp ? "+" : ""}{fmtUSD2(kpis.netProfit)}
            </div>
          </div>
          <div className="relative flex items-center gap-1.5 mt-4 text-xs text-[var(--text-muted)]">
            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-semibold">All time</span>
            {isUp ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-rose-500" />}
            <span className={isUp ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>{kpis.total ? "Account is net positive" : "No trades yet"}</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricTile
            label="Win Rate"
            value={`${kpis.winRate.toFixed(2)}%`}
            sub={`${kpis.wins}W · ${kpis.losses}L · ${kpis.beCount}BE`}
            graphic={<SemicircleGauge size={64} segments={[{ value: kpis.wins, color: "#10b981" }, { value: kpis.beCount, color: "#3b82f6" }, { value: kpis.losses, color: "#ef4444" }]} />}
          />
          <MetricTile
            label="Profit Factor"
            value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)}
            sub="Gross profit / gross loss"
            graphic={<RingGauge size={56} pct={kpis.profitFactor === Infinity ? 1 : kpis.profitFactor / 4} color="#10b981" />}
          />
          <MetricTile label="Trades" value={kpis.total} sub="Total logged" />
          <MetricTile
            label="Avg Win / Loss"
            value={avgRRRatio ? `${avgRRRatio.toFixed(2)}×` : "—"}
            valueClassName="text-[var(--text-primary)]"
            sub={<span><span className="text-emerald-500 font-semibold">{fmtUSD2(kpis.avgWin)}</span> <span className="text-[var(--text-faint)]">/</span> <span className="text-rose-500 font-semibold">-{fmtUSD2(kpis.avgLoss)}</span></span>}
          />
        </div>
      </div>

      <RuleViolationAlerts challenges={challenges} trades={trades} />

      <UpgradeGate profile={profile} feature="Psychology Report" description="Discipline scoring and emotional-pattern breakdowns computed from your trade tags.">
        <PsychologyReportCard trades={trades} />
      </UpgradeGate>

      {/* ---------- MAIN PERFORMANCE AREA: chart + challenges/quick actions ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2"><TrendingUp size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Performance</h3></div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">All time</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">Track how your account has evolved over time.</p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-0">
              {curve.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={curve} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#8B5CF6" : "#f43f5e"} stopOpacity={0.32} />
                        <stop offset="95%" stopColor={isUp ? "#8B5CF6" : "#f43f5e"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={52} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Area type="monotone" dataKey="equity" stroke={isUp ? "#8B5CF6" : "#f43f5e"} strokeWidth={2.25} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={TrendingUp} title="No performance history yet" sub="Log your first trade to start building your equity curve." action={<button onClick={() => onLogTrade && onLogTrade()} className="mt-3 text-xs font-semibold text-[var(--text-inverse)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3.5 py-2 rounded-lg transition-all active:scale-95">Log Trade</button>} />}
            </div>
            <div className="flex md:flex-col flex-wrap gap-4 md:gap-5 md:w-40 md:border-l md:border-[var(--border-primary)] md:pl-4 md:shrink-0">
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Total trades</div>
                <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{kpis.total}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Profit factor</div>
                <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Trade expectancy</div>
                <div className={`tj-mono text-lg font-bold ${kpis.expectancy >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtUSD2(kpis.expectancy)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Max drawdown</div>
                <div className="tj-mono text-lg font-bold text-rose-500">{fmtUSD2(drawdownStats.maxDrawdown)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Avg drawdown</div>
                <div className="tj-mono text-lg font-bold text-rose-500">{fmtUSD2(drawdownStats.avgDrawdown)}</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4"><Trophy size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Active Challenges</h3></div>
            <div className="space-y-4">
              {challenges.slice(0, 2).map((c) => {
                const s = computeChallengeStats(c, trades);
                const remaining = Math.max(0, s.targetBalance - s.currentBalance);
                return (
                  <div key={c.id} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{c.firm}</span>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="flex items-baseline gap-1.5 text-xs text-[var(--text-muted)] mb-2">
                      <span className="tj-mono font-semibold text-[var(--text-secondary)]">{fmtUSD(c.accountSize)}</span>
                      <ArrowRight size={11} className="text-[var(--text-faint)]" />
                      <span className="tj-mono font-semibold text-[var(--text-primary)]">{fmtUSD(s.currentBalance)}</span>
                      <span className="ml-auto">Target {fmtUSD(s.targetBalance)}</span>
                    </div>
                    <ProgressBar pct={s.progressToTarget} />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-[var(--text-faint)]">{remaining > 0 ? `${fmtUSD(remaining)} remaining` : "Target reached"}</span>
                      <button onClick={() => setActive && setActive("challenges")} className="text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-0.5">
                        View <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {challenges.length === 0 && (
                <EmptyState
                  icon={ShieldCheck}
                  title="No challenges yet"
                  sub="Create a funding challenge to start tracking rules and progress."
                  action={<button onClick={() => setActive && setActive("challenges")} className="mt-3 text-xs font-semibold text-[var(--text-inverse)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3.5 py-2 rounded-lg transition-all active:scale-95">Set Up a Challenge</button>}
                />
              )}
            </div>
          </Card>

          <GoalWidgetCard userId={userId} trades={trades} setActive={setActive} />
        </div>
      </div>

      {/* ---------- ACTIVITY / SECONDARY INTELLIGENCE ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingDown size={15} className="text-rose-500" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Drawdown</h3></div>
          {drawdownStats.series.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={drawdownStats.series} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.32} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={44} />
                <Tooltip content={<CustomTooltip prefix="$" />} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TrendingDown} title="No drawdown yet" sub="Great — your equity curve hasn't dipped below a prior high." />
          )}
        </Card>

        <InsightsCard trades={trades} />
      </div>

      <CalendarCard trades={trades} onOpenTrade={onOpenTrade} compact showWeeklySummary />

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Recent Trading Activity</h3>
          {recent.length > 0 && (
            <button onClick={() => setActive && setActive("journal")} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-0.5">
              View all trades <ArrowRight size={11} />
            </button>
          )}
        </div>
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
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No trades logged"
            sub="Log your first trade to start building your trading history."
            action={<button onClick={() => onLogTrade && onLogTrade()} className="mt-3 text-xs font-semibold text-[var(--text-inverse)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3.5 py-2 rounded-lg transition-all active:scale-95">Log Trade</button>}
          />
        )}
      </Card>
    </div>
  );
};

/* ============================================================
   CHALLENGES PAGE (cards + compare + payouts)
   ============================================================ */
