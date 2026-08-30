import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  CalendarDays, Loader2, CheckCircle2, ChevronLeft, ChevronRight, History,
  Compass, MapPin, Crosshair, ShieldAlert, Ban, NotebookPen,
} from "lucide-react";
import { fetchMarketPlan, fetchMarketPlanHistory, saveMarketPlan } from "./db";
import { todayISO, shiftDateStr } from "./lib/format";
import { EmptyState } from "./components/ui/Primitives";

// Section labels mirror PRE_MARKET_CHECKLIST_ITEMS in constants.js so the
// journal habit and the dashboard checklist reinforce the same categories.
// Kept as plain text headers (not a form) — content is still one string in
// the DB — but the UI treats them as jump targets and a fill-progress cue.
const SECTIONS = [
  { key: "bias", label: "Bias for today", icon: Compass },
  { key: "levels", label: "Key levels to watch", icon: MapPin },
  { key: "setups", label: "Setups I'm looking for", icon: Crosshair },
  { key: "maxloss", label: "Max loss for the day", icon: ShieldAlert },
  { key: "avoid", label: "Anything that would keep me out of the market today", icon: Ban },
];

const PLACEHOLDER = SECTIONS.map((s) => `${s.label}:\n`).join("\n");

// A section counts as "filled" if there's non-whitespace text after its
// "Label:" line and before the next label (or end of content).
function sectionFillCount(content) {
  if (!content) return 0;
  let filled = 0;
  SECTIONS.forEach((s, i) => {
    const start = content.indexOf(s.label + ":");
    if (start === -1) return;
    const from = start + s.label.length + 1;
    const nextLabel = SECTIONS[i + 1];
    const end = nextLabel ? content.indexOf(nextLabel.label + ":", from) : -1;
    const chunk = end === -1 ? content.slice(from) : content.slice(from, end);
    if (chunk.trim().length > 0) filled += 1;
  });
  return filled;
}

function isSectionFilled(content, sectionKey) {
  const idx = SECTIONS.findIndex((s) => s.key === sectionKey);
  const s = SECTIONS[idx];
  const start = content.indexOf(s.label + ":");
  if (start === -1) return false;
  const from = start + s.label.length + 1;
  const next = SECTIONS[idx + 1];
  const end = next ? content.indexOf(next.label + ":", from) : -1;
  const chunk = end === -1 ? content.slice(from) : content.slice(from, end);
  return chunk.trim().length > 0;
}

function wordCount(text) {
  const t = (text || "").trim();
  return t ? t.split(/\s+/).length : 0;
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

export default function MarketPlanPage({ session, toast }) {
  const today = todayISO();
  const [viewDate, setViewDate] = useState(today);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);
  const isToday = viewDate === today;
  const filled = useMemo(() => sectionFillCount(content), [content]);
  const words = useMemo(() => wordCount(content), [content]);

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

  const handleChange = (value) => {
    setContent(value);
    if (!isToday) return; // past days are read-only
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveMarketPlan(session.user.id, today, value);
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

  const jumpToSection = (label) => {
    const ta = textareaRef.current;
    if (!ta) return;
    let idx = content.indexOf(label + ":");
    if (idx === -1 && isToday) {
      // Not written yet today — append the heading so the user can start typing there.
      const addition = (content.trim() ? content.replace(/\s+$/, "") + "\n\n" : "") + `${label}:\n`;
      handleChange(addition);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(addition.length, addition.length);
      });
      return;
    }
    if (idx === -1) return;
    ta.focus();
    const caret = idx + label.length + 1;
    ta.setSelectionRange(caret, caret);
    const lineHeight = 22;
    const linesBefore = content.slice(0, caret).split("\n").length;
    ta.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  };

  const goToPrevDay = () => setViewDate(shiftDateStr(viewDate, -1));
  const goToNextDay = () => {
    if (viewDate >= today) return;
    setViewDate(shiftDateStr(viewDate, 1));
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
      {/* ---------- main editor ---------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* header */}
        <div className="px-5 md:px-7 pt-5 pb-4 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/12 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <NotebookPen size={17} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <button onClick={goToPrevDay} title="Previous day"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <h2 className="font-bold text-[var(--text-primary)] text-base leading-none px-0.5">
                    {formatDateLabel(viewDate, today)}
                  </h2>
                  <button onClick={goToNextDay} disabled={isToday} title="Next day"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors disabled:opacity-25 disabled:pointer-events-none">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-faint)] mt-0.5">{formatFullDate(viewDate)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isToday ? (
                <div className="h-5 flex items-center">
                  {saving ? (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                      <Loader2 size={12} className="animate-spin" /> Saving
                    </span>
                  ) : savedFlash ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 tj-animate-in">
                      <CheckCircle2 size={13} /> Saved
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-faint)]">Autosaves as you type</span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-[var(--text-tertiary)] bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                  Read-only — past plan
                </span>
              )}
            </div>
          </div>

          {/* section jump chips + fill progress */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {SECTIONS.map((s) => {
              const filledSection = isSectionFilled(content, s.key);
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => jumpToSection(s.label)}
                  className={`group flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors
                    ${filledSection
                      ? "bg-[var(--accent)]/10 border-[var(--accent)]/25 text-[var(--accent)]"
                      : "bg-white/[0.03] border-white/10 text-[var(--text-faint)] hover:text-[var(--text-tertiary)] hover:border-white/20"}`}
                >
                  <Icon size={11} />
                  {s.label}
                  {filledSection && <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
              {words > 0 && <span className="tj-mono">{words} words</span>}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                    style={{ width: `${(filled / SECTIONS.length) * 100}%` }}
                  />
                </div>
                <span className="tj-mono">{filled}/{SECTIONS.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* editor body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={18} className="text-[var(--accent)] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-5 md:px-7 py-4">
            <div
              className={`h-full rounded-xl border transition-colors ${
                focused ? "border-[var(--accent)]/40 bg-white/[0.015]" : "border-white/10 bg-white/[0.01]"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                readOnly={!isToday}
                placeholder={isToday ? PLACEHOLDER : "No plan was written for this day."}
                className="h-full w-full bg-transparent outline-none resize-none px-5 py-4 text-[13.5px] leading-[1.8] text-[var(--text-primary)] placeholder-zinc-600 tj-scrollbar"
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------- right rail: history ---------- */}
      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-white/[0.015]">
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-white/10">
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
                const hasContent = !!p.content?.trim();
                return (
                  <button
                    key={p.id}
                    onClick={() => setViewDate(p.planDate)}
                    className={`relative w-full text-left pl-[52px] pr-4 py-3 transition-colors ${
                      active ? "bg-[var(--accent)]/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`absolute left-[22px] top-4 w-2.5 h-2.5 rounded-full border-2 ${
                        active
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : hasContent
                          ? "bg-[var(--bg-secondary)] border-[var(--accent)]/50"
                          : "bg-[var(--bg-secondary)] border-white/15"
                      }`}
                    />
                    <div className={`text-xs font-semibold mb-1 ${active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                      {formatDateLabel(p.planDate, today)}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {p.content?.trim() || "No content written"}
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
