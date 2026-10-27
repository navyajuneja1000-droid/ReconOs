import React, { useEffect, useState } from "react";
import { useAccount } from "../account/AccountContext";
import { monthLabel, storedCsv } from "../account/plan";
import { partnerName } from "../engine/partners";
import { download } from "../engine/readFile";
import { PRO, proPrice, withGst } from "../pricing";
import { Btn, inr, Panel, PanelHead } from "../ui";

const PLAN_NAME: Record<string, string> = { free: "Free", starter: "ReconOS Pro", growth: "ReconOS Pro" };
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** The ReconOS Pro button. Logs in first when needed, then opens Dodo checkout. */
export function UpgradeButtons({ compact = false }: { compact?: boolean }) {
  const a = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    const e = await a.checkout("starter");
    setBusy(false); if (e) setErr(e);
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Btn id="upgrade-starter" variant="primary" onClick={go} disabled={busy}>
          {busy ? "Opening checkout" : `${compact ? "Upgrade" : `Get ${PRO.name}`} · ${proPrice()}`}
        </Btn>
        <a href="#pricing" className="text-sm text-emerald-300 hover:underline">Compare plans</a>
      </div>
      {!compact && <p className="text-xs text-slate-400">{inr(withGst(PRO.price))} a month including 18% GST. Cancel any time.</p>}
      {(err || a.checkoutError) && <p role="alert" className="text-sm text-rose-300">{err || a.checkoutError}</p>}
    </div>
  );
}

/** Shown in place of a paid feature. */
export function Locked({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Panel className="grid gap-3 border-emerald-500/40 bg-emerald-950/20 p-5" >
      <div>
        <h3 className="font-semibold">{title}</h3>
        {children && <p className="mt-1 text-sm text-slate-300">{children}</p>}
        <p className="mt-1 text-sm text-slate-400">{PRO.name} includes unlimited audit months, a ready-to-send claim email for each partner and the weekly weight check.</p>
      </div>
      <UpgradeButtons compact />
    </Panel>
  );
}

/** What Dodo sent back in the address after checkout, read once. */
function paymentReturn(): "paid" | "failed" | null {
  const q = new URLSearchParams(window.location.search);
  if (!q.get("subscription_id") && !q.get("payment_id")) return null;
  const st = (q.get("status") ?? "").toLowerCase();
  window.history.replaceState(null, "", window.location.pathname + "#account");
  return st === "active" || st === "succeeded" ? "paid" : "failed";
}

export function AccountView() {
  const a = useAccount();
  const [confirming, setConfirming] = useState<"data" | "account" | null>(null);
  const [msg, setMsg] = useState("");
  const [ret] = useState(paymentReturn);
  const [waited, setWaited] = useState(0);
  const [billingErr, setBillingErr] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);

  // after paying, the plan switches on when Dodo confirms (usually a few seconds); check every 2 seconds for a minute
  const activating = ret === "paid" && !a.paid;
  useEffect(() => {
    if (!activating || waited >= 30) return;
    const t = setTimeout(() => { void a.refresh(); setWaited((w) => w + 1); }, 2000);
    return () => clearTimeout(t);
  }, [activating, waited, a]);

  if (!a.enabled) return <Panel className="p-8 text-center text-slate-300">Accounts open soon.</Panel>;
  if (!a.session) {
    return (
      <Panel className="grid justify-items-center gap-3 p-10 text-center">
        <h1 className="text-2xl font-semibold">Your ReconOS account</h1>
        <p className="max-w-[52ch] text-slate-300">Log in to see your saved audits, keep your rates across devices and manage your plan.</p>
        <Btn variant="primary" onClick={() => a.askLogin("account")}>Log in or sign up</Btn>
      </Panel>
    );
  }
  const p = a.profile;
  const plan = p?.plan ?? "free";
  const status = p?.plan_status ?? "none";

  const deleteAccount = async () => {
    const res = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${a.session!.access_token}` } }).catch(() => null);
    if (!res || !res.ok) return setMsg("Your account couldn't be deleted right now. Email us and we'll do it within 7 days.");
    await a.signOut();
    setMsg("Your account and saved data are deleted.");
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your account</h1>
          <p className="mt-1 text-slate-300">Logged in as <span className="font-medium text-slate-100" data-clarity-mask="True">{a.email}</span></p>
        </div>
        <Btn onClick={() => a.signOut()}>Log out</Btn>
      </div>

      {ret === "paid" && (
        <section id="payment-banner" role="status" className={`rounded-xl border p-5 ${a.paid ? "border-emerald-500/60 bg-emerald-950/40" : "border-slate-700 bg-slate-900/60"}`}>
          {a.paid ? (
            <>
              <h2 className="font-semibold text-emerald-200">Payment received. You're on {PRO.name}.</h2>
              <p className="mt-1 text-sm text-slate-300">Unlimited audits, claim emails and the weekly weight check are now on. Dodo Payments has emailed your receipt.</p>
            </>
          ) : waited < 30 ? (
            <>
              <h2 className="font-semibold">Payment received. Switching on {PRO.name}…</h2>
              <p className="mt-1 text-sm text-slate-300">This usually takes a few seconds. You don't need to do anything.</p>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Your payment went through, but your plan isn't showing yet.</h2>
              <p className="mt-1 text-sm text-slate-300">Refresh this page in a minute. If it still says Free, write to us with your Dodo Payments receipt and we'll switch it on.</p>
            </>
          )}
        </section>
      )}
      {ret === "failed" && !a.paid && (
        <section id="payment-banner" role="alert" className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-5">
          <h2 className="font-semibold text-rose-200">The payment didn't go through.</h2>
          <p className="mt-1 text-sm text-slate-300">You haven't been charged for a plan. You can try again below with the same or a different card.</p>
        </section>
      )}

      <Panel>
        <PanelHead title="Plan" right={<span id="plan-badge" className={`rounded-md px-2 py-0.5 text-xs font-medium ${a.paid ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>{PLAN_NAME[plan]}{plan !== "free" && status !== "active" ? ` · ${status.replace("_", " ")}` : ""}</span>} />
        <div className="grid gap-3 px-5 py-4 text-sm text-slate-300">
          {a.paid ? (
            <>
              <p>{status === "cancelled" ? `Cancelled. You keep ${PRO.name} until ${day(p?.current_period_end ?? null)}.` : `${proPrice()}. Renews ${p?.current_period_end ? `on ${day(p.current_period_end)}` : "monthly"}.`} Unlimited audits, claim emails and the weekly weight check are on.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Btn id="manage-billing" disabled={billingBusy} onClick={async () => { setBillingBusy(true); setBillingErr(""); const e = await a.billing(); setBillingBusy(false); if (e) setBillingErr(e); }}>{billingBusy ? "Opening" : "Manage billing"}</Btn>
                <span className="text-slate-400">Cancel, change your card or download invoices.</span>
              </div>
              {billingErr && <p role="alert" className="text-rose-300">{billingErr}</p>}
              <p className="text-slate-400">Payments are handled by Dodo Payments. See the <a href="/refunds" className="text-emerald-300 hover:underline">Refund and Cancellation Policy</a>.</p>
            </>
          ) : (
            <>
              <p>{plan !== "free" && status === "on_hold" ? "Your last payment didn't go through, so paid features are paused. Update your payment from your Dodo Payments email, or choose a plan again." : `The free plan includes one audit month. ${PRO.name} adds unlimited audit months, a ready-to-send claim email for each partner and the weekly weight check.`}</p>
              <UpgradeButtons />
            </>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Saved audits" sub="Totals and the list of claims. Your report files are never saved." />
        <ul className="divide-y divide-slate-800" data-clarity-mask="True">
          {a.audits.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>
                <span className="font-medium text-slate-100">{monthLabel(x.month_key)}</span>
                <span className="block text-slate-400">{x.partners.map(partnerName).join(", ") || "No partners"} · updated {day(x.updated_at)}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-right tabular-nums"><span className="text-emerald-400">{inr(Number(x.claim_total))}</span><span className="block text-xs text-amber-300">{inr(Number(x.check_total))} to check</span></span>
                <Btn onClick={() => download(`reconos-${x.month_key}.csv`, storedCsv(x))}>CSV</Btn>
                <Btn variant="ghost" className="text-slate-400" onClick={() => a.deleteAudit(x.id)}>Delete</Btn>
              </span>
            </li>
          ))}
          {!a.audits.length && <li className="px-5 py-6 text-center text-sm text-slate-400">No audits yet. Run one from Upload files.</li>}
        </ul>
      </Panel>

      <Panel>
        <PanelHead title="Your data" />
        <div className="grid gap-3 px-5 py-4 text-sm text-slate-300">
          <p>We keep your email, brand name, partners, rate cards and saved audits. You can delete them here at any time.</p>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/5 p-3">
              <span className="text-rose-200">{confirming === "data" ? "Delete all saved audits and rate cards?" : "Delete your account and everything saved in it?"} This can't be undone.</span>
              <Btn onClick={() => setConfirming(null)}>Keep it</Btn>
              <Btn variant="primary" className="bg-rose-500 hover:bg-rose-400" onClick={async () => { const c = confirming; setConfirming(null); if (c === "data") { const e = await a.deleteAllData(); setMsg(e ?? "Saved audits and rate cards deleted."); } else await deleteAccount(); }}>Yes, delete</Btn>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => setConfirming("data")}>Delete saved audits and rates</Btn>
              <Btn variant="ghost" className="text-rose-300" onClick={() => setConfirming("account")}>Delete my account</Btn>
            </div>
          )}
          {msg && <p role="status" className="text-emerald-300">{msg}</p>}
          {a.paid && <p className="text-xs text-slate-400">Deleting your account doesn't cancel a paid plan by itself. Cancel it first with Manage billing above.</p>}
        </div>
      </Panel>
    </div>
  );
}
