import { Webhook } from "standardwebhooks";
import { admin, env, json, planForProduct } from "./_lib.js";
import { statusFromEvent } from "../src/account/plan.js";

interface SubData {
  subscription_id?: string;
  product_id?: string;
  next_billing_date?: string | null;
  customer?: { customer_id?: string; email?: string };
  metadata?: Record<string, unknown>;
}

/** Dodo tells us when a subscription starts, renews, pauses or ends; we update the plan on the profile. */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env("DODO_WEBHOOK_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  let event: { type?: string; data?: SubData };
  try {
    event = new Webhook(secret).verify(raw, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    }) as typeof event;
  } catch {
    return json({ error: "bad signature" }, 401);
  }
  const status = statusFromEvent(event.type ?? "");
  if (!status) return json({ ok: true, ignored: event.type });

  const d = event.data ?? {};
  const db = admin();
  let userId = typeof d.metadata?.user_id === "string" ? (d.metadata.user_id as string) : null;
  if (!userId && d.customer?.email) {
    const { data } = await db.from("profiles").select("user_id").ilike("email", d.customer.email).maybeSingle();
    userId = (data as { user_id?: string } | null)?.user_id ?? null;
  }
  if (!userId) {
    console.error("dodo webhook: no matching user", event.type, d.subscription_id);
    return json({ ok: true, unmatched: true });
  }
  const plan = planForProduct(d.product_id);
  const update: Record<string, unknown> = {
    plan_status: status,
    dodo_subscription_id: d.subscription_id ?? null,
    dodo_customer_id: d.customer?.customer_id ?? null,
    current_period_end: d.next_billing_date ?? null,
    updated_at: new Date().toISOString(),
  };
  if (plan) update.plan = plan;
  if (status === "expired") update.plan = "free";
  const { error } = await db.from("profiles").update(update).eq("user_id", userId);
  if (error) { console.error("dodo webhook: update failed", error.message); return json({ error: "retry" }, 500); }
  return json({ ok: true });
}
