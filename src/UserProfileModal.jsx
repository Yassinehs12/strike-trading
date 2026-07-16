import React, { useState, useEffect } from "react";
import { X, Loader2, CalendarDays, MessagesSquare, UserPlus, Check, Clock, MessageCircle, MoreVertical, Ban, Flag } from "lucide-react";
import { fetchProfileById, fetchPublicPostCount, fetchFriendship, sendFriendRequest, acceptFriendRequest, isUserBlocked, blockUser, unblockUser, submitReport, fetchPublicBadgeStats, fetchPublicTradingStats } from "./db";
import { Target, Star } from "lucide-react";
import DirectMessageModal from "./DirectMessageModal";
import AdminBadge from "./AdminBadge";
import Badges, { computeBadges } from "./Badges";

export default function UserProfileModal({ userId, currentUserId, currentUsername, onClose }) {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [postCount, setPostCount] = useState(null);
  const [friendship, setFriendship] = useState(undefined); // undefined = loading, null = none
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [dmOpen, setDmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [badgeStats, setBadgeStats] = useState(null);
  const [tradingStats, setTradingStats] = useState(null);

  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    if (!userId) return;
    setProfile(undefined);
    setPostCount(null);
    setFriendship(undefined);
    setError("");
    setDmOpen(false);
    setMenuOpen(false);
    setReportOpen(false);
    setReportSubmitted(false);
    setBadgeStats(null);
    const calls = [fetchProfileById(userId), fetchPublicPostCount(userId)];
    if (!isOwnProfile) calls.push(fetchFriendship(currentUserId, userId), isUserBlocked(currentUserId, userId));
    Promise.all(calls)
      .then(([p, count, fs, isBlocked]) => {
        setProfile(p); setPostCount(count);
        if (!isOwnProfile) { setFriendship(fs || null); setBlocked(!!isBlocked); }
      })
      .catch((err) => setError(err.message || "Failed to load profile."));
    fetchPublicBadgeStats(userId).then(setBadgeStats).catch(() => {});
    fetchPublicTradingStats(userId).then(setTradingStats).catch(() => setTradingStats(null));
  }, [userId]);

  if (!userId) return null;

  const handleAddFriend = async () => {
    setFriendActionLoading(true);
    try {
      const fs = await sendFriendRequest(currentUserId, userId);
      setFriendship(fs);
    } catch (err) {
      setError(err.message || "Failed to send friend request.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setFriendActionLoading(true);
    try {
      const fs = await acceptFriendRequest(friendship.id, currentUsername);
      setFriendship(fs);
    } catch (err) {
      setError(err.message || "Failed to accept request.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    try {
      if (blocked) { await unblockUser(currentUserId, userId); setBlocked(false); }
      else { await blockUser(currentUserId, userId); setBlocked(true); }
    } catch (err) {
      setError(err.message || "Failed to update block status.");
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await submitReport(currentUserId, "user", userId, reportReason.trim());
      setReportSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit report.");
    }
  };

  const renderFriendButton = () => {
    if (isOwnProfile || friendship === undefined) return null;
    if (friendship === null) {
      return (
        <button onClick={handleAddFriend} disabled={friendActionLoading}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all">
          {friendActionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add Friend
        </button>
      );
    }
    if (friendship.status === "pending" && friendship.requester_id === currentUserId) {
      return (
        <button disabled className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-400 font-semibold text-sm px-3.5 py-2 rounded-lg">
          <Clock size={14} /> Request Sent
        </button>
      );
    }
    if (friendship.status === "pending" && friendship.addressee_id === currentUserId) {
      return (
        <button onClick={handleAccept} disabled={friendActionLoading}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all">
          {friendActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept Request
        </button>
      );
    }
    return (
      <button disabled className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-400 font-semibold text-sm px-3.5 py-2 rounded-lg">
        <Check size={14} /> Friends
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
        <div className="bg-zinc-900 border border-white/10 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 pt-4">
            {!isOwnProfile && profile ? (
              <div className="relative">
                <button onClick={() => setMenuOpen((o) => !o)} className="text-zinc-500 hover:text-zinc-200"><MoreVertical size={18} /></button>
                {menuOpen && (
                  <div className="absolute left-0 mt-1 w-44 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                    <button onClick={toggleBlock} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06] transition-colors">
                      <Ban size={14} /> {blocked ? "Unblock" : "Block"} User
                    </button>
                    <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-400 hover:bg-white/[0.06] transition-colors">
                      <Flag size={14} /> Report User
                    </button>
                  </div>
                )}
              </div>
            ) : <span />}
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
          </div>

          {reportOpen ? (
            <div className="px-6 pb-6">
              <h3 className="font-bold text-zinc-100 text-sm mb-1">Report {profile?.username}</h3>
              {reportSubmitted ? (
                <p className="text-sm text-emerald-400 mt-3">Thanks — your report has been submitted for review.</p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-3">Tell us what's wrong. This is sent privately for review.</p>
                  <textarea rows={3} className="w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 mb-3"
                    placeholder="Describe the issue..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={handleReport} disabled={!reportReason.trim()}
                      className="flex-1 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-zinc-950 font-semibold text-sm py-2 rounded-lg transition-all">Submit Report</button>
                    <button onClick={() => setReportOpen(false)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 font-semibold text-sm py-2 rounded-lg transition-all">Cancel</button>
                  </div>
                </>
              )}
            </div>
          ) : profile === undefined ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : error && profile === undefined ? (
            <div className="px-6 pb-8 text-sm text-rose-400 text-center">{error}</div>
          ) : profile === null ? (
            <div className="px-6 pb-8 text-sm text-zinc-500 text-center">This trader's profile couldn't be found.</div>
          ) : (
            <div className="px-6 pb-6 text-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border border-white/10" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-zinc-300">
                  {(profile.username || "?")[0].toUpperCase()}
                </div>
              )}
              <h3 className="font-bold text-zinc-100 text-lg flex items-center justify-center gap-1.5">
                {profile.username} {profile.is_admin && <AdminBadge size="sm" />}
              </h3>
              {profile.bio && <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{profile.bio}</p>}
              {badgeStats && <Badges size="sm" className="justify-center mt-3" badges={computeBadges(badgeStats)} />}

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 mt-3">
                <CalendarDays size={12} /> Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              </div>

              {postCount !== null && (
                <div className="flex items-center justify-center gap-6 mt-5 pt-5 border-t border-white/10">
                  <div>
                    <div className="text-lg font-bold text-zinc-100">{postCount}</div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500"><MessagesSquare size={11} /> Posts</div>
                  </div>
                  {tradingStats && tradingStats.total_closed_trades > 0 && (
                    <>
                      <div>
                        <div className="text-lg font-bold text-zinc-100">{tradingStats.win_rate != null ? `${tradingStats.win_rate}%` : "—"}</div>
                        <div className="flex items-center gap-1 text-xs text-zinc-500"><Target size={11} /> Win Rate</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-zinc-100">{tradingStats.favorite_asset || "—"}</div>
                        <div className="flex items-center gap-1 text-xs text-zinc-500"><Star size={11} /> Top Pair</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
              {blocked && <p className="text-xs text-amber-400 mt-4">You've blocked this user. They can't message you.</p>}

              {!isOwnProfile && !blocked && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {renderFriendButton()}
                  <button onClick={() => setDmOpen(true)}
                    className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all">
                    <MessageCircle size={14} /> Message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {dmOpen && profile && (
        <DirectMessageModal currentUserId={currentUserId} currentUsername={currentUsername} otherUser={profile} onClose={() => setDmOpen(false)} />
      )}
    </>
  );
}
