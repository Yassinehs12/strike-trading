// supabase/functions/snaptrade-sync/index.ts
//
// Pulls the user's connected brokerage accounts + balances from SnapTrade
// into `snaptrade_accounts`, then pulls each account's activity history
// and turns closed round-trips into rows in `trades` (source='snaptrade'),
// so they show up in the journal next to manually-logged trades.
//
// SnapTrade reports individual fills (one row per buy, one per sell), not
// entry/exit pairs the way this app's `trades` table expects. This does a
// simple per-symbol FIFO match: each SELL is matched against the oldest
// unmatched BUYs for that symbol (and vice versa for short positions)
// until either side is exhausted. Partial fills against a fill that's
// already partially matched are split. Anything left unmatched is an
// still-open position and is intentionally NOT written to `trades` — the
// journal only models closed trades today.
//
// Deploy with:
//   supabase functions deploy snaptrade-sync
// Uses the same SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY secrets as
// snaptrade-connect.
//
// This is a STUB with the real control flow in place. Activity field
// names (symbol.symbol, option_symbol, trade_date, etc.) should be
// checked against current docs (https://docs.snaptrade.com/reference/get-account-activities)
// before going live — brokerage data is messy and SnapTrade's normalized
// shape has changed field names across versions before.

import { createClient } from "npm:@supabase/supabase-js@2";
import { snapTradeRequest, corsHeaders, json } from "../_shared/snaptrade.ts";

type Fill = {
  activityId: string;
  symbol: string;
  side: "BUY" | "SELL";
  units: number;
  price: number;
  fee: number;
  date: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    // snaptrade_users has NO row-level-security policies (it holds a
    // bearer credential for the SnapTrade API) — only the service role
    // can read it, never a user's own JWT.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: snapUser, error: fetchError } = await supabaseAdmin
      .from("snaptrade_users")
      .select("snaptrade_user_id, snaptrade_user_secret")
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchError) return json({ error: fetchError.message }, 500);
    if (!snapUser) return json({ error: "No SnapTrade connection for this user yet. Connect a brokerage first." }, 400);

    const q = { userId: snapUser.snaptrade_user_id, userSecret: snapUser.snaptrade_user_secret };

    // 1) Accounts + balances
    const accounts = await snapTradeRequest("GET", "/accounts", { query: q }) as Array<{
      id: string;
      name?: string;
      number?: string;
      institution_name?: string;
      balance?: { total?: { amount?: number; currency?: string } };
    }>;

    let accountsSynced = 0;
    for (const acct of accounts) {
      const balance = acct.balance?.total?.amount ?? null;
      const currency = acct.balance?.total?.currency ?? "USD";

      const { error: upsertError } = await supabase.from("snaptrade_accounts").upsert(
        {
          user_id: user.id,
          snaptrade_account_id: acct.id,
          brokerage: acct.institution_name ?? null,
          account_name: acct.name ?? null,
          account_number: acct.number ?? null,
          balance,
          currency,
          status: "active",
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "snaptrade_account_id" }
      );
      if (upsertError) return json({ error: upsertError.message }, 500);
      accountsSynced++;
    }

    // 2) Activities -> fills -> FIFO-matched closed trades
    let tradesInserted = 0;
    const fillsBySymbol = new Map<string, Fill[]>();

    for (const acct of accounts) {
      const activities = await snapTradeRequest("GET", `/accounts/${acct.id}/activities`, {
        query: q,
      }) as { data?: unknown[] } | unknown[];

      const rows = Array.isArray(activities) ? activities : activities.data ?? [];

      for (const raw of rows as Array<Record<string, any>>) {
        const type = String(raw.type || raw.option_type || "").toUpperCase();
        if (type !== "BUY" && type !== "SELL") continue; // skip dividends, fees, transfers, etc.

        const symbol = raw.symbol?.symbol ?? raw.option_symbol?.ticker ?? raw.description ?? "UNKNOWN";
        const units = Math.abs(Number(raw.units ?? 0));
        const price = Math.abs(Number(raw.price ?? 0));
        if (!units || !price) continue;

        const fill: Fill = {
          activityId: String(raw.id),
          symbol,
          side: type as "BUY" | "SELL",
          units,
          price,
          fee: Math.abs(Number(raw.fee ?? 0)),
          date: raw.trade_date || raw.settlement_date || new Date().toISOString(),
        };
        if (!fillsBySymbol.has(symbol)) fillsBySymbol.set(symbol, []);
        fillsBySymbol.get(symbol)!.push(fill);
      }
    }

    for (const [symbol, fills] of fillsBySymbol) {
      fills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const buys = fills.filter((f) => f.side === "BUY").map((f) => ({ ...f, remaining: f.units }));
      const sells = fills.filter((f) => f.side === "SELL").map((f) => ({ ...f, remaining: f.units }));

      let bi = 0, si = 0;
      while (bi < buys.length && si < sells.length) {
        const buy = buys[bi], sell = sells[si];
        const matched = Math.min(buy.remaining, sell.remaining);
        if (matched <= 0) { bi++; si++; continue; }

        const entryFirst = new Date(buy.date) <= new Date(sell.date);
        const entry = entryFirst ? buy : sell;
        const exit = entryFirst ? sell : buy;
        const pnl = (sell.price - buy.price) * matched - buy.fee - sell.fee;
        // Composite id so re-syncing the same pair of fills never inserts
        // a duplicate — trades.snaptrade_activity_id has a unique index.
        const compositeId = `${buy.activityId}:${sell.activityId}:${matched}`;

        const { error: insertError } = await supabase.from("trades").upsert(
          {
            user_id: user.id,
            date: (entry.date || new Date().toISOString()).slice(0, 10),
            asset: symbol,
            direction: entryFirst ? "Long" : "Short",
            entry: buy.price,
            exit: sell.price,
            lots: matched,
            fees: buy.fee + sell.fee,
            setup: "SnapTrade Sync",
            session: "N/A",
            status: pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BE",
            pnl,
            holding_minutes: Math.max(0, Math.round((new Date(exit.date).getTime() - new Date(entry.date).getTime()) / 60000)),
            notes: "",
            source: "snaptrade",
            snaptrade_activity_id: compositeId,
          },
          { onConflict: "snaptrade_activity_id", ignoreDuplicates: true }
        );
        if (!insertError) tradesInserted++;

        buy.remaining -= matched;
        sell.remaining -= matched;
        if (buy.remaining <= 0) bi++;
        if (sell.remaining <= 0) si++;
      }
    }

    return json({ accountsSynced, tradesInserted });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return json({ error: (err as Error).message || String(err) }, status && status < 500 ? status : 502);
  }
});
