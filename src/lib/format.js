import React from "react";

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};


export const fmtUSD = (n, opts = {}) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, ...opts });


export const fmtUSD2 = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });


export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));


// `referenceDate` defaults to the real current date/time — never hardcode
// this to a fixed date, or every "days since X" stat in the app (streaks,
// challenge days active, projected completion date) silently drifts wrong
// as real time passes beyond that fixed date. Tests pass an explicit
// referenceDate to stay deterministic instead.
export const daysAgo = (dateStr, referenceDate = new Date()) => Math.floor((referenceDate - new Date(dateStr)) / 86400000);


export function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
