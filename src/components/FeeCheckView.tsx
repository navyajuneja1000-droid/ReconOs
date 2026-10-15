import React, { useMemo, useState } from "react";
import type { ViewCtx } from "../App";
import { expectedGatewayFee, gatewayRateFor } from "../engine/audit";
import { emptyCard, isCardReady, PARTNER_BY_ID, partnerName } from "../engine/partners";
import { FALLBACK_GATEWAY } from "../engine/types";
import { Btn, fmtDay, inr, Panel, PanelHead } from "../ui";
import { CardStatus, RateCardEditor } from "./RateCardEditor";

const NAMES: Record<string, string> = { upi: "UPI", netbanking: "Net banking", nb: "Net banking", wallet: "Wallet", emi: "EMI", paylater: "Pay later", cc: "Credit card", dc: "Debit card" };

function methodLabel(method: string, network: string) {
  const net = network ? (network === "rupay" ? "RuPay" : network === "amex" ? "Amex" : network === "mast" ? "Mastercard" : network[0].toUpperCase() + network.slice(1)) : "";
  if (method === "card" || method === "cc" || method === "dc") return `${NAMES[method] ?? "Card"}${net ? ` (${net})` : ""}`;
  return NAMES[method] ?? (method ? method[0].toUpperCase() + method.slice(1) : "Other");
}

export function FeeCheckView({ data, result, setTab, cards, setCard }: ViewCtx) {
  const gateways = result.partners.filter((p) => p.type === "gateway" && p.files.length);
  const [pick, setPick] = useState<string>("");
  const [all, setAll] = useState(false);
  const gw = gateways.find((g) => g.id === pick)?.id ?? gateways[0]?.id ?? "";
  const card = cards[gw] ?? emptyCard(gw);
  const rates = result.settings.gateway[gw] ?? FALLBACK_GATEWAY;
  const tol = result.settings.tolerance;

  const rows = useMemo(
    () =>
      data.gateway
        .filter((g) => g.partner === gw && g.type === "payment" && g.amount > 0)
        .map((p) => {
          const { pct } = gatewayRateFor(p, rates);
          const fee = expectedGatewayFee(p.amount, pct, rates);
          const tax = Math.round(fee * rates.gstPct) / 100;
          const variance = Math.round((p.fee + p.tax - fee - tax) * 100) / 100;
          return { p, pct, fee, tax, variance, method: methodLabel(p.method, p.cardNetwork) };
        }),
    [data.gateway, gw, rates],
  );

  const byMethod = useMemo(() => {
    const m = new Map<string, { n: number; gross: number; billed: number; expected: number; pct: number }>();
    for (const r of rows) {
      const cur = m.get(r.method) ?? { n: 0, gross: 0, billed: 0, expected: 0, pct: r.pct };
      cur.n++; cur.gross += r.p.amount; cur.billed += r.p.fee + r.p.tax; cur.expected += r.fee + r.tax;
      m.set(r.method, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].gross - a[1].gross);
  }, [rows]);

  if (!gateways.length) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-semibold">Add a payment gateway report</h1>
        <p className="mx-auto mt-2 max-w-[56ch] text-slate-300">Fee check re-prices every payment from Razorpay, PayU, Cashfree, PhonePe, Paytm or CCAvenue against your rate card and flags fees or GST charged above it.</p>
        <Btn variant="primary" className="mt-5" onClick={() => setTab("upload")}>Upload files</Btn>
      </Panel>
    );
  }

  const off = rows.filter((r) => r.variance > tol);
  const list = (all ? rows : off).slice(0, 300);
  const totalOver = off.reduce((a, r) => a + r.variance, 0);
  const name = partnerName(gw);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fee check</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Every gateway payment re-priced against that gateway's rate card. Change a rate and the numbers update across the whole dashboard.</p>
      </div>

      {gateways.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Gateway">
          {gateways.map((g) => (
            <button key={g.id} type="button" aria-pressed={gw === g.id} onClick={() => { setPick(g.id); setAll(false); }} className={`rounded-full border px-3 py-1.5 text-sm ${gw === g.id ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              {g.name} <span className="text-slate-400">{data.gateway.filter((x) => x.partner === g.id && x.type === "payment").length} payments</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <PanelHead title={`${name} rate card`} sub={isCardReady(card) ? "Used for every check below" : `Not confirmed, so a standard ${FALLBACK_GATEWAY.standardPct}% is used until you confirm it`} right={<CardStatus card={card} />} />
          <div className="px-5 py-4"><RateCardEditor key={gw} card={card} onChange={setCard} compact /></div>
        </Panel>
        <Panel className="grid content-start gap-4 p-5">
          <div>
            <p className="text-sm text-slate-400">Charged above your rates</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-400">{inr(totalOver)}</p>
            <p className="text-sm text-slate-400">{off.length} of {rows.length} {name} payments</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-800 pt-4 text-sm">
            <dt className="text-slate-400">Standard</dt><dd className="text-right tabular-nums">{rates.standardPct}%</dd>
            <dt className="text-slate-400">UPI</dt><dd className="text-right tabular-nums">{rates.upiPct}%</dd>
            <dt className="text-slate-400">Amex, Diners, international</dt><dd className="text-right tabular-nums">{rates.premiumPct}%</dd>
            {rates.fixedFee > 0 && <><dt className="text-slate-400">Fixed fee</dt><dd className="text-right tabular-nums">{inr(rates.fixedFee, true)}</dd></>}
            <dt className="text-slate-400">GST on fee</dt><dd className="text-right tabular-nums">{rates.gstPct}%</dd>
          </dl>
          {PARTNER_BY_ID[gw]?.status === "beta" && <p className="text-xs text-slate-400">Reading {name} reports is in beta. If a fee looks wrong, check which column it came from on the Upload page.</p>}
        </Panel>
      </div>

      <Panel>
        <PanelHead title={`${name} by payment method`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Method</th>
                <th className="px-5 py-2 text-right font-medium">Your rate</th>
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
                  <td className="px-5 py-2 text-right tabular-nums text-slate-400">{v.pct}%</td>
                  <td className="px-5 py-2 text-right tabular-nums">{v.n}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.gross)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.billed, true)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{inr(v.expected, true)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums ${v.billed - v.expected > tol ? "text-emerald-400" : "text-slate-400"}`}>{inr(v.billed - v.expected, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title={all ? `All ${name} payments` : `${name} payments charged above your rates`}
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
                <th className="px-5 py-2 text-right font-medium">Your rate + GST</th>
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
                  <td className={`px-5 py-2 text-right tabular-nums ${r.variance > tol ? "font-semibold text-emerald-400" : "text-slate-500"}`}>{inr(r.variance, true)}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="px-5 py-6 text-center text-slate-400">Every {name} payment matches your rates.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
