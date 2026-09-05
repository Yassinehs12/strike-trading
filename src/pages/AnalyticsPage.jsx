import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  BarChart3, Target, Award, TrendingDown, Layers, TrendingUp, Scale, CircleSlash, Clock,
} from "lucide-react";
import { fmtUSD2 } from "../lib/format";
import { PIE_COLORS, SESSIONS } from "../constants";
import { computeKPIs, computeStreaks, computeDrawdownRecovery, computeSetupPerformance, computeDayWinStats, computeDrawdownSeries, equityCurve } from "../lib/tradeCalculations";
import { AccountsBar } from "../components/trades/TradeComponents";
import { Card, CustomTooltip, EmptyState, KPICard, SemicircleGauge, RingGauge } from "../components/ui/Primitives";

const RANGES = [
  { id: "all", label: "All" },
  { id: "90", label: "90D" },
  { id: "30", label: "30D" },
  { id: "7", label: "7D" },
];

export const AnalyticsPage = ({ trades: allTrades, accounts = [], onAddAccount, onEditAccount, onRemoveAccount, accountLimit = 3 }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [range, setRange] = useState("all");
  const trades = useMemo(
    () => (selectedAccountId ? allTrades.filter((t) => t.accountId === selectedAccountId) : allTrades),
    [allTrades, selectedAccountId]
  );

  const rangedTrades = useMemo(() => {
    if (range === "all") return trades;
    const days = Number(range);
    const cutoff = Date.now() - days * 86400000;
    return trades.filter((t) => new Date(t.date).getTime() >= cutoff);
  }, [trades, range]);

  const kpis = computeKPIs(trades);
  const rangedKpis = computeKPIs(rangedTrades);
  const streaks = computeStreaks(trades);
  const drawdown = computeDrawdownRecovery(trades);
  const setupPerf = computeSetupPerformance(trades);

  const startingBalance = useMemo(() => {
    if (selectedAccountId) return accounts.find((a) => a.id === selectedAccountId)?.startingBalance || 0;
    return accounts.reduce((s, a) => s + (a.startingBalance || 0), 0);
  }, [accounts, selectedAccountId]);

  const equityData = useMemo(() => {
    const curve = equityCurve(rangedTrades);
    return curve.map((p) => ({ ...p, balance: +(startingBalance + p.equity).toFixed(2) }));
  }, [rangedTrades, startingBalance]);

  const dayStats = useMemo(() => computeDayWinStats(rangedTrades), [rangedTrades]);
  const drawdownStats = useMemo(() => computeDrawdownSeries(rangedTrades), [rangedTrades]);

  const rMultiples = useMemo(
    () => rangedTrades.filter((t) => t.riskAmount > 0 && t.status !== "BE").map((t) => +(t.pnl / t.riskAmount).toFixed(2)),
    [rangedTrades]
  );
  const avgR = rMultiples.length ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
  const maxR = rMultiples.length ? Math.max(...rMultiples) : 0;
  const minR = rMultiples.length ? Math.min(...rMultiples) : 0;
  const rSparkline = rMultiples.map((v, i) => ({ i, v }));

  const netProfitRanged = rangedKpis.netProfit;
  const { wins, losses, beCount } = rangedKpis;

  const winLossData = useMemo(() => {
    const wins = trades.filter((t) => t.status === "Win").length;
    const losses = trades.filter((t) => t.status === "Loss").length;
    const be = trades.filter((t) => t.status === "BE").length;
    return [{ name: "Win", value: wins }, { name: "Loss", value: losses }, { name: "BE", value: be }];
  }, [trades]);

  const byAsset = useMemo(() => {
    const map = {};
    trades.forEach((t) => { map[t.asset] = (map[t.asset] || 0) + t.pnl - t.fees; });
    return Object.entries(map).map(([asset, pnl]) => ({ asset, pnl: +pnl.toFixed(2) })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const byDow = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = {};
    trades.forEach((t) => { const d = names[new Date(t.date).getDay()]; map[d] = (map[d] || 0) + t.pnl - t.fees; });
    return names.filter((n) => map[n] !== undefined).map((n) => ({ day: n, pnl: +map[n].toFixed(2) }));
  }, [trades]);

  const bySession = useMemo(() => {
    const map = {};
    trades.forEach((t) => { map[t.session] = (map[t.session] || 0) + t.pnl - t.fees; });
    return SESSIONS.map((s) => ({ session: s, pnl: +(map[s] || 0).toFixed(2) }));
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <AccountsBar accounts={accounts} selectedId={selectedAccountId} onSelect={setSelectedAccountId} onAdd={onAddAccount} onEdit={onEditAccount} onRemove={onRemoveAccount} limit={accountLimit} />
        <Card><EmptyState icon={BarChart3} title={selectedAccountId ? "No trades on this account yet" : "No data to analyze yet"} sub="Log a few trades and your analytics will appear here." /></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AccountsBar accounts={accounts} selectedId={selectedAccountId} onSelect={setSelectedAccountId} onAdd={onAddAccount} onEdit={onEditAccount} onRemove={onRemoveAccount} limit={accountLimit} />

      {/* ---------- KPI row: net P&L + gauges (win %, profit factor, day win %, avg win/loss) ---------- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-[var(--text-primary)] text-base">Performance Dashboard</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedAccountId ? accounts.find((a) => a.id === selectedAccountId)?.name : "All accounts"}</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                range === r.id ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="p-4 tj-animate-in">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] mb-1">
            Net P&amp;L <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-faint)]">{rangedKpis.total}</span>
          </div>
          <div className={`tj-mono text-2xl font-bold ${netProfitRanged >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtUSD2(netProfitRanged)}</div>
        </Card>

        <Card className="p-4 tj-animate-in flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)] mb-1">Trade win %</div>
            <div className="tj-mono text-2xl font-bold text-[var(--text-primary)]">{rangedKpis.winRate.toFixed(2)}%</div>
          </div>
          <SemicircleGauge
            size={84}
            segments={[
              { value: wins, color: "#10b981" },
              { value: beCount, color: "#3b82f6" },
              { value: losses, color: "#ef4444" },
            ]}
          />
        </Card>

        <Card className="p-4 tj-animate-in flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)] mb-1">Profit factor</div>
            <div className="tj-mono text-2xl font-bold text-[var(--text-primary)]">{rangedKpis.profitFactor === Infinity ? "∞" : rangedKpis.profitFactor.toFixed(2)}</div>
          </div>
          <RingGauge pct={rangedKpis.profitFactor === Infinity ? 1 : rangedKpis.profitFactor / 4} color="#10b981" />
        </Card>

        <Card className="p-4 tj-animate-in flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)] mb-1">Day win %</div>
            <div className="tj-mono text-2xl font-bold text-[var(--text-primary)]">{dayStats.dayWinPct.toFixed(2)}%</div>
          </div>
          <SemicircleGauge
            size={84}
            segments={[
              { value: dayStats.winDays, color: "#10b981" },
              { value: dayStats.beDays, color: "#3b82f6" },
              { value: dayStats.loseDays, color: "#ef4444" },
            ]}
          />
        </Card>

        <Card className="p-4 tj-animate-in">
          <div className="text-xs font-medium text-[var(--text-muted)] mb-1">Avg win/loss trade</div>
          <div className="tj-mono text-2xl font-bold text-[var(--text-primary)] mb-3">{rangedKpis.avgLoss ? (rangedKpis.avgWin / rangedKpis.avgLoss).toFixed(2) : "—"}</div>
          <div className="flex rounded-full overflow-hidden h-2 bg-[var(--bg-tertiary)]">
            <div className="bg-emerald-500 h-full" style={{ width: `${rangedKpis.avgWin + rangedKpis.avgLoss ? (rangedKpis.avgWin / (rangedKpis.avgWin + rangedKpis.avgLoss)) * 100 : 50}%` }} />
            <div className="bg-rose-500 h-full flex-1" />
          </div>
          <div className="flex justify-between text-[11px] font-semibold mt-1.5">
            <span className="text-emerald-500">{fmtUSD2(rangedKpis.avgWin)}</span>
            <span className="text-rose-500">-{fmtUSD2(rangedKpis.avgLoss)}</span>
          </div>
        </Card>
      </div>

      {/* ---------- Performance (balance curve) + Drawdown ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 md:p-5 lg:col-span-2 tj-animate-in">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Performance</h3></div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-0">
              {equityData.length > 1 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={equityData} margin={{ left: 0, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} minTickGap={32} />
                    <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#pnlGradient)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={TrendingUp} title="Not enough data for this range" sub="Try a wider time range or log more trades." />
              )}
            </div>
            <div className="flex md:flex-col flex-wrap gap-4 md:gap-5 md:w-40 md:border-l md:border-[var(--border-primary)] md:pl-4">
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Total trades</div>
                <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{rangedKpis.total}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Profit factor</div>
                <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{rangedKpis.profitFactor === Infinity ? "∞" : rangedKpis.profitFactor.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Trade expectancy</div>
                <div className={`tj-mono text-lg font-bold ${rangedKpis.expectancy >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtUSD2(rangedKpis.expectancy)}</div>
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

        <Card className="p-4 md:p-5 tj-animate-in">
          <div className="flex items-center gap-2 mb-4"><TrendingDown size={15} className="text-rose-500" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Drawdown</h3></div>
          {drawdownStats.series.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={drawdownStats.series} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={44} />
                <Tooltip content={<CustomTooltip prefix="$" />} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGradient)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TrendingDown} title="No drawdown yet" sub="Great — your equity curve hasn't dipped below a prior high." />
          )}
        </Card>
      </div>

      {/* ---------- R-multiple stats strip ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 tj-animate-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Average RR</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center"><Scale size={14} className="text-[var(--accent)]" /></div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className={`tj-mono text-2xl font-bold ${avgR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{avgR.toFixed(2)}R</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Max {maxR.toFixed(2)}R · Min {minR.toFixed(2)}R</div>
            </div>
            {rSparkline.length > 1 && (
              <div className="w-24 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rSparkline}>
                    <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 tj-animate-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Expectancy / Trade</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center"><Target size={14} className="text-[var(--accent)]" /></div>
          </div>
          <div className={`tj-mono text-2xl font-bold ${rangedKpis.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtUSD2(rangedKpis.expectancy)}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Expected $ per trade at current win rate</div>
        </Card>

        <Card className="p-4 tj-animate-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Breakeven Rate</span>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center"><CircleSlash size={14} className="text-[var(--accent)]" /></div>
          </div>
          <div className="tj-mono text-2xl font-bold text-[var(--text-primary)]">{rangedKpis.total ? ((beCount / rangedKpis.total) * 100).toFixed(0) : 0}%</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{beCount} of {rangedKpis.total} trades closed flat</div>
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4"><Award size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Discipline & Streaks</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Current Streak</div>
            <div className={`tj-mono text-lg font-bold ${streaks.currentType === "Win" ? "text-emerald-400" : "text-rose-400"}`}>{streaks.currentCount} {streaks.currentType || "—"}{streaks.currentCount === 1 ? "" : "s"}</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Longest Win Streak</div>
            <div className="tj-mono text-lg font-bold text-emerald-400">{streaks.longestWin}</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Clock size={11} /> Avg Holding Time</div>
            <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{Math.round(streaks.avgHold)}m</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Days Since Last Loss</div>
            <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{streaks.daysSinceLastLoss ?? "—"}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4"><TrendingDown size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Drawdown Recovery</h3></div>
        {drawdown.atNewHigh ? (
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-400">You're at a new equity high</div>
              <div className="text-xs text-[var(--text-muted)] tj-mono">{fmtUSD2(drawdown.current)}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">
                Down <span className="text-rose-400 font-semibold">{drawdown.drawdownPct.toFixed(1)}%</span> from peak of <span className="tj-mono text-[var(--text-secondary)]">{fmtUSD2(drawdown.peak)}</span>
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{drawdown.recoveryPct.toFixed(0)}% recovered</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-primary)] border border-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all" style={{ width: `${drawdown.recoveryPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-faint)] mt-1">
              <span>Trough: {fmtUSD2(drawdown.troughSincePeak)}</span>
              <span>Current: {fmtUSD2(drawdown.current)}</span>
            </div>
          </>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={winLossData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {winLossData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Most Profitable Assets</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byAsset} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="asset" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={62} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{byAsset.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Performance by Day of Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{byDow.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Performance by Session</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySession}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="session" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{bySession.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4"><Layers size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Setup Performance</h3></div>
        <div className="overflow-x-auto tj-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] border-b border-white/10">
                <th className="pb-2 pr-4">Setup</th>
                <th className="pb-2 pr-4 text-right">Trades</th>
                <th className="pb-2 pr-4 text-right">Win Rate</th>
                <th className="pb-2 pr-4 text-right">Avg R</th>
                <th className="pb-2 text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {setupPerf.map((s) => (
                <tr key={s.setup} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">{s.setup}</td>
                  <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)] tj-mono">{s.count}</td>
                  <td className="py-2.5 pr-4 text-right tj-mono">
                    <span className={s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>{s.winRate.toFixed(0)}%</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tj-mono text-[var(--text-secondary)]">{s.avgR != null ? `${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R` : "—"}</td>
                  <td className={`py-2.5 text-right tj-mono font-semibold ${s.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{s.netPnl >= 0 ? "+" : ""}{fmtUSD2(s.netPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   MARKET HEATMAPS (live TradingView widgets — Stocks + Crypto)
   ============================================================ */
