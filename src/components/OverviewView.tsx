import React from "react";
import type { ViewCtx } from "../App";
import { Btn, inr, KindTag, Panel } from "../ui";
import { MoneyTrail } from "./MoneyTrail";
import { SignupForm } from "./SignupForm";
import { PLANS } from "../pricing";
import { LISTED } from "../engine/partners";

const list = (names: string[]) => `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
const GATEWAY_NAMES = LISTED.gateways.map((p) => p.name);
const COURIER_NAMES = LISTED.couriers.map((p) => p.name);

const WHY = [
  {
    title: "COD money comes back late, in batches",
    body: "The courier collects cash at the door and pays it out days later, many orders at a time. One delivered order missing from a payout is invisible unless you check every AWB.",
  },
  {
    title: "Courier bills change after delivery",
    body: "Parcels get re-weighed and extra charges land in your wallet. On Shiprocket you have 7 working days to dispute before the charge is accepted for you.",
    source: { label: "Shiprocket weight disputes", href: "https://www.shiprocket.in/weight-dispute-management/" },
  },
  {
    title: "Gateway fees are taken before you see the money",
    body: "Razorpay, PayU, Cashfree and the rest take a fee plus 18% GST from every settlement, at a different rate for UPI, debit cards, each credit card network and net banking. A wrong rate, wrong GST or a payment that never settled doesn't show up in a total.",
  },
  {
    title: "The proof is spread across a dozen reports",
    body: "Shopify, three reports from each courier, one from each gateway, and your bank. With two couriers and two gateways that's ten files to match by hand, so most small brands never do it.",
  },
];

const STEPS = [
  { title: "Export last month's reports", body: "Shopify orders, the shipment, COD and weight reports from each courier, the settlement report from each gateway, and your bank statement." },
  { title: "Drop them in and confirm your rates", body: "Each file is matched to the partner that sent it. Rates are filled in from what you were charged, or read from your rate card PDF or screenshot. You check and confirm. Nothing is uploaded." },
  { title: "See the total, then each partner", body: "One combined dashboard, and every finding split by courier and gateway. Gaps are marked Claim when the files prove it, or Check when they need a look." },
  { title: "Send the claims", body: "One ready-to-send email per partner lists every order and amount. Weight disputes come with the last date you can raise them." },
];

const FAQ = [
  { q: "Do my files get uploaded?", a: "No. ReconOS runs in your browser tab. Your files are read on your computer and disappear when you close the tab. Only the rates you enter are remembered, in your own browser, so next month is quicker." },
  { q: "Which couriers and gateways work today?", a: `Gateways: ${list(GATEWAY_NAMES)}. Couriers and shipping aggregators: ${list(COURIER_NAMES)}. Plus Shopify and any bank statement saved as CSV or Excel. Reading partner reports is in beta while we test with real exports, so if a column isn't recognised you can tell ReconOS which one it is.` },
  { q: "I use more than one courier and gateway. Does that work?", a: "Yes, that's what it's built for. Add every partner's files together. The dashboard shows the combined total, the Partners page splits every finding by courier and gateway, and each partner gets its own claim email." },
  { q: "Why do I have to add my rates?", a: "Couriers and gateways charge what you negotiated, not a public price. ReconOS can only say a charge is too high if it knows what you agreed, so each partner needs its rate card before the audit runs. Gateways get a rate for each payment method (UPI, debit cards above and below ₹2,000, RuPay, each credit card network, Amex, net banking and more); couriers get a rate for each zone. To save typing, ReconOS fills them in from what you were charged most often, or reads them from your rate card or agreement (a PDF, a screenshot, an Excel sheet or text from an email). You check every number before the audit runs." },
  { q: "Can it tell me which courier to use?", a: "Yes. The Partners page compares every courier, including each one you book through Shiprocket, zone by zone: how many parcels came back, how fast COD was paid, how often you were overcharged, and what each 500 g delivered really cost." },
  { q: "My gateway sends one file for UPI and another for cards. Is that okay?", a: "Yes. Add them all. Files from the same gateway are combined, and if a file has no payment method column, ReconOS reads the method from the file name or asks you." },
  { q: "What's the difference between Claim and Check?", a: "Claim means your own files prove the money is owed, for example a delivered COD order with no payout. Check means something doesn't add up but needs your eyes first, for example a paid order missing from a gateway's report." },
  { q: "Will this work if I only have some of the files?", a: "Yes. Start with Shopify orders. Every extra file switches on more checks, and the dashboard tells you which checks didn't run and why." },
  { q: "Is the sample data real?", a: "No. Indigo Loom is a made-up brand with a realistic month of orders and a known set of leaks, so you can see exactly what ReconOS finds." },
];

export function OverviewView({ result, setTab, source }: ViewCtx) {
  const claims = result.findings.filter((f) => f.kind === "claim");
  const top = [...claims].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const ordersCount = new Set(result.findings.map((f) => f.orderId).filter(Boolean)).size;

  return (
    <div className="grid gap-16">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
        <div>
          <p className="text-sm font-medium text-emerald-300">For Indian D2C brands on Shopify, with any mix of couriers and payment gateways</p>
          <h1 className="mt-3 max-w-[18ch] text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Find the money your couriers and payment gateways still owe you.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg text-slate-300">
            ReconOS reads the reports from every courier and gateway you use, traces each order from sale to payout to your bank, and writes the claim for each partner.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn variant="primary" className="px-5 py-3 text-base" onClick={() => setTab("dashboard")}>
              {source === "sample" ? "Open the sample dashboard" : "Open your dashboard"}
            </Btn>
            <Btn className="px-5 py-3 text-base" onClick={() => setTab("upload")}>Check my own files</Btn>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M5 9V7a5 5 0 0 1 10 0v2" fill="none" stroke="#34d399" strokeWidth="1.8" /><rect x="3.5" y="9" width="13" height="9" rx="2" fill="#34d399" /></svg>
            Runs in your browser. Your files are never uploaded.
          </p>
        </div>
        <Panel className="p-4 sm:p-6">
          <div className="hidden sm:block"><MoneyTrail result={result} /></div>
          <div className="sm:hidden">
            <p className="font-semibold">Where money leaks between sale and bank</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {[
                ["Gateway fees and settlement gaps", ["gateway_shortfall"]],
                ["COD the courier didn't pay", ["cod_unpaid"]],
                ["Shipping and weight charges", ["shipping_overcharge", "weight_dispute"]],
                ["Payouts that never reached the bank", ["courier_payout_missing", "gateway_payout_missing"]],
              ].map(([label, ids]) => (
                <li key={label as string} className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-950/60 px-3 py-2">
                  <span className="text-slate-300">{label as string}</span>
                  <span className="font-semibold tabular-nums text-rose-300">{inr(result.buckets.filter((b) => (ids as string[]).includes(b.id)).reduce((a, b) => a + b.claimTotal + b.checkTotal, 0))}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {source === "sample"
              ? `In the sample month, ReconOS found ${inr(result.claimTotal)} to claim and ${inr(result.checkTotal)} worth a check, across ${ordersCount} orders and several payouts.`
              : `In your files, ReconOS found ${inr(result.claimTotal)} to claim and ${inr(result.checkTotal)} worth a check.`}
          </p>
        </Panel>
      </section>

      <section aria-labelledby="why">
        <h2 id="why" className="text-2xl font-semibold tracking-tight sm:text-3xl">Why money goes missing</h2>
        <p className="mt-2 max-w-[62ch] text-slate-300">Every order passes through two or three systems before the money is yours. Each one can pay late, pay short or charge extra, and none of them checks the others.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {WHY.map((w) => (
            <Panel key={w.title} className="p-5">
              <h3 className="font-semibold text-slate-100">{w.title}</h3>
              <p className="mt-2 text-slate-300">{w.body}</p>
              {w.source && <a href={w.source.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-300 underline-offset-4 hover:underline">Source: {w.source.label}</a>}
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-slate-950">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="partners">
        <h2 id="partners" className="text-2xl font-semibold tracking-tight sm:text-3xl">Works with your partners</h2>
        <p className="mt-2 max-w-[62ch] text-slate-300">Add reports from as many as you use. ReconOS recognises who sent each file, checks it against that partner's rates, and keeps every finding separate.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[
            { title: "Payment gateways", sub: "Settlement report from each", names: GATEWAY_NAMES },
            { title: "Couriers and shipping platforms", sub: "Shipments, COD payouts and extra weight charges from each", names: COURIER_NAMES },
          ].map((g) => (
            <Panel key={g.title} className="p-5">
              <h3 className="font-semibold">{g.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{g.sub}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.names.map((n) => <li key={n} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm font-medium">{n}</li>)}
              </ul>
            </Panel>
          ))}
        </div>
        <p className="mt-4 max-w-[75ch] text-sm text-slate-400">
          All partners are in beta: each one is built from that partner's published report format, and we're testing against real exports now. If a column isn't recognised, you can match it by hand in a few clicks. Using a partner that isn't listed? Pick "Other" and match its columns.
        </p>
      </section>

      <section aria-labelledby="see">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="see" className="text-2xl font-semibold tracking-tight sm:text-3xl">What you'll see</h2>
            <p className="mt-2 max-w-[62ch] text-slate-300">A live preview from the {source === "sample" ? "sample" : "current"} data. The full dashboard has the order trail, every leak and the claim emails.</p>
          </div>
          <Btn variant="primary" onClick={() => setTab("dashboard")}>Open the full dashboard</Btn>
        </div>
        <Panel className="mt-6 overflow-hidden">
          <div className="grid divide-y divide-slate-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { l: "You can claim", v: inr(result.claimTotal), c: "text-emerald-400" },
              { l: "Worth a check", v: inr(result.checkTotal), c: "text-amber-300" },
              { l: "Sold in Shopify", v: inr(result.cash.sold), c: "text-slate-100" },
              { l: "Found in your bank", v: result.cash.reachedBank === null ? "Add a statement" : inr(result.cash.reachedBank), c: "text-slate-100" },
            ].map((k) => (
              <div key={k.l} className="p-5">
                <p className="text-sm text-slate-400">{k.l}</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${k.c}`}>{k.v}</p>
              </div>
            ))}
          </div>
          <ul className="divide-y divide-slate-800 border-t border-slate-800">
            {top.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <KindTag kind={f.kind} />
                  <span className="font-medium">{f.title}</span>
                  <span className="truncate text-sm text-slate-400">{f.orderId || f.ref}</span>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">{inr(f.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section aria-labelledby="checks">
        <h2 id="checks" className="text-2xl font-semibold tracking-tight sm:text-3xl">What ReconOS checks</h2>
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.buckets.map((b) => (
            <div key={b.id} className="border-l-2 border-emerald-500/50 pl-4">
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{b.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="who" className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 id="who" className="text-xl font-semibold">Who it's for</h2>
          <ul className="mt-3 grid gap-2 text-slate-300">
            <li>Brands selling on their own Shopify store</li>
            <li>Shipping with Shiprocket, Delhivery, Ekart or any mix of couriers, with a good share of cash-on-delivery orders</li>
            <li>Taking prepaid payments through Razorpay, PayU, Cashfree, PhonePe, Paytm or CCAvenue, one or several</li>
            <li>Roughly 300 to 30,000 orders a month, with no finance team checking payouts</li>
          </ul>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-xl font-semibold">Not built for yet</h2>
          <ul className="mt-3 grid gap-2 text-slate-300">
            <li>Amazon, Flipkart or Meesho settlements</li>
            <li>Gateways outside India, like Stripe or PayPal</li>
            <li>Large finance teams who need approvals and Tally export</li>
          </ul>
        </Panel>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions founders ask</h2>
        <div className="mt-6 grid gap-3">
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
      </section>

      <section aria-labelledby="early" className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-6 sm:p-8">
        <h2 id="early" className="text-2xl font-semibold tracking-tight sm:text-3xl">Get monthly audits</h2>
        <p className="mt-2 max-w-[62ch] text-slate-300">
          The one-time audit is free. Monthly checks with claim emails start at {inr(PLANS[1].price)} a month during early access.{" "}
          <button type="button" onClick={() => setTab("pricing")} className="text-emerald-300 underline-offset-4 hover:underline">See pricing</button>
        </p>
        <div className="mt-6">
          <SignupForm id="signup-overview" />
        </div>
      </section>
    </div>
  );
}
