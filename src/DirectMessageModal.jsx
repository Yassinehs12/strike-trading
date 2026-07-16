import React, { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, MessageCircle, Image as ImageIcon, Trash2 } from "lucide-react";
import { fetchDirectMessages, sendDirectMessage, subscribeToDirectMessages, uploadDmImage, deleteDirectMessage } from "./db";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition-colors";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DirectMessageModal({ currentUserId, currentUsername, otherUser, onClose }) {
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
      if (msg.sender_id !== otherUser.id) return; // only messages from this conversation
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-zinc-900 border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                {(otherUser.username || "?")[0].toUpperCase()}
              </div>
            )}
            <h3 className="font-bold text-zinc-100">{otherUser.username}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
        </div>

        {error && <div className="mx-4 mt-3 text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3"><MessageCircle size={20} className="text-zinc-500" /></div>
              <p className="text-sm font-semibold text-zinc-300">No messages yet</p>
              <p className="text-xs text-zinc-500 mt-1">Say hello to {otherUser.username}.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="relative group max-w-[80%]">
                    {mine && !m.deleted && (
                      <div className="relative inline-block">
                        <button onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                          className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity"
                          title="Delete message">
                          {deletingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    )}
                    {mine && menuOpenId === m.id && (
                      <div className="absolute right-0 -top-9 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                        <button onClick={() => handleDelete(m)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:bg-white/[0.06] whitespace-nowrap">
                          <Trash2 size={12} /> Delete for everyone
                        </button>
                      </div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 ${mine ? "bg-blue-500 text-zinc-950" : "bg-white/[0.06] text-zinc-200"} ${m.deleted ? "opacity-60 italic" : ""}`}>
                      <div className={`text-[11px] font-semibold mb-0.5 ${mine ? "text-zinc-950/70" : "text-zinc-400"}`}>
                        {mine ? currentUsername : otherUser.username}
                      </div>
                      {m.deleted ? (
                        <p className="text-sm">Message deleted</p>
                      ) : (
                        <>
                          {m.image_url && (
                            <img src={m.image_url} alt="" className="rounded-lg max-h-64 max-w-full mb-1 object-contain" />
                          )}
                          {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>}
                        </>
                      )}
                      <div className={`text-[10px] mt-1 ${mine ? "text-zinc-950/60" : "text-zinc-500"}`}>{timeAgo(m.created_at)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {imagePreview && (
          <div className="px-3 pt-3 shrink-0">
            <div className="relative inline-block">
              <img src={imagePreview} alt="" className="h-20 rounded-lg border border-white/10 object-cover" />
              <button onClick={cancelImage}
                className="absolute -top-2 -right-2 bg-zinc-800 border border-white/10 rounded-full p-1 text-zinc-300 hover:text-rose-400">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="p-3 flex items-center gap-2 border-t border-white/10 shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={sending}
            className="flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-zinc-300 p-2.5 rounded-lg transition-all shrink-0"
            title="Attach photo">
            <ImageIcon size={16} />
          </button>
          <input className={`${inputCls} flex-1`} placeholder="Type a message..." value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button onClick={send} disabled={sending || uploadingImage || (!text.trim() && !imageFile)}
            className="flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-zinc-950 p-2.5 rounded-lg transition-all shrink-0">
            {sending || uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
