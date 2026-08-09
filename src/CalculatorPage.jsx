import React, { useState, useMemo } from "react";
import { Calculator, ArrowRight, Info, Copy, Check, ArrowUp, ArrowDown } from "lucide-react";

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
// 1.00 lot (100,000 units for forex; 1 contract for everything else), quote
// currency = USD. Approximations good enough for planning a trade — always
// confirm against your broker's exact specs.
const PAIRS = {
  "EURUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "GBPUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "AUDUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "NZDUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "USDCAD": { pipSize: 0.0001, pipValue: 7.4, type: "Forex" },
  "USDCHF": { pipSize: 0.0001, pipValue: 11.2, type: "Forex" },
  "USDJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "EURJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "GBPJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "XAUUSD": { pipSize: 0.01, pipValue: 1, type: "Metal" },
  "XAGUSD": { pipSize: 0.001, pipValue: 5, type: "Metal" },
  "NDX100": { pipSize: 0.1, pipValue: 1, type: "Index" },
  "US30": { pipSize: 1, pipValue: 1, type: "Index" },
  "SPX500": { pipSize: 0.1, pipValue: 1, type: "Index" },
  "BTCUSD": { pipSize: 1, pipValue: 1, type: "Crypto" },
};

const LOT_SIZES = [
  { label: "Standard (1.00)", value: 1 },
  { label: "Mini (0.10)", value: 0.1 },
  { label: "Micro (0.01)", value: 0.01 },
  { label: "Custom", value: "custom" },
];

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const clamp01to5 = (n) => Math.max(0, Math.min(5, n));

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

// Mode 3: full risk-based position sizing with entry/SL/TP and a live trade preview.
const QUICK_BALANCES = [5000, 10000, 25000, 50000];
const QUICK_RISKS = [0.5, 1, 2, 3];
const LEVERAGES = [2, 5, 10, 20, 30, 50, 100];

const PositionCalculator = () => {
  const [instrument, setInstrument] = useState("NDX100");
  const [direction, setDirection] = useState("long"); // "long" | "short"
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [leverage, setLeverage] = useState(100);
  const [entry, setEntry] = useState("21000");
  const [slMode, setSlMode] = useState("price"); // "price" | "pips"
  const [slValue, setSlValue] = useState("20950");
  const [tpMode, setTpMode] = useState("price"); // "price" | "pips" | "rr"
  const [tpValue, setTpValue] = useState("21150");
  const [copied, setCopied] = useState(false);

  const inst = PAIRS[instrument];

  const calc = useMemo(() => {
    if (!inst) return null;
    const entryN = num(entry);
    const isLong = direction === "long";

    // Stop loss, normalized to a price regardless of which mode was used to enter it.
    const slPrice =
      slMode === "pips"
        ? entryN + (isLong ? -1 : 1) * num(slValue) * inst.pipSize
        : num(slValue);
    const slPips = Math.abs(entryN - slPrice) / inst.pipSize;

    // Take profit — supports an explicit price/pips, or a target R:R multiple of the SL distance.
    let tpPrice;
    if (tpMode === "rr") {
      const rr = num(tpValue);
      tpPrice = entryN + (isLong ? 1 : -1) * slPips * inst.pipSize * rr;
    } else if (tpMode === "pips") {
      tpPrice = entryN + (isLong ? 1 : -1) * num(tpValue) * inst.pipSize;
    } else {
      tpPrice = tpValue === "" ? null : num(tpValue);
    }
    const tpPips = tpPrice == null ? null : Math.abs(tpPrice - entryN) / inst.pipSize;
    const rr = tpPips != null && slPips > 0 ? tpPips / slPips : null;

    const riskAmount = num(balance) * (num(riskPct) / 100);
    const lots = slPips > 0 ? riskAmount / (slPips * inst.pipValue) : 0;
    const notional = entryN * lots * (inst.type === "Forex" ? 100000 : 1);
    const marginRequired = leverage > 0 ? notional / leverage : 0;

    return { slPrice, slPips, tpPrice, tpPips, rr, riskAmount, lots, marginRequired };
  }, [inst, entry, direction, slMode, slValue, tpMode, tpValue, balance, riskPct, leverage]);

  const copyLots = () => {
    if (!calc) return;
    navigator.clipboard?.writeText(fmt(calc.lots, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const riskPctNum = clamp01to5(num(riskPct));

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* Left: inputs */}
      <div className="space-y-4">
        <Field label="Instrument">
          <select className={inputCls} value={instrument} onChange={(e) => setInstrument(e.target.value)}>
            {Object.keys(PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {inst && <span className="block text-[11px] text-[var(--text-faint)] mt-1">Pip: {inst.pipSize} · Type: {inst.type}</span>}
        </Field>

        <div>
          <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Direction</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDirection("long")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${direction === "long" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
              <ArrowUp size={14} /> Long
            </button>
            <button onClick={() => setDirection("short")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${direction === "short" ? "bg-rose-500/10 border-rose-500/50 text-rose-400" : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
              <ArrowDown size={14} /> Short
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Balance">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] text-sm">$</span>
              <input type="number" step="any" className={`${inputCls} pl-6`} value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          </Field>
          <Field label="Risk %">
            <div className="relative">
              <input type="number" step="any" className={`${inputCls} pr-7`} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] text-sm">%</span>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-1.5">Quick Balance</span>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_BALANCES.map((b) => (
                <button key={b} onClick={() => setBalance(String(b))}
                  className={`py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${num(balance) === b ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                  ${b >= 1000 ? `${b / 1000}k` : b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-1.5">Risk Level</span>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_RISKS.map((r) => (
                <button key={r} onClick={() => setRiskPct(String(r))}
                  className={`py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${num(riskPct) === r ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-1.5">Leverage</span>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {LEVERAGES.map((l) => (
              <button key={l} onClick={() => setLeverage(l)}
                className={`py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${leverage === l ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                1:{l}
              </button>
            ))}
          </div>
        </div>

        <Field label="Entry Price">
          <input type="number" step="any" className={inputCls} value={entry} onChange={(e) => setEntry(e.target.value)} />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-rose-400">Stop Loss</span>
            <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)] text-[10px] font-semibold">
              <button onClick={() => setSlMode("price")} className={`px-2 py-1 transition-colors ${slMode === "price" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>Price</button>
              <button onClick={() => setSlMode("pips")} className={`px-2 py-1 transition-colors ${slMode === "pips" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>Pips</button>
            </div>
          </div>
          <input type="number" step="any" className={inputCls} value={slValue} onChange={(e) => setSlValue(e.target.value)} />
          {calc && <span className="block text-[11px] text-[var(--text-faint)] mt-1">= {fmt(calc.slPips, 1)} pips</span>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-emerald-400">Take Profit <span className="text-[var(--text-faint)] font-normal">(optional)</span></span>
            <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)] text-[10px] font-semibold">
              <button onClick={() => setTpMode("price")} className={`px-2 py-1 transition-colors ${tpMode === "price" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>Price</button>
              <button onClick={() => setTpMode("pips")} className={`px-2 py-1 transition-colors ${tpMode === "pips" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>Pips</button>
              <button onClick={() => setTpMode("rr")} className={`px-2 py-1 transition-colors ${tpMode === "rr" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>R:R</button>
            </div>
          </div>
          <input type="number" step="any" className={inputCls} value={tpValue} onChange={(e) => setTpValue(e.target.value)} placeholder={tpMode === "rr" ? "e.g. 3" : ""} />
          {calc?.tpPips != null && <span className="block text-[11px] text-[var(--text-faint)] mt-1">= {fmt(calc.tpPips, 1)} pips{calc.rr ? ` · R:R 1:${fmt(calc.rr, 1)}` : ""}</span>}
        </div>
      </div>

      {/* Right: results */}
      <div className="space-y-4">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Position Size</span>
            <button onClick={copyLots} className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <div className="text-3xl font-bold text-[var(--accent)] tabular-nums mb-3">{calc ? fmt(calc.lots, 2) : "0.00"} <span className="text-base text-[var(--text-muted)] font-medium">lots</span></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-2">
              <div className="text-[10px] text-[var(--text-faint)]">Standard</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{calc ? fmt(calc.lots, 2) : "0.00"}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-2">
              <div className="text-[10px] text-[var(--text-faint)]">Mini</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{calc ? fmt(calc.lots * 10, 1) : "0.0"}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-2">
              <div className="text-[10px] text-[var(--text-faint)]">Micro</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{calc ? fmt(calc.lots * 100, 1) : "0.0"}</div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">Risk Exposure</span>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mb-2">{fmt(riskPctNum, 1)}% <span className="text-sm text-[var(--text-muted)] font-medium">({calc ? `$${fmt(calc.riskAmount)}` : "$0"})</span></div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
            <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${(riskPctNum / 5) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
            <span>0%</span><span>1%</span><span>2%</span><span>3%</span><span>4%</span><span>5%</span>
          </div>
        </div>

        {calc && (
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Trade Preview</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${direction === "long" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                {direction === "long" ? "↑ Long" : "↓ Short"}
              </span>
            </div>
            <div className="space-y-0 relative pl-4">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/15" />
              {calc.tpPrice != null && (
                <div className="flex items-center justify-between py-2 relative">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 -ml-4 z-10" /><div><div className="text-[11px] font-semibold text-emerald-400">Take Profit</div><div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmt(calc.tpPrice, 3)}</div></div></div>
                  <span className="text-xs font-semibold text-emerald-400 tabular-nums">+{fmt(calc.tpPips, 1)} pips</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 relative">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] -ml-4 z-10" /><div><div className="text-[11px] font-semibold text-[var(--text-secondary)]">Entry</div><div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmt(num(entry), 3)}</div></div></div>
                {calc.rr && <span className="text-[10px] font-semibold text-[var(--text-faint)] bg-white/5 px-2 py-1 rounded-md">R:R 1:{fmt(calc.rr, 1)}</span>}
              </div>
              <div className="flex items-center justify-between py-2 relative">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 -ml-4 z-10" /><div><div className="text-[11px] font-semibold text-rose-400">Stop Loss</div><div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmt(calc.slPrice, 3)}</div></div></div>
                <span className="text-xs font-semibold text-rose-400 tabular-nums">-{fmt(calc.slPips, 1)} pips</span>
              </div>
            </div>
          </div>
        )}

        {calc && inst?.type === "Forex" && (
          <p className="text-[11px] text-[var(--text-faint)] flex items-start gap-1.5"><Info size={12} className="shrink-0 mt-0.5" /> Margin required at 1:{leverage} leverage: ${fmt(calc.marginRequired)}</p>
        )}
      </div>
    </div>
  );
};

export default function CalculatorPage() {
  const [mode, setMode] = useState("value"); // "value" | "distance" | "size"

  return (
    <div className={`p-4 md:p-8 mx-auto space-y-5 transition-all ${mode === "size" ? "max-w-4xl" : "max-w-2xl"}`}>
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={16} className="text-[var(--accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-sm">Pips & Position Size Calculator</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">Work out what a pip is worth, measure pip distance between two prices, or size a position to risk exactly what you intend — before you place the trade.</p>

        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
          <button onClick={() => setMode("value")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "value" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Pip Value
          </button>
          <button onClick={() => setMode("distance")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "distance" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Pips Between Prices
          </button>
          <button onClick={() => setMode("size")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "size" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            Position Calculator
          </button>
        </div>

        {mode === "value" ? <PipValueCalculator /> : mode === "distance" ? <PipsBetweenPrices /> : <PositionCalculator />}

        <p className="text-xs text-[var(--text-faint)] mt-4 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Pip sizes and values are standard approximations. Always confirm against your broker's exact contract specs before sizing a real position.</p>
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
