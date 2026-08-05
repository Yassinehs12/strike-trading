import React, { useState, useEffect, useCallback } from "react";
import { Users, Loader2, MessageCircle, UserX, Check, X as XIcon, UserPlus } from "lucide-react";
import { fetchFriends, fetchPendingFriendRequests, acceptFriendRequest, removeFriendship } from "./db";
import { useOnlineUsers } from "./lib/presence";
import DirectMessageModal from "./DirectMessageModal";
import UserProfileModal from "./UserProfileModal";

// Deterministic color per person so avatars aren't uniformly gray —
// same hash approach used nowhere else yet, kept local since it's a
// one-line cosmetic helper, not worth its own shared module.
const AVATAR_HUES = [
  "bg-blue-500/20 text-blue-300", "bg-violet-500/20 text-violet-300", "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300", "bg-rose-500/20 text-rose-300", "bg-cyan-500/20 text-cyan-300",
];
const hueFor = (str) => AVATAR_HUES[(str || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUES.length];

const Avatar = ({ profile, size = 44, online }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    {profile?.avatar_url ? (
      <img src={profile.avatar_url} alt="" className="rounded-full object-cover w-full h-full" />
    ) : (
      <div className={`rounded-full flex items-center justify-center font-bold w-full h-full ${hueFor(profile?.username)}`} style={{ fontSize: size * 0.36 }}>
        {(profile?.username || "?")[0].toUpperCase()}
      </div>
    )}
    {online && (
      <span
        className="absolute bottom-0 right-0 rounded-full bg-emerald-400 ring-2"
        style={{ width: size * 0.28, height: size * 0.28, "--tw-ring-color": "var(--bg-secondary)" }}
      />
    )}
  </div>
);

export default function FriendsPage({ session, profile }) {
  const currentUserId = session.user.id;
  const currentUsername = profile?.username;
  const onlineIds = useOnlineUsers();

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

  // Online friends surface first — that's the whole point of showing presence.
  const sortedFriends = [...friends].sort((a, b) => {
    const aOn = onlineIds.has(a.otherId), bOn = onlineIds.has(b.otherId);
    if (aOn !== bOn) return aOn ? -1 : 1;
    return new Date(b.since) - new Date(a.since);
  });
  const onlineCount = friends.filter((f) => onlineIds.has(f.otherId)).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {error && <div className="mb-4 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
      ) : (
        <>
          {requests.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)]">Pending Requests</h2>
                <span className="text-[10px] font-bold bg-[var(--accent)] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {requests.length}
                </span>
              </div>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--accent)]/25 rounded-xl px-3.5 py-3 shadow-sm">
                    <button onClick={() => setViewingUserId(req.requester_id)} className="shrink-0">
                      <Avatar profile={req.requester} size={40} online={onlineIds.has(req.requester_id)} />
                    </button>
                    <button onClick={() => setViewingUserId(req.requester_id)} className="min-w-0 flex-1 text-left">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">{req.requester?.username || "Unknown trader"}</span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><UserPlus size={11} /> wants to be friends</span>
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

          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)]">Your Friends</h2>
            {friends.length > 0 && (
              <span className="text-[10px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {friends.length}
              </span>
            )}
            {onlineCount > 0 && (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {onlineCount} online
              </span>
            )}
          </div>

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
              {sortedFriends.map((f) => {
                const online = onlineIds.has(f.otherId);
                return (
                  <div key={f.friendshipId}
                    className="group flex items-center gap-3 bg-[var(--bg-secondary)] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-3 shadow-sm transition-colors">
                    <button onClick={() => setViewingUserId(f.otherId)} className="shrink-0">
                      <Avatar profile={f.profile} size={44} online={online} />
                    </button>
                    <button onClick={() => setViewingUserId(f.otherId)} className="min-w-0 flex-1 text-left">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">{f.profile.username}</span>
                      <span className={`text-xs ${online ? "text-emerald-400 font-medium" : "text-[var(--text-muted)]"}`}>
                        {online ? "Online now" : `Friends since ${new Date(f.since).toLocaleDateString([], { month: "short", year: "numeric" })}`}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setDmTarget(f.profile)}
                        title="Message"
                        className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] text-[var(--text-secondary)] flex items-center justify-center transition-colors">
                        <MessageCircle size={15} />
                      </button>
                      <button onClick={() => handleRemoveFriend(f)} disabled={removingId === f.friendshipId}
                        title="Remove friend"
                        className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-rose-500/15 text-[var(--text-tertiary)] hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-50">
                        {removingId === f.friendshipId ? <Loader2 size={14} className="animate-spin" /> : <UserX size={15} />}
                      </button>
                    </div>
                  </div>
                );
              })}
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
