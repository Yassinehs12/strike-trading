import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, ChevronRight, HelpCircle, Home as HomeIcon, Search } from "lucide-react";
import {
  getOrCreateSupportConversation, fetchSupportMessages, sendSupportMessage,
  markSupportConversationRead, subscribeToSupportMessages,
} from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

export default function SupportChatWidget({ session, profile, hideLauncher = false }) {
  const [open, setOpen] = useState(false);
  // "home" = greeting screen (Wave-style), "chat" = the actual conversation.
  const [screen, setScreen] = useState("home");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(""); // used both for chat input and the home-screen "ask a question" box
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);

  // Lazily create/fetch the conversation the first time it's actually
  // needed (opening the widget), rather than on every page load — most
  // visits never touch support.
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
  // badge dot can appear without the user having to open it first.
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
        if (open && screen === "chat") markSupportConversationRead(conversation.id, "user").catch(() => {});
        else setHasUnread(true);
      }
    });
    return unsub;
  }, [conversation, open, screen]);

  useEffect(() => { if (open && screen === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, screen]);

  // Safety net: realtime should deliver new messages instantly, but poll
  // lightly while the chat screen is actually open in case a subscription
  // silently failed to attach.
  useEffect(() => {
    if (!open || screen !== "chat" || !conversation) return;
    const interval = setInterval(() => {
      fetchSupportMessages(conversation.id)
        .then((fresh) => setMessages((prev) => (fresh.length !== prev.length ? fresh : prev)))
        .catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [open, screen, conversation]);

  const send = async (bodyOverride) => {
    const body = (bodyOverride ?? draft).trim();
    if (!body || !conversation) return;
    setSending(true);
    setDraft("");
    setScreen("chat");
    try {
      const msg = await sendSupportMessage(conversation.id, session.user.id, "user", body);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => { if (hideLauncher) setOpen(false); }, [hideLauncher]);
  useEffect(() => { if (!open) setScreen("home"); }, [open]);

  if (!session?.user?.id) return null;

  const goToMessages = () => { setScreen("chat"); if (conversation?.unread_by_user) { markSupportConversationRead(conversation.id, "user").catch(() => {}); setHasUnread(false); } };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[340px] max-w-[calc(100vw-2.5rem)] h-[500px] bg-[var(--bg-secondary)] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {screen === "home" ? (
            <>
              {/* Greeting header — gradient banner, matches the "Hi there" style but in the app's own accent color rather than copying anyone's brand. */}
              <div className="relative shrink-0 px-5 pt-6 pb-8" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}>
                <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors" aria-label="Close support">
                  <X size={14} />
                </button>
                <p className="text-white/80 text-sm">Hi{profile?.username ? ` ${profile.username}` : ""} 👋</p>
                <p className="text-white text-xl font-bold mt-0.5">How can we help?</p>
              </div>

              <div className="flex-1 overflow-y-auto tj-scrollbar px-4 -mt-4 space-y-2.5">
                <button onClick={goToMessages} className="w-full bg-[var(--bg-secondary)] border border-white/10 hover:border-[var(--accent)]/40 rounded-xl p-3.5 flex items-center gap-3 text-left shadow-lg transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
                    <MessageCircle size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Ask a question</p>
                    <p className="text-xs text-[var(--text-muted)]">We usually reply within a day</p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-faint)] shrink-0" />
                  {hasUnread && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                </button>

                <a href="/#faq" onClick={() => setOpen(false)} className="w-full bg-[var(--bg-secondary)] border border-white/10 hover:border-[var(--accent)]/40 rounded-xl p-3.5 flex items-center gap-3 text-left shadow-lg transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
                    <HelpCircle size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Browse FAQ</p>
                    <p className="text-xs text-[var(--text-muted)]">Common questions, answered</p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-faint)] shrink-0" />
                </a>

                <div className="pt-1 pb-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                    <input
                      className="w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)]"
                      placeholder="Search for help or ask anything..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) send(); }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
                <button onClick={() => setScreen("home")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Back">
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="flex-1 min-w-0">
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
                <button onClick={() => send()} disabled={sending || !draft.trim() || loading} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] p-2.5 rounded-lg transition-colors shrink-0">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}

          {/* Bottom nav — Home / Messages, matching the two screens above. */}
          <div className="flex items-center border-t border-white/10 shrink-0">
            <button onClick={() => setScreen("home")} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${screen === "home" ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"}`}>
              <HomeIcon size={16} />
              Home
            </button>
            <button onClick={goToMessages} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium relative transition-colors ${screen === "chat" ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"}`}>
              <MessageCircle size={16} />
              Messages
              {hasUnread && <span className="absolute top-1 right-[calc(50%-14px)] w-1.5 h-1.5 rounded-full bg-rose-500" />}
            </button>
          </div>
        </div>
      )}

      {!hideLauncher && (
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
      )}
    </>
  );
}
