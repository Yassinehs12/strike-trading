// Pip size (the price move that counts as "1 pip") and standard pip value per
// 1.00 lot (100,000 units for forex; 1 contract for everything else), quote
// currency = USD. Approximations good enough for planning a trade — always
// confirm against your broker's exact specs.
export const PAIRS = {
  "EURUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "GBPUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "AUDUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "NZDUSD": { pipSize: 0.0001, pipValue: 10, type: "Forex" },
  "USDCAD": { pipSize: 0.0001, pipValue: 7.4, type: "Forex" },
  "USDCHF": { pipSize: 0.0001, pipValue: 11.2, type: "Forex" },
  "USDJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "EURJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "GBPJPY": { pipSize: 0.01, pipValue: 6.7, type: "Forex" },
  "XAUUSD": { pipSize: 0.01, pipValue: 1, type: "Metal" },
  "XAGUSD": { pipSize: 0.001, pipValue: 5, type: "Metal" },
  "NDX100": { pipSize: 0.1, pipValue: 1, type: "Index" },
  "US30": { pipSize: 1, pipValue: 1, type: "Index" },
  "SPX500": { pipSize: 0.1, pipValue: 1, type: "Index" },
  "BTCUSD": { pipSize: 1, pipValue: 1, type: "Crypto" },
};

export const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));
export const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });
export const clamp01to5 = (n) => Math.max(0, Math.min(5, n));
