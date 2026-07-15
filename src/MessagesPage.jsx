import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Mail } from "lucide-react";
import { fetchConversations, fetchProfileById } from "./db";
import DirectMessageModal from "./DirectMessageModal";

const Card = ({ className = "", children, ...rest }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`} {...rest}>{children}</div>
);

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

export default function MessagesPage({ session, profile }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeUser, setActiveUser] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchConversations(session.user.id)
      .then(async (convos) => {
        const withProfiles = await Promise.all(
          convos.map(async (c) => {
            const profile = await fetchProfileById(c.otherId).catch(() => null);
            return { ...c, profile };
          })
        );
        setConversations(withProfiles.filter((c) => c.profile));
      })
      .catch((err) => setError(err.message || "Failed to load messages."))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-xl">
      <p className="text-sm text-zinc-500">Your private conversations with other traders.</p>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
      ) : conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3"><Mail size={20} className="text-zinc-500" /></div>
          <p className="text-sm font-semibold text-zinc-300">No conversations yet</p>
          <p className="text-xs text-zinc-500 mt-1">Message someone from their profile to start one.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Card key={c.otherId} className="p-3.5 flex items-center gap-3 cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => setActiveUser(c.profile)}>
              {c.profile.avatar_url ? (
                <img src={c.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                  {(c.profile.username || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-100 truncate">{c.profile.username}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {c.lastMessage.sender_id === session.user.id ? "You: " : ""}{c.lastMessage.body}
                </div>
              </div>
              <div className="text-xs text-zinc-600 shrink-0">{timeAgo(c.lastMessage.created_at)}</div>
            </Card>
          ))}
        </div>
      )}

      {activeUser && (
        <DirectMessageModal currentUserId={session.user.id} currentUsername={profile?.username || "Trader"} otherUser={activeUser} onClose={() => { setActiveUser(null); load(); }} />
      )}
    </div>
  );
}
