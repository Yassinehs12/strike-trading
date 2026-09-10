import React, { useMemo, useState } from "react";
import {
  Crosshair, Plus, Search, TrendingUp, TrendingDown, Minus, X, Pencil, Trash2, Archive, ArchiveRestore,
  CheckCircle2, ChevronUp, ChevronDown, AlertTriangle, Upload, Target, ShieldAlert, Ban,
  NotebookPen, BarChart2, Award, ArrowLeft, Layers, Activity,
} from "lucide-react";
import { computeKPIs } from "../lib/tradeCalculations";
import { Card, Drawer, EmptyState, Field, Modal } from "../components/ui/Primitives";
import { inputCls } from "../constants";

/* ============================================================
   SETUP DATA HELPERS
   ============================================================ */

const DIRECTION_META = {
  bullish: { label: "Bullish", Icon: TrendingUp, color: "text-emerald-400", chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  bearish: { label: "Bearish", Icon: TrendingDown, color: "text-rose-400", chip: "bg-rose-500/10 text-rose-400 border-rose-500/25" },
  neutral: { label: "Neutral", Icon: Minus, color: "text-[var(--text-tertiary)]", chip: "bg-white/5 text-[var(--text-tertiary)] border-white/10" },
};

const TIMEFRAME_SUGGESTIONS = ["1M", "5M", "15M", "30M", "1H", "4H", "Daily", "Weekly"];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Matches journal trades to a setup by its free-text `setup` field — the
// same field the Log Trade form writes to (now autocompleted from this
// library). No schema change to trades is needed for the Setup -> Trade
// Journal -> Performance loop to work.
function matchTrades(trades, setupName) {
  const key = (setupName || "").trim().toLowerCase();
  if (!key) return [];
  return trades.filter((t) => (t.setup || "").trim().toLowerCase() === key);
}

// Only surfaces performance once there's enough closed-trade history to be
// meaningful — otherwise reports "not enough trades yet" rather than a
// misleading stat computed from one or two trades.
const MIN_TRADES_FOR_STATS = 5;

function computeSetupStats(setup, trades) {
  const matched = matchTrades(trades, setup.name);
  const closed = matched.filter((t) => t.status === "Win" || t.status === "Loss" || t.status === "BE");
  if (closed.length < MIN_TRADES_FOR_STATS) return { enough: false, count: closed.length };
  const k = computeKPIs(closed);
  const withRisk = closed.filter((t) => t.riskAmount > 0);
  const avgR = withRisk.length ? withRisk.reduce((s, t) => s + t.pnl / t.riskAmount, 0) / withRisk.length : null;
  return {
    enough: true, count: closed.length, winRate: k.winRate,
    profitFactor: Number.isFinite(k.profitFactor) ? k.profitFactor : null,
    avgR, avgWin: k.avgWin, avgLoss: k.avgLoss, netPnl: k.netProfit,
  };
}

/* ============================================================
   SHARED SMALL PIECES
   ============================================================ */

const DirectionBadge = ({ direction }) => {
  const m = DIRECTION_META[direction] || DIRECTION_META.neutral;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${m.chip}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

const StatusBadge = ({ status }) =>
  status === "archived" ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-white/5 text-[var(--text-faint)] border-white/10">
      <Archive size={10} /> Archived
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/25">
      Active
    </span>
  );

/* ============================================================
   TAG INPUT (markets)
   ============================================================ */

const TagInput = ({ values, onChange, placeholder }) => {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim().toUpperCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 text-xs font-medium bg-[var(--bg-primary)] border border-white/10 text-[var(--text-secondary)] rounded-md px-2 py-1">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-[var(--text-faint)] hover:text-rose-400 transition-colors">
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        className={inputCls}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
          else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={commit}
      />
    </div>
  );
};

/* ============================================================
   RULE CHECKLIST EDITOR (used for both entry + invalidation rules)
   ============================================================ */

const RuleListEditor = ({ rules, onChange, addLabel, allowRequired }) => {
  const [draft, setDraft] = useState("");

  const addRule = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...rules, { id: uid(), text, required: false }]);
    setDraft("");
  };
  const removeRule = (id) => onChange(rules.filter((r) => r.id !== id));
  const toggleRequired = (id) => onChange(rules.map((r) => (r.id === id ? { ...r, required: !r.required } : r)));
  const move = (idx, dir) => {
    const next = [...rules];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div>
      {rules.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {rules.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-2.5 py-2">
              <div className="flex flex-col -my-1 shrink-0">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-[var(--text-faint)] hover:text-[var(--text-secondary)] disabled:opacity-20 disabled:pointer-events-none"><ChevronUp size={12} /></button>
                <button type="button" disabled={i === rules.length - 1} onClick={() => move(i, 1)} className="text-[var(--text-faint)] hover:text-[var(--text-secondary)] disabled:opacity-20 disabled:pointer-events-none"><ChevronDown size={12} /></button>
              </div>
              <span className="flex-1 text-sm text-[var(--text-primary)]">{r.text}</span>
              {allowRequired && (
                <button
                  type="button"
                  onClick={() => toggleRequired(r.id)}
                  title="Toggle required"
                  className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 transition-colors ${
                    r.required ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30" : "bg-transparent text-[var(--text-faint)] border-white/10"
                  }`}
                >
                  {r.required ? "Required" : "Optional"}
                </button>
              )}
              <button type="button" onClick={() => removeRule(r.id)} className="text-[var(--text-faint)] hover:text-rose-400 transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={draft}
          placeholder={addLabel}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRule(); } }}
        />
        <button type="button" onClick={addRule} className="shrink-0 px-3 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   CHART EXAMPLES UPLOADER (mirrors the trade screenshot pattern —
   base64 images stored directly on the setup record)
   ============================================================ */

const MAX_EXAMPLES = 6;

const ExamplesUploader = ({ examples, onChange }) => {
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_EXAMPLES - examples.length);
    e.target.value = "";
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => onChange((cur) => (cur.length >= MAX_EXAMPLES ? cur : [...cur, reader.result]));
      reader.readAsDataURL(file);
    });
  };
  const remove = (i) => onChange((cur) => cur.filter((_, idx) => idx !== i));

  return (
    <div>
      {examples.length < MAX_EXAMPLES && (
        <label className="flex items-center gap-2 justify-center border border-dashed border-white/15 rounded-lg py-3 text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/50 hover:text-[var(--text-secondary)] transition-colors">
          <Upload size={14} /> {examples.length > 0 ? "Add another example" : "Upload chart examples"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </label>
      )}
      {examples.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {examples.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt={`example ${i + 1}`} className="rounded-lg border border-white/10 h-20 w-full object-cover" />
              <button type="button" onClick={() => remove(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   CREATE / EDIT FORM
   ============================================================ */

const blankForm = () => ({
  name: "", description: "", markets: [], direction: "bullish",
  htfTimeframe: "", entryTimeframe: "",
  entryRules: [], invalidationRules: [],
  typicalRiskPct: "", minRR: "", stopLossMethod: "", takeProfitMethod: "", maxEntries: "",
  notes: "", examples: [], status: "active",
});

const SetupFormModal = ({ open, onClose, onSubmit, initial, saving }) => {
  const [form, setForm] = useState(() => (initial ? { ...blankForm(), ...initial } : blankForm()));
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Re-seed the form whenever a different setup is opened for editing.
  React.useEffect(() => {
    if (open) { setForm(initial ? { ...blankForm(), ...initial } : blankForm()); setError(""); }
  }, [open, initial]);

  const submit = () => {
    if (!form.name.trim()) { setError("Give the setup a name."); return; }
    setError("");
    onSubmit({
      ...form,
      id: initial?.id,
      name: form.name.trim(),
      typicalRiskPct: form.typicalRiskPct === "" ? null : Number(form.typicalRiskPct),
      maxEntries: form.maxEntries === "" ? null : Number(form.maxEntries),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Setup" : "New Setup"} wide>
      <Field label="Setup Name">
        <input className={inputCls} placeholder="e.g. Bearish Order Block Retest" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      </Field>
      <Field label="Description">
        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="A one- or two-sentence summary of the setup." value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Markets" hint="Press Enter or comma to add">
          <TagInput values={form.markets} onChange={(v) => set("markets", v)} placeholder="e.g. NASDAQ, XAUUSD" />
        </Field>
        <Field label="Direction">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {Object.entries(DIRECTION_META).map(([key, m]) => (
              <button key={key} type="button" onClick={() => set("direction", key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${form.direction === key ? `${m.chip}` : "bg-[var(--bg-primary)] text-[var(--text-muted)]"}`}>
                <m.Icon size={12} /> {m.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Higher Timeframe">
          <input className={inputCls} list="tf-suggestions" placeholder="e.g. 4H" value={form.htfTimeframe} onChange={(e) => set("htfTimeframe", e.target.value)} />
        </Field>
        <Field label="Entry Timeframe">
          <input className={inputCls} list="tf-suggestions" placeholder="e.g. 15M" value={form.entryTimeframe} onChange={(e) => set("entryTimeframe", e.target.value)} />
        </Field>
        <datalist id="tf-suggestions">{TIMEFRAME_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist>
      </div>

      <Field label="Entry Rules" hint="Checklist of conditions that must line up before you take this setup.">
        <RuleListEditor rules={form.entryRules} onChange={(v) => set("entryRules", v)} addLabel="e.g. HTF bearish bias" allowRequired />
      </Field>

      <Field label="Invalidation" hint="When should you NOT take this setup?">
        <RuleListEditor rules={form.invalidationRules} onChange={(v) => set("invalidationRules", v)} addLabel="e.g. No confirmation candle" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Typical Risk (%)">
          <input type="number" step="any" className={inputCls} placeholder="e.g. 1" value={form.typicalRiskPct} onChange={(e) => set("typicalRiskPct", e.target.value)} />
        </Field>
        <Field label="Minimum Risk/Reward">
          <input className={inputCls} placeholder="e.g. 1:2" value={form.minRR} onChange={(e) => set("minRR", e.target.value)} />
        </Field>
        <Field label="Stop Loss Method">
          <input className={inputCls} placeholder="e.g. Beyond the sweep wick" value={form.stopLossMethod} onChange={(e) => set("stopLossMethod", e.target.value)} />
        </Field>
        <Field label="Take Profit Method">
          <input className={inputCls} placeholder="e.g. Next liquidity pool" value={form.takeProfitMethod} onChange={(e) => set("takeProfitMethod", e.target.value)} />
        </Field>
        <Field label="Maximum Entries">
          <input type="number" className={inputCls} placeholder="e.g. 2" value={form.maxEntries} onChange={(e) => set("maxEntries", e.target.value)} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Only take this setup when the HTF structure remains bearish. Avoid entering immediately before high-impact news." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      <Field label={`Chart Examples (optional, up to ${MAX_EXAMPLES})`}>
        <ExamplesUploader examples={form.examples} onChange={(fn) => set("examples", typeof fn === "function" ? fn(form.examples) : fn)} />
      </Field>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2.5 mb-3">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <button onClick={submit} disabled={saving}
        className="w-full mt-1 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all active:scale-[0.98]">
        {initial ? "Save Changes" : "Create Setup"}
      </button>
    </Modal>
  );
};

/* ============================================================
   SETUP CARD
   ============================================================ */

const SetupCard = ({ setup, trades, onView, onEdit, onDelete, onToggleArchive }) => {
  const stats = computeSetupStats(setup, trades);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="p-4 flex flex-col gap-3 tj-animate-in hover:border-white/[0.14] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-[var(--text-primary)] truncate">{setup.name}</h3>
          {setup.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{setup.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(setup)} title="Edit setup" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-white/5 transition-colors"><Pencil size={14} /></button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} title="Delete setup" className="text-[var(--text-faint)] hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors"><Trash2 size={14} /></button>
          ) : (
            <button onClick={() => onDelete(setup.id)} title="Confirm delete" className="text-rose-400 bg-rose-500/10 p-1 rounded-md"><AlertTriangle size={14} /></button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <DirectionBadge direction={setup.direction} />
        <StatusBadge status={setup.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-white/10 pt-3">
        <span className="truncate">{setup.markets.length ? setup.markets.join(" · ") : "No markets set"}</span>
        {(setup.htfTimeframe || setup.entryTimeframe) && (
          <span className="tj-mono shrink-0 ml-2">{setup.htfTimeframe || "—"} → {setup.entryTimeframe || "—"}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {stats.enough ? (
          <div className="flex items-baseline gap-1.5">
            <span className={`tj-mono text-lg font-bold ${stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{stats.winRate.toFixed(0)}%</span>
            <span className="text-[11px] text-[var(--text-muted)]">win rate · {stats.count} trades</span>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--text-faint)]">{stats.count > 0 ? `${stats.count} trade${stats.count === 1 ? "" : "s"} logged — not enough yet` : "No trades logged yet"}</span>
        )}
        <button onClick={() => onToggleArchive(setup)} title={setup.status === "archived" ? "Restore setup" : "Archive setup"}
          className="text-[var(--text-faint)] hover:text-[var(--accent)] p-1 rounded-md hover:bg-white/5 transition-colors shrink-0">
          {setup.status === "archived" ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </button>
      </div>

      <button onClick={() => onView(setup)} className="flex items-center justify-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors pt-1 border-t border-white/10 -mx-4 -mb-4 px-4 pb-3.5 pt-3">
        View Setup <ArrowLeft size={12} className="rotate-180" />
      </button>
    </Card>
  );
};

/* ============================================================
   SETUP DETAIL DRAWER
   ============================================================ */

const PerfTile = ({ label, value }) => (
  <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
    <div className="tj-mono text-sm font-semibold text-[var(--text-primary)] mt-0.5">{value}</div>
  </div>
);

const SetupDetail = ({ setup, trades, onEdit, onClose }) => {
  const stats = computeSetupStats(setup, trades);
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <DirectionBadge direction={setup.direction} />
        <StatusBadge status={setup.status} />
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        {setup.markets.length ? setup.markets.join(" · ") : "No markets set"}
        {(setup.htfTimeframe || setup.entryTimeframe) && <span className="tj-mono"> · {setup.htfTimeframe || "—"} → {setup.entryTimeframe || "—"}</span>}
      </p>

      {setup.description && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Layers size={12} /> Setup Overview</h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{setup.description}</p>
        </div>
      )}

      {setup.entryRules.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Target size={12} /> Entry Rules</h4>
          <div className="space-y-1.5">
            {setup.entryRules.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{r.text}{r.required && <span className="text-[10px] font-bold text-[var(--accent)] ml-1.5 align-middle">REQUIRED</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {setup.invalidationRules.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Ban size={12} /> Invalidation</h4>
          <div className="space-y-1.5">
            {setup.invalidationRules.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-sm text-rose-300">
                <span className="text-rose-400 mt-0.5">•</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(setup.typicalRiskPct != null || setup.minRR || setup.stopLossMethod || setup.takeProfitMethod || setup.maxEntries != null) && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><ShieldAlert size={12} /> Trade Management</h4>
          <div className="grid grid-cols-2 gap-2">
            {setup.typicalRiskPct != null && <PerfTile label="Typical Risk" value={`${setup.typicalRiskPct}%`} />}
            {setup.minRR && <PerfTile label="Minimum RR" value={setup.minRR} />}
            {setup.stopLossMethod && <PerfTile label="Stop Loss" value={setup.stopLossMethod} />}
            {setup.takeProfitMethod && <PerfTile label="Take Profit" value={setup.takeProfitMethod} />}
            {setup.maxEntries != null && <PerfTile label="Max Entries" value={setup.maxEntries} />}
          </div>
        </div>
      )}

      <div className="mb-5">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><BarChart2 size={12} /> Performance</h4>
        {stats.enough ? (
          <div className="grid grid-cols-2 gap-2">
            <PerfTile label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} />
            <PerfTile label="Trades" value={stats.count} />
            <PerfTile label="Average R" value={stats.avgR != null ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(2)}R` : "—"} />
            <PerfTile label="Profit Factor" value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"} />
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[var(--text-muted)]">
            <Activity size={13} className="shrink-0" />
            Not enough trades yet{stats.count > 0 ? ` (${stats.count} logged, ${MIN_TRADES_FOR_STATS} needed)` : ""}. Log trades against this setup name in the Trade Journal to start tracking performance.
          </div>
        )}
      </div>

      {setup.notes && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><NotebookPen size={12} /> Notes</h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{setup.notes}</p>
        </div>
      )}

      {setup.examples.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Award size={12} /> Examples</h4>
          <div className="grid grid-cols-2 gap-2">
            {setup.examples.map((src, i) => <img key={i} src={src} alt={`example ${i + 1}`} className="rounded-lg border border-white/10 w-full object-cover" />)}
          </div>
        </div>
      )}

      <button onClick={() => { onEdit(setup); onClose(); }} className="w-full flex items-center justify-center gap-1.5 border border-white/10 hover:border-[var(--accent)]/50 hover:text-[var(--accent)] text-[var(--text-secondary)] font-semibold text-sm py-2 rounded-lg transition-all">
        <Pencil size={13} /> Edit Setup
      </button>
    </div>
  );
};

/* ============================================================
   OVERVIEW STRIP
   ============================================================ */

const OverviewStat = ({ label, value, sub }) => (
  <div className="px-4 py-3 md:px-5">
    <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
    <div className="tj-mono text-base font-bold text-[var(--text-primary)] leading-tight mt-0.5">{value}</div>
    {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5 truncate">{sub}</div>}
  </div>
);

const SetupsOverview = ({ setups, trades }) => {
  const summary = useMemo(() => {
    const active = setups.filter((s) => s.status !== "archived");
    const withStats = setups.map((s) => ({ s, stats: computeSetupStats(s, trades) })).filter((x) => x.stats.enough);
    const best = withStats.length ? withStats.reduce((a, b) => (b.stats.winRate > a.stats.winRate ? b : a)) : null;
    const avgWinRate = withStats.length ? withStats.reduce((sum, x) => sum + x.stats.winRate, 0) / withStats.length : null;
    return { total: setups.length, active: active.length, best, avgWinRate };
  }, [setups, trades]);

  return (
    <Card className="divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] grid grid-cols-2 sm:grid-cols-4">
      <OverviewStat label="Total Setups" value={summary.total} />
      <OverviewStat label="Active Setups" value={summary.active} />
      <OverviewStat label="Best Performing" value={summary.best ? summary.best.s.name : "—"} sub={summary.best ? `${summary.best.stats.winRate.toFixed(0)}% win rate` : "Not enough data yet"} />
      <OverviewStat label="Average Win Rate" value={summary.avgWinRate != null ? `${summary.avgWinRate.toFixed(0)}%` : "—"} sub={summary.avgWinRate == null ? "Not enough data yet" : undefined} />
    </Card>
  );
};

/* ============================================================
   FILTERS
   ============================================================ */

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "bullish", label: "Bullish" },
  { id: "bearish", label: "Bearish" },
  { id: "neutral", label: "Neutral" },
];

/* ============================================================
   MAIN PAGE
   ============================================================ */

export const SetupsPage = ({ setups, trades, onCreate, onUpdate, onDelete, onToggleArchive }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const allMarkets = useMemo(() => Array.from(new Set(setups.flatMap((s) => s.markets))).sort(), [setups]);

  const visible = useMemo(() => {
    return setups.filter((s) => {
      if (filter === "active" && s.status !== "active") return false;
      if (filter === "archived" && s.status !== "archived") return false;
      if (["bullish", "bearish", "neutral"].includes(filter) && s.direction !== filter) return false;
      if (market && !s.markets.includes(market)) return false;
      if (search.trim() && !`${s.name} ${s.description}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [setups, filter, search, market]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); setViewing(null); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await (values.id ? onUpdate(values) : onCreate(values));
      setFormOpen(false);
      setEditing(null);
    } catch {
      // toast already shown by App.jsx handlers
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Trading Setups</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Build, organize, and improve your trading setups.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95">
          <Plus size={16} strokeWidth={2.5} /> New Setup
        </button>
      </div>

      {setups.length > 0 && <SetupsOverview setups={setups} trades={trades} />}

      {setups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Crosshair}
            title="Your setups are where your trading rules live."
            sub="Create your first setup to document exactly what you look for before entering a trade."
            action={
              <button onClick={openCreate} className="mt-4 flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2 rounded-lg transition-all active:scale-95">
                <Plus size={15} strokeWidth={2.5} /> Create Your First Setup
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input className={`${inputCls} pl-8`} placeholder="Search setups..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {allMarkets.length > 0 && (
              <select className={`${inputCls} w-auto`} value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="">All markets</option>
                {allMarkets.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_TABS.map((t) => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${filter === t.id ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </Card>

          {visible.length === 0 ? (
            <Card><EmptyState icon={Search} title="No setups match your filters" sub="Try a different search term or clear the filters above." /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((s) => (
                <SetupCard key={s.id} setup={s} trades={trades} onView={setViewing} onEdit={openEdit} onDelete={onDelete} onToggleArchive={onToggleArchive} />
              ))}
            </div>
          )}
        </>
      )}

      <SetupFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleSubmit} initial={editing} saving={saving} />

      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || "Setup"}>
        {viewing && <SetupDetail setup={viewing} trades={trades} onEdit={openEdit} onClose={() => setViewing(null)} />}
      </Drawer>
    </div>
  );
};
