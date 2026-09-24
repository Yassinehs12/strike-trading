import { describe, it, expect } from "vitest";
import {
  EMPTY_FORM, EXECUTION_QUESTIONS, computeDayStats, getMissing, progressCount, sectionStatus, serializeForm, formFromReview,
} from "./dailyReview";

const t = (o) => ({ date: "2026-09-24", status: "Win", pnl: 100, fees: 0, riskAmount: null, session: "New York", ...o });
const blank = () => formFromReview(null);

describe("computeDayStats", () => {
  it("handles a day with no trades", () => {
    const s = computeDayStats([t({ date: "2026-09-23" })], "2026-09-24");
    expect(s.tradeCount).toBe(0);
    expect(s.netPnl).toBe(0);
    expect(s.winRate).toBeNull();
    expect(s.totalRisk).toBeNull();
    expect(s.sessions).toEqual([]);
  });

  it("only counts trades on the selected date and nets fees", () => {
    const s = computeDayStats([
      t({ pnl: 300, fees: 5, riskAmount: 100 }),
      t({ status: "Loss", pnl: -100, fees: 5, riskAmount: 100, session: "London" }),
      t({ status: "BE", pnl: 0, fees: 2 }),
      t({ date: "2026-09-25", pnl: 9999 }),
    ], "2026-09-24");
    expect(s.tradeCount).toBe(3);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.breakeven).toBe(1);
    expect(s.netPnl).toBe(300 - 5 - 100 - 5 - 2);
    expect(s.winRate).toBe(50); // BE excluded, same as Weekly/Monthly Review
    expect(s.totalRisk).toBe(200);
    expect(s.riskLoggedCount).toBe(2);
    expect(s.sessions.sort()).toEqual(["London", "New York"]);
  });

  it("reports total risk as null (not 0) when no risk was logged", () => {
    expect(computeDayStats([t({})], "2026-09-24").totalRisk).toBeNull();
  });
});

describe("validation", () => {
  it("requires execution, self-assessment and all three reflections to complete", () => {
    const missing = getMissing(blank());
    expect(missing.map((m) => m.section)).toEqual(["execution", "assessment", "reflection", "reflection", "reflection"]);
  });

  it("is satisfied once required parts are filled; market + psychology stay optional", () => {
    const f = blank();
    EXECUTION_QUESTIONS.forEach((q) => { f.execution[q.key] = q.good; });
    f.selfExecution = 7; f.selfDiscipline = 6; f.selfPsychology = 8;
    f.didWell = "Waited"; f.didPoorly = "Sized up"; f.improveTomorrow = "Stop after 2 losses";
    expect(getMissing(f)).toEqual([]);
    expect(sectionStatus(f).market.done).toBe(false);
    expect(progressCount(f)).toEqual({ done: 3, total: 5 });
  });

  it("does not accept whitespace-only reflections", () => {
    const f = blank();
    f.improveTomorrow = "   ";
    expect(getMissing(f).some((m) => m.label.includes("ONE improvement"))).toBe(true);
  });

  it("counts an explicit 'No' as answered", () => {
    const f = blank();
    f.execution.overtraded = false;
    expect(sectionStatus(f).execution.answered).toBe(1);
  });
});

describe("serializeForm", () => {
  it("treats reordered emotions and trailing whitespace as unchanged", () => {
    const a = { ...blank(), emotions: ["Calm", "Focused"], didWell: "ok" };
    const b = { ...blank(), emotions: ["Focused", "Calm"], didWell: "ok  " };
    expect(serializeForm(a)).toBe(serializeForm(b));
  });
  it("detects a real change", () => {
    expect(serializeForm(blank())).not.toBe(serializeForm({ ...blank(), confidence: 5 }));
  });
});
