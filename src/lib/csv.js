import React from "react";
import { insertTrade } from "../db";

export function downloadBlob(content, filename, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}


export function tradesToCSV(trades) {
  const headers = ["Date", "Asset", "Direction", "Entry", "Exit", "Lots", "Fees", "Setup", "Session", "Status", "PnL", "Notes"];
  const rows = trades.map((t) => [t.date, t.asset, t.direction, t.entry, t.exit, t.lots, t.fees, t.setup, t.session, t.status, t.pnl, `"${(t.notes || "").replace(/"/g, "'")}"`]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

async function tradesToPDF(trades, meta = {}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Strike Journal — Trade Journal Export", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${meta.username || ""}  ·  Exported ${new Date().toLocaleString()}  ·  ${trades.length} trades`, 14, 22);

  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const netPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  doc.text(`Win rate: ${trades.length ? Math.round((wins / trades.length) * 100) : 0}%  ·  Wins: ${wins}  ·  Losses: ${losses}  ·  Net PnL: ${netPnl.toFixed(2)}`, 14, 27);

  autoTable(doc, {
    startY: 33,
    head: [["Date", "Asset", "Dir", "Entry", "Exit", "Lots", "Fees", "Setup", "Session", "Status", "PnL", "Notes"]],
    body: trades.map((t) => [
      t.date, t.asset, t.direction, t.entry, t.exit, t.lots, t.fees, t.setup || "", t.session || "", t.status,
      Number(t.pnl).toFixed(2), (t.notes || "").slice(0, 60),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 30, 33] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 10) {
        const val = Number(trades[data.row.index]?.pnl);
        if (val > 0) data.cell.styles.textColor = [16, 150, 90];
        else if (val < 0) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  doc.save("trade_journal_export.pdf");
}

// Parses a CSV export (from this app, or MT4/MT5/prop-firm exports using the
// same header names) back into trade objects ready for insertTrade().
// This is a manual-import "broker sync" — no live API connection to a broker.


export function csvToTrades(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { trades: [], errors: ["File has no data rows."] };

  const splitRow = (line) => {
    const cells = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const headerMap = { date: "date", asset: "asset", symbol: "asset", direction: "direction", type: "direction",
    entry: "entry", "entry price": "entry", exit: "exit", "exit price": "exit", lots: "lots", size: "lots",
    fees: "fees", commission: "fees", setup: "setup", session: "session", status: "status", outcome: "status",
    pnl: "pnl", profit: "pnl", notes: "notes", comment: "notes" };

  const headers = splitRow(lines[0]).map((h) => headerMap[h.toLowerCase()] || null);
  const trades = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i]);
    const row = {};
    headers.forEach((key, idx) => { if (key) row[key] = cells[idx]; });

    if (!row.date || !row.asset || row.entry == null || row.exit == null) {
      errors.push(`Row ${i + 1}: missing required fields (date, asset, entry, exit) — skipped.`);
      continue;
    }

    trades.push({
      date: row.date,
      asset: row.asset,
      direction: /short|sell/i.test(row.direction || "") ? "Short" : "Long",
      entry: Number(row.entry) || 0,
      exit: Number(row.exit) || 0,
      lots: Number(row.lots) || 0,
      fees: Number(row.fees) || 0,
      setup: row.setup || "Imported",
      session: row.session || "",
      status: row.status || (Number(row.pnl) > 0 ? "Win" : Number(row.pnl) < 0 ? "Loss" : "BE"),
      pnl: Number(row.pnl) || 0,
      holdingMinutes: 0,
      challengeId: null,
      screenshot: null,
      notes: row.notes || "",
    });
  }

  return { trades, errors };
}

/* ============================================================
   TOASTS
   ============================================================ */
