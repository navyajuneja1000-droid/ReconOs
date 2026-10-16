import type { FileKind } from "./types";
import { PARTNER_BY_ID } from "./partners";
import { normHeader } from "./util";

export interface FieldSpec {
  key: string;
  label: string;
  synonyms: string[];
}

export interface KindSpec {
  kind: FileKind;
  label: string;
  source: string;
  unlocks: string;
  fields: FieldSpec[];
  /** every entry must be satisfied; an entry is a list of alternatives (any one is enough) */
  required: string[][];
  /** fields whose presence makes this kind more likely than its look-alikes */
  signature: string[];
}

const f = (key: string, label: string, synonyms: string[]): FieldSpec => ({ key, label, synonyms });

export const KIND_SPECS: KindSpec[] = [
  {
    kind: "shopify_orders",
    label: "Shopify orders",
    source: "Shopify admin → Orders → Export → All orders (CSV)",
    unlocks: "What you sold, COD vs prepaid, refunds. Needed for every check.",
    fields: [
      f("orderId", "Order number", ["name", "order name", "order number", "order", "order id"]),
      f("createdAt", "Order date", ["created at", "order date", "created"]),
      f("financialStatus", "Payment status", ["financial status", "payment status"]),
      f("paymentMethod", "Payment method", ["payment method", "payment gateway names", "payment gateway", "gateway"]),
      f("total", "Order total", ["total", "order total", "total price", "total amount"]),
      f("refunded", "Refunded amount", ["refunded amount", "total refunded", "refunded"]),
      f("paymentRef", "Payment reference", ["payment reference", "payment references", "payment id", "transaction id"]),
      f("cancelledAt", "Cancelled at", ["cancelled at", "canceled at"]),
    ],
    required: [["orderId"], ["total"], ["paymentMethod", "financialStatus"]],
    signature: ["financialStatus", "paymentMethod", "cancelledAt"],
  },
  {
    kind: "courier_shipments",
    label: "Courier shipments and charges",
    source: "Your courier or Shiprocket panel → Shipments or Billing → Export",
    unlocks: "Delivery status for COD checks, and shipping overcharges.",
    fields: [
      f("awb", "AWB number", ["awb code", "awb", "awb number", "awb no", "tracking number", "tracking id", "waybill", "waybill no", "consignment number", "consignment no", "docket number"]),
      f("orderId", "Order ID", ["order id", "channel order id", "order number", "order no", "reference number", "reference no"]),
      f("courier", "Courier", ["courier name", "courier", "carrier", "courier partner"]),
      f("paymentMode", "Payment mode", ["payment method", "payment mode", "payment type", "cod prepaid"]),
      f("status", "Shipment status", ["status", "shipment status", "current status", "delivery status"]),
      f("deliveredAt", "Delivered date", ["delivered date", "delivered at", "delivery date", "delivered on"]),
      f("codAmount", "COD amount", ["cod amount", "cod payable amount", "collectable amount", "cod value"]),
      f("freight", "Freight charges", ["freight charges", "forward charges", "shipping charges", "forward freight", "freight"]),
      f("codFee", "COD charges", ["cod charges", "cod charge", "cod fee", "cod handling charges"]),
      f("rtoCharge", "RTO charges", ["rto charges", "rto charge", "rto freight", "return charges"]),
      f("chargedKg", "Charged weight", ["charged weight kg", "charged weight", "billed weight", "final weight"]),
      f("zone", "Zone", ["zone", "billing zone", "rate zone", "zone name"]),
      f("chargeType", "Charge type (one row per charge)", ["charge type", "charge description"]),
      f("chargeAmount", "Charge amount (one row per charge)", ["charge amount", "billed amount"]),
    ],
    required: [["awb"], ["status", "freight", "chargeAmount", "codFee", "rtoCharge"]],
    signature: ["status", "freight", "codFee", "rtoCharge", "deliveredAt", "chargeType"],
  },
  {
    kind: "courier_cod",
    label: "COD payouts",
    source: "Your courier or Shiprocket panel → COD remittance → Export",
    unlocks: "COD money not paid or short-paid to you.",
    fields: [
      f("awb", "AWB number", ["awb code", "awb", "awb number", "awb no", "tracking number", "tracking id", "waybill", "waybill no", "consignment number"]),
      f("orderId", "Order ID", ["order id", "channel order id", "order number", "order no"]),
      f("codAmount", "COD amount", ["cod amount", "cod value", "collected amount", "collectable amount", "cod collected"]),
      f("remitted", "Amount remitted", ["remitted amount", "remittance amount", "amount remitted", "paid amount", "net remitted"]),
      f("remittedAt", "Remittance date", ["remittance date", "remitted on", "paid on", "remitted date", "payment date"]),
      f("batchId", "Remittance / CRF ID", ["crf id", "remittance id", "batch id", "remittance number"]),
      f("utr", "UTR", ["utr", "utr number", "utr no", "bank reference", "transaction reference"]),
    ],
    required: [["awb", "orderId"], ["remitted"]],
    signature: ["remitted", "remittedAt", "batchId", "utr"],
  },
  {
    kind: "courier_weight",
    label: "Extra weight charges",
    source: "Your courier or Shiprocket panel → Weight discrepancy → Export",
    unlocks: "Extra weight charges you can still dispute, with deadlines.",
    fields: [
      f("awb", "AWB number", ["awb code", "awb", "awb number", "awb no", "tracking number", "tracking id", "waybill", "consignment number"]),
      f("orderId", "Order ID", ["order id", "channel order id", "order number"]),
      f("enteredKg", "Your entered weight (kg)", ["entered weight kg", "entered weight", "applied weight", "declared weight", "applied weight kg"]),
      f("chargedKg", "Courier's charged weight (kg)", ["charged weight kg", "charged weight", "courier weight", "final weight"]),
      f("extraCharge", "Extra charge", ["excess charges", "excess charge", "extra charge", "discrepancy amount", "additional charges", "difference amount"]),
      f("status", "Dispute status", ["status", "dispute status", "discrepancy status"]),
      f("raisedAt", "Discrepancy date", ["discrepancy date", "raised on", "discrepancy raised on", "created at", "date"]),
    ],
    required: [["awb"], ["chargedKg"], ["enteredKg", "extraCharge"]],
    signature: ["chargedKg", "enteredKg", "extraCharge"],
  },
  {
    kind: "gateway_settlements",
    label: "Gateway payouts (settlement report)",
    source: "Your gateway's dashboard → Reports → Settlement or transaction report",
    unlocks: "Missing settlements, fee and GST overcharges, refund mismatches.",
    fields: [
      f("id", "Transaction ID", ["entity id", "entity_id", "transaction id", "id"]),
      f("type", "Type", ["type", "entity type", "transaction type"]),
      f("amount", "Amount", ["amount", "gross amount"]),
      f("fee", "Fee", ["fee", "fees", "fee amount", "mdr"]),
      f("tax", "Tax on fee", ["tax", "gst", "tax amount", "gst on fee"]),
      f("credit", "Credit", ["credit"]),
      f("debit", "Debit", ["debit"]),
      f("settled", "Settled", ["settled"]),
      f("status", "Payment status", ["status", "payment status", "transaction status"]),
      f("net", "Net amount paid to you", ["net amount", "settlement amount", "settled amount", "payable amount"]),
      f("createdAt", "Created at", ["created at", "created_at", "payment date"]),
      f("settledAt", "Settled at", ["settled at", "settled_at", "settlement date"]),
      f("settlementId", "Settlement ID", ["settlement id", "settlement_id"]),
      f("utr", "Settlement UTR", ["settlement utr", "settlement_utr", "utr"]),
      f("paymentId", "Payment ID", ["payment id", "payment_id"]),
      f("orderReceipt", "Order receipt / notes", ["order receipt", "order_receipt", "receipt", "notes", "description"]),
      f("method", "Payment method", ["method", "payment method", "payment mode", "payment group", "payment instrument", "instrument type", "pay mode"]),
      f("cardNetwork", "Card network", ["card network", "card_network", "network", "card scheme", "scheme"]),
      // after cardNetwork, so a gateway that calls its network column "card type" (PayU) keeps it as the network
      f("cardType", "Credit or debit", ["card type", "card_type", "card category", "card variant"]),
      f("international", "International", ["international", "is international"]),
    ],
    required: [["id", "paymentId"], ["amount", "credit"], ["fee"]],
    signature: ["fee", "tax", "settlementId", "utr", "settled"],
  },
  {
    kind: "bank",
    label: "Bank statement",
    source: "Net banking → Account statement → Download as Excel/CSV",
    unlocks: "Payouts that never reached your bank.",
    fields: [
      f("date", "Date", ["date", "txn date", "transaction date", "value date", "value dt", "posting date"]),
      f("narration", "Narration", ["narration", "description", "particulars", "remarks", "transaction details"]),
      f("ref", "Reference", ["chq ref no", "ref no", "reference", "reference no", "chq no", "cheque no", "utr"]),
      f("deposit", "Deposit / credit", ["deposit amt", "deposit", "deposits", "credit", "credit amount", "cr amount", "cr"]),
      f("withdrawal", "Withdrawal / debit", ["withdrawal amt", "withdrawal", "withdrawals", "debit", "debit amount", "dr amount", "dr"]),
    ],
    required: [["date"], ["narration"], ["deposit"]],
    signature: ["narration", "deposit", "withdrawal"],
  },
];

export const SPEC_BY_KIND: Record<FileKind, KindSpec> = Object.fromEntries(
  KIND_SPECS.map((s) => [s.kind, s]),
) as Record<FileKind, KindSpec>;

export type ColumnMap = Record<string, number>;

/** A kind's fields with a partner's own column names tried first. */
export function fieldsFor(kind: FileKind, partner?: string | null): FieldSpec[] {
  const extra = partner ? PARTNER_BY_ID[partner]?.columns[kind] : undefined;
  const base = SPEC_BY_KIND[kind].fields;
  if (!extra) return base;
  return base.map((fld) => (extra[fld.key] ? { ...fld, synonyms: [...extra[fld.key], ...fld.synonyms] } : fld));
}

/** Match each field to a column: exact synonym first, then whole-word containment. */
export function mapColumns(kind: FileKind, headers: unknown[], overrides: ColumnMap = {}, partner?: string | null): ColumnMap {
  const spec = { fields: fieldsFor(kind, partner) };
  const norm = headers.map((h) => normHeader(String(h ?? "")));
  const used = new Set<number>(Object.values(overrides));
  const map: ColumnMap = { ...overrides };

  // pass 1: exact matches, in field order, so the most specific field wins its column
  for (const field of spec.fields) {
    if (map[field.key] !== undefined) continue;
    for (const syn of field.synonyms) {
      const target = normHeader(syn);
      const idx = norm.findIndex((h, i) => h === target && !used.has(i));
      if (idx >= 0) {
        map[field.key] = idx;
        used.add(idx);
        break;
      }
    }
  }
  // pass 2: containment ("deposit amt inr" contains "deposit amt")
  for (const field of spec.fields) {
    if (map[field.key] !== undefined) continue;
    for (const syn of field.synonyms) {
      const target = normHeader(syn);
      if (target.length < 3) continue;
      const re = new RegExp(`(^| )${target.replace(/ /g, " ")}( |$)`);
      const idx = norm.findIndex((h, i) => !used.has(i) && re.test(h));
      if (idx >= 0) {
        map[field.key] = idx;
        used.add(idx);
        break;
      }
    }
  }
  return map;
}

export function missingRequired(kind: FileKind, map: ColumnMap): string[][] {
  return SPEC_BY_KIND[kind].required.filter((alts) => !alts.some((k) => map[k] !== undefined));
}

export interface Detection {
  kind: FileKind | null;
  headerRow: number;
  map: ColumnMap;
  score: number;
  candidates: { kind: FileKind; score: number; ok: boolean }[];
}

/**
 * Work out what a table is. Some exports put a title or blank lines above the header,
 * so the first 15 rows are tried as the header row.
 */
export function detectKind(table: unknown[][], partner?: string | null): Detection {
  let best: Detection = { kind: null, headerRow: 0, map: {}, score: 0, candidates: [] };
  const maxHeaderRow = Math.min(15, Math.max(0, table.length - 1));
  for (let hr = 0; hr <= maxHeaderRow; hr++) {
    const headers = table[hr] ?? [];
    const nonEmpty = headers.filter((h) => String(h ?? "").trim() !== "").length;
    if (nonEmpty < 3) continue;
    const candidates = KIND_SPECS.map((spec) => {
      const map = mapColumns(spec.kind, headers, {}, partner);
      const ok = missingRequired(spec.kind, map).length === 0;
      const sig = spec.signature.filter((k) => map[k] !== undefined).length;
      const matched = Object.keys(map).length;
      const score = ok ? 100 + sig * 10 + matched : matched;
      return { kind: spec.kind, score, ok, map };
    }).sort((a, b) => b.score - a.score);
    const top = candidates[0];
    if (top.ok && top.score > best.score) {
      best = {
        kind: top.kind,
        headerRow: hr,
        map: top.map,
        score: top.score,
        candidates: candidates.map(({ kind, score, ok }) => ({ kind, score, ok })),
      };
    }
    if (best.kind) break; // first plausible header row wins
  }
  return best;
}
