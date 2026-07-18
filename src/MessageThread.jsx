import React, { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, MessageCircle, Image as ImageIcon, Trash2, ChevronLeft, CheckCheck } from "lucide-react";
import { fetchDirectMessages, sendDirectMessage, subscribeToDirectMessages, uploadDmImage, deleteDirectMessage } from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

function timeShort(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// Groups consecutive messages into day buckets, and marks whether each message
// starts a new "run" from the same sender (for avatar/name grouping like iMessage/Slack).
function groupMessages(messages) {
  const days = [];
  let lastDay = null, lastSender = null, lastTime = 0;
  for (const m of messages) {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) {
      days.push({ day, label: dayLabel(m.created_at), items: [] });
      lastDay = day;
      lastSender = null;
    }
    const gapMs = new Date(m.created_at).getTime() - lastTime;
    const startsRun = m.sender_id !== lastSender || gapMs > 5 * 60 * 1000;
    days[days.length - 1].items.push({ ...m, startsRun });
    lastSender = m.sender_id;
    lastTime = new Date(m.created_at).getTime();
  }
  return days;
}

export default function MessageThread({ currentUserId, currentUsername, otherUser, onClose, onBack, className = "" }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const seenIds = useRef(new Set());

  const scrollToBottom = (behavior = "smooth") => bottomRef.current?.scrollIntoView({ behavior });

  useEffect(() => {
    if (!otherUser) return;
    setLoading(true);
    seenIds.current = new Set();
    fetchDirectMessages(currentUserId, otherUser.id)
      .then((msgs) => {
        msgs.forEach((m) => seenIds.current.add(m.id));
        setMessages(msgs);
      })
      .catch((err) => setError(err.message || "Failed to load messages."))
      .finally(() => {
        setLoading(false);
        setTimeout(() => scrollToBottom("auto"), 0);
      });

    const unsubscribe = subscribeToDirectMessages(currentUserId, (msg) => {
      if (msg.sender_id !== otherUser.id) return;
      if (seenIds.current.has(msg.id)) return;
      seenIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollToBottom("smooth"), 0);
    });

    return unsubscribe;
  }, [otherUser?.id, currentUserId]);

  if (!otherUser) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Image must be under 8MB."); return; }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelImage = () => { setImageFile(null); setImagePreview(null); };

  const send = async () => {
    const body = text.trim();
    if (!body && !imageFile) return;
    setSending(true);
    setText("");
    const fileToSend = imageFile;
    cancelImage();
    try {
      let imageUrl = null;
      if (fileToSend) {
        setUploadingImage(true);
        imageUrl = await uploadDmImage(fileToSend, currentUserId);
        setUploadingImage(false);
      }
      const saved = await sendDirectMessage(currentUserId, otherUser.id, body || null, currentUsername, imageUrl);
      if (!seenIds.current.has(saved.id)) {
        seenIds.current.add(saved.id);
        setMessages((prev) => [...prev, saved]);
        setTimeout(() => scrollToBottom("smooth"), 0);
      }
    } catch (err) {
      setError(err.message || "Failed to send. Please try again.");
      setText(body);
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (m) => {
    setMenuOpenId(null);
    setDeletingId(m.id);
    try {
      const updated = await deleteDirectMessage(m.id, currentUserId);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
    } catch (err) {
      setError(err.message || "Failed to delete message.");
    } finally {
      setDeletingId(null);
    }
  };

  const dayGroups = groupMessages(messages);
  const lastMineId = [...messages].reverse().find((m) => m.sender_id === currentUserId && !m.deleted)?.id;

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0 bg-[var(--bg-primary)]/40">
        {onBack && (
          <button onClick={onBack} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors -ml-1">
            <ChevronLeft size={20} />
          </button>
        )}
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
            {(otherUser.username || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{otherUser.username}</h3>
          <p className="text-[11px] text-[var(--text-muted)]">Direct message</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5 shrink-0">{error}</div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto tj-scrollbar p-4 space-y-4 min-h-0">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3"><MessageCircle size={20} className="text-[var(--text-muted)]" /></div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No messages yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Say hello to {otherUser.username}.</p>
          </div>
        ) : (
          dayGroups.map((group) => (
            <div key={group.day} className="space-y-1">
              <div className="flex items-center justify-center py-1">
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-0.5">{group.label}</span>
              </div>
              {group.items.map((m) => {
                const mine = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${m.startsRun ? "mt-3" : "mt-0.5"}`}>
                    <div className="relative group max-w-[78%] sm:max-w-[65%]">
                      {mine && !m.deleted && (
                        <button onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                          className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 transition-opacity"
                          title="Delete message">
                          {deletingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                      {mine && menuOpenId === m.id && (
                        <div className="absolute right-0 -top-9 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                          <button onClick={() => handleDelete(m)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:bg-white/[0.06] whitespace-nowrap">
                            <Trash2 size={12} /> Delete for everyone
                          </button>
                        </div>
                      )}
                      {!mine && group.items[0] === m && (
                        <div className="text-[11px] font-medium text-[var(--text-muted)] mb-0.5 ml-1">{otherUser.username}</div>
                      )}
                      <div className={`rounded-2xl px-3.5 py-2 shadow-sm ${
                        mine ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-white/[0.07] text-[var(--text-primary)]"
                      } ${m.deleted ? "opacity-60 italic" : ""}`}>
                        {m.deleted ? (
                          <p className="text-sm">Message deleted</p>
                        ) : (
                          <>
                            {m.image_url && (
                              <img src={m.image_url} alt="" className="rounded-lg max-h-72 max-w-full mb-1 object-contain" />
                            )}
                            {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>}
                          </>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-[var(--text-muted)] ${mine ? "justify-end mr-1" : "ml-1"}`}>
                        <span>{timeShort(m.created_at)}</span>
                        {mine && m.id === lastMineId && <CheckCheck size={11} className="text-[var(--accent)]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {imagePreview && (
        <div className="px-4 pt-3 shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="" className="h-20 rounded-lg border border-white/10 object-cover" />
            <button onClick={cancelImage}
              className="absolute -top-2 -right-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-full p-1 text-[var(--text-secondary)] hover:text-rose-400">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 sm:p-4 flex items-end gap-2 border-t border-white/10 shrink-0 bg-[var(--bg-primary)]/40">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={sending}
          className="flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-[var(--text-secondary)] p-2.5 rounded-lg transition-all shrink-0"
          title="Attach photo">
          <ImageIcon size={16} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          className={`${inputCls} resize-none max-h-32`}
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button onClick={send} disabled={sending || uploadingImage || (!text.trim() && !imageFile)}
          className="flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-40 text-[var(--text-inverse)] p-2.5 rounded-lg transition-all shrink-0">
          {sending || uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
