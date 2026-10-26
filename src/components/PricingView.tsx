import React from "react";
import type { ViewCtx } from "../App";
import { PLANS } from "../pricing";
import { inr, Panel } from "../ui";
import { SignupForm } from "./SignupForm";
import { useAccount } from "../account/AccountContext";
import { Btn } from "../ui";

export function PricingView({ result, source, setTab }: ViewCtx) {
  const account = useAccount();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState("");
  const choose = async (id: string) => {
    if (id === "audit") return setTab("upload");
    if (!account.session) return account.askLogin("upgrade");
    setBusy(id); setErr("");
    const e = await account.checkout(id as "starter" | "growth");
    setBusy(null); if (e) setErr(e);
  };
  const days =
    result.period.from && result.period.to
      ? Math.max(1, Math.round((result.period.to.getTime() - result.period.from.getTime()) / 86_400_000) + 1)
      : 30;
  const perMonth = (result.claimTotal / days) * 30;

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Start with a free audit. Pay only if you want ReconOS to check every month. Early-access prices, no annual lock-in.</p>
        <p className="mt-2 max-w-[70ch] text-sm text-slate-400">Prices are in Indian rupees, per month, billed in advance. Any applicable taxes are added at checkout. {account.enabled ? "Payments are handled securely by Dodo Payments." : "Paid plans aren't open for payment yet."} Cancel any time; see the <a href="/refunds" className="text-emerald-300 hover:underline">Refund and Cancellation Policy</a> and <a href="/terms" className="text-emerald-300 hover:underline">Terms</a>.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Panel key={p.id} className={`flex flex-col p-6 ${"highlight" in p && p.highlight ? "border-emerald-500/60 bg-emerald-950/30" : ""}`}>
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-2 text-3xl font-bold tabular-nums">{p.price ? inr(p.price) : "Free"}<span className="text-base font-normal text-slate-400">{p.period}</span></p>
            <p className="mt-2 text-sm text-slate-300">{p.blurb}</p>
            <ul className="mt-5 grid gap-2 text-sm text-slate-300">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span aria-hidden="true" className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            {account.enabled && (
              <div className="mt-auto pt-6">
                {account.paid && account.profile?.plan === p.id ? (
                  <p className="text-sm font-medium text-emerald-300">Your current plan</p>
                ) : (
                  <Btn id={`choose-${p.id}`} variant={"highlight" in p && p.highlight ? "primary" : "secondary"} className="w-full py-2.5" disabled={!!busy || (p.id !== "audit" && account.paid)} onClick={() => choose(p.id)}>
                    {busy === p.id ? "Opening checkout" : p.id === "audit" ? "Start free audit" : account.paid ? "Contact us to switch" : `Choose ${p.name}`}
                  </Btn>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>

      {err && <p role="alert" className="-mt-6 text-sm text-rose-300">{err}</p>}

      <Panel className="grid gap-4 p-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h2 className="text-lg font-semibold">Does it pay for itself?</h2>
          <p className="mt-2 text-slate-300">
            {source === "sample" ? "In the sample data" : "In your files"}, ReconOS found {inr(result.claimTotal)} to claim over {days} days of orders. That's about {inr(perMonth)} a month, against {inr(PLANS[1].price)} for Starter.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Based only on items with proof in {source === "sample" ? "the sample files" : "your own files"}. Real recoveries depend on what your couriers and gateways accept.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Found a month</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{inr(perMonth)}</p>
          </div>
          <div className="rounded-lg bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Starter costs</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{inr(PLANS[1].price)}</p>
          </div>
        </div>
      </Panel>

      <section aria-labelledby="ea" className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-6 sm:p-8">
        <h2 id="ea" className="text-xl font-semibold">Get early access to monthly audits</h2>
        <p className="mt-2 max-w-[62ch] text-slate-300">We'll email you when monthly checks open for your store. No spam, and you can leave any time.</p>
        <div className="mt-5"><SignupForm id="signup-pricing" /></div>
      </section>
    </div>
  );
}
