import React, { useMemo, useState } from "react";
import {
  ShieldCheck, Plus, CheckCircle2, XCircle, Trash2, Table2, LayoutGrid, Download, Banknote, Award, Clock,
  AlertTriangle, TrendingUp, TrendingDown, Wallet, Layers, ShieldAlert, MoreHorizontal,
} from "lucide-react";
import { computeChallengeStats, computePaceProjection } from "../lib/tradeCalculations";
import { Card, EmptyState, ProgressBar, useToast } from "../components/ui/Primitives";
import { fmtUSD, fmtUSD2, clamp } from "../lib/format";
import { CreateChallengeModal } from "../components/trades/TradeComponents";
import { downloadBlob } from "../lib/csv";

/* ============================================================
   SHARED HELPERS
   ============================================================ */

// Maps a challenge's live status to the refined badge system used across
// the command center — separate from StatusPill's trade Win/Loss palette
// so account state reads with its own vocabulary (EVALUATION / FUNDED / etc).
const ACCOUNT_STATUS_STYLES = {
  "In Progress": { label: "EVALUATION", cls: "bg-sky-500/10 text-sky-400 border-sky-500/25" },
  Passed: { label: "PASSED", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  Funded: { label: "FUNDED", cls: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  Failed: { label: "BREACHED", cls: "bg-rose-500/10 text-rose-400 border-rose-500/25" },
};

const AccountStatusBadge = ({ status, atRisk }) => {
  if (atRisk && status === "In Progress") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border bg-amber-500/10 text-amber-400 border-amber-500/25">AT RISK</span>;
  }
  const s = ACCOUNT_STATUS_STYLES[status] || ACCOUNT_STATUS_STYLES["In Progress"];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${s.cls}`}>{s.label}</span>;
};

// Risk level derived purely from existing usage percentages — no invented data.
const riskLevel = (pct, breached) => {
  if (breached) return "BREACHED";
  if (pct >= 85) return "DANGER";
  if (pct >= 60) return "WARNING";
  return "SAFE";
};

const RISK_META = {
  SAFE: { text: "text-emerald-400", bar: "#10b981", chip: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" },
  WARNING: { text: "text-amber-400", bar: "#fbbf24", chip: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
  DANGER: { text: "text-orange-400", bar: "#fb923c", chip: "bg-orange-500/10 border-orange-500/25 text-orange-400" },
  BREACHED: { text: "text-rose-400", bar: "#f43f5e", chip: "bg-rose-500/10 border-rose-500/25 text-rose-400" },
};

// Compact, highly-readable risk meter — replaces the old thin single-color
// gauge with a segmented meter plus an explicit SAFE/WARNING/DANGER/BREACHED
// chip, so a trader can read account safety in under two seconds.
export const RiskMeter = ({ label, usedPct, breached, spent, limit, remaining }) => {
  const pct = clamp(usedPct, 0, 100);
  const level = riskLevel(pct, breached);
  const meta = RISK_META[level];
  const segments = 12;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${meta.chip}`}>{level}</span>
      </div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="tj-mono text-sm font-semibold text-[var(--text-primary)]">{spent} <span className="text-[var(--text-faint)] font-normal">/ {limit}</span></span>
        <span className="text-[11px] text-[var(--text-muted)]">{remaining} left</span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="h-2.5 flex-1 rounded-sm overflow-hidden bg-[var(--bg-tertiary)]">
            {i < filled && <div className="w-full h-full transition-colors duration-300" style={{ backgroundColor: meta.bar }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export const RuleRow = ({ ok, label, detail }) => (
  <div className="flex items-start gap-2.5 py-2">
    {ok ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={17} className="text-rose-400 shrink-0 mt-0.5" />}
    <div><div className={`text-sm font-medium ${ok ? "text-[var(--text-primary)]" : "text-rose-300"}`}>{label}</div><div className="text-xs text-[var(--text-muted)]">{detail}</div></div>
  </div>
);

/* ============================================================
   PAYOUT SECTION
   ============================================================ */

export const FundedPanel = ({ challenge, stats, onRequestPayout }) => {
  const eligible = stats.payoutAmount > 0;
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Banknote size={13} className="text-[var(--accent)]" />
        <h4 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Payouts</h4>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Profit Split</div>
          <div className="tj-mono text-sm font-semibold text-[var(--text-primary)] mt-0.5">{challenge.profitSplitPct}%</div>
        </div>
        <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Available</div>
          <div className="tj-mono text-sm font-semibold text-emerald-400 mt-0.5">{fmtUSD2(Math.max(0, stats.payoutAmount))}</div>
        </div>
        <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Status</div>
          <div className={`text-xs font-semibold mt-1 ${eligible ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>{eligible ? "Eligible" : "Not eligible"}</div>
        </div>
      </div>
      <button onClick={() => onRequestPayout(challenge.id)} disabled={!eligible}
        className="w-full flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-inverse)] font-semibold text-sm py-2 rounded-lg transition-all mb-1">
        <Banknote size={14} /> Request Payout
      </button>
      {!eligible && (
        <p className="text-[11px] text-[var(--text-faint)] mb-2 text-center">Available once profit since your last payout exceeds $0.</p>
      )}
      <div className="space-y-1.5 max-h-32 overflow-y-auto tj-scrollbar mt-2">
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
};

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

/* ============================================================
   ACCOUNT CARD ACTIONS MENU
   ============================================================ */

const CardMenu = ({ onExport, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="More actions"
        aria-label="More actions"
        className="text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-md p-1.5 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setConfirmDelete(false); }} />
          <div className="absolute right-0 top-full mt-1 w-44 z-20 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl overflow-hidden tj-animate-in">
            <button
              onClick={() => { onExport(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
            >
              <Download size={13} /> Export summary
            </button>
            {!confirmDelete ? (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/5"
              >
                <Trash2 size={13} /> Delete account
              </button>
            ) : (
              <button
                onClick={() => { onDelete(); setOpen(false); setConfirmDelete(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors border-t border-white/5 font-semibold"
              >
                <AlertTriangle size={13} /> Confirm delete?
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   ACCOUNT COMMAND CARD
   ============================================================ */

export const ChallengeDetailCard = ({ challenge, trades, onDelete, onMarkFunded, onRequestPayout, onExport }) => {
  const s = computeChallengeStats(challenge, trades);
  const isFunded = challenge.stage === "funded";
  const dailyLevel = riskLevel(s.dailyLossUsed, s.dailyLossBreached);
  const totalLevel = riskLevel(s.totalDrawdownUsed, s.totalLossBreached);
  const atRisk = !isFunded && (dailyLevel === "WARNING" || dailyLevel === "DANGER" || totalLevel === "WARNING" || totalLevel === "DANGER");

  const pnlPositive = s.netPnl > 0;
  const pnlNeutral = s.netPnl === 0;

  return (
    <Card className="p-4 md:p-5 tj-animate-in hover:border-white/[0.14] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[var(--text-primary)] truncate">{challenge.firm}</h3>
            <AccountStatusBadge status={s.status} atRisk={atRisk} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{challenge.phase} · {fmtUSD(challenge.accountSize)} account{!isFunded ? ` · Day ${s.daysActive + 1}` : ""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CardMenu onExport={onExport} onDelete={() => onDelete(challenge.id)} />
        </div>
      </div>

      {/* Balance / P&L — financial info given strong typography per priority #2 */}
      <div className="flex items-end justify-between mb-4 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3.5 py-3">
        <div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Current Balance</div>
          <div className="tj-mono text-xl font-bold text-[var(--text-primary)]">{fmtUSD2(s.currentBalance)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Net P&L</div>
          <div className={`tj-mono text-sm font-bold flex items-center justify-end gap-1 ${pnlNeutral ? "text-[var(--text-muted)]" : pnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {!pnlNeutral && (pnlPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}
            {pnlPositive ? "+" : ""}{fmtUSD2(s.netPnl)}
          </div>
        </div>
      </div>

      {/* Risk — the most important info on the card, given top visual weight */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <RiskMeter
          label="Daily Loss Limit"
          usedPct={s.dailyLossUsed}
          breached={s.dailyLossBreached}
          spent={fmtUSD2(Math.abs(Math.min(s.worstDay, 0)))}
          limit={fmtUSD(s.dailyLossLimit)}
          remaining={fmtUSD(Math.max(0, s.dailyLossLimit - Math.abs(Math.min(s.worstDay, 0))))}
        />
        <RiskMeter
          label="Max Overall Loss"
          usedPct={s.totalDrawdownUsed}
          breached={s.totalLossBreached}
          spent={`${s.totalDrawdownUsed.toFixed(0)}%`}
          limit="100%"
          remaining={`${(100 - s.totalDrawdownUsed).toFixed(0)}%`}
        />
      </div>

      {/* Evaluation progress */}
      {!isFunded && (
        <div className="mb-1">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Evaluation Progress</span>
            <span className="tj-mono text-xs text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)} / {fmtUSD(s.targetBalance)}</span>
          </div>
          <ProgressBar pct={s.progressToTarget} color="bg-[var(--accent)]" />
          <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1">
            <span>{s.progressToTarget.toFixed(0)}% to profit target</span>
            <span>{s.tradingDaysCount}/{challenge.minTradingDays} trading days</span>
          </div>
        </div>
      )}

      {/* Rules monitor */}
      {!isFunded && (
        <div className="border-t border-white/10 pt-1 mt-3">
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

/* ============================================================
   COMPARISON / LIST VIEW
   ============================================================ */

export const ComparisonTable = ({ challenges, trades }) => {
  const rows = challenges.map((c) => ({ c, s: computeChallengeStats(c, trades) }));
  const tightestDaily = rows.length ? Math.max(...rows.map((r) => r.s.dailyLossUsed)) : 0;
  const tightestTotal = rows.length ? Math.max(...rows.map((r) => r.s.totalDrawdownUsed)) : 0;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto tj-scrollbar">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/60 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Firm</th><th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Balance</th><th className="px-4 py-3 font-medium">Net P&L</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Daily Loss Used</th><th className="px-4 py-3 font-medium">Total Loss Used</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, s }) => {
              const atRisk = c.stage !== "funded" && (riskLevel(s.dailyLossUsed, s.dailyLossBreached) !== "SAFE" || riskLevel(s.totalDrawdownUsed, s.totalLossBreached) !== "SAFE");
              return (
                <tr key={c.id} className="border-b border-[var(--border-primary)] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.firm}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">{c.phase}</td>
                  <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)}</td>
                  <td className={`px-4 py-3 tj-mono ${s.netPnl > 0 ? "text-emerald-400" : s.netPnl < 0 ? "text-rose-400" : "text-[var(--text-tertiary)]"}`}>{s.netPnl > 0 ? "+" : ""}{fmtUSD2(s.netPnl)}</td>
                  <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{c.stage === "funded" ? "—" : `${s.progressToTarget.toFixed(0)}%`}</td>
                  <td className={`px-4 py-3 tj-mono ${s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.dailyLossUsed.toFixed(0)}%{s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? " · tightest" : ""}</td>
                  <td className={`px-4 py-3 tj-mono ${s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.totalDrawdownUsed.toFixed(0)}%{s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? " · tightest" : ""}</td>
                  <td className="px-4 py-3"><AccountStatusBadge status={s.status} atRisk={atRisk} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

/* ============================================================
   PORTFOLIO OVERVIEW STRIP
   ============================================================ */

const OverviewStat = ({ icon: Icon, label, value, valueClass = "text-[var(--text-primary)]" }) => (
  <div className="flex items-center gap-3 px-4 py-3 md:px-5">
    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
      <Icon size={14} className="text-[var(--accent)]" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
      <div className={`tj-mono text-base font-bold leading-tight ${valueClass}`}>{value}</div>
    </div>
  </div>
);

const PortfolioOverview = ({ challenges, trades }) => {
  const summary = useMemo(() => {
    const rows = challenges.map((c) => ({ c, s: computeChallengeStats(c, trades) }));
    const active = rows.filter((r) => r.c.stage !== "funded" && r.s.status !== "Failed").length;
    const funded = rows.filter((r) => r.c.stage === "funded").length;
    const totalCapital = rows.reduce((sum, r) => sum + r.c.accountSize, 0);
    const atRisk = rows.filter((r) => r.c.stage !== "funded" && (riskLevel(r.s.dailyLossUsed, r.s.dailyLossBreached) !== "SAFE" || riskLevel(r.s.totalDrawdownUsed, r.s.totalLossBreached) !== "SAFE")).length;
    return { active, funded, totalCapital, atRisk };
  }, [challenges, trades]);

  return (
    <Card className="divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] grid grid-cols-2 sm:grid-cols-4">
      <OverviewStat icon={Layers} label="Active Challenges" value={summary.active} />
      <OverviewStat icon={Award} label="Funded Accounts" value={summary.funded} valueClass="text-amber-400" />
      <OverviewStat icon={Wallet} label="Total Account Size" value={fmtUSD(summary.totalCapital)} />
      <OverviewStat icon={ShieldAlert} label="Accounts At Risk" value={summary.atRisk} valueClass={summary.atRisk > 0 ? "text-amber-400" : "text-[var(--text-primary)]"} />
    </Card>
  );
};

/* ============================================================
   PAGE
   ============================================================ */

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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Funding Challenges</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Monitor your prop-firm accounts, risk limits, progress, and payouts.</p>
        </div>
        <div className="flex items-center gap-2">
          {challenges.length > 0 && (
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button onClick={() => setView("cards")} title="Grid view" aria-label="Grid view" className={`p-2 transition-colors ${view === "cards" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}><LayoutGrid size={15} /></button>
              <button onClick={() => setView("compare")} title="List view" aria-label="List view" className={`p-2 transition-colors ${view === "compare" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}><Table2 size={15} /></button>
            </div>
          )}
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]">
            <Plus size={16} strokeWidth={2.5} /> New Challenge
          </button>
        </div>
      </div>

      {challenges.length > 0 && <PortfolioOverview challenges={challenges} trades={trades} />}

      {challenges.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No funding challenges yet"
            sub="Track your prop-firm evaluations, funded accounts, risk limits, and payouts in one place."
            action={
              <button onClick={() => setModalOpen(true)} className="mt-4 flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2 rounded-lg transition-all active:scale-95">
                <Plus size={15} strokeWidth={2.5} /> Add your first challenge
              </button>
            }
          />
        </Card>
      ) : view === "cards" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {challenges.map((c) => (
            <ChallengeDetailCard
              key={c.id}
              challenge={c}
              trades={trades}
              onDelete={onDelete}
              onMarkFunded={onMarkFunded}
              onRequestPayout={onRequestPayout}
              onExport={() => exportSummary(c, computeChallengeStats(c, trades))}
            />
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
