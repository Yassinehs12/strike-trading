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
  screenshot: r.screenshot,
  notes: r.notes ?? "",
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
  screenshot: t.screenshot || null,
  notes: t.notes || "",
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

/* ---------- forum ---------- */
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

export async function fetchForumReplies(postId) {
  const { data, error } = await supabase.from("forum_replies").select("*").eq("post_id", postId).order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertForumReply(postId, userId, username, body) {
  const { data, error } = await supabase.from("forum_replies").insert({ post_id: postId, user_id: userId, username, body }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteForumReply(id) {
  const { error } = await supabase.from("forum_replies").delete().eq("id", id);
  if (error) throw error;
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
