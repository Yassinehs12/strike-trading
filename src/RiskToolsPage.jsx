import React, { useState, useMemo } from "react";
import { Gauge, ArrowRight, Info } from "lucide-react";

const inputCls = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

const Field = ({ label, children, hint }) => (
  <label className="block mb-4">
    <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-[var(--text-faint)] mt-1">{hint}</span>}
  </label>
);

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ---------------------------------------------------------------------
// Risk of Ruin: probability of hitting a given drawdown threshold before
// hitting a given profit target, given win rate, R:R, and risk per trade.
// Uses the classic gambler's-ruin approximation applied to R-multiples,
// which is the standard practical estimate traders use (not a full Monte
// Carlo simulation) — good for gut-checking a strategy's risk profile, not
// a guarantee of outcomes.
// ---------------------------------------------------------------------
const RiskOfRuinCalculator = () => {
  const [winRate, setWinRate] = useState("50");
  const [rr, setRr] = useState("2");
  const [riskPct, setRiskPct] = useState("1");
  const [ruinPct, setRuinPct] = useState("20");

  const result = useMemo(() => {
    const p = clamp(num(winRate) / 100, 0.0001, 0.9999); // win probability
    const q = 1 - p;
    const b = Math.max(num(rr), 0.0001); // reward per unit risked
    const riskFrac = Math.max(num(riskPct) / 100, 0.0001); // fraction of account risked per trade
    const ruinFrac = Math.max(num(ruinPct) / 100, 0.0001); // fraction of account counted as "ruin"

    const unitsToRuin = ruinFrac / riskFrac;
    const edgeR = p * b - q;

    let riskOfRuin;
    if (edgeR <= 0) {
      riskOfRuin = 1;
    } else {
      const oddsRatio = q / (p * b);
      riskOfRuin = oddsRatio >= 1 ? 1 : Math.pow(oddsRatio, unitsToRuin);
    }

    return {
      riskOfRuin: clamp(riskOfRuin, 0, 1) * 100,
      edgeR,
      unitsToRuin,
      expectancyPct: edgeR * riskFrac * 100,
    };
  }, [winRate, rr, riskPct, ruinPct]);

  const riskColor = result.riskOfRuin >= 50 ? "text-[var(--loss)]" : result.riskOfRuin >= 15 ? "text-[var(--warning,#f59e0b)]" : "text-[var(--accent)]";

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Win Rate (%)">
          <input type="number" step="any" className={inputCls} value={winRate} onChange={(e) => setWinRate(e.target.value)} />
        </Field>
        <Field label="Avg Reward:Risk (R)">
          <input type="number" step="any" className={inputCls} value={rr} onChange={(e) => setRr(e.target.value)} hint="e.g. 2 means you make 2R on average wins" />
        </Field>
        <Field label="Risk per Trade (%)">
          <input type="number" step="any" className={inputCls} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
        </Field>
        <Field label="Ruin Threshold (% drawdown)">
          <input type="number" step="any" className={inputCls} value={ruinPct} onChange={(e) => setRuinPct(e.target.value)} hint="e.g. 20% = your prop firm's max drawdown" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Expectancy per Trade</div>
          <div className={`text-xl font-bold tabular-nums ${result.expectancyPct >= 0 ? "text-[var(--accent)]" : "text-[var(--loss)]"}`}>
            {result.expectancyPct >= 0 ? "+" : ""}{fmt(result.expectancyPct)}%
          </div>
        </div>
        <div className={`bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4`}>
          <div className="text-xs text-[var(--text-muted)] mb-1">Risk of Ruin</div>
          <div className={`text-xl font-bold tabular-nums ${riskColor}`}>{fmt(result.riskOfRuin, 1)}%</div>
        </div>
      </div>

      {result.edgeR <= 0 && (
        <div className="flex items-start gap-1.5 text-xs text-[var(--loss)] bg-[var(--loss)]/10 border border-[var(--loss)]/30 rounded-lg p-3">
          <AlertIcon /> This win rate and R:R combination has a negative expectancy — ruin is effectively a matter of time, regardless of position sizing.
        </div>
      )}
    </div>
  );
};

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);

export default function RiskToolsPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={16} className="text-[var(--accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-sm">Risk of Ruin</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">Sanity-check your edge before it costs you money — estimate the probability of hitting a drawdown threshold given your win rate, R:R, and risk per trade.</p>

        <RiskOfRuinCalculator />

        <p className="text-xs text-[var(--text-faint)] mt-4 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Risk of ruin uses a standard gambler's-ruin approximation from your win rate and R:R — a planning estimate, not a simulation of your actual equity curve or a guarantee of outcomes.</p>
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <ArrowRight size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          Risk of ruin tells you whether your edge and position sizing can survive a losing streak — the same win rate and R:R can be perfectly safe at 0.5% risk per trade and reckless at 5%.
        </p>
      </Card>
    </div>
  );
}
