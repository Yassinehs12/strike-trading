import React, { useState, useEffect, useMemo } from "react";
import { Target, Plus, X, Trash2, Pencil, Loader2, CheckCircle2, TrendingUp, Percent, Hash, Flag, AlertTriangle } from "lucide-react";
import { fetchGoals, insertGoal, updateGoalDB, deleteGoalDB } from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{label}</label>
    {children}
  </div>
);

const METRICS = [
  { id: "profit", label: "Net P&L target", icon: TrendingUp, unit: "$", hint: "Sum of trade P&L from the start date onward" },
  { id: "win_rate", label: "Win rate target", icon: Percent, unit: "%", hint: "Win rate across closed trades in the period" },
  { id: "trade_count", label: "Trades logged target", icon: Hash, unit: "trades", hint: "Number of trades logged in the period" },
  { id: "custom", label: "Custom goal", icon: Flag, unit: "", hint: "No auto-tracking — mark complete yourself" },
];

const metricMeta = (id) => METRICS.find((m) => m.id === id) || METRICS[3];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Computes { current, target, pct, isComplete } for a goal from the user's trades.
function computeProgress(goal, trades) {
  const meta = metricMeta(goal.metric);
  if (goal.metric === "custom") {
    return { current: null, target: null, pct: goal.status === "completed" ? 100 : 0, unit: "", isComplete: goal.status === "completed" };
  }
  const inRange = trades.filter((t) => {
    if (goal.startDate && t.date < goal.startDate) return false;
    if (goal.endDate && t.date > goal.endDate) return false;
    return true;
  });
  let current = 0;
  if (goal.metric === "profit") {
    current = inRange.reduce((sum, t) => sum + (t.pnl || 0), 0);
  } else if (goal.metric === "trade_count") {
    current = inRange.length;
  } else if (goal.metric === "win_rate") {
    const closed = inRange.filter((t) => t.status === "Win" || t.status === "Loss");
    current = closed.length ? (closed.filter((t) => t.status === "Win").length / closed.length) * 100 : 0;
  }
  const target = goal.targetValue ?? 0;
  const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
  return { current, target, pct, unit: meta.unit, isComplete: pct >= 100 };
}

function formatValue(metric, value) {
  if (value == null) return "—";
  if (metric === "profit") return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (metric === "win_rate") return `${value.toFixed(0)}%`;
  if (metric === "trade_count") return `${Math.round(value)}`;
  return `${value}`;
}

const GoalForm = ({ initial, onCancel, onSubmit, saving }) => {
  const [title, setTitle] = useState(initial?.title || "");
  const [metric, setMetric] = useState(initial?.metric || "profit");
  const [targetValue, setTargetValue] = useState(initial?.targetValue ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");

  const meta = metricMeta(metric);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Give the goal a title."); return; }
    if (metric !== "custom" && (targetValue === "" || Number(targetValue) <= 0)) {
      setError("Enter a target value greater than 0.");
      return;
    }
    if (endDate && startDate && endDate < startDate) { setError("End date can't be before the start date."); return; }
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
      <Field label="Goal title">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hit +$2,000 this month" maxLength={80} />
      </Field>

      <Field label="Goal type">
        <div className="grid grid-cols-2 gap-2">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const active = metric === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setMetric(m.id)}
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  active ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40" : "bg-white/[0.03] text-[var(--text-tertiary)] border-white/10 hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
                }`}>
                <Icon size={14} /> {m.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{meta.hint}</p>
      </Field>

      {metric !== "custom" && (
        <Field label={`Target ${meta.unit ? `(${meta.unit})` : ""}`}>
          <input type="number" step="any" min="0" className={inputCls} value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)} placeholder={metric === "win_rate" ? "e.g. 55" : metric === "trade_count" ? "e.g. 20" : "e.g. 2000"} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Deadline (optional)">
          <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this goal matters, or how you'll get there" maxLength={280} />
      </Field>

      {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 text-sm font-medium px-3 py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/[0.05] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 text-[var(--text-inverse)] transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? "Save changes" : "Create goal"}
        </button>
      </div>
    </form>
  );
};

const GoalCard = ({ goal, trades, onEdit, onDelete, onToggleComplete, busy }) => {
  const meta = metricMeta(goal.metric);
  const Icon = meta.icon;
  const progress = computeProgress(goal, trades);
  const isDone = goal.status === "completed" || progress.isComplete;
  const isAbandoned = goal.status === "abandoned";

  return (
    <Card className={`p-4 ${isAbandoned ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
            {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{goal.title}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {meta.label}
              {goal.endDate ? ` · by ${new Date(goal.endDate).toLocaleDateString()}` : " · ongoing"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(goal)} disabled={busy} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors disabled:opacity-40">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(goal)} disabled={busy} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {goal.metric === "custom" ? (
        <button onClick={() => onToggleComplete(goal)} disabled={busy || isAbandoned}
          className={`mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
            isDone ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/[0.03] text-[var(--text-tertiary)] border-white/10 hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
          }`}>
          <CheckCircle2 size={13} /> {isDone ? "Marked complete" : "Mark as complete"}
        </button>
      ) : (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="tj-mono text-[var(--text-secondary)] font-semibold">{formatValue(goal.metric, progress.current)}</span>
            <span className="text-[var(--text-muted)]">of {formatValue(goal.metric, progress.target)} target</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-[var(--accent)]"}`} style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {goal.notes && <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">{goal.notes}</p>}
    </Card>
  );
};

export default function GoalsPage({ session, trades, toast }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("active"); // "active" | "completed" | "all"

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchGoals(session.user.id)
      .then(setGoals)
      .catch((err) => setError(err.message || "Failed to load goals."))
      .finally(() => setLoading(false));
  }, [session]);

  const visibleGoals = useMemo(() => {
    return goals.filter((g) => {
      const progress = computeProgress(g, trades);
      const isDone = g.status === "completed" || progress.isComplete;
      if (filter === "active") return !isDone && g.status !== "abandoned";
      if (filter === "completed") return isDone;
      return true;
    });
  }, [goals, trades, filter]);

  const handleCreateOrEdit = async (goalInput) => {
    setSaving(true);
    setError("");
    try {
      if (goalInput.id) {
        const updated = await updateGoalDB(goalInput, session.user.id);
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        notify("Goal updated");
      } else {
        const created = await insertGoal(goalInput, session.user.id);
        setGoals((prev) => [created, ...prev]);
        notify("Goal created");
      }
      setFormOpen(false);
      setEditingGoal(null);
    } catch (err) {
      setError(err.message || "Failed to save goal.");
      notify(err.message || "Failed to save goal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    setBusyId(goal.id);
    try {
      await deleteGoalDB(goal.id);
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      notify("Goal deleted");
    } catch (err) {
      notify(err.message || "Failed to delete goal.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleComplete = async (goal) => {
    setBusyId(goal.id);
    try {
      const updated = await updateGoalDB({ ...goal, status: goal.status === "completed" ? "active" : "completed" }, session.user.id);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (err) {
      notify(err.message || "Failed to update goal.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => { setEditingGoal(null); setFormOpen(true); };
  const openEdit = (goal) => { setEditingGoal(goal); setFormOpen(true); };

  const activeCount = goals.filter((g) => {
    const p = computeProgress(g, trades);
    return g.status !== "abandoned" && g.status !== "completed" && !p.isComplete;
  }).length;
  const completedCount = goals.length - activeCount;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--text-muted)]">Set targets for your trading and track progress automatically from your journal.</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] transition-colors shrink-0">
          <Plus size={15} /> New Goal
        </button>
      </div>

      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
        {[["active", `Active${activeCount ? ` (${activeCount})` : ""}`], ["completed", `Completed${completedCount ? ` (${completedCount})` : ""}`], ["all", "All"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${filter === id ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
      ) : visibleGoals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3 mx-auto">
            <Target size={20} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No goals here yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">Set a profit, win-rate, or trade-count target and Strike Trading will track it against your journal automatically.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} trades={trades} onEdit={openEdit} onDelete={handleDelete} onToggleComplete={handleToggleComplete} busy={busyId === goal.id} />
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--bg-primary)]/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[var(--bg-secondary)] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto tj-scrollbar">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-secondary)] z-10">
              <h3 className="font-bold text-[var(--text-primary)]">{editingGoal ? "Edit Goal" : "New Goal"}</h3>
              <button onClick={() => { setFormOpen(false); setEditingGoal(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5">
              <GoalForm initial={editingGoal} saving={saving} onCancel={() => { setFormOpen(false); setEditingGoal(null); }} onSubmit={handleCreateOrEdit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
