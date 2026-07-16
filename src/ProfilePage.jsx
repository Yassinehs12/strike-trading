import React, { useState, useEffect, useRef } from "react";
import { Loader2, Camera, LineChart, MessagesSquare, CalendarDays, Target, Star, Copy, Check, Users, Eye, EyeOff, ImageDown } from "lucide-react";
import { updateProfileDetails, uploadAvatar, fetchOwnStats, fetchPublicBadgeStats, fetchPublicTradingStats, setShowPublicStats, fetchMyInviteInfo, fetchMemberBadges } from "./db";
import Badges, { computeBadges, mergeBadges } from "./Badges";
import { downloadShareCard } from "./ShareCard";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition-colors";

const Card = ({ className = "", children, ...rest }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`} {...rest}>{children}</div>
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
    <div className="p-4 md:p-6 max-w-xl space-y-5">
      <Card className="p-6 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-300">
              {(profile?.username || "?")[0].toUpperCase()}
            </div>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-400 text-zinc-950 rounded-full p-1.5 border-2 border-zinc-900 transition-colors">
            {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
        </div>
        <h2 className="font-bold text-zinc-100 text-lg">{profile?.username}</h2>
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 mt-1">
          <CalendarDays size={12} /> Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
        </div>
        {badgeStats && (
          <Badges size="sm" className="justify-center mt-3" badges={mergeBadges(computeBadges(badgeStats), manualBadges)} />
        )}

        {stats && (
          <div className="flex items-center justify-center gap-8 mt-5 pt-5 border-t border-white/10">
            <div>
              <div className="text-lg font-bold text-zinc-100">{stats.tradeCount}</div>
              <div className="flex items-center gap-1 text-xs text-zinc-500"><LineChart size={11} /> Trades</div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-100">{stats.postCount}</div>
              <div className="flex items-center gap-1 text-xs text-zinc-500"><MessagesSquare size={11} /> Posts</div>
            </div>
          </div>
        )}

        <button onClick={shareCard} disabled={generatingCard}
          className="flex items-center justify-center gap-2 w-full mt-5 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-40 text-blue-400 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
          {generatingCard ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
          {generatingCard ? "Generating..." : "Download Share Card"}
        </button>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-zinc-100 text-sm">Trading Resume</h3>
          <button onClick={toggleShowStats} disabled={statsToggleLoading}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors">
            {showStats ? <Eye size={12} /> : <EyeOff size={12} />} {showStats ? "Visible to others" : "Hidden from others"}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Aggregate stats shown on your public profile. Individual trades and PnL are never shared.</p>
        {tradingStats && tradingStats.total_closed_trades > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1"><Target size={12} /> Win Rate</div>
              <div className="text-lg font-bold text-zinc-100">{tradingStats.win_rate != null ? `${tradingStats.win_rate}%` : "—"}</div>
            </div>
            <div className="bg-zinc-950 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1"><Star size={12} /> Favorite Pair</div>
              <div className="text-lg font-bold text-zinc-100">{tradingStats.favorite_asset || "—"}</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Log some closed trades to build your public trading resume.</p>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-zinc-100 text-sm mb-1 flex items-center gap-1.5"><Users size={14} /> Invite Friends</h3>
        <p className="text-xs text-zinc-500 mb-4">Share your link — friends who join through it count toward your referrals.</p>
        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 truncate">
            {inviteInfo?.invite_code ? `${window.location.origin}?ref=${inviteInfo.invite_code}` : "Loading..."}
          </code>
          <button onClick={copyInviteLink} disabled={!inviteInfo?.invite_code}
            className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-zinc-200 font-semibold text-xs px-3 py-2 rounded-lg transition-all">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="text-xs text-zinc-500">
          <span className="font-bold text-zinc-200">{inviteInfo?.referral_count ?? 0}</span> trader{(inviteInfo?.referral_count ?? 0) === 1 ? "" : "s"} joined using your link
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-zinc-100 text-sm mb-1">Bio</h3>
        <p className="text-xs text-zinc-500 mb-4">A short blurb other traders will see on your public profile.</p>
        <textarea rows={4} maxLength={280} className={inputCls} placeholder="Tell other traders about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="text-xs text-zinc-600 mt-1 mb-3">{bio.length}/280</div>
        {error && <p className="text-xs text-rose-400 mb-3">{error}</p>}
        <button onClick={saveBio} disabled={saving}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 active:scale-[0.98] text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          Save Bio
        </button>
      </Card>

      <p className="text-xs text-zinc-600 text-center">Want to change your username or password? Head to Settings.</p>
    </div>
  );
}
