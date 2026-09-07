import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Target, Plus, X, Trash2, Pencil, Loader2, CheckCircle2,
  TrendingUp, Percent, Hash, Flag, AlertTriangle, ChevronDown,
  BarChart2, Clock, Award, Activity, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { fetchGoals, insertGoal, updateGoalDB, deleteGoalDB } from "./db";
import { todayISO } from "./lib/format";

/* ─────────────────────────────────────────────
   DESIGN TOKENS (all consumed from CSS vars)
───────────────────────────────────────────── */
const inputCls =
  "w-full bg-[var(--bg-primary)] border border-[var(--card-border)] focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors";

/* ─────────────────────────────────────────────
   GOAL SCHEMA
───────────────────────────────────────────── */
const METRICS = [
  { id: "profit",      label: "Net P&L",       icon: TrendingUp, unit: "$",      hint: "Sum of trade P&L from the start date onward" },
  { id: "win_rate",    label: "Win rate",       icon: Percent,    unit: "%",      hint: "Win rate across closed trades in the period" },
  { id: "trade_count", label: "Trades logged",  icon: Hash,       unit: "trades", hint: "Number of trades logged in the period" },
  { id: "custom",      label: "Custom",         icon: Flag,       unit: "",       hint: "No auto-tracking — mark complete yourself" },
];
const metricMeta = (id) => METRICS.find((m) => m.id === id) || METRICS[3];

/* ─────────────────────────────────────────────
   DATA COMPUTATION
───────────────────────────────────────────── */
function computeProgress(goal, trades) {
  if (goal.metric === "custom") {
    return { current: null, target: null, pct: goal.status === "completed" ? 100 : 0, unit: "", isComplete: goal.status === "completed" };
  }
  const inRange = trades.filter((t) => {
    if (goal.startDate && t.date < goal.startDate) return false;
    if (goal.endDate   && t.date > goal.endDate)   return false;
    return true;
  });
  let current = 0;
  if (goal.metric === "profit") {
    current = inRange.reduce((s, t) => s + (t.pnl || 0), 0);
  } else if (goal.metric === "trade_count") {
    current = inRange.length;
  } else if (goal.metric === "win_rate") {
    const closed = inRange.filter((t) => t.status === "Win" || t.status === "Loss");
    current = closed.length ? (closed.filter((t) => t.status === "Win").length / closed.length) * 100 : 0;
  }
  const target = goal.targetValue ?? 0;
  const pct    = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
  return { current, target, pct, unit: metricMeta(goal.metric).unit, isComplete: pct >= 100 };
}

function formatValue(metric, value) {
  if (value == null) return "—";
  if (metric === "profit")      return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (metric === "win_rate")    return `${value.toFixed(1)}%`;
  if (metric === "trade_count") return `${Math.round(value)}`;
  return `${value}`;
}

function goalStatus(goal, progress) {
  if (goal.status === "completed" || progress.isComplete) return "completed";
  if (goal.status === "abandoned") return "abandoned";
  if (!goal.endDate) return "active";
  const today     = todayISO();
  const daysLeft  = Math.ceil((new Date(goal.endDate) - new Date(today)) / 86400000);
  if (daysLeft < 0) return "overdue";
  if (progress.pct === 0 && daysLeft <= 3) return "at_risk";
  const totalDays = Math.ceil((new Date(goal.endDate) - new Date(goal.startDate || goal.createdAt)) / 86400000);
  const elapsed   = totalDays - daysLeft;
  const expectedPct = totalDays > 0 ? Math.min(100, (elapsed / totalDays) * 100) : 0;
  if (progress.pct >= expectedPct + 10) return "ahead";
  if (progress.pct < expectedPct - 15)  return "behind";
  return "on_track";
}

function daysLeft(goal) {
  if (!goal.endDate) return null;
  return Math.ceil((new Date(goal.endDate) - new Date(todayISO())) / 86400000);
}

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const STATUS_CFG = {
  completed: { label: "Completed",  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400", Icon: CheckCircle2 },
  ahead:     { label: "Ahead",      color: "bg-sky-500/12 text-sky-400 border-sky-500/25",             dot: "bg-sky-400",     Icon: ArrowUp },
  on_track:  { label: "On track",   color: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25", dot: "bg-[var(--accent)]", Icon: Minus },
  behind:    { label: "Behind",     color: "bg-amber-500/12 text-amber-400 border-amber-500/25",       dot: "bg-amber-400",   Icon: ArrowDown },
  at_risk:   { label: "At risk",    color: "bg-rose-500/12 text-rose-400 border-rose-500/25",          dot: "bg-rose-400",    Icon: AlertTriangle },
  overdue:   { label: "Overdue",    color: "bg-rose-500/15 text-rose-400 border-rose-500/30",          dot: "bg-rose-500",    Icon: AlertTriangle },
  abandoned: { label: "Abandoned",  color: "bg-white/5 text-[var(--text-faint)] border-white/10",     dot: "bg-zinc-600",    Icon: Minus },
  active:    { label: "Active",     color: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25", dot: "bg-[var(--accent)]", Icon: Activity },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.active;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   RADIAL PROGRESS RING
───────────────────────────────────────────── */
const ProgressRing = ({ pct, size = 80, strokeWidth = 7, isDone = false }) => {
  const r   = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-[var(--bg-tertiary)]" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        stroke={isDone ? "#10b981" : "url(#goalGrad)"}
      />
      <defs>
        <linearGradient id="goalGrad" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F7CFF"/>
          <stop offset="55%" stopColor="#A855F7"/>
          <stop offset="100%" stopColor="#F472B6"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

/* ─────────────────────────────────────────────
   SUMMARY STAT CARDS
───────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex flex-col gap-1" style={{ boxShadow: "var(--card-shadow)" }}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      {Icon && <div className="w-6 h-6 rounded-md bg-[var(--accent-soft)] flex items-center justify-center"><Icon size={13} className="text-[var(--accent)]" /></div>}
    </div>
    <div className={`text-2xl font-bold tracking-tight ${accent ? "tj-gradient-text" : "text-[var(--text-primary)]"}`}>{value}</div>
    {sub && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   GOAL CARD
───────────────────────────────────────────── */
const GoalCard = ({ goal, trades, onEdit, onDelete, onToggleComplete, busy }) => {
  const meta     = metricMeta(goal.metric);
  const Icon     = meta.icon;
  const progress = computeProgress(goal, trades);
  const status   = goalStatus(goal, progress);
  const isDone   = status === "completed";
  const days     = daysLeft(goal);
  const [delConfirm, setDelConfirm] = useState(false);

  const handleDelete = () => {
    if (!delConfirm) { setDelConfirm(true); return; }
    onDelete(goal);
  };

  return (
    <div className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 flex flex-col gap-0 hover:border-[var(--accent)]/30 transition-all duration-200"
      style={{ boxShadow: "var(--card-shadow)" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>
            {isDone ? <CheckCircle2 size={17} /> : <Icon size={17} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{goal.title}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(goal)} disabled={busy}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.07] transition-colors disabled:opacity-40">
            <Pencil size={13} />
          </button>
          <button onClick={handleDelete} onBlur={() => setDelConfirm(false)} disabled={busy}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${delConfirm ? "text-rose-400 bg-rose-500/15" : "text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10"}`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : delConfirm ? <AlertTriangle size={13} /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      {goal.metric === "custom" ? (
        <button onClick={() => onToggleComplete(goal)} disabled={busy}
          className={`w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-colors disabled:opacity-40 mb-4 ${
            isDone ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/[0.03] text-[var(--text-tertiary)] border-[var(--card-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
          }`}>
          <CheckCircle2 size={13} /> {isDone ? "Marked complete — undo?" : "Mark as complete"}
        </button>
      ) : (
        <div className="flex items-center gap-4 mb-4">
          {/* Ring */}
          <div className="relative shrink-0">
            <ProgressRing pct={progress.pct} size={72} strokeWidth={6} isDone={isDone} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[11px] font-bold ${isDone ? "text-emerald-400" : "text-[var(--text-primary)]"}`}>
                {progress.pct.toFixed(0)}%
              </span>
            </div>
          </div>
          {/* Values */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {formatValue(goal.metric, progress.current)}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mb-2">of {formatValue(goal.metric, progress.target)} target</div>
            {/* Progress bar */}
            <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-emerald-500" : "tj-gradient-bg"}`}
                style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[var(--text-faint)]">
                {formatValue(goal.metric, progress.target - progress.current > 0 ? progress.target - progress.current : 0)} remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)] mt-auto">
        <StatusBadge status={status} />
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
          <Clock size={10} />
          {days === null
            ? "No deadline"
            : days < 0
              ? `${Math.abs(days)}d overdue`
              : days === 0
                ? "Due today"
                : `${days}d left`}
        </div>
      </div>

      {goal.notes && (
        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed line-clamp-2">{goal.notes}</p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   FORM MODAL
───────────────────────────────────────────── */
const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-[var(--text-faint)] mt-1">{hint}</p>}
  </div>
);

const GoalForm = ({ initial, onCancel, onSubmit, saving }) => {
  const [title, setTitle]       = useState(initial?.title       || "");
  const [metric, setMetric]     = useState(initial?.metric      || "profit");
  const [targetValue, setTV]    = useState(initial?.targetValue ?? "");
  const [startDate, setStart]   = useState(initial?.startDate   || todayISO());
  const [endDate, setEnd]       = useState(initial?.endDate     || "");
  const [notes, setNotes]       = useState(initial?.notes       || "");
  const [error, setError]       = useState("");

  const meta = metricMeta(metric);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Please give the goal a name."); return; }
    if (metric !== "custom" && (targetValue === "" || Number(targetValue) <= 0)) {
      setError("Enter a target value greater than zero."); return;
    }
    if (endDate && startDate && endDate < startDate) { setError("Deadline can't be before the start date."); return; }
    setError("");
    onSubmit({
      id: initial?.id,
      title: title.trim(),
      metric,
      targetValue: metric === "custom" ? null : Number(targetValue),
      startDate,
      endDate: endDate || null,
      notes: notes.trim(),
      status: initial?.status || "active",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Goal name">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hit +$2,000 this month" maxLength={80} autoFocus />
      </Field>

      <Field label="Goal type" hint={meta.hint}>
        <div className="grid grid-cols-2 gap-2">
          {METRICS.map((m) => {
            const MIcon = m.icon;
            const active = metric === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setMetric(m.id)}
                className={`flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 shadow-[0_0_0_1px_var(--accent)/0.15]"
                    : "bg-[var(--bg-primary)] text-[var(--text-tertiary)] border-[var(--card-border)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)]"
                }`}>
                <MIcon size={13} /> {m.label}
              </button>
            );
          })}
        </div>
      </Field>

      {metric !== "custom" && (
        <Field label={`Target ${meta.unit ? `(${meta.unit})` : ""}`}>
          <input type="number" step="any" min="0" className={inputCls} value={targetValue} onChange={(e) => setTV(e.target.value)}
            placeholder={metric === "win_rate" ? "e.g. 55" : metric === "trade_count" ? "e.g. 20" : "e.g. 2000"} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Deadline (optional)">
          <input type="date" className={inputCls} value={endDate} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea className={`${inputCls} resize-none`} rows={2} value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why this goal matters or how you plan to reach it" maxLength={280} />
      </Field>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2.5 mb-4">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-white/[0.05] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl tj-gradient-bg hover:opacity-90 disabled:opacity-50 text-white transition-opacity">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {initial?.id ? "Save changes" : "Create goal"}
        </button>
      </div>
    </form>
  );
};

/* ─────────────────────────────────────────────
   SORT DROPDOWN
───────────────────────────────────────────── */
const SORT_OPTIONS = [
  { id: "created",  label: "Recently created" },
  { id: "deadline", label: "Deadline" },
  { id: "progress", label: "Progress" },
  { id: "target",   label: "Target amount" },
];

const SortDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const label = SORT_OPTIONS.find((o) => o.id === value)?.label || "Sort";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] bg-[var(--card-bg)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] transition-colors">
        {label} <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
          {SORT_OPTIONS.map((o) => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2 transition-colors ${
                value === o.id ? "text-[var(--accent)] bg-[var(--accent-soft)]" : "text-[var(--text-secondary)] hover:bg-white/[0.05]"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
const EmptyState = ({ filter, onNew }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-5">
      <Target size={24} className="text-[var(--accent)]" />
    </div>
    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
      {filter === "completed" ? "No completed goals yet" : filter === "active" ? "No active goals" : "No goals yet"}
    </h3>
    <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
      {filter === "completed"
        ? "Goals you complete will appear here."
        : "Set a profit, win-rate, or trade-count target and StrikeJournal will track it automatically from your journal."}
    </p>
    {filter !== "completed" && (
      <button onClick={onNew}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl tj-gradient-bg text-white hover:opacity-90 transition-opacity">
        <Plus size={15} /> Create your first goal
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function GoalsPage({ session, trades, toast }) {
  const [goals, setGoals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [formOpen, setFormOpen]   = useState(false);
  const [editingGoal, setEditing] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [busyId, setBusy]         = useState(null);
  const [filter, setFilter]       = useState("active");
  const [sort, setSort]           = useState("created");

  const notify = (msg, type) => toast?.(msg, type);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchGoals(session.user.id)
      .then(setGoals)
      .catch((e) => setError(e.message || "Failed to load goals."))
      .finally(() => setLoading(false));
  }, [session]);

  /* ── derived metrics ── */
  const enriched = useMemo(() =>
    goals.map((g) => {
      const progress = computeProgress(g, trades);
      const status   = goalStatus(g, progress);
      return { ...g, progress, status };
    }),
  [goals, trades]);

  const activeGoals    = enriched.filter((g) => g.status !== "completed" && g.status !== "abandoned");
  const completedGoals = enriched.filter((g) => g.status === "completed");

  const overallPct = useMemo(() => {
    const tracked = activeGoals.filter((g) => g.metric !== "custom");
    if (!tracked.length) return 0;
    return tracked.reduce((s, g) => s + g.progress.pct, 0) / tracked.length;
  }, [activeGoals]);

  const totalRemaining = useMemo(() =>
    activeGoals.filter((g) => g.metric === "profit").reduce((s, g) => {
      const rem = (g.progress.target || 0) - (g.progress.current || 0);
      return s + Math.max(0, rem);
    }, 0),
  [activeGoals]);

  /* ── filtered + sorted list ── */
  const visibleGoals = useMemo(() => {
    const base = enriched.filter((g) => {
      if (filter === "active")    return g.status !== "completed" && g.status !== "abandoned";
      if (filter === "completed") return g.status === "completed";
      return true;
    });
    return [...base].sort((a, b) => {
      if (sort === "deadline") {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return a.endDate.localeCompare(b.endDate);
      }
      if (sort === "progress") return b.progress.pct - a.progress.pct;
      if (sort === "target") {
        const at = a.metric !== "custom" ? (a.progress.target || 0) : 0;
        const bt = b.metric !== "custom" ? (b.progress.target || 0) : 0;
        return bt - at;
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // "created"
    });
  }, [enriched, filter, sort]);

  /* ── actions ── */
  const handleSave = async (goalInput) => {
    setSaving(true); setError("");
    try {
      if (goalInput.id) {
        const u = await updateGoalDB(goalInput, session.user.id);
        setGoals((p) => p.map((g) => (g.id === u.id ? u : g)));
        notify("Goal updated");
      } else {
        const c = await insertGoal(goalInput, session.user.id);
        setGoals((p) => [c, ...p]);
        notify("Goal created");
      }
      setFormOpen(false); setEditing(null);
    } catch (e) {
      setError(e.message || "Failed to save goal.");
      notify(e.message || "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (goal) => {
    setBusy(goal.id);
    try {
      await deleteGoalDB(goal.id);
      setGoals((p) => p.filter((g) => g.id !== goal.id));
      notify("Goal deleted");
    } catch (e) { notify(e.message || "Failed to delete.", "error"); }
    finally { setBusy(null); }
  };

  const handleToggleComplete = async (goal) => {
    setBusy(goal.id);
    try {
      const u = await updateGoalDB({ ...goal, status: goal.status === "completed" ? "active" : "completed" }, session.user.id);
      setGoals((p) => p.map((g) => (g.id === u.id ? u : g)));
    } catch (e) { notify(e.message || "Failed to update.", "error"); }
    finally { setBusy(null); }
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (g)  => { setEditing(g);   setFormOpen(true); };

  /* ── tabs ── */
  const TABS = [
    { id: "active",    label: `Active${activeGoals.length ? ` (${activeGoals.length})` : ""}` },
    { id: "completed", label: `Completed${completedGoals.length ? ` (${completedGoals.length})` : ""}` },
    { id: "all",       label: "All" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Goals</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Define measurable trading objectives and track your progress over time.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl tj-gradient-bg text-white hover:opacity-90 active:scale-[0.98] transition-all shrink-0">
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active Goals"     value={activeGoals.length}            sub={`${completedGoals.length} completed`} icon={Target} />
          <StatCard label="Overall Progress" value={`${overallPct.toFixed(0)}%`}   sub="Across active goals" icon={BarChart2} accent />
          <StatCard label="Target Remaining" value={totalRemaining > 0 ? `$${totalRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub="P&L goals only" icon={TrendingUp} />
          <StatCard label="Completed"        value={completedGoals.length}         sub="This period" icon={Award} />
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── TABS + SORT ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl p-1 w-fit">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-all ${
                filter === id
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]"
              }`}>
              {label}
            </button>
          ))}
        </div>
        {visibleGoals.length > 1 && <SortDropdown value={sort} onChange={setSort} />}
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="text-[var(--accent)] animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleGoals.length === 0
            ? <EmptyState filter={filter} onNew={openCreate} />
            : visibleGoals.map((g) => (
                <GoalCard key={g.id} goal={g} trades={trades} onEdit={openEdit}
                  onDelete={handleDelete} onToggleComplete={handleToggleComplete}
                  busy={busyId === g.id} />
              ))
          }
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--bg-primary)]/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setFormOpen(false); setEditing(null); } }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
            style={{ boxShadow: "0 -2px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--card-border)] sticky top-0 bg-[var(--bg-secondary)] z-10">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{editingGoal ? "Edit Goal" : "New Goal"}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {editingGoal ? "Update your goal details." : "Set a target and StrikeJournal tracks it automatically."}
                </p>
              </div>
              <button onClick={() => { setFormOpen(false); setEditing(null); }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.07] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <GoalForm initial={editingGoal} saving={saving}
                onCancel={() => { setFormOpen(false); setEditing(null); }}
                onSubmit={handleSave} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
