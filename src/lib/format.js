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


// Holding time is stored in minutes. Show it in the most natural unit,
// e.g. 45 -> "45m", 150 -> "2h 30m", 3000 -> "2d 2h".
export const fmtHold = (minutes) => {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m}m`;
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (mm && !d) parts.push(`${mm}m`);
  return parts.join(" ");
};

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
