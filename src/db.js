import { supabase } from "./supabaseClient";

/* ---------- mapping: DB (snake_case) <-> app (camelCase) ---------- */
const tradeFromDB = (r) => ({
  id: r.id,
  date: r.date,
  asset: r.asset,
  direction: r.direction,
  entry: Number(r.entry),
  exit: Number(r.exit),
  lots: Number(r.lots),
  fees: Number(r.fees),
  setup: r.setup,
  session: r.session,
  status: r.status,
  pnl: Number(r.pnl),
  holdingMinutes: r.holding_minutes ?? 0,
  challengeId: r.challenge_id,
  accountId: r.account_id,
  screenshot: r.screenshot,
  notes: r.notes ?? "",
  emotion: r.emotion || "Neutral",
  setupGrade: r.setup_grade || "A",
});

const tradeToDB = (t, userId) => ({
  user_id: userId,
  date: t.date,
  asset: t.asset,
  direction: t.direction,
  entry: t.entry,
  exit: t.exit,
  lots: t.lots,
  fees: t.fees,
  setup: t.setup,
  session: t.session,
  status: t.status,
  pnl: t.pnl,
  holding_minutes: t.holdingMinutes || 0,
  challenge_id: t.challengeId || null,
  account_id: t.accountId || null,
  screenshot: t.screenshot || null,
  notes: t.notes || "",
  emotion: t.emotion || "Neutral",
  setup_grade: t.setupGrade || "A",
});

const challengeFromDB = (r) => ({
  id: r.id,
  firm: r.firm,
  phase: r.phase,
  stage: r.stage,
  accountSize: Number(r.account_size),
  profitTargetPct: Number(r.profit_target_pct),
  maxDailyLossPct: Number(r.max_daily_loss_pct),
  maxTotalLossPct: Number(r.max_total_loss_pct),
  minTradingDays: r.min_trading_days,
  startDate: r.start_date,
  profitSplitPct: r.profit_split_pct != null ? Number(r.profit_split_pct) : undefined,
  lastPayoutNetProfit: r.last_payout_net_profit != null ? Number(r.last_payout_net_profit) : undefined,
  payoutHistory: r.payout_history || [],
});

const challengeToDB = (c, userId) => ({
  user_id: userId,
  firm: c.firm,
  phase: c.phase,
  stage: c.stage,
  account_size: c.accountSize,
  profit_target_pct: c.profitTargetPct,
  max_daily_loss_pct: c.maxDailyLossPct,
  max_total_loss_pct: c.maxTotalLossPct,
  min_trading_days: c.minTradingDays,
  duration_days: 0,
  start_date: c.startDate,
  profit_split_pct: c.profitSplitPct ?? null,
  last_payout_net_profit: c.lastPayoutNetProfit ?? null,
  payout_history: c.payoutHistory || [],
});

/* ---------- trades ---------- */
export async function fetchTrades() {
  const { data, error } = await supabase.from("trades").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data.map(tradeFromDB);
}

export async function insertTrade(trade, userId) {
  const { data, error } = await supabase.from("trades").insert(tradeToDB(trade, userId)).select().single();
  if (error) throw error;
  return tradeFromDB(data);
}

export async function updateTradeDB(trade, userId) {
  const { data, error } = await supabase.from("trades").update(tradeToDB(trade, userId)).eq("id", trade.id).select().single();
  if (error) throw error;
  return tradeFromDB(data);
}

export async function deleteTradeDB(id) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- challenges ---------- */
export async function fetchChallenges() {
  const { data, error } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(challengeFromDB);
}

export async function insertChallenge(challenge, userId) {
  const { data, error } = await supabase.from("challenges").insert(challengeToDB(challenge, userId)).select().single();
  if (error) throw error;
  return challengeFromDB(data);
}

export async function updateChallengeDB(challenge, userId) {
  const { data, error } = await supabase.from("challenges").update(challengeToDB(challenge, userId)).eq("id", challenge.id).select().single();
  if (error) throw error;
  return challengeFromDB(data);
}

export async function deleteChallengeDB(id) {
  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- profile (username + age, set once during onboarding) ---------- */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data; // null if no profile yet -> triggers onboarding
}

export async function createProfile(userId, username, age) {
  const { data, error } = await supabase.from("profiles").insert({ id: userId, username, age }).select().single();
  if (error) throw error;
  return data;
}

export async function updateProfileUsername(userId, username) {
  const { data, error } = await supabase.from("profiles").update({ username }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchProfileById(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileDetails(userId, { bio, avatarUrl }) {
  const patch = {};
  if (bio !== undefined) patch.bio = bio;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(file, userId) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchPublicPostCount(userId) {
  const { count, error } = await supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw error;
  return count || 0;
}

export async function fetchOwnStats(userId) {
  const [tradesRes, postsRes] = await Promise.all([
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (tradesRes.error) throw tradesRes.error;
  if (postsRes.error) throw postsRes.error;
  return { tradeCount: tradesRes.count || 0, postCount: postsRes.count || 0 };
}

/* ---------- friendships ---------- */
export async function fetchFriendship(userId, otherId) {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(userId, otherId) {
  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: otherId, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function acceptFriendRequest(id, accepterUsername) {
  const { data, error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id).select().single();
  if (error) throw error;
  if (accepterUsername) {
    createNotification(data.requester_id, "friend_accepted", data.addressee_id, accepterUsername, {}).catch(() => {});
  }
  return data;
}

export async function removeFriendship(id) {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

// Incoming pending friend requests, with the requester's profile attached.
export async function fetchPendingFriendRequests(userId) {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const withProfiles = await Promise.all(
    data.map(async (r) => {
      const { data: p } = await supabase.from("profiles").select("username, avatar_url").eq("id", r.requester_id).maybeSingle();
      return { ...r, requester: p };
    })
  );
  return withProfiles;
}

// Subscribes to new incoming friend requests for this user. Returns an unsubscribe function.
export function subscribeToFriendRequests(userId, onInsert) {
  const channel = supabase
    .channel(`friend_requests_${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${userId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------- direct messages ---------- */
export async function fetchDirectMessages(userId, otherId) {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendDirectMessage(senderId, recipientId, body, senderUsername, imageUrl = null) {
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ sender_id: senderId, recipient_id: recipientId, body: body || null, image_url: imageUrl })
    .select()
    .single();
  if (error) throw error;
  if (senderUsername) {
    createNotification(recipientId, "message", senderId, senderUsername, { body: (body || "Sent a photo").slice(0, 140) }).catch(() => {});
  }
  return data;
}

export async function uploadDmImage(file, senderId) {
  const ext = file.name.split(".").pop();
  const path = `${senderId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("dm-attachments").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("dm-attachments").getPublicUrl(path);
  return data.publicUrl;
}

// Soft-deletes a message so both sides see "Message deleted" instead of the content.
export async function deleteDirectMessage(messageId, senderId) {
  const { data, error } = await supabase
    .from("direct_messages")
    .update({ deleted: true, body: null, image_url: null })
    .eq("id", messageId)
    .eq("sender_id", senderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Subscribes to incoming direct messages for this user. Returns an unsubscribe function.
export function subscribeToDirectMessages(userId, onInsert) {
  const channel = supabase
    .channel(`dm_inbox_${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Distinct list of people this user has exchanged messages with, most recent first.
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const seen = new Map();
  for (const m of data) {
    const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
    if (!seen.has(otherId)) seen.set(otherId, m);
  }
  return Array.from(seen.entries()).map(([otherId, lastMessage]) => ({ otherId, lastMessage }));
}
export async function fetchForumPosts() {
  const { data, error } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertForumPost(userId, username, title, body, imageUrl = null) {
  const { data, error } = await supabase.from("forum_posts").insert({ user_id: userId, username, title, body, image_url: imageUrl }).select().single();
  if (error) throw error;
  return data;
}

// Uploads an image file to the "forum-images" storage bucket and returns its public URL.
export async function uploadForumImage(file, userId) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("forum-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteForumPost(id) {
  const { error } = await supabase.from("forum_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function updateForumPost(id, title, body) {
  const { data, error } = await supabase.from("forum_posts").update({ title, body, edited_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchForumReplies(postId) {
  const { data, error } = await supabase.from("forum_replies").select("*").eq("post_id", postId).order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertForumReply(postId, userId, username, body, postOwnerId) {
  const { data, error } = await supabase.from("forum_replies").insert({ post_id: postId, user_id: userId, username, body }).select().single();
  if (error) throw error;
  if (postOwnerId && postOwnerId !== userId) {
    createNotification(postOwnerId, "reply", userId, username, { postId, body: body.slice(0, 140) }).catch(() => {});
  }
  return data;
}

export async function updateForumReply(id, body) {
  const { data, error } = await supabase.from("forum_replies").update({ body, edited_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteForumReply(id) {
  const { error } = await supabase.from("forum_replies").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- blocking & reporting ---------- */
export async function fetchBlockedUserIds(userId) {
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  if (error) throw error;
  return data.map((r) => r.blocked_id);
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isUserBlocked(blockerId, blockedId) {
  const { data, error } = await supabase.from("blocks").select("blocker_id").eq("blocker_id", blockerId).eq("blocked_id", blockedId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function submitReport(reporterId, targetType, targetId, reason) {
  const { error } = await supabase.from("reports").insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}

/* ---------- notifications (replies & messages) ---------- */
export async function createNotification(userId, type, fromUserId, fromUsername, extra = {}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId, type, from_user_id: fromUserId, from_username: fromUsername,
    post_id: extra.postId || null, body: extra.body || null,
  });
  if (error) throw error;
}

export async function fetchNotifications(userId) {
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}

export function subscribeToNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notifications_${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => onInsert(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------- live chat ---------- */
export async function fetchChatMessages() {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function insertChatMessage(userId, username, body) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, username, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Subscribes to new chat messages in realtime. Returns an unsubscribe function.
export function subscribeToChatMessages(onInsert) {
  const channel = supabase
    .channel("chat_messages_realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function deleteChatMessage(id) {
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- admin / moderation ---------- */

// IDs of every profile currently flagged as admin — used to show the admin badge next to a username.
export async function fetchAdminUserIds() {
  const { data, error } = await supabase.from("profiles").select("id").eq("is_admin", true);
  if (error) throw error;
  return data.map((r) => r.id);
}

// IDs of every profile currently flagged as a supporter.
export async function fetchSupporterUserIds() {
  const { data, error } = await supabase.from("profiles").select("id").eq("is_supporter", true);
  if (error) throw error;
  return data.map((r) => r.id);
}

// Whether the signed-in user is the app owner — the only account that can
// remove an admin or supporter role once granted. Enforced server-side too.
export async function amIOwner() {
  const { data, error } = await supabase.rpc("am_i_owner");
  if (error) throw error;
  return !!data;
}

// Full user list for the admin panel, most recently joined first.
export async function fetchAllProfilesAdmin() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_admin, is_supporter, is_banned, ban_reason, timeout_until, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function setUserAdmin(userId, isAdmin) {
  const { data, error } = await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function setUserSupporter(userId, isSupporter) {
  const { data, error } = await supabase.from("profiles").update({ is_supporter: isSupporter }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function banUser(userId, reason = "") {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_banned: true, ban_reason: reason || null, timeout_until: null })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unbanUser(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_banned: false, ban_reason: null })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// durationMs = null clears an active timeout.
export async function timeoutUser(userId, durationMs) {
  const timeoutUntil = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
  const { data, error } = await supabase.from("profiles").update({ timeout_until: timeoutUntil }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteForumPost(id) {
  return deleteForumPost(id);
}

export async function adminDeleteForumReply(id) {
  return deleteForumReply(id);
}

export async function adminDeleteChatMessage(id) {
  return deleteChatMessage(id);
}

/* ---------- mentions ---------- */
const MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})/g;

// Distinct @usernames referenced in a piece of text (order of first appearance).
export function extractMentions(text) {
  const matches = (text || "").match(MENTION_REGEX) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

export async function searchProfilesByUsername(query, limit = 8) {
  const q = (query || "").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchProfilesByUsernames(usernames) {
  if (!usernames.length) return [];
  const { data, error } = await supabase.from("profiles").select("id, username").in("username", usernames);
  if (error) throw error;
  return data;
}

// Looks for @username mentions in `text` and creates a "mention" notification
// for each matching, real user — skipping the author and anyone in excludeUserIds
// (e.g. the post owner, who already gets a separate "reply" notification).
export async function notifyMentions({ text, fromUserId, fromUsername, postId, excludeUserIds = [] }) {
  const usernames = extractMentions(text);
  if (!usernames.length) return;
  const matches = await fetchProfilesByUsernames(usernames).catch(() => []);
  const targets = matches.filter((p) => p.id !== fromUserId && !excludeUserIds.includes(p.id));
  await Promise.all(
    targets.map((p) =>
      createNotification(p.id, "mention", fromUserId, fromUsername, { postId: postId || null, body: (text || "").slice(0, 140) }).catch(() => {})
    )
  );
}

/* ---------- leaderboard (opt-in) ---------- */
export async function fetchLeaderboard(period = "week") {
  const { data, error } = await supabase.rpc("get_leaderboard", { period });
  if (error) throw error;
  return data || [];
}

export async function setLeaderboardOptIn(userId, optIn) {
  const { data, error } = await supabase.from("profiles").update({ leaderboard_opt_in: optIn }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

/* ---------- reactions (👍 / 🔥 on posts & replies) ---------- */
export async function fetchReactions({ postIds = [], replyIds = [] }) {
  if (!postIds.length && !replyIds.length) return [];
  const clauses = [];
  if (postIds.length) clauses.push(`post_id.in.(${postIds.join(",")})`);
  if (replyIds.length) clauses.push(`reply_id.in.(${replyIds.join(",")})`);
  const { data, error } = await supabase.from("reactions").select("*").or(clauses.join(","));
  if (error) throw error;
  return data;
}

// Toggles the given emoji reaction for this user on a post or reply. Returns { action: "added" | "removed" }.
export async function toggleReaction({ postId = null, replyId = null, userId, emoji }) {
  let existingQuery = supabase.from("reactions").select("id").eq("user_id", userId).eq("emoji", emoji);
  existingQuery = postId ? existingQuery.eq("post_id", postId) : existingQuery.eq("reply_id", replyId);
  const { data: found, error: findErr } = await existingQuery.maybeSingle();
  if (findErr) throw findErr;
  if (found) {
    const { error } = await supabase.from("reactions").delete().eq("id", found.id);
    if (error) throw error;
    return { action: "removed" };
  }
  const { error } = await supabase.from("reactions").insert({ post_id: postId, reply_id: replyId, user_id: userId, emoji });
  if (error) throw error;
  return { action: "added" };
}

/* ---------- trade of the week spotlight ---------- */
export async function submitTradeSpotlight(trade, userId, username) {
  const { data, error } = await supabase.from("trade_spotlights").insert({
    user_id: userId,
    username,
    asset: trade.asset,
    direction: trade.direction,
    entry: trade.entry,
    exit: trade.exit,
    pnl: trade.pnl,
    notes: trade.notes || "",
    screenshot: trade.screenshot || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchActiveSpotlight() {
  const { data, error } = await supabase
    .from("trade_spotlights")
    .select("*")
    .eq("is_active", true)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPendingSpotlights() {
  const { data, error } = await supabase.from("trade_spotlights").select("*").eq("status", "pending").order("submitted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function approveSpotlight(id, adminId) {
  await supabase.from("trade_spotlights").update({ is_active: false }).eq("is_active", true);
  const { data, error } = await supabase
    .from("trade_spotlights")
    .update({ status: "approved", is_active: true, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function rejectSpotlight(id, adminId) {
  const { data, error } = await supabase
    .from("trade_spotlights")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/* ---------- badges (computed server-side so PnL/trade details never leave the DB) ---------- */
export async function fetchPublicBadgeStats(userId) {
  const { data, error } = await supabase.rpc("get_public_badges", { target_user_id: userId });
  if (error) throw error;
  return data?.[0] || { trade_count: 0, is_funded: false, streak_days: 0 };
}

/* ---------- public trading resume (win rate, favorite asset) ---------- */
export async function fetchPublicTradingStats(userId) {
  const { data, error } = await supabase.rpc("get_public_trading_stats", { target_user_id: userId });
  if (error) throw error;
  return data?.[0] || { win_rate: null, total_closed_trades: 0, favorite_asset: null };
}

export async function setShowPublicStats(userId, show) {
  const { data, error } = await supabase.from("profiles").update({ show_public_stats: show }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

/* ---------- referral tracking ---------- */
export async function fetchMyInviteInfo(userId) {
  const { data, error } = await supabase.from("profiles").select("invite_code, referral_count").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function applyReferralCode(newUserId, code) {
  if (!code) return;
  const { error } = await supabase.rpc("apply_referral_code", { new_user_id: newUserId, code });
  if (error) throw error;
}

/* ---------- admin broadcast notifications ---------- */
export async function broadcastNotification(type, fromUsername, extra = {}) {
  const { error } = await supabase.rpc("notify_all_members", { notif_type: type, from_username: fromUsername, extra });
  if (error) throw error;
}

/* ---------- admin-assignable member badges ---------- */
export async function fetchMemberBadges(userId) {
  const { data, error } = await supabase.rpc("get_member_badges", { target_user_id: userId });
  if (error) throw error;
  return data || [];
}

export async function grantMemberBadge(userId, badgeKey) {
  const { error } = await supabase.rpc("grant_member_badge", { target_user_id: userId, key: badgeKey });
  if (error) throw error;
}

export async function revokeMemberBadge(userId, badgeKey) {
  const { error } = await supabase.rpc("revoke_member_badge", { target_user_id: userId, key: badgeKey });
  if (error) throw error;
}

/* ---------- weekly / monthly journaling (reflections, separate from trade logs) ---------- */
const journalEntryFromDB = (r) => ({
  id: r.id,
  periodType: r.period_type, // "weekly" | "monthly"
  periodStart: r.period_start,
  rating: r.rating,
  wentWell: r.went_well ?? "",
  improve: r.improve ?? "",
  lessons: r.lessons ?? "",
  goalsNext: r.goals_next ?? "",
  updatedAt: r.updated_at,
});

export async function fetchJournalEntries(userId) {
  const { data, error } = await supabase.from("journal_entries").select("*").eq("user_id", userId).order("period_start", { ascending: false });
  if (error) throw error;
  return data.map(journalEntryFromDB);
}

// Upserts on (user_id, period_type, period_start) — one entry per person per week/month.
export async function upsertJournalEntry(entry, userId) {
  const payload = {
    user_id: userId,
    period_type: entry.periodType,
    period_start: entry.periodStart,
    rating: entry.rating ?? null,
    went_well: entry.wentWell || "",
    improve: entry.improve || "",
    lessons: entry.lessons || "",
    goals_next: entry.goalsNext || "",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(payload, { onConflict: "user_id,period_type,period_start" })
    .select()
    .single();
  if (error) throw error;
  return journalEntryFromDB(data);
}

export async function deleteJournalEntry(id) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- personal goals ---------- */
const goalFromDB = (r) => ({
  id: r.id,
  title: r.title,
  metric: r.metric, // "profit" | "win_rate" | "trade_count" | "custom"
  targetValue: r.target_value != null ? Number(r.target_value) : null,
  startDate: r.start_date,
  endDate: r.end_date,
  notes: r.notes ?? "",
  status: r.status, // "active" | "completed" | "abandoned"
  createdAt: r.created_at,
});

const goalToDB = (g, userId) => ({
  user_id: userId,
  title: g.title,
  metric: g.metric,
  target_value: g.targetValue ?? null,
  start_date: g.startDate,
  end_date: g.endDate || null,
  notes: g.notes || "",
  status: g.status || "active",
});

export async function fetchGoals(userId) {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(goalFromDB);
}

export async function insertGoal(goal, userId) {
  const { data, error } = await supabase.from("goals").insert(goalToDB(goal, userId)).select().single();
  if (error) throw error;
  return goalFromDB(data);
}

export async function updateGoalDB(goal, userId) {
  const { data, error } = await supabase.from("goals").update(goalToDB(goal, userId)).eq("id", goal.id).select().single();
  if (error) throw error;
  return goalFromDB(data);
}

export async function deleteGoalDB(id) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- audit log (admin/moderation actions) ----------
   Best-effort: callers should .catch(() => {}) so a logging hiccup
   never blocks the underlying admin action from completing. */
export async function logAuditEvent(actorId, actorUsername, action, targetType = null, targetId = null, details = {}) {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: actorId,
    actor_username: actorUsername,
    action,
    target_type: targetType,
    target_id: targetId != null ? String(targetId) : null,
    details,
  });
  if (error) throw error;
}

export async function fetchAuditLog({ limit = 200, action = null, actorId = null } = {}) {
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (action) query = query.eq("action", action);
  if (actorId) query = query.eq("actor_id", actorId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/* ---------- broker connections (MT4/MT5 investor-password sync) ---------- */
// The investor password itself never touches these functions or this
// table — it's sent once, straight from the UI to the connect-broker Edge
// Function, which hands it to MetaApi and returns only a connection
// reference. See supabase/functions/connect-broker and
// supabase-migrations/broker_connections.sql for the full flow.

export async function fetchBrokerConnections(userId) {
  const { data, error } = await supabase
    .from("broker_connections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Calls the connect-broker Edge Function. `investorPassword` is sent over
// HTTPS in this single request and is never persisted client-side or
// written to any table by this app.
export async function connectBrokerAccount({ platform, server, login, investorPassword, challengeId }) {
  const { data, error } = await supabase.functions.invoke("connect-broker", {
    body: { platform, server, login, investorPassword, challengeId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.connection;
}

export async function disconnectBrokerAccount(id) {
  const { error } = await supabase
    .from("broker_connections")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBrokerConnection(id) {
  const { error } = await supabase.from("broker_connections").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- SnapTrade (real brokerage sync) ---------- */
// Brokerage credentials never touch this app — the user authenticates
// directly with their broker inside SnapTrade's hosted Connection Portal.
// See supabase/functions/snaptrade-connect, snaptrade-sync,
// snaptrade-disconnect, and supabase-migrations/snaptrade.sql.

export async function fetchSnapTradeAccounts(userId) {
  const { data, error } = await supabase
    .from("snaptrade_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Returns a SnapTrade Connection Portal URL — open it in a new tab so the
// user can log into their brokerage. Pass a broker slug to jump straight
// to that broker's login instead of SnapTrade's picker.
export async function getSnapTradeConnectUrl({ broker, reconnectAuthorizationId } = {}) {
  const { data, error } = await supabase.functions.invoke("snaptrade-connect", {
    body: { broker, reconnectAuthorizationId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.redirectURI;
}

// Pulls fresh balances for connected accounts and imports any newly
// closed trades into the journal (source: 'snaptrade'). Safe to call
// repeatedly — already-imported trades are de-duplicated server-side.
export async function syncSnapTradeAccounts() {
  const { data, error } = await supabase.functions.invoke("snaptrade-sync", { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data; // { accountsSynced, tradesInserted }
}

export async function disconnectSnapTradeAccount(accountId) {
  const { data, error } = await supabase.functions.invoke("snaptrade-disconnect", {
    body: { accountId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

// Fully revokes SnapTrade's access to every connected brokerage for this
// user and deletes their SnapTrade registration entirely.
export async function disconnectAllSnapTrade() {
  const { data, error } = await supabase.functions.invoke("snaptrade-disconnect", {
    body: { fullDisconnect: true },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}


// Best-effort public counts for the landing page's social-proof section.
// Each count is fetched independently so one failing (e.g. RLS blocking an
// anonymous read) doesn't break the others.
export async function fetchLandingStats() {
  const safeCount = async (table) => {
    try {
      const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    } catch {
      return null;
    }
  };
  const [traders, trades, posts] = await Promise.all([
    safeCount("profiles"),
    safeCount("trades"),
    safeCount("forum_posts"),
  ]);
  return { traders, trades, posts };
}

/* ---------- public report card (opt-in, read-only, no auth required) ---------- */
export async function fetchPublicProfileByUsername(username) {
  const { data, error } = await supabase.rpc("get_public_profile", { target_username: username });
  if (error) throw error;
  return data?.[0] || null; // null means not found OR not opted in — both look the same to the visitor
}

export async function fetchPublicReportCard(userId) {
  const [badges, stats] = await Promise.all([
    fetchPublicBadgeStats(userId),
    fetchPublicTradingStats(userId),
  ]);
  return { ...badges, ...stats };
}

/* ---------- trading accounts (multi-account journaling) ---------- */
const accountFromDB = (r) => ({
  id: r.id,
  name: r.name,
  broker: r.broker,
  accountType: r.account_type,
  startingBalance: r.starting_balance != null ? Number(r.starting_balance) : null,
  isActive: r.is_active,
  createdAt: r.created_at,
});

const accountToDB = (a, userId) => ({
  user_id: userId,
  name: a.name,
  broker: a.broker || null,
  account_type: a.accountType || "live",
  starting_balance: a.startingBalance === "" || a.startingBalance == null ? null : Number(a.startingBalance),
  is_active: a.isActive !== undefined ? a.isActive : true,
});

export async function fetchTradingAccounts(userId) {
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(accountFromDB);
}

export async function insertTradingAccount(account, userId) {
  const { data, error } = await supabase
    .from("trading_accounts")
    .insert(accountToDB(account, userId))
    .select()
    .single();
  if (error) throw error;
  return accountFromDB(data);
}

export async function updateTradingAccount(id, account, userId) {
  const { data, error } = await supabase
    .from("trading_accounts")
    .update(accountToDB(account, userId))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return accountFromDB(data);
}

export async function deleteTradingAccount(id) {
  const { error } = await supabase.from("trading_accounts").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- support chat (in-app live chat with the Strike Journal team) ---------- */

// Gets the user's existing support conversation, or creates one on first
// message. One conversation per user — kept simple, like a support inbox
// thread rather than a multi-thread ticket system.
export async function getOrCreateSupportConversation(userId) {
  const { data: existing, error: fetchErr } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from("support_conversations")
    .insert({ user_id: userId })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return created;
}

export async function fetchSupportMessages(conversationId) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendSupportMessage(conversationId, senderId, senderRole, body) {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, sender_role: senderRole, body })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("support_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      // A message from the user flags it unread for admins, and vice versa.
      unread_by_admin: senderRole === "user",
      unread_by_user: senderRole === "admin",
      status: "open",
    })
    .eq("id", conversationId);

  return data;
}

export async function markSupportConversationRead(conversationId, asRole) {
  const patch = asRole === "admin" ? { unread_by_admin: false } : { unread_by_user: false };
  const { error } = await supabase.from("support_conversations").update(patch).eq("id", conversationId);
  if (error) throw error;
}

// Realtime: new messages arriving on a specific conversation (used by
// whichever side — user or admin — currently has that thread open).
export function subscribeToSupportMessages(conversationId, onInsert) {
  // Unique suffix per call — without this, calling this function twice in
  // quick succession for the same conversation (e.g. React re-mounting the
  // effect in development) can hand back the SAME underlying channel before
  // the first one finishes unsubscribing, and Supabase throws "cannot add
  // postgres_changes callbacks after subscribe()" when that happens.
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(`support_messages_${conversationId}_${uniqueId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------- admin: support inbox across all users ---------- */
export async function fetchAllSupportConversations() {
  const { data: convos, error } = await supabase
    .from("support_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!convos.length) return [];

  // Joined manually rather than via PostgREST's automatic embedding —
  // support_conversations.user_id references auth.users, not
  // public.profiles, so there's no FK relationship for Supabase to
  // auto-detect. This works regardless of what any FK constraint is named.
  const userIds = [...new Set(convos.map((c) => c.user_id))];
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);
  if (profileErr) throw profileErr;

  const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return convos.map((c) => ({ ...c, profiles: profileById[c.user_id] || null }));
}

// Realtime: any new message across any conversation, so the admin inbox
// can bump unread counts / reorder threads without a manual refresh.
export function subscribeToAllSupportMessages(onInsert) {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(`support_messages_admin_inbox_${uniqueId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "support_messages" },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
