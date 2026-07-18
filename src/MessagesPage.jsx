import React, { useState, useEffect, useCallback, useRef } from "react";
import { Mail, Loader2, Search, SquarePen, MessageCircle } from "lucide-react";
import { fetchConversations, fetchProfileById, searchProfilesByUsername } from "./db";
import MessageThread from "./MessageThread";

function timeShort(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const Avatar = ({ profile, size = 44 }) => (
  profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-[var(--text-secondary)] shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {(profile?.username || "?")[0].toUpperCase()}
    </div>
  )
);

// New-conversation popover: search for a trader by username to start a chat.
const NewMessagePopover = ({ onClose, onPick }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const handle = setTimeout(() => {
      searchProfilesByUsername(q, 8)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-secondary)] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search traders by username..."
            className="w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600" />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto tj-scrollbar">
        {searching ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="text-[var(--accent)] animate-spin" /></div>
        ) : !query.trim() ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-6 px-4">Start typing to find someone to message.</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-6 px-4">No traders found for "{query}".</p>
        ) : (
          results.map((p) => (
            <button key={p.id} onClick={() => onPick(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] transition-colors text-left">
              <Avatar profile={p} size={32} />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{p.username}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default function MessagesPage({ session, profile }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [query, setQuery] = useState("");
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchConversations(session.user.id)
      .then(async (convos) => {
        const withProfiles = await Promise.all(
          convos.map(async (c) => {
            const p = await fetchProfileById(c.otherId).catch(() => null);
            return { ...c, profile: p };
          })
        );
        setConversations(withProfiles.filter((c) => c.profile));
      })
      .catch((err) => setError(err.message || "Failed to load messages."))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = conversations.filter((c) =>
    !query.trim() || (c.profile.username || "").toLowerCase().includes(query.trim().toLowerCase())
  );

  const openConversation = (p) => {
    setActiveUser(p);
    setNewMsgOpen(false);
  };

  const handleThreadClose = () => {
    setActiveUser(null);
    load();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Conversation list */}
      <div className={`w-full sm:w-[340px] shrink-0 border-r border-white/10 flex flex-col ${activeUser ? "hidden sm:flex" : "flex"}`}>
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Messages</h2>
            <div className="relative">
              <button onClick={() => setNewMsgOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors">
                <SquarePen size={13} /> New
              </button>
              {newMsgOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNewMsgOpen(false)} />
                  <NewMessagePopover onClose={() => setNewMsgOpen(false)} onPick={openConversation} />
                </>
              )}
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations..."
              className="w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors" />
          </div>
        </div>

        {error && <div className="mx-3 mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex-1 overflow-y-auto tj-scrollbar">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-11 h-11 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3"><Mail size={18} className="text-[var(--text-muted)]" /></div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">{conversations.length === 0 ? "No conversations yet" : "No matches"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{conversations.length === 0 ? "Search for a trader above to start one." : "Try a different search."}</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = activeUser?.id === c.otherId;
              return (
                <button key={c.otherId} onClick={() => openConversation(c.profile)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-2 transition-colors ${
                    isActive ? "bg-[var(--accent)]/[0.08] border-[var(--accent)]" : "border-transparent hover:bg-white/[0.04]"
                  }`}>
                  <Avatar profile={c.profile} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.profile.username}</span>
                      <span className="text-[11px] text-[var(--text-muted)] shrink-0">{timeShort(c.lastMessage.created_at)}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {c.lastMessage.deleted ? <span className="italic">Message deleted</span> : (
                        <>{c.lastMessage.sender_id === session.user.id ? "You: " : ""}{c.lastMessage.image_url && !c.lastMessage.body ? "📷 Photo" : c.lastMessage.body}</>
                      )}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread pane */}
      <div className={`flex-1 min-w-0 ${activeUser ? "flex" : "hidden sm:flex"}`}>
        {activeUser ? (
          <MessageThread
            currentUserId={session.user.id}
            currentUsername={profile?.username || "Trader"}
            otherUser={activeUser}
            onBack={handleThreadClose}
            className="w-full"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] border border-white/10 flex items-center justify-center mb-4">
              <MessageCircle size={22} className="text-[var(--text-faint)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Your messages</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">Select a conversation, or start a new one to message another trader directly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
