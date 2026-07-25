// Turns a member's trade history into a professional trading-psychology
// report — emotional state and discipline patterns cross-referenced against
// outcomes. Computed entirely client-side from data already in the journal,
// no AI call needed.

const MIN_SAMPLE = 5; // don't surface a pattern from too few trades — it's just noise
const NEGATIVE_EMOTIONS = ["Greed", "FOMO", "Overtrading", "Fear"];

function winRate(trades) {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  if (!closed.length) return null;
  return (closed.filter((t) => t.status === "Win").length / closed.length) * 100;
}

function avgPnl(trades) {
  if (!trades.length) return null;
  return trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0) / trades.length;
}

function groupBy(trades, keyFn) {
  const map = new Map();
  for (const t of trades) {
    const k = keyFn(t);
    if (k == null || k === "") continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return map;
}

// Discipline score: 100 minus penalties for tilt-flagged trades, oversized
// losing streaks tagged with negative emotion, and low-grade setups taken
// under emotional strain. Purely descriptive — not a judgment call.
function disciplineScore(closed) {
  if (!closed.length) return null;
  const negTagged = closed.filter((t) => NEGATIVE_EMOTIONS.includes(t.emotion));
  const negRate = negTagged.length / closed.length;

  const lowGradeUnderEmotion = closed.filter(
    (t) => NEGATIVE_EMOTIONS.includes(t.emotion) && (t.setupGrade === "C" || t.setupGrade === "D")
  ).length;
  const lowGradePenalty = closed.length ? (lowGradeUnderEmotion / closed.length) * 100 * 0.5 : 0;

  let score = 100 - negRate * 60 - lowGradePenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score) {
  if (score >= 85) return { label: "Strong", color: "emerald" };
  if (score >= 65) return { label: "Stable", color: "sky" };
  if (score >= 45) return { label: "Inconsistent", color: "amber" };
  return { label: "At Risk", color: "rose" };
}

export function computePsychologyReport(trades, periodLabel = "period") {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  const findings = [];

  if (closed.length < MIN_SAMPLE) {
    return { findings: [], score: null, scoreMeta: null, sampleSize: closed.length, ready: false };
  }

  const score = disciplineScore(closed);
  const scoreMeta = scoreLabel(score);

  // Emotional state vs. outcome
  const byEmotion = groupBy(closed, (t) => t.emotion || "Neutral");
  const neutralWr = winRate(byEmotion.get("Neutral") || []);
  const emotionRows = [];
  for (const [emotion, group] of byEmotion) {
    if (group.length < 3) continue;
    const wr = winRate(group);
    const pnl = avgPnl(group);
    emotionRows.push({ emotion, count: group.length, wr, pnl });
  }
  emotionRows.sort((a, b) => b.count - a.count);

  const worstNegative = emotionRows
    .filter((r) => NEGATIVE_EMOTIONS.includes(r.emotion))
    .sort((a, b) => (a.wr ?? 100) - (b.wr ?? 100))[0];

  if (worstNegative && neutralWr != null && worstNegative.wr != null) {
    const gap = neutralWr - worstNegative.wr;
    if (gap >= 10) {
      findings.push({
        type: "risk",
        title: `${worstNegative.emotion} trades underperform`,
        text: `Trades logged under "${worstNegative.emotion}" win ${Math.round(worstNegative.wr)}% of the time, versus ${Math.round(neutralWr)}% when you're neutral — a ${Math.round(gap)}-point gap across ${worstNegative.count} trades. This is your clearest emotional leak.`,
      });
    }
  }

  // Overtrading specifically — volume spike check
  const overtrades = byEmotion.get("Overtrading") || [];
  if (overtrades.length >= 3) {
    const wr = winRate(overtrades);
    findings.push({
      type: "risk",
      title: "Overtrading pattern detected",
      text: `${overtrades.length} trades were self-tagged "Overtrading"${wr != null ? `, winning only ${Math.round(wr)}% of the time` : ""}. Consider a hard daily trade cap or a cooldown timer after your first two entries.`,
    });
  }

  // Revenge-trading proxy: negative-emotion trade immediately following a loss
  const sorted = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date));
  let revengeCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].status === "Loss" && NEGATIVE_EMOTIONS.includes(sorted[i].emotion)) revengeCount++;
  }
  if (revengeCount >= 3) {
    findings.push({
      type: "risk",
      title: "Possible revenge-trading pattern",
      text: `${revengeCount} emotionally-tagged trades followed directly after a loss. Losses are a known trigger point — a mandatory pause after any loss can break this loop.`,
    });
  }

  // Setup grade vs emotion — discipline under pressure
  const lowGradeEmotional = closed.filter(
    (t) => NEGATIVE_EMOTIONS.includes(t.emotion) && (t.setupGrade === "C" || t.setupGrade === "D")
  );
  if (lowGradeEmotional.length >= 3) {
    findings.push({
      type: "risk",
      title: "Low-grade setups taken under emotional strain",
      text: `${lowGradeEmotional.length} trades combined a C/D-grade setup with an emotional tag (Greed, FOMO, Overtrading, or Fear) — the classic "I know it's not my setup but I took it anyway" trade.`,
    });
  }

  // Positive reinforcement: neutral/disciplined trading performing well
  const neutralGroup = byEmotion.get("Neutral") || [];
  if (neutralGroup.length >= MIN_SAMPLE && neutralWr != null && neutralWr >= 55) {
    findings.push({
      type: "strength",
      title: "Neutral-state trading is your edge",
      text: `When logged as "Neutral," you win ${Math.round(neutralWr)}% of trades across ${neutralGroup.length} entries. Your process works — the goal is simply trading from this state more often.`,
    });
  }

  // Streak-based tilt check
  const recentClosed = [...closed].sort((a, b) => new Date(b.date) - new Date(a.date));
  let currentStreak = 0, streakType = null;
  for (const t of recentClosed) {
    if (streakType === null) { streakType = t.status; currentStreak = 1; }
    else if (t.status === streakType) currentStreak++;
    else break;
  }
  if (streakType === "Loss" && currentStreak >= 3) {
    findings.push({
      type: "risk",
      title: `${currentStreak}-trade losing streak, active now`,
      text: `You're currently in your longest recent drawdown. This is statistically the highest-risk window for emotional decisions — consider stepping away rather than trading to break even.`,
    });
  }

  // Summary line
  findings.unshift({
    type: "summary",
    title: "Discipline Score",
    text: `${score}/100 — ${scoreMeta.label}. Based on ${closed.length} closed trades this ${periodLabel}, weighing emotionally-tagged trades and low-grade setups taken under strain.`,
  });

  return {
    findings: findings.slice(0, 7),
    score,
    scoreMeta,
    emotionRows,
    sampleSize: closed.length,
    ready: true,
  };
}
