import type { CourierRates, GatewayRates, PartnerType } from "./partners";

export type FileKind =
  | "shopify_orders"
  | "courier_shipments"
  | "courier_cod"
  | "courier_weight"
  | "gateway_settlements"
  | "bank";

/** A raw table: first row is headers. Cells may be strings, numbers or Dates (from Excel). */
export type Table = unknown[][];

export type PaymentMode = "cod" | "prepaid" | "unknown";
export type ShipStatus = "delivered" | "rto" | "in_transit" | "cancelled" | "lost" | "other";

export interface Order {
  orderId: string; // normalised
  gateway: string | null; // gateway partner id from Shopify's payment method
  displayId: string; // as written in Shopify, e.g. "#10023"
  createdAt: Date | null;
  paymentMode: PaymentMode;
  paymentMethod: string;
  financialStatus: string;
  total: number;
  refunded: number;
  paymentRef: string;
  cancelled: boolean;
}

export type ChargeType = "forward" | "cod_fee" | "rto" | "other";

export interface Charge {
  partner: string;
  awb: string;
  orderId: string;
  type: ChargeType;
  amount: number;
  row: number;
}

export interface Shipment {
  partner: string; // who billed it: Shiprocket, Delhivery direct, ...
  awb: string;
  orderId: string;
  courier: string; // carrier named in the file (an aggregator books many)
  paymentMode: PaymentMode;
  status: ShipStatus;
  statusText: string;
  deliveredAt: Date | null;
  codAmount: number;
  chargedKg: number;
  zone: string;
}

export interface CodRemittance {
  partner: string;
  awb: string;
  orderId: string;
  codAmount: number;
  remitted: number;
  remittedAt: Date | null;
  batchId: string;
  utr: string;
}

export interface WeightDiscrepancy {
  partner: string;
  awb: string;
  orderId: string;
  enteredKg: number;
  chargedKg: number;
  extraCharge: number;
  status: "open" | "disputed" | "accepted" | "closed";
  statusText: string;
  raisedAt: Date | null;
}

export interface GatewayTxn {
  partner: string;
  id: string;
  type: "payment" | "refund" | "adjustment" | "other";
  paymentId: string; // for refunds: the payment refunded
  orderRef: string; // normalised Shopify order reference if present (receipt/notes)
  amount: number;
  fee: number;
  tax: number;
  credit: number;
  debit: number;
  settled: boolean;
  createdAt: Date | null;
  settledAt: Date | null;
  settlementId: string;
  utr: string;
  method: string;
  cardNetwork: string;
  international: boolean;
}

export interface BankTxn {
  date: Date | null;
  narration: string;
  ref: string;
  deposit: number;
  withdrawal: number;
  refs: string[];
  row: number;
}

export interface Dataset {
  orders: Order[];
  shipments: Shipment[];
  charges: Charge[];
  remittances: CodRemittance[];
  weights: WeightDiscrepancy[];
  gateway: GatewayTxn[];
  bank: BankTxn[];
  present: Partial<Record<FileKind, boolean>>;
  /** which file kinds each partner sent */
  partnerFiles: Record<string, FileKind[]>;
  notes: string[];
}

export type BucketId =
  | "cod_unpaid"
  | "courier_payout_missing"
  | "shipping_overcharge"
  | "weight_dispute"
  | "gateway_shortfall"
  | "gateway_payout_missing";

/** A partner's display name, or "Your team" when the fix is on the brand's side. */
export type Counterparty = string;

export interface Finding {
  id: string;
  bucket: BucketId;
  /** claim = money owed with evidence; check = needs a human look before claiming */
  kind: "claim" | "check";
  counterparty: Counterparty;
  /** partner id the finding belongs to (also set for "Your team" items about that partner) */
  partner?: string;
  title: string;
  reason: string;
  amount: number;
  orderId?: string;
  awb?: string;
  ref?: string;
  date?: Date | null;
  deadline?: Date | null;
  daysLeft?: number;
}

export interface Settings {
  asOf?: Date;
  /** confirmed rate cards, by partner id */
  gateway: Record<string, GatewayRates>;
  courier: Record<string, CourierRates>;
  bankMatchDays: number;
  tolerance: number;
}

export const DEFAULT_SETTINGS: Settings = {
  gateway: {},
  courier: {},
  bankMatchDays: 3,
  tolerance: 1,
};

/** Used only when a partner has no confirmed rate card (the app always asks for one). */
export const FALLBACK_GATEWAY: GatewayRates = { standardPct: 2, upiPct: 2, premiumPct: 3, fixedFee: 0, gstPct: 18, settleDays: 3 };
export const FALLBACK_COURIER_DAYS = { weightDisputeDays: 7, codPayDays: 10 };

export interface BucketSummary {
  id: BucketId;
  title: string;
  blurb: string;
  side: PartnerType;
  claimTotal: number;
  checkTotal: number;
  count: number;
  ran: boolean;
  needs: string; // which files unlock it, shown when it didn't run
}

export interface CashView {
  sold: number;
  codSold: number;
  prepaidSold: number;
  refundedInShopify: number;
  gatewayFees: number;
  gatewayTax: number;
  shippingCharges: number;
  codRemitted: number;
  codRemittedBy: Record<string, number>;
  codPendingInGrace: number;
  gatewaySettledNet: number;
  gatewaySettledBy: Record<string, number>;
  reachedBank: number | null;
  rtoOrders: number;
  rtoCharges: number;
}

export interface Insight {
  title: string;
  detail: string;
  amount?: number;
}

export interface PartnerSummary {
  id: string;
  name: string;
  type: PartnerType;
  files: FileKind[];
  /** file kinds this partner type can send that weren't added */
  missingFiles: FileKind[];
  claimTotal: number;
  checkTotal: number;
  count: number;
  byBucket: { bucket: BucketId; claim: number; check: number; count: number }[];
  rateCard: boolean;
  /** volume seen in this partner's files */
  volume: { label: string; value: string }[];
}

export interface AuditResult {
  asOf: Date;
  period: { from: Date | null; to: Date | null };
  findings: Finding[];
  buckets: BucketSummary[];
  claimTotal: number;
  checkTotal: number;
  cash: CashView;
  insights: Insight[];
  notes: string[];
  partners: PartnerSummary[];
  settings: Settings;
}
