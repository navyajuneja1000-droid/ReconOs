import React from "react";
import type { ViewCtx } from "../App";
import { PLANS, PRO, withGst } from "../pricing";
import { inr, Panel } from "../ui";
import { useAccount } from "../account/AccountContext";
import { Btn } from "../ui";

const FAQ = [
  { q: "What happens after I pay?", a: `You go back to your ReconOS account and ${PRO.name} switches on within a few seconds. Unlimited audit months, the claim emails and the weekly weight check unlock straight away, on any device you log in from.` },
  { q: "Is GST extra?", a: `Yes. ${PRO.name} is ₹${PRO.price.toLocaleString("en-IN")} a month plus 18% GST, so ${inr(withGst(PRO.price))} a month in total. The tax is shown at checkout before you pay, and Dodo Payments emails you an invoice.` },
  { q: "Can I cancel?", a: "Yes, any time, from Manage billing on your account page. You keep Pro until the end of the month you've paid for, and you won't be charged again. See the Refund and Cancellation Policy for refunds." },
  { q: "Who handles the payment?", a: "Dodo Payments, our payment partner, processes the payment and keeps your card details. ReconOS never sees or stores your card." },
  { q: "Do my report files get uploaded?", a: "No. Your courier, gateway and Shopify files are read in your browser and never sent to us. Your account only saves your rates and the totals and claim list from each audit, so you can come back to them." },
  { q: "Do I need to pay to try it?", a: "No. The free audit runs every check on one month of your files. Pay only if you want ReconOS every month and the ready-to-send claim emails." },
];

export function PricingView({ result, source, setTab }: ViewCtx) {
  const account = useAccount();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const choose = async (id: string) => {
    if (id === "audit") return setTab("upload");
    setBusy(true); setErr("");
    const e = await account.checkout("starter");
    setBusy(false); if (e) setErr(e);
  };
  const days =
    result.period.from && result.period.to
      ? Math.max(1, Math.round((result.period.to.getTime() - result.period.from.getTime()) / 86_400_000) + 1)
      : 30;
  const perMonth = (result.claimTotal / days) * 30;

  const isPro = account.paid;
  const shownErr = err || account.checkoutError;

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Start with a free audit. Upgrade to {PRO.name} when you want ReconOS checking every month. No annual lock-in.</p>
        <p className="mt-2 max-w-[70ch] text-sm text-slate-400">Prices are in Indian rupees. {PRO.name} is billed monthly in advance, plus 18% GST. {account.enabled ? "Payments are handled securely by Dodo Payments." : "Paid plans aren't open for payment yet."} Cancel any time; see the <a href="/refunds" className="text-emerald-300 hover:underline">Refund and Cancellation Policy</a> and <a href="/terms" className="text-emerald-300 hover:underline">Terms</a>.</p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-2">
        {PLANS.map((p) => {
          const pro = p.id !== "audit";
          return (
            <Panel key={p.id} id={`plan-${p.id}`} className={`relative flex flex-col p-6 ${pro ? "border-emerald-500/60 bg-emerald-950/30 md:order-2" : "order-2 md:order-1"}`}>
              {pro && <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-slate-950">Recommended</span>}
              <h2 className="text-lg font-semibold">{p.name}</h2>
              {pro ? (
                <>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{inr(p.price)}<span className="text-base font-normal text-slate-300"> + GST{p.period}</span></p>
                  <p className="mt-1 text-sm text-slate-400">{inr(withGst(p.price))} a month including 18% GST</p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-bold">Free</p>
                  <p className="mt-1 text-sm text-slate-400">No card needed</p>
                </>
              )}
              <p className="mt-3 text-sm text-slate-300">{p.blurb}</p>
              <ul className="mt-5 grid gap-2 text-sm text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span aria-hidden="true" className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              {account.enabled && (
                <div className="mt-auto pt-6">
                  {pro && isPro ? (
                    <p className="text-sm font-medium text-emerald-300">Your current plan. <a href="#account" className="underline-offset-4 hover:underline">Manage it in your account</a>.</p>
                  ) : (
                    <Btn id={`choose-${p.id}`} variant={pro ? "primary" : "secondary"} className="w-full py-2.5" disabled={busy} onClick={() => choose(p.id)}>
                      {pro ? (busy ? "Opening checkout" : `Get ${p.name}`) : "Start free audit"}
                    </Btn>
                  )}
                  {pro && !isPro && <p className="mt-2 text-center text-xs text-slate-400">Secure checkout by Dodo Payments. Cancel any time.</p>}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {shownErr && <p role="alert" className="-mt-6 text-center text-sm text-rose-300">{shownErr}</p>}

      <Panel className="grid gap-4 p-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h2 className="text-lg font-semibold">Does it pay for itself?</h2>
          <p className="mt-2 text-slate-300">
            {source === "sample" ? "In the sample data" : "In your files"}, ReconOS found {inr(result.claimTotal)} to claim over {days} days of orders. That's about {inr(perMonth)} a month, against {inr(withGst(PRO.price))} a month for {PRO.name} including GST.
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
            <p className="text-sm text-slate-400">{PRO.name} costs</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{inr(withGst(PRO.price))}</p>
            <p className="text-xs text-slate-500">incl. GST</p>
          </div>
        </div>
      </Panel>

      <section aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-semibold">Questions about paying</h2>
        <div className="mt-4 grid gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden="true" className="text-slate-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-[70ch] text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">Other questions? Write to us from the <a href="/contact" className="text-emerald-300 hover:underline">Contact</a> page.</p>
      </section>
    </div>
  );
}
