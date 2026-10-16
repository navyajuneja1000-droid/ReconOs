import React, { useMemo, useState } from "react";
import type { ViewCtx } from "../App";
import type { TrailRow, TrailState } from "../engine/trail";
import { partnerName } from "../engine/partners";
import { fmtDay, inr, KindTag, Panel } from "../ui";

const STATE: Record<TrailState, { label: string; cls: string }> = {
  leak: { label: "Leak", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  check: { label: "Check", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  matched: { label: "All paid", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  pending: { label: "Not paid yet", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  no_cash_due: { label: "No cash due", cls: "bg-slate-700/40 text-slate-300 border-slate-600" },
  unknown: { label: "Can't tell", cls: "bg-slate-700/40 text-slate-400 border-slate-600" },
};

const SHIP: Record<string, string> = {
  delivered: "Delivered", rto: "Came back (RTO)", in_transit: "In transit", cancelled: "Cancelled", lost: "Lost", other: "Other", not_shipped: "Not shipped", unknown: "No courier file",
};

function Stage({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "bad" | "ok" | "muted" }) {
  const c = tone === "bad" ? "border-rose-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-slate-700";
  return (
    <div className={`min-w-0 rounded-lg border ${c} bg-slate-950/60 p-3`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function Detail({ t, hasBank }: { t: TrailRow; hasBank: boolean }) {
  const via = t.mode === "cod" ? `${t.courierPartner ? partnerName(t.courierPartner) : "Courier"} COD payout` : t.mode === "prepaid" ? `${t.gatewayPartner ? partnerName(t.gatewayPartner) : "Gateway"} settlement` : "Payout";
  const shipper = t.courierPartner && t.courier && t.courier !== partnerName(t.courierPartner) ? `${partnerName(t.courierPartner)} via ${t.courier}` : t.courier;
  return (
    <div className="grid gap-3 bg-slate-900/80 px-4 py-4 sm:px-5">
      <div className="grid gap-2 sm:grid-cols-4">
        <Stage label="Sold" value={inr(t.total)} note={`${t.mode === "cod" ? "Cash on delivery" : "Prepaid"}${t.cancelled ? ", cancelled" : ""}`} />
        <Stage label="Shipment" value={SHIP[t.shipStatus]} note={[shipper, t.awb].filter(Boolean).join(", ")} tone={t.shipStatus === "rto" ? "muted" : undefined} />
        <Stage label={via} value={t.received ? inr(t.received) : "Nothing yet"} note={t.expected ? `Expected ${inr(t.expected)}` : "Nothing expected"} tone={t.received && t.received >= t.expected - 1 ? "ok" : t.expected ? "bad" : "muted"} />
        <Stage label="Your bank" value={!hasBank ? "No statement added" : t.inBank ? "Found" : t.received ? "Not found" : "–"} note={t.receivedRef ? `Bank ref ${t.receivedRef}` : undefined} tone={!hasBank ? "muted" : t.inBank ? "ok" : t.received ? "bad" : "muted"} />
      </div>
      {t.findings.length > 0 && (
        <ul className="grid gap-2">
          {t.findings.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><KindTag kind={f.kind} /><span className="font-medium">{f.title}</span></div>
                <span className="font-semibold tabular-nums">{inr(f.amount)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{f.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const viaOf = (t: TrailRow) => partnerName(t.mode === "cod" ? t.courierPartner : t.gatewayPartner);

export function OrderTrailView({ trail, data, result, partner, setPartner }: ViewCtx) {
  const [state, setState] = useState<TrailState | "all">("all");
  const [mode, setMode] = useState<"all" | "cod" | "prepaid">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(60);
  const hasBank = data.bank.length > 0;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: trail.length };
    for (const t of trail) c[t.state] = (c[t.state] ?? 0) + 1;
    return c;
  }, [trail]);

  const rows = useMemo(() => {
    const s = q.trim().toUpperCase().replace(/^#/, "");
    return trail.filter(
      (t) =>
        (state === "all" || t.state === state) &&
        (mode === "all" || t.mode === mode) &&
        (partner === "all" || partner === "team" || t.courierPartner === partner || t.gatewayPartner === partner) &&
        (!s || t.key.includes(s) || t.awb.includes(s) || t.receivedRef.toUpperCase().includes(s)),
    );
  }, [trail, state, mode, q, partner]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Every order</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Every order, traced from sale to the courier or gateway that handled it to your bank. Open a row to see each step and anything that went wrong.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "leak", "check", "matched", "pending", "no_cash_due"] as const).map((s) => (
          <button key={s} type="button" onClick={() => { setState(s); setLimit(60); }} aria-pressed={state === s} className={`rounded-full border px-3 py-1.5 text-sm ${state === s ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            {s === "all" ? "All orders" : STATE[s].label} <span className="text-slate-400">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Payment</span>
          <select id="mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5">
            <option value="all">All</option>
            <option value="cod">Cash on delivery</option>
            <option value="prepaid">Prepaid</option>
          </select>
        </label>
        {result.partners.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Partner</span>
            <select id="partner-filter" value={partner === "team" ? "all" : partner} onChange={(e) => setPartner(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5">
              <option value="all">All partners</option>
              {result.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, AWB or bank reference" className="w-full min-w-0 flex-1 basis-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm sm:basis-auto sm:max-w-xs" />
        <p className="text-sm text-slate-400">{rows.length} orders</p>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-slate-800 text-left text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-4 py-2.5 font-medium">Via</th>
                <th className="px-4 py-2.5 text-right font-medium">Sold</th>
                <th className="px-4 py-2.5 font-medium">Shipment</th>
                <th className="px-4 py-2.5 text-right font-medium">Paid to you</th>
                <th className="px-4 py-2.5 font-medium">In bank</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.slice(0, limit).map((t) => (
                <React.Fragment key={t.key}>
                  <tr className="cursor-pointer hover:bg-slate-800/40" onClick={() => setOpen(open === t.key ? null : t.key)} aria-expanded={open === t.key}>
                    <td className="px-4 py-2.5 font-medium"><button type="button" className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(open === t.key ? null : t.key); }}>{t.orderId}</button></td>
                    <td className="px-4 py-2.5 text-slate-300">{fmtDay(t.date)}</td>
                    <td className="px-4 py-2.5 text-slate-300">{t.mode === "cod" ? "COD" : t.mode === "prepaid" ? "Prepaid" : "–"}</td>
                    <td className="px-4 py-2.5 text-slate-300">{viaOf(t) || "–"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{inr(t.total)}</td>
                    <td className="px-4 py-2.5 text-slate-300">{SHIP[t.shipStatus]}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{t.received ? inr(t.received) : "–"}</td>
                    <td className="px-4 py-2.5 text-slate-300">{!hasBank ? "–" : t.inBank ? "Yes" : t.received ? "No" : "–"}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATE[t.state].cls}`}>{STATE[t.state].label}</span></td>
                  </tr>
                  {open === t.key && (
                    <tr><td colSpan={9} className="p-0"><Detail t={t} hasBank={hasBank} /></td></tr>
                  )}
                </React.Fragment>
              ))}
              {!rows.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div className="border-t border-slate-800 p-3 text-center">
            <button type="button" onClick={() => setLimit(limit + 100)} className="text-sm font-medium text-emerald-300 hover:underline">Show {Math.min(100, rows.length - limit)} more</button>
          </div>
        )}
      </Panel>
    </div>
  );
}
