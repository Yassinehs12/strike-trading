import React, { useState, useEffect } from "react";
import { X, Loader2, CalendarDays, MessagesSquare } from "lucide-react";
import { fetchProfileById, fetchPublicPostCount } from "./db";

export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [postCount, setPostCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setProfile(undefined);
    setPostCount(null);
    setError("");
    Promise.all([fetchProfileById(userId), fetchPublicPostCount(userId)])
      .then(([p, count]) => { setProfile(p); setPostCount(count); })
      .catch((err) => setError(err.message || "Failed to load profile."));
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end px-4 pt-4">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X size={20} /></button>
        </div>

        {profile === undefined ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
        ) : error ? (
          <div className="px-6 pb-8 text-sm text-rose-400 text-center">{error}</div>
        ) : profile === null ? (
          <div className="px-6 pb-8 text-sm text-zinc-500 text-center">This trader's profile couldn't be found.</div>
        ) : (
          <div className="px-6 pb-6 text-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border border-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-zinc-300">
                {(profile.username || "?")[0].toUpperCase()}
              </div>
            )}
            <h3 className="font-bold text-zinc-100 text-lg">{profile.username}</h3>
            {profile.bio && <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{profile.bio}</p>}

            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 mt-3">
              <CalendarDays size={12} /> Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
            </div>

            {postCount !== null && (
              <div className="flex items-center justify-center gap-6 mt-5 pt-5 border-t border-white/10">
                <div>
                  <div className="text-lg font-bold text-zinc-100">{postCount}</div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500"><MessagesSquare size={11} /> Posts</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
