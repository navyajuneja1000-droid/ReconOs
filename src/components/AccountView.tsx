import React, { useState } from "react";
import { useAccount } from "../account/AccountContext";
import { monthLabel, storedCsv } from "../account/plan";
import { partnerName } from "../engine/partners";
import { download } from "../engine/readFile";
import { PLANS } from "../pricing";
import { Btn, inr, Panel, PanelHead } from "../ui";

const PLAN_NAME: Record<string, string> = { free: "Free", starter: "Starter", growth: "Growth" };
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Starter and Growth buttons. Logs in first when needed, then opens Dodo checkout. */
export function UpgradeButtons({ compact = false }: { compact?: boolean }) {
  const a = useAccount();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const go = async (plan: "starter" | "growth") => {
    if (!a.session) return a.askLogin("upgrade");
    setBusy(plan); setErr("");
    const e = await a.checkout(plan);
    setBusy(null); if (e) setErr(e);
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {PLANS.filter((p) => p.price).map((p) => (
          <Btn key={p.id} id={`upgrade-${p.id}`} variant={"highlight" in p && p.highlight ? "primary" : "secondary"} onClick={() => go(p.id as "starter" | "growth")} disabled={!!busy}>
            {busy === p.id ? "Opening checkout" : `${compact ? "" : "Get "}${p.name} · ${inr(p.price)}${p.period}`}
          </Btn>
        ))}
      </div>
      {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
    </div>
  );
}

/** Shown in place of a paid feature. */
export function Locked({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Panel className="grid gap-3 border-emerald-500/40 bg-emerald-950/20 p-5" >
      <h3 className="font-semibold">{title}</h3>
      {children && <p className="text-sm text-slate-300">{children}</p>}
      <UpgradeButtons compact />
    </Panel>
  );
}

export function AccountView() {
  const a = useAccount();
  const [confirming, setConfirming] = useState<"data" | "account" | null>(null);
  const [msg, setMsg] = useState("");

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

      <Panel>
        <PanelHead title="Plan" right={<span id="plan-badge" className={`rounded-md px-2 py-0.5 text-xs font-medium ${a.paid ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>{PLAN_NAME[plan]}{plan !== "free" && status !== "active" ? ` · ${status.replace("_", " ")}` : ""}</span>} />
        <div className="grid gap-3 px-5 py-4 text-sm text-slate-300">
          {a.paid ? (
            <>
              <p>{status === "cancelled" ? `Cancelled. You keep paid features until ${day(p?.current_period_end ?? null)}.` : `Renews ${p?.current_period_end ? `on ${day(p.current_period_end)}` : "monthly"}.`} Unlimited audits, claim emails and the weekly weight check are on.</p>
              <p className="text-slate-400">To change or cancel your plan, use the link in your Dodo Payments receipt email, or write to us. See the <a href="/refunds" className="text-emerald-300 hover:underline">Refund and Cancellation Policy</a>.</p>
            </>
          ) : (
            <>
              <p>{plan !== "free" && status === "on_hold" ? "Your last payment didn't go through, so paid features are paused. Update your payment from your Dodo Payments email, or choose a plan again." : "The free plan includes one audit month. Upgrade for unlimited audits, ready-to-send claim emails and the weekly weight check."}</p>
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
          {a.paid && <p className="text-xs text-slate-400">Deleting your account doesn't cancel a paid plan by itself. Cancel it first from your Dodo Payments email.</p>}
        </div>
      </Panel>
    </div>
  );
}
