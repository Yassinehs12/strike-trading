import React, { useState, useEffect, useCallback, useRef } from "react";
import { CalendarDays, Loader2, CheckCircle2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { fetchMarketPlan, fetchMarketPlanHistory, saveMarketPlan } from "./db";
import { todayISO } from "./lib/format";

// Lightweight structure prompt — not a form, just a placeholder nudge
// toward the same categories as the dashboard's pre-market checklist
// (see PRE_MARKET_CHECKLIST_ITEMS in constants.js), so the two habits
// reinforce each other without duplicating the checklist itself.
const PLACEHOLDER = `Bias for today:

Key levels to watch:

Setups I'm looking for:

Max loss for the day:

Anything that would keep me out of the market today:`;

function formatDateLabel(dateStr, todayStr) {
  if (dateStr === todayStr) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  const yesterday = new Date(todayStr + "T00:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
  const saveTimer = useRef(null);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);
  const isToday = viewDate === today;

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

  const goToPrevDay = () => {
    const d = new Date(viewDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const goToNextDay = () => {
    if (viewDate >= today) return;
    const d = new Date(viewDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setViewDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
      {/* ---------- main editor ---------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevDay} title="Previous day"
              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={15} className="text-[var(--accent)]" />
              <span className="font-bold text-[var(--text-primary)]">{formatDateLabel(viewDate, today)}</span>
              {!isToday && <span className="text-xs text-[var(--text-faint)]">({viewDate})</span>}
            </div>
            <button onClick={goToNextDay} disabled={isToday} title="Next day"
              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isToday ? (
              saving ? <Loader2 size={13} className="animate-spin text-[var(--text-faint)]" />
                : savedFlash ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={13} /> Saved</span>
                : null
            ) : (
              <span className="text-xs text-[var(--text-faint)]">Read-only — past plan</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={18} className="text-[var(--accent)] animate-spin" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={!isToday}
            placeholder={isToday ? PLACEHOLDER : "No plan was written for this day."}
            className="flex-1 w-full bg-transparent outline-none resize-none px-5 py-4 text-sm leading-relaxed text-[var(--text-primary)] placeholder-zinc-600"
          />
        )}
      </div>

      {/* ---------- right rail: history ---------- */}
      <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-white/[0.015]">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
          <History size={13} className="text-[var(--text-faint)]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">Past plans</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {historyLoading && (
            <div className="flex justify-center py-8"><Loader2 size={16} className="text-[var(--accent)] animate-spin" /></div>
          )}
          {!historyLoading && history.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] px-4 py-6 text-center">Your past daily plans will show up here once you've written a few.</p>
          )}
          {history.map((p) => (
            <button key={p.id} onClick={() => setViewDate(p.planDate)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.06] transition-colors ${p.planDate === viewDate ? "bg-[var(--accent)]/10" : "hover:bg-white/[0.03]"}`}>
              <div className={`text-xs font-semibold mb-1 ${p.planDate === viewDate ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                {formatDateLabel(p.planDate, today)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">{p.content?.trim() || "No content"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
