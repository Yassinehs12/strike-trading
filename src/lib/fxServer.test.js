import { describe, it, expect } from "vitest";
import { parseEcbCsv, crossSeries, monthEndCloses } from "../../supabase/functions/_shared/fx.ts";

// NOTE: every number below is a SYNTHETIC test fixture chosen so results can
// be verified by hand. None of it is market data and none ships in the app.

const HEADER = "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,TITLE";
const row = (cur, date, val) => `EXR.D.${cur}.EUR.SP00.A,D,${cur},EUR,SP00,A,${date},${val},A,,"Test, quoted title"`;

describe("parseEcbCsv", () => {
  it("reads CURRENCY / TIME_PERIOD / OBS_VALUE by header name, tolerating quoted commas and a BOM", () => {
    const csv = "﻿" + [HEADER, row("USD", "2024-01-02", "1.1"), row("JPY", "2024-01-02", "160")].join("\r\n");
    expect(parseEcbCsv(csv)).toEqual({ USD: { "2024-01-02": 1.1 }, JPY: { "2024-01-02": 160 } });
  });

  it("drops blank, non-numeric and non-positive observations instead of zeroing them", () => {
    const csv = [HEADER, row("USD", "2024-01-02", ""), row("USD", "2024-01-03", "NaN"), row("USD", "2024-01-04", "0"),
      row("USD", "2024-01-05", "-1"), row("USD", "2024-01-08", "1.2")].join("\n");
    expect(parseEcbCsv(csv)).toEqual({ USD: { "2024-01-08": 1.2 } });
  });

  it("works when columns are reordered / extra columns are present", () => {
    const csv = ["OBS_VALUE,EXTRA,TIME_PERIOD,CURRENCY", "1.5,x,2024-02-01,GBP"].join("\n");
    expect(parseEcbCsv(csv)).toEqual({ GBP: { "2024-02-01": 1.5 } });
  });

  it("fails loudly on an unexpected format or empty body", () => {
    expect(() => parseEcbCsv("A,B\n1,2")).toThrow(/missing expected columns/);
    expect(() => parseEcbCsv("")).toThrow(/no data rows/);
  });
});

describe("crossSeries (pair direction)", () => {
  const daily = {
    USD: { "2024-01-02": 1.25, "2024-01-03": 1.25 },
    JPY: { "2024-01-02": 150, "2024-01-03": 150 },
    GBP: { "2024-01-02": 0.8 }, // no GBP rate on 01-03
  };

  it("EUR/USD equals the USD-per-EUR quote", () => {
    expect(crossSeries(daily, "EUR", "USD")[0]).toEqual({ date: "2024-01-02", rate: 1.25 });
  });

  it("USD/EUR is the exact inverse of EUR/USD (direction handled)", () => {
    expect(crossSeries(daily, "USD", "EUR")[0].rate).toBeCloseTo(1 / 1.25, 12);
  });

  it("USD/JPY = JPY per EUR / USD per EUR", () => {
    expect(crossSeries(daily, "USD", "JPY")[0].rate).toBeCloseTo(150 / 1.25, 10); // 120
  });

  it("GBP/USD = USD per EUR / GBP per EUR", () => {
    expect(crossSeries(daily, "GBP", "USD")[0].rate).toBeCloseTo(1.25 / 0.8, 10); // 1.5625
  });

  it("skips dates where either leg is missing rather than filling or zeroing", () => {
    const s = crossSeries(daily, "GBP", "USD");
    expect(s.map((p) => p.date)).toEqual(["2024-01-02"]);
    expect(s.every((p) => p.rate > 0)).toBe(true);
  });

  it("returns [] for an unknown currency and throws for identical legs", () => {
    expect(crossSeries(daily, "EUR", "NZD")).toEqual([]);
    expect(() => crossSeries(daily, "USD", "USD")).toThrow();
  });
});

describe("monthEndCloses", () => {
  it("keeps the last available observation of each month and omits empty months", () => {
    const series = [
      { date: "2024-01-02", rate: 1 }, { date: "2024-01-30", rate: 2 },
      { date: "2024-03-01", rate: 3 }, { date: "2024-03-28", rate: 4 },
    ];
    expect(monthEndCloses(series)).toEqual([
      { ym: "2024-01", date: "2024-01-30", close: 2 },
      { ym: "2024-03", date: "2024-03-28", close: 4 }, // Feb absent, not zero
    ]);
  });
});
