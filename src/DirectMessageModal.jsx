import React from "react";
import MessageThread from "./MessageThread";

// Lightweight modal wrapper around MessageThread — used for "message this
// person" jumping-off points (e.g. from a profile) where a full inbox view
// would be overkill. The Messages page uses MessageThread directly, inline.
export default function DirectMessageModal({ currentUserId, currentUsername, otherUser, onClose }) {
  if (!otherUser) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[var(--bg-primary)]/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[var(--bg-secondary)] border border-white/10 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <MessageThread
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          otherUser={otherUser}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
