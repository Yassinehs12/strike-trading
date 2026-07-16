import React, { useState, useEffect, useRef } from "react";
import { Loader2, Camera, LineChart, MessagesSquare, CalendarDays } from "lucide-react";
import { updateProfileDetails, uploadAvatar, fetchOwnStats, fetchPublicBadgeStats } from "./db";
import Badges, { computeBadges } from "./Badges";

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
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchOwnStats(session.user.id).then(setStats).catch(() => {});
    fetchPublicBadgeStats(session.user.id).then(setBadgeStats).catch(() => {});
  }, [session.user.id]);

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
          <Badges size="sm" className="justify-center mt-3" badges={computeBadges(badgeStats)} />
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
