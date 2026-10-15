import React, { useMemo, useState } from "react";
import type { Rates, ViewCtx } from "../App";
import { Btn, fmtDay, inr, Panel, PanelHead } from "../ui";

export function FeeCheckView({ data, setTab, rates, setRates }: ViewCtx & { rates: Rates; setRates: (r: Rates) => void }) {
  const [all, setAll] = useState(false);
  const pays = data.gateway.filter((g) => g.type === "payment" && g.amount > 0);

  const rows = useMemo(
    () =>
      pays.map((p) => {
        const premium = p.international || /amex|american express|diners/.test(p.cardNetwork);
        const rate = premium ? rates.premiumPct : rates.feePct;
        const fee = Math.round(p.amount * rate) / 100;
        const tax = Math.round(fee * rates.gstPct) / 100;
        const variance = Math.round((p.fee + p.tax - fee - tax) * 100) / 100;
        const NAMES: Record<string, string> = { upi: "UPI", netbanking: "Net banking", wallet: "Wallet", emi: "EMI", paylater: "Pay later" };
        const net = p.cardNetwork ? (p.cardNetwork === "rupay" ? "RuPay" : p.cardNetwork === "amex" ? "Amex" : p.cardNetwork[0].toUpperCase() + p.cardNetwork.slice(1)) : "";
        const method = p.method === "card" ? `Card${net ? ` (${net})` : ""}` : NAMES[p.method] ?? (p.method || "Other");
        return { p, rate, fee, tax, variance, method, premium };
      }),
    [pays, rates],
  );

  const byMethod = useMemo(() => {
    const m = new Map<string, { n: number; gross: number; billed: number; expected: number }>();
    for (const r of rows) {
      const k = r.method;
      const cur = m.get(k) ?? { n: 0, gross: 0, billed: 0, expected: 0 };
      cur.n++; cur.gross += r.p.amount; cur.billed += r.p.fee + r.p.tax; cur.expected += r.fee + r.tax;
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].gross - a[1].gross);
  }, [rows]);

  const off = rows.filter((r) => r.variance > 1);
  const list = (all ? rows : off).slice(0, 300);
  const totalOver = off.reduce((a, r) => a + r.variance, 0);

  if (!pays.length) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-semibold">Add your Razorpay settlement report</h1>
        <p className="mx-auto mt-2 max-w-[56ch] text-slate-300">Fee check re-prices every Razorpay payment against your plan and flags fees or GST charged above it.</p>
        <Btn variant="primary" className="mt-5" onClick={() => setTab("upload")}>Upload files</Btn>
      </Panel>
    );
  }

  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fee check</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Every Razorpay payment re-priced against your plan. Change the rates to match your agreement and the numbers update across the whole dashboard.</p>
      </div>

      <Panel className="grid gap-4 p-5 sm:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Standard rate (%)</span>
          <span className="text-slate-400">UPI, domestic cards, net banking</span>
          <input id="rate-std" inputMode="decimal" value={rates.feePct} onChange={(e) => setRates({ ...rates, feePct: num(e.target.value) })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Premium rate (%)</span>
          <span className="text-slate-400">Amex, Diners, international</span>
          <input id="rate-prem" inputMode="decimal" value={rates.premiumPct} onChange={(e) => setRates({ ...rates, premiumPct: num(e.target.value) })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">GST on fee (%)</span>
          <span className="text-slate-400">18% unless told otherwise</span>
          <input id="rate-gst" inputMode="decimal" value={rates.gstPct} onChange={(e) => setRates({ ...rates, gstPct: num(e.target.value) })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <p className="text-sm text-slate-400">Charged above plan</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{inr(totalOver)}</p>
          <p className="text-xs text-slate-400">{off.length} of {rows.length} payments</p>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="By payment method" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Method</th>
                <th className="px-5 py-2 text-right font-medium">Payments</th>
                <th className="px-5 py-2 text-right font-medium">Amount</th>
                <th className="px-5 py-2 text-right font-medium">Fee + GST billed</th>
                <th className="px-5 py-2 text-right font-medium">Should be</th>
                <th className="px-5 py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {byMethod.map(([k, v]) => (
                <tr key={k}>
                  <td className="px-5 py-2">{k}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{v.n}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.gross)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.billed, true)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.expected, true)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums ${v.billed - v.expected > 1 ? "text-emerald-400" : "text-slate-400"}`}>{inr(v.billed - v.expected, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title={all ? "All payments" : "Payments charged above plan"}
          right={<Btn onClick={() => setAll(!all)}>{all ? "Show only overcharges" : `Show all ${rows.length}`}</Btn>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Payment</th>
                <th className="px-5 py-2 font-medium">Date</th>
                <th className="px-5 py-2 font-medium">Method</th>
                <th className="px-5 py-2 text-right font-medium">Amount</th>
                <th className="px-5 py-2 text-right font-medium">Fee billed</th>
                <th className="px-5 py-2 text-right font-medium">GST billed</th>
                <th className="px-5 py-2 text-right font-medium">Plan fee + GST</th>
                <th className="px-5 py-2 text-right font-medium">Over</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {list.map((r) => (
                <tr key={r.p.id}>
                  <td className="px-5 py-2 font-mono text-xs text-slate-300">{r.p.id}</td>
                  <td className="px-5 py-2 text-slate-300">{fmtDay(r.p.createdAt)}</td>
                  <td className="px-5 py-2 text-slate-300">{r.method}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(r.p.amount)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(r.p.fee, true)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(r.p.tax, true)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(r.fee + r.tax, true)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums ${r.variance > 1 ? "font-semibold text-emerald-400" : "text-slate-500"}`}>{inr(r.variance, true)}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="px-5 py-6 text-center text-slate-400">Every payment matches your plan.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
