import React, { useState, useEffect } from "react";
import { X, Loader2, CalendarDays, MessagesSquare, UserPlus, Check, Clock, MessageCircle } from "lucide-react";
import { fetchProfileById, fetchPublicPostCount, fetchFriendship, sendFriendRequest, acceptFriendRequest } from "./db";
import DirectMessageModal from "./DirectMessageModal";

export default function UserProfileModal({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [postCount, setPostCount] = useState(null);
  const [friendship, setFriendship] = useState(undefined); // undefined = loading, null = none
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [dmOpen, setDmOpen] = useState(false);

  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    if (!userId) return;
    setProfile(undefined);
    setPostCount(null);
    setFriendship(undefined);
    setError("");
    setDmOpen(false);
    const calls = [fetchProfileById(userId), fetchPublicPostCount(userId)];
    if (!isOwnProfile) calls.push(fetchFriendship(currentUserId, userId));
    Promise.all(calls)
      .then(([p, count, fs]) => { setProfile(p); setPostCount(count); if (!isOwnProfile) setFriendship(fs || null); })
      .catch((err) => setError(err.message || "Failed to load profile."));
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
      const fs = await acceptFriendRequest(friendship.id);
      setFriendship(fs);
    } catch (err) {
      setError(err.message || "Failed to accept request.");
    } finally {
      setFriendActionLoading(false);
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
          <div className="flex items-center justify-end px-4 pt-4">
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
          </div>

          {profile === undefined ? (
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
              <h3 className="font-bold text-zinc-100 text-lg">{profile.username}</h3>
              {profile.bio && <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{profile.bio}</p>}

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 mt-3">
                <CalendarDays size={12} /> Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              </div>

              {postCount !== null && (
                <div className="flex items-center justify-center gap-6 mt-5 pt-5 border-t border-white/10">
                  <div>
                    <div className="text-lg font-bold text-zinc-100">{postCount}</div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500"><MessagesSquare size={11} /> Posts</div>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}

              {!isOwnProfile && (
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
        <DirectMessageModal currentUserId={currentUserId} otherUser={profile} onClose={() => setDmOpen(false)} />
      )}
    </>
  );
}
