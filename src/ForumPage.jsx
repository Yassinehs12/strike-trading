import React, { useState, useEffect, useCallback } from "react";
import {
  MessagesSquare, Plus, X, Trash2, Send, Loader2, ArrowLeft, User, Clock,
} from "lucide-react";
import {
  fetchForumPosts, insertForumPost, deleteForumPost,
  fetchForumReplies, insertForumReply, deleteForumReply,
} from "./db";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition-colors";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
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

  if (!open) return null;

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setError("Both a title and a message are required."); return; }
    setError(""); setLoading(true);
    try {
      await onSubmit(title.trim(), body.trim());
      setTitle(""); setBody("");
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
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
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

const ThreadView = ({ post, currentUserId, onBack, onDeletePost }) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchForumReplies(post.id).then(setReplies).catch(() => {}).finally(() => setLoading(false));
  }, [post.id]);

  useEffect(() => { load(); }, [load]);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const saved = await insertForumReply(post.id, currentUserId.userId, currentUserId.username, replyText.trim());
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
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
        <ArrowLeft size={15} /> Back to Community
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-lg font-bold text-zinc-100">{post.title}</h2>
          {post.user_id === currentUserId.userId && (
            <button onClick={() => onDeletePost(post.id)} className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0"><Trash2 size={16} /></button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <User size={12} /> {post.username} <span className="text-zinc-700">·</span> <Clock size={12} /> {timeAgo(post.created_at)}
        </div>
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{post.body}</p>
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
                    <User size={11} /> <span className="font-medium text-zinc-300">{r.username}</span> <span className="text-zinc-700">·</span> {timeAgo(r.created_at)}
                  </div>
                  {r.user_id === currentUserId.userId && (
                    <button onClick={() => removeReply(r.id)} className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0"><Trash2 size={13} /></button>
                  )}
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{r.body}</p>
              </Card>
            ))}
            {replies.length === 0 && <p className="text-sm text-zinc-600 text-center py-6">No replies yet — be the first to respond.</p>}
          </div>
        )}
      </div>

      <Card className="p-3 flex items-center gap-2 sticky bottom-4">
        <input className={`${inputCls} flex-1`} placeholder="Write a reply..." value={replyText}
          onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply()} />
        <button onClick={submitReply} disabled={sending || !replyText.trim()}
          className="flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-zinc-950 p-2.5 rounded-lg transition-all shrink-0">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </Card>
    </div>
  );
};

export default function ForumPage({ session, profile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activePost, setActivePost] = useState(null);

  const currentUser = { userId: session?.user?.id, username: profile?.username || session?.user?.email || "Trader" };

  const load = useCallback(() => {
    setLoading(true);
    fetchForumPosts()
      .then(setPosts)
      .catch((err) => setError(err.message || "Failed to load the forum."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPost = async (title, body) => {
    const saved = await insertForumPost(currentUser.userId, currentUser.username, title, body);
    setPosts((prev) => [saved, ...prev]);
  };

  const removePost = async (id) => {
    await deleteForumPost(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setActivePost(null);
  };

  if (activePost) {
    return <ThreadView post={activePost} currentUserId={currentUser} onBack={() => setActivePost(null)} onDeletePost={removePost} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-zinc-500">Connect with other traders — share setups, ask questions, talk strategy.</p>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95">
          <Plus size={16} strokeWidth={2.5} /> New Post
        </button>
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3"><MessagesSquare size={20} className="text-zinc-500" /></div>
          <p className="text-sm font-semibold text-zinc-300">No posts yet</p>
          <p className="text-xs text-zinc-500 mt-1">Be the first to start a conversation.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4 cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => setActivePost(p)}>
              <h3 className="font-semibold text-zinc-100 mb-1">{p.title}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{p.body}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <User size={11} /> {p.username} <span className="text-zinc-700">·</span> <Clock size={11} /> {timeAgo(p.created_at)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewPostModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={createPost} />
    </div>
  );
}
