// Public, no-login landing page for the position size calculator, at
// /tools/position-size-calculator. This exists purely for SEO/GEO: traders
// search "position size calculator" constantly, and this page gives search
// engines and AI answer engines a standalone, indexable, working tool to
// point at — rather than the in-app version at PositionCalculatorPage,
// which sits behind auth and a dashboard shell.
//
// Shares its calculation engine (src/lib/positionCalc.js) with the in-app
// calculator, so the two can never drift out of sync on the math, and
// reuses that page's tested logic (see src/lib/positionCalc.test.js).
import React, { useState, useMemo } from "react";
import { Percent, ArrowUp, ArrowDown, Copy, Check, Info, ArrowRight, ChevronDown } from "lucide-react";
import { LogoMark } from "../Logo";
import { usePageMeta } from "../lib/seo";
import { PAIRS, num, fmt, clamp01to5 } from "../lib/positionCalc";

const inputCls = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors";

const Field = ({ label, children, hint }) => (
  <label className="block mb-4">
    <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-[var(--text-faint)] mt-1">{hint}</span>}
  </label>
);

const StatBox = ({ label, value, sub, color = "text-[var(--text-primary)]" }) => (
  <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-1.5">{label}</div>
    <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    {sub && <div className="text-[11px] text-[var(--text-faint)] mt-0.5">{sub}</div>}
  </div>
);

const QUICK_BALANCES = [5000, 10000, 25000, 50000];
const QUICK_RISKS = [0.5, 1, 2, 3];
const LEVERAGES = [2, 5, 10, 20, 30, 50, 100];

// GEO definition block + FAQ content for this page — written as
// bolded-term / single-sentence answers so AI answer engines can lift
// them directly. Kept local to this page rather than faqData.js since
// these are tool-specific, not site-wide FAQ accordion content.
const CALC_FAQS = [
  {
    q: "What is position size in trading?",
    a: "Position size is the number of units, lots, or shares a trader buys or sells in a single trade. It is calculated from account balance, risk percentage, and stop-loss distance so that a losing trade costs a known, fixed amount.",
  },
  {
    q: "How do you calculate position size?",
    a: "Position size = (Account Balance × Risk %) ÷ (Stop-Loss Distance in Pips × Pip Value). This gives the lot size that risks exactly the intended dollar amount if the stop-loss is hit.",
  },
  {
    q: "What risk percentage should I use per trade?",
    a: "Most risk management frameworks recommend risking 0.5% to 2% of account balance per trade. Prop firm evaluations often enforce a lower ceiling because of daily loss limit and max drawdown rules.",
  },
  {
    q: "What is a lot in forex trading?",
    a: "A standard lot is 100,000 units of the base currency. A mini lot is 10,000 units (0.1 lots) and a micro lot is 1,000 units (0.01 lots).",
  },
];

export default function PositionSizeCalculatorPublic() {
  usePageMeta({
    title: "Position Size Calculator — Free Forex, Gold & Index Lot Size Tool",
    description: "Free position size calculator for forex, gold, indices, and crypto. Enter your balance, risk %, and stop-loss to get exact lot size, margin, and risk in dollars.",
    path: "/tools/position-size-calculator",
  });

  const [instrument, setInstrument] = useState("XAUUSD");
  const [direction, setDirection] = useState("long");
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [leverage, setLeverage] = useState(100);
  const [entry, setEntry] = useState("2650");
  const [slMode, setSlMode] = useState("price");
  const [slValue, setSlValue] = useState("2645");
  const [tpMode, setTpMode] = useState("price");
  const [tpValue, setTpValue] = useState("2660");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const inst = PAIRS[instrument];

  const calc = useMemo(() => {
    if (!inst) return null;
    const entryN = num(entry);
    const isLong = direction === "long";

    const slPrice = slMode === "pips" ? entryN + (isLong ? -1 : 1) * num(slValue) * inst.pipSize : num(slValue);
    const slPips = Math.abs(entryN - slPrice) / inst.pipSize;

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
    const pipValueForLots = inst.pipValue * lots;
    const notional = entryN * lots * (inst.type === "Forex" ? 100000 : 1);
    const marginRequired = leverage > 0 ? notional / leverage : 0;
    const potentialProfit = tpPips != null ? tpPips * pipValueForLots : null;

    return { slPrice, slPips, tpPrice, tpPips, rr, riskAmount, lots, pipValueForLots, marginRequired, potentialProfit };
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
    <div className="lp-root min-h-screen bg-[var(--bg-primary)]">
      {/* Minimal header — no auth/dashboard chrome, just a way back to the product */}
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-bold text-[var(--text-primary)]">Strike<span className="text-[var(--accent)]">Journal</span></span>
          </a>
          <a href="/" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity">
            Try the full journal <ArrowRight size={14} />
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <h1 className="lp-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          Position Size Calculator
        </h1>

        {/* Definition block — first ~150 words, bolded term + single-sentence
            answer, exactly the shape AI Overviews and chat answer engines
            lift verbatim. */}
        <p className="text-sm md:text-base text-[var(--text-tertiary)] max-w-2xl leading-relaxed mb-8">
          <strong className="text-[var(--text-primary)]">Position size</strong> is the number of lots or units you trade so that a losing trade costs a fixed, known percentage of your account. Enter your account balance, risk percentage, entry price, and stop-loss below — this calculator works for forex pairs, gold (XAU/USD), silver, major indices, and BTC/USD, and instantly returns the exact lot size, dollar risk, and margin required.
        </p>

        <div className="rounded-2xl border border-[var(--border-primary)] p-5 md:p-6" style={{ backgroundColor: "var(--card-bg)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Percent size={16} className="text-[var(--accent)]" />
            <h2 className="font-bold text-[var(--text-primary)] text-sm">Calculate your position size</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">Size a position to risk exactly what you intend, see your margin requirement, and preview the trade before you place it.</p>

          <div className="grid lg:grid-cols-2 gap-5 items-start">
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
            </div>
          </div>

          <p className="text-xs text-[var(--text-faint)] mt-5 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Pip sizes/values are standard approximations. Always confirm against your broker's exact contract specs before sizing a real position.</p>
        </div>

        {calc && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            <StatBox label="Risk Amount" value={`$${fmt(calc.riskAmount)}`} sub={`${fmt(riskPctNum, 1)}% of balance`} />
            <StatBox label="Pip Value" value={`$${fmt(calc.pipValueForLots)}`} sub="per lot per pip" />
            <StatBox label="Pips at Risk" value={fmt(calc.slPips, 1)} sub="to stop loss" color="text-rose-400" />
            <StatBox label="Pips to Target" value={calc.tpPips != null ? fmt(calc.tpPips, 1) : "—"} sub="to take profit" color="text-emerald-400" />
            <StatBox label="Est. Margin" value={`$${fmt(calc.marginRequired)}`} sub={`at 1:${leverage} leverage`} />
            <StatBox label="Potential Profit" value={calc.potentialProfit != null ? `$${fmt(calc.potentialProfit)}` : "—"} sub="if TP hit" color="text-emerald-400" />
          </div>
        )}

        {/* Soft product tie-in — this is the actual conversion path for
            organic/GEO traffic landing here. */}
        <div className="mt-10 rounded-2xl border border-[var(--border-primary)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: "var(--card-bg)" }}>
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">Track every trade against your risk plan automatically</div>
            <p className="text-sm text-[var(--text-tertiary)]">Strike Journal logs your position size, R:R, and outcome for every trade — plus live prop firm rule tracking. Free to start.</p>
          </div>
          <a href="/" className="shrink-0 flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 whitespace-nowrap">
            Start Free <ArrowRight size={16} />
          </a>
        </div>

        {/* FAQ — definitional, GEO-shaped answers targeting "how to
            calculate position size" / "what is position size" queries. */}
        <div className="mt-14 max-w-2xl">
          <h2 className="lp-display text-2xl font-bold text-[var(--text-primary)] mb-6">Frequently asked questions</h2>
          {CALC_FAQS.map((f, i) => (
            <div key={i} className="border-b border-white/10 py-4">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 text-left">
                <span className="text-sm md:text-base font-semibold text-[var(--text-primary)]">{f.q}</span>
                <ChevronDown size={16} className={`shrink-0 text-[var(--text-muted)] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mt-3 pr-8">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
