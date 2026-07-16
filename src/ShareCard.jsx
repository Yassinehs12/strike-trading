// Generates a shareable 1080x1080 PNG "trading resume" card from a member's
// profile, badges, and public trading stats — pure Canvas API, no extra deps.

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
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateShareCard({ profile, badges = [], tradingStats }) {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#0a0a0c");
  bg.addColorStop(1, "#111114");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle accent glow
  const glow = ctx.createRadialGradient(SIZE * 0.8, SIZE * 0.15, 0, SIZE * 0.8, SIZE * 0.15, 500);
  glow.addColorStop(0, "rgba(59,130,246,0.18)");
  glow.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Wordmark
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
  ctx.fillText("STRIKE TRADING", 64, 80);

  // Avatar
  const avatarImg = await loadImage(profile?.avatar_url);
  const cx = 64 + 90, cy = 220, r = 90;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#27272a";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 70px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((profile?.username || "?")[0].toUpperCase(), cx, cy + 6);
  }
  ctx.restore();

  // Username + joined date
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.fillText(profile?.username || "Trader", 64 + 200, 205);

  ctx.fillStyle = "#71717a";
  ctx.font = "26px system-ui, sans-serif";
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";
  ctx.fillText(joined ? `Member since ${joined}` : "", 64 + 200, 245);

  // Stats row
  const statsY = 400;
  const stats = [
    { label: "WIN RATE", value: tradingStats?.win_rate != null ? `${tradingStats.win_rate}%` : "—" },
    { label: "FAVORITE PAIR", value: tradingStats?.favorite_asset || "—" },
    { label: "BADGES", value: String(badges.length) },
  ];
  const colW = (SIZE - 128) / 3;
  stats.forEach((s, i) => {
    const x = 64 + i * colW;
    roundRect(ctx, x, statsY, colW - 20, 140, 16);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    ctx.fillStyle = "#71717a";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(s.label, x + 24, statsY + 45);

    ctx.fillStyle = "#f4f4f5";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(s.value, x + 24, statsY + 95);
  });

  // Badges list
  ctx.fillStyle = "#71717a";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText("BADGES EARNED", 64, 610);

  let bx = 64, by = 640;
  const maxWidth = SIZE - 128;
  ctx.font = "600 24px system-ui, sans-serif";
  badges.slice(0, 10).forEach((b) => {
    const label = b.label;
    const padX = 22;
    const textW = ctx.measureText(label).width;
    const chipW = textW + padX * 2;
    if (bx + chipW > 64 + maxWidth) { bx = 64; by += 62; }
    roundRect(ctx, bx, by, chipW, 46, 23);
    ctx.fillStyle = "rgba(59,130,246,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(59,130,246,0.4)";
    ctx.stroke();
    ctx.fillStyle = "#93c5fd";
    ctx.fillText(label, bx + padX, by + 31);
    bx += chipW + 14;
  });

  // Footer
  ctx.fillStyle = "#52525b";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText("strike-trading.com", 64, SIZE - 60);

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
