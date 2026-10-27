import { admin, dodoBase, env, json, userFrom } from "./_lib.js";

/** Opens Dodo's billing page for the logged-in user, where they can cancel, change card and download invoices. */
export async function POST(req: Request) {
  let db;
  try { db = admin(); } catch { return json({ error: "Billing isn't set up yet." }, 503); }
  const user = await userFrom(req, db);
  if (!user) return json({ error: "Please log in again." }, 401);
  const { data } = await db.from("profiles").select("dodo_customer_id").eq("user_id", user.id).maybeSingle();
  const customer = (data as { dodo_customer_id?: string | null } | null)?.dodo_customer_id;
  if (!customer || !env("DODO_PAYMENTS_API_KEY")) return json({ error: "We couldn't find a payment for this account. Write to us and we'll help." }, 404);
  const site = env("SITE_URL") || "https://www.reconos.in";
  const url = `${dodoBase()}/customers/${encodeURIComponent(customer)}/customer-portal/session?return_url=${encodeURIComponent(`${site}/#account`)}`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${env("DODO_PAYMENTS_API_KEY")}` } });
  const body = (await res.json().catch(() => ({}))) as { link?: string };
  if (!res.ok || !body.link) {
    console.error("dodo portal failed", res.status, JSON.stringify(body).slice(0, 300));
    return json({ error: "The billing page couldn't open. Try again in a minute." }, 502);
  }
  return json({ url: body.link });
}
