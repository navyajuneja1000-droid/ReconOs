import { admin, dodoBase, env, json, productFor, userFrom } from "./_lib.js";

/** Starts a Dodo checkout for the logged-in user's chosen plan and returns its URL. */
export async function POST(req: Request) {
  let db;
  try { db = admin(); } catch { return json({ error: "Payments aren't set up yet." }, 503); }
  const user = await userFrom(req, db);
  if (!user?.email) return json({ error: "Please log in again." }, 401);
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  // only ReconOS Pro (internal id "starter") is on sale
  const product = plan === "starter" ? productFor(plan) : "";
  if (!product || !env("DODO_PAYMENTS_API_KEY")) return json({ error: "That plan isn't available yet." }, 400);
  const site = env("SITE_URL") || "https://www.reconos.in";
  const res = await fetch(`${dodoBase()}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("DODO_PAYMENTS_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_cart: [{ product_id: product, quantity: 1 }],
      customer: { email: user.email },
      return_url: `${site}/#account`,
      metadata: { user_id: user.id, plan: plan! },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { checkout_url?: string | null };
  if (!res.ok || !body.checkout_url) {
    console.error("dodo checkout failed", res.status, JSON.stringify(body).slice(0, 500));
    return json({ error: "Checkout couldn't start. Try again in a minute." }, 502);
  }
  return json({ url: body.checkout_url });
}
