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

// Pip size (the price move that counts as "1 pip") and standard pip value per
// 1.00 lot (100,000 units), quote currency = USD. Approximations good enough
// for planning a trade — always confirm against your broker's exact specs.
const PAIRS = {
  "EURUSD": { pipSize: 0.0001, pipValue: 10 },
  "GBPUSD": { pipSize: 0.0001, pipValue: 10 },
  "AUDUSD": { pipSize: 0.0001, pipValue: 10 },
  "NZDUSD": { pipSize: 0.0001, pipValue: 10 },
  "USDCAD": { pipSize: 0.0001, pipValue: 7.4 },
  "USDCHF": { pipSize: 0.0001, pipValue: 11.2 },
  "USDJPY": { pipSize: 0.01, pipValue: 6.7 },
  "EURJPY": { pipSize: 0.01, pipValue: 6.7 },
  "GBPJPY": { pipSize: 0.01, pipValue: 6.7 },
  "XAUUSD": { pipSize: 0.01, pipValue: 1 },
};

const LOT_SIZES = [
  { label: "Standard (1.00)", value: 1 },
  { label: "Mini (0.10)", value: 0.1 },
  { label: "Micro (0.01)", value: 0.01 },
  { label: "Custom", value: "custom" },
];

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });

// Mode 1: what a pip is worth for a given pair and lot size.
const PipValueCalculator = () => {
  const [pair, setPair] = useState("EURUSD");
  const [lotChoice, setLotChoice] = useState(1);
  const [customLots, setCustomLots] = useState("1");
  const [numPips, setNumPips] = useState("20");

  const lots = lotChoice === "custom" ? num(customLots) : lotChoice;

  const result = useMemo(() => {
    const p = PAIRS[pair];
    if (!p) return { perPip: 0, total: 0 };
    const perPip = p.pipValue * lots;
    return { perPip, total: perPip * num(numPips) };
  }, [pair, lots, numPips]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Pair">
          <select className={inputCls} value={pair} onChange={(e) => setPair(e.target.value)}>
            {Object.keys(PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Number of Pips">
          <input type="number" className={inputCls} value={numPips} onChange={(e) => setNumPips(e.target.value)} />
        </Field>
        <Field label="Lot Size">
          <select className={inputCls} value={lotChoice} onChange={(e) => setLotChoice(e.target.value === "custom" ? "custom" : Number(e.target.value))}>
            {LOT_SIZES.map((l) => <option key={l.label} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        {lotChoice === "custom" && (
          <Field label="Custom Lots">
            <input type="number" step="any" className={inputCls} value={customLots} onChange={(e) => setCustomLots(e.target.value)} />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Value per Pip</div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">${fmt(result.perPip)}</div>
        </div>
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
          <div className="text-xs text-[var(--accent)] mb-1">Total for {numPips || 0} Pips</div>
          <div className="text-xl font-bold text-[var(--accent)] tabular-nums">${fmt(result.total)}</div>
        </div>
      </div>
    </div>
  );
};

// Mode 2: how many pips between two prices.
const PipsBetweenPrices = () => {
  const [pair, setPair] = useState("EURUSD");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");

  const pips = useMemo(() => {
    const p = PAIRS[pair];
    if (!p || entry === "" || exit === "") return 0;
    return Math.abs(num(exit) - num(entry)) / p.pipSize;
  }, [pair, entry, exit]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Pair">
          <select className={inputCls} value={pair} onChange={(e) => setPair(e.target.value)}>
            {Object.keys(PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <div />
        <Field label="Entry Price">
          <input type="number" step="any" className={inputCls} placeholder="e.g. 1.08420" value={entry} onChange={(e) => setEntry(e.target.value)} />
        </Field>
        <Field label="Exit / Stop Price">
          <input type="number" step="any" className={inputCls} placeholder="e.g. 1.08220" value={exit} onChange={(e) => setExit(e.target.value)} />
        </Field>
      </div>

      <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
        <div className="text-xs text-[var(--accent)] mb-1">Distance</div>
        <div className="text-2xl font-bold text-[var(--accent)] tabular-nums">{fmt(pips, 1)} pips</div>
      </div>
    </div>
  );
};

export default function CalculatorPage() {
  const [mode, setMode] = useState("value"); // "value" | "distance"

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={16} className="text-[var(--accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-sm">Pips Calculator</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">Work out what a pip is worth on a given pair and lot size, or measure the pip distance between two prices — before you place the trade.</p>

        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
          <button onClick={() => setMode("value")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "value" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Pip Value
          </button>
          <button onClick={() => setMode("distance")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "distance" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Pips Between Prices
          </button>
        </div>

        {mode === "value" ? <PipValueCalculator /> : <PipsBetweenPrices />}

        <p className="text-xs text-[var(--text-faint)] mt-4 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Pip sizes and values are standard approximations (JPY pairs use 0.01 as one pip, most others use 0.0001). Always confirm against your broker's exact contract specs before sizing a real position.</p>
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <ArrowRight size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          A pip is the smallest standard price move for a pair. Knowing what one is worth on your lot size tells you exactly what a given stop distance will cost — before you're in the trade, not after.
        </p>
      </Card>
    </div>
  );
}
