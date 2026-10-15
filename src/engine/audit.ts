import type {
  AuditResult, BankTxn, BucketId, BucketSummary, CashView, Dataset, FileKind, Finding, GatewayTxn,
  Insight, Order, PartnerSummary, Settings, Shipment,
} from "./types";
import { DEFAULT_SETTINGS, FALLBACK_COURIER_DAYS, FALLBACK_GATEWAY } from "./types";
import { PARTNER_BY_ID, PARTNERS, partnerName, ZONE_LABEL, zoneFrom, type GatewayRates, type PartnerType } from "./partners";
import { addWorkingDays, daysBetween, fmtDate, fmtINR, median, r2 } from "./util";

const BUCKETS: Record<BucketId, { title: string; blurb: string; side: PartnerType; needs: string }> = {
  cod_unpaid: {
    title: "COD money the courier hasn't paid you",
    blurb: "Delivered cash-on-delivery orders with no payout, or a payout smaller than the cash collected.",
    side: "courier",
    needs: "Shopify orders, plus each courier's shipments file and COD remittance",
  },
  courier_payout_missing: {
    title: "Courier payouts that didn't reach your bank",
    blurb: "Remittances a courier says it paid, with no matching credit in your bank statement.",
    side: "courier",
    needs: "a courier's COD remittance and your bank statement",
  },
  shipping_overcharge: {
    title: "Shipping overcharges",
    blurb: "Charges above your rate card, the same charge billed twice, COD fees on prepaid orders, and return charges on delivered orders.",
    side: "courier",
    needs: "a courier's shipments & charges file",
  },
  weight_dispute: {
    title: "Weight charges you can still dispute",
    blurb: "Extra weight charges still open. Check your packed weight and dispute before the window closes.",
    side: "courier",
    needs: "a courier's weight discrepancy file",
  },
  gateway_shortfall: {
    title: "Payment gateway shortfalls",
    blurb: "Fees above your rate card, GST charged wrongly, prepaid orders never settled, and refund mismatches.",
    side: "gateway",
    needs: "a gateway's settlement report (add Shopify orders to also find missing payments)",
  },
  gateway_payout_missing: {
    title: "Gateway payouts that didn't reach your bank",
    blurb: "Settlements a gateway marked as paid, with no matching credit in your bank statement.",
    side: "gateway",
    needs: "a gateway's settlement report and your bank statement",
  },
};

export const BUCKET_ORDER: BucketId[] = [
  "cod_unpaid",
  "shipping_overcharge",
  "weight_dispute",
  "gateway_shortfall",
  "courier_payout_missing",
  "gateway_payout_missing",
];

export function bucketMeta(id: BucketId) {
  return BUCKETS[id];
}

const COURIER_FILES: FileKind[] = ["courier_shipments", "courier_cod", "courier_weight"];
const GATEWAY_FILES: FileKind[] = ["gateway_settlements"];

function latestDate(ds: Dataset): Date | null {
  let max = 0;
  const see = (d: Date | null | undefined) => {
    if (d && d.getTime() > max) max = d.getTime();
  };
  ds.orders.forEach((o) => see(o.createdAt));
  ds.shipments.forEach((s) => see(s.deliveredAt));
  ds.remittances.forEach((r) => see(r.remittedAt));
  ds.weights.forEach((w) => see(w.raisedAt));
  ds.gateway.forEach((g) => { see(g.createdAt); see(g.settledAt); });
  ds.bank.forEach((b) => see(b.date));
  return max ? new Date(max) : null;
}

function range(dates: (Date | null | undefined)[]): { min: Date | null; max: Date | null } {
  const ts = dates.filter((d): d is Date => !!d).map((d) => d.getTime());
  if (!ts.length) return { min: null, max: null };
  return { min: new Date(Math.min(...ts)), max: new Date(Math.max(...ts)) };
}

const groupBy = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const list = m.get(k);
    if (list) list.push(x);
    else m.set(k, [x]);
  }
  return m;
};

/** Some gateway exports are in paise. Detect that per gateway by comparing with Shopify order values. */
function fixGatewayUnits(ds: Dataset, notes: string[]) {
  const prepaid = ds.orders.filter((o) => o.paymentMode === "prepaid" && o.total > 0).map((o) => o.total);
  if (!prepaid.length) return;
  for (const [partner, rows] of groupBy(ds.gateway, (g) => g.partner)) {
    const pays = rows.filter((g) => g.type === "payment" && g.amount > 0);
    if (!pays.length) continue;
    const allInts = pays.every((p) => Number.isInteger(p.amount));
    const ratio = median(pays.map((p) => p.amount)) / median(prepaid);
    if (allInts && ratio > 50) {
      for (const g of rows) {
        g.amount /= 100; g.fee /= 100; g.tax /= 100; g.credit /= 100; g.debit /= 100;
      }
      notes.push(`${partnerName(partner)} amounts looked like paise, so they were converted to rupees.`);
    }
  }
}

interface BankMatcher {
  covered(d: Date | null): boolean;
  find(opts: { refs: string[]; amount: number; date: Date | null; keyword?: RegExp }): BankTxn | null;
  matchedTotal(): number;
}

function makeBankMatcher(bank: BankTxn[], s: Settings): BankMatcher {
  const used = new Set<number>();
  const { min, max } = range(bank.map((b) => b.date));
  let total = 0;
  return {
    covered(d) {
      if (!d || !min || !max) return false;
      // a payout on date d should land within bankMatchDays; only judge it if the statement covers that
      return d.getTime() >= min.getTime() && daysBetween(d, max) >= s.bankMatchDays;
    },
    find({ refs, amount, date, keyword }) {
      const deposits = bank.filter((b) => b.deposit > 0 && !used.has(b.row));
      const wanted = refs.map((r) => r.toUpperCase()).filter(Boolean);
      let hit =
        wanted.length > 0
          ? deposits.find((b) => wanted.some((w) => b.refs.includes(w) || b.narration.toUpperCase().includes(w) || b.ref.toUpperCase() === w))
          : undefined;
      if (!hit && date) {
        const near = deposits.filter(
          (b) => b.date && Math.abs(daysBetween(date, b.date)) <= s.bankMatchDays && Math.abs(b.deposit - amount) <= s.tolerance,
        );
        const preferred = keyword ? near.filter((b) => keyword.test(b.narration)) : near;
        if (preferred.length === 1) hit = preferred[0];
        else if (near.length === 1) hit = near[0];
      }
      if (hit) {
        used.add(hit.row);
        total += hit.deposit;
        return hit;
      }
      return null;
    },
    matchedTotal: () => r2(total),
  };
}

/** Which rate applies to a gateway payment. */
export function gatewayRateFor(p: Pick<GatewayTxn, "method" | "cardNetwork" | "international">, rates: GatewayRates): { pct: number; tier: "standard" | "upi" | "premium" } {
  if (p.international || /amex|american express|diners/.test(`${p.cardNetwork} ${p.method}`)) return { pct: rates.premiumPct, tier: "premium" };
  if (/upi/.test(p.method)) return { pct: rates.upiPct, tier: "upi" };
  return { pct: rates.standardPct, tier: "standard" };
}

export const expectedGatewayFee = (amount: number, pct: number, rates: GatewayRates) => r2((amount * pct) / 100 + rates.fixedFee);

/** Shipping slabs are 500 g each, rounded up. */
export const slabsFor = (kg: number) => Math.max(1, Math.ceil(Math.round(kg * 1000) / 500));

export function audit(ds: Dataset, settingsIn: Partial<Settings> = {}): AuditResult {
  const s: Settings = { ...DEFAULT_SETTINGS, ...settingsIn };
  const notes = [...ds.notes];
  const findings: Finding[] = [];
  const insights: Insight[] = [];
  const asOf = s.asOf ?? latestDate(ds) ?? new Date();
  const tol = s.tolerance;
  const ran = new Map<BucketId, Set<string>>();
  const markRan = (b: BucketId, partner: string) => {
    const set = ran.get(b) ?? new Set<string>();
    set.add(partner);
    ran.set(b, set);
  };
  const gwRates = (p: string) => s.gateway[p] ?? FALLBACK_GATEWAY;
  const courierDays = (p: string) => s.courier[p] ?? FALLBACK_COURIER_DAYS;

  fixGatewayUnits(ds, notes);

  const orderById = new Map(ds.orders.map((o) => [o.orderId, o]));
  const bankM = makeBankMatcher(ds.bank, s);

  const add = (f: Omit<Finding, "counterparty"> & { counterparty?: string; partner: string }) => {
    findings.push({ counterparty: partnerName(f.partner), ...f, amount: r2(f.amount) });
  };
  const display = (orderId: string) => orderById.get(orderId)?.displayId || (orderId ? `#${orderId}` : "");
  const modeOf = (sh: Shipment) => (sh.paymentMode !== "unknown" ? sh.paymentMode : orderById.get(sh.orderId)?.paymentMode ?? "unknown");
  const filesOf = (p: string) => ds.partnerFiles[p] ?? [];

  // ───────────── COD: unpaid and short-paid ─────────────
  let codPending = 0;
  const codRemittedBy: Record<string, number> = {};
  if (ds.remittances.length) {
    const remByAwb = new Map<string, number>();
    const remByOrder = new Map<string, number>();
    for (const r of ds.remittances) {
      if (r.awb) remByAwb.set(r.awb, (remByAwb.get(r.awb) ?? 0) + r.remitted);
      if (r.orderId) remByOrder.set(r.orderId, (remByOrder.get(r.orderId) ?? 0) + r.remitted);
      codRemittedBy[r.partner] = r2((codRemittedBy[r.partner] ?? 0) + r.remitted);
    }

    // Some couriers pay COD net of their fees. If most of a courier's payouts are short, treat its shortfalls as "check".
    const netOfFees = new Set<string>();
    for (const [p, rows] of groupBy(ds.remittances, (r) => r.partner)) {
      const withCod = rows.filter((r) => r.codAmount > 0);
      const shortShare = withCod.length ? withCod.filter((r) => r.codAmount - r.remitted > tol).length / withCod.length : 0;
      if (shortShare > 0.4) {
        netOfFees.add(p);
        notes.push(`Most ${partnerName(p)} COD payouts are lower than the COD amount, which usually means fees are deducted before paying. Its short payouts are marked for checking, not claiming.`);
      }
    }

    for (const p of new Set(ds.remittances.map((r) => r.partner))) {
      markRan("cod_unpaid", p);
      if (filesOf(p).includes("courier_shipments")) continue;
      notes.push(`Without ${partnerName(p)}'s shipments file, its unpaid COD can't be spotted (we don't know which orders were delivered). Short payouts were still checked.`);
      for (const r of ds.remittances.filter((x) => x.partner === p)) {
        if (r.codAmount - r.remitted > tol) {
          add({
            id: `cod_short:${r.awb || r.orderId}`,
            bucket: "cod_unpaid",
            kind: netOfFees.has(p) ? "check" : "claim",
            partner: p,
            title: "COD paid short",
            reason: `COD of ${fmtINR(r.codAmount)}, but only ${fmtINR(r.remitted)} was paid to you.`,
            amount: r.codAmount - r.remitted,
            orderId: display(r.orderId),
            awb: r.awb,
            date: r.remittedAt,
          });
        }
      }
    }

    for (const sh of ds.shipments) {
      if (!filesOf(sh.partner).includes("courier_cod")) continue;
      const order = orderById.get(sh.orderId);
      if (modeOf(sh) !== "cod" || sh.status !== "delivered") continue;
      const expected = sh.codAmount || order?.total || 0;
      if (!expected) continue;
      const got = remByAwb.get(sh.awb) ?? (sh.orderId ? remByOrder.get(sh.orderId) : undefined);
      if (got === undefined) {
        const age = sh.deliveredAt ? daysBetween(sh.deliveredAt, asOf) : null;
        if (age !== null && age <= courierDays(sh.partner).codPayDays) {
          codPending += expected;
          continue;
        }
        add({
          id: `cod_unpaid:${sh.awb}`,
          bucket: "cod_unpaid",
          kind: age === null ? "check" : "claim",
          partner: sh.partner,
          title: "Delivered, but COD not paid",
          reason: age === null
            ? `Marked delivered, but no payout found and no delivery date to judge how late it is.`
            : `Delivered on ${fmtDate(sh.deliveredAt)} (${age} days ago). No COD payout found for this AWB.`,
          amount: expected,
          orderId: display(sh.orderId),
          awb: sh.awb,
          date: sh.deliveredAt,
        });
      } else if (expected - got > tol) {
        add({
          id: `cod_short:${sh.awb}`,
          bucket: "cod_unpaid",
          kind: netOfFees.has(sh.partner) ? "check" : "claim",
          partner: sh.partner,
          title: "COD paid short",
          reason: `Collected ${fmtINR(expected)} in cash, but only ${fmtINR(got)} was paid to you.`,
          amount: expected - got,
          orderId: display(sh.orderId),
          awb: sh.awb,
          date: sh.deliveredAt,
        });
      }
    }
    const noCod = [...new Set(ds.shipments.map((x) => x.partner))].filter((p) => !filesOf(p).includes("courier_cod"));
    for (const p of noCod) {
      if (ds.shipments.some((x) => x.partner === p && modeOf(x) === "cod")) notes.push(`Add ${partnerName(p)}'s COD remittance file to check its COD payouts.`);
    }
  }

  // ───────────── Courier payouts vs bank ─────────────
  if (ds.remittances.length && ds.bank.length) {
    for (const [p, rows] of groupBy(ds.remittances, (r) => r.partner)) {
      markRan("courier_payout_missing", p);
      const batches = new Map<string, { total: number; date: Date | null; utr: string; batchId: string }>();
      for (const r of rows) {
        const key = r.utr || r.batchId || (r.remittedAt ? r.remittedAt.toISOString().slice(0, 10) : "");
        if (!key) continue;
        const b = batches.get(key) ?? { total: 0, date: null, utr: r.utr, batchId: r.batchId };
        b.total += r.remitted;
        if (r.remittedAt && (!b.date || r.remittedAt > b.date)) b.date = r.remittedAt;
        batches.set(key, b);
      }
      for (const [key, b] of batches) {
        if (b.total <= 0 || !bankM.covered(b.date)) continue;
        const hit = bankM.find({ refs: [b.utr, b.batchId].filter(Boolean), amount: r2(b.total), date: b.date, keyword: PARTNER_BY_ID[p]?.bankHint });
        if (!hit) {
          add({
            id: `courier_payout_missing:${key}`,
            bucket: "courier_payout_missing",
            kind: "claim",
            partner: p,
            title: "Courier payout not in your bank",
            reason: `${partnerName(p)} shows ${fmtINR(b.total)} paid on ${fmtDate(b.date)}${b.utr ? ` (UTR ${b.utr})` : ""}, but no matching credit is in your bank statement.`,
            amount: b.total,
            ref: b.utr || b.batchId,
            date: b.date,
          });
        }
      }
    }
  }

  // ───────────── Shipping overcharges ─────────────
  let shippingCharges = 0;
  let rtoCharges = 0;
  if (ds.charges.length) {
    shippingCharges = r2(ds.charges.reduce((a, c) => a + c.amount, 0));
    rtoCharges = r2(ds.charges.filter((c) => c.type === "rto").reduce((a, c) => a + c.amount, 0));
    for (const p of new Set(ds.charges.map((c) => c.partner))) markRan("shipping_overcharge", p);

    const groups = groupBy(ds.charges.filter((c) => c.type !== "other"), (c) => `${c.awb}|${c.type}`);
    const label = { forward: "shipping", cod_fee: "COD fee", rto: "return (RTO) charge", other: "charge" } as const;
    for (const [k, list] of groups) {
      if (list.length < 2) continue;
      const [awb, type] = k.split("|") as [string, keyof typeof label];
      const extra = list.slice(1).reduce((a, c) => a + c.amount, 0);
      add({
        id: `dup:${k}`,
        bucket: "shipping_overcharge",
        kind: "claim",
        partner: list[0].partner,
        title: `${label[type][0].toUpperCase()}${label[type].slice(1)} billed ${list.length} times`,
        reason: `The same ${label[type]} appears ${list.length} times for this AWB. You should be billed once.`,
        amount: extra,
        orderId: display(list[0].orderId),
        awb,
      });
    }

    const firstOf = new Map<string, number>();
    for (const c of ds.charges) if (!firstOf.has(`${c.awb}|${c.type}`)) firstOf.set(`${c.awb}|${c.type}`, c.amount);
    const noRateData = new Map<string, number>();

    for (const sh of ds.shipments) {
      const mode = modeOf(sh);
      const fwd = firstOf.get(`${sh.awb}|forward`);
      const codFee = firstOf.get(`${sh.awb}|cod_fee`);
      const rto = firstOf.get(`${sh.awb}|rto`);
      const name = partnerName(sh.partner);
      if (mode === "prepaid" && codFee) {
        add({
          id: `codfee_prepaid:${sh.awb}`,
          bucket: "shipping_overcharge",
          kind: "claim",
          partner: sh.partner,
          title: "COD fee on a prepaid order",
          reason: `This order was prepaid, so no cash was collected, but a COD fee of ${fmtINR(codFee)} was charged.`,
          amount: codFee,
          orderId: display(sh.orderId),
          awb: sh.awb,
        });
      }
      if (sh.status === "delivered" && rto) {
        add({
          id: `rto_delivered:${sh.awb}`,
          bucket: "shipping_overcharge",
          kind: "claim",
          partner: sh.partner,
          title: "Return charge on a delivered order",
          reason: `Marked delivered to the customer, but a return (RTO) charge of ${fmtINR(rto)} was billed.`,
          amount: rto,
          orderId: display(sh.orderId),
          awb: sh.awb,
          date: sh.deliveredAt,
        });
      }

      // rate card checks
      const card = s.courier[sh.partner];
      if (!card) continue;
      const aggregator = !!PARTNER_BY_ID[sh.partner]?.aggregator;
      const zone = zoneFrom(sh.zone);
      let expectedFwd: number | null = null;
      if (zone && sh.chargedKg > 0) {
        const slabs = slabsFor(sh.chargedKg);
        expectedFwd = r2(card.zones[zone].first + card.zones[zone].extra * (slabs - 1));
        if (fwd !== undefined && fwd - expectedFwd > tol) {
          add({
            id: `rate_freight:${sh.awb}`,
            bucket: "shipping_overcharge",
            kind: aggregator ? "check" : "claim",
            partner: sh.partner,
            title: "Shipping above your rate card",
            reason: `Billed ${fmtINR(fwd)} for ${sh.chargedKg} kg in zone ${zone} (${ZONE_LABEL[zone].toLowerCase()}). Your ${name} rate card says ${fmtINR(expectedFwd)}.${aggregator ? ` ${name} prices differ by courier${sh.courier ? ` (this one went by ${sh.courier})` : ""}, so check the rate for that courier first.` : ""}`,
            amount: fwd - expectedFwd,
            orderId: display(sh.orderId),
            awb: sh.awb,
          });
        }
      } else if (fwd !== undefined) {
        noRateData.set(sh.partner, (noRateData.get(sh.partner) ?? 0) + 1);
      }
      if (mode === "cod" && codFee) {
        const cod = sh.codAmount || orderById.get(sh.orderId)?.total || 0;
        const expected = r2(Math.max(card.codMin, (cod * card.codPct) / 100));
        if (cod > 0 && codFee - expected > tol) {
          add({
            id: `rate_cod:${sh.awb}`,
            bucket: "shipping_overcharge",
            kind: "claim",
            partner: sh.partner,
            title: "COD fee above your rate card",
            reason: `COD fee of ${fmtINR(codFee)} on ${fmtINR(cod)} collected. At ${card.codPct}% with a ${fmtINR(card.codMin)} minimum, it should be ${fmtINR(expected)}.`,
            amount: codFee - expected,
            orderId: display(sh.orderId),
            awb: sh.awb,
          });
        }
      }
      if (sh.status === "rto" && rto) {
        const base = expectedFwd ?? fwd;
        if (base !== undefined) {
          const expected = r2((base * card.rtoPct) / 100);
          if (rto - expected > tol) {
            add({
              id: `rate_rto:${sh.awb}`,
              bucket: "shipping_overcharge",
              kind: aggregator ? "check" : "claim",
              partner: sh.partner,
              title: "Return charge above your rate card",
              reason: `Return (RTO) charge of ${fmtINR(rto)}. At ${card.rtoPct}% of the ${fmtINR(base)} forward charge, it should be ${fmtINR(expected)}.`,
              amount: rto - expected,
              orderId: display(sh.orderId),
              awb: sh.awb,
            });
          }
        }
      }
    }
    for (const [p, n] of noRateData) notes.push(`${n} ${partnerName(p)} shipment${n === 1 ? " has" : "s have"} no zone or charged weight in the file, so their shipping couldn't be checked against your rate card.`);
    const noCard = [...new Set(ds.charges.map((c) => c.partner))].filter((p) => !s.courier[p]);
    for (const p of noCard) notes.push(`Add your ${partnerName(p)} rate card to check its charges against what you agreed.`);
  }

  // ───────────── Weight disputes ─────────────
  if (ds.weights.length) {
    let lost = 0;
    let lostCount = 0;
    let underDispute = 0;
    for (const w of ds.weights) {
      markRan("weight_dispute", w.partner);
      const days = courierDays(w.partner).weightDisputeDays;
      const deadline = w.raisedAt ? addWorkingDays(w.raisedAt, days) : null;
      const daysLeft = deadline ? daysBetween(asOf, deadline) : null;
      if (w.status === "disputed") {
        underDispute += w.extraCharge;
        continue;
      }
      if (w.status === "accepted" || (w.status === "open" && daysLeft !== null && daysLeft < 0)) {
        lost += w.extraCharge;
        lostCount++;
        continue;
      }
      if (w.status !== "open") continue;
      add({
        id: `weight:${w.awb}`,
        bucket: "weight_dispute",
        kind: "check",
        partner: w.partner,
        title: daysLeft === null ? "Weight charge open" : daysLeft === 0 ? "Weight charge: last day to dispute" : `Weight charge: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to dispute`,
        reason: `You entered ${r2(w.enteredKg)} kg; the courier charged for ${r2(w.chargedKg)} kg${w.extraCharge ? ` (extra ${fmtINR(w.extraCharge)})` : ""}. If your packed weight was right, dispute it with a photo of the parcel on a scale.`,
        amount: w.extraCharge,
        orderId: display(w.orderId),
        awb: w.awb,
        date: w.raisedAt,
        deadline,
        daysLeft: daysLeft ?? undefined,
      });
    }
    if (lost > 0) insights.push({ title: "Weight charges already lost", detail: `${lostCount} weight charge${lostCount === 1 ? " was" : "s were"} accepted or the dispute window closed. Check them sooner next month.`, amount: r2(lost) });
    if (underDispute > 0) insights.push({ title: "Weight disputes in progress", detail: "Already disputed with the courier. Follow up if they stay open.", amount: r2(underDispute) });
  }

  // ───────────── Payment gateways ─────────────
  let gatewayFees = 0;
  let gatewayTax = 0;
  let gatewaySettledNet = 0;
  const gatewaySettledBy: Record<string, number> = {};
  const gatewayPartners = [...new Set(ds.gateway.map((g) => g.partner))];
  if (ds.gateway.length) {
    const payments = ds.gateway.filter((g) => g.type === "payment");
    gatewayFees = r2(payments.reduce((a, g) => a + g.fee, 0));
    gatewayTax = r2(payments.reduce((a, g) => a + g.tax, 0));
    const noCard = gatewayPartners.filter((p) => !s.gateway[p]);
    for (const p of noCard) notes.push(`No ${partnerName(p)} rate card was added, so its fees were checked against a standard ${FALLBACK_GATEWAY.standardPct}% rate.`);

    // fee and GST checks need no Shopify data
    for (const p of payments) {
      markRan("gateway_shortfall", p.partner);
      if (p.amount <= 0) continue;
      const rates = gwRates(p.partner);
      const { pct } = gatewayRateFor(p, rates);
      const expectedFee = expectedGatewayFee(p.amount, pct, rates);
      const ref = p.orderRef ? display(p.orderRef) : undefined;
      if (p.fee - expectedFee > tol) {
        const excess = (p.fee - expectedFee) * (1 + rates.gstPct / 100);
        add({
          id: `fee:${p.id}`,
          bucket: "gateway_shortfall",
          kind: "claim",
          partner: p.partner,
          title: "Fee above your rate card",
          reason: `Charged ${fmtINR(p.fee)} on a ${fmtINR(p.amount)} payment (${r2((p.fee / p.amount) * 100)}%). Your ${partnerName(p.partner)} rate for this payment is ${pct}%${rates.fixedFee ? ` plus ${fmtINR(rates.fixedFee)}` : ""}, so the fee should be ${fmtINR(expectedFee)}. Amount includes GST on the extra fee.`,
          amount: excess,
          orderId: ref,
          ref: p.id,
          date: p.createdAt,
        });
      }
      const expectedTax = r2((p.fee * rates.gstPct) / 100);
      if (p.tax - expectedTax > tol) {
        add({
          id: `gst:${p.id}`,
          bucket: "gateway_shortfall",
          kind: "claim",
          partner: p.partner,
          title: "GST on fee charged wrongly",
          reason: `GST of ${fmtINR(p.tax)} on a fee of ${fmtINR(p.fee)}. At ${rates.gstPct}% it should be ${fmtINR(expectedTax)}.`,
          amount: p.tax - expectedTax,
          orderId: ref,
          ref: p.id,
          date: p.createdAt,
        });
      }
    }

    if (ds.orders.length) {
      const byId = new Map<string, GatewayTxn>();
      const byReceipt = new Map<string, GatewayTxn>();
      for (const p of payments) {
        byId.set(p.id.toLowerCase(), p);
        if (p.orderRef && !byReceipt.has(p.orderRef)) byReceipt.set(p.orderRef, p);
      }
      const refundsByPay = new Map<string, number>();
      for (const g of ds.gateway) if (g.type === "refund" && g.paymentId) refundsByPay.set(g.paymentId.toLowerCase(), (refundsByPay.get(g.paymentId.toLowerCase()) ?? 0) + Math.abs(g.amount));
      const ranges = new Map(gatewayPartners.map((gp) => [gp, range(payments.filter((p) => p.partner === gp).map((p) => p.createdAt))]));
      const claimed = new Set<string>();

      const keyLink = (o: Order): GatewayTxn | null => {
        for (const t of refTokens(o.paymentRef)) if (byId.has(t)) return byId.get(t)!;
        return byReceipt.get(o.orderId) ?? null;
      };
      // Link by payment ID or receipt when the files carry them. Only when no order links that way
      // do we fall back to "one payment with the same amount within a day": guessing when real keys
      // exist would hide genuinely missing payments.
      const hasKeys = ds.orders.some((o) => o.paymentMode === "prepaid" && keyLink(o));
      if (!hasKeys) notes.push("Neither file had payment IDs or order numbers to link gateway payments to Shopify orders, so they were matched by amount and date. Unclear matches were left out.");
      const nearBy = (o: Order, gp: string) =>
        payments.filter((p) => p.partner === gp && !claimed.has(p.id) && Math.abs(p.amount - o.total) <= 0.01 && p.createdAt && o.createdAt && Math.abs(daysBetween(o.createdAt, p.createdAt)) <= 1);

      const noFile = new Map<string, number>();
      const stats = new Map<string, { considered: number; linked: number }>();
      for (const o of ds.orders) {
        if (o.paymentMode !== "prepaid" || o.cancelled || !/paid|refund/i.test(o.financialStatus || "paid")) continue;
        // which gateway took this payment
        let gp = o.gateway;
        if (!gp && (!o.paymentMethod || /^(prepaid|online|card|upi)/i.test(o.paymentMethod)) && gatewayPartners.length === 1) gp = gatewayPartners[0];
        const keyed = keyLink(o);
        if (keyed) gp = keyed.partner;
        if (!gp) continue;
        if (!gatewayPartners.includes(gp)) {
          noFile.set(gp, (noFile.get(gp) ?? 0) + 1);
          continue;
        }
        const st = stats.get(gp) ?? { considered: 0, linked: 0 };
        st.considered++;
        stats.set(gp, st);
        const near = hasKeys ? [] : nearBy(o, gp);
        const p = hasKeys ? keyed : near.length === 1 ? near[0] : null;
        const age = o.createdAt ? daysBetween(o.createdAt, asOf) : null;
        const rates = gwRates(gp);
        if (!p) {
          // without linking keys, several same-amount payments nearby means "can't tell", not "missing"
          if (!hasKeys && near.length > 1) continue;
          const r = ranges.get(gp)!;
          const covered = o.createdAt && r.min && r.max && o.createdAt >= r.min && daysBetween(o.createdAt, r.max) >= rates.settleDays;
          if (covered && age !== null && age > rates.settleDays) {
            add({
              id: `gw_missing:${o.orderId}`,
              bucket: "gateway_shortfall",
              kind: "check",
              partner: gp,
              title: `Paid order not in ${partnerName(gp)} settlements`,
              reason: `Shopify shows this order as paid online on ${fmtDate(o.createdAt)}, but it isn't in the ${partnerName(gp)} settlement report. It may have been paid another way, or the payout is missing.`,
              amount: o.total,
              orderId: o.displayId,
              date: o.createdAt,
            });
          }
          continue;
        }
        st.linked++;
        claimed.add(p.id);
        if (!p.settled && age !== null && age > rates.settleDays) {
          add({
            id: `gw_unsettled:${o.orderId}`,
            bucket: "gateway_shortfall",
            kind: "check",
            partner: gp,
            title: "Payment captured but not settled",
            reason: `Captured ${age} days ago but not yet settled to you. Your ${partnerName(gp)} rate card says it pays within ${rates.settleDays} days.`,
            amount: p.amount - p.fee - p.tax,
            orderId: o.displayId,
            ref: p.id,
            date: p.createdAt,
          });
        }
        const gwRefunded = refundsByPay.get(p.id.toLowerCase()) ?? 0;
        if (gwRefunded - o.refunded > tol) {
          add({
            id: `refund_over:${o.orderId}`,
            bucket: "gateway_shortfall",
            kind: "check",
            partner: gp,
            title: "Refunded more than you approved",
            reason: `${partnerName(gp)} refunded ${fmtINR(gwRefunded)}, but Shopify shows ${fmtINR(o.refunded)} refunded. Check who issued the extra refund.`,
            amount: gwRefunded - o.refunded,
            orderId: o.displayId,
            ref: p.id,
          });
        } else if (o.refunded - gwRefunded > tol && age !== null && age > rates.settleDays) {
          add({
            id: `refund_missing:${o.orderId}`,
            bucket: "gateway_shortfall",
            kind: "check",
            partner: gp,
            counterparty: "Your team",
            title: `Refund in Shopify, not in ${partnerName(gp)}`,
            reason: `Shopify shows ${fmtINR(o.refunded)} refunded, but ${partnerName(gp)} shows ${fmtINR(gwRefunded)}. The customer may not have got their money back.`,
            amount: o.refunded - gwRefunded,
            orderId: o.displayId,
            ref: p.id,
          });
        }
      }
      for (const [gp, st] of stats) {
        if (st.considered && st.linked / st.considered < 0.5) notes.push(`Only ${st.linked} of ${st.considered} ${partnerName(gp)} orders could be linked to its payments. Check that the Shopify export includes the Payment Reference column.`);
      }
      for (const [gp, n] of noFile) notes.push(`Shopify shows ${n} prepaid order${n === 1 ? "" : "s"} paid through ${partnerName(gp)}, but no ${partnerName(gp)} file was added. Add it to check those payments.`);
    } else {
      notes.push("Add your Shopify orders export to also find prepaid orders that were never settled and refund mismatches.");
    }

    // settlements vs bank
    const hasCreditDebit = new Set(gatewayPartners.filter((gp) => ds.gateway.some((g) => g.partner === gp && (g.credit || g.debit))));
    const groups = groupBy(ds.gateway.filter((g) => g.settled && (g.utr || g.settlementId)), (g) => `${g.partner}|${g.utr || g.settlementId}`);
    for (const [key, list] of groups) {
      const gp = list[0].partner;
      const net = hasCreditDebit.has(gp)
        ? list.reduce((a, g) => a + g.credit - g.debit, 0)
        : list.reduce((a, g) => a + (g.type === "refund" ? -Math.abs(g.amount) : g.amount - g.fee - g.tax), 0);
      gatewaySettledNet += net;
      gatewaySettledBy[gp] = r2((gatewaySettledBy[gp] ?? 0) + net);
      if (!ds.bank.length) continue;
      markRan("gateway_payout_missing", gp);
      const date = list.reduce<Date | null>((d, g) => (g.settledAt && (!d || g.settledAt > d) ? g.settledAt : d), null);
      if (net <= 0 || !bankM.covered(date)) continue;
      const utr = list[0].utr;
      const hit = bankM.find({ refs: [utr, list[0].settlementId].filter(Boolean), amount: r2(net), date, keyword: PARTNER_BY_ID[gp]?.bankHint });
      if (!hit) {
        add({
          id: `gateway_payout_missing:${key.split("|")[1]}`,
          bucket: "gateway_payout_missing",
          kind: "claim",
          partner: gp,
          title: "Settlement not in your bank",
          reason: `${partnerName(gp)} settled ${fmtINR(net)} on ${fmtDate(date)}${utr ? ` (UTR ${utr})` : ""}, but no matching credit is in your bank statement.`,
          amount: net,
          ref: utr || list[0].settlementId,
          date,
        });
      }
    }
    gatewaySettledNet = r2(gatewaySettledNet);
  }

  // ───────────── Cash view & insights ─────────────
  const live = ds.orders.filter((o) => !o.cancelled);
  const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));
  const rtoShipments = ds.shipments.filter((x) => x.status === "rto");
  const cash: CashView = {
    sold: sum(live.map((o) => o.total)),
    codSold: sum(live.filter((o) => o.paymentMode === "cod").map((o) => o.total)),
    prepaidSold: sum(live.filter((o) => o.paymentMode === "prepaid").map((o) => o.total)),
    refundedInShopify: sum(live.map((o) => o.refunded)),
    gatewayFees,
    gatewayTax,
    shippingCharges,
    codRemitted: sum(Object.values(codRemittedBy)),
    codRemittedBy,
    codPendingInGrace: r2(codPending),
    gatewaySettledNet,
    gatewaySettledBy,
    reachedBank: ds.bank.length ? bankM.matchedTotal() : null,
    rtoOrders: rtoShipments.length,
    rtoCharges,
  };
  const codShips = ds.shipments.filter((x) => modeOf(x) === "cod");
  if (codShips.length) {
    const codRto = codShips.filter((x) => x.status === "rto").length;
    const byPartner = [...groupBy(codShips, (x) => x.partner)];
    const split = byPartner.length > 1
      ? ` ${byPartner.map(([p, xs]) => `${partnerName(p)}: ${Math.round((xs.filter((x) => x.status === "rto").length / xs.length) * 100)}%`).join(", ")}.`
      : "";
    insights.push({
      title: "COD orders that came back",
      detail: `${codRto} of ${codShips.length} COD shipments (${Math.round((codRto / codShips.length) * 100)}%) returned undelivered${rtoCharges ? `, costing ${fmtINR(rtoCharges)} in return charges` : ""}.${split}`,
    });
  }
  if (codPending > 0) insights.push({ title: "COD still on its way", detail: "Delivered recently and not yet due under your couriers' payout days. Not a problem yet.", amount: r2(codPending) });

  // ───────────── Buckets ─────────────
  const buckets: BucketSummary[] = BUCKET_ORDER.map((id) => {
    const fs = findings.filter((f) => f.bucket === id);
    return {
      id,
      ...BUCKETS[id],
      claimTotal: sum(fs.filter((f) => f.kind === "claim").map((f) => f.amount)),
      checkTotal: sum(fs.filter((f) => f.kind === "check").map((f) => f.amount)),
      count: fs.length,
      ran: (ran.get(id)?.size ?? 0) > 0,
    };
  });

  // ───────────── Partners ─────────────
  const ids = new Set<string>([...Object.keys(ds.partnerFiles), ...findings.map((f) => f.partner).filter((p): p is string => !!p)]);
  for (const o of ds.orders) if (o.gateway && o.paymentMode === "prepaid" && !o.cancelled) ids.add(o.gateway);
  const partners: PartnerSummary[] = PARTNERS.filter((p) => ids.has(p.id)).map((p) => {
    const fs = findings.filter((f) => f.partner === p.id);
    const files = filesOf(p.id);
    const volume: { label: string; value: string }[] = [];
    if (p.type === "courier") {
      const ships = ds.shipments.filter((x) => x.partner === p.id);
      const billed = ds.charges.filter((c) => c.partner === p.id).reduce((a, c) => a + c.amount, 0);
      if (ships.length) volume.push({ label: "Shipments", value: ships.length.toLocaleString("en-IN") });
      if (ships.length) volume.push({ label: "Delivered", value: `${Math.round((ships.filter((x) => x.status === "delivered").length / ships.length) * 100)}%` });
      if (billed) volume.push({ label: "Charges billed", value: fmtINR(billed, { decimals: false }) });
      if (codRemittedBy[p.id]) volume.push({ label: "COD paid to you", value: fmtINR(codRemittedBy[p.id], { decimals: false }) });
    } else {
      const pays = ds.gateway.filter((g) => g.partner === p.id && g.type === "payment");
      const gross = pays.reduce((a, g) => a + g.amount, 0);
      const fees = pays.reduce((a, g) => a + g.fee + g.tax, 0);
      const viaShopify = ds.orders.filter((o) => o.gateway === p.id && o.paymentMode === "prepaid" && !o.cancelled).length;
      if (pays.length) volume.push({ label: "Payments", value: pays.length.toLocaleString("en-IN") });
      else if (viaShopify) volume.push({ label: "Orders in Shopify", value: viaShopify.toLocaleString("en-IN") });
      if (gross) volume.push({ label: "Collected", value: fmtINR(gross, { decimals: false }) });
      if (fees) volume.push({ label: "Fees and GST", value: `${fmtINR(fees, { decimals: false })} (${r2((fees / gross) * 100)}%)` });
      if (gatewaySettledBy[p.id]) volume.push({ label: "Settled to you", value: fmtINR(gatewaySettledBy[p.id], { decimals: false }) });
    }
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      files,
      missingFiles: (p.type === "courier" ? COURIER_FILES : GATEWAY_FILES).filter((k) => !files.includes(k)),
      claimTotal: sum(fs.filter((f) => f.kind === "claim").map((f) => f.amount)),
      checkTotal: sum(fs.filter((f) => f.kind === "check").map((f) => f.amount)),
      count: fs.length,
      byBucket: BUCKET_ORDER.filter((b) => BUCKETS[b].side === p.type).map((b) => {
        const bf = fs.filter((f) => f.bucket === b);
        return { bucket: b, claim: sum(bf.filter((f) => f.kind === "claim").map((f) => f.amount)), check: sum(bf.filter((f) => f.kind === "check").map((f) => f.amount)), count: bf.length };
      }),
      rateCard: p.type === "courier" ? !!s.courier[p.id] : !!s.gateway[p.id],
      volume,
    };
  });

  const orderDates = range(ds.orders.map((o) => o.createdAt));
  return {
    asOf,
    period: { from: orderDates.min, to: orderDates.max },
    findings: findings.sort((a, b) => (a.kind === b.kind ? b.amount - a.amount : a.kind === "claim" ? -1 : 1)),
    buckets,
    claimTotal: sum(findings.filter((f) => f.kind === "claim").map((f) => f.amount)),
    checkTotal: sum(findings.filter((f) => f.kind === "check").map((f) => f.amount)),
    cash,
    insights,
    notes,
    partners,
    settings: s,
  };
}

/** Payment reference tokens from Shopify ("pay_ABC123, 403993715521") for linking to gateway IDs. */
export function refTokens(ref: string): string[] {
  return String(ref ?? "").toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length >= 6);
}
