import React, { useMemo, useState } from "react";
import type { ViewCtx } from "../App";
import { compareCouriers, MIN_SHIPMENTS } from "../engine/compare";
import { ZONE_LABEL, type Zone } from "../engine/partners";
import { inr, Panel, PanelHead } from "../ui";

const fmtPct = (n: number | null) => (n === null ? "–" : `${n}%`);

/** Which courier to ship with, zone by zone. */
export function CourierCompare({ data, result }: Pick<ViewCtx, "data" | "result">) {
  const [zone, setZone] = useState<Zone | "all">("all");
  const all = useMemo(() => compareCouriers(data, result, "all"), [data, result]);
  const c = useMemo(() => compareCouriers(data, result, zone), [data, result, zone]);
  if (all.rows.length < 2) return null;

  // the best pick in each zone, for the summary line
  const perZone = all.zones.map((z) => ({ z, best: compareCouriers(data, result, z).best }));

  return (
    <Panel>
      <PanelHead
        title="Which courier to ship with"
        sub="Every courier side by side, including each courier you book through a shipping platform like Shiprocket. Pick a zone to compare there."
      />
      <div className="grid gap-4 px-5 py-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Zone">
          {(["all", ...all.zones] as const).map((z) => (
            <button key={z} type="button" id={`zone-${z}`} aria-pressed={zone === z} onClick={() => setZone(z)}
              className={`rounded-full border px-3 py-1.5 text-sm ${zone === z ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              {z === "all" ? "All zones" : `${z} · ${ZONE_LABEL[z]}`}
            </button>
          ))}
        </div>

        {c.bestWhy && (
          <p className={`rounded-lg px-4 py-3 text-sm ${c.best ? "border border-emerald-800/60 bg-emerald-950/30 text-emerald-100" : "bg-slate-950/60 text-slate-300"}`}>
            {c.best && <span className="font-semibold">Best value{zone === "all" ? " overall" : ` in zone ${zone}`}: {c.best.label}. </span>}
            {c.bestWhy}
          </p>
        )}

        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Courier</th>
                <th className="px-3 py-2 text-right font-medium">Parcels</th>
                <th className="px-3 py-2 text-right font-medium">Came back</th>
                <th className="px-3 py-2 text-right font-medium">COD came back</th>
                <th className="px-3 py-2 text-right font-medium">COD paid in</th>
                <th className="px-3 py-2 text-right font-medium">Shipping per 500 g</th>
                <th className="px-3 py-2 text-right font-medium">Real cost per 500 g delivered</th>
                <th className="px-5 py-2 text-right font-medium">Overcharged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {c.rows.map((r) => {
                const few = r.shipments < MIN_SHIPMENTS;
                return (
                  <tr key={r.key} className={c.best?.key === r.key ? "bg-emerald-950/30" : ""}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium text-slate-100">{r.label}</span>
                      {c.best?.key === r.key && <span className="ml-2 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-300">Best value</span>}
                      {few && <span className="block text-xs text-slate-500">Too few parcels to judge</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.shipments}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${(r.rtoPct ?? 0) >= 15 ? "text-rose-300" : ""}`}>{fmtPct(r.rtoPct)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmtPct(r.codRtoPct)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                      {r.codPayDays === null ? "–" : `${Math.round(r.codPayDays)} days`}
                      {r.codUnpaid > 0 && <span className="block text-xs text-rose-300">{r.codUnpaid} unpaid</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{r.per500g === null ? "–" : inr(r.per500g)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.costPer500Delivered === null ? "–" : inr(r.costPer500Delivered)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {r.overchargedAmount ? <span className="text-amber-300">{inr(r.overchargedAmount)}</span> : <span className="text-slate-500">₹0</span>}
                      <span className="block text-xs text-slate-500">{r.overchargedPct}% of parcels</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          "Real cost per 500 g delivered" adds up everything a courier billed (shipping, COD fees, return charges and extra weight) and divides it by what actually reached customers, so couriers with more returns cost more.
          {c.noZone > 0 && ` ${c.noZone} parcels had no zone in the file and only count under All zones.`}
        </p>

        {perZone.some((p) => p.best) && (
          <div className="rounded-lg bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-200">Best value by zone</p>
            <ul className="mt-2 grid gap-1 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
              {perZone.map(({ z, best }) => (
                <li key={z}><span className="text-slate-400">{z} · {ZONE_LABEL[z]}:</span> {best ? best.label : "not enough parcels yet"}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
