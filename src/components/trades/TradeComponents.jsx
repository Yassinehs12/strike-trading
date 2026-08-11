import React, { useState, useEffect } from "react";
import {
  Plus, X, Target, XCircle, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, Trash2, Banknote, Loader2, Upload, Image as ImageIcon, Pencil, Check, ShieldAlert, Star,
} from "lucide-react";
import { submitTradeSpotlight } from "../../db";
import { AssetOptions, Card, Drawer, Field, Modal, StatusPill, useToast } from "../../components/ui/Primitives";
import { ACCOUNT_TYPES, CHECKLIST_ITEMS, EMOTIONS, SESSIONS, SETUP_GRADES, inputCls } from "../../constants";
import { PROP_FIRM_PRESETS, computeChallengeStats } from "../../lib/tradeCalculations";
import { fmtUSD, fmtUSD2, todayISO } from "../../lib/format";

// Formats a trade's outcome as an R-multiple (reward relative to what was
// risked) — e.g. risked $100, made $250 -> "2.5". Sign matches the trade's
// actual direction of profit/loss.
const fmtR = (pnl, riskAmount) => {
  if (!riskAmount || riskAmount <= 0) return "—";
  const r = pnl / riskAmount;
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}`;
};

export const ChecklistToggles = ({ checklist, onChange }) => {
  const c = checklist || { setupConfirmed: false, riskSized: false, newsChecked: false };
  const checkedCount = CHECKLIST_ITEMS.filter((i) => c[i.key]).length;
  return (
    <div className="space-y-1.5">
      {CHECKLIST_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange({ ...c, [item.key]: !c[item.key] })}
          className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
            c[item.key]
              ? "bg-emerald-500/10 border-emerald-500/40"
              : "bg-[var(--bg-primary)] border-white/10 hover:border-white/20"
          }`}
        >
          <span
            className={`mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center border ${
              c[item.key] ? "bg-emerald-500 border-emerald-500" : "border-white/20"
            }`}
          >
            {c[item.key] && <Check size={11} className="text-white" />}
          </span>
          <span>
            <span className={`block text-sm font-medium ${c[item.key] ? "text-emerald-400" : "text-[var(--text-secondary)]"}`}>{item.label}</span>
            <span className="block text-xs text-[var(--text-faint)]">{item.hint}</span>
          </span>
        </button>
      ))}
      {checkedCount < CHECKLIST_ITEMS.length && (
        <p className="text-xs text-amber-400/90 flex items-center gap-1 pt-0.5">
          <AlertTriangle size={11} /> {checkedCount}/{CHECKLIST_ITEMS.length} confirmed — incomplete checklists count against your discipline score
        </p>
      )}
    </div>
  );
};

/* ============================================================
   CREATE CHALLENGE MODAL
   ============================================================ */


export const CreateChallengeModal = ({ open, onClose, onCreate }) => {
  const [form, setForm] = useState({ firm: "", phase: "Phase 1", accountSize: "", profitTargetPct: "", maxDailyLossPct: "", maxTotalLossPct: "", minTradingDays: "10", profitSplitPct: "80" });
  const [errors, setErrors] = useState({});
  const [presetKey, setPresetKey] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isLive = form.phase === "Live";

  const applyPreset = (key, phase) => {
    const preset = PROP_FIRM_PRESETS[key];
    if (!preset) return;
    const vals = preset.phases[phase] || preset.phases["Phase 1"];
    setForm((f) => ({
      ...f,
      firm: preset.label,
      profitTargetPct: vals.profitTargetPct != null ? String(vals.profitTargetPct) : f.profitTargetPct,
      maxDailyLossPct: vals.maxDailyLossPct != null ? String(vals.maxDailyLossPct) : f.maxDailyLossPct,
      maxTotalLossPct: vals.maxTotalLossPct != null ? String(vals.maxTotalLossPct) : f.maxTotalLossPct,
      minTradingDays: vals.minTradingDays != null ? String(vals.minTradingDays) : f.minTradingDays,
      profitSplitPct: vals.profitSplitPct != null ? String(vals.profitSplitPct) : f.profitSplitPct,
    }));
  };

  const onPresetChange = (key) => {
    setPresetKey(key);
    if (key) applyPreset(key, form.phase);
  };

  const onPhaseChange = (p) => {
    set("phase", p);
    if (presetKey) applyPreset(presetKey, p);
  };

  const submit = () => {
    const errs = {};
    if (!presetKey) errs.preset = "Select a prop firm";
    ["accountSize", "maxDailyLossPct", "maxTotalLossPct"].forEach((k) => {
      if (!form[k] || Number(form[k]) <= 0) errs[k] = "Enter a valid positive number";
    });
    if (!isLive && (!form.profitTargetPct || Number(form.profitTargetPct) <= 0)) errs.profitTargetPct = "Enter a valid positive number";
    if (isLive && (!form.profitSplitPct || Number(form.profitSplitPct) <= 0 || Number(form.profitSplitPct) > 100)) errs.profitSplitPct = "Enter a split between 1-100";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onCreate({
      id: Date.now(), firm: form.firm, phase: isLive ? "Funded" : form.phase, stage: isLive ? "funded" : "evaluation",
      accountSize: Number(form.accountSize), profitTargetPct: Number(form.profitTargetPct || 0),
      maxDailyLossPct: Number(form.maxDailyLossPct), maxTotalLossPct: Number(form.maxTotalLossPct),
      minTradingDays: Number(form.minTradingDays) || 10, startDate: "2026-07-10",
      ...(isLive ? { profitSplitPct: Number(form.profitSplitPct), lastPayoutNetProfit: 0, payoutHistory: [] } : {}),
    });
    setForm({ firm: "", phase: "Phase 1", accountSize: "", profitTargetPct: "", maxDailyLossPct: "", maxTotalLossPct: "", minTradingDays: "10", profitSplitPct: "80" });
    setPresetKey("");
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Challenge" wide>
      <Field label="Prop Firm" error={errors.preset}>
        <select className={inputCls} value={presetKey} onChange={(e) => onPresetChange(e.target.value)}>
          <option value="">Select a prop firm...</option>
          <optgroup label="Futures">
            {Object.entries(PROP_FIRM_PRESETS).filter(([, p]) => p.market === "futures").map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
          </optgroup>
          <optgroup label="CFDs">
            {Object.entries(PROP_FIRM_PRESETS).filter(([, p]) => p.market === "cfd").map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
          </optgroup>
        </select>
        {presetKey && <p className="text-xs text-[var(--text-faint)] mt-1.5">Rules auto-filled for {PROP_FIRM_PRESETS[presetKey].label} — approximate, always double-check against the firm's current terms before relying on them.</p>}
      </Field>
      <Field label="Phase">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {["Phase 1", "Phase 2", "Live"].map((p) => (
            <button key={p} type="button" onClick={() => onPhaseChange(p)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${form.phase === p ? (p === "Live" ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--accent)]/20 text-[var(--accent)]") : "bg-[var(--bg-primary)] text-[var(--text-muted)]"}`}>
              {p}
            </button>
          ))}
        </div>
        {isLive && <p className="text-xs text-[var(--text-muted)] mt-1.5">Already funded and trading live? This skips straight to payout tracking below.</p>}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Account Size ($)" error={errors.accountSize}><input type="number" className={inputCls} placeholder="100000" value={form.accountSize} onChange={(e) => set("accountSize", e.target.value)} /></Field>
        {!isLive && (
          <Field label="Profit Target (%)" error={errors.profitTargetPct}><input type="number" className={inputCls} placeholder="10" value={form.profitTargetPct} onChange={(e) => set("profitTargetPct", e.target.value)} /></Field>
        )}
        <Field label="Max Daily Loss (%)" error={errors.maxDailyLossPct}><input type="number" className={inputCls} placeholder="5" value={form.maxDailyLossPct} onChange={(e) => set("maxDailyLossPct", e.target.value)} /></Field>
        <Field label="Max Total Loss (%)" error={errors.maxTotalLossPct}><input type="number" className={inputCls} placeholder="10" value={form.maxTotalLossPct} onChange={(e) => set("maxTotalLossPct", e.target.value)} /></Field>
        {!isLive && (
          <Field label="Min Trading Days"><input type="number" className={inputCls} placeholder="10" value={form.minTradingDays} onChange={(e) => set("minTradingDays", e.target.value)} /></Field>
        )}
      </div>

      {isLive && (
        <div className="mt-2 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3"><Banknote size={14} className="text-emerald-400" /><h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Payout Tracker</h4></div>
          <Field label="Profit Split (%)" error={errors.profitSplitPct}>
            <input type="number" className={inputCls} placeholder="80" value={form.profitSplitPct} onChange={(e) => set("profitSplitPct", e.target.value)} />
          </Field>
          <p className="text-xs text-[var(--text-faint)] -mt-2">The percentage of net profit you keep from each payout. You can request payouts and see your history from the challenge card once it's created.</p>
        </div>
      )}

      <button onClick={submit} className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Create Challenge</button>
    </Modal>
  );
};

/* ============================================================
   LOG TRADE MODAL
   ============================================================ */


export const LogTradeModal = ({ open, onClose, onCreate, challenges, accounts = [] }) => {
  const blank = () => ({ date: todayISO(), asset: "", direction: "Long", entry: "", exit: "", lots: "", fees: "", setup: "", setupGrade: "A", emotion: "Neutral", session: "London", status: "Win", holdingMinutes: "", notes: "", challengeId: "", accountId: "", screenshot: null, pnl: "", riskAmount: "", checklist: { setupConfirmed: false, riskSized: false, newsChecked: false } });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("screenshot", reader.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const errs = {};
    if (!form.asset.trim()) errs.asset = "Asset/pair is required";
    if (!form.entry || Number(form.entry) <= 0) errs.entry = "Enter entry price";
    if (!form.exit || Number(form.exit) <= 0) errs.exit = "Enter exit price";
    if (!form.lots || Number(form.lots) <= 0) errs.lots = "Enter lot size";
    if (form.pnl === "" || isNaN(Number(form.pnl))) errs.pnl = "Enter the trade's P&L";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const entry = Number(form.entry), exit = Number(form.exit), lots = Number(form.lots);
    const pnl = +Number(form.pnl).toFixed(2);

    onCreate({
      id: Date.now(), date: form.date, asset: form.asset.toUpperCase(), direction: form.direction,
      entry, exit, lots, fees: Number(form.fees || 0), setup: form.setup, setupGrade: form.setupGrade, session: form.session,
      status: form.status, pnl, holdingMinutes: Number(form.holdingMinutes || 0), emotion: form.emotion,
      challengeId: form.challengeId || null, accountId: form.accountId || null, notes: form.notes, screenshot: form.screenshot,
      riskAmount: form.riskAmount === "" ? null : Number(form.riskAmount),
      checklist: form.checklist,
    });
    setForm(blank);
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a Trade" wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date / Time"><input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Asset / Pair" error={errors.asset}>
          <select className={inputCls} value={form.asset} onChange={(e) => set("asset", e.target.value)}>
            <option value="">Select a pair...</option>
            <AssetOptions />
          </select>
        </Field>
        <Field label="Direction">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {["Long", "Short"].map((d) => (
              <button key={d} type="button" onClick={() => set("direction", d)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.direction === d ? (d === "Long" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400") : "bg-[var(--bg-primary)] text-[var(--text-muted)]"}`}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Win</option><option>Loss</option><option>BE</option></select>
        </Field>
        <Field label="Entry Price" error={errors.entry}><input type="number" step="any" className={inputCls} value={form.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
        <Field label="Exit Price" error={errors.exit}><input type="number" step="any" className={inputCls} value={form.exit} onChange={(e) => set("exit", e.target.value)} /></Field>
        <Field label="Lot Size / Contracts" error={errors.lots}><input type="number" step="any" className={inputCls} value={form.lots} onChange={(e) => set("lots", e.target.value)} /></Field>
        <Field label="P&L ($)" error={errors.pnl}><input type="number" step="any" className={inputCls} placeholder="e.g. 240 or -85" value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></Field>
        <Field label="Risk Amount ($)" hint={form.riskAmount && form.pnl !== "" ? `= ${fmtR(Number(form.pnl), Number(form.riskAmount))}R` : "How much you risked if the stop was hit"}>
          <input type="number" step="any" className={inputCls} placeholder="e.g. 100" value={form.riskAmount} onChange={(e) => set("riskAmount", e.target.value)} />
        </Field>
        <Field label="Fees / Commissions"><input type="number" step="any" className={inputCls} placeholder="0" value={form.fees} onChange={(e) => set("fees", e.target.value)} /></Field>
        <Field label="Setup / Strategy">
          <input className={inputCls} placeholder="e.g. Breakout, FVG, Trend Following — your own note" value={form.setup} onChange={(e) => set("setup", e.target.value)} />
        </Field>
        <Field label="Setup Quality">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {SETUP_GRADES.map((g) => (
              <button key={g} type="button" onClick={() => set("setupGrade", g)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.setupGrade === g ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Session">
          <select className={inputCls} value={form.session} onChange={(e) => set("session", e.target.value)}>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Holding Time (minutes)"><input type="number" className={inputCls} placeholder="45" value={form.holdingMinutes} onChange={(e) => set("holdingMinutes", e.target.value)} /></Field>
      </div>
      <Field label="Pre-Trade Checklist">
        <ChecklistToggles checklist={form.checklist} onChange={(c) => set("checklist", c)} />
      </Field>
      <Field label="Link to Challenge (optional)">
        <select className={inputCls} value={form.challengeId} onChange={(e) => set("challengeId", e.target.value)}>
          <option value="">Journal only — no challenge</option>
          {challenges.map((c) => <option key={c.id} value={c.id}>{c.firm} — {c.phase}</option>)}
        </select>
      </Field>
      <Field label="Account (optional)">
        <select className={inputCls} value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>
          <option value="">No account assigned</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Chart Screenshot (optional)">
        <label className="flex items-center gap-2 justify-center border border-dashed border-[var(--border-secondary)] rounded-lg py-3 text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/50 hover:text-[var(--text-secondary)] transition-colors">
          <Upload size={14} /> {form.screenshot ? "Replace image" : "Upload chart screenshot"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {form.screenshot && <img src={form.screenshot} alt="preview" className="mt-2 rounded-lg border border-white/10 max-h-32 object-cover" />}
      </Field>
      <Field label="Emotion Behind the Trade">
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map((e) => (
            <button key={e} type="button" onClick={() => set("emotion", e)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${form.emotion === e
                ? (e === "Neutral" ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40" : "bg-amber-500/15 text-amber-400 border-amber-500/40")
                : "bg-[var(--bg-primary)] text-[var(--text-muted)] border-white/10 hover:text-[var(--text-secondary)]"}`}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Trading Psychology Notes">
        <textarea rows={3} className={inputCls} placeholder="How did you feel? Did you follow your plan?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <button onClick={submit} className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Save Trade</button>
    </Modal>
  );
};

/* ============================================================
   TRADE DETAIL / EDIT DRAWER
   ============================================================ */


export const TradeDrawer = ({ trade, onClose, onSave, onDelete, session, profile, addToast }) => {
  const [form, setForm] = useState(trade);
  const [editing, setEditing] = useState(false);
  const [submittingSpotlight, setSubmittingSpotlight] = useState(false);
  useEffect(() => {
    setForm(trade ? { checklist: { setupConfirmed: false, riskSized: false, newsChecked: false }, ...trade } : trade);
    setEditing(false);
    setSubmittingSpotlight(false);
  }, [trade]);
  if (!trade) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submitSpotlight = async () => {
    if (!session?.user?.id) return;
    setSubmittingSpotlight(true);
    try {
      await submitTradeSpotlight(trade, session.user.id, profile?.username || "Trader");
      addToast?.("Submitted — an admin will review it for the weekly spotlight");
    } catch (err) {
      addToast?.(err.message || "Failed to submit trade", "error");
    } finally {
      setSubmittingSpotlight(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("screenshot", reader.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    const entry = Number(form.entry), exit = Number(form.exit), lots = Number(form.lots);
    const pnl = +Number(form.pnl).toFixed(2);
    onSave({ ...form, entry, exit, lots, fees: Number(form.fees), pnl });
    setEditing(false);
  };

  return (
    <Drawer open={!!trade} onClose={onClose} title={editing ? "Edit Trade" : `${trade.asset} · ${trade.date}`}>
      {!editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={trade.status} />
              <span className={`flex items-center gap-1 text-xs font-semibold ${trade.direction === "Long" ? "text-emerald-400" : "text-rose-400"}`}>
                {trade.direction === "Long" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trade.direction}
              </span>
              {trade.setupGrade && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">{trade.setupGrade}</span>
              )}
              {trade.emotion && trade.emotion !== "Neutral" && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">{trade.emotion}</span>
              )}
              {trade.checklist && (() => {
                const n = CHECKLIST_ITEMS.filter((i) => trade.checklist[i.key]).length;
                const complete = n === CHECKLIST_ITEMS.length;
                return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${complete ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-[var(--text-tertiary)] border-white/10"}`}>
                    Checklist {n}/{CHECKLIST_ITEMS.length}
                  </span>
                );
              })()}
            </div>
            <div className="text-right">
              <span className={`tj-mono text-lg font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{trade.pnl >= 0 ? "+" : ""}{fmtUSD2(trade.pnl)}</span>
              {trade.riskAmount > 0 && (
                <div className="text-xs text-[var(--text-faint)] tj-mono">risked {fmtUSD2(trade.riskAmount)} · {fmtR(trade.pnl, trade.riskAmount)}R</div>
              )}
            </div>
          </div>

          {trade.screenshot && <img src={trade.screenshot} alt="chart" className="w-full rounded-lg border border-white/10" />}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Entry", trade.entry], ["Exit", trade.exit], ["Lots", trade.lots], ["Fees", fmtUSD2(trade.fees)],
              ["Setup", trade.setup], ["Session", trade.session], ["Holding", `${trade.holdingMinutes || 0} min`], ["Date", trade.date]].map(([k, v]) => (
              <div key={k} className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2">
                <div className="text-xs text-[var(--text-muted)]">{k}</div>
                <div className="tj-mono text-sm text-[var(--text-primary)] font-medium">{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">Trading Psychology Notes</div>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5 leading-relaxed">{trade.notes || "—"}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-white text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => onDelete(trade.id)} className="flex items-center justify-center gap-1.5 border border-rose-900 text-rose-400 hover:bg-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <button onClick={submitSpotlight} disabled={submittingSpotlight}
            className="w-full flex items-center justify-center gap-1.5 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50 font-semibold text-sm py-2.5 rounded-lg transition-all">
            {submittingSpotlight ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />} Submit for Trade of the Week
          </button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Asset">
              <select className={inputCls} value={form.asset} onChange={(e) => set("asset", e.target.value)}>
                <AssetOptions />
              </select>
            </Field>
            <Field label="Direction">
              <select className={inputCls} value={form.direction} onChange={(e) => set("direction", e.target.value)}><option>Long</option><option>Short</option></select>
            </Field>
            <Field label="Entry"><input type="number" step="any" className={inputCls} value={form.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
            <Field label="Exit"><input type="number" step="any" className={inputCls} value={form.exit} onChange={(e) => set("exit", e.target.value)} /></Field>
            <Field label="Lots"><input type="number" step="any" className={inputCls} value={form.lots} onChange={(e) => set("lots", e.target.value)} /></Field>
            <Field label="P&L ($)"><input type="number" step="any" className={inputCls} value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></Field>
            <Field label="Risk Amount ($)"><input type="number" step="any" className={inputCls} placeholder="e.g. 100" value={form.riskAmount ?? ""} onChange={(e) => set("riskAmount", e.target.value)} /></Field>
            <Field label="Fees"><input type="number" step="any" className={inputCls} value={form.fees} onChange={(e) => set("fees", e.target.value)} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Win</option><option>Loss</option><option>BE</option></select>
            </Field>
            <Field label="Holding (min)"><input type="number" className={inputCls} value={form.holdingMinutes} onChange={(e) => set("holdingMinutes", e.target.value)} /></Field>
          </div>
          <Field label="Setup Quality">
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {SETUP_GRADES.map((g) => (
                <button key={g} type="button" onClick={() => set("setupGrade", g)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.setupGrade === g ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Emotion Behind the Trade">
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <button key={e} type="button" onClick={() => set("emotion", e)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${form.emotion === e
                    ? (e === "Neutral" ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40" : "bg-amber-500/15 text-amber-400 border-amber-500/40")
                    : "bg-[var(--bg-primary)] text-[var(--text-muted)] border-white/10 hover:text-[var(--text-secondary)]"}`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Pre-Trade Checklist">
            <ChecklistToggles checklist={form.checklist} onChange={(c) => set("checklist", c)} />
          </Field>
          <Field label="Chart Screenshot">
            <label className="flex items-center gap-2 justify-center border border-dashed border-[var(--border-secondary)] rounded-lg py-3 text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/50 hover:text-[var(--text-secondary)] transition-colors">
              <ImageIcon size={14} /> {form.screenshot ? "Replace image" : "Upload chart screenshot"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {form.screenshot && <img src={form.screenshot} alt="preview" className="mt-2 rounded-lg border border-white/10 max-h-32 object-cover" />}
          </Field>
          <Field label="Notes"><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Save Changes</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */


export const RuleViolationAlerts = ({ challenges, trades }) => {
  const alerts = [];
  challenges.forEach((c) => {
    const s = computeChallengeStats(c, trades);
    if (s.status === "Failed") {
      alerts.push({
        id: `${c.id}-failed`,
        level: "critical",
        title: `${c.firm} — ${s.dailyLossBreached ? "daily loss limit breached" : "max drawdown breached"}`,
        text: s.dailyLossBreached
          ? `Worst logged day lost ${fmtUSD(Math.abs(s.worstDay))}, past the ${fmtUSD(s.dailyLossLimit)} daily limit.`
          : `Balance fell to ${fmtUSD(s.currentBalance)}, at or past the ${fmtUSD(s.floorBalance)} floor.`,
      });
      return; // don't also show "approaching" warnings for an already-failed challenge
    }
    if (s.status === "Passed" || s.status === "Funded") return;
    if (s.dailyLossUsed >= 80) {
      alerts.push({
        id: `${c.id}-daily`,
        level: "warning",
        title: `${c.firm} — approaching daily loss limit`,
        text: `Worst logged day has used ${Math.round(s.dailyLossUsed)}% of your ${fmtUSD(s.dailyLossLimit)} daily loss limit.`,
      });
    }
    if (s.totalDrawdownUsed >= 80) {
      alerts.push({
        id: `${c.id}-total`,
        level: "warning",
        title: `${c.firm} — approaching max drawdown`,
        text: `You've used ${Math.round(s.totalDrawdownUsed)}% of your total drawdown allowance (floor ${fmtUSD(s.floorBalance)}).`,
      });
    }
  });

  if (!alerts.length) return null;

  const hasCritical = alerts.some((a) => a.level === "critical");

  return (
    <Card className={`p-4 md:p-5 border-l-4 ${hasCritical ? "border-l-rose-500" : "border-l-amber-500"}`}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={16} className={hasCritical ? "text-rose-400" : "text-amber-400"} />
        <h3 className="font-bold text-[var(--text-primary)] text-sm">Rule Violation Alerts</h3>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              a.level === "critical" ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            {a.level === "critical"
              ? <XCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              : <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />}
            <div>
              <div className={`text-sm font-semibold ${a.level === "critical" ? "text-rose-400" : "text-amber-400"}`}>{a.title}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{a.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};


export const AddAccountModal = ({ open, onClose, onSave, editing }) => {
  const blank = () => ({ name: "", broker: "", accountType: "live", startingBalance: "" });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm(editing ? { name: editing.name, broker: editing.broker || "", accountType: editing.accountType, startingBalance: editing.startingBalance ?? "" } : blank());
    setError("");
  }, [open, editing]);

  const submit = async () => {
    if (!form.name.trim()) { setError("Give this account a name."); return; }
    setSaving(true);
    const result = await onSave(form);
    setSaving(false);
    if (result?.limitReached) { setError("Account limit reached for your current plan."); return; }
    if (!result?.error) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Account" : "Add Trading Account"}>
      <div className="space-y-4">
        <Field label="Account Name" error={error}>
          <input className={inputCls} placeholder="e.g. FTMO Live, Personal MT5" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Broker / Firm (optional)">
          <input className={inputCls} placeholder="e.g. FTMO, IC Markets" value={form.broker} onChange={(e) => set("broker", e.target.value)} />
        </Field>
        <Field label="Account Type">
          <select className={inputCls} value={form.accountType} onChange={(e) => set("accountType", e.target.value)}>
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Starting Balance (optional)">
          <input type="number" className={inputCls} placeholder="10000" value={form.startingBalance} onChange={(e) => set("startingBalance", e.target.value)} />
        </Field>
        <button onClick={submit} disabled={saving} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60 text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {editing ? "Save Changes" : "Add Account"}
        </button>
      </div>
    </Modal>
  );
};


export const AccountsBar = ({ accounts, selectedId, onSelect, onAdd, onEdit, onRemove, limit }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const toast = useToast();

  const openAdd = () => {
    if (accounts.length >= limit) {
      toast(`You've reached the ${limit}-account limit on your current plan.`, "error");
      return;
    }
    setEditingAccount(null);
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    if (editingAccount) { await onEdit(editingAccount.id, form); return {}; }
    return await onAdd(form);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          selectedId === null ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)]" : "border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20"
        }`}
      >
        All Accounts
      </button>
      {accounts.map((a) => (
        <div key={a.id} className="group relative">
          <button
            onClick={() => onSelect(a.id)}
            className={`pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              selectedId === a.id ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)]" : "border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20"
            }`}
          >
            <Wallet size={11} /> {a.name}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(a.id); if (selectedId === a.id) onSelect(null); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-current hover:text-rose-400 transition-opacity"
            aria-label={`Remove ${a.name}`}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={openAdd}
        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-white/15 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors flex items-center gap-1"
      >
        <Plus size={11} /> Add Account
        <span className="text-[var(--text-faint)]">({accounts.length}/{limit === Infinity ? "∞" : limit})</span>
      </button>

      <AddAccountModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editing={editingAccount} />
    </div>
  );
};
