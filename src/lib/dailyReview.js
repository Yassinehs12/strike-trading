// Pure logic for the Daily Post-Market Review — no React, no network — so it
// can be unit tested and reused. The page (DailyReviewPage.jsx) and the DB
// layer (db.js) both import from here.

export const MARKET_STRUCTURES = ["Trending", "Ranging", "Choppy", "Volatile", "Low Volatility"];
export const MARKET_BIASES = ["Bullish", "Bearish", "Neutral"];

// `good` = the answer that reflects good process. For the negative-framed
// questions ("Did I overtrade?") the good answer is "No", so the UI colours
// answers by whether they're good rather than by yes/no.
export const EXECUTION_QUESTIONS = [
  { key: "followedPlan", label: "Did I follow my trading plan?", good: true },
  { key: "respectedRisk", label: "Did I respect my risk management rules?", good: true },
  { key: "waitedForSetups", label: "Did I wait for my setups?", good: true },
  { key: "impulsiveTrades", label: "Did I take any impulsive trades?", good: false },
  { key: "overtraded", label: "Did I overtrade?", good: false },
  { key: "movedStop", label: "Did I move my stop loss unnecessarily?", good: false },
  { key: "closedPerPlan", label: "Did I close trades according to my plan?", good: true },
];

export const EMOTION_OPTIONS = [
  { label: "Calm", tone: "positive" },
  { label: "Confident", tone: "positive" },
  { label: "Focused", tone: "positive" },
  { label: "Patient", tone: "positive" },
  { label: "Fearful", tone: "negative" },
  { label: "Greedy", tone: "negative" },
  { label: "Frustrated", tone: "negative" },
  { label: "Anxious", tone: "negative" },
  { label: "Impulsive", tone: "negative" },
  { label: "FOMO", tone: "negative" },
  { label: "Revenge Trading", tone: "negative" },
];

export const EMPTY_FORM = {
  marketStructure: null,
  marketBias: null,
  newsImpact: null, // true | false | null (unanswered)
  marketNotes: "",
  execution: {}, // { [questionKey]: true | false }
  executionNotes: "",
  emotions: [],
  confidence: null,
  discipline: null,
  emotionalControl: null,
  feelingNotes: "",
  selfExecution: null,
  selfDiscipline: null,
  selfPsychology: null,
  didWell: "",
  didPoorly: "",
  improveTomorrow: "",
};

const filled = (s) => typeof s === "string" && s.trim().length > 0;

/* ---------- day overview (derived live from trades — never stored) ---------- */
export function computeDayStats(trades, dateStr) {
  const day = (trades || []).filter((t) => t.date === dateStr);
  const wins = day.filter((t) => t.status === "Win");
  const losses = day.filter((t) => t.status === "Loss");
  const breakeven = day.filter((t) => t.status === "BE");
  const closedForRate = wins.length + losses.length; // matches Weekly/Monthly Review's win-rate definition
  const netPnl = day.reduce((s, t) => s + (t.pnl || 0) - (t.fees || 0), 0);

  const withRisk = day.filter((t) => t.riskAmount != null && !Number.isNaN(t.riskAmount));
  const totalRisk = withRisk.reduce((s, t) => s + t.riskAmount, 0);

  const sessions = [...new Set(day.map((t) => t.session).filter(Boolean))];

  return {
    tradeCount: day.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: closedForRate ? (wins.length / closedForRate) * 100 : null,
    netPnl,
    totalRisk: withRisk.length ? totalRisk : null, // null = no risk logged, shown as "—" not "$0"
    riskLoggedCount: withRisk.length,
    sessions,
  };
}

/* ---------- section completion ---------- */
export function sectionStatus(form) {
  const execAnswered = EXECUTION_QUESTIONS.filter((q) => typeof form.execution?.[q.key] === "boolean").length;
  return {
    market: { done: !!form.marketStructure && !!form.marketBias, required: false },
    execution: { done: execAnswered === EXECUTION_QUESTIONS.length, required: true, answered: execAnswered, total: EXECUTION_QUESTIONS.length },
    psychology: {
      done: form.emotions.length > 0 && !!form.confidence && !!form.discipline && !!form.emotionalControl,
      required: false,
    },
    assessment: { done: !!form.selfExecution && !!form.selfDiscipline && !!form.selfPsychology, required: true },
    reflection: { done: filled(form.didWell) && filled(form.didPoorly) && filled(form.improveTomorrow), required: true },
  };
}

// What's still blocking "Complete Daily Review". Drafts are never blocked.
export function getMissing(form) {
  const s = sectionStatus(form);
  const missing = [];
  if (!s.execution.done) {
    const left = s.execution.total - s.execution.answered;
    missing.push({ section: "execution", label: `Execution Review (${left} question${left === 1 ? "" : "s"} left)` });
  }
  if (!s.assessment.done) missing.push({ section: "assessment", label: "Self-Assessment ratings" });
  if (!filled(form.didWell)) missing.push({ section: "reflection", label: "What I did well" });
  if (!filled(form.didPoorly)) missing.push({ section: "reflection", label: "What I did poorly" });
  if (!filled(form.improveTomorrow)) missing.push({ section: "reflection", label: "My ONE improvement for tomorrow" });
  return missing;
}

export function progressCount(form) {
  const s = sectionStatus(form);
  const keys = Object.keys(s);
  return { done: keys.filter((k) => s[k].done).length, total: keys.length };
}

/* ---------- comparing / snapshotting form state ---------- */
// Normalised so that {} vs missing keys, or key ordering, never look like "changes".
export function serializeForm(form) {
  return JSON.stringify({
    ...form,
    execution: Object.fromEntries(
      EXECUTION_QUESTIONS.filter((q) => typeof form.execution?.[q.key] === "boolean").map((q) => [q.key, form.execution[q.key]])
    ),
    emotions: [...form.emotions].sort(),
    marketNotes: form.marketNotes.trim(),
    executionNotes: form.executionNotes.trim(),
    feelingNotes: form.feelingNotes.trim(),
    didWell: form.didWell.trim(),
    didPoorly: form.didPoorly.trim(),
    improveTomorrow: form.improveTomorrow.trim(),
  });
}

export function formFromReview(r) {
  if (!r) return { ...EMPTY_FORM, execution: {}, emotions: [] };
  return {
    marketStructure: r.marketStructure ?? null,
    marketBias: r.marketBias ?? null,
    newsImpact: r.newsImpact ?? null,
    marketNotes: r.marketNotes ?? "",
    execution: { ...(r.execution || {}) },
    executionNotes: r.executionNotes ?? "",
    emotions: [...(r.emotions || [])],
    confidence: r.confidence ?? null,
    discipline: r.discipline ?? null,
    emotionalControl: r.emotionalControl ?? null,
    feelingNotes: r.feelingNotes ?? "",
    selfExecution: r.selfExecution ?? null,
    selfDiscipline: r.selfDiscipline ?? null,
    selfPsychology: r.selfPsychology ?? null,
    didWell: r.didWell ?? "",
    didPoorly: r.didPoorly ?? "",
    improveTomorrow: r.improveTomorrow ?? "",
  };
}
