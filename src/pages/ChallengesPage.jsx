import React, { useState } from "react";
import {
  ShieldCheck, Plus, Target, CheckCircle2, XCircle, Trash2, Table2, LayoutGrid, Download, Banknote, Award, Clock,
} from "lucide-react";
import { computeChallengeStats, computePaceProjection } from "../lib/tradeCalculations";
import { Card, EmptyState, GaugeBar, ProgressBar, StatusPill, useToast } from "../components/ui/Primitives";
import { fmtUSD, fmtUSD2 } from "../lib/format";
import { CreateChallengeModal } from "../components/trades/TradeComponents";
import { downloadBlob } from "../lib/csv";

export const RuleRow = ({ ok, label, detail }) => (
  <div className="flex items-start gap-2.5 py-2">
    {ok ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={17} className="text-rose-400 shrink-0 mt-0.5" />}
    <div><div className={`text-sm font-medium ${ok ? "text-[var(--text-primary)]" : "text-rose-300"}`}>{label}</div><div className="text-xs text-[var(--text-muted)]">{detail}</div></div>
  </div>
);


export const FundedPanel = ({ challenge, stats, onRequestPayout }) => (
  <div className="mt-4 pt-4 border-t border-white/10">
    <div className="flex items-center gap-2 mb-3"><Banknote size={14} className="text-[var(--accent)]" /><h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Funded Account · Payouts</h4></div>
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2"><div className="text-xs text-[var(--text-muted)]">Profit Split</div><div className="tj-mono text-sm font-semibold text-[var(--text-primary)]">{challenge.profitSplitPct}%</div></div>
      <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2"><div className="text-xs text-[var(--text-muted)]">Available Payout</div><div className="tj-mono text-sm font-semibold text-emerald-400">{fmtUSD2(Math.max(0, stats.payoutAmount))}</div></div>
    </div>
    <button onClick={() => onRequestPayout(challenge.id)} disabled={stats.payoutAmount <= 0}
      className="w-full flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-inverse)] font-semibold text-sm py-2 rounded-lg transition-all mb-3">
      <Banknote size={14} /> Request Payout
    </button>
    <div className="space-y-1.5 max-h-32 overflow-y-auto tj-scrollbar">
      {(challenge.payoutHistory || []).slice().reverse().map((p, i) => (
        <div key={i} className="flex justify-between text-xs bg-[var(--bg-primary)]/60 rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">{p.date}</span>
          <span className="tj-mono text-emerald-400 font-medium">+{fmtUSD2(p.amount)} <span className="text-[var(--text-faint)]">({p.split}% split)</span></span>
        </div>
      ))}
      {(!challenge.payoutHistory || challenge.payoutHistory.length === 0) && <p className="text-xs text-[var(--text-faint)]">No payouts requested yet.</p>}
    </div>
  </div>
);


export const PaceProjectionBanner = ({ stats }) => {
  const p = computePaceProjection(stats);
  if (!p) return null;
  if (p.projectedDays == null) {
    return (
      <div className="mt-2 flex items-start gap-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
        <Clock size={14} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-muted)]">Not enough winning pace yet to project a target date — net P&L per trading day is flat or negative so far.</p>
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-start gap-2 bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-lg px-3 py-2.5">
      <Clock size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
      <p className="text-xs text-[var(--text-secondary)]">
        At your current pace (<span className="tj-mono font-semibold text-[var(--text-primary)]">{fmtUSD2(p.avgDailyPnl)}/trading day</span>), you're on track to hit the profit target in
        <span className="font-semibold text-[var(--accent)]"> ~{p.projectedDays} trading day{p.projectedDays === 1 ? "" : "s"}</span>
        {p.projectedDate && <> (around {p.projectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })})</>}.
      </p>
    </div>
  );
};


export const ChallengeDetailCard = ({ challenge, trades, onDelete, onMarkFunded, onRequestPayout, onExport }) => {
  const s = computeChallengeStats(challenge, trades);
  const isFunded = challenge.stage === "funded";
  return (
    <Card className="p-4 md:p-5 tj-animate-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2"><h3 className="font-bold text-[var(--text-primary)]">{challenge.firm}</h3><StatusPill status={s.status} /></div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{challenge.phase} · {fmtUSD(challenge.accountSize)} account{!isFunded ? ` · Day ${s.daysActive + 1}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onExport(challenge, s)} title="Export summary" className="text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"><Download size={16} /></button>
          <button onClick={() => onDelete(challenge.id)} title="Delete" className="text-[var(--text-faint)] hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-1">
        {!isFunded && (
          <div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5"><span>Balance</span><span className="tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)} / {fmtUSD(s.targetBalance)}</span></div>
            <ProgressBar pct={s.progressToTarget} color="bg-[var(--accent)]" />
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.progressToTarget.toFixed(1)}% to profit target</div>
          </div>
        )}
        {isFunded && (
          <div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5"><span>Account Balance</span><span className="tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)}</span></div>
            <div className="text-lg tj-mono font-bold text-emerald-400">{s.netPnl >= 0 ? "+" : ""}{fmtUSD2(s.netPnl)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">net profit since funding</div>
          </div>
        )}
        <div className="space-y-3">
          <GaugeBar label="Daily Loss Limit" usedPct={s.dailyLossUsed} breached={s.dailyLossBreached} rightLabel={`${fmtUSD2(Math.abs(Math.min(s.worstDay,0)))} / ${fmtUSD(s.dailyLossLimit)}`} />
          <GaugeBar label="Max Overall Loss" usedPct={s.totalDrawdownUsed} breached={s.totalLossBreached} rightLabel={`${s.totalDrawdownUsed.toFixed(0)}% used`} />
        </div>
      </div>

      {!isFunded && (
        <div className="border-t border-white/10 pt-2 mt-3">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Rules Monitor</h4>
          <RuleRow ok={s.targetReached} label="Profit Target Reached" detail={s.targetReached ? "Target achieved — eligible to progress." : `${fmtUSD(s.targetBalance - s.currentBalance)} remaining to target.`} />
          <RuleRow ok={!s.dailyLossBreached} label="Daily Loss Limit Safe" detail={s.dailyLossBreached ? "Daily loss limit breached on worst trading day." : "No single day has exceeded the daily loss limit."} />
          <RuleRow ok={!s.totalLossBreached} label="Max Total Loss Safe" detail={s.totalLossBreached ? "Account drawdown breached the max total loss floor." : `${(100 - s.totalDrawdownUsed).toFixed(0)}% of drawdown buffer remaining.`} />
          <RuleRow ok={s.minDaysMet} label="Minimum Trading Days Met" detail={`${s.tradingDaysCount} / ${challenge.minTradingDays} required trading days logged.`} />
          {s.status === "In Progress" && <PaceProjectionBanner stats={s} />}
          {s.status === "Passed" && (
            <button onClick={() => onMarkFunded(challenge.id)} className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm py-2 rounded-lg hover:bg-emerald-500/20 transition-all">
              <Award size={14} /> Mark as Funded — Start Payouts
            </button>
          )}
        </div>
      )}

      {isFunded && <FundedPanel challenge={challenge} stats={s} onRequestPayout={onRequestPayout} />}
    </Card>
  );
};


export const ComparisonTable = ({ challenges, trades }) => {
  const rows = challenges.map((c) => ({ c, s: computeChallengeStats(c, trades) }));
  const tightestDaily = rows.length ? Math.max(...rows.map((r) => r.s.dailyLossUsed)) : 0;
  const tightestTotal = rows.length ? Math.max(...rows.map((r) => r.s.totalDrawdownUsed)) : 0;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto tj-scrollbar">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/60 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Firm</th><th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Balance</th><th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Daily Loss Used</th><th className="px-4 py-3 font-medium">Total Loss Used</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, s }) => (
              <tr key={c.id} className="border-b border-[var(--border-primary)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.firm}</td>
                <td className="px-4 py-3 text-[var(--text-tertiary)]">{c.phase}</td>
                <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)}</td>
                <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{c.stage === "funded" ? "—" : `${s.progressToTarget.toFixed(0)}%`}</td>
                <td className={`px-4 py-3 tj-mono ${s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.dailyLossUsed.toFixed(0)}%{s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? " · tightest" : ""}</td>
                <td className={`px-4 py-3 tj-mono ${s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.totalDrawdownUsed.toFixed(0)}%{s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? " · tightest" : ""}</td>
                <td className="px-4 py-3"><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};


export const ChallengesPage = ({ challenges, trades, onCreate, onDelete, onMarkFunded, onRequestPayout }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState("cards");
  const toast = useToast();

  const exportSummary = (challenge, s) => {
    const text = `${challenge.firm} — ${challenge.phase}\nStatus: ${s.status}\nBalance: ${fmtUSD2(s.currentBalance)}\nTarget: ${fmtUSD2(s.targetBalance)}\nDaily Loss Used: ${s.dailyLossUsed.toFixed(1)}%\nTotal Loss Used: ${s.totalDrawdownUsed.toFixed(1)}%\nTrading Days: ${s.tradingDaysCount}/${challenge.minTradingDays}\nGenerated: 2026-07-10`;
    downloadBlob(text, `${challenge.firm.replace(/\s+/g, "_")}_summary.txt`, "text/plain");
    toast(`Summary exported for ${challenge.firm}`, "info");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">Track funding evaluations, live rule compliance, and payouts.</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setView("cards")} className={`p-2 ${view === "cards" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} title="Card view"><LayoutGrid size={15} /></button>
            <button onClick={() => setView("compare")} className={`p-2 ${view === "compare" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} title="Compare view"><Table2 size={15} /></button>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-[var(--accent)] hover:opacity-90 text-[var(--text-inverse)] font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95">
            <Plus size={16} strokeWidth={2.5} /> New Challenge
          </button>
        </div>
      </div>

      {challenges.length === 0 ? (
        <Card><EmptyState icon={ShieldCheck} title="No challenges yet" sub="Create your first funding challenge to start tracking rule compliance." /></Card>
      ) : view === "cards" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {challenges.map((c) => (
            <ChallengeDetailCard key={c.id} challenge={c} trades={trades} onDelete={onDelete} onMarkFunded={onMarkFunded} onRequestPayout={onRequestPayout} onExport={exportSummary} />
          ))}
        </div>
      ) : (
        <ComparisonTable challenges={challenges} trades={trades} />
      )}
      <CreateChallengeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={onCreate} />
    </div>
  );
};

/* ============================================================
   JOURNAL PAGE (filters, sorting, export, drawer)
   ============================================================ */
