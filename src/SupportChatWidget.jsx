import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import {
  getOrCreateSupportConversation, fetchSupportMessages, sendSupportMessage,
  markSupportConversationRead, subscribeToSupportMessages,
} from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

export default function SupportChatWidget({ session, profile }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);

  // Lazily create/fetch the conversation the first time the widget opens,
  // rather than on every page load — most visits never touch support.
  useEffect(() => {
    if (!open || !session?.user?.id || conversation) return;
    setLoading(true);
    getOrCreateSupportConversation(session.user.id)
      .then(async (convo) => {
        setConversation(convo);
        const msgs = await fetchSupportMessages(convo.id);
        setMessages(msgs);
        if (convo.unread_by_user) {
          await markSupportConversationRead(convo.id, "user");
          setHasUnread(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, session, conversation]);

  // Poll lightly for unread replies even while the widget is closed, so the
  // badge dot can appear without the user having to open it first. Cheap:
  // only fires once per mount, not a real-time subscription until opened.
  useEffect(() => {
    if (!session?.user?.id) return;
    getOrCreateSupportConversation(session.user.id)
      .then((convo) => { setConversation(convo); setHasUnread(!!convo.unread_by_user); })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!conversation) return;
    const unsub = subscribeToSupportMessages(conversation.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_role === "admin") {
        if (open) markSupportConversationRead(conversation.id, "user").catch(() => {});
        else setHasUnread(true);
      }
    });
    return unsub;
  }, [conversation, open]);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  // Safety net: realtime should deliver new messages instantly, but if a
  // subscription silently fails to attach (e.g. timing edge cases with
  // channel setup) there'd be no other sign of it — so poll for anything
  // realtime might have missed while the widget is open. Cheap and only
  // runs while actually looking at the chat.
  useEffect(() => {
    if (!open || !conversation) return;
    const interval = setInterval(() => {
      fetchSupportMessages(conversation.id)
        .then((fresh) => {
          setMessages((prev) => (fresh.length !== prev.length ? fresh : prev));
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [open, conversation]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !conversation) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendSupportMessage(conversation.id, session.user.id, "user", body);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  if (!session?.user?.id) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[340px] max-w-[calc(100vw-2.5rem)] h-[440px] bg-[var(--bg-secondary)] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[var(--accent)]/10 shrink-0">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Strike Journal Support</p>
              <p className="text-[11px] text-[var(--text-faint)]">We usually reply within a day</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close support chat">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto tj-scrollbar p-3 space-y-2.5">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-[var(--text-tertiary)]">Have a question or found a bug?</p>
                <p className="text-xs text-[var(--text-faint)] mt-1">Send us a message and we'll get back to you here.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender_role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-[var(--text-faint)] px-1 mb-0.5">
                    {m.sender_role === "user" ? (profile?.username || "You") : "Strike Journal Team"}
                  </span>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                    m.sender_role === "user" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-white/[0.06] text-[var(--text-primary)]"
                  }`}>
                    {m.body}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 p-2.5 border-t border-white/10 shrink-0">
            <input
              className={inputCls}
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <button onClick={send} disabled={sending || !draft.trim() || loading} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] p-2.5 rounded-lg transition-colors shrink-0">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-95 text-[var(--text-inverse)] shadow-lg flex items-center justify-center transition-all"
        aria-label="Open support chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && hasUnread && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[var(--bg-primary)]" />
        )}
      </button>
    </>
  );
}
