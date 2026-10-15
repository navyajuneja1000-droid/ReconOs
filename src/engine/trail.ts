import type { AuditResult, Dataset, Finding, PaymentMode, ShipStatus } from "./types";
import { normOrderId, r2 } from "./util";

export type TrailState = "matched" | "pending" | "leak" | "check" | "no_cash_due" | "unknown";

export interface TrailRow {
  orderId: string; // display, e.g. "#10023"
  key: string; // normalised
  date: Date | null;
  mode: PaymentMode;
  total: number;
  cancelled: boolean;
  shipStatus: ShipStatus | "not_shipped" | "unknown";
  courier: string;
  awb: string;
  expected: number; // money that should reach you from courier or gateway
  received: number; // paid out by courier / settled by gateway
  receivedRef: string; // UTR of the payout or settlement
  inBank: boolean | null; // null when no bank statement was added
  state: TrailState;
  findings: Finding[];
}

/** One row per Shopify order, tracing it from sale to payout to bank. */
export function buildTrail(data: Dataset, result: AuditResult): TrailRow[] {
  const byOrder = new Map<string, Finding[]>();
  const byAwb = new Map<string, Finding[]>();
  for (const f of result.findings) {
    if (f.orderId) {
      const k = normOrderId(f.orderId);
      byOrder.set(k, [...(byOrder.get(k) ?? []), f]);
    }
    if (f.awb) byAwb.set(f.awb, [...(byAwb.get(f.awb) ?? []), f]);
  }
  const shipByOrder = new Map(data.shipments.map((s) => [s.orderId, s]));
  const remByOrder = new Map<string, { amt: number; utr: string }>();
  const remByAwb = new Map<string, { amt: number; utr: string }>();
  for (const r of data.remittances) {
    const add = (m: Map<string, { amt: number; utr: string }>, k: string) => {
      if (!k) return;
      const cur = m.get(k) ?? { amt: 0, utr: "" };
      m.set(k, { amt: cur.amt + r.remitted, utr: cur.utr || r.utr || r.batchId });
    };
    add(remByAwb, r.awb);
    add(remByOrder, r.orderId);
  }
  const payByRef = new Map<string, (typeof data.gateway)[number]>();
  const payByReceipt = new Map<string, (typeof data.gateway)[number]>();
  for (const g of data.gateway) {
    if (g.type !== "payment") continue;
    payByRef.set(g.id.toLowerCase(), g);
    if (g.orderRef) payByReceipt.set(g.orderRef, g);
  }
  const payoutMissing = new Map(
    result.findings.filter((f) => f.bucket === "courier_payout_missing" || f.bucket === "gateway_payout_missing").map((f) => [String(f.ref ?? "").toUpperCase(), f]),
  );
  const bankText = data.bank.length ? data.bank.map((b) => `${b.narration} ${b.ref}`.toUpperCase()).join("\n") : null;

  return data.orders
    .map((o) => {
      const ship = shipByOrder.get(o.orderId);
      const fs = [...(byOrder.get(o.orderId) ?? []), ...(ship ? (byAwb.get(ship.awb) ?? []).filter((f) => !f.orderId) : [])];
      let expected = 0;
      let received = 0;
      let receivedRef = "";
      let shipStatus: TrailRow["shipStatus"] = ship ? ship.status : data.shipments.length ? "not_shipped" : "unknown";
      if (o.paymentMode === "cod") {
        if (ship?.status === "delivered") expected = ship.codAmount || o.total;
        const rem = (ship && remByAwb.get(ship.awb)) || remByOrder.get(o.orderId);
        if (rem) { received = rem.amt; receivedRef = rem.utr; }
      } else if (o.paymentMode === "prepaid") {
        const token = o.paymentRef.toLowerCase().match(/pay_[a-z0-9]+/)?.[0];
        const p = (token && payByRef.get(token)) || payByReceipt.get(o.orderId);
        expected = o.cancelled ? 0 : o.total;
        if (p) {
          received = p.settled ? r2(p.credit || p.amount - p.fee - p.tax) : 0;
          receivedRef = p.utr;
          expected = r2(p.amount - p.fee - p.tax);
        }
      }
      const inBank = bankText === null || !receivedRef ? (bankText === null ? null : false) : bankText.includes(receivedRef.toUpperCase());
      const missing = receivedRef ? payoutMissing.get(receivedRef.toUpperCase()) : undefined;
      if (missing) fs.push(missing);
      let state: TrailState;
      if (fs.some((f) => f.kind === "claim")) state = "leak";
      else if (fs.length) state = "check";
      else if (o.cancelled || (o.paymentMode === "cod" && shipStatus !== "delivered")) state = "no_cash_due";
      else if (received > 0 && (inBank !== false)) state = "matched";
      else if (expected > 0) state = "pending";
      else state = "unknown";
      return {
        orderId: o.displayId,
        key: o.orderId,
        date: o.createdAt,
        mode: o.paymentMode,
        total: o.total,
        cancelled: o.cancelled,
        shipStatus,
        courier: ship?.courier ?? "",
        awb: ship?.awb ?? "",
        expected: r2(expected),
        received: r2(received),
        receivedRef,
        inBank,
        state,
        findings: fs,
      } satisfies TrailRow;
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
