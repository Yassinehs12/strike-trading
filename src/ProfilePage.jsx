import React, { useState, useEffect, useRef } from "react";
import { Loader2, Camera, LineChart, MessagesSquare, CalendarDays, Target, Star, Copy, Check, Users, Eye, EyeOff, ImageDown } from "lucide-react";
import { updateProfileDetails, uploadAvatar, fetchOwnStats, fetchPublicBadgeStats, fetchPublicTradingStats, setShowPublicStats, fetchMyInviteInfo, fetchMemberBadges } from "./db";
import Badges, { computeBadges, mergeBadges } from "./Badges";
import { downloadShareCard } from "./ShareCard";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

const Card = ({ className = "", children, ...rest }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`} {...rest}>{children}</div>
);

const SectionHeader = ({ title, subtitle, icon, noMargin }) => (
  <div className={noMargin ? "" : "mb-4"}>
    <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
      {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
      {title}
    </h3>
    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{subtitle}</p>}
  </div>
);

export default function ProfilePage({ session, profile, onProfileUpdate, toast }) {
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [badgeStats, setBadgeStats] = useState(null);
  const [tradingStats, setTradingStats] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [manualBadges, setManualBadges] = useState([]);
  const [showStats, setShowStats] = useState(profile?.show_public_stats !== false);
  const [statsToggleLoading, setStatsToggleLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const fileInputRef = useRef(null);

  const shareCard = async () => {
    setGeneratingCard(true);
    try {
      await downloadShareCard({
        profile,
        badges: mergeBadges(computeBadges(badgeStats), manualBadges),
        tradingStats,
      });
      toast?.("Card downloaded — share it anywhere", "success");
    } catch (err) {
      toast?.("Failed to generate card.", "error");
    } finally {
      setGeneratingCard(false);
    }
  };

  useEffect(() => {
    fetchOwnStats(session.user.id).then(setStats).catch(() => {});
    fetchPublicBadgeStats(session.user.id).then(setBadgeStats).catch(() => {});
    fetchPublicTradingStats(session.user.id).then(setTradingStats).catch(() => {});
    fetchMyInviteInfo(session.user.id).then(setInviteInfo).catch(() => {});
    fetchMemberBadges(session.user.id).then(setManualBadges).catch(() => {});
  }, [session.user.id]);

  const toggleShowStats = async () => {
    const next = !showStats;
    setStatsToggleLoading(true);
    try {
      const updated = await setShowPublicStats(session.user.id, next);
      setShowStats(next);
      onProfileUpdate(updated);
    } catch (err) {
      toast?.(err.message || "Failed to update privacy setting.", "error");
    } finally {
      setStatsToggleLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteInfo?.invite_code) return;
    const link = `${window.location.origin}?ref=${inviteInfo.invite_code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveBio = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateProfileDetails(session.user.id, { bio: bio.trim() });
      onProfileUpdate(updated);
      toast?.("Profile saved", "success");
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setError("");
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, session.user.id);
      const updated = await updateProfileDetails(session.user.id, { avatarUrl: url });
      onProfileUpdate(updated);
      toast?.("Avatar updated", "success");
    } catch (err) {
      setError(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header / identity card */}
      <Card className="overflow-hidden">
        <div className="h-24 md:h-28 w-full bg-gradient-to-r from-[var(--accent)]/25 via-[var(--accent)]/10 to-transparent relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,var(--accent)/20,transparent_60%)]" />
        </div>
        <div className="px-6 md:px-8 pb-6 md:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 md:-mt-14">
            <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-[var(--bg-secondary)] shadow-lg" />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[var(--bg-tertiary)] border-4 border-[var(--bg-secondary)] shadow-lg flex items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">
                  {(profile?.username || "?")[0].toUpperCase()}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0.5 right-0.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] rounded-full p-1.5 border-2 border-[var(--bg-secondary)] shadow-md transition-colors">
                {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </div>

            <div className="flex-1 min-w-0 pb-1 sm:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-[var(--text-primary)] text-xl md:text-2xl tracking-tight">{profile?.username}</h2>
                {badgeStats && (
                  <Badges size="sm" badges={mergeBadges(computeBadges(badgeStats), manualBadges)} />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                <CalendarDays size={12} /> Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"}
              </div>
            </div>

            <button onClick={shareCard} disabled={generatingCard}
              className="flex items-center justify-center gap-2 shrink-0 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 disabled:opacity-40 text-[var(--accent)] font-semibold text-sm px-4 py-2.5 rounded-lg border border-[var(--accent)]/20 transition-all">
              {generatingCard ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
              {generatingCard ? "Generating..." : "Share Card"}
            </button>
          </div>

          {stats && (
            <div className="flex items-center gap-6 md:gap-10 mt-6 pt-5 border-t border-[var(--border-primary)]">
              <div>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{stats.tradeCount}</div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-0.5"><LineChart size={11} /> Trades Logged</div>
              </div>
              <div className="w-px h-8 bg-[var(--border-primary)]" />
              <div>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{stats.postCount}</div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-0.5"><MessagesSquare size={11} /> Community Posts</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bio */}
      <Card className="p-5 md:p-6">
        <SectionHeader title="About" subtitle="A short blurb other traders will see on your public profile." />
        <textarea rows={4} maxLength={280} className={inputCls} placeholder="Tell other traders about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[var(--text-faint)] tabular-nums">{bio.length}/280</span>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
        <button onClick={saveBio} disabled={saving}
          className="flex items-center gap-2 mt-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          Save Bio
        </button>
      </Card>

      {/* Trading resume + Invite, side by side on larger screens */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <SectionHeader title="Trading Resume" icon={<Target size={14} />} noMargin />
            <button onClick={toggleShowStats} disabled={statsToggleLoading}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors shrink-0 mt-0.5">
              {showStats ? <Eye size={12} /> : <EyeOff size={12} />} {showStats ? "Public" : "Hidden"}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">Aggregate stats shown on your public profile. Individual trades and PnL are never shared.</p>
          {tradingStats && tradingStats.total_closed_trades > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5"><Target size={12} /> Win Rate</div>
                <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{tradingStats.win_rate != null ? `${tradingStats.win_rate}%` : "—"}</div>
              </div>
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5"><Star size={12} /> Favorite Pair</div>
                <div className="text-xl font-bold text-[var(--text-primary)]">{tradingStats.favorite_asset || "—"}</div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-primary)] border border-dashed border-[var(--border-primary)] rounded-lg p-4 text-center">
              <p className="text-xs text-[var(--text-faint)]">Log some closed trades to build your public trading resume.</p>
            </div>
          )}
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader title="Invite Friends" icon={<Users size={14} />} subtitle="Share your link — friends who join through it count toward your referrals." />
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)] truncate">
              {inviteInfo?.invite_code ? `${window.location.origin}?ref=${inviteInfo.invite_code}` : "Loading..."}
            </code>
            <button onClick={copyInviteLink} disabled={!inviteInfo?.invite_code}
              className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-40 text-[var(--text-primary)] font-semibold text-xs px-3 py-2.5 rounded-lg transition-all shrink-0">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            <span className="font-bold text-[var(--text-primary)] tabular-nums">{inviteInfo?.referral_count ?? 0}</span> trader{(inviteInfo?.referral_count ?? 0) === 1 ? "" : "s"} joined using your link
          </div>
        </Card>
      </div>

      <p className="text-xs text-[var(--text-faint)] text-center pt-1">Want to change your username or password? Head to Settings.</p>
    </div>
  );
}
