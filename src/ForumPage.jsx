import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessagesSquare, Plus, X, Trash2, Send, Loader2, ArrowLeft, User, Clock, MessageCircle, Radio, ImagePlus, Search, Pencil, Check,
} from "lucide-react";
import {
  fetchForumPosts, insertForumPost, deleteForumPost, uploadForumImage, updateForumPost,
  fetchForumReplies, insertForumReply, deleteForumReply, updateForumReply,
  fetchChatMessages, insertChatMessage, subscribeToChatMessages, deleteChatMessage,
  fetchBlockedUserIds, fetchAdminUserIds,
} from "./db";
import UserProfileModal from "./UserProfileModal";
import AdminBadge from "./AdminBadge";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition-colors";

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

const NewPostModal = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const MAX_IMAGE_MB = 5;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { setError(`Image must be under ${MAX_IMAGE_MB}MB.`); return; }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setTitle(""); setBody(""); removeImage();
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setError("Both a title and a message are required."); return; }
    setError(""); setLoading(true);
    try {
      await onSubmit(title.trim(), body.trim(), imageFile);
      reset();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-zinc-900 border border-white/10 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-zinc-100">New Post</h3>
          <button onClick={() => { reset(); onClose(); }} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
            <input className={inputCls} placeholder="What's on your mind?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Message</label>
            <textarea rows={5} className={inputCls} placeholder="Share a setup, ask a question, talk strategy..." value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Image (optional)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-cover rounded-lg border border-white/10" />
                <button onClick={removeImage} className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/15 hover:border-blue-500/40 rounded-lg py-6 text-zinc-500 hover:text-zinc-300 transition-colors">
                <ImagePlus size={20} />
                <span className="text-xs">Click to add an image</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
          {error && <p className="text-xs text-rose-400 mb-3">{error}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm py-2.5 rounded-lg transition-all">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

const ThreadView = ({ post, currentUserId, onBack, onDeletePost, autoFocusReply, onViewProfile, onPostUpdated, isAdmin, adminIds = [], onDeleteReply }) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const replyInputRef = useRef(null);

  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetchForumReplies(post.id).then(setReplies).catch(() => {}).finally(() => setLoading(false));
  }, [post.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoFocusReply && !loading) {
      replyInputRef.current?.focus();
    }
  }, [autoFocusReply, loading]);

  const savePostEdit = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    const updated = await updateForumPost(post.id, editTitle.trim(), editBody.trim());
    onPostUpdated(updated);
    setEditingPost(false);
  };

  const startReplyEdit = (r) => { setEditingReplyId(r.id); setEditReplyText(r.body); };

  const saveReplyEdit = async (id) => {
    if (!editReplyText.trim()) return;
    const updated = await updateForumReply(id, editReplyText.trim());
    setReplies((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setEditingReplyId(null);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const saved = await insertForumReply(post.id, currentUserId.userId, currentUserId.username, replyText.trim(), post.user_id);
      setReplies((prev) => [...prev, saved]);
      setReplyText("");
    } catch (err) {
      // no-op — keep text so user can retry
    } finally {
      setSending(false);
    }
  };

  const removeReply = async (id) => {
    await deleteForumReply(id);
    setReplies((prev) => prev.filter((r) => r.id !== id));
    if (onDeleteReply) onDeleteReply(id);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
        <ArrowLeft size={15} /> Back to Community
      </button>

      <Card className="p-5">
        {editingPost ? (
          <div className="space-y-3 mb-2">
            <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
            <textarea rows={4} className={inputCls} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={savePostEdit} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-semibold text-xs px-3 py-1.5 rounded-md transition-all"><Check size={12} /> Save</button>
              <button onClick={() => { setEditingPost(false); setEditTitle(post.title); setEditBody(post.body); }} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg font-bold text-zinc-100">{post.title}</h2>
            {(post.user_id === currentUserId.userId || isAdmin) && (
              <div className="flex items-center gap-2.5 shrink-0">
                {post.user_id === currentUserId.userId && (
                  <button onClick={() => setEditingPost(true)} className="text-zinc-600 hover:text-blue-400 transition-colors"><Pencil size={15} /></button>
                )}
                <button onClick={() => onDeletePost(post.id)} className="text-zinc-600 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <User size={12} />
          <button onClick={() => onViewProfile(post.user_id)} className="hover:text-blue-400 hover:underline transition-colors">{post.username}</button>
          {adminIds.includes(post.user_id) && <AdminBadge />}
          <span className="text-zinc-700">·</span> <Clock size={12} /> {timeAgo(post.created_at)}
          {post.edited_at && <span className="text-zinc-700">· edited</span>}
        </div>
        {!editingPost && (
          <>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{post.body}</p>
            {post.image_url && (
              <img src={post.image_url} alt="" className="mt-3 w-full max-h-96 object-contain rounded-lg border border-white/10" />
            )}
          </>
        )}
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">{replies.length} {replies.length === 1 ? "Reply" : "Replies"}</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="text-blue-500 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {replies.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <User size={11} /> <button onClick={() => onViewProfile(r.user_id)} className="font-medium text-zinc-300 hover:text-blue-400 hover:underline transition-colors">{r.username}</button>
                    {adminIds.includes(r.user_id) && <AdminBadge />}
                    <span className="text-zinc-700">·</span> {timeAgo(r.created_at)}
                    {r.edited_at && <span className="text-zinc-700">· edited</span>}
                  </div>
                  {(r.user_id === currentUserId.userId || isAdmin) && editingReplyId !== r.id && (
                    <div className="flex items-center gap-2.5 shrink-0">
                      {r.user_id === currentUserId.userId && (
                        <button onClick={() => startReplyEdit(r)} className="text-zinc-600 hover:text-blue-400 transition-colors"><Pencil size={12} /></button>
                      )}
                      <button onClick={() => removeReply(r.id)} className="text-zinc-600 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {editingReplyId === r.id ? (
                  <div className="space-y-2">
                    <textarea rows={2} className={inputCls} value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => saveReplyEdit(r.id)} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-semibold text-xs px-3 py-1.5 rounded-md transition-all"><Check size={12} /> Save</button>
                      <button onClick={() => setEditingReplyId(null)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                )}
              </Card>
            ))}
            {replies.length === 0 && <p className="text-sm text-zinc-600 text-center py-6">No replies yet — be the first to respond.</p>}
          </div>
        )}
      </div>

      <Card className="p-3 flex items-center gap-2 sticky bottom-4">
        <input ref={replyInputRef} className={`${inputCls} flex-1`} placeholder="Write a reply..." value={replyText}
          onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply()} />
        <button onClick={submitReply} disabled={sending || !replyText.trim()}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-zinc-950 p-2.5 rounded-lg transition-all shrink-0">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </Card>
    </div>
  );
};

const LiveChat = ({ currentUser, onViewProfile, blockedIds = [], isAdmin, adminIds = [] }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const seenIds = useRef(new Set());

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    setLoading(true);
    fetchChatMessages()
      .then((msgs) => {
        msgs.forEach((m) => seenIds.current.add(m.id));
        setMessages(msgs);
      })
      .catch((err) => setError(err.message || "Failed to load chat."))
      .finally(() => {
        setLoading(false);
        setTimeout(() => scrollToBottom("auto"), 0);
      });

    const unsubscribe = subscribeToChatMessages((msg) => {
      if (seenIds.current.has(msg.id)) return;
      seenIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollToBottom("smooth"), 0);
    });

    return unsubscribe;
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText("");
    try {
      const saved = await insertChatMessage(currentUser.userId, currentUser.username, body);
      // Add locally in case the realtime echo is slow/duplicate-guarded above
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
    }
  };

  const removeMessage = async (id) => {
    try {
      await deleteChatMessage(id);
      seenIds.current.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete message.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
      <div className="flex items-center gap-2 mb-3 text-xs text-emerald-400">
        <Radio size={12} className="animate-pulse" /> Live — messages appear in real time
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5 mb-3">{error}</div>}

      <Card className="flex-1 overflow-y-auto p-4 space-y-3 mb-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3"><MessageCircle size={20} className="text-zinc-500" /></div>
            <p className="text-sm font-semibold text-zinc-300">No messages yet</p>
            <p className="text-xs text-zinc-500 mt-1">Say hello to the community.</p>
          </div>
        ) : (
          messages.filter((m) => !blockedIds.includes(m.user_id)).map((m) => {
            const mine = m.user_id === currentUser.userId;
            return (
              <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                {isAdmin && (
                  <button onClick={() => removeMessage(m.id)}
                    className={`opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0 ${mine ? "order-first" : "order-last"}`}
                    title="Delete message">
                    <Trash2 size={13} />
                  </button>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? "bg-blue-500 text-zinc-950" : "bg-white/[0.06] text-zinc-200"}`}>
                  <button
                    onClick={() => !mine && onViewProfile(m.user_id)}
                    className={`text-xs font-semibold mb-0.5 flex items-center gap-1 ${mine ? "text-zinc-950/70 cursor-default" : "text-zinc-400 hover:text-blue-400 hover:underline transition-colors"}`}
                  >
                    {mine ? "You" : m.username} {adminIds.includes(m.user_id) && <AdminBadge />}
                  </button>
                  <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>
                  <div className={`text-[10px] mt-1 ${mine ? "text-zinc-950/60" : "text-zinc-500"}`}>{timeAgo(m.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </Card>

      <Card className="p-3 flex items-center gap-2 shrink-0">
        <input className={`${inputCls} flex-1`} placeholder="Type a message..." value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button onClick={send} disabled={sending || !text.trim()}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-zinc-950 p-2.5 rounded-lg transition-all shrink-0">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </Card>
    </div>
  );
};

export default function ForumPage({ session, profile }) {
  const [tab, setTab] = useState("posts"); // "posts" | "chat"
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [focusReply, setFocusReply] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [blockedIds, setBlockedIds] = useState([]);
  const [query, setQuery] = useState("");
  const [adminIds, setAdminIds] = useState([]);

  const currentUser = { userId: session?.user?.id, username: profile?.username || session?.user?.email || "Trader" };
  const isAdmin = !!profile?.is_admin;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchForumPosts(), fetchBlockedUserIds(currentUser.userId).catch(() => []), fetchAdminUserIds().catch(() => [])])
      .then(([p, blocked, admins]) => { setPosts(p); setBlockedIds(blocked); setAdminIds(admins); })
      .catch((err) => setError(err.message || "Failed to load the forum."))
      .finally(() => setLoading(false));
  }, [currentUser.userId]);

  useEffect(() => { load(); }, [load]);

  const createPost = async (title, body, imageFile) => {
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await uploadForumImage(imageFile, currentUser.userId);
    }
    const saved = await insertForumPost(currentUser.userId, currentUser.username, title, body, imageUrl);
    setPosts((prev) => [saved, ...prev]);
  };

  const removePost = async (id) => {
    await deleteForumPost(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setActivePost(null);
  };

  const openThread = (post, { focusReplyBox = false } = {}) => {
    setFocusReply(focusReplyBox);
    setActivePost(post);
  };

  const visiblePosts = posts
    .filter((p) => !blockedIds.includes(p.user_id))
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.username.toLowerCase().includes(q);
    });

  if (activePost) {
    return (
      <>
        <ThreadView
          post={activePost}
          currentUserId={currentUser}
          onBack={() => setActivePost(null)}
          onDeletePost={removePost}
          autoFocusReply={focusReply}
          onViewProfile={setViewingUserId}
          onPostUpdated={(updated) => {
            setActivePost(updated);
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
          isAdmin={isAdmin}
          adminIds={adminIds}
        />
        <UserProfileModal userId={viewingUserId} currentUserId={currentUser.userId} currentUsername={currentUser.username} onClose={() => setViewingUserId(null)} />
      </>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-zinc-500">Connect with other traders — share setups, ask questions, talk strategy.</p>
        {tab === "posts" && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95">
            <Plus size={16} strokeWidth={2.5} /> New Post
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("posts")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "posts" ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
            <MessagesSquare size={14} /> Community
          </button>
          <button onClick={() => setTab("chat")}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${tab === "chat" ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
            <Radio size={14} /> Live Chat
          </button>
        </div>
        {tab === "posts" && (
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input className={`${inputCls} pl-8`} placeholder="Search posts..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}
      </div>

      {tab === "chat" ? (
        <LiveChat currentUser={currentUser} onViewProfile={setViewingUserId} blockedIds={blockedIds} isAdmin={isAdmin} adminIds={adminIds} />
      ) : (
        <>
          {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
          ) : visiblePosts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3"><MessagesSquare size={20} className="text-zinc-500" /></div>
              <p className="text-sm font-semibold text-zinc-300">{query.trim() ? "No posts match your search" : "No posts yet"}</p>
              <p className="text-xs text-zinc-500 mt-1">{query.trim() ? "Try a different search term." : "Be the first to start a conversation."}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {visiblePosts.map((p) => (
                <Card key={p.id} className="p-4 cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => openThread(p)}>
                  <h3 className="font-semibold text-zinc-100 mb-1">{p.title}{p.edited_at && <span className="text-xs font-normal text-zinc-600"> (edited)</span>}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{p.body}</p>
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="mb-2 w-40 h-28 object-cover rounded-lg border border-white/10" />
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <User size={11} />
                      <button onClick={(e) => { e.stopPropagation(); setViewingUserId(p.user_id); }} className="hover:text-blue-400 hover:underline transition-colors">{p.username}</button>
                      {adminIds.includes(p.user_id) && <AdminBadge />}
                      <span className="text-zinc-700">·</span> <Clock size={11} /> {timeAgo(p.created_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removePost(p.id); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openThread(p, { focusReplyBox: true }); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <MessageCircle size={12} /> Reply
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <NewPostModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={createPost} />
      <UserProfileModal userId={viewingUserId} currentUserId={currentUser.userId} currentUsername={currentUser.username} onClose={() => setViewingUserId(null)} />
    </div>
  );
}
