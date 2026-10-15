import type {
  BankTxn, Charge, ChargeType, CodRemittance, Dataset, FileKind, GatewayTxn, Order, PaymentMode,
  Shipment, ShipStatus, Table, WeightDiscrepancy,
} from "./types";
import type { ColumnMap } from "./detect";
import { gatewayFromShopify } from "./partners";
import { extractRefs, money0, normAwb, normHeader, normOrderId, parseDate, parseMoney } from "./util";

export interface ParsedFile {
  name: string;
  kind: FileKind;
  /** partner id for courier and gateway files */
  partner: string | null;
  table: Table;
  headerRow: number;
  map: ColumnMap;
}

type Getter = (row: unknown[], key: string) => unknown;

function getter(map: ColumnMap): Getter {
  return (row, key) => (map[key] === undefined ? undefined : row[map[key]]);
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

function isBlankRow(row: unknown[]): boolean {
  return !row || row.every((c) => str(c) === "");
}

export function paymentModeFrom(text: string, financialStatus = ""): PaymentMode {
  const t = text.toLowerCase();
  if (/cash on delivery|\bcod\b|cash_on_delivery|pay on delivery/.test(t)) return "cod";
  if (/pre-?paid|razorpay|upi|card|net ?banking|wallet|payu|cashfree|paytm|phonepe|stripe|paypal|gokwik|simpl/.test(t)) return "prepaid";
  const fs = financialStatus.toLowerCase();
  if (fs === "pending") return "cod";
  if (fs === "paid" || fs.includes("refund")) return "prepaid";
  return "unknown";
}

export function shipStatusFrom(text: string): ShipStatus {
  const t = text.toLowerCase();
  if (/rto|return to origin|returned to (seller|origin)|rts\b/.test(t)) return "rto";
  if (/undelivered|not delivered|ndr/.test(t)) return "in_transit";
  if (/delivered/.test(t)) return "delivered";
  if (/cancel/.test(t)) return "cancelled";
  if (/lost|damaged|destroyed/.test(t)) return "lost";
  if (/transit|pick|out for delivery|shipped|manifest|dispatched|in progress|reached/.test(t)) return "in_transit";
  return "other";
}

function weightStatusFrom(text: string): WeightDiscrepancy["status"] {
  const t = text.toLowerCase();
  if (/auto.?accept/.test(t)) return "accepted";
  if (/dispute/.test(t) && /(accept|resolv|clos|reject|refund)/.test(t)) return "closed";
  if (/dispute|raised/.test(t)) return "disputed";
  if (/accept/.test(t)) return "accepted";
  if (/open|pending|new|action/.test(t)) return "open";
  return "closed";
}

/** Weights written in grams ("Charged Weight (gm)") are converted to kg. */
function weightReader(file: ParsedFile, key: string): (row: unknown[]) => number {
  const col = file.map[key];
  const head = col === undefined ? "" : normHeader(String(file.table[file.headerRow]?.[col] ?? ""));
  const grams = /(^| )(g|gm|gms|gram|grams)( |$)/.test(head);
  return (row) => {
    if (col === undefined) return 0;
    const n = money0(row[col]);
    return grams ? n / 1000 : n;
  };
}

/** Failed, dropped or pending gateway rows never moved money, so they are skipped. */
const FAILED = /fail|drop|bounc|declin|abort|cancel|timeout|timed out|incomplete|initiated|not ?captured/i;

function truthy(v: unknown): boolean | null {
  const s = str(v).toLowerCase();
  if (!s) return null;
  if (["true", "1", "yes", "y", "settled"].includes(s)) return true;
  if (["false", "0", "no", "n", "unsettled", "pending"].includes(s)) return false;
  return null;
}

export function normalise(files: ParsedFile[]): Dataset {
  const ds: Dataset = {
    orders: [], shipments: [], charges: [], remittances: [], weights: [], gateway: [], bank: [],
    present: {}, partnerFiles: {}, notes: [],
  };

  for (const file of files) {
    ds.present[file.kind] = true;
    const partner = file.partner ?? (file.kind === "gateway_settlements" ? "other_gateway" : "other_courier");
    if (file.kind !== "shopify_orders" && file.kind !== "bank") {
      const list = (ds.partnerFiles[partner] ??= []);
      if (!list.includes(file.kind)) list.push(file.kind);
    }
    const g = getter(file.map);
    const rows = file.table.slice(file.headerRow + 1).map((r, i) => ({ r, i: i + file.headerRow + 2 }));

    switch (file.kind) {
      case "shopify_orders": {
        // Shopify writes one row per line item; order-level columns are only filled on the first row.
        const byId = new Map<string, Order>();
        for (const { r } of rows) {
          if (isBlankRow(r)) continue;
          const display = str(g(r, "orderId"));
          const id = normOrderId(display);
          if (!id) continue;
          const existing = byId.get(id);
          const total = parseMoney(g(r, "total"));
          if (existing) {
            // fill gaps only
            if (!existing.paymentMethod) existing.paymentMethod = str(g(r, "paymentMethod"));
            if (!existing.financialStatus) existing.financialStatus = str(g(r, "financialStatus"));
            if (!existing.total && Number.isFinite(total)) existing.total = total;
            continue;
          }
          if (!Number.isFinite(total)) continue; // line-item row without order data and no prior row
          const paymentMethod = str(g(r, "paymentMethod"));
          const financialStatus = str(g(r, "financialStatus"));
          byId.set(id, {
            orderId: id,
            gateway: null,
            displayId: display,
            createdAt: parseDate(g(r, "createdAt")),
            paymentMethod,
            financialStatus,
            paymentMode: paymentModeFrom(paymentMethod, financialStatus),
            total,
            refunded: money0(g(r, "refunded")),
            paymentRef: str(g(r, "paymentRef")),
            cancelled: !!str(g(r, "cancelledAt")) || /void/i.test(financialStatus),
          });
        }
        for (const o of byId.values()) o.gateway = o.paymentMode === "prepaid" ? gatewayFromShopify(o.paymentMethod) : null;
        ds.orders.push(...byId.values());
        break;
      }

      case "courier_shipments": {
        const longFormat = file.map.chargeType !== undefined && file.map.chargeAmount !== undefined;
        const chargedKg = weightReader(file, "chargedKg");
        const seenShip = new Map<string, Shipment>();
        for (const { r, i } of rows) {
          if (isBlankRow(r)) continue;
          const awb = normAwb(g(r, "awb"));
          if (!awb) continue;
          const orderId = normOrderId(g(r, "orderId"));
          const statusText = str(g(r, "status"));
          if (!seenShip.has(awb)) {
            const ship: Shipment = {
              partner,
              awb,
              orderId,
              courier: str(g(r, "courier")),
              paymentMode: paymentModeFrom(str(g(r, "paymentMode"))),
              status: shipStatusFrom(statusText),
              statusText,
              deliveredAt: parseDate(g(r, "deliveredAt")),
              codAmount: money0(g(r, "codAmount")),
              chargedKg: chargedKg(r),
              zone: str(g(r, "zone")),
            };
            seenShip.set(awb, ship);
            ds.shipments.push(ship);
          }
          const push = (type: ChargeType, amount: number) => {
            if (amount > 0) ds.charges.push({ partner, awb, orderId, type, amount, row: i });
          };
          if (longFormat) {
            const t = str(g(r, "chargeType")).toLowerCase();
            const type: ChargeType = /rto|return/.test(t) ? "rto" : /cod/.test(t) ? "cod_fee" : /freight|forward|shipping/.test(t) ? "forward" : "other";
            push(type, money0(g(r, "chargeAmount")));
          } else {
            push("forward", money0(g(r, "freight")));
            push("cod_fee", money0(g(r, "codFee")));
            push("rto", money0(g(r, "rtoCharge")));
          }
        }
        break;
      }

      case "courier_cod": {
        for (const { r } of rows) {
          if (isBlankRow(r)) continue;
          const awb = normAwb(g(r, "awb"));
          const orderId = normOrderId(g(r, "orderId"));
          if (!awb && !orderId) continue;
          const remitted = parseMoney(g(r, "remitted"));
          if (!Number.isFinite(remitted)) continue;
          ds.remittances.push({
            partner,
            awb,
            orderId,
            codAmount: money0(g(r, "codAmount")),
            remitted,
            remittedAt: parseDate(g(r, "remittedAt")),
            batchId: str(g(r, "batchId")),
            utr: str(g(r, "utr")).toUpperCase(),
          } satisfies CodRemittance);
        }
        break;
      }

      case "courier_weight": {
        const enteredKg = weightReader(file, "enteredKg");
        const chargedKg = weightReader(file, "chargedKg");
        for (const { r } of rows) {
          if (isBlankRow(r)) continue;
          const awb = normAwb(g(r, "awb"));
          if (!awb) continue;
          const statusText = str(g(r, "status"));
          ds.weights.push({
            partner,
            awb,
            orderId: normOrderId(g(r, "orderId")),
            enteredKg: enteredKg(r),
            chargedKg: chargedKg(r),
            extraCharge: money0(g(r, "extraCharge")),
            status: statusText ? weightStatusFrom(statusText) : "open",
            statusText,
            raisedAt: parseDate(g(r, "raisedAt")),
          } satisfies WeightDiscrepancy);
        }
        break;
      }

      case "gateway_settlements": {
        let skipped = 0;
        for (const { r } of rows) {
          if (isBlankRow(r)) continue;
          const id = str(g(r, "id")) || str(g(r, "paymentId"));
          if (!id) continue;
          const statusText = str(g(r, "status"));
          if (statusText && FAILED.test(statusText)) { skipped++; continue; }
          const typeText = (str(g(r, "type")) || (/refund/i.test(statusText) ? "refund" : "") || id).toLowerCase();
          const type: GatewayTxn["type"] =
            /refund|rfnd_|reversal/.test(typeText) ? "refund"
            : /payment|pay_|sale|capture|success|acquir|collect|purchase|^txn/.test(typeText) ? "payment"
            : /adjust|adj_|chargeback|dispute/.test(typeText) ? "adjustment"
            : file.map.type === undefined ? "payment" // no type column: every row is a payment
            : "other";
          const net = parseMoney(g(r, "net"));
          const utr = str(g(r, "utr")).toUpperCase();
          const settledAt = parseDate(g(r, "settledAt"));
          const settledFlag = truthy(g(r, "settled"));
          const international = truthy(g(r, "international")) === true;
          const amount = Math.abs(money0(g(r, "amount")));
          const fee = Math.abs(money0(g(r, "fee")));
          const tax = Math.abs(money0(g(r, "tax")));
          let credit = money0(g(r, "credit"));
          let debit = money0(g(r, "debit"));
          if (file.map.credit === undefined && file.map.debit === undefined && Number.isFinite(net)) {
            if (net >= 0 && type !== "refund") credit = net;
            else debit = Math.abs(net);
          }
          ds.gateway.push({
            partner,
            id,
            type,
            paymentId: type === "payment" ? id : str(g(r, "paymentId")),
            orderRef: normOrderId(g(r, "orderReceipt")),
            amount,
            fee,
            tax,
            credit,
            debit,
            settled: settledFlag ?? (!!utr || !!settledAt),
            createdAt: parseDate(g(r, "createdAt")),
            settledAt,
            settlementId: str(g(r, "settlementId")),
            utr,
            method: str(g(r, "method")).toLowerCase(),
            cardNetwork: str(g(r, "cardNetwork")).toLowerCase(),
            international,
          } satisfies GatewayTxn);
        }
        if (skipped) ds.notes.push(`${skipped} failed or incomplete payment${skipped === 1 ? " was" : "s were"} skipped in ${file.name}, since no money moved.`);
        break;
      }

      case "bank": {
        for (const { r, i } of rows) {
          if (isBlankRow(r)) continue;
          const date = parseDate(g(r, "date"));
          if (!date) continue;
          const narration = str(g(r, "narration"));
          const ref = str(g(r, "ref"));
          ds.bank.push({
            date,
            narration,
            ref,
            deposit: money0(g(r, "deposit")),
            withdrawal: money0(g(r, "withdrawal")),
            refs: extractRefs(`${narration} ${ref}`),
            row: i,
          } satisfies BankTxn);
        }
        break;
      }
    }
  }
  return ds;
}
