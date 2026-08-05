import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// A single shared presence channel for the whole app. Presence is
// inherently a cross-cutting, app-wide concern — it needs to be joined
// once when the user signs in (so "online" reflects having the app open
// at all, not just being on a specific page) and read from anywhere that
// wants to show it (currently just the Friends page).
let channel = null;
let onlineIds = new Set();
const listeners = new Set();

function notify() {
  const snapshot = new Set(onlineIds);
  listeners.forEach((fn) => fn(snapshot));
}

// Call once, app-wide, as soon as a session exists. Safe to call again —
// it's a no-op if a channel is already joined.
export function joinPresence(userId) {
  if (!userId || channel) return;
  channel = supabase.channel("online-users", { config: { presence: { key: userId } } });
  channel
    .on("presence", { event: "sync" }, () => {
      onlineIds = new Set(Object.keys(channel.presenceState()));
      notify();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() });
    });
}

export function leavePresence() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  onlineIds = new Set();
  notify();
}

// Returns the live Set of currently-online user IDs, updating automatically.
export function useOnlineUsers() {
  const [ids, setIds] = useState(onlineIds);
  useEffect(() => {
    listeners.add(setIds);
    setIds(new Set(onlineIds)); // pick up whatever's already known immediately
    return () => listeners.delete(setIds);
  }, []);
  return ids;
}
