/**
 * Courier comparison: for each courier (and each courier inside a shipping platform like
 * Shiprocket), how it performs in each zone. Returns, COD payout speed, overcharges, and what
 * each delivered order really cost, so a brand can see who to ship with.
 */
import { slabsFor } from "./audit";
import { partnerName, PARTNER_BY_ID, zoneFrom, type Zone } from "./partners";
import type { AuditResult, Dataset, Shipment } from "./types";
import { daysBetween, median, r2 } from "./util";

export interface CourierRow {
  key: string;
  partner: string;
  /** "Shiprocket via Xpressbees", or "Delhivery" for a direct courier */
  label: string;
  shipments: number;
  deliveredPct: number | null;
  /** share of finished shipments that came back */
  rtoPct: number | null;
  codRtoPct: number | null;
  /** median days from delivery to the COD payout */
  codPayDays: number | null;
  codUnpaid: number;
  per500g: number | null;
  /** everything billed (shipping, COD fees, returns, extra weight) divided by orders delivered */
  costPerDelivered: number | null;
  /** the same, per 500 g delivered, so heavier parcels don't make a courier look worse */
  costPer500Delivered: number | null;
  overchargedPct: number;
  overchargedAmount: number;
  weightChargedPct: number;
}

export interface Comparison {
  zones: Zone[];
  rows: CourierRow[];
  best: CourierRow | null;
  bestWhy: string;
  /** shipments with no zone in the file, left out of zone views */
  noZone: number;
}

/** A courier needs this many shipments in a view before it can be called best. */
export const MIN_SHIPMENTS = 10;

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function carrierLabel(sh: Shipment): string {
  const name = partnerName(sh.partner);
  const carrier = sh.courier.trim();
  if (!carrier || !PARTNER_BY_ID[sh.partner]?.aggregator || carrier.toLowerCase() === name.toLowerCase()) return name;
  return `${name} via ${carrier}`;
}

export function compareCouriers(ds: Dataset, result: AuditResult, zone: Zone | "all" = "all"): Comparison {
  const zonesSeen = new Set<Zone>();
  let noZone = 0;
  for (const s of ds.shipments) {
    const z = zoneFrom(s.zone);
    if (z) zonesSeen.add(z);
    else noZone++;
  }
  const ships = ds.shipments.filter((s) => zone === "all" || zoneFrom(s.zone) === zone);
  const charges = new Map<string, number>();
  const forward = new Map<string, number>();
  for (const c of ds.charges) {
    charges.set(c.awb, (charges.get(c.awb) ?? 0) + c.amount);
    if (c.type === "forward" && !forward.has(c.awb)) forward.set(c.awb, c.amount);
  }
  const weights = new Map<string, number>();
  for (const w of ds.weights) weights.set(w.awb, (weights.get(w.awb) ?? 0) + w.extraCharge);
  const remAt = new Map<string, Date>();
  for (const r of ds.remittances) if (r.awb && r.remittedAt && !remAt.has(r.awb)) remAt.set(r.awb, r.remittedAt);
  const over = new Map<string, number>();
  const unpaid = new Set<string>();
  for (const f of result.findings) {
    if (!f.awb) continue;
    if (f.bucket === "shipping_overcharge" || f.bucket === "weight_dispute") over.set(f.awb, (over.get(f.awb) ?? 0) + f.amount);
    if (f.bucket === "cod_unpaid") unpaid.add(f.awb);
  }
  const orders = new Map(ds.orders.map((o) => [o.orderId, o]));
  const isCod = (s: Shipment) => (s.paymentMode !== "unknown" ? s.paymentMode : orders.get(s.orderId)?.paymentMode) === "cod";

  const groups = new Map<string, Shipment[]>();
  for (const s of ships) {
    const k = carrierLabel(s);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  const rows: CourierRow[] = [...groups].map(([label, list]) => {
    const finished = list.filter((s) => s.status === "delivered" || s.status === "rto");
    const delivered = list.filter((s) => s.status === "delivered");
    const cod = list.filter(isCod);
    const codFinished = cod.filter((s) => s.status === "delivered" || s.status === "rto");
    const payDays = cod.filter((s) => s.deliveredAt && remAt.has(s.awb)).map((s) => daysBetween(s.deliveredAt!, remAt.get(s.awb)!));
    const slabRates = list.filter((s) => forward.has(s.awb) && s.chargedKg > 0).map((s) => forward.get(s.awb)! / slabsFor(s.chargedKg));
    const billed = list.reduce((a, s) => a + (charges.get(s.awb) ?? 0) + (weights.get(s.awb) ?? 0), 0);
    const overList = list.filter((s) => over.has(s.awb));
    const deliveredSlabs = delivered.reduce((a, s) => a + (s.chargedKg > 0 ? slabsFor(s.chargedKg) : 1), 0);
    return {
      key: label,
      partner: list[0].partner,
      label,
      shipments: list.length,
      deliveredPct: pct(delivered.length, finished.length),
      rtoPct: pct(finished.length - delivered.length, finished.length),
      codRtoPct: pct(codFinished.filter((s) => s.status === "rto").length, codFinished.length),
      codPayDays: payDays.length ? median(payDays) : null,
      codUnpaid: cod.filter((s) => unpaid.has(s.awb)).length,
      per500g: slabRates.length ? r2(slabRates.reduce((a, b) => a + b, 0) / slabRates.length) : null,
      costPerDelivered: delivered.length && billed ? r2(billed / delivered.length) : null,
      costPer500Delivered: deliveredSlabs && billed ? r2(billed / deliveredSlabs) : null,
      overchargedPct: pct(overList.length, list.length) ?? 0,
      overchargedAmount: r2(overList.reduce((a, s) => a + over.get(s.awb)!, 0)),
      weightChargedPct: pct(list.filter((s) => weights.has(s.awb)).length, list.length) ?? 0,
    };
  });
  // cheapest per 500 g delivered first; within 3% of each other, fewer returns wins
  const cost = (r: CourierRow) => r.costPer500Delivered ?? Infinity;
  rows.sort((a, b) => {
    const close = Math.abs(cost(a) - cost(b)) <= 0.03 * Math.min(cost(a), cost(b));
    return close ? (a.rtoPct ?? 100) - (b.rtoPct ?? 100) : cost(a) - cost(b);
  });

  const eligible = rows.filter((r) => r.shipments >= MIN_SHIPMENTS && r.costPer500Delivered !== null);
  const best = eligible[0] ?? null;
  let bestWhy = "";
  const where = zone === "all" ? "" : " in this zone";
  if (best && eligible.length > 1) {
    const next = eligible[1];
    const gap = cost(next) - cost(best);
    bestWhy = gap <= 0.03 * cost(best)
      ? `${best.label} and ${next.label} cost about the same${where} (₹${Math.round(cost(best))} for every 500 g delivered), but fewer of ${best.label}'s parcels came back (${best.rtoPct}% against ${next.rtoPct}%).`
      : `${best.label} cost ₹${Math.round(cost(best))} for every 500 g delivered${where}, ₹${Math.round(gap)} less than ${next.label}, counting returns, COD fees and extra weight.`;
  } else if (!eligible.length && rows.length) {
    bestWhy = `Not enough shipments to compare yet. Each courier needs at least ${MIN_SHIPMENTS} here.`;
  } else if (eligible.length === 1 && rows.length > 1) {
    bestWhy = `Only ${eligible[0].label} has ${MIN_SHIPMENTS} or more shipments here, so there's nothing fair to compare it with yet.`;
  }
  return { zones: [...zonesSeen].sort(), rows, best: eligible.length > 1 ? best : null, bestWhy, noZone };
}
