import React, { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Flame, ShieldCheck, TrendingUp, Target, Loader2, Share2, Check, UserX } from "lucide-react";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";
import { fetchPublicProfileByUsername, fetchPublicReportCard } from "./db";

const StatTile = ({ icon: Icon, label, value, accent = "text-[var(--text-primary)]" }) => (
  <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
    <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs mb-1.5">
      <Icon size={12} /> {label}
    </div>
    <p className={`text-2xl font-extrabold tj-mono ${accent}`}>{value}</p>
  </div>
);

const NotFoundState = ({ username }) => (
  <div className="flex flex-col items-center justify-center text-center py-24 px-4">
    <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
      <UserX size={22} className="text-[var(--text-muted)]" />
    </div>
    <h1 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">
      {username ? `@${username} isn't public` : "Profile not found"}
    </h1>
    <p className="text-sm text-[var(--text-muted)] max-w-sm">
      Either this trader hasn't turned on their public report card yet, or the username doesn't exist.
    </p>
    <a href="#/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline">
      <ArrowLeft size={14} /> Back to Strike Journal
    </a>
  </div>
);

export default function ReportCardPage({ username }) {
  const [status, setStatus] = useState("loading"); // loading | ready | not_found
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchPublicProfileByUsername(username);
        if (cancelled) return;
        if (!p) { setStatus("not_found"); return; }
        setProfile(p);
        const s = await fetchPublicReportCard(p.id);
        if (cancelled) return;
        setStats(s);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("not_found");
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="rc-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .rc-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2">
            <LogoFull size={26} textClass="text-sm" />
          </a>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a href="#/" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={14} /> Back to site
            </a>
          </div>
        </div>
      </header>

      {status === "loading" && (
        <div className="flex justify-center py-24">
          <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {status === "not_found" && <NotFoundState username={username} />}

      {status === "ready" && (
        <main className="max-w-2xl mx-auto px-4 py-10 md:py-14">
          {/* Identity */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-2xl font-extrabold text-white shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username?.[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold truncate">@{profile.username}</h1>
                {stats.is_funded && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <ShieldCheck size={11} /> Funded
                  </span>
                )}
              </div>
              {profile.bio && <p className="text-sm text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{profile.bio}</p>}
              {joined && <p className="text-xs text-[var(--text-faint)] mt-1">Trading journal since {joined}</p>}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatTile
              icon={TrendingUp}
              label="Win Rate"
              value={stats.win_rate != null ? `${stats.win_rate}%` : "—"}
              accent={stats.win_rate != null && stats.win_rate >= 50 ? "text-emerald-400" : "text-[var(--text-primary)]"}
            />
            <StatTile icon={Target} label="Trades Logged" value={stats.trade_count ?? stats.total_closed_trades ?? 0} />
            <StatTile icon={Flame} label="Active Last 30 Days" value={`${stats.streak_days ?? 0} days`} accent="text-orange-400" />
            <StatTile icon={Trophy} label="Favorite Asset" value={stats.favorite_asset || "—"} />
          </div>

          <p className="text-[11px] text-[var(--text-faint)] leading-relaxed mb-8">
            Stats are computed from real logged trades. No dollar amounts or individual trades are shown publicly —
            this trader chose to share only these aggregate numbers.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all"
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              {copied ? "Copied" : "Share this report card"}
            </button>
            <a href="#/" className="text-sm font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              Start your own →
            </a>
          </div>
        </main>
      )}

      <footer className="border-t border-white/5 py-8 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-xs text-[var(--text-faint)] text-center">
          © {new Date().getFullYear()} Strike Journal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
