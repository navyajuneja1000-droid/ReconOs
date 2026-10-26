import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only settings. Set these in Vercel → Project → Settings → Environment Variables. */
export const env = (k: string) => process.env[k] ?? "";

export function admin(): SupabaseClient {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server settings missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** The logged-in user behind a request's Bearer token, checked with Supabase. */
export async function userFrom(req: Request, db: SupabaseClient) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

export const dodoBase = () => (env("DODO_MODE") === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com");

export const productFor = (plan: string) => (plan === "starter" ? env("DODO_PRODUCT_STARTER") : plan === "growth" ? env("DODO_PRODUCT_GROWTH") : "");
export const planForProduct = (id: string | undefined) =>
  id && id === env("DODO_PRODUCT_STARTER") ? "starter" : id && id === env("DODO_PRODUCT_GROWTH") ? "growth" : null;
