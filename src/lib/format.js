import React from "react";

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Formats a Date object as a local-calendar-day "YYYY-MM-DD" string.
// Deliberately NOT `date.toISOString().slice(0, 10)` — toISOString() first
// converts to UTC, so in any positive UTC-offset timezone (e.g. UTC+1),
// local midnight rolls back into the previous UTC day and the returned
// date string is off by one. Use this (or todayISO for "right now")
// anywhere a Date needs to become a plain date string.
export const toLocalISODate = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Shifts a "YYYY-MM-DD" string by `days` (negative to go back) and returns
// the result as a "YYYY-MM-DD" string, entirely in local time.
export const shiftDateStr = (dateStr, days) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
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
