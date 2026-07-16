import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Ban, Clock, Trash2, Search, Loader2, Users, MessagesSquare, Radio, X, ShieldOff, CheckCircle2, Star,
} from "lucide-react";
import {
  fetchAllProfilesAdmin, setUserAdmin, banUser, unbanUser, timeoutUser,
  fetchForumPosts, adminDeleteForumPost, fetchChatMessages, adminDeleteChatMessage,
  fetchPendingSpotlights, approveSpotlight, rejectSpotlight,
} from "./db";
import AdminBadge from "./AdminBadge";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition-colors";

const Card = ({ className = "", children, ...rest }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`} {...rest}>{children}</div>
);

const TIMEOUT_OPTIONS = [
  { label: "15 minutes", ms: 15 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusPill({ user }) {
  const isTimedOut = user.timeout_until && new Date(user.timeout_until) > new Date();
  if (user.is_banned) {
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold"><Ban size={10} /> Banned</span>;
  }
  if (isTimedOut) {
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold"><Clock size={10} /> Timed out</span>;
  }
  return null;
}

const UserRow = ({ u, isSelf, onPromote, onBan, onUnban, onTimeout, onClearTimeout, busy }) => {
  const [timeoutMenuOpen, setTimeoutMenuOpen] = useState(false);
  const isTimedOut = u.timeout_until && new Date(u.timeout_until) > new Date();

  return (
    <Card className="p-3.5 flex items-center gap-3 flex-wrap">
      {u.avatar_url ? (
        <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
          {(u.username || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-zinc-100 truncate">{u.username || "Unknown"}</span>
          {u.is_admin && <AdminBadge />}
          <StatusPill user={u} />
        </div>
        <div className="text-xs text-zinc-500">
          Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
          {u.is_banned && u.ban_reason ? ` · Reason: ${u.ban_reason}` : ""}
          {isTimedOut ? ` · Until ${new Date(u.timeout_until).toLocaleString()}` : ""}
        </div>
      </div>

      {isSelf ? (
        <span className="text-xs text-zinc-600 shrink-0">This is you</span>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button onClick={() => onPromote(u)} disabled={busy}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-40 ${u.is_admin ? "text-zinc-400 hover:text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1]" : "text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15"}`}>
            {u.is_admin ? <ShieldOff size={12} /> : <ShieldCheck size={12} />} {u.is_admin ? "Demote" : "Make Admin"}
          </button>

          <div className="relative">
            <button onClick={() => setTimeoutMenuOpen((o) => !o)} disabled={busy}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 transition-colors disabled:opacity-40">
              <Clock size={12} /> {isTimedOut ? "Update Timeout" : "Timeout"}
            </button>
            {timeoutMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                {TIMEOUT_OPTIONS.map((opt) => (
                  <button key={opt.label} onClick={() => { onTimeout(u, opt.ms); setTimeoutMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/[0.06] transition-colors">
                    {opt.label}
                  </button>
                ))}
                {isTimedOut && (
                  <button onClick={() => { onClearTimeout(u); setTimeoutMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-white/[0.06] transition-colors border-t border-white/10">
                    Clear timeout
                  </button>
                )}
              </div>
            )}
          </div>

          {u.is_banned ? (
            <button onClick={() => onUnban(u)} disabled={busy}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors disabled:opacity-40">
              <CheckCircle2 size={12} /> Unban
            </button>
          ) : (
            <button onClick={() => onBan(u)} disabled={busy}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 transition-colors disabled:opacity-40">
              <Ban size={12} /> Ban
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export default function AdminPanel({ session, profile, toast }) {
  const [tab, setTab] = useState("users"); // "users" | "content"
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [posts, setPosts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentQuery, setContentQuery] = useState("");

  const [spotlights, setSpotlights] = useState([]);
  const [spotlightsLoading, setSpotlightsLoading] = useState(true);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    fetchAllProfilesAdmin()
      .then(setUsers)
      .catch((err) => setError(err.message || "Failed to load users."))
      .finally(() => setUsersLoading(false));
  }, []);

  const loadContent = useCallback(() => {
    setContentLoading(true);
    Promise.all([fetchForumPosts(), fetchChatMessages()])
      .then(([p, m]) => { setPosts(p); setChatMessages(m); })
      .catch((err) => setError(err.message || "Failed to load content."))
      .finally(() => setContentLoading(false));
  }, []);

  const loadSpotlights = useCallback(() => {
    setSpotlightsLoading(true);
    fetchPendingSpotlights()
      .then(setSpotlights)
      .catch((err) => setError(err.message || "Failed to load spotlight submissions."))
      .finally(() => setSpotlightsLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (tab === "content") loadContent(); }, [tab, loadContent]);
  useEffect(() => { if (tab === "spotlight") loadSpotlights(); }, [tab, loadSpotlights]);

  const withBusy = async (id, fn) => {
    setBusyId(id);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Action failed.");
      notify(err.message || "Action failed.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handlePromote = (u) =>
    withBusy(u.id, async () => {
      const updated = await setUserAdmin(u.id, !u.is_admin);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      notify(updated.is_admin ? `${u.username} is now an admin` : `${u.username} is no longer an admin`);
    });

  const handleBan = (u) =>
    withBusy(u.id, async () => {
      const updated = await banUser(u.id, "Banned via admin panel");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      notify(`${u.username} banned`);
    });

  const handleUnban = (u) =>
    withBusy(u.id, async () => {
      const updated = await unbanUser(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      notify(`${u.username} unbanned`);
    });

  const handleTimeout = (u, ms) =>
    withBusy(u.id, async () => {
      const updated = await timeoutUser(u.id, ms);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      notify(`${u.username} timed out`);
    });

  const handleClearTimeout = (u) =>
    withBusy(u.id, async () => {
      const updated = await timeoutUser(u.id, null);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      notify(`Timeout cleared for ${u.username}`);
    });

  const handleDeletePost = (id) =>
    withBusy(`post-${id}`, async () => {
      await adminDeleteForumPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      notify("Post deleted");
    });

  const handleDeleteChatMsg = (id) =>
    withBusy(`chat-${id}`, async () => {
      await adminDeleteChatMessage(id);
      setChatMessages((prev) => prev.filter((m) => m.id !== id));
      notify("Message deleted");
    });

  const handleApproveSpotlight = (s) =>
    withBusy(`spotlight-${s.id}`, async () => {
      await approveSpotlight(s.id, session.user.id);
      setSpotlights((prev) => prev.filter((x) => x.id !== s.id));
      notify(`Pinned ${s.username}'s trade as Trade of the Week`);
    });

  const handleRejectSpotlight = (s) =>
    withBusy(`spotlight-${s.id}`, async () => {
      await rejectSpotlight(s.id, session.user.id);
      setSpotlights((prev) => prev.filter((x) => x.id !== s.id));
      notify("Submission rejected");
    });

  const filteredUsers = users.filter((u) => (u.username || "").toLowerCase().includes(query.trim().toLowerCase()));
  const filteredPosts = posts.filter((p) => {
    if (!contentQuery.trim()) return true;
    const q = contentQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.username.toLowerCase().includes(q);
  });
  const filteredChat = chatMessages.filter((m) => {
    if (!contentQuery.trim()) return true;
    const q = contentQuery.toLowerCase();
    return m.body.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <p className="text-sm text-zinc-500">Manage users and moderate community content.</p>

      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
        <button onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "users" ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
          <Users size={14} /> Users
        </button>
        <button onClick={() => setTab("content")}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "content" ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
          <MessagesSquare size={14} /> Content
        </button>
        <button onClick={() => setTab("spotlight")}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "spotlight" ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
          <Star size={14} /> Spotlight{spotlights.length > 0 ? ` (${spotlights.length})` : ""}
        </button>
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {tab === "users" && (
        <div className="space-y-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input className={`${inputCls} pl-8`} placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {usersLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <Card className="p-12 text-center text-sm text-zinc-500">No users found.</Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <UserRow key={u.id} u={u} isSelf={u.id === session.user.id} busy={busyId === u.id}
                  onPromote={handlePromote} onBan={handleBan} onUnban={handleUnban}
                  onTimeout={handleTimeout} onClearTimeout={handleClearTimeout} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-5">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input className={`${inputCls} pl-8`} placeholder="Search posts & messages..." value={contentQuery} onChange={(e) => setContentQuery(e.target.value)} />
          </div>

          {contentLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><MessagesSquare size={14} /> Community Posts</h3>
                {filteredPosts.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-zinc-500">No posts found.</Card>
                ) : (
                  <div className="space-y-2">
                    {filteredPosts.map((p) => (
                      <Card key={p.id} className="p-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-100 truncate">{p.title}</div>
                          <div className="text-xs text-zinc-500 truncate">{p.username} · {timeAgo(p.created_at)}</div>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{p.body}</p>
                        </div>
                        <button onClick={() => handleDeletePost(p.id)} disabled={busyId === `post-${p.id}`}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 transition-colors shrink-0 disabled:opacity-40">
                          <Trash2 size={12} /> Delete
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><Radio size={14} /> Live Chat</h3>
                {filteredChat.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-zinc-500">No messages found.</Card>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {filteredChat.slice().reverse().map((m) => (
                      <Card key={m.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">{m.username} · {timeAgo(m.created_at)}</div>
                          <p className="text-sm text-zinc-300 truncate">{m.body}</p>
                        </div>
                        <button onClick={() => handleDeleteChatMsg(m.id)} disabled={busyId === `chat-${m.id}`}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 transition-colors shrink-0 disabled:opacity-40">
                          <X size={12} />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "spotlight" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Traders submit journaled trades from their Trade Journal. Approving one pins it to the top of the Community forum, replacing any currently active spotlight.</p>
          {spotlightsLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : spotlights.length === 0 ? (
            <Card className="p-12 text-center text-sm text-zinc-500">No pending submissions.</Card>
          ) : (
            <div className="space-y-2">
              {spotlights.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-zinc-100">
                        <span className="font-semibold">{s.username}</span>
                        <span className="text-zinc-600">·</span>
                        <span>{s.asset}</span>
                        <span className={s.direction === "Long" ? "text-emerald-400" : "text-rose-400"}>{s.direction}</span>
                      </div>
                      {s.notes && <p className="text-sm text-zinc-400 mt-1">{s.notes}</p>}
                      <div className="text-xs text-zinc-500 mt-1">Submitted {timeAgo(s.submitted_at)}</div>
                    </div>
                    <span className={`text-sm font-bold ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {s.pnl >= 0 ? "+" : ""}{Number(s.pnl).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {s.screenshot && <img src={s.screenshot} alt="" className="mt-3 w-full max-h-56 object-contain rounded-lg border border-white/10" />}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproveSpotlight(s)} disabled={busyId === `spotlight-${s.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors disabled:opacity-40">
                      <CheckCircle2 size={12} /> Pin as Trade of the Week
                    </button>
                    <button onClick={() => handleRejectSpotlight(s)} disabled={busyId === `spotlight-${s.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 transition-colors disabled:opacity-40">
                      <X size={12} /> Reject
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
