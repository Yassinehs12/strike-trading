// supabase/functions/nowpayments-webhook/index.ts
//
// NOWPayments IPN receiver. Verifies the x-nowpayments-sig HMAC-SHA512
// signature, then grants Pro once the payment status is "finished".
//
// Deploy WITHOUT JWT verification (NOWPayments has no Supabase token):
//   supabase functions deploy nowpayments-webhook --no-verify-jwt
// Secret: supabase secrets set NOWPAYMENTS_IPN_SECRET=... (from NOWPayments
// dashboard > Store Settings > IPN secret key)

import { createClient } from "npm:@supabase/supabase-js@2";

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, sortKeysDeep(val)])
    );
  }
  return v;
}

async function hmacSha512Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  if (!secret) return new Response("IPN secret not configured", { status: 500 });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const received = req.headers.get("x-nowpayments-sig") ?? "";
  const expected = await hmacSha512Hex(secret, JSON.stringify(sortKeysDeep(payload)));
  if (!timingSafeEqual(received.toLowerCase(), expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const orderId = String(payload.order_id ?? "");
  const status = String(payload.payment_status ?? "");
  if (!orderId) return new Response("ok");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: payment } = await admin
    .from("crypto_payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!payment) return new Response("ok"); // unknown order: ack so NOWPayments stops retrying

  // Always record the latest status/payment id.
  const update: Record<string, unknown> = {
    np_status: status,
    np_payment_id: payload.payment_id ? String(payload.payment_id) : payment.np_payment_id,
  };

  if (status === "finished" && payment.status !== "confirmed") {
    // Only accept payments for the price we quoted.
    if (Number(payload.price_amount) !== Number(payment.amount_usd)) {
      await admin.from("crypto_payments").update({ ...update, status: "failed" }).eq("id", payment.id);
      return new Response("ok");
    }

    // Extend from the later of now / current expiry so early renewals stack.
    const { data: profile } = await admin
      .from("profiles").select("plan, plan_expires_at").eq("id", payment.user_id).maybeSingle();
    const now = new Date();
    const currentEnd = profile?.plan === "pro" && profile?.plan_expires_at
      ? new Date(profile.plan_expires_at) : now;
    const base = currentEnd > now ? currentEnd : now;
    const next = new Date(base);
    if (payment.plan_interval === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
    else next.setUTCMonth(next.getUTCMonth() + 1);

    const { error: profErr } = await admin
      .from("profiles").update({ plan: "pro", plan_expires_at: next.toISOString() })
      .eq("id", payment.user_id);
    if (profErr) return new Response("Profile update failed", { status: 500 }); // triggers retry

    update.status = "confirmed";
    update.confirmed_at = now.toISOString();
  } else if (status === "failed" || status === "expired") {
    if (payment.status === "pending") update.status = status;
  }

  await admin.from("crypto_payments").update(update).eq("id", payment.id);
  return new Response("ok");
});
