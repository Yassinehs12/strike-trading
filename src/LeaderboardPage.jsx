import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, Medal, Percent } from "lucide-react";
import { fetchLeaderboard } from "./db";

const Card = ({ className = "", children, ...rest }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`} {...rest}>{children}</div>
);

const fmtUSD = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const medalColor = (i) => (i === 0 ? "text-yellow-400" : i === 1 ? "text-[var(--text-secondary)]" : i === 2 ? "text-amber-600" : "text-[var(--text-faint)]");

export default function LeaderboardPage({ session, profile, onViewProfile, onGoToSettings }) {
  const [period, setPeriod] = useState("week");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetchLeaderboard(period)
      .then(setRows)
      .catch((err) => setError(err.message || "Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const optedIn = !!profile?.leaderboard_opt_in;
  const myIndex = rows.findIndex((r) => r.user_id === session?.user?.id);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[var(--text-muted)]">Ranked by net P&amp;L among traders who've opted in. Minimum 3 trades in the period.</p>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
          {["week", "month"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${period === p ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {!optedIn && (
        <Card className="p-4 flex items-center justify-between gap-3 flex-wrap border-[var(--accent)]/20">
          <p className="text-sm text-[var(--text-tertiary)]">Your trading results stay private by default. Opt in from Settings to show up here.</p>
          {onGoToSettings && (
            <button onClick={onGoToSettings} className="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] font-semibold text-xs px-3 py-1.5 rounded-lg transition-all">
              Go to Settings
            </button>
          )}
        </Card>
      )}

      {optedIn && myIndex === -1 && !loading && (
        <Card className="p-4 border-white/10">
          <p className="text-sm text-[var(--text-tertiary)]">You're opted in, but haven't logged enough qualifying trades this {period} yet (minimum 3).</p>
        </Card>
      )}

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3"><Trophy size={20} className="text-[var(--text-muted)]" /></div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No rankings yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Be the first opted-in trader to log qualifying trades this {period}.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-white/10 overflow-hidden">
          {rows.map((r, i) => {
            const mine = r.user_id === session?.user?.id;
            return (
              <button key={r.user_id} onClick={() => onViewProfile?.(r.user_id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left ${mine ? "bg-[var(--accent)]/5" : ""}`}>
                <div className={`w-7 text-center font-bold tj-mono ${medalColor(i)}`}>{i < 3 ? <Medal size={16} className="mx-auto" /> : i + 1}</div>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{(r.username || "?")[0].toUpperCase()}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {r.username}{mine && <span className="text-[var(--text-muted)] font-normal"> (you)</span>}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{r.trade_count} trades</div>
                </div>
                <div className="text-right">
                  <div className={`tj-mono text-sm font-bold ${r.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.net_pnl >= 0 ? "+" : ""}{fmtUSD(r.net_pnl)}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-[var(--text-muted)]"><Percent size={10} /> {r.win_rate}% win rate</div>
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
