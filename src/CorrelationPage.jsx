import React, { useState } from "react";
import { Link2, ArrowRight, Info } from "lucide-react";

const inputCls = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

const Field = ({ label, children }) => (
  <label className="block mb-4">
    <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</span>
    {children}
  </label>
);

const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------
// Correlation Checker
// ---------------------------------------------------------------------
// These are typical/rough historical relationships between instruments —
// a reference table, not a live-computed rolling correlation. Real
// correlation drifts over time (weeks to months) and can flip sign during
// regime changes, so treat this as "which pairs tend to move together"
// intuition-building, not a precise up-to-the-minute figure. Wiring this
// to live rolling correlation would need a historical price feed (the
// same constraint the heatmap/economic calendar hit) — worth revisiting
// with a proper data provider later if you want it fully live.
const INSTRUMENTS = ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "USDJPY", "EURJPY", "GBPJPY", "XAUUSD", "NAS100", "US30"];

const CORR = {
  "EURUSD|GBPUSD": 0.85, "EURUSD|AUDUSD": 0.6, "EURUSD|NZDUSD": 0.55, "EURUSD|USDCAD": -0.5,
  "EURUSD|USDCHF": -0.9, "EURUSD|USDJPY": -0.2, "EURUSD|EURJPY": 0.45, "EURUSD|GBPJPY": 0.25,
  "EURUSD|XAUUSD": 0.4, "EURUSD|NAS100": 0.15, "EURUSD|US30": 0.1,
  "GBPUSD|AUDUSD": 0.6, "GBPUSD|NZDUSD": 0.55, "GBPUSD|USDCAD": -0.45, "GBPUSD|USDCHF": -0.8,
  "GBPUSD|USDJPY": -0.15, "GBPUSD|EURJPY": 0.3, "GBPUSD|GBPJPY": 0.55, "GBPUSD|XAUUSD": 0.35,
  "GBPUSD|NAS100": 0.15, "GBPUSD|US30": 0.1,
  "AUDUSD|NZDUSD": 0.85, "AUDUSD|USDCAD": -0.4, "AUDUSD|USDCHF": -0.55, "AUDUSD|USDJPY": 0.3,
  "AUDUSD|EURJPY": 0.3, "AUDUSD|GBPJPY": 0.3, "AUDUSD|XAUUSD": 0.5, "AUDUSD|NAS100": 0.25, "AUDUSD|US30": 0.15,
  "NZDUSD|USDCAD": -0.35, "NZDUSD|USDCHF": -0.5, "NZDUSD|USDJPY": 0.25, "NZDUSD|EURJPY": 0.25,
  "NZDUSD|GBPJPY": 0.25, "NZDUSD|XAUUSD": 0.4, "NZDUSD|NAS100": 0.2, "NZDUSD|US30": 0.1,
  "USDCAD|USDCHF": 0.5, "USDCAD|USDJPY": 0.2, "USDCAD|EURJPY": -0.15, "USDCAD|GBPJPY": -0.1,
  "USDCAD|XAUUSD": -0.3, "USDCAD|NAS100": -0.1, "USDCAD|US30": -0.05,
  "USDCHF|USDJPY": 0.35, "USDCHF|EURJPY": -0.2, "USDCHF|GBPJPY": -0.2, "USDCHF|XAUUSD": -0.4,
  "USDCHF|NAS100": -0.1, "USDCHF|US30": -0.05,
  "USDJPY|EURJPY": 0.6, "USDJPY|GBPJPY": 0.55, "USDJPY|XAUUSD": -0.4, "USDJPY|NAS100": 0.5, "USDJPY|US30": 0.45,
  "EURJPY|GBPJPY": 0.85, "EURJPY|XAUUSD": 0.2, "EURJPY|NAS100": 0.35, "EURJPY|US30": 0.3,
  "GBPJPY|XAUUSD": 0.2, "GBPJPY|NAS100": 0.35, "GBPJPY|US30": 0.3,
  "XAUUSD|NAS100": 0.2, "XAUUSD|US30": 0.15,
  "NAS100|US30": 0.9,
};

const corrLookup = (a, b) => {
  if (a === b) return 1;
  const key1 = `${a}|${b}`, key2 = `${b}|${a}`;
  return CORR[key1] ?? CORR[key2] ?? 0;
};

const corrColor = (v) => {
  const abs = Math.abs(v);
  if (v >= 0) {
    if (abs >= 0.7) return "bg-[var(--accent)] text-white";
    if (abs >= 0.4) return "bg-[var(--accent)]/40 text-[var(--text-primary)]";
    return "bg-[var(--accent)]/10 text-[var(--text-secondary)]";
  }
  if (abs >= 0.7) return "bg-[var(--loss)] text-white";
  if (abs >= 0.4) return "bg-[var(--loss)]/40 text-[var(--text-primary)]";
  return "bg-[var(--loss)]/10 text-[var(--text-secondary)]";
};

const interpret = (v) => {
  const abs = Math.abs(v);
  const dir = v >= 0 ? "move together" : "move opposite each other";
  if (abs >= 0.7) return `Strongly ${dir}. Trading both the same direction (or opposite, if negatively correlated, in the same net exposure) concentrates risk — it's closer to one trade than two.`;
  if (abs >= 0.4) return `Moderately ${dir}. Some shared risk — worth sizing down if you're already in a correlated position.`;
  return `Weakly related. Reasonably independent — treat them as separate risk, not a package deal.`;
};

export default function CorrelationPage() {
  const [a, setA] = useState("EURUSD");
  const [b, setB] = useState("XAUUSD");
  const [view, setView] = useState("lookup"); // "lookup" | "matrix"

  const value = corrLookup(a, b);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={16} className="text-[var(--accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-sm">Correlation Checker</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">See which pairs tend to move together before you stack positions — two "different" trades can quietly be the same bet.</p>

        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
          <button onClick={() => setView("lookup")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${view === "lookup" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Check Two Pairs
          </button>
          <button onClick={() => setView("matrix")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${view === "matrix" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Full Matrix
          </button>
        </div>

        {view === "lookup" ? (
          <div>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Field label="Instrument A">
                <select className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
                  {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Instrument B">
                <select className={inputCls} value={b} onChange={(e) => setB(e.target.value)}>
                  {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            </div>

            <div className={`rounded-lg p-4 mb-3 ${corrColor(value)}`}>
              <div className="text-xs opacity-80 mb-1">Correlation</div>
              <div className="text-2xl font-bold tabular-nums">{value >= 0 ? "+" : ""}{fmt(value)}</div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{a === b ? "Same instrument — perfectly correlated with itself." : interpret(value)}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[10px] border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="w-16" />
                  {INSTRUMENTS.map((i) => (
                    <th key={i} className="text-[var(--text-faint)] font-medium px-1 py-1 whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((row) => (
                  <tr key={row}>
                    <td className="text-[var(--text-faint)] font-medium pr-2 whitespace-nowrap text-right">{row}</td>
                    {INSTRUMENTS.map((col) => {
                      const v = corrLookup(row, col);
                      return (
                        <td key={col} title={`${row} vs ${col}: ${fmt(v)}`}
                          className={`text-center rounded w-8 h-6 tabular-nums cursor-default ${corrColor(v)}`}>
                          {fmt(v, 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[var(--text-faint)] mt-4 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 mt-0.5" />
          These are typical/rough historical relationships, not a live-computed rolling correlation — actual correlation drifts over weeks and can flip during regime changes. Use it for intuition, not precision.
        </p>
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <ArrowRight size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          If you're long EURUSD and short USDCHF at the same time, you're not diversified — those two moves are ~90% the same trade in typical conditions. Correlation checking helps you size total exposure, not just per-trade risk.
        </p>
      </Card>
    </div>
  );
}
