import type {
  AuditResult, BankTxn, BucketId, BucketSummary, CashView, Counterparty, Dataset, Finding, GatewayTxn,
  Insight, Order, Settings, Shipment,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { addWorkingDays, daysBetween, fmtDate, fmtINR, median, r2 } from "./util";

const BUCKETS: Record<BucketId, { title: string; blurb: string; counterparty: Counterparty; needs: string }> = {
  cod_unpaid: {
    title: "COD money the courier hasn't paid you",
    blurb: "Delivered cash-on-delivery orders with no payout, or a payout smaller than the cash collected.",
    counterparty: "Shiprocket",
    needs: "Shopify orders, Shiprocket shipments and Shiprocket COD remittance",
  },
  courier_payout_missing: {
    title: "Courier payouts that didn't reach your bank",
    blurb: "Remittances the courier says it paid, with no matching credit in your bank statement.",
    counterparty: "Shiprocket",
    needs: "Shiprocket COD remittance and your bank statement",
  },
  shipping_overcharge: {
    title: "Shipping overcharges",
    blurb: "The same charge billed twice, COD fees on prepaid orders, and return charges on delivered orders.",
    counterparty: "Shiprocket",
    needs: "Shiprocket shipments & charges",
  },
  weight_dispute: {
    title: "Weight charges you can still dispute",
    blurb: "Extra weight charges still open. Check your packed weight and dispute before the window closes.",
    counterparty: "Shiprocket",
    needs: "Shiprocket weight discrepancies",
  },
  gateway_shortfall: {
    title: "Payment gateway shortfalls",
    blurb: "Fees above your plan, GST charged wrongly, prepaid orders never settled, and refund mismatches.",
    counterparty: "Razorpay",
    needs: "Shopify orders and Razorpay settlements",
  },
  gateway_payout_missing: {
    title: "Gateway payouts that didn't reach your bank",
    blurb: "Settlements Razorpay marked as paid, with no matching credit in your bank statement.",
    counterparty: "Razorpay",
    needs: "Razorpay settlements and your bank statement",
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

/** Razorpay's API-style exports are in paise. Detect that by comparing with Shopify order values. */
function fixGatewayUnits(ds: Dataset, notes: string[]) {
  const pays = ds.gateway.filter((g) => g.type === "payment" && g.amount > 0);
  if (!pays.length) return;
  const allInts = pays.every((p) => Number.isInteger(p.amount));
  const prepaid = ds.orders.filter((o) => o.paymentMode === "prepaid" && o.total > 0).map((o) => o.total);
  const ratio = prepaid.length ? median(pays.map((p) => p.amount)) / median(prepaid) : NaN;
  if (allInts && ratio > 50) {
    for (const g of ds.gateway) {
      g.amount /= 100; g.fee /= 100; g.tax /= 100; g.credit /= 100; g.debit /= 100;
    }
    notes.push("Razorpay amounts looked like paise, so they were converted to rupees.");
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

export function audit(ds: Dataset, settingsIn: Partial<Settings> = {}): AuditResult {
  const s: Settings = { ...DEFAULT_SETTINGS, ...settingsIn };
  const notes = [...ds.notes];
  const findings: Finding[] = [];
  const insights: Insight[] = [];
  const asOf = s.asOf ?? latestDate(ds) ?? new Date();
  const tol = s.tolerance;
  const ran = new Set<BucketId>();

  fixGatewayUnits(ds, notes);

  const orderById = new Map(ds.orders.map((o) => [o.orderId, o]));
  const shipByAwb = new Map(ds.shipments.map((sh) => [sh.awb, sh]));
  const shipByOrder = new Map<string, Shipment>();
  for (const sh of ds.shipments) if (sh.orderId && !shipByOrder.has(sh.orderId)) shipByOrder.set(sh.orderId, sh);
  const bankM = makeBankMatcher(ds.bank, s);

  const add = (f: Omit<Finding, "counterparty"> & { counterparty?: Counterparty }) => {
    findings.push({ counterparty: BUCKETS[f.bucket].counterparty, ...f, amount: r2(f.amount) });
  };
  const display = (orderId: string) => orderById.get(orderId)?.displayId || (orderId ? `#${orderId}` : "");

  // ───────────── COD: unpaid and short-paid ─────────────
  let codRemitted = 0;
  let codPending = 0;
  if (ds.remittances.length) {
    codRemitted = r2(ds.remittances.reduce((a, r) => a + r.remitted, 0));
    ran.add("cod_unpaid");

    const remByAwb = new Map<string, number>();
    const remByOrder = new Map<string, number>();
    for (const r of ds.remittances) {
      if (r.awb) remByAwb.set(r.awb, (remByAwb.get(r.awb) ?? 0) + r.remitted);
      if (r.orderId) remByOrder.set(r.orderId, (remByOrder.get(r.orderId) ?? 0) + r.remitted);
    }

    // Some couriers pay COD net of their fees. If most payouts are short, treat shortfalls as "check".
    const withCod = ds.remittances.filter((r) => r.codAmount > 0);
    const shortShare = withCod.length ? withCod.filter((r) => r.codAmount - r.remitted > tol).length / withCod.length : 0;
    const netOfFees = shortShare > 0.4;
    if (netOfFees) notes.push("Most COD payouts are lower than the COD amount, which usually means the courier deducts its fees before paying. Short payouts are marked for checking, not claiming.");

    if (ds.shipments.length) {
      for (const sh of ds.shipments) {
        const order = orderById.get(sh.orderId);
        const mode = sh.paymentMode !== "unknown" ? sh.paymentMode : order?.paymentMode ?? "unknown";
        if (mode !== "cod" || sh.status !== "delivered") continue;
        const expected = sh.codAmount || order?.total || 0;
        if (!expected) continue;
        const got = remByAwb.get(sh.awb) ?? (sh.orderId ? remByOrder.get(sh.orderId) : undefined);
        if (got === undefined) {
          const age = sh.deliveredAt ? daysBetween(sh.deliveredAt, asOf) : null;
          if (age !== null && age <= s.codGraceDays) {
            codPending += expected;
            continue;
          }
          add({
            id: `cod_unpaid:${sh.awb}`,
            bucket: "cod_unpaid",
            kind: age === null ? "check" : "claim",
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
            kind: netOfFees ? "check" : "claim",
            title: "COD paid short",
            reason: `Collected ${fmtINR(expected)} in cash, but only ${fmtINR(got)} was paid to you.`,
            amount: expected - got,
            orderId: display(sh.orderId),
            awb: sh.awb,
            date: sh.deliveredAt,
          });
        }
      }
    } else {
      notes.push("Without the Shiprocket shipments file, unpaid COD can't be spotted (we don't know which orders were delivered). Short payouts were still checked.");
      for (const r of ds.remittances) {
        if (r.codAmount - r.remitted > tol) {
          add({
            id: `cod_short:${r.awb || r.orderId}`,
            bucket: "cod_unpaid",
            kind: netOfFees ? "check" : "claim",
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
  }

  // ───────────── Courier payouts vs bank ─────────────
  if (ds.remittances.length && ds.bank.length) {
    ran.add("courier_payout_missing");
    const batches = new Map<string, { total: number; date: Date | null; utr: string; batchId: string }>();
    for (const r of ds.remittances) {
      const key = r.utr || r.batchId || (r.remittedAt ? r.remittedAt.toISOString().slice(0, 10) : "");
      if (!key) continue;
      const b = batches.get(key) ?? { total: 0, date: null, utr: r.utr, batchId: r.batchId };
      b.total += r.remitted;
      if (r.remittedAt && (!b.date || r.remittedAt > b.date)) b.date = r.remittedAt;
      batches.set(key, b);
    }
    for (const [key, b] of batches) {
      if (b.total <= 0 || !bankM.covered(b.date)) continue;
      const hit = bankM.find({ refs: [b.utr, b.batchId].filter(Boolean), amount: r2(b.total), date: b.date, keyword: /shiprocket|bigfoot/i });
      if (!hit) {
        add({
          id: `courier_payout_missing:${key}`,
          bucket: "courier_payout_missing",
          kind: "claim",
          title: "Courier payout not in your bank",
          reason: `Shiprocket shows ${fmtINR(b.total)} paid on ${fmtDate(b.date)}${b.utr ? ` (UTR ${b.utr})` : ""}, but no matching credit is in your bank statement.`,
          amount: b.total,
          ref: b.utr || b.batchId,
          date: b.date,
        });
      }
    }
  }

  // ───────────── Shipping overcharges ─────────────
  let shippingCharges = 0;
  let rtoCharges = 0;
  if (ds.charges.length) {
    ran.add("shipping_overcharge");
    shippingCharges = r2(ds.charges.reduce((a, c) => a + c.amount, 0));
    rtoCharges = r2(ds.charges.filter((c) => c.type === "rto").reduce((a, c) => a + c.amount, 0));
    const groups = new Map<string, typeof ds.charges>();
    for (const c of ds.charges) {
      if (c.type === "other") continue;
      const k = `${c.awb}|${c.type}`;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    const label = { forward: "shipping", cod_fee: "COD fee", rto: "return (RTO) charge", other: "charge" } as const;
    for (const [k, list] of groups) {
      if (list.length < 2) continue;
      const [awb, type] = k.split("|") as [string, keyof typeof label];
      const extra = list.slice(1).reduce((a, c) => a + c.amount, 0);
      add({
        id: `dup:${k}`,
        bucket: "shipping_overcharge",
        kind: "claim",
        title: `${label[type][0].toUpperCase()}${label[type].slice(1)} billed ${list.length} times`,
        reason: `The same ${label[type]} appears ${list.length} times for this AWB. You should be billed once.`,
        amount: extra,
        orderId: display(list[0].orderId),
        awb,
      });
    }
    const firstOf = (awb: string, type: string) => ds.charges.find((c) => c.awb === awb && c.type === type);
    for (const sh of ds.shipments) {
      const order = orderById.get(sh.orderId);
      const mode = sh.paymentMode !== "unknown" ? sh.paymentMode : order?.paymentMode ?? "unknown";
      const codFee = firstOf(sh.awb, "cod_fee");
      if (mode === "prepaid" && codFee) {
        add({
          id: `codfee_prepaid:${sh.awb}`,
          bucket: "shipping_overcharge",
          kind: "claim",
          title: "COD fee on a prepaid order",
          reason: `This order was prepaid, so no cash was collected, but a COD fee of ${fmtINR(codFee.amount)} was charged.`,
          amount: codFee.amount,
          orderId: display(sh.orderId),
          awb: sh.awb,
        });
      }
      const rto = firstOf(sh.awb, "rto");
      if (sh.status === "delivered" && rto) {
        add({
          id: `rto_delivered:${sh.awb}`,
          bucket: "shipping_overcharge",
          kind: "claim",
          title: "Return charge on a delivered order",
          reason: `Marked delivered to the customer, but a return (RTO) charge of ${fmtINR(rto.amount)} was billed.`,
          amount: rto.amount,
          orderId: display(sh.orderId),
          awb: sh.awb,
          date: sh.deliveredAt,
        });
      }
    }
  }

  // ───────────── Weight disputes ─────────────
  if (ds.weights.length) {
    ran.add("weight_dispute");
    let lost = 0;
    let lostCount = 0;
    let underDispute = 0;
    for (const w of ds.weights) {
      const deadline = w.raisedAt ? addWorkingDays(w.raisedAt, s.weightDisputeWorkingDays) : null;
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
        title: daysLeft === null ? "Weight charge open" : daysLeft === 0 ? "Weight charge: last day to dispute" : `Weight charge: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to dispute`,
        reason: `You entered ${w.enteredKg} kg; the courier charged for ${w.chargedKg} kg${w.extraCharge ? ` (extra ${fmtINR(w.extraCharge)})` : ""}. If your packed weight was right, dispute it with a photo of the parcel on a scale.`,
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

  // ───────────── Payment gateway ─────────────
  let gatewayFees = 0;
  let gatewayTax = 0;
  let gatewaySettledNet = 0;
  if (ds.gateway.length) {
    const payments = ds.gateway.filter((g) => g.type === "payment");
    gatewayFees = r2(payments.reduce((a, g) => a + g.fee, 0));
    gatewayTax = r2(payments.reduce((a, g) => a + g.tax, 0));

    // fee and GST checks need no Shopify data
    ran.add("gateway_shortfall");
    for (const p of payments) {
      if (p.amount <= 0) continue;
      const premium = p.international || /amex|american express|diners/.test(p.cardNetwork);
      const rate = premium ? s.gatewayFeePctPremium : s.gatewayFeePct;
      const expectedFee = r2((p.amount * rate) / 100);
      const ref = p.orderRef ? display(p.orderRef) : undefined;
      if (p.fee - expectedFee > tol) {
        const excess = (p.fee - expectedFee) * (1 + s.gstPct / 100);
        add({
          id: `fee:${p.id}`,
          bucket: "gateway_shortfall",
          kind: "claim",
          title: "Fee above your plan",
          reason: `Charged ${fmtINR(p.fee)} on a ${fmtINR(p.amount)} payment (${r2((p.fee / p.amount) * 100)}%). Your plan is ${rate}%, so the fee should be ${fmtINR(expectedFee)}. Amount includes GST on the extra fee.`,
          amount: excess,
          orderId: ref,
          ref: p.id,
          date: p.createdAt,
        });
      }
      const expectedTax = r2((p.fee * s.gstPct) / 100);
      if (p.tax - expectedTax > tol) {
        add({
          id: `gst:${p.id}`,
          bucket: "gateway_shortfall",
          kind: "claim",
          title: "GST on fee charged wrongly",
          reason: `GST of ${fmtINR(p.tax)} on a fee of ${fmtINR(p.fee)}. At ${s.gstPct}% it should be ${fmtINR(expectedTax)}.`,
          amount: p.tax - expectedTax,
          orderId: ref,
          ref: p.id,
          date: p.createdAt,
        });
      }
    }

    if (ds.orders.length) {
      const byPayId = new Map(payments.map((p) => [p.id.toLowerCase(), p]));
      const byReceipt = new Map<string, GatewayTxn>();
      for (const p of payments) if (p.orderRef && !byReceipt.has(p.orderRef)) byReceipt.set(p.orderRef, p);
      const refundsByPay = new Map<string, number>();
      for (const g of ds.gateway) if (g.type === "refund" && g.paymentId) refundsByPay.set(g.paymentId.toLowerCase(), (refundsByPay.get(g.paymentId.toLowerCase()) ?? 0) + Math.abs(g.amount));
      const gwRange = range(payments.map((p) => p.createdAt));
      const claimed = new Set<string>();

      const isRazorpayOrder = (o: Order) =>
        o.paymentMode === "prepaid" && (/razorpay/i.test(o.paymentMethod) || !o.paymentMethod) && !o.cancelled && /paid|refund/i.test(o.financialStatus || "paid");

      // Link by payment ID or receipt when the files carry them. Only when neither file has any
      // linking key do we fall back to "one payment with the same amount within a day" — guessing
      // when real keys exist would hide genuinely missing payments.
      const hasKeys = ds.orders.some((o) => /pay_/i.test(o.paymentRef)) || payments.some((p) => !!p.orderRef);
      if (!hasKeys) notes.push("Neither file had payment IDs or order numbers to link Razorpay payments to Shopify orders, so they were matched by amount and date. Unclear matches were left out.");
      const keyLink = (o: Order): GatewayTxn | null => {
        const tokens = o.paymentRef.toLowerCase().match(/pay_[a-z0-9]+/g) ?? [];
        for (const t of tokens) if (byPayId.has(t)) return byPayId.get(t)!;
        if (byReceipt.has(o.orderId)) return byReceipt.get(o.orderId)!;
        return null;
      };
      const link = (o: Order): GatewayTxn | null => {
        if (hasKeys) return keyLink(o);
        if (!o.createdAt) return null;
        const near = payments.filter((p) => !claimed.has(p.id) && Math.abs(p.amount - o.total) <= 0.01 && p.createdAt && Math.abs(daysBetween(o.createdAt!, p.createdAt)) <= 1);
        return near.length === 1 ? near[0] : null;
      };

      let linked = 0;
      let considered = 0;
      for (const o of ds.orders) {
        if (!isRazorpayOrder(o)) continue;
        considered++;
        const p = link(o);
        const age = o.createdAt ? daysBetween(o.createdAt, asOf) : null;
        if (!p) {
          // without linking keys, a same-amount payment nearby means "can't tell", not "missing"
          if (!hasKeys && o.createdAt && payments.some((q) => Math.abs(q.amount - o.total) <= 0.01 && q.createdAt && Math.abs(daysBetween(o.createdAt!, q.createdAt)) <= 1)) continue;
          const covered = o.createdAt && gwRange.min && gwRange.max && o.createdAt >= gwRange.min && daysBetween(o.createdAt, gwRange.max) >= s.gatewayGraceDays;
          if (covered && age !== null && age > s.gatewayGraceDays) {
            add({
              id: `gw_missing:${o.orderId}`,
              bucket: "gateway_shortfall",
              kind: "check",
              title: "Paid order not in Razorpay settlements",
              reason: `Shopify shows this order as paid online on ${fmtDate(o.createdAt)}, but it isn't in the Razorpay settlement report. It may have been paid another way, or the payout is missing.`,
              amount: o.total,
              orderId: o.displayId,
              date: o.createdAt,
            });
          }
          continue;
        }
        linked++;
        claimed.add(p.id);
        if (!p.settled && age !== null && age > s.gatewayGraceDays) {
          add({
            id: `gw_unsettled:${o.orderId}`,
            bucket: "gateway_shortfall",
            kind: "check",
            title: "Payment captured but not settled",
            reason: `Captured ${age} days ago but not yet settled to you. Razorpay usually settles within ${s.gatewayGraceDays} days.`,
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
            title: "Refunded more than you approved",
            reason: `Razorpay refunded ${fmtINR(gwRefunded)}, but Shopify shows ${fmtINR(o.refunded)} refunded. Check who issued the extra refund.`,
            amount: gwRefunded - o.refunded,
            orderId: o.displayId,
            ref: p.id,
          });
        } else if (o.refunded - gwRefunded > tol && age !== null && age > s.gatewayGraceDays) {
          add({
            id: `refund_missing:${o.orderId}`,
            bucket: "gateway_shortfall",
            kind: "check",
            counterparty: "Your team",
            title: "Refund in Shopify, not in Razorpay",
            reason: `Shopify shows ${fmtINR(o.refunded)} refunded, but Razorpay shows ${fmtINR(gwRefunded)}. The customer may not have got their money back.`,
            amount: o.refunded - gwRefunded,
            orderId: o.displayId,
            ref: p.id,
          });
        }
      }
      if (considered && linked / considered < 0.5) notes.push(`Only ${linked} of ${considered} prepaid orders could be linked to Razorpay payments. Check that the Shopify export includes the Payment Reference column.`);
    } else {
      notes.push("Add your Shopify orders export to also find prepaid orders that were never settled and refund mismatches.");
    }

    // settlements vs bank
    const groups = new Map<string, GatewayTxn[]>();
    for (const g of ds.gateway) {
      if (!g.settled) continue;
      const key = g.utr || g.settlementId;
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), g]);
    }
    const hasCreditDebit = ds.gateway.some((g) => g.credit || g.debit);
    for (const [key, list] of groups) {
      const net = hasCreditDebit
        ? list.reduce((a, g) => a + g.credit - g.debit, 0)
        : list.reduce((a, g) => a + (g.type === "refund" ? -Math.abs(g.amount) : g.amount - g.fee - g.tax), 0);
      gatewaySettledNet += net;
      if (!ds.bank.length) continue;
      ran.add("gateway_payout_missing");
      const date = list.reduce<Date | null>((d, g) => (g.settledAt && (!d || g.settledAt > d) ? g.settledAt : d), null);
      if (net <= 0 || !bankM.covered(date)) continue;
      const utr = list[0].utr;
      const hit = bankM.find({ refs: [utr, list[0].settlementId].filter(Boolean), amount: r2(net), date, keyword: /razorpay/i });
      if (!hit) {
        add({
          id: `gateway_payout_missing:${key}`,
          bucket: "gateway_payout_missing",
          kind: "claim",
          title: "Settlement not in your bank",
          reason: `Razorpay settled ${fmtINR(net)} on ${fmtDate(date)}${utr ? ` (UTR ${utr})` : ""}, but no matching credit is in your bank statement.`,
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
    codRemitted,
    codPendingInGrace: r2(codPending),
    gatewaySettledNet,
    reachedBank: ds.bank.length ? bankM.matchedTotal() : null,
    rtoOrders: rtoShipments.length,
    rtoCharges,
  };
  const codShips = ds.shipments.filter((x) => {
    const o = orderById.get(x.orderId);
    return (x.paymentMode !== "unknown" ? x.paymentMode : o?.paymentMode) === "cod";
  });
  if (codShips.length) {
    const codRto = codShips.filter((x) => x.status === "rto").length;
    insights.push({
      title: "COD orders that came back",
      detail: `${codRto} of ${codShips.length} COD shipments (${Math.round((codRto / codShips.length) * 100)}%) returned undelivered${rtoCharges ? `, costing ${fmtINR(rtoCharges)} in return charges` : ""}.`,
    });
  }
  if (codPending > 0) insights.push({ title: "COD still on its way", detail: `Delivered in the last ${s.codGraceDays} days and not yet due. Not a problem yet.`, amount: r2(codPending) });

  // ───────────── Buckets ─────────────
  const buckets: BucketSummary[] = BUCKET_ORDER.map((id) => {
    const fs = findings.filter((f) => f.bucket === id);
    return {
      id,
      ...BUCKETS[id],
      claimTotal: sum(fs.filter((f) => f.kind === "claim").map((f) => f.amount)),
      checkTotal: sum(fs.filter((f) => f.kind === "check").map((f) => f.amount)),
      count: fs.length,
      ran: ran.has(id),
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
    settings: s,
  };
}
