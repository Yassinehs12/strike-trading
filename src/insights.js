// Turns a member's trade history into plain-English insights, computed
// entirely client-side from data already in the journal — no AI call needed.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MIN_SAMPLE = 5; // don't surface a pattern from too few trades — it's just noise

function winRate(trades) {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  if (!closed.length) return null;
  return (closed.filter((t) => t.status === "Win").length / closed.length) * 100;
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

// Compares win rate of a subgroup against the rest, only surfacing it if the
// gap is large enough (15+ points) and both sides have a real sample size.
function findStandoutGroups(trades, keyFn, minGroupSize = MIN_SAMPLE) {
  const groups = groupBy(trades, keyFn);
  const overall = winRate(trades);
  if (overall == null) return [];
  const standouts = [];
  for (const [key, group] of groups) {
    if (group.length < minGroupSize) continue;
    const wr = winRate(group);
    if (wr == null) continue;
    const rest = trades.filter((t) => keyFn(t) !== key);
    const restWr = winRate(rest);
    if (restWr == null) continue;
    const gap = wr - restWr;
    if (Math.abs(gap) >= 15) standouts.push({ key, wr, restWr, gap, count: group.length });
  }
  return standouts.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

export function computeInsights(trades, periodLabel = "period") {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  const insights = [];
  if (closed.length < MIN_SAMPLE) {
    return { insights: [], sampleSize: closed.length, ready: false };
  }

  // By asset
  findStandoutGroups(closed, (t) => t.asset).slice(0, 1).forEach((s) => {
    insights.push({
      type: s.gap > 0 ? "strength" : "weakness",
      text: s.gap > 0
        ? `Your win rate on ${s.key} is ${Math.round(s.wr)}% — ${Math.round(s.gap)} points above your average on other assets.`
        : `Your win rate on ${s.key} is ${Math.round(s.wr)}% — ${Math.round(Math.abs(s.gap))} points below your other assets. Worth reviewing what's different about these setups.`,
    });
  });

  // By session
  findStandoutGroups(closed, (t) => t.session).slice(0, 1).forEach((s) => {
    insights.push({
      type: s.gap > 0 ? "strength" : "weakness",
      text: s.gap > 0
        ? `You trade noticeably better during the ${s.key} session (${Math.round(s.wr)}% win rate) than at other times.`
        : `Your ${s.key} session trades underperform your average (${Math.round(s.wr)}% win rate). Consider tightening entries here or trading this session less.`,
    });
  });

  // By setup
  findStandoutGroups(closed, (t) => t.setup).slice(0, 1).forEach((s) => {
    insights.push({
      type: s.gap > 0 ? "strength" : "weakness",
      text: s.gap > 0
        ? `Your "${s.key}" setup is your strongest — ${Math.round(s.wr)}% win rate across ${s.count} trades.`
        : `Your "${s.key}" setup is underperforming at ${Math.round(s.wr)}% win rate across ${s.count} trades — might not be as high-probability as it feels in the moment.`,
    });
  });

  // By day of week
  findStandoutGroups(closed, (t) => DAY_NAMES[new Date(t.date).getDay()]).slice(0, 1).forEach((s) => {
    insights.push({
      type: s.gap > 0 ? "strength" : "weakness",
      text: s.gap > 0
        ? `${s.key}s are your best day — ${Math.round(s.wr)}% win rate.`
        : `${s.key}s tend to be your worst day — ${Math.round(s.wr)}% win rate. Worth noticing if something about that day (fatigue, news, schedule) is affecting your trading.`,
    });
  });

  // Holding time correlation (short vs long holds)
  const withHold = closed.filter((t) => t.holdingMinutes > 0);
  if (withHold.length >= MIN_SAMPLE * 2) {
    const sorted = [...withHold].sort((a, b) => a.holdingMinutes - b.holdingMinutes);
    const median = sorted[Math.floor(sorted.length / 2)].holdingMinutes;
    const short = withHold.filter((t) => t.holdingMinutes <= median);
    const long = withHold.filter((t) => t.holdingMinutes > median);
    const shortWr = winRate(short), longWr = winRate(long);
    if (shortWr != null && longWr != null && Math.abs(shortWr - longWr) >= 15) {
      const better = shortWr > longWr ? "shorter" : "longer";
      const worseThreshold = shortWr > longWr ? `over ${median}min` : `under ${median}min`;
      insights.push({
        type: "info",
        text: `Trades you hold for ${better} periods perform meaningfully better. Trades ${worseThreshold} tend to underperform — worth watching for hesitation or overstaying entries.`,
      });
    }
  }

  // Consistency / streaks
  const recentClosed = [...closed].sort((a, b) => new Date(b.date) - new Date(a.date));
  let currentStreak = 0, streakType = null;
  for (const t of recentClosed) {
    if (streakType === null) { streakType = t.status; currentStreak = 1; }
    else if (t.status === streakType) currentStreak++;
    else break;
  }
  if (currentStreak >= 3) {
    insights.push({
      type: streakType === "Win" ? "strength" : "weakness",
      text: streakType === "Win"
        ? `You're on a ${currentStreak}-trade win streak. Good discipline — keep following the same process rather than sizing up.`
        : `You're on a ${currentStreak}-trade losing streak. This is a common point where revenge trading creeps in — consider a short break before your next entry.`,
    });
  }

  // Overall summary line
  const wr = winRate(closed);
  const netPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  insights.unshift({
    type: "summary",
    text: `${closed.length} closed trades this ${periodLabel} — ${Math.round(wr)}% win rate, net ${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(0)}.`,
  });

  return { insights: insights.slice(0, 6), sampleSize: closed.length, ready: true };
}

export function filterTradesByPeriod(trades, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return trades.filter((t) => new Date(t.date).getTime() >= cutoff);
}
