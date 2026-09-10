import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  CalendarDays, Loader2, CheckCircle2, ChevronLeft, ChevronRight, History,
  Compass, MapPin, Crosshair, ShieldAlert, Ban, NotebookPen, TrendingUp,
  TrendingDown, Minus, Sparkles,
} from "lucide-react";
import { fetchMarketPlan, fetchMarketPlanHistory, saveMarketPlan } from "./db";
import { todayISO, shiftDateStr } from "./lib/format";
import { EmptyState } from "./components/ui/Primitives";

// Section labels mirror PRE_MARKET_CHECKLIST_ITEMS in constants.js so the
// journal habit and the dashboard checklist reinforce the same categories.
// Content is still stored as ONE string in the DB ("Label:\n...text..."
// repeated per section) — this file just renders that single string as
// five distinct editing surfaces instead of one big textarea. Splitting
// and re-joining happens entirely client-side; the storage contract with
// db.js (fetchMarketPlan / saveMarketPlan / fetchMarketPlanHistory, all
// operating on a plain `content` string) is unchanged.
const SECTIONS = [
  {
    key: "bias",
    label: "Bias for today",
    icon: Compass,
    short: "Bias",
    prompt: "What's your directional thesis today?",
    placeholder: "e.g. Bullish above 2,015 while price holds the daily FVG…",
    variant: "bias",
  },
  {
    key: "levels",
    label: "Key levels to watch",
    icon: MapPin,
    short: "Levels",
    prompt: "Zones, liquidity, order blocks, FVGs, highs & lows.",
    placeholder: "2,015 — daily FVG\n2,032 — prior day high / liquidity\n1,998 — weekly OB",
    variant: "default",
  },
  {
    key: "setups",
    label: "Setups I'm looking for",
    icon: Crosshair,
    short: "Setups",
    prompt: "What exact setup are you waiting for?",
    placeholder: "5m CHoCH off the FVG, confirm with displacement, enter on retest…",
    variant: "setups",
  },
  {
    key: "maxloss",
    label: "Max loss for the day",
    icon: ShieldAlert,
    short: "Max loss",
    prompt: "Your hard stop for the day — non-negotiable.",
    placeholder: "1% of account ($500) — two red trades and I'm done.",
    variant: "risk",
  },
  {
    key: "avoid",
    label: "Anything that would keep me out of the market today",
    icon: Ban,
    short: "Invalidation",
    prompt: "What would make you stay completely out of the market today?",
    placeholder: "High-impact news in the first hour, choppy pre-market, no clean HTF level nearby…",
    variant: "checklist",
  },
];

/* ----------------------------------------------------------------
   Parsing helpers — content stays ONE string on disk; we just read
   and write it as five labelled chunks so each section can have its
   own editing surface.
   ---------------------------------------------------------------- */

function getSectionChunk(content, sectionKey) {
  if (!content) return "";
  const idx = SECTIONS.findIndex((s) => s.key === sectionKey);
  const s = SECTIONS[idx];
  const start = content.indexOf(s.label + ":");
  if (start === -1) return "";
  const from = start + s.label.length + 1;
  const next = SECTIONS[idx + 1];
  const end = next ? content.indexOf(next.label + ":", from) : -1;
  const chunk = end === -1 ? content.slice(from) : content.slice(from, end);
  // Drop exactly one leading newline (the one right after "Label:") but
  // keep everything else so we round-trip whatever the user typed.
  return chunk.replace(/^\n/, "").replace(/\n+$/, "");
}

function buildContent(chunks) {
  return SECTIONS.map((s) => `${s.label}:\n${chunks[s.key] || ""}`.replace(/\n+$/, "\n")).join("\n\n");
}

function sectionFillCount(chunks) {
  return SECTIONS.reduce((n, s) => n + (chunks[s.key]?.trim() ? 1 : 0), 0);
}

function wordCount(text) {
  const t = (text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function totalWordCount(chunks) {
  return SECTIONS.reduce((n, s) => n + wordCount(chunks[s.key]), 0);
}

// Only reads the bias TAG the picker itself writes at the very start of the
// text (e.g. "Bullish. Short on Gold and Nasdaq…"). Deliberately does NOT
// scan the rest of the sentence for words like "long"/"short" — those
// usually describe a specific setup's direction, not the overall daily
// bias, and scanning the whole string caused false "ambiguous" reads
// (e.g. "Bullish... short on Nasdaq" registering as both bull and bear).
function detectBias(text) {
  const m = (text || "").trim().match(/^(bullish|bearish|neutral)\b/i);
  if (!m) return null;
  const w = m[1].toLowerCase();
  return w[0].toUpperCase() + w.slice(1);
}

function extractMaxLossPct(text) {
  const m = (text || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? m[1] : null;
}

function countSetupLines(text) {
  if (!text?.trim()) return 0;
  return text.split("\n").filter((l) => l.trim()).length;
}

function formatDateLabel(dateStr, todayStr) {
  if (dateStr === todayStr) return "Today";
  if (dateStr === shiftDateStr(todayStr, -1)) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const BIAS_META = {
  Bullish: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  Bearish: { icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
  Neutral: { icon: Minus, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
};

/* ---------------- small building blocks ---------------- */

function BiasPicker({ value, onPick, disabled }) {
  const options = ["Bullish", "Neutral", "Bearish"];
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => {
        const meta = BIAS_META[opt];
        const Icon = meta.icon;
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(opt)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150
              ${active
                ? `${meta.bg} ${meta.border} ${meta.color}`
                : "bg-white/[0.02] border-white/[0.08] text-[var(--text-faint)] hover:text-[var(--text-tertiary)] hover:border-white/20"}
              ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Icon size={12} />
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// Quick-insert chips for setups already defined in the trader's Trading
// Setups library — clicking one appends its name to the free-text section
// instead of replacing it, since a plan can reference more than one setup.
// Purely additive UI: the underlying content is still one plain string, so
// this never touches the storage contract described above.
function SetupChips({ options, value, onPick, disabled }) {
  if (!options?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
      {options.map((s) => {
        const already = new RegExp(`(^|\\W)${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`, "i").test(value || "");
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              const trimmed = (value || "").trim();
              onPick(trimmed ? `${trimmed}, ${s.name}` : s.name);
            }}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150
              ${already
                ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                : "bg-white/[0.02] border-white/[0.08] text-[var(--text-faint)] hover:text-[var(--text-tertiary)] hover:border-white/20"}
              ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Crosshair size={11} />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

function SectionEditor({ section, value, onChange, filled, readOnly, autoFocus, setupOptions }) {
  const Icon = section.icon;
  const bias = section.variant === "bias" ? detectBias(value) : null;
  const maxLossPct = section.variant === "risk" ? extractMaxLossPct(value) : null;
  const [focused, setFocused] = useState(false);
  const taRef = useRef(null);

  // Auto-grow so short answers don't leave giant empty boxes and long ones
  // aren't cramped — keeps the page scannable per the "5-10 second read" goal.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, 64)}px`;
  }, [value]);

  const applyBias = (label) => {
    if (readOnly) return;
    // Only strip a LEADING bias tag (the one this picker writes) — never
    // touch the word if it shows up later in the sentence describing a
    // specific setup (e.g. "...short on Nasdaq").
    const stripped = value.trim().replace(/^(bullish|bearish|neutral)\b[\s.,:-]*/i, "");
    const next = stripped ? `${label}. ${stripped}` : label;
    onChange(next);
  };

  return (
    <div className="group py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors
              ${section.variant === "risk"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : filled
                ? "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]"
                : "bg-white/[0.04] border-white/[0.08] text-[var(--text-faint)]"}`}
          >
            <Icon size={13} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">{section.label}</h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-0.5 leading-snug">{section.prompt}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {section.variant === "risk" && maxLossPct && (
            <span className="tj-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              {maxLossPct}%
            </span>
          )}
          {filled ? (
            <CheckCircle2 size={14} className="text-[var(--accent)] tj-animate-in" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border border-dashed border-white/15" />
          )}
        </div>
      </div>

      {section.variant === "bias" && (
        <div className="mb-2.5">
          <BiasPicker value={bias} onPick={applyBias} disabled={readOnly} />
        </div>
      )}

      {section.variant === "setups" && setupOptions?.length > 0 && (
        <SetupChips options={setupOptions} value={value} onPick={onChange} disabled={readOnly} />
      )}

      <div
        className={`rounded-lg border transition-colors duration-150 ${
          focused
            ? "border-[var(--accent)]/40 bg-white/[0.015]"
            : "border-white/[0.07] bg-white/[0.012] group-hover:border-white/[0.12]"
        } ${section.variant === "risk" ? "border-l-2 border-l-amber-500/40" : ""}`}
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          autoFocus={autoFocus}
          placeholder={readOnly ? "Nothing written here." : section.placeholder}
          rows={1}
          className="w-full bg-transparent outline-none resize-none px-3.5 py-2.5 text-[13px] leading-[1.7] text-[var(--text-primary)] placeholder-zinc-600 tj-scrollbar"
        />
      </div>

      {section.variant === "checklist" && value.trim() && (
        <p className="text-[10px] text-[var(--text-faint)] mt-1.5 flex items-center gap-1">
          <ShieldAlert size={10} className="text-amber-400/70" /> Treat this as a hard no — if it's true, stand down.
        </p>
      )}
    </div>
  );
}

/* ---------------- main page ---------------- */

export default function MarketPlanPage({ session, toast, setups = [] }) {
  const activeSetupOptions = setups.filter((s) => s.status !== "archived");
  const today = todayISO();
  const [viewDate, setViewDate] = useState(today);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const saveTimer = useRef(null);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);
  const isToday = viewDate === today;

  const chunks = useMemo(() => {
    const c = {};
    SECTIONS.forEach((s) => { c[s.key] = getSectionChunk(content, s.key); });
    return c;
  }, [content]);

  const filled = sectionFillCount(chunks);
  const words = totalWordCount(chunks);
  const bias = detectBias(chunks.bias);
  const maxLossPct = extractMaxLossPct(chunks.maxloss);
  const setupCount = countSetupLines(chunks.setups);
  const isComplete = filled === SECTIONS.length;
  const hasAnyContent = filled > 0;

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetchMarketPlanHistory(session.user.id)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [session.user.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    setLoading(true);
    fetchMarketPlan(session.user.id, viewDate)
      .then((plan) => setContent(plan?.content || ""))
      .catch((err) => notify(err.message || "Failed to load plan.", "error"))
      .finally(() => setLoading(false));
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, session.user.id]);

  const persist = (nextContent) => {
    if (!isToday) return; // past days are read-only
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveMarketPlan(session.user.id, today, nextContent);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        loadHistory();
      } catch (err) {
        notify(err.message || "Failed to save plan.", "error");
      } finally {
        setSaving(false);
      }
    }, 700);
  };

  const handleSectionChange = (key, value) => {
    const nextChunks = { ...chunks, [key]: value };
    const nextContent = buildContent(nextChunks);
    setContent(nextContent);
    persist(nextContent);
  };

  const goToPrevDay = () => setViewDate(shiftDateStr(viewDate, -1));
  const goToNextDay = () => {
    if (viewDate >= today) return;
    setViewDate(shiftDateStr(viewDate, 1));
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
      {/* ---------- main editor ---------- */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* header */}
        <div className="px-5 md:px-7 pt-5 pb-4 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/12 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <NotebookPen size={16} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="font-bold text-[var(--text-primary)] text-[15px] leading-none">Daily Market Plan</h1>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={goToPrevDay} title="Previous day"
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors">
                    <ChevronLeft size={12} />
                  </button>
                  <p className="text-xs text-[var(--text-tertiary)] font-medium px-0.5">
                    {formatDateLabel(viewDate, today)} · {formatFullDate(viewDate)}
                  </p>
                  <button onClick={goToNextDay} disabled={isToday} title="Next day"
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors disabled:opacity-25 disabled:pointer-events-none">
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  isComplete
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : hasAnyContent
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    : "bg-white/[0.04] border-white/10 text-[var(--text-faint)]"
                }`}
              >
                {isComplete ? "Plan complete" : hasAnyContent ? "Plan in progress" : "Not started"}
              </span>

              {isToday ? (
                <div className="h-5 flex items-center min-w-[86px] justify-end">
                  {saving ? (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                      <Loader2 size={12} className="animate-spin" /> Saving
                    </span>
                  ) : savedFlash ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 tj-animate-in">
                      <CheckCircle2 size={13} /> Saved just now
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-faint)]">Autosaves as you type</span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-[var(--text-tertiary)] bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                  Read-only
                </span>
              )}
            </div>
          </div>

          {/* progress */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-xs">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                style={{ width: `${(filled / SECTIONS.length) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] whitespace-nowrap">
              {filled}/{SECTIONS.length} sections complete
            </span>
            {words > 0 && (
              <span className="tj-mono text-[11px] text-[var(--text-faint)] whitespace-nowrap ml-auto">{words} words</span>
            )}
          </div>

          {/* today at a glance */}
          {hasAnyContent && (
            <div className="mt-4 flex items-center gap-x-6 gap-y-2 flex-wrap rounded-lg border border-white/[0.07] bg-white/[0.015] px-4 py-2.5 tj-animate-in">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-wide">
                <Sparkles size={11} className="text-[var(--accent)]" /> At a glance
              </div>
              <GlanceItem label="Bias">
                {bias ? (
                  <span className={`flex items-center gap-1 font-semibold ${BIAS_META[bias].color}`}>
                    {React.createElement(BIAS_META[bias].icon, { size: 11 })}
                    {bias.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[var(--text-faint)]">—</span>
                )}
              </GlanceItem>
              <GlanceItem label="Risk">
                <span className={maxLossPct ? "text-amber-400 font-semibold tj-mono" : "text-[var(--text-faint)]"}>
                  {maxLossPct ? `${maxLossPct}%` : "—"}
                </span>
              </GlanceItem>
              <GlanceItem label="Setups">
                <span className="text-[var(--text-secondary)] font-medium tj-mono">{setupCount || "—"}</span>
              </GlanceItem>
              <GlanceItem label="Status">
                <span className={`font-semibold ${isComplete ? "text-emerald-400" : "text-amber-400"}`}>
                  {isComplete ? "READY" : "DRAFTING"}
                </span>
              </GlanceItem>
            </div>
          )}
        </div>

        {/* editor body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={18} className="text-[var(--accent)] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto tj-scrollbar px-5 md:px-7 py-1">
            <div className="max-w-2xl mx-auto divide-y divide-white/[0.06]">
              {SECTIONS.map((s, i) => (
                <SectionEditor
                  key={s.key}
                  section={s}
                  value={chunks[s.key]}
                  onChange={(v) => handleSectionChange(s.key, v)}
                  filled={!!chunks[s.key]?.trim()}
                  readOnly={!isToday}
                  autoFocus={isToday && i === 0 && !chunks[s.key]}
                />
              ))}
              <div className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* ---------- right rail: history ---------- */}
      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] flex flex-col bg-white/[0.015] max-h-[45vh] lg:max-h-none">
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-white/[0.08] shrink-0">
          <History size={13} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Past plans</span>
          {!historyLoading && history.length > 0 && (
            <span className="ml-auto text-[10px] tj-mono text-[var(--text-faint)]">{history.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto tj-scrollbar">
          {historyLoading && (
            <div className="flex justify-center py-10"><Loader2 size={16} className="text-[var(--accent)] animate-spin" /></div>
          )}
          {!historyLoading && history.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="No plans logged yet"
              sub="Your daily plans will build a timeline here as you write them."
            />
          )}
          {!historyLoading && history.length > 0 && (
            <div className="relative py-2">
              <div className="absolute left-[26px] top-2 bottom-2 w-px bg-white/[0.08]" />
              {history.map((p) => {
                const active = p.planDate === viewDate;
                const isPlanToday = p.planDate === today;
                const c = {};
                SECTIONS.forEach((s) => { c[s.key] = getSectionChunk(p.content || "", s.key); });
                const planFilled = sectionFillCount(c);
                const planComplete = planFilled === SECTIONS.length;
                const planBias = detectBias(c.bias);
                const preview = SECTIONS.map((s) => c[s.key]).find((v) => v?.trim()) || "No content written";

                return (
                  <button
                    key={p.id}
                    onClick={() => setViewDate(p.planDate)}
                    className={`relative w-full text-left pl-[52px] pr-4 py-3 transition-colors duration-150 ${
                      active ? "bg-[var(--accent)]/10" : "hover:bg-white/[0.035]"
                    }`}
                  >
                    <span
                      className={`absolute left-[22px] top-4 w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                        active
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : planFilled > 0
                          ? "bg-[var(--bg-secondary)] border-[var(--accent)]/50"
                          : "bg-[var(--bg-secondary)] border-white/15"
                      }`}
                    />
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-xs font-semibold ${active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                        {formatDateLabel(p.planDate, today)}
                      </span>
                      {isPlanToday && !active && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--accent)]">Today</span>
                      )}
                      {planBias && (
                        <span className={`flex items-center gap-0.5 text-[9px] font-semibold uppercase ${BIAS_META[planBias].color}`}>
                          {React.createElement(BIAS_META[planBias].icon, { size: 9 })}
                          {planBias}
                        </span>
                      )}
                      <span
                        className={`ml-auto text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                          planComplete
                            ? "bg-emerald-500/10 text-emerald-400"
                            : planFilled > 0
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-white/[0.05] text-[var(--text-faint)]"
                        }`}
                      >
                        {planComplete ? "Done" : planFilled > 0 ? `${planFilled}/${SECTIONS.length}` : "Empty"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {preview}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GlanceItem({ label, children }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-[var(--text-faint)] uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}
