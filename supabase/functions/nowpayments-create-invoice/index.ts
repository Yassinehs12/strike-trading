// supabase/functions/nowpayments-create-invoice/index.ts
//
// Creates a NOWPayments hosted invoice for Pro and returns its URL.
// Prices are fixed HERE on the server, never taken from the client.
//
// Deploy:  supabase functions deploy nowpayments-create-invoice
// Secrets: supabase secrets set NOWPAYMENTS_API_KEY=... SITE_URL=https://strikejournal.com

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor, json as jsonBase } from "../_shared/snaptrade.ts";

const PRICES: Record<string, number> = { monthly: 9.99, yearly: 99 };

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  const json = (b: unknown, s = 200) => jsonBase(b, s, cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    const { interval } = await req.json().catch(() => ({}));
    const amount = PRICES[interval as string];
    if (!amount) return json({ error: "Invalid plan interval." }, 400);

    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) return json({ error: "NOWPAYMENTS_API_KEY is not configured." }, 500);
    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://strikejournal.com").replace(/\/$/, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orderId = `${user.id}_${interval}_${Date.now()}`;

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        order_id: orderId,
        order_description: `Strike Journal Pro (${interval})`,
        ipn_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`,
        success_url: `${siteUrl}/?upgraded=1`,
        cancel_url: `${siteUrl}/pricing`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.invoice_url) {
      return json({ error: data?.message || "Could not create the invoice." }, 502);
    }

    const { error: insertError } = await admin.from("crypto_payments").insert({
      user_id: user.id,
      provider: "nowpayments",
      order_id: orderId,
      np_invoice_id: String(data.id),
      plan_interval: interval,
      amount_usd: amount,
      status: "pending",
    });
    if (insertError) return json({ error: insertError.message }, 500);

    return json({ url: data.invoice_url });
  } catch (err) {
    return json({ error: (err as Error).message || "Unexpected error." }, 500);
  }
});
