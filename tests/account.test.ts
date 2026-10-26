import { beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { canRunAudit, isPaid, monthKey, statusFromEvent, storedCsv, toStored } from "../src/account/plan";
import { generateSample } from "../src/sample/generate";
import { intakeTable, runAuditFull } from "../src/engine/intake";

// a fake Supabase that records what the server functions do
const calls: { op: string; table?: string; args?: unknown }[] = [];
let profileByEmail: { user_id: string } | null = null;
let authUser: { id: string; email: string } | null = { id: "u1", email: "a@brand.in" };
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => (authUser ? { data: { user: authUser }, error: null } : { data: { user: null }, error: { message: "bad" } }),
      admin: { deleteUser: async (id: string) => { calls.push({ op: "deleteUser", args: id }); return { error: null }; } },
    },
    from: (table: string) => ({
      update: (args: unknown) => ({ eq: async () => { calls.push({ op: "update", table, args }); return { error: null }; } }),
      select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: profileByEmail }) }) }),
    }),
  }),
}));

describe("plan rules", () => {
  it("knows who has paid", () => {
    const future = new Date(Date.now() + 86400000).toISOString(), past = new Date(Date.now() - 86400000).toISOString();
    expect(isPaid({ plan: "starter", plan_status: "active", current_period_end: null })).toBe(true);
    expect(isPaid({ plan: "growth", plan_status: "cancelled", current_period_end: future })).toBe(true);
    expect(isPaid({ plan: "growth", plan_status: "cancelled", current_period_end: past })).toBe(false);
    expect(isPaid({ plan: "starter", plan_status: "on_hold", current_period_end: future })).toBe(false);
    expect(isPaid({ plan: "free", plan_status: "active", current_period_end: null })).toBe(false);
    expect(isPaid(null)).toBe(false);
  });

  it("gives free accounts one audit month, re-runs allowed", () => {
    expect(canRunAudit(false, [], "2026-09")).toBe(true);
    expect(canRunAudit(false, [{ month_key: "2026-09" }], "2026-09")).toBe(true);
    expect(canRunAudit(false, [{ month_key: "2026-09" }], "2026-10")).toBe(false);
    expect(canRunAudit(true, [{ month_key: "2026-09" }], "2026-10")).toBe(true);
  });

  it("stores an audit without dates as objects or customer details", () => {
    const s = generateSample();
    const { result } = runAuditFull(s.files.map((f) => intakeTable(f.name, f.table)), { asOf: s.asOf, ...{} });
    const st = toStored(result);
    expect(st.month_key).toBe(monthKey(result));
    expect(st.month_key).toMatch(/^\d{4}-\d{2}$/);
    expect(st.findings.length).toBe(result.findings.length);
    const text = JSON.stringify(st);
    expect(JSON.parse(text)).toEqual(st); // survives a round trip as JSON
    expect(Object.keys(st.findings[0]).sort()).toEqual(expect.arrayContaining(["amount", "kind", "title"]));
    expect(storedCsv(st).split("\n")[0]).toContain("Dispute by");
  });

  it("maps Dodo events to a plan status", () => {
    expect(statusFromEvent("subscription.active")).toBe("active");
    expect(statusFromEvent("subscription.renewed")).toBe("active");
    expect(statusFromEvent("subscription.on_hold")).toBe("on_hold");
    expect(statusFromEvent("subscription.failed")).toBe("on_hold");
    expect(statusFromEvent("subscription.cancelled")).toBe("cancelled");
    expect(statusFromEvent("subscription.expired")).toBe("expired");
    expect(statusFromEvent("payment.succeeded")).toBeNull();
  });
});

const secret = "whsec_" + Buffer.from("test-secret-for-reconos-0123456789").toString("base64");
function signed(body: object) {
  const raw = JSON.stringify(body), id = "msg_1", ts = new Date();
  const sig = new Webhook(secret).sign(id, ts, raw);
  return new Request("https://x/api/dodo-webhook", { method: "POST", body: raw, headers: { "webhook-id": id, "webhook-timestamp": String(Math.floor(ts.getTime() / 1000)), "webhook-signature": sig } });
}

describe("server functions", () => {
  beforeEach(() => {
    calls.length = 0; profileByEmail = null; authUser = { id: "u1", email: "a@brand.in" };
    Object.assign(process.env, { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc", DODO_WEBHOOK_SECRET: secret, DODO_PAYMENTS_API_KEY: "key", DODO_PRODUCT_STARTER: "pdt_s", DODO_PRODUCT_GROWTH: "pdt_g", DODO_MODE: "test", SITE_URL: "https://www.reconos.in" });
  });

  it("rejects a webhook with a bad signature", async () => {
    const { POST } = await import("../api/dodo-webhook");
    const r = await POST(new Request("https://x", { method: "POST", body: "{}", headers: { "webhook-id": "a", "webhook-timestamp": "1", "webhook-signature": "v1,bad" } }));
    expect(r.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("turns on the plan from a signed subscription.active event", async () => {
    const { POST } = await import("../api/dodo-webhook");
    const r = await POST(signed({ type: "subscription.active", data: { subscription_id: "sub_1", product_id: "pdt_g", next_billing_date: "2026-11-26T00:00:00Z", customer: { customer_id: "cus_1", email: "a@brand.in" }, metadata: { user_id: "u1" } } }));
    expect(r.status).toBe(200);
    expect(calls[0]).toMatchObject({ op: "update", table: "profiles", args: { plan: "growth", plan_status: "active", dodo_subscription_id: "sub_1", current_period_end: "2026-11-26T00:00:00Z" } });
  });

  it("finds the user by email when metadata is missing, and drops to free on expiry", async () => {
    profileByEmail = { user_id: "u9" };
    const { POST } = await import("../api/dodo-webhook");
    await POST(signed({ type: "subscription.expired", data: { subscription_id: "sub_1", product_id: "pdt_s", customer: { email: "B@brand.in" } } }));
    expect(calls[0]).toMatchObject({ op: "update", args: { plan: "free", plan_status: "expired" } });
  });

  it("ignores events it doesn't need", async () => {
    const { POST } = await import("../api/dodo-webhook");
    const r = await POST(signed({ type: "payment.succeeded", data: {} }));
    expect(await r.json()).toMatchObject({ ignored: "payment.succeeded" });
    expect(calls).toEqual([]);
  });

  it("starts a checkout for a logged-in user, with their id and email", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ session_id: "cks_1", checkout_url: "https://test.checkout.dodopayments.com/session/cks_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("../api/checkout");
    const r = await POST(new Request("https://x/api/checkout", { method: "POST", headers: { Authorization: "Bearer tok" }, body: JSON.stringify({ plan: "starter" }) }));
    expect(await r.json()).toEqual({ url: "https://test.checkout.dodopayments.com/session/cks_1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://test.dodopayments.com/checkouts");
    expect(JSON.parse(init.body as string)).toMatchObject({ product_cart: [{ product_id: "pdt_s", quantity: 1 }], customer: { email: "a@brand.in" }, metadata: { user_id: "u1", plan: "starter" }, return_url: "https://www.reconos.in/#account" });
    vi.unstubAllGlobals();
  });

  it("refuses checkout without a login or for an unknown plan", async () => {
    const { POST } = await import("../api/checkout");
    authUser = null;
    expect((await POST(new Request("https://x", { method: "POST", body: JSON.stringify({ plan: "starter" }) }))).status).toBe(401);
    authUser = { id: "u1", email: "a@brand.in" };
    expect((await POST(new Request("https://x", { method: "POST", headers: { Authorization: "Bearer t" }, body: JSON.stringify({ plan: "gold" }) }))).status).toBe(400);
  });

  it("deletes only the logged-in user's account", async () => {
    const { POST } = await import("../api/delete-account");
    const r = await POST(new Request("https://x", { method: "POST", headers: { Authorization: "Bearer t" } }));
    expect(r.status).toBe(200);
    expect(calls).toEqual([{ op: "deleteUser", args: "u1" }]);
  });
});
