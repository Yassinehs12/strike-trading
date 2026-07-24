// supabase/functions/snaptrade-disconnect/index.ts
//
// Two modes, chosen by what's in the request body:
//   { accountId: "<snaptrade_accounts.id>" } -> removes just that account
//     row locally. SnapTrade has no per-account delete; the underlying
//     brokerage authorization stays live on their side until the user
//     fully disconnects, so this is a "hide it in our UI" operation.
//   { fullDisconnect: true } -> calls SnapTrade's deleteUser, which
//     revokes every brokerage authorization for this user and wipes
//     their data on SnapTrade's side, then removes our local rows.
//
// Deploy with:
//   supabase functions deploy snaptrade-disconnect

import { createClient } from "npm:@supabase/supabase-js@2";
import { snapTradeRequest, corsHeaders, json } from "../_shared/snaptrade.ts";

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
    // can read/write it, never a user's own JWT.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { accountId, fullDisconnect } = body as { accountId?: string; fullDisconnect?: boolean };

    if (fullDisconnect) {
      const { data: snapUser, error: fetchError } = await supabaseAdmin
        .from("snaptrade_users")
        .select("snaptrade_user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fetchError) return json({ error: fetchError.message }, 500);

      if (snapUser) {
        await snapTradeRequest("DELETE", "/snapTrade/deleteUser", {
          query: { userId: snapUser.snaptrade_user_id },
        });
      }

      await supabase.from("snaptrade_accounts").delete().eq("user_id", user.id);
      const { error: deleteUserRowError } = await supabaseAdmin.from("snaptrade_users").delete().eq("user_id", user.id);
      if (deleteUserRowError) return json({ error: deleteUserRowError.message }, 500);

      return json({ ok: true });
    }

    if (!accountId) return json({ error: "accountId or fullDisconnect is required." }, 400);

    const { error: deleteError } = await supabase
      .from("snaptrade_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return json({ error: (err as Error).message || String(err) }, status && status < 500 ? status : 502);
  }
});
