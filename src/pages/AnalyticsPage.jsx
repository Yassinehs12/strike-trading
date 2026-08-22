import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart3, Percent, Target, Wallet, Flame, Award, Clock, TrendingDown, Layers,
} from "lucide-react";
import { fmtUSD2 } from "../lib/format";
import { PIE_COLORS, SESSIONS } from "../constants";
import { computeKPIs, computeStreaks, computeDrawdownRecovery, computeSetupPerformance } from "../lib/tradeCalculations";
import { AccountsBar } from "../components/trades/TradeComponents";
import { Card, CustomTooltip, EmptyState, KPICard } from "../components/ui/Primitives";

export const AnalyticsPage = ({ trades: allTrades, accounts = [], onAddAccount, onEditAccount, onRemoveAccount, accountLimit = 3 }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const trades = useMemo(
    () => (selectedAccountId ? allTrades.filter((t) => t.accountId === selectedAccountId) : allTrades),
    [allTrades, selectedAccountId]
  );

  const kpis = computeKPIs(trades);
  const streaks = computeStreaks(trades);
  const drawdown = computeDrawdownRecovery(trades);
  const setupPerf = computeSetupPerformance(trades);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard icon={Percent} label="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} />
        <KPICard icon={Target} label="Profit Factor" value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)} />
        <KPICard icon={Flame} label="Avg R:R Realized" value={`${kpis.avgRR.toFixed(2)}R`} />
        <KPICard icon={Wallet} label="Net Profit" value={fmtUSD2(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
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
