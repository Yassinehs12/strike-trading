// Generates a shareable "StrikeJournal" identity card — a premium, portrait
// social graphic (1080x1350, 4:5 — native to X, Discord, Instagram, Telegram)
// built from a member's profile, badges, and public trading stats.
// Pure Canvas API, no extra deps. Preserves the original data contract:
// generateShareCard({ profile, badges, tradingStats }) -> Blob
// downloadShareCard({ profile, badges, tradingStats }) -> triggers a PNG download

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fall back to initial-letter avatar
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

const PALETTE = {
  bg0: "#07070a",
  bg1: "#0c0d12",
  navy: "#10131c",
  line: "rgba(255,255,255,0.08)",
  lineSoft: "rgba(255,255,255,0.05)",
  text: "#f5f5f7",
  textMuted: "#8b8d98",
  textFaint: "#55575f",
  blue: "#4f7cff",
  blueSoft: "rgba(79,124,255,0.14)",
  purple: "#9b6bff",
  purpleSoft: "rgba(155,107,255,0.14)",
};

const BADGE_ACCENT = {
  amber: PALETTE.purple,
  violet: PALETTE.purple,
  rose: PALETTE.purple,
  pink: PALETTE.purple,
  emerald: PALETTE.blue,
  blue: PALETTE.blue,
  cyan: PALETTE.blue,
  slate: PALETTE.blue,
  orange: PALETTE.purple,
};
const accentFor = (color) => BADGE_ACCENT[color] || PALETTE.blue;

function drawGlyph(ctx, id, cx, cy, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, s * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (/streak|lightning/.test(id)) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s * 0.6);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.02, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.15, cy + s * 0.6);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.1);
    ctx.lineTo(cx + s * 0.02, cy - s * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (/trades|target|consistent|risk/.test(id)) {
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (/founding|og|early|mvp|top_performer|trade_of/.test(id)) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.05);
    ctx.lineTo(cx, cy + s * 0.6);
    ctx.lineTo(cx - s * 0.5, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (/funded|verified|prop_firm|moderator/.test(id)) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.1);
    ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.5, cx, cy + s * 0.62);
    ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.5, cx - s * 0.5, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.5, cy - s * 0.35);
    ctx.closePath();
    ctx.fill();
  } else if (/recruiter|community|mentor|helper|host/.test(id)) {
    ctx.beginPath(); ctx.arc(cx - s * 0.18, cy, s * 0.32, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.18, cy, s * 0.32, 0, Math.PI * 2); ctx.stroke();
  } else if (/content|playbook|book/.test(id)) {
    roundRect(ctx, cx - s * 0.4, cy - s * 0.5, s * 0.8, s, s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.22, cy - s * 0.2); ctx.lineTo(cx + s * 0.22, cy - s * 0.2);
    ctx.moveTo(cx - s * 0.22, cy + s * 0.1); ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
    ctx.stroke();
  } else if (/gift/.test(id)) {
    roundRect(ctx, cx - s * 0.45, cy - s * 0.15, s * 0.9, s * 0.65, s * 0.08);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.15); ctx.lineTo(cx, cy + s * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.45, cy + s * 0.05); ctx.lineTo(cx + s * 0.45, cy + s * 0.05); ctx.stroke();
  } else {
    const spikes = 5, outer = s * 0.58, inner = s * 0.24;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const ang = (Math.PI / spikes) * i - Math.PI / 2;
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSignatureMark(ctx, SIZE) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = PALETTE.blue;
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const off = i * 130;
    ctx.beginPath();
    ctx.moveTo(SIZE * 0.55 + off, -80);
    ctx.lineTo(SIZE + 200 + off, SIZE * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

// The real site mark from Logo.jsx: three ascending blade segments on a
// 0..100 viewBox, tapering to a point, in the same blue -> purple -> pink
// gradient used across the app — reproduced exactly rather than a stand-in
// icon, so the card carries the actual StrikeJournal logo.
function drawLogoMark(ctx, x, y, size) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, 100, 70, 0);
  g.addColorStop(0, "#4F7CFF");
  g.addColorStop(0.55, "#A855F7");
  g.addColorStop(1, "#F472B6");
  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.moveTo(13, 78); ctx.lineTo(55, 78); ctx.lineTo(48, 64); ctx.lineTo(20, 64);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(23, 60); ctx.lineTo(65, 60); ctx.lineTo(58, 46); ctx.lineTo(30, 46);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(40, 42); ctx.lineTo(75, 42); ctx.lineTo(60, 20);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWordmark(ctx, x, y, scale = 1) {
  const markSize = 30 * scale;
  ctx.save();
  drawLogoMark(ctx, x, y - markSize + markSize * 0.14, markSize);

  ctx.textBaseline = "middle";
  ctx.font = `800 ${20 * scale}px -apple-system, system-ui, sans-serif`;
  const textX = x + markSize + 12 * scale;
  const textY = y - markSize / 2 + markSize * 0.14;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText("Strike", textX, textY);
  const strikeW = ctx.measureText("Strike").width;
  ctx.fillStyle = PALETTE.purple;
  ctx.fillText("Journal", textX + strikeW, textY);
  ctx.restore();
}

export async function generateShareCard({ profile, badges = [], tradingStats }) {
  const W = 1080, H = 1350; // 4:5 portrait — native aspect for IG/X/Discord
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const M = 72;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, PALETTE.bg1);
  bg.addColorStop(1, PALETTE.bg0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.85, H * 0.05, 0, W * 0.85, H * 0.05, 620);
  glow.addColorStop(0, "rgba(79,124,255,0.16)");
  glow.addColorStop(1, "rgba(79,124,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.95, 0, W * 0.1, H * 0.95, 560);
  glow2.addColorStop(0, "rgba(155,107,255,0.10)");
  glow2.addColorStop(1, "rgba(155,107,255,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  drawSignatureMark(ctx, W);

  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 24, 24, W - 48, H - 48, 32);
  ctx.stroke();

  drawWordmark(ctx, M, M + 34, 1.15);

  ctx.font = "700 13px -apple-system, system-ui, sans-serif";
  const statusLabel = "COMMUNITY MEMBER";
  ctx.letterSpacing = "1.5px";
  const statusW = ctx.measureText(statusLabel).width + 34;
  const pillX = W - M - statusW, pillY = M;
  roundRect(ctx, pillX, pillY, statusW, 30, 15);
  ctx.fillStyle = PALETTE.blueSoft;
  ctx.fill();
  ctx.strokeStyle = "rgba(79,124,255,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#a9bfff";
  ctx.textBaseline = "middle";
  ctx.fillText(statusLabel, pillX + 17, pillY + 16);
  ctx.letterSpacing = "0px";

  const avatarImg = await loadImage(profile?.avatar_url);
  const r = 76, cx = M + r, cy = 236;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, PALETTE.blue);
  ring.addColorStop(1, PALETTE.purple);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = PALETTE.navy;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = "700 62px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((profile?.username || "?")[0].toUpperCase(), cx, cy + 4);
  }
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const nameX = cx + r + 36;
  ctx.fillStyle = PALETTE.text;
  ctx.font = "800 56px -apple-system, system-ui, sans-serif";
  const nameMax = W - M - nameX;
  ctx.fillText(fitText(ctx, profile?.username || "Trader", nameMax), nameX, cy - 4);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = "500 24px -apple-system, system-ui, sans-serif";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;
  ctx.fillText(joined ? `Member since ${joined}` : "StrikeJournal member", nameX, cy + 32);

  const divY = 372;
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(M, divY); ctx.lineTo(W - M, divY); ctx.stroke();

  const statsTop = divY + 44;
  const stats = [
    {
      label: "WIN RATE",
      value: tradingStats?.win_rate != null ? `${tradingStats.win_rate}%` : "—",
      sub: tradingStats?.win_rate != null ? "All-time" : "No trades yet",
    },
    {
      label: "FAVORITE PAIR",
      value: tradingStats?.favorite_asset || "—",
      sub: tradingStats?.favorite_asset ? "Most traded" : "Not available yet",
    },
    {
      label: "BADGES",
      value: String(badges.length).padStart(2, "0"),
      sub: badges.length ? "Achievements" : "None yet",
    },
  ];
  const gap = 20;
  const colW = (W - 2 * M - gap * 2) / 3;
  const statH = 168;
  stats.forEach((s, i) => {
    const x = M + i * (colW + gap);
    roundRect(ctx, x, statsTop, colW, statH, 20);
    ctx.fillStyle = PALETTE.navy;
    ctx.fill();
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = PALETTE.textFaint;
    ctx.font = "700 15px -apple-system, system-ui, sans-serif";
    ctx.letterSpacing = "1px";
    ctx.fillText(s.label, x + 22, statsTop + 36);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = PALETTE.text;
    const valueSize = s.value.length > 5 ? 34 : 44;
    ctx.font = `800 ${valueSize}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, s.value, colW - 44), x + 22, statsTop + 92);

    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = "500 17px -apple-system, system-ui, sans-serif";
    ctx.fillText(fitText(ctx, s.sub, colW - 44), x + 22, statsTop + 128);
  });

  const badgesTop = statsTop + statH + 56;
  ctx.fillStyle = PALETTE.textFaint;
  ctx.font = "700 15px -apple-system, system-ui, sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillText("ACHIEVEMENTS", M, badgesTop);
  ctx.letterSpacing = "0px";

  const listTop = badgesTop + 28;
  const rowH = 74, rowGap = 14;
  const maxRows = Math.min(badges.length, 6);

  if (badges.length === 0) {
    roundRect(ctx, M, listTop, W - 2 * M, 88, 18);
    ctx.fillStyle = PALETTE.navy;
    ctx.fill();
    ctx.strokeStyle = PALETTE.lineSoft;
    ctx.stroke();
    ctx.fillStyle = PALETTE.textMuted;
    ctx.font = "500 22px -apple-system, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("No achievements unlocked yet", M + 26, listTop + 44);
    ctx.textBaseline = "alphabetic";
  } else {
    badges.slice(0, maxRows).forEach((b, i) => {
      const y = listTop + i * (rowH + rowGap);
      const color = accentFor(b.color);
      roundRect(ctx, M, y, W - 2 * M, rowH, 18);
      ctx.fillStyle = PALETTE.navy;
      ctx.fill();
      ctx.strokeStyle = PALETTE.lineSoft;
      ctx.lineWidth = 1;
      ctx.stroke();

      const chipR = 22;
      roundRect(ctx, M + 16, y + (rowH - chipR * 2) / 2, chipR * 2, chipR * 2, 12);
      ctx.fillStyle = color === PALETTE.purple ? PALETTE.purpleSoft : PALETTE.blueSoft;
      ctx.fill();
      drawGlyph(ctx, b.id || "", M + 16 + chipR, y + rowH / 2, 18, color);

      ctx.fillStyle = PALETTE.text;
      ctx.font = "700 24px -apple-system, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      const textX = M + 16 + chipR * 2 + 20;
      ctx.fillText(fitText(ctx, b.label, W - M - 40 - textX), textX, y + rowH / 2);
      ctx.textBaseline = "alphabetic";
    });

    if (badges.length > maxRows) {
      const moreY = listTop + maxRows * (rowH + rowGap) - rowGap + 30;
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = "500 20px -apple-system, system-ui, sans-serif";
      ctx.fillText(`+${badges.length - maxRows} more`, M, moreY);
    }
  }

  const footY = H - 56;
  ctx.strokeStyle = PALETTE.lineSoft;
  ctx.beginPath(); ctx.moveTo(M, footY - 30); ctx.lineTo(W - M, footY - 30); ctx.stroke();

  drawWordmark(ctx, M, footY, 0.85);
  ctx.fillStyle = PALETTE.textFaint;
  ctx.font = "500 20px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("strikejournal.com", W - M, footY - 4);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function downloadShareCard(args) {
  const blob = await generateShareCard(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(args.profile?.username || "trader").toLowerCase()}-strike-card.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
