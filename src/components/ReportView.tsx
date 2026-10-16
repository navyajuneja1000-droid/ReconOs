import React from "react";
import type { ViewCtx } from "../App";
import { Btn, fmtDay, inr, Panel, useCopy } from "../ui";

export function ReportView({ result, brandName, source }: ViewCtx) {
  const { copied, copy } = useCopy();
  const claims = result.findings.filter((f) => f.kind === "claim");
  const c = result.cash;
  const name = source === "sample" ? "Indigo Loom (sample)" : brandName;

  const summary = [
    `ReconOS recovery report: ${name}`,
    `Orders ${fmtDay(result.period.from)} to ${fmtDay(result.period.to)}, checked ${fmtDay(result.asOf)}`,
    "",
    `Owed to you, with proof: ${inr(result.claimTotal)}`,
    ...result.partners.map((p) => `  From ${p.name}: ${inr(p.claimTotal)}${p.checkTotal ? ` (plus ${inr(p.checkTotal)} to check)` : ""}`),
    `Needs a look: ${inr(result.checkTotal)}`,
    "",
    ...result.buckets.filter((b) => b.ran).map((b) => `${b.title}: ${inr(b.claimTotal)} to claim, ${inr(b.checkTotal)} to check`),
  ].join("\n");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recovery report</h1>
          <p className="mt-1 text-slate-300">A one-page summary to share with your co-founder or accountant.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Btn onClick={() => copy("sum", summary)}>{copied === "sum" ? "Copied" : "Copy summary"}</Btn>
          <Btn variant="primary" onClick={() => window.print()}>Print or save as PDF</Btn>
        </div>
      </div>

      <Panel className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-sm text-slate-400">Prepared by ReconOS for</p>
            <p className="text-xl font-semibold">{name}</p>
            <p className="mt-1 text-sm text-slate-400">Orders {fmtDay(result.period.from)} to {fmtDay(result.period.to)}, checked {fmtDay(result.asOf)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Owed to you, with proof</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-400">{inr(result.claimTotal)}</p>
            <p className="text-sm text-amber-300">plus {inr(result.checkTotal)} that needs a look</p>
          </div>
        </div>

        <div className="grid gap-6 py-6 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">By partner</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-slate-400"><tr><th className="py-1 font-medium">Partner</th><th className="py-1 text-right font-medium">Claim</th><th className="py-1 text-right font-medium">Check</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {result.partners.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3 text-slate-300">{p.name}<span className="text-slate-500"> {p.type === "gateway" ? "gateway" : "courier"}{p.missingFiles.length ? `, ${p.files.length} of ${p.files.length + p.missingFiles.length} reports` : ""}</span></td>
                    <td className="py-1.5 text-right tabular-nums">{inr(p.claimTotal)}</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-300">{inr(p.checkTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2 className="mt-6 font-semibold">By leak type</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-slate-400"><tr><th className="py-1 font-medium">Type</th><th className="py-1 text-right font-medium">Claim</th><th className="py-1 text-right font-medium">Check</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {result.buckets.map((b) => (
                  <tr key={b.id}>
                    <td className="py-1.5 pr-3 text-slate-300">{b.title}{!b.ran && <span className="text-slate-500"> (not checked)</span>}</td>
                    <td className="py-1.5 text-right tabular-nums">{b.ran ? inr(b.claimTotal) : "–"}</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-300">{b.ran ? inr(b.checkTotal) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="font-semibold">Where your sales went</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {[
                ["Sold in Shopify", c.sold],
                ["Gateway fees and GST", -(c.gatewayFees + c.gatewayTax)],
                ["Shipping charges billed", -c.shippingCharges],
                ["COD paid out by couriers", c.codRemitted],
                ["COD delivered, not due yet", c.codPendingInGrace],
                ["Paid out by gateways", c.gatewaySettledNet],
                ["Refunded in Shopify", -c.refundedInShopify],
                ...(c.reachedBank !== null ? [["Found in your bank", c.reachedBank]] : []),
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between gap-3"><dt className="text-slate-300">{String(l)}</dt><dd className="tabular-nums">{(v as number) < 0 ? "−" : ""}{inr(Math.abs(v as number))}</dd></div>
              ))}
            </dl>
            {result.insights.length > 0 && (
              <>
                <h2 className="mt-6 font-semibold">Worth knowing</h2>
                <ul className="mt-3 grid gap-2 text-sm text-slate-300">
                  {result.insights.map((i) => <li key={i.title}><span className="font-medium text-slate-100">{i.title}.</span> {i.detail}{i.amount !== undefined ? ` (${inr(i.amount)})` : ""}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>

        <h2 className="border-t border-slate-800 pt-6 font-semibold">Items to claim ({claims.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-slate-400"><tr><th className="py-1.5 font-medium">Raise with</th><th className="py-1.5 font-medium">What</th><th className="py-1.5 font-medium">Order / reference</th><th className="py-1.5 text-right font-medium">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {claims.map((f) => (
                <tr key={f.id}>
                  <td className="py-1.5 pr-3 text-slate-300">{f.counterparty}</td>
                  <td className="py-1.5 pr-3">{f.title}</td>
                  <td className="py-1.5 pr-3 text-slate-400">{[f.orderId, f.awb && `AWB ${f.awb}`, !f.orderId && f.ref].filter(Boolean).join(", ")}</td>
                  <td className="py-1.5 text-right tabular-nums">{inr(f.amount, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
