import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { isPaid, toStored, type PlanId, type Profile, type SavedAudit } from "./plan";
import type { AuditResult } from "../engine/types";
import type { RateCard } from "../engine/partners";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
// Public values (safe in the browser; row security protects the data). A badly pasted setting falls back to these.
const DEFAULT_URL = "https://xdnknrghedmkpsaklbjq.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbmtucmdoZWRta3BzYWtsYmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDY5NzksImV4cCI6MjEwODU4Mjk3OX0.FH1xa8MZXzHkv2TFBz9Bajqvc-y06svq2aA_Ibl1whg";
const clean = (v: string | undefined) => (v ?? "").trim();
const envUrl = clean(env.VITE_SUPABASE_URL), envKey = clean(env.VITE_SUPABASE_ANON_KEY);
const URL_ = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(envUrl) ? envUrl : DEFAULT_URL;
const KEY_ = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(envKey) ? envKey : DEFAULT_KEY;
// accounts stay off until the site is configured for them
const ACCOUNTS_ON = !!(envUrl || envKey);

/** Accounts switch on only when the Supabase project is configured; otherwise the site works as before. */
export const supabase: SupabaseClient | null = ACCOUNTS_ON ? createClient(URL_, KEY_, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }) : null;

type LoginReason = "audit" | "upgrade" | "account" | null;
interface Account {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  email: string | null;
  profile: Profile | null;
  paid: boolean;
  audits: SavedAudit[];
  /** open the login dialog, with why it was opened */
  loginFor: LoginReason;
  askLogin: (why: Exclude<LoginReason, null>) => void;
  closeLogin: () => void;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  google: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (p: { brand?: string; picked?: string[] }) => Promise<void>;
  loadCards: () => Promise<Record<string, RateCard>>;
  saveCards: (cards: Record<string, RateCard>) => Promise<void>;
  saveAudit: (r: AuditResult) => Promise<string | null>;
  deleteAudit: (id: string) => Promise<void>;
  deleteAllData: () => Promise<string | null>;
  checkout: (plan: Exclude<PlanId, "free">) => Promise<string | null>;
  /** opens Dodo's billing page (cancel, change card, invoices) */
  billing: () => Promise<string | null>;
  /** error from a checkout that started on its own after login */
  checkoutError: string;
}

const Ctx = createContext<Account | null>(null);
export const useAccount = () => {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAccount outside AccountProvider");
  return a;
};

// Remembers "send me to checkout" across the login (which may reload the page via the email link).
const INTENT = "reconos.intent";
const setIntent = (v: string | null) => { try { if (v) localStorage.setItem(INTENT, JSON.stringify({ v, at: Date.now() })); else localStorage.removeItem(INTENT); } catch { /* storage off */ } };
const getIntent = (): string | null => {
  try {
    const r = JSON.parse(localStorage.getItem(INTENT) ?? "null") as { v: string; at: number } | null;
    return r && Date.now() - r.at < 30 * 60 * 1000 ? r.v : null; // forget after 30 minutes
  } catch { return null; }
};

async function postWithToken(path: string, token: string, body?: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const b = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  return { ok: res.ok && !!b.url, url: b.url, error: b.error };
}

const friendly = (msg: string, step: "send" | "verify" | "other" = "other") =>
  /rate limit|too many/i.test(msg) ? "Too many tries. Wait a minute and try again."
  : /invalid api key|no api key|jwt/i.test(msg) ? "Login isn't set up correctly on our side (the site's Supabase key). Please tell us."
  : step === "verify" && /expired|invalid/i.test(msg) ? "That code didn't work. Check it, or send a new one."
  : step === "send" ? `Couldn't send the login email: ${msg}` : msg;

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [loginFor, setLoginFor] = useState<LoginReason>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { setProfile(null); setAudits([]); return; }
    const [p, a] = await Promise.all([
      supabase.from("profiles").select("user_id,email,brand,picked,plan,plan_status,current_period_end").eq("user_id", uid).maybeSingle(),
      supabase.from("audits").select("*").order("month_key", { ascending: false }),
    ]);
    setProfile((p.data as Profile) ?? null);
    setAudits((a.data as SavedAudit[]) ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) setLoginFor(null); });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { void refresh(); }, [session?.user.id, refresh]);

  const checkout = useCallback(async (plan: Exclude<PlanId, "free">) => {
    if (!supabase) return "Accounts aren't switched on yet.";
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setIntent(`checkout:${plan}`); setLoginFor("upgrade"); return null; }
    try {
      const r = await postWithToken("/api/checkout", token, { plan });
      if (!r.ok) return r.error ?? "Checkout couldn't start. Try again in a minute.";
      window.location.href = r.url!;
      return null;
    } catch {
      return "Checkout couldn't start. Check your connection and try again.";
    }
  }, []);

  // after logging in from a "Choose plan" button, carry on to checkout without a second click
  useEffect(() => {
    if (!session || !profile) return;
    const intent = getIntent();
    if (!intent?.startsWith("checkout:")) return;
    setIntent(null);
    if (isPaid(profile)) return;
    void checkout(intent.slice(9) as Exclude<PlanId, "free">).then((e) => setCheckoutError(e ?? ""));
  }, [session, profile, checkout]);

  const value = useMemo<Account>(() => ({
    enabled: !!supabase,
    ready,
    session,
    email: session?.user.email ?? null,
    profile,
    paid: isPaid(profile),
    audits,
    loginFor,
    askLogin: (why) => setLoginFor(why),
    closeLogin: () => { setLoginFor(null); setIntent(null); },
    sendCode: async (email) => {
      if (!supabase) return "Accounts aren't switched on yet.";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/#account" } });
      return error ? friendly(error.message, "send") : null;
    },
    verifyCode: async (email, code) => {
      if (!supabase) return "Accounts aren't switched on yet.";
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      return error ? friendly(error.message, "verify") : null;
    },
    google: async () => {
      if (!supabase) return "Accounts aren't switched on yet.";
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/" + window.location.hash } });
      return error ? friendly(error.message) : null;
    },
    signOut: async () => { await supabase?.auth.signOut(); setProfile(null); setAudits([]); },
    refresh,
    saveProfile: async (p) => {
      if (!supabase || !session) return;
      await supabase.from("profiles").update({ ...p, updated_at: new Date().toISOString() }).eq("user_id", session.user.id);
    },
    loadCards: async () => {
      if (!supabase || !session) return {};
      const { data } = await supabase.from("rate_cards").select("partner,card");
      return Object.fromEntries((data ?? []).map((r: { partner: string; card: RateCard }) => [r.partner, { ...r.card, partner: r.partner }]));
    },
    saveCards: async (cards) => {
      if (!supabase || !session) return;
      const rows = Object.values(cards)
        .filter((c) => Object.values(c.values).some((v) => String(v).trim() !== ""))
        .map((c) => ({ user_id: session.user.id, partner: c.partner, card: { values: c.values, confirmed: c.confirmed, example: c.example, source: c.source ?? null }, updated_at: new Date().toISOString() }));
      if (rows.length) await supabase.from("rate_cards").upsert(rows, { onConflict: "user_id,partner" });
    },
    saveAudit: async (r) => {
      if (!supabase || !session) return "Log in to save your audit.";
      const row = { user_id: session.user.id, ...toStored(r), updated_at: new Date().toISOString() };
      const { error } = await supabase.from("audits").upsert(row, { onConflict: "user_id,month_key" });
      if (error) return /row-level security/i.test(error.message) ? "Your free audit is used up. Upgrade to audit another month." : "Your audit couldn't be saved. It's still on screen.";
      await refresh();
      return null;
    },
    deleteAudit: async (id) => { if (supabase) { await supabase.from("audits").delete().eq("id", id); await refresh(); } },
    deleteAllData: async () => {
      if (!supabase || !session) return null;
      const a = await supabase.from("audits").delete().eq("user_id", session.user.id);
      const c = await supabase.from("rate_cards").delete().eq("user_id", session.user.id);
      await supabase.from("profiles").update({ brand: "", picked: [] }).eq("user_id", session.user.id);
      await refresh();
      return a.error || c.error ? "Some data couldn't be deleted. Email us and we'll remove it." : null;
    },
    checkout,
    checkoutError,
    billing: async () => {
      if (!supabase || !session) return "Log in first.";
      try {
        const r = await postWithToken("/api/billing-portal", session.access_token);
        if (!r.ok) return r.error ?? "The billing page couldn't open. Try again in a minute.";
        window.location.href = r.url!;
        return null;
      } catch {
        return "The billing page couldn't open. Check your connection and try again.";
      }
    },
  }), [ready, session, profile, audits, loginFor, refresh, checkout, checkoutError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
