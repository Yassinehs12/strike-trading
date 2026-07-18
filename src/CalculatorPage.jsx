import React, { useState, useMemo } from "react";
import { Calculator, ArrowRight, Info } from "lucide-react";

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

// Standard pip values per 1.00 standard lot (100,000 units), quote currency = USD unless noted.
// These are approximations for common pairs — good enough for position sizing, not for accounting.
const PIP_VALUES = {
  "EURUSD": 10, "GBPUSD": 10, "AUDUSD": 10, "NZDUSD": 10,
  "USDCAD": 7.4, "USDCHF": 11.2,
  "USDJPY": 6.7, "EURJPY": 6.7, "GBPJPY": 6.7,
  "XAUUSD": 10, // per 0.01 price move on 100oz lot ≈ $10/pip when pip = $0.01... commonly traded as $1/pip per 0.1 lot; kept simple
};

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const ForexCalculator = () => {
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [stopPips, setStopPips] = useState("20");
  const [pair, setPair] = useState("EURUSD");

  const result = useMemo(() => {
    const riskAmount = num(balance) * (num(riskPct) / 100);
    const pipValue = PIP_VALUES[pair] || 10;
    const lots = num(stopPips) > 0 ? riskAmount / (num(stopPips) * pipValue) : 0;
    return { riskAmount, lots, pipValue };
  }, [balance, riskPct, stopPips, pair]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Account Balance ($)">
          <input type="number" className={inputCls} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <Field label="Risk per Trade (%)">
          <input type="number" step="0.1" className={inputCls} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
        </Field>
        <Field label="Pair">
          <select className={inputCls} value={pair} onChange={(e) => setPair(e.target.value)}>
            {Object.keys(PIP_VALUES).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Stop Loss (pips)">
          <input type="number" className={inputCls} value={stopPips} onChange={(e) => setStopPips(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Amount at Risk</div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">${fmt(result.riskAmount)}</div>
        </div>
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
          <div className="text-xs text-[var(--accent)] mb-1">Position Size</div>
          <div className="text-xl font-bold text-[var(--accent)] tabular-nums">{fmt(result.lots)} lots</div>
        </div>
      </div>
      <p className="text-xs text-[var(--text-faint)] mt-3 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Pip values are standard approximations for a 100,000-unit lot. Double-check against your broker's exact contract specs before sizing a real position.</p>
    </div>
  );
};

const PriceBasedCalculator = () => {
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");

  const result = useMemo(() => {
    const riskAmount = num(balance) * (num(riskPct) / 100);
    const perUnitRisk = Math.abs(num(entry) - num(stop));
    const units = perUnitRisk > 0 ? riskAmount / perUnitRisk : 0;
    const positionValue = units * num(entry);
    return { riskAmount, units, positionValue, perUnitRisk };
  }, [balance, riskPct, entry, stop]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Account Balance ($)">
          <input type="number" className={inputCls} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <Field label="Risk per Trade (%)">
          <input type="number" step="0.1" className={inputCls} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
        </Field>
        <Field label="Entry Price">
          <input type="number" step="any" className={inputCls} placeholder="e.g. 2385.40" value={entry} onChange={(e) => setEntry(e.target.value)} />
        </Field>
        <Field label="Stop Loss Price">
          <input type="number" step="any" className={inputCls} placeholder="e.g. 2378.20" value={stop} onChange={(e) => setStop(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Amount at Risk</div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">${fmt(result.riskAmount)}</div>
        </div>
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
          <div className="text-xs text-[var(--accent)] mb-1">Position Size</div>
          <div className="text-xl font-bold text-[var(--accent)] tabular-nums">{fmt(result.units)} units</div>
        </div>
      </div>
      {result.positionValue > 0 && (
        <div className="mt-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Total Position Value</span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">${fmt(result.positionValue)}</span>
        </div>
      )}
      <p className="text-xs text-[var(--text-faint)] mt-3 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Works for anything priced directly in dollars — stocks, crypto, indices. Units = shares/coins/contracts depending on the instrument.</p>
    </div>
  );
};

export default function CalculatorPage() {
  const [mode, setMode] = useState("forex"); // "forex" | "price"

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={16} className="text-[var(--accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-sm">Position Size Calculator</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">Work out how many lots, shares, or coins to trade so a stop-out costs exactly the percentage of your account you intend to risk — never more.</p>

        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
          <button onClick={() => setMode("forex")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "forex" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Forex (Lots)
          </button>
          <button onClick={() => setMode("price")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "price" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Stocks / Crypto / Indices
          </button>
        </div>

        {mode === "forex" ? <ForexCalculator /> : <PriceBasedCalculator />}
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <ArrowRight size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          The rule of thumb: risk 1-2% of your account per trade. This calculator does the math backwards from that number — you tell it your risk tolerance and stop distance, it tells you the size that keeps you inside it.
        </p>
      </Card>
    </div>
  );
}
