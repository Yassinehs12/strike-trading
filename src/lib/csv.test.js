import { describe, it, expect } from "vitest";
import { tradesToCSV, csvToTrades } from "./csv";

const trade = (overrides = {}) => ({
  date: "2026-07-01", asset: "EURUSD", direction: "Long", entry: 1.085, exit: 1.09,
  lots: 1, fees: 2, setup: "Breakout", session: "London", status: "Win", pnl: 50,
  notes: "clean entry", ...overrides,
});

describe("tradesToCSV", () => {
  it("produces a header row plus one row per trade", () => {
    const csv = tradesToCSV([trade(), trade({ asset: "GBPUSD" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Date,Asset,Direction,Entry,Exit,Lots,Fees,Setup,Session,Status,PnL,Notes");
  });

  it("escapes embedded double quotes in notes by converting them to single quotes", () => {
    const csv = tradesToCSV([trade({ notes: 'said "buy the dip"' })]);
    expect(csv).toContain("'buy the dip'");
    expect(csv).not.toContain('"buy the dip"');
  });

  it("returns just the header for an empty trade list", () => {
    expect(tradesToCSV([])).toBe("Date,Asset,Direction,Entry,Exit,Lots,Fees,Setup,Session,Status,PnL,Notes");
  });
});

describe("csvToTrades", () => {
  it("round-trips a CSV produced by tradesToCSV", () => {
    const original = [trade(), trade({ asset: "XAUUSD", status: "Loss", pnl: -30 })];
    const { trades, errors } = csvToTrades(tradesToCSV(original));
    expect(errors).toEqual([]);
    expect(trades).toHaveLength(2);
    expect(trades[0].asset).toBe("EURUSD");
    expect(trades[1].asset).toBe("XAUUSD");
    expect(trades[1].pnl).toBe(-30);
  });

  it("maps common broker-export header aliases (symbol/type/size/commission/profit) onto the same fields", () => {
    const csv = "Date,Symbol,Type,Entry Price,Exit Price,Size,Commission,Profit\n2026-07-01,EURUSD,sell,1.09,1.085,2,3,100";
    const { trades, errors } = csvToTrades(csv);
    expect(errors).toEqual([]);
    expect(trades[0]).toMatchObject({ asset: "EURUSD", direction: "Short", lots: 2, fees: 3, pnl: 100 });
  });

  it("infers Win/Loss/BE status from PnL sign when no status column is present", () => {
    const csv = "Date,Asset,Entry,Exit,PnL\n2026-07-01,EURUSD,1.08,1.09,50\n2026-07-02,EURUSD,1.08,1.07,-20\n2026-07-03,EURUSD,1.08,1.08,0";
    const { trades } = csvToTrades(csv);
    expect(trades.map((t) => t.status)).toEqual(["Win", "Loss", "BE"]);
  });

  it("skips rows missing a required field and reports which row", () => {
    const csv = "Date,Asset,Entry,Exit\n2026-07-01,EURUSD,1.08,1.09\n,GBPUSD,1.25,1.26";
    const { trades, errors } = csvToTrades(csv);
    expect(trades).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Row 3/);
  });

  it("handles a quoted field containing a comma without splitting it into extra columns", () => {
    const csv = 'Date,Asset,Entry,Exit,Notes\n2026-07-01,EURUSD,1.08,1.09,"news day, stayed flat"';
    const { trades, errors } = csvToTrades(csv);
    expect(errors).toEqual([]);
    expect(trades[0].notes).toBe("news day, stayed flat");
  });

  it("returns an explanatory error for a file with no data rows", () => {
    const { trades, errors } = csvToTrades("Date,Asset,Entry,Exit");
    expect(trades).toEqual([]);
    expect(errors[0]).toMatch(/no data rows/);
  });

  it("defaults setup to 'Imported' when the column is absent", () => {
    const csv = "Date,Asset,Entry,Exit\n2026-07-01,EURUSD,1.08,1.09";
    const { trades } = csvToTrades(csv);
    expect(trades[0].setup).toBe("Imported");
  });
});
