import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ViewCtx } from "../App";
import { fmtDay, inr, KindTag, Panel, PanelHead } from "../ui";

const SHORT: Record<string, string> = {
  cod_unpaid: "COD not paid",
  shipping_overcharge: "Shipping overcharges",
  weight_dispute: "Weight disputes",
  gateway_shortfall: "Gateway shortfalls",
  courier_payout_missing: "Courier payout missing",
  gateway_payout_missing: "Gateway payout missing",
};

export function DashboardView({ result, trail, setTab, source, brandName }: ViewCtx) {
  const c = result.cash;
  const traced = trail.filter((t) => t.state === "matched").length;
  const due = trail.filter((t) => t.state !== "no_cash_due" && t.state !== "unknown").length;
  const urgent = result.findings.filter((f) => f.deadline && (f.daysLeft ?? 99) <= 7).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const topClaims = result.findings.filter((f) => f.kind === "claim").sort((a, b) => b.amount - a.amount).slice(0, 6 - Math.min(urgent.length, 3));
  const act = [...urgent.slice(0, 3), ...topClaims];
  const chart = result.buckets.filter((b) => b.ran).map((b) => ({ name: SHORT[b.id], claim: b.claimTotal, check: b.checkTotal }));
  const notRun = result.buckets.filter((b) => !b.ran);
  const sum = (bucket: string, kind?: "claim" | "check") =>
    result.findings.filter((f) => f.bucket === bucket && (!kind || f.kind === kind)).reduce((a, f) => a + f.amount, 0);
  const hasData = result.cash.sold > 0 || result.findings.length > 0;

  if (!hasData) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-semibold">No orders to show yet</h1>
        <p className="mx-auto mt-2 max-w-[52ch] text-slate-300">Add your Shopify orders export, and any Shiprocket, Razorpay or bank files, then run the audit.</p>
        <button type="button" onClick={() => setTab("upload")} className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">Upload files</button>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          {source === "sample" ? "Sample: " : ""}{brandName}, orders from {fmtDay(result.period.from)} to {fmtDay(result.period.to)}, checked as of {fmtDay(result.asOf)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: "You can claim", v: inr(result.claimTotal), s: `${result.findings.filter((f) => f.kind === "claim").length} items with proof`, c: "text-emerald-400", go: "leaks" as const },
          { l: "Worth a check", v: inr(result.checkTotal), s: `${result.findings.filter((f) => f.kind === "check").length} items to look at`, c: "text-amber-300", go: "leaks" as const },
          { l: "Orders fully traced", v: due ? `${Math.round((traced / due) * 100)}%` : "–", s: `${traced} of ${due} orders with money due, traced to your bank`, c: "text-slate-100", go: "orders" as const },
          { l: "Weight disputes closing", v: String(urgent.length), s: urgent[0]?.deadline ? `First one closes ${fmtDay(urgent[0].deadline)}` : "Nothing due this week", c: urgent.length ? "text-rose-300" : "text-slate-100", go: "leaks" as const },
          { l: "Matched in your bank", v: c.reachedBank === null ? "–" : inr(c.reachedBank), s: c.reachedBank === null ? "Add a bank statement" : "Payouts found in your statement", c: "text-slate-100", go: c.reachedBank === null ? ("upload" as const) : ("report" as const) },
        ].map((k) => (
          <button key={k.l} type="button" onClick={() => setTab(k.go)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-slate-600">
            <p className="text-sm text-slate-400">{k.l}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${k.c}`}>{k.v}</p>
            <p className="mt-1 text-xs text-slate-400">{k.s}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHead title="Where the money is leaking" sub="Claim and check amounts by type" right={<button type="button" onClick={() => setTab("leaks")} className="text-sm text-emerald-300 hover:underline">See every item</button>} />
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#1e293b" />
                <XAxis type="number" tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`)} stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" width={150} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "#1e293b" }}
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(v: number, n: string) => [inr(v), n === "claim" ? "Claim" : "Check"]}
                />
                <Bar dataKey="claim" stackId="a" fill="#10b981" />
                <Bar dataKey="check" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="flex gap-4 border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Claim</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Check</span>
          </p>
        </Panel>

        <Panel>
          <PanelHead title="Where your sales went" sub="From what you sold to what reached your bank" />
          <dl className="grid gap-2 px-5 py-4 text-sm">
            {[
              ["Sold in Shopify", c.sold, true],
              ["Cash on delivery", c.codSold, false, true],
              ["Prepaid", c.prepaidSold, false, true],
              ["Gateway fees and GST", -(c.gatewayFees + c.gatewayTax)],
              ["Shipping charges billed", -c.shippingCharges],
              ["COD paid out by courier", c.codRemitted],
              ["COD delivered, not due yet", c.codPendingInGrace],
              ["Settled by Razorpay", c.gatewaySettledNet],
              ...(c.reachedBank !== null ? [["Matched in your bank", c.reachedBank, true]] : []),
            ].map(([l, v, strong, indent]) => (
              <div key={String(l)} className={`flex items-baseline justify-between gap-3 ${indent ? "pl-4 text-slate-400" : "text-slate-300"}`}>
                <dt className={strong ? "font-semibold text-slate-100" : ""}>{String(l)}</dt>
                <dd className={`tabular-nums ${strong ? "font-semibold text-slate-100" : ""}`}>{(v as number) < 0 ? "−" : ""}{inr(Math.abs(v as number))}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-slate-800 px-5 py-3 text-xs text-slate-400">Undelivered orders (RTO) bring in no cash, so payouts are always lower than sales. {c.rtoOrders} orders came back this period.</p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHead title="Act on these first" sub="Disputes closing soon, then the biggest claims" right={<button type="button" onClick={() => setTab("leaks")} className="text-sm text-emerald-300 hover:underline">Write the claims</button>} />
          <ul className="divide-y divide-slate-800">
            {act.map((f) => (
              <li key={f.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindTag kind={f.kind} />
                    <span className="font-medium">{f.title}</span>
                    {f.deadline && <span className="text-xs font-medium text-rose-300">Dispute by {fmtDay(f.deadline)}</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">{[f.orderId && `Order ${f.orderId}`, f.awb && `AWB ${f.awb}`, f.ref && !f.awb && `Ref ${f.ref}`].filter(Boolean).join(", ")}</p>
                </div>
                <p className={`font-semibold tabular-nums ${f.kind === "claim" ? "text-emerald-400" : "text-amber-300"}`}>{inr(f.amount)}</p>
              </li>
            ))}
            {!act.length && <li className="px-5 py-6 text-slate-400">Nothing to act on. Everything ReconOS could check matched.</li>}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="By partner" sub="What each partner owes you" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="px-5 py-2 font-medium">Shiprocket</th><th className="px-5 py-2 text-right font-medium">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr><td className="px-5 py-2">COD not paid or paid short</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("cod_unpaid"))}</td></tr>
                <tr><td className="px-5 py-2">Shipping overcharges</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("shipping_overcharge"))}</td></tr>
                <tr><td className="px-5 py-2">Weight charges open to dispute</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("weight_dispute"))}</td></tr>
                <tr><td className="px-5 py-2">Payouts not in your bank</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("courier_payout_missing"))}</td></tr>
              </tbody>
              <thead className="border-t border-slate-800 text-left text-slate-400">
                <tr><th className="px-5 py-2 font-medium">Razorpay</th><th className="px-5 py-2 text-right font-medium" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr><td className="px-5 py-2">Fee and GST charged above plan</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("gateway_shortfall", "claim"))}</td></tr>
                <tr><td className="px-5 py-2">Unsettled payments and refund gaps</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("gateway_shortfall", "check"))}</td></tr>
                <tr><td className="px-5 py-2">Settlements not in your bank</td><td className="px-5 py-2 text-right tabular-nums">{inr(sum("gateway_payout_missing"))}</td></tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {(notRun.length > 0 || result.insights.length > 0 || result.notes.length > 0) && (
        <div className={`grid gap-6 ${result.insights.length > 0 && (notRun.length > 0 || result.notes.length > 0) ? "lg:grid-cols-2" : ""}`}>
          {result.insights.length > 0 && (
            <Panel>
              <PanelHead title="Also worth knowing" />
              <ul className="divide-y divide-slate-800">
                {result.insights.map((i) => (
                  <li key={i.title} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{i.title}</p>
                      {i.amount !== undefined && <p className="font-semibold tabular-nums">{inr(i.amount)}</p>}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{i.detail}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {(notRun.length > 0 || result.notes.length > 0) && (
            <Panel>
              <PanelHead title="About these files" />
              <ul className="divide-y divide-slate-800 text-sm text-slate-300">
                {notRun.map((b) => (
                  <li key={b.id} className="px-5 py-3"><span className="font-medium text-slate-100">{b.title}</span> wasn't checked. Add {b.needs} to switch it on.</li>
                ))}
                {result.notes.map((n) => <li key={n} className="px-5 py-3">{n}</li>)}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
