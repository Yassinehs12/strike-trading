import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, Save, CheckCircle2, Check, X, Pencil, ClipboardCheck, Activity,
  Crosshair, Brain, Target, TrendingUp, TrendingDown, Minus, AlertTriangle, CalendarDays, Clock,
  Percent, Hash, ShieldAlert, Layers, RotateCcw,
} from "lucide-react";
import { fetchDailyReview, fetchDailyReviewIndex, upsertDailyReview } from "./db";
import { todayISO, shiftDateStr } from "./lib/format";
import { Card, EmptyState, Skeleton } from "./components/ui/Primitives";
import {
  MARKET_STRUCTURES, MARKET_BIASES, EXECUTION_QUESTIONS, EMOTION_OPTIONS,
  computeDayStats, sectionStatus, getMissing, progressCount, serializeForm, formFromReview,
} from "./lib/dailyReview";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors resize-none";
const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50";

const fmtSigned = (n) => `${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtMoney = (n) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const longDate = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

/* ---------- local backup: keeps unsaved edits safe if the tab closes or the user navigates away ---------- */
const backupKey = (userId, date) => `strike:dailyReviewBackup:${userId}:${date}`;
const readBackup = (userId, date) => {
  try {
    const raw = localStorage.getItem(backupKey(userId, date));
    return raw ? formFromReview(JSON.parse(raw)) : null;
  } catch { return null; }
};
const writeBackup = (userId, date, form) => { try { localStorage.setItem(backupKey(userId, date), JSON.stringify(form)); } catch { /* storage unavailable — non-fatal */ } };
const clearBackup = (userId, date) => { try { localStorage.removeItem(backupKey(userId, date)); } catch { /* non-fatal */ } };

/* ---------- small controls ---------- */
const Chip = ({ selected, onClick, tone = "neutral", icon: Icon, children }) => {
  const selectedCls = {
    positive: "bg-emerald-400/15 border-emerald-400/40 text-emerald-300",
    negative: "bg-rose-400/15 border-rose-400/40 text-rose-300",
    neutral: "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)]",
  }[tone];
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${focusRing} ${
        selected ? selectedCls : "bg-white/[0.03] border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/25"
      }`}>
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
};

// Yes / No segmented control. `good` colours the chosen answer by whether it
// reflects good process, so "No" on "Did I overtrade?" reads green, not red.
// good === null means a neutral question (accent colour).
const YesNo = ({ value, onChange, good = null, label }) => {
  const color = (answer) => {
    if (good === null) return "bg-[var(--accent)] text-[var(--text-inverse)] border-[var(--accent)]";
    return answer === good ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500";
  };
  return (
    <div className="inline-flex rounded-lg border border-white/10 overflow-hidden shrink-0" role="radiogroup" aria-label={label}>
      {[true, false].map((answer) => (
        <button key={String(answer)} type="button" role="radio" aria-checked={value === answer}
          onClick={() => onChange(value === answer ? null : answer)}
          className={`min-w-[52px] h-9 px-3 text-xs font-semibold border-l first:border-l-0 border-white/10 transition-colors ${focusRing} ${
            value === answer ? color(answer) : "bg-white/[0.03] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]"
          }`}>
          {answer ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
};

// 1–10 tap scale. Tap the selected number again to clear it.
const RatingScale = ({ value, onChange, label }) => (
  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5" role="radiogroup" aria-label={`${label}, 1 to 10`}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
      const selected = value === n;
      const filled = value != null && n < value;
      return (
        <button key={n} type="button" role="radio" aria-checked={selected} aria-label={`${label}: ${n}`}
          onClick={() => onChange(selected ? null : n)}
          className={`h-10 sm:h-9 rounded-md border tj-mono text-xs font-semibold transition-all active:scale-95 ${focusRing} ${
            selected ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)] shadow-sm"
              : filled ? "bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--text-primary)]"
              : "bg-white/[0.03] border-white/10 text-[var(--text-muted)] hover:border-white/25 hover:text-[var(--text-primary)]"
          }`}>
          {n}
        </button>
      );
    })}
  </div>
);

const RatingRow = ({ label, value, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium text-[var(--text-tertiary)]">{label}</span>
      <span className="tj-mono text-xs font-bold text-[var(--text-primary)]">{value ? `${value}/10` : <span className="text-[var(--text-faint)]">—</span>}</span>
    </div>
    <RatingScale value={value} onChange={onChange} label={label} />
  </div>
);

const SectionCard = ({ id, icon: Icon, title, subtitle, done, required, invalid, children, className = "" }) => (
  <div id={`dr-${id}`} className={`scroll-mt-24 ${className}`}>
    <Card className={`p-5 h-full transition-colors ${invalid ? "!border-rose-500/50" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
            <Icon size={14} className="text-[var(--accent)]" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              {title}
              {required && !done && <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-faint)] border border-white/10 rounded px-1.5 py-0.5">Required</span>}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{subtitle}</p>
          </div>
        </div>
        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
          done ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400" : "border-white/10 text-transparent"
        }`} aria-label={done ? "Section complete" : "Section incomplete"}>
          <Check size={11} />
        </span>
      </div>
      {children}
    </Card>
  </div>
);

const Label = ({ children }) => <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">{children}</div>;

/* ---------- day overview ---------- */
const OverviewMetric = ({ icon: Icon, label, value, accent, sub }) => (
  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3.5 py-3 min-w-0">
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1"><Icon size={12} /> {label}</div>
    <div className={`tj-mono text-lg font-bold truncate ${accent || "text-[var(--text-primary)]"}`}>{value}</div>
    {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5 truncate">{sub}</div>}
  </div>
);

const DayOverview = ({ stats, date }) => {
  if (stats.tradeCount === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center"><CalendarDays size={16} className="text-[var(--text-muted)]" /></span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No trades logged for this day</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
              You can still review it — sitting out is a decision too. If you did trade, log it in the Trade Journal and it will show up here automatically{date === todayISO() ? "" : " for this date"}.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  const pnlAccent = stats.netPnl > 0 ? "text-emerald-400" : stats.netPnl < 0 ? "text-rose-400" : "text-[var(--text-primary)]";
  return (
    <Card className="p-5">
      <div className="flex flex-col lg:flex-row lg:items-end gap-5">
        <div className="shrink-0">
          <div className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide">Total P&L</div>
          <div className={`tj-mono text-[34px] md:text-[40px] font-bold leading-tight mt-1 ${pnlAccent}`}>{fmtSigned(stats.netPnl)}</div>
          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">After fees</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 flex-1">
          <OverviewMetric icon={Hash} label="Trades" value={stats.tradeCount} sub={stats.breakeven ? `${stats.breakeven} breakeven` : undefined} />
          <OverviewMetric icon={TrendingUp} label="Winners" value={stats.wins} accent="text-emerald-400" />
          <OverviewMetric icon={TrendingDown} label="Losers" value={stats.losses} accent="text-rose-400" />
          <OverviewMetric icon={Percent} label="Win rate" value={stats.winRate == null ? "—" : `${Math.round(stats.winRate)}%`} />
          <OverviewMetric icon={ShieldAlert} label="Total risk" value={stats.totalRisk == null ? "—" : fmtMoney(stats.totalRisk)}
            sub={stats.totalRisk == null ? "No risk logged" : stats.riskLoggedCount < stats.tradeCount ? `${stats.riskLoggedCount} of ${stats.tradeCount} trades` : undefined} />
        </div>
      </div>
      {stats.sessions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><Layers size={12} /> Session{stats.sessions.length === 1 ? "" : "s"}</span>
          {stats.sessions.map((s) => (
            <span key={s} className="text-[11px] font-semibold text-[var(--text-secondary)] bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-0.5">{s}</span>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ---------- 7-day strip ---------- */
const DayStrip = ({ selected, today, index, tradeDates, onSelect }) => {
  const end = (() => { const e = shiftDateStr(selected, 3); return e > today ? today : e; })();
  const days = Array.from({ length: 7 }, (_, i) => shiftDateStr(end, i - 6));
  const status = Object.fromEntries(index.map((r) => [r.reviewDate, r.status]));
  return (
    <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Recent days">
      {days.map((d) => {
        const dt = new Date(d + "T00:00:00");
        const st = status[d];
        const isSel = d === selected;
        return (
          <button key={d} type="button" onClick={() => onSelect(d)} aria-current={isSel ? "date" : undefined}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors ${focusRing} ${
              isSel ? "bg-[var(--accent)]/10 border-[var(--accent)]/40" : "bg-white/[0.02] border-white/[0.06] hover:border-white/20"
            }`}>
            <span className="text-[10px] font-medium text-[var(--text-faint)] uppercase">{dt.toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className={`tj-mono text-sm font-bold ${isSel ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>{dt.getDate()}</span>
            <span className="h-4 flex items-center gap-1">
              {st === "completed" ? <CheckCircle2 size={12} className="text-emerald-400" aria-label="Reviewed" />
                : st === "draft" ? <Clock size={12} className="text-amber-400" aria-label="Draft" />
                : <span className="w-1.5 h-1.5 rounded-full border border-white/20" aria-label="Not reviewed" />}
              {tradeDates.has(d) && <span className="w-1 h-1 rounded-full bg-[var(--accent)]" aria-label="Has trades" />}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ---------- read-only summary of a completed review ---------- */
const SummaryBlock = ({ title, children }) => (
  <div>
    <Label>{title}</Label>
    {children}
  </div>
);

const ReviewSummary = ({ form, review, onEdit }) => {
  const notes = (text) => text ? <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap mt-2">{text}</p> : null;
  const ScoreTile = ({ label, value }) => (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
      <div className="tj-mono text-xl font-bold text-[var(--text-primary)]">{value ?? "—"}<span className="text-xs text-[var(--text-faint)]">{value ? "/10" : ""}</span></div>
      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
  return (
    <div className="space-y-4 tj-animate-in">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-400" /></span>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">This day has been reviewed</div>
              {review.completedAt && <div className="text-xs text-[var(--text-muted)]">Completed {new Date(review.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>}
            </div>
          </div>
          <button onClick={onEdit}
            className={`flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors ${focusRing}`}>
            <Pencil size={14} /> Edit Review
          </button>
        </div>
      </Card>

      <Card className="p-5 !border-[var(--accent)]/40">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)] mb-1"><Target size={12} /> My ONE improvement for tomorrow</div>
        <p className="text-base font-semibold text-[var(--text-primary)] leading-snug whitespace-pre-wrap">{form.improveTomorrow}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-5">
          <SummaryBlock title="Market conditions">
            <div className="flex flex-wrap gap-1.5">
              {form.marketStructure && <Chip selected tone="neutral">{form.marketStructure}</Chip>}
              {form.marketBias && <Chip selected tone={form.marketBias === "Bullish" ? "positive" : form.marketBias === "Bearish" ? "negative" : "neutral"}>{form.marketBias} bias</Chip>}
              {typeof form.newsImpact === "boolean" && <Chip selected tone="neutral">{form.newsImpact ? "News affected session" : "No news impact"}</Chip>}
              {!form.marketStructure && !form.marketBias && typeof form.newsImpact !== "boolean" && <span className="text-xs text-[var(--text-faint)]">Not filled in</span>}
            </div>
            {notes(form.marketNotes)}
          </SummaryBlock>
          <SummaryBlock title="Trading psychology">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {form.emotions.length ? form.emotions.map((e) => {
                const tone = EMOTION_OPTIONS.find((o) => o.label === e)?.tone || "neutral";
                return <Chip key={e} selected tone={tone}>{e}</Chip>;
              }) : <span className="text-xs text-[var(--text-faint)]">No emotions selected</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ScoreTile label="Confidence" value={form.confidence} />
              <ScoreTile label="Discipline" value={form.discipline} />
              <ScoreTile label="Emotional control" value={form.emotionalControl} />
            </div>
            {notes(form.feelingNotes)}
          </SummaryBlock>
        </Card>

        <Card className="p-5 space-y-5">
          <SummaryBlock title="Execution">
            <ul className="space-y-1.5">
              {EXECUTION_QUESTIONS.map((q) => {
                const v = form.execution[q.key];
                const isGood = typeof v === "boolean" ? v === q.good : null;
                return (
                  <li key={q.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-[var(--text-secondary)]">{q.label}</span>
                    <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold ${isGood === null ? "text-[var(--text-faint)]" : isGood ? "text-emerald-400" : "text-rose-400"}`}>
                      {isGood === null ? "—" : <>{isGood ? <Check size={12} /> : <X size={12} />}{v ? "Yes" : "No"}</>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {notes(form.executionNotes)}
          </SummaryBlock>
          <SummaryBlock title="Self-assessment">
            <div className="grid grid-cols-3 gap-2">
              <ScoreTile label="Execution" value={form.selfExecution} />
              <ScoreTile label="Discipline" value={form.selfDiscipline} />
              <ScoreTile label="Psychology" value={form.selfPsychology} />
            </div>
          </SummaryBlock>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5"><Label>What I did well</Label><p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{form.didWell}</p></Card>
        <Card className="p-5"><Label>What I did poorly</Label><p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{form.didPoorly}</p></Card>
      </div>
    </div>
  );
};

/* ---------- page ---------- */
export default function DailyReviewPage({ session, trades, toast }) {
  const userId = session.user.id;
  const today = todayISO();
  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const [date, setDate] = useState(today);
  const [review, setReview] = useState(null); // saved row for `date`
  const [form, setForm] = useState(() => formFromReview(null));
  const [baseline, setBaseline] = useState(() => serializeForm(formFromReview(null)));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(null); // "draft" | "completed" | null
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(true);
  const [attempted, setAttempted] = useState(false);
  const [restored, setRestored] = useState(false);
  const [index, setIndex] = useState([]);

  const dirty = useMemo(() => serializeForm(form) !== baseline, [form, baseline]);
  const latest = useRef({});
  latest.current = { form, baseline, editing, loading, userId, date, dirty };

  /* recent-days index (status dots) */
  useEffect(() => {
    let cancelled = false;
    fetchDailyReviewIndex(userId).then((rows) => { if (!cancelled) setIndex(rows); }).catch(() => { /* strip is decorative — fail quietly */ });
    return () => { cancelled = true; };
  }, [userId]);

  /* load the selected day's review (guarded against out-of-order responses) */
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(""); setSaveError(""); setAttempted(false); setRestored(false);
    fetchDailyReview(userId, date)
      .then((r) => {
        if (cancelled) return;
        const base = formFromReview(r);
        const backup = readBackup(userId, date);
        const hasUnsaved = backup && serializeForm(backup) !== serializeForm(base);
        setReview(r);
        setBaseline(serializeForm(base));
        setForm(hasUnsaved ? backup : base);
        setRestored(!!hasUnsaved);
        setEditing(hasUnsaved || !r || r.status !== "completed");
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Couldn't load this review."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, date, reloadKey]);

  /* debounce-save unsaved edits to this device */
  useEffect(() => {
    if (loading || !editing) return undefined;
    const t = setTimeout(() => { dirty ? writeBackup(userId, date, form) : clearBackup(userId, date); }, 400);
    return () => clearTimeout(t);
  }, [form, dirty, loading, editing, userId, date]);

  /* flush on tab close and on leaving the page inside the app */
  useEffect(() => {
    const flush = () => {
      const l = latest.current;
      if (!l.loading && l.editing && l.dirty) writeBackup(l.userId, l.date, l.form);
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  const changeDate = useCallback((next) => {
    if (!next || next === date || next > today) return;
    const l = latest.current;
    if (!l.loading && l.editing && l.dirty) writeBackup(l.userId, l.date, l.form); // never lose edits when switching days
    setDate(next);
  }, [date, today]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setExec = (k, v) => setForm((f) => {
    const execution = { ...f.execution };
    if (typeof v === "boolean") execution[k] = v; else delete execution[k];
    return { ...f, execution };
  });
  const toggleEmotion = (label) => setForm((f) => ({
    ...f, emotions: f.emotions.includes(label) ? f.emotions.filter((e) => e !== label) : [...f.emotions, label],
  }));

  const dayStats = useMemo(() => computeDayStats(trades, date), [trades, date]);
  const tradeDates = useMemo(() => new Set((trades || []).map((t) => t.date)), [trades]);
  const sections = useMemo(() => sectionStatus(form), [form]);
  const missing = useMemo(() => getMissing(form), [form]);
  const progress = useMemo(() => progressCount(form), [form]);
  const missingSections = useMemo(() => new Set(missing.map((m) => m.section)), [missing]);
  const invalid = (key) => attempted && missingSections.has(key);

  const isCompleted = review?.status === "completed";
  const isFuture = date > today;

  const scrollToSection = (key) => document.getElementById(`dr-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const save = async (status) => {
    if (status === "completed" && missing.length) {
      setAttempted(true);
      scrollToSection(missing[0].section);
      return;
    }
    setSaving(status); setSaveError("");
    try {
      const saved = await upsertDailyReview(userId, date, form, status, review?.completedAt);
      const base = formFromReview(saved);
      clearBackup(userId, date);
      setReview(saved);
      setForm(base);
      setBaseline(serializeForm(base));
      setRestored(false); setAttempted(false);
      setEditing(status === "draft");
      setIndex((prev) => [{ reviewDate: date, status: saved.status }, ...prev.filter((r) => r.reviewDate !== date)]);
      notify(status === "draft" ? "Draft saved" : isCompleted ? "Daily review updated" : "Daily review completed");
      if (status === "completed") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err.message || "Failed to save review.";
      setSaveError(msg);
      notify(msg, "error");
    } finally {
      setSaving(null);
    }
  };

  const cancelEdit = () => {
    clearBackup(userId, date);
    setForm(formFromReview(review));
    setBaseline(serializeForm(formFromReview(review)));
    setRestored(false); setAttempted(false); setSaveError("");
    setEditing(false);
  };

  const discardRestored = () => {
    clearBackup(userId, date);
    const base = formFromReview(review);
    setForm(base);
    setRestored(false);
    setEditing(!review || review.status !== "completed");
  };

  const statusBadge = isCompleted && !editing
    ? { text: "Reviewed", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle2 }
    : review?.status === "draft"
      ? { text: "Draft", cls: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: Clock }
      : isCompleted
        ? { text: "Editing", cls: "text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30", icon: Pencil }
        : { text: "Not reviewed", cls: "text-[var(--text-muted)] bg-white/[0.03] border-white/10", icon: ClipboardCheck };

  const pct = Math.round((progress.done / progress.total) * 100);
  const showForm = !loading && !loadError && editing;
  const showSummary = !loading && !loadError && !editing && isCompleted;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl">
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed">
          Close out your trading day in 3–5 minutes: what happened, how you executed, how you felt, and the one thing to fix tomorrow.
        </p>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${statusBadge.cls}`}>
          <statusBadge.icon size={12} /> {statusBadge.text}
        </span>
      </div>

      {/* ---------- Date navigator ---------- */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={() => changeDate(shiftDateStr(date, -1))} aria-label="Previous day"
          className={`p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors ${focusRing}`}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col items-center min-w-[240px]">
          <div className="text-sm font-semibold text-[var(--text-primary)] text-center">{longDate(date)}</div>
          {date === today
            ? <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] mt-0.5">Today</span>
            : <button onClick={() => changeDate(today)} className={`text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] mt-0.5 flex items-center gap-1 ${focusRing} rounded`}><RotateCcw size={9} /> Jump to today</button>}
        </div>
        <button onClick={() => changeDate(shiftDateStr(date, 1))} disabled={date >= today} aria-label="Next day"
          className={`p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors disabled:opacity-30 disabled:pointer-events-none ${focusRing}`}>
          <ChevronRight size={16} />
        </button>
        <label className="sr-only" htmlFor="daily-review-date">Review date</label>
        <input id="daily-review-date" type="date" value={date} max={today} onChange={(e) => changeDate(e.target.value)}
          className="bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] [color-scheme:dark]" />
      </div>

      <DayStrip selected={date} today={today} index={index} tradeDates={tradeDates} onSelect={changeDate} />

      {/* ---------- 1. Day overview (auto-calculated) ---------- */}
      <DayOverview stats={dayStats} date={date} />

      {loadError && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-rose-400"><AlertTriangle size={14} /> {loadError}</div>
            <button onClick={() => setReloadKey((k) => k + 1)} className={`text-sm font-semibold px-4 py-2 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors ${focusRing}`}>Try again</button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading review">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
          <Skeleton className="h-40" />
        </div>
      )}

      {showSummary && <ReviewSummary form={form} review={review} onEdit={() => setEditing(true)} />}

      {/* ---------- Review form ---------- */}
      {showForm && (
        <div className="space-y-4 tj-animate-in">
          {restored && (
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-amber-300 bg-amber-400/10 border border-amber-400/25 rounded-lg px-4 py-2.5">
              <span className="flex items-center gap-2"><AlertTriangle size={13} /> We restored changes you hadn't saved yet.</span>
              <button onClick={discardRestored} className={`font-semibold underline underline-offset-2 hover:text-amber-200 ${focusRing} rounded`}>Discard them</button>
            </div>
          )}

          {/* progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{progress.done} of {progress.total} sections done</span>
              <span className="text-[11px] text-[var(--text-faint)] flex items-center gap-1"><Clock size={11} /> About 3–5 min</span>
            </div>
            <div className="flex gap-1.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress">
              {[["market", "Market"], ["execution", "Execution"], ["psychology", "Psychology"], ["assessment", "Self-check"], ["reflection", "Reflection"]].map(([key, name]) => (
                <button key={key} type="button" onClick={() => scrollToSection(key)} className={`flex-1 group text-left ${focusRing} rounded`}>
                  <div className={`h-1.5 rounded-full transition-colors ${sections[key].done ? "bg-emerald-400" : "bg-white/10 group-hover:bg-white/20"}`} />
                  <span className={`hidden sm:block text-[10px] mt-1.5 ${sections[key].done ? "text-emerald-400" : "text-[var(--text-faint)]"}`}>{name}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* 2–5: two-column on desktop, natural top-to-bottom order on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 2. Market conditions */}
            <SectionCard id="market" icon={Activity} title="Market Conditions" subtitle="How would you describe today's environment?" done={sections.market.done}>
              <div className="space-y-4">
                <div>
                  <Label>Market structure</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKET_STRUCTURES.map((m) => <Chip key={m} selected={form.marketStructure === m} onClick={() => setField("marketStructure", form.marketStructure === m ? null : m)}>{m}</Chip>)}
                  </div>
                </div>
                <div>
                  <Label>Overall bias</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKET_BIASES.map((b) => (
                      <Chip key={b} selected={form.marketBias === b} tone={b === "Bullish" ? "positive" : b === "Bearish" ? "negative" : "neutral"}
                        icon={b === "Bullish" ? TrendingUp : b === "Bearish" ? TrendingDown : Minus}
                        onClick={() => setField("marketBias", form.marketBias === b ? null : b)}>{b}</Chip>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--text-secondary)]">Did news or economic events affect the session?</span>
                  <YesNo value={form.newsImpact} onChange={(v) => setField("newsImpact", v)} label="News or economic events affected the session" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5" htmlFor="dr-market-notes">What was happening in the market today? <span className="text-[var(--text-faint)]">(optional)</span></label>
                  <textarea id="dr-market-notes" rows={2} maxLength={2000} className={inputCls} placeholder="NFP at 8:30, gold swept the Asia low then rallied into NY…"
                    value={form.marketNotes} onChange={(e) => setField("marketNotes", e.target.value)} />
                </div>
              </div>
            </SectionCard>

            {/* 3. Execution review */}
            <SectionCard id="execution" icon={Crosshair} title="Execution Review" subtitle="Did you actually follow your process?"
              done={sections.execution.done} required invalid={invalid("execution")}>
              <div className="space-y-1">
                {EXECUTION_QUESTIONS.map((q) => (
                  <div key={q.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.05] last:border-b-0">
                    <span className="text-sm text-[var(--text-secondary)] leading-snug">{q.label}</span>
                    <YesNo value={form.execution[q.key] ?? null} good={q.good} onChange={(v) => setExec(q.key, v)} label={q.label} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5" htmlFor="dr-exec-notes">What happened with my execution today? <span className="text-[var(--text-faint)]">(optional)</span></label>
                <textarea id="dr-exec-notes" rows={2} maxLength={2000} className={inputCls} placeholder="Where did you stick to the plan, and where did you drift?"
                  value={form.executionNotes} onChange={(e) => setField("executionNotes", e.target.value)} />
              </div>
            </SectionCard>

            {/* 4. Psychology */}
            <SectionCard id="psychology" icon={Brain} title="Trading Psychology" subtitle="What was going on in your head while you traded?" done={sections.psychology.done}>
              <div className="space-y-4">
                <div>
                  <Label>How I felt <span className="normal-case font-medium">— pick all that apply</span></Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOTION_OPTIONS.map((e) => <Chip key={e.label} tone={e.tone} selected={form.emotions.includes(e.label)} onClick={() => toggleEmotion(e.label)}>{e.label}</Chip>)}
                  </div>
                </div>
                <RatingRow label="Confidence" value={form.confidence} onChange={(v) => setField("confidence", v)} />
                <RatingRow label="Discipline" value={form.discipline} onChange={(v) => setField("discipline", v)} />
                <RatingRow label="Emotional control" value={form.emotionalControl} onChange={(v) => setField("emotionalControl", v)} />
                <div>
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5" htmlFor="dr-feel-notes">How did I feel while trading today? <span className="text-[var(--text-faint)]">(optional)</span></label>
                  <textarea id="dr-feel-notes" rows={2} maxLength={2000} className={inputCls} placeholder="Any moment your emotions took over — or stayed out of the way?"
                    value={form.feelingNotes} onChange={(e) => setField("feelingNotes", e.target.value)} />
                </div>
              </div>
            </SectionCard>

            {/* 5. Self-assessment */}
            <SectionCard id="assessment" icon={Target} title="Self-Assessment" subtitle="A quick, honest performance check — 1 is poor, 10 is your best."
              done={sections.assessment.done} required invalid={invalid("assessment")}>
              <div className="space-y-3">
                {[["selfExecution", "Execution"], ["selfDiscipline", "Discipline"], ["selfPsychology", "Psychology"]].map(([key, name]) => (
                  <div key={key} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                    <div className="flex items-baseline justify-between mb-2.5">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                      <span className="tj-mono text-2xl font-bold text-[var(--accent)] leading-none">{form[key] ?? <span className="text-[var(--text-faint)]">–</span>}<span className="text-xs font-medium text-[var(--text-faint)]">/10</span></span>
                    </div>
                    <RatingScale value={form[key]} onChange={(v) => setField(key, v)} label={name} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* 6. Reflection */}
          <div id="dr-reflection" className="scroll-mt-24">
            <Card className={`p-5 transition-colors ${invalid("reflection") ? "!border-rose-500/50" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center"><Pencil size={14} className="text-[var(--accent)]" /></span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      Daily Reflection
                      {!sections.reflection.done && <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-faint)] border border-white/10 rounded px-1.5 py-0.5">Required</span>}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">The most important part. Be specific and honest — future you will read this.</p>
                  </div>
                </div>
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${sections.reflection.done ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400" : "border-white/10 text-transparent"}`}><Check size={11} /></span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dr-did-well" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">What did I do well today?</label>
                  <textarea id="dr-did-well" rows={5} maxLength={3000} className={inputCls} placeholder="Setups you waited for, rules you kept, moments of discipline worth repeating…"
                    value={form.didWell} onChange={(e) => setField("didWell", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="dr-did-poorly" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">What did I do poorly today?</label>
                  <textarea id="dr-did-poorly" rows={5} maxLength={3000} className={inputCls} placeholder="Rule breaks, hesitation, emotional decisions — no excuses, just what happened…"
                    value={form.didPoorly} onChange={(e) => setField("didPoorly", e.target.value)} />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] p-4">
                <label htmlFor="dr-improve" className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] mb-1">
                  <Target size={14} className="text-[var(--accent)]" /> What is ONE thing I will improve tomorrow?
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-2.5">Just one. Make it specific enough that you'll know tomorrow whether you did it.</p>
                <textarea id="dr-improve" rows={3} maxLength={300} className={inputCls} placeholder={'e.g. "Stop trading for the day after two losses in a row."'}
                  value={form.improveTomorrow} onChange={(e) => setField("improveTomorrow", e.target.value)} />
                <div className="text-right text-[10px] tj-mono text-[var(--text-faint)] mt-1">{form.improveTomorrow.length}/300</div>
              </div>
            </Card>
          </div>

          {/* 7. Completion */}
          <Card className="p-5">
            {saveError && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2"><AlertTriangle size={14} /> {saveError}</div>}
            {attempted && missing.length > 0 && (
              <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/60 rounded-lg px-4 py-3 mb-4">
                <div className="font-semibold mb-1">A few things are still needed to complete this review:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {missing.map((m, i) => <li key={i}><button type="button" className="underline underline-offset-2 hover:text-rose-200" onClick={() => scrollToSection(m.section)}>{m.label}</button></li>)}
                </ul>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                {dirty
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unsaved changes <span className="text-[var(--text-faint)]">· kept on this device</span></>
                  : review ? <><CheckCircle2 size={12} className="text-emerald-400" /> All changes saved</> : <span className="text-[var(--text-faint)]">Nothing saved yet</span>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {isCompleted && (
                  <button onClick={cancelEdit} disabled={!!saving}
                    className={`flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 sm:py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 disabled:opacity-50 transition-colors ${focusRing}`}>
                    Cancel
                  </button>
                )}
                {!isCompleted && (
                  <button onClick={() => save("draft")} disabled={!!saving || !dirty}
                    className={`flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 sm:py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 disabled:opacity-50 transition-colors ${focusRing}`}>
                    {saving === "draft" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Draft
                  </button>
                )}
                <button onClick={() => save("completed")} disabled={!!saving || isFuture || (isCompleted && !dirty)}
                  className={`flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] transition-colors ${focusRing}`}>
                  {saving === "completed" ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                  {isCompleted ? "Save Changes" : "Complete Daily Review"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!loading && !loadError && !editing && !isCompleted && (
        <EmptyState icon={ClipboardCheck} title="Nothing to show" sub="Something went wrong loading this review." />
      )}
    </div>
  );
}
