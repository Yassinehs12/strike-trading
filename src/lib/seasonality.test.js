import { describe, it, expect } from "vitest";
import {
  buildMonthlyReturns, buildSeasonality, monthlyStats, median, buildHeatmapRows, heatmapScale, formatPct, ymIndex,
} from "./seasonality";
import { crossSeries, monthEndCloses } from "../../supabase/functions/_shared/fx.ts";

// All fixtures are SYNTHETIC and exist only to check arithmetic by hand.

const NOW = new Date(Date.UTC(2024, 5, 15)); // 15 Jun 2024 -> June 2024 is "month to date"
const ym = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
const closeOf = (ymStr, close, day = "28") => ({ ym: ymStr, date: `${ymStr}-${day}`, close });

// Builds closes for [startYm .. endYm] where month i's return is rets(i, month).
function series(startYm, endYm, retFn, start = 100) {
  const out = [];
  let c = start;
  for (let i = ymIndex(startYm); i <= ymIndex(endYm); i++) {
    const m = (i % 12) + 1;
    if (i > ymIndex(startYm)) c *= 1 + retFn(i, m) / 100;
    out.push(closeOf(ym(i), c));
  }
  return out;
}

describe("monthly return formula", () => {
  it("(close / previous close − 1) × 100", () => {
    const r = buildMonthlyReturns([closeOf("2024-01", 100), closeOf("2024-02", 110), closeOf("2024-03", 99)], NOW);
    expect(r.map((x) => [x.ym, x.status])).toEqual([["2024-02", "valid"], ["2024-03", "valid"]]);
    expect(r[0].ret).toBeCloseTo(10, 10);
    expect(r[1].ret).toBeCloseTo(-10, 10);
  });

  it("the first month has no return (no previous close)", () => {
    expect(buildMonthlyReturns([closeOf("2024-01", 100)], NOW)).toEqual([]);
  });

  it("never treats a missing month as a 0% return and never spans the gap", () => {
    // Feb has no close. Feb and Mar are unknown (null) — not 0 and not a 2-month return.
    const r = buildMonthlyReturns([closeOf("2024-01", 100), closeOf("2024-03", 120), closeOf("2024-04", 132)], NOW);
    expect(r.find((x) => x.ym === "2024-02")).toMatchObject({ status: "missing", ret: null });
    expect(r.find((x) => x.ym === "2024-03")).toMatchObject({ status: "missing", ret: null });
    expect(r.find((x) => x.ym === "2024-04").ret).toBeCloseTo(10, 10);
    const stats = monthlyStats(r);
    expect(stats[1].n).toBe(0); // Feb: no observations
    expect(stats[1].avg).toBeNull();
    expect(stats[1].pctPositive).toBeNull();
    expect(stats[2].n).toBe(0); // Mar
    expect(stats[3].n).toBe(1); // Apr
  });

  it("ignores invalid closes (NaN, 0, negative) rather than using them", () => {
    const r = buildMonthlyReturns([closeOf("2024-01", 100), closeOf("2024-02", NaN), closeOf("2024-03", 0), closeOf("2024-04", 110)], NOW);
    expect(r.filter((x) => x.status === "valid")).toHaveLength(0);
    expect(r.every((x) => x.ret === null)).toBe(true);
  });
});

describe("completed vs month-to-date", () => {
  const closes = [closeOf("2024-04", 100), closeOf("2024-05", 102), closeOf("2024-06", 90, "14")];

  it("labels the open month as mtd and excludes it from statistics", () => {
    const r = buildMonthlyReturns(closes, NOW);
    expect(r.find((x) => x.ym === "2024-06")).toMatchObject({ status: "mtd" });
    expect(r.find((x) => x.ym === "2024-06").ret).toBeCloseTo((90 / 102 - 1) * 100, 10);
    const s = buildSeasonality(closes, "all", NOW);
    expect(s.stats[5].n).toBe(0); // June stats ignore the −11.8% MTD value
    expect(s.mtd.ym).toBe("2024-06");
    expect(s.completed.map((x) => x.ym)).toEqual(["2024-05"]);
  });

  it("the same month counts as completed once the calendar has moved on", () => {
    const closed = [closeOf("2024-04", 100), closeOf("2024-05", 102), closeOf("2024-06", 90, "28")];
    const s = buildSeasonality(closed, "all", new Date(Date.UTC(2024, 6, 2)));
    expect(s.mtd).toBeNull();
    expect(s.stats[5].n).toBe(1);
  });

  it("a newest month that ended but whose data stops mid-month is treated as incomplete", () => {
    const stale = [closeOf("2024-04", 100), closeOf("2024-05", 102, "10")];
    const r = buildMonthlyReturns(stale, NOW);
    expect(r.find((x) => x.ym === "2024-05").status).toBe("partial");
    expect(buildSeasonality(stale, "all", NOW).stats[4].n).toBe(0);
  });
});

describe("statistics", () => {
  const entry = (month, ret) => ({ status: "valid", month, ret });

  it("computes mean, median, % positive/negative and reports flat separately", () => {
    // January returns: +2, −1, +4, 0, −3
    const s = monthlyStats([2, -1, 4, 0, -3].map((v) => entry(1, v)))[0];
    expect(s.n).toBe(5);
    expect(s.avg).toBeCloseTo(0.4, 10);
    expect(s.median).toBe(0);
    expect(s.positive).toBe(2);
    expect(s.negative).toBe(2);
    expect(s.flat).toBe(1);
    expect(s.pctPositive).toBeCloseTo(40, 10);
    expect(s.pctNegative).toBeCloseTo(40, 10);
    expect(s.pctFlat).toBeCloseTo(20, 10);
    expect(s.pctPositive + s.pctNegative + s.pctFlat).toBeCloseTo(100, 10);
  });

  it("median handles even and odd sample sizes", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("returns nulls (not zeros) for months with no valid observations", () => {
    const s = monthlyStats([entry(1, 1)]);
    expect(s[1]).toMatchObject({ n: 0, avg: null, median: null, pctPositive: null, pctNegative: null, pctFlat: null });
  });

  it("uses only valid observations as the denominator", () => {
    const s = monthlyStats([entry(2, 1), entry(2, -1), { status: "missing", month: 2, ret: null }, { status: "mtd", month: 2, ret: 50 }])[1];
    expect(s.n).toBe(2);
    expect(s.pctPositive).toBe(50);
    expect(s.avg).toBe(0);
  });
});

describe("period filters", () => {
  // Jan 2010 .. May 2024 (14y5m of closes): every calendar month's return = month number (Jan 1%, Feb 2%, …).
  const closes = series("2010-01", "2024-05", (_, m) => m);

  it("5 years = the 60 most recent completed months (5 observations per calendar month)", () => {
    const s = buildSeasonality(closes, "5", NOW);
    expect(s.completed).toHaveLength(60);
    expect(s.lastMonth).toBe("2024-05");
    expect(s.firstMonth).toBe("2019-06");
    // Jun..Dec appear 5 times; Jan..May also 5 times (Jan–May 2020..2024, Jun–Dec 2019..2023)
    expect(s.stats.every((x) => x.n === 5)).toBe(true);
    expect(s.stats[6].avg).toBeCloseTo(7, 6);
    expect(s.insufficientHistory).toBe(false);
  });

  it("10 years = 120 completed months; 20 years flags insufficient history", () => {
    expect(buildSeasonality(closes, "10", NOW).completed).toHaveLength(120);
    const s20 = buildSeasonality(closes, "20", NOW);
    expect(s20.insufficientHistory).toBe(true);
    expect(s20.completed).toHaveLength(14 * 12 + 4); // everything available: Feb 2010 – May 2024
  });

  it("all history uses every completed month", () => {
    const s = buildSeasonality(closes, "all", NOW);
    expect(s.completed).toHaveLength(14 * 12 + 4);
    expect(s.insufficientHistory).toBe(false);
  });

  it("gaps inside the window shrink the sample instead of being filled", () => {
    const gappy = closes.filter((c) => c.ym !== "2022-03");
    const s = buildSeasonality(gappy, "5", NOW);
    // Mar 2022 AND Apr 2022 (whose previous month is missing) are both unknown.
    expect(s.stats[2].n).toBe(4);
    expect(s.stats[3].n).toBe(4);
    expect(s.stats[4].n).toBe(5);
    expect(s.missingCount).toBe(2);
  });

  it("handles an empty or one-point history", () => {
    expect(buildSeasonality([], "10", NOW).completed).toEqual([]);
    expect(buildSeasonality([closeOf("2024-01", 1)], "10", NOW).stats.every((x) => x.n === 0)).toBe(true);
  });
});

describe("pair direction end to end", () => {
  it("USD/EUR returns are NOT the negation of EUR/USD returns (they invert the rate)", () => {
    const daily = { USD: { "2024-01-31": 1.0, "2024-02-29": 1.1, "2024-03-28": 1.1 } };
    const fwd = buildMonthlyReturns(monthEndCloses(crossSeries(daily, "EUR", "USD")), NOW);
    const inv = buildMonthlyReturns(monthEndCloses(crossSeries(daily, "USD", "EUR")), NOW);
    expect(fwd[0].ret).toBeCloseTo(10, 8);
    expect(inv[0].ret).toBeCloseTo((1 / 1.1 - 1) * 100, 8); // −9.0909…%
    expect(fwd[1].ret).toBeCloseTo(0, 12); // unchanged rate -> flat, exactly
    expect(monthlyStats(fwd)[2]).toMatchObject({ flat: 1, positive: 0, negative: 0 });
  });
});

describe("heatmap helpers", () => {
  const r = buildMonthlyReturns(series("2022-11", "2024-06", () => 1), NOW);

  it("orders years newest-first, includes the MTD cell, leaves months outside the data empty (null)", () => {
    const rows = buildHeatmapRows(r);
    expect(rows.map((x) => x.year)).toEqual([2024, 2023, 2022]);
    expect(rows[0].cells[5]).toMatchObject({ status: "mtd" });
    expect(rows[0].cells[6]).toBeNull();
    expect(rows[2].cells[0]).toBeNull(); // Jan 2022 predates the data
    expect(rows[2].cells[10]).toBeNull(); // Nov 2022 is the first close: no previous month, so no return
    expect(rows[2].cells[11]).toMatchObject({ status: "valid" }); // Dec 2022
  });

  it("scale ignores MTD/missing and never returns 0", () => {
    expect(heatmapScale(r)).toBeCloseTo(1, 8);
    expect(heatmapScale([])).toBe(1);
  });

  it("formats percentages and shows a dash for unknown values", () => {
    expect(formatPct(1.234)).toBe("+1.23%");
    expect(formatPct(-0.5)).toBe("-0.50%");
    expect(formatPct(0)).toBe("0.00%");
    expect(formatPct(null)).toBe("—");
    expect(formatPct(NaN)).toBe("—");
  });
});
