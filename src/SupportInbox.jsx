import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import {
  fetchAllSupportConversations, fetchSupportMessages, sendSupportMessage,
  markSupportConversationRead, subscribeToAllSupportMessages, subscribeToSupportMessages,
} from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ConversationRow = ({ convo, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2.5 ${
      active ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" : "hover:bg-white/[0.04] border border-transparent"
    }`}
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
      {convo.profiles?.username?.[0]?.toUpperCase() || "?"}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{convo.profiles?.username || "Unknown user"}</span>
        {convo.unread_by_admin && <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />}
      </div>
      <p className="text-xs text-[var(--text-faint)]">{timeAgo(convo.last_message_at)}</p>
    </div>
  </button>
);

export default function SupportInbox({ session, toast }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const loadConversations = useCallback(() => {
    setLoading(true);
    fetchAllSupportConversations()
      .then(setConversations)
      .catch((err) => notify(err.message || "Failed to load support conversations", "error"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Bump the inbox in near-real-time when any user sends a new message.
  useEffect(() => {
    const unsub = subscribeToAllSupportMessages(() => loadConversations());
    return unsub;
  }, [loadConversations]);

  const openConversation = async (convo) => {
    setActiveConvo(convo);
    setMessages([]);
    try {
      const msgs = await fetchSupportMessages(convo.id);
      setMessages(msgs);
      if (convo.unread_by_admin) {
        await markSupportConversationRead(convo.id, "admin");
        setConversations((prev) => prev.map((c) => (c.id === convo.id ? { ...c, unread_by_admin: false } : c)));
      }
    } catch (err) {
      notify(err.message || "Failed to load conversation", "error");
    }
  };

  useEffect(() => {
    if (!activeConvo) return;
    const unsub = subscribeToSupportMessages(activeConvo.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_role === "user") markSupportConversationRead(activeConvo.id, "admin").catch(() => {});
    });
    return unsub;
  }, [activeConvo]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeConvo) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendSupportMessage(activeConvo.id, session.user.id, "admin", body);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      notify(err.message || "Failed to send message", "error");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = conversations.filter((c) => c.unread_by_admin).length;

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[600px]">
      {/* Conversation list */}
      <div className={`bg-white/[0.03] border border-white/10 rounded-xl p-2 overflow-y-auto tj-scrollbar ${activeConvo ? "hidden md:block" : ""}`}>
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
            <MessageCircle size={14} /> Support Inbox {unreadCount > 0 && <span className="text-[var(--accent)]">({unreadCount})</span>}
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-[var(--text-muted)]" /></div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-[var(--text-faint)] text-center py-8 px-3">No support conversations yet.</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((c) => (
              <ConversationRow key={c.id} convo={c} active={activeConvo?.id === c.id} onClick={() => openConversation(c)} />
            ))}
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl flex flex-col overflow-hidden">
        {!activeConvo ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-faint)]">
            Select a conversation to reply
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
              <button onClick={() => setActiveConvo(null)} className="md:hidden text-[var(--text-muted)]"><ArrowLeft size={16} /></button>
              <span className="text-sm font-bold text-[var(--text-primary)]">{activeConvo.profiles?.username || "Unknown user"}</span>
            </div>
            <div className="flex-1 overflow-y-auto tj-scrollbar p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender_role === "admin" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-white/[0.06] text-[var(--text-primary)]"
                  }`}>
                    {m.body}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-white/10 shrink-0">
              <input
                className={inputCls}
                placeholder="Reply..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button onClick={send} disabled={sending || !draft.trim()} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] p-2.5 rounded-lg transition-colors shrink-0">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
