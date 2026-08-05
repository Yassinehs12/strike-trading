import React, { useState, useEffect, useCallback } from "react";
import { Users, Loader2, MessageCircle, UserX, Check, X as XIcon, UserCircle } from "lucide-react";
import { fetchFriends, fetchPendingFriendRequests, acceptFriendRequest, removeFriendship } from "./db";
import DirectMessageModal from "./DirectMessageModal";
import UserProfileModal from "./UserProfileModal";

const Avatar = ({ profile, size = 44 }) =>
  profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-[var(--text-secondary)] shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {(profile?.username || "?")[0].toUpperCase()}
    </div>
  );

export default function FriendsPage({ session, profile }) {
  const currentUserId = session.user.id;
  const currentUsername = profile?.username;

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [dmTarget, setDmTarget] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchFriends(currentUserId), fetchPendingFriendRequests(currentUserId)])
      .then(([f, r]) => { setFriends(f); setRequests(r); })
      .catch((err) => setError(err.message || "Failed to load friends."))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (req) => {
    setAcceptingId(req.id);
    try {
      await acceptFriendRequest(req.id, currentUsername);
      load();
    } catch (err) {
      setError(err.message || "Failed to accept request.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (req) => {
    setAcceptingId(req.id);
    try {
      await removeFriendship(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      setError(err.message || "Failed to decline request.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRemoveFriend = async (f) => {
    if (!window.confirm(`Remove ${f.profile.username} from your friends?`)) return;
    setRemovingId(f.friendshipId);
    try {
      await removeFriendship(f.friendshipId);
      setFriends((prev) => prev.filter((x) => x.friendshipId !== f.friendshipId));
    } catch (err) {
      setError(err.message || "Failed to remove friend.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {error && <div className="mb-4 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
      ) : (
        <>
          {requests.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)] mb-2.5">
                Friend Requests ({requests.length})
              </h2>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-white/10 rounded-xl px-3.5 py-3">
                    <button onClick={() => setViewingUserId(req.requester_id)} className="shrink-0">
                      <Avatar profile={req.requester} size={40} />
                    </button>
                    <button onClick={() => setViewingUserId(req.requester_id)} className="min-w-0 flex-1 text-left">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">{req.requester?.username || "Unknown trader"}</span>
                      <span className="text-xs text-[var(--text-muted)]">wants to be friends</span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleAccept(req)} disabled={acceptingId === req.id}
                        className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-colors disabled:opacity-50">
                        {acceptingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                      </button>
                      <button onClick={() => handleDecline(req)} disabled={acceptingId === req.id}
                        className="w-8 h-8 rounded-lg bg-white/[0.06] text-[var(--text-tertiary)] hover:bg-white/[0.1] flex items-center justify-center transition-colors disabled:opacity-50">
                        <XIcon size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)] mb-2.5">
            {friends.length > 0 ? `Your Friends (${friends.length})` : "Your Friends"}
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-14 px-4 bg-[var(--bg-secondary)] border border-white/10 rounded-xl">
              <div className="w-11 h-11 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
                <Users size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">No friends yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Visit someone's profile in the Community to add them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.friendshipId} className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-white/10 rounded-xl px-3.5 py-3">
                  <button onClick={() => setViewingUserId(f.otherId)} className="shrink-0">
                    <Avatar profile={f.profile} size={44} />
                  </button>
                  <button onClick={() => setViewingUserId(f.otherId)} className="min-w-0 flex-1 text-left">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">{f.profile.username}</span>
                    <span className="text-xs text-[var(--text-muted)]">Friends since {new Date(f.since).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setDmTarget(f.profile)}
                      title="Message"
                      className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] flex items-center justify-center transition-colors">
                      <MessageCircle size={15} />
                    </button>
                    <button onClick={() => handleRemoveFriend(f)} disabled={removingId === f.friendshipId}
                      title="Remove friend"
                      className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-rose-500/15 text-[var(--text-tertiary)] hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-50">
                      {removingId === f.friendshipId ? <Loader2 size={14} className="animate-spin" /> : <UserX size={15} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {dmTarget && (
        <DirectMessageModal currentUserId={currentUserId} currentUsername={currentUsername} otherUser={dmTarget} onClose={() => setDmTarget(null)} />
      )}
      {viewingUserId && (
        <UserProfileModal userId={viewingUserId} currentUserId={currentUserId} currentUsername={currentUsername} onClose={() => { setViewingUserId(null); load(); }} />
      )}
    </div>
  );
}
