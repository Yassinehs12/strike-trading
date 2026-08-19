import { describe, it, expect } from "vitest";
import { computePsychologyReport } from "./psychology";

const trade = (overrides = {}) => ({
  date: "2026-07-01", status: "Win", pnl: 50, emotion: "Neutral", setupGrade: "A",
  checklist: null, ...overrides,
});

describe("computePsychologyReport", () => {
  it("is not ready with zero closed trades", () => {
    const result = computePsychologyReport([{ status: "Open" }]);
    expect(result.ready).toBe(false);
    expect(result.score).toBeNull();
  });

  it("becomes ready from a single closed trade (MIN_SAMPLE = 1)", () => {
    const result = computePsychologyReport([trade()]);
    expect(result.ready).toBe(true);
    expect(result.sampleSize).toBe(1);
  });

  it("gives a perfect discipline score of 100 with no negative-emotion trades and no checklist data", () => {
    const trades = Array.from({ length: 5 }, () => trade({ emotion: "Neutral" }));
    const result = computePsychologyReport(trades);
    expect(result.score).toBe(100);
    expect(result.scoreMeta.label).toBe("Strong");
  });

  it("penalizes the score as negative-emotion trades make up a larger share", () => {
    const allNeutral = computePsychologyReport(Array.from({ length: 10 }, () => trade({ emotion: "Neutral" })));
    const halfFomo = computePsychologyReport([
      ...Array.from({ length: 5 }, () => trade({ emotion: "Neutral" })),
      ...Array.from({ length: 5 }, () => trade({ emotion: "FOMO", status: "Loss" })),
    ]);
    expect(halfFomo.score).toBeLessThan(allNeutral.score);
  });

  it("flags an emotional-leak finding when a negative emotion clearly underperforms neutral trading", () => {
    const trades = [
      ...Array.from({ length: 5 }, () => trade({ emotion: "Neutral", status: "Win" })),
      ...Array.from({ length: 5 }, () => trade({ emotion: "Greed", status: "Loss" })),
    ];
    const result = computePsychologyReport(trades);
    const leak = result.findings.find((f) => f.title.includes("underperform"));
    expect(leak).toBeTruthy();
    expect(leak.type).toBe("risk");
  });

  it("flags overtrading once 3+ trades are self-tagged 'Overtrading'", () => {
    const trades = [
      ...Array.from({ length: 5 }, () => trade({ emotion: "Neutral" })),
      ...Array.from({ length: 3 }, () => trade({ emotion: "Overtrading", status: "Loss" })),
    ];
    const result = computePsychologyReport(trades);
    expect(result.findings.some((f) => f.title.includes("Overtrading"))).toBe(true);
  });

  it("does not flag overtrading below the 3-trade threshold", () => {
    const trades = [
      ...Array.from({ length: 5 }, () => trade({ emotion: "Neutral" })),
      ...Array.from({ length: 2 }, () => trade({ emotion: "Overtrading", status: "Loss" })),
    ];
    const result = computePsychologyReport(trades);
    expect(result.findings.some((f) => f.title.includes("Overtrading"))).toBe(false);
  });

  it("detects a revenge-trading pattern: negative-emotion trade immediately following a loss, 3+ times", () => {
    const trades = [
      trade({ date: "2026-07-01", status: "Loss", emotion: "Neutral" }),
      trade({ date: "2026-07-02", status: "Loss", emotion: "FOMO" }), // revenge #1
      trade({ date: "2026-07-03", status: "Loss", emotion: "Neutral" }),
      trade({ date: "2026-07-04", status: "Loss", emotion: "Greed" }), // revenge #2
      trade({ date: "2026-07-05", status: "Loss", emotion: "Neutral" }),
      trade({ date: "2026-07-06", status: "Loss", emotion: "Fear" }), // revenge #3
    ];
    const result = computePsychologyReport(trades);
    expect(result.findings.some((f) => f.title.includes("revenge"))).toBe(true);
  });

  it("flags low checklist completion when under 60% of tracked trades are fully checked", () => {
    const complete = { setupConfirmed: true, riskSized: true, newsChecked: true };
    const trades = [
      trade({ checklist: complete }),
      ...Array.from({ length: 4 }, () => trade({ checklist: { setupConfirmed: true, riskSized: false, newsChecked: true } })),
    ];
    const result = computePsychologyReport(trades);
    expect(result.findings.some((f) => f.title.includes("Checklist completion is low"))).toBe(true);
    expect(result.checklistRate).toBe(0.2);
  });

  it("excludes trades with no checklist object at all from the completion rate, rather than counting them incomplete", () => {
    const trades = Array.from({ length: 5 }, () => trade({ checklist: null }));
    const result = computePsychologyReport(trades);
    expect(result.checklistRate).toBeNull();
  });

  it("detects an active 3+ loss streak as a risk finding", () => {
    const trades = [
      trade({ date: "2026-07-01", status: "Win" }),
      trade({ date: "2026-07-02", status: "Loss" }),
      trade({ date: "2026-07-03", status: "Loss" }),
      trade({ date: "2026-07-04", status: "Loss" }),
    ];
    const result = computePsychologyReport(trades);
    const streakFinding = result.findings.find((f) => f.title.includes("losing streak"));
    expect(streakFinding).toBeTruthy();
    expect(streakFinding.type).toBe("risk");
  });

  it("always puts the Discipline Score summary first", () => {
    const result = computePsychologyReport([trade()]);
    expect(result.findings[0].title).toBe("Discipline Score");
    expect(result.findings[0].type).toBe("summary");
  });

  it("caps findings at 7", () => {
    const complete = { setupConfirmed: true, riskSized: true, newsChecked: true };
    const incomplete = { setupConfirmed: true, riskSized: false, newsChecked: false };
    const trades = [
      ...Array.from({ length: 5 }, () => trade({ emotion: "Neutral", status: "Win", checklist: complete })),
      ...Array.from({ length: 5 }, () => trade({ emotion: "Greed", status: "Loss", setupGrade: "D", checklist: incomplete })),
      ...Array.from({ length: 3 }, () => trade({ emotion: "Overtrading", status: "Loss" })),
    ];
    const result = computePsychologyReport(trades);
    expect(result.findings.length).toBeLessThanOrEqual(7);
  });
});
