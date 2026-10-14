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
  awb: string;
  orderId: string;
  type: ChargeType;
  amount: number;
  row: number;
}

export interface Shipment {
  awb: string;
  orderId: string;
  courier: string;
  paymentMode: PaymentMode;
  status: ShipStatus;
  statusText: string;
  deliveredAt: Date | null;
  codAmount: number;
}

export interface CodRemittance {
  awb: string;
  orderId: string;
  codAmount: number;
  remitted: number;
  remittedAt: Date | null;
  batchId: string;
  utr: string;
}

export interface WeightDiscrepancy {
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
  notes: string[];
}

export type BucketId =
  | "cod_unpaid"
  | "courier_payout_missing"
  | "shipping_overcharge"
  | "weight_dispute"
  | "gateway_shortfall"
  | "gateway_payout_missing";

export type Counterparty = "Shiprocket" | "Razorpay" | "Your bank" | "Your team";

export interface Finding {
  id: string;
  bucket: BucketId;
  /** claim = money owed with evidence; check = needs a human look before claiming */
  kind: "claim" | "check";
  counterparty: Counterparty;
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
  gatewayFeePct: number; // e.g. 2 for 2%
  gatewayFeePctPremium: number; // Amex, Diners, international cards
  gstPct: number;
  codGraceDays: number;
  gatewayGraceDays: number;
  bankMatchDays: number;
  weightDisputeWorkingDays: number;
  tolerance: number;
}

export const DEFAULT_SETTINGS: Settings = {
  gatewayFeePct: 2,
  gatewayFeePctPremium: 3,
  gstPct: 18,
  codGraceDays: 10,
  gatewayGraceDays: 3,
  bankMatchDays: 3,
  weightDisputeWorkingDays: 7,
  tolerance: 1,
};

export interface BucketSummary {
  id: BucketId;
  title: string;
  blurb: string;
  counterparty: Counterparty;
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
  codPendingInGrace: number;
  gatewaySettledNet: number;
  reachedBank: number | null;
  rtoOrders: number;
  rtoCharges: number;
}

export interface Insight {
  title: string;
  detail: string;
  amount?: number;
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
  settings: Settings;
}
