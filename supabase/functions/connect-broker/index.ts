// supabase/functions/connect-broker/index.ts
//
// Takes an MT4/MT5 investor login (server, login, investor password),
// provisions it with MetaApi (https://metaapi.cloud), and stores only the
// resulting reference id in `broker_connections` — the investor password
// is used once, in this request, and is never written to our database.
//
// Deploy with:
//   supabase functions deploy connect-broker
// Set your MetaApi token as a secret first (get it from app.metaapi.cloud):
//   supabase secrets set METAAPI_TOKEN=your-token-here
//
// This is a STUB with the real control flow and error handling in place,
// but the actual MetaApi request body/response shape should be checked
// against their current docs (https://metaapi.cloud/docs/provisioning/)
// before going live — provisioning APIs change their field names often
// enough that hardcoding without checking is asking for a silent failure.

import { createClient } from "npm:@supabase/supabase-js@2";

const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN");
const METAAPI_BASE_URL = "https://mt-provisioning-api-v1.agiliumtrade.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!METAAPI_TOKEN) {
      return json({ error: "METAAPI_TOKEN is not configured on this function." }, 500);
    }

    // Authenticate the caller using their Supabase session — we act on
    // their behalf, never with elevated/service-role permissions for
    // reading someone else's data.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    const body = await req.json();
    const { platform, server, login, investorPassword, challengeId } = body;

    if (!platform || !server || !login || !investorPassword) {
      return json({ error: "platform, server, login, and investorPassword are all required." }, 400);
    }
    if (!["mt4", "mt5"].includes(platform)) {
      return json({ error: "Only mt4 and mt5 are supported right now." }, 400);
    }

    // 1) Insert a "pending" row first so the user sees something immediately
    //    and we have a row to update even if MetaApi is slow to respond.
    const { data: pending, error: insertError } = await supabase
      .from("broker_connections")
      .insert({
        user_id: user.id,
        challenge_id: challengeId ?? null,
        platform,
        broker_server: server,
        login,
        status: "pending",
      })
      .select()
      .single();
    if (insertError) return json({ error: insertError.message }, 500);

    // 2) Provision the account with MetaApi. investorPassword is used only
    //    in this outbound request — it is never written to our own tables.
    //    NOTE: verify this payload shape against current MetaApi docs.
    let metaapiAccountId = null;
    try {
      const provisionRes = await fetch(`${METAAPI_BASE_URL}/users/current/accounts`, {
        method: "POST",
        headers: {
          "auth-token": METAAPI_TOKEN,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: `strike-journal-${user.id}-${pending.id}`,
          type: "cloud",
          login,
          password: investorPassword, // investor (read-only) password
          server,
          platform,
          magic: 0,
        }),
      });

      if (!provisionRes.ok) {
        const errText = await provisionRes.text();
        await supabase.from("broker_connections")
          .update({ status: "error", error_message: errText.slice(0, 500), updated_at: new Date().toISOString() })
          .eq("id", pending.id);
        return json({ error: "MetaApi rejected the connection. Double-check the server name and investor password." }, 502);
      }

      const provisionData = await provisionRes.json();
      metaapiAccountId = provisionData.id ?? provisionData._id ?? null;
    } catch (err) {
      await supabase.from("broker_connections")
        .update({ status: "error", error_message: String(err).slice(0, 500), updated_at: new Date().toISOString() })
        .eq("id", pending.id);
      return json({ error: "Could not reach MetaApi. Try again shortly." }, 502);
    }

    // 3) Mark connected. From here on, syncing trades is a separate,
    //    scheduled job (not built yet) that reads metaapi_account_id and
    //    pulls trade history via MetaApi's history API on a timer.
    const { data: updated, error: updateError } = await supabase
      .from("broker_connections")
      .update({
        metaapi_account_id: metaapiAccountId,
        status: "connected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.id)
      .select()
      .single();
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ connection: updated });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
