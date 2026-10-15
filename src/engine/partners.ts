/**
 * Partner library: every payment gateway and courier ReconOS knows how to read.
 *
 * Each partner has:
 *  - how to recognise its files (file name and column hints)
 *  - its own column names, tried before the generic ones in detect.ts
 *  - the words its payouts use in a bank statement
 *  - example rates the founder can start from (they must confirm their own)
 *
 * When a real export arrives from a partner, run `npm run inspect -- <file>` and add any
 * column names it misses to that partner's `columns` below. Then drop an anonymised copy in
 * tests/fixtures/<partner id>/<file kind>/ so it is tested on every change, and set
 * `status` to "tested". See docs/ADDING_PARTNER_FILES.md.
 */
import type { FileKind } from "./types";
import { normHeader } from "./util";

export type PartnerType = "gateway" | "courier";

export const ZONES = ["A", "B", "C", "D", "E"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABEL: Record<Zone, string> = {
  A: "Within city",
  B: "Within state",
  C: "Metro to metro",
  D: "Rest of India",
  E: "North-east, J&K and special",
};

export interface GatewayRates {
  standardPct: number; // cards, net banking, wallets
  upiPct: number;
  premiumPct: number; // Amex, Diners, international
  fixedFee: number; // rupees per payment
  gstPct: number;
  settleDays: number; // settles within this many days of payment
}

export interface CourierRates {
  zones: Record<Zone, { first: number; extra: number }>; // per 500 g
  codPct: number;
  codMin: number;
  rtoPct: number; // return charge as % of the forward charge
  weightDisputeDays: number; // working days to dispute a weight charge
  codPayDays: number; // COD should be paid within this many days of delivery
}

export interface PartnerProfile {
  id: string;
  name: string;
  type: PartnerType;
  /** aggregators book many couriers, so their per-courier prices vary */
  aggregator?: boolean;
  /** "beta" until a real export has been checked and added to tests/fixtures */
  status: "beta" | "tested";
  fileHint?: RegExp;
  /** normalised header words that point to this partner */
  headerHints: string[];
  bankHint: RegExp;
  /** how Shopify's Payment Method column names this gateway */
  shopifyHint?: RegExp;
  /** partner-specific column names, per file kind and field */
  columns: Partial<Record<FileKind, Record<string, string[]>>>;
  /** where the founder downloads each report */
  reports: Partial<Record<FileKind, string>>;
  contact: string;
  rateHelp: string;
  exampleGateway?: GatewayRates;
  exampleCourier?: CourierRates;
}

const gw = (standardPct: number, upiPct: number, premiumPct: number, settleDays = 2, fixedFee = 0): GatewayRates => ({
  standardPct, upiPct, premiumPct, fixedFee, gstPct: 18, settleDays,
});

const cr = (rates: [number, number, number, number, number], codPct: number, codMin: number, weightDisputeDays = 7): CourierRates => ({
  zones: Object.fromEntries(ZONES.map((z, i) => [z, { first: rates[i], extra: rates[i] }])) as CourierRates["zones"],
  codPct,
  codMin,
  rtoPct: 100,
  weightDisputeDays,
  codPayDays: 10,
});

const COURIER_REPORTS = (name: string): PartnerProfile["reports"] => ({
  courier_shipments: `${name} panel → Shipments or Billing → export the shipment and charges report`,
  courier_cod: `${name} panel → COD remittance → export`,
  courier_weight: `${name} panel → Weight discrepancy → export`,
});

export const PARTNERS: PartnerProfile[] = [
  // ───────────── Payment gateways ─────────────
  {
    id: "razorpay",
    name: "Razorpay",
    type: "gateway",
    status: "beta",
    fileHint: /razorpay|rzp/i,
    headerHints: ["entity id", "settlement utr", "order receipt", "card network"],
    bankHint: /razorpay/i,
    shopifyHint: /razorpay/i,
    columns: {},
    reports: { gateway_settlements: "Razorpay dashboard → Reports → Settlement recon (CSV)" },
    contact: "Razorpay support (Dashboard → Help & Support → raise a ticket)",
    rateHelp: "Your Razorpay pricing page or the pricing in your agreement email.",
    exampleGateway: gw(2, 2, 3),
  },
  {
    id: "payu",
    name: "PayU",
    type: "gateway",
    status: "beta",
    fileHint: /payu/i,
    headerHints: ["mihpayid", "payu id", "payu fee", "mer service fee", "mer net amount", "settlementutr", "txnid"],
    bankHint: /payu/i,
    shopifyHint: /payu/i,
    columns: {
      gateway_settlements: {
        id: ["payu id", "payuid", "mihpayid", "payu transaction id"],
        orderReceipt: ["txnid", "merchant txn id", "merchant transaction id"],
        type: ["txn type", "transaction type", "action"],
        status: ["status", "txn status", "transaction status"],
        fee: ["payu fee", "mer service fee", "service fee", "tdr"],
        tax: ["payu fee tax", "mer service tax", "service tax", "gst on tdr"],
        net: ["net amount", "mer net amount", "amount settled"],
        utr: ["settlementutr", "settlement utr", "mer utr", "utr number"],
        method: ["mode", "payment mode", "pg type"],
        cardNetwork: ["card type", "issuing bank"],
        createdAt: ["txn addedon", "addedon", "transaction date"],
        settledAt: ["settledon", "settled on", "settlement date"],
        settlementId: ["settlement id", "payout id"],
        paymentId: ["parent payu id", "original payu id"],
      },
    },
    reports: { gateway_settlements: "PayU dashboard → Reports → Settlements → download the transaction-level report" },
    contact: "PayU merchant support (dashboard → Help → raise a ticket)",
    rateHelp: "Your PayU pricing in the dashboard or your agreement email.",
    exampleGateway: gw(2, 2, 3),
  },
  {
    id: "cashfree",
    name: "Cashfree",
    type: "gateway",
    status: "beta",
    fileHint: /cashfree/i,
    headerHints: ["cf payment id", "event type", "event amount", "event settlement amount", "event service charge", "payment group"],
    bankHint: /cashfree/i,
    shopifyHint: /cashfree/i,
    columns: {
      gateway_settlements: {
        id: ["cf payment id", "cf_payment_id", "reference id", "transaction id"],
        orderReceipt: ["order id", "order_id", "merchant order id"],
        type: ["event type", "transaction type"],
        status: ["event status", "payment status"],
        amount: ["event amount", "payment amount", "order amount"],
        fee: ["event service charge", "service charge"],
        tax: ["event service tax", "service tax"],
        net: ["event settlement amount", "settlement amount"],
        utr: ["settlement utr", "utr"],
        method: ["payment group", "payment mode", "payment method"],
        createdAt: ["event time", "payment time", "transaction time"],
        settledAt: ["settlement date", "settled on"],
        settlementId: ["settlement id", "cf settlement id"],
      },
    },
    reports: { gateway_settlements: "Cashfree dashboard → Payment Gateway → Settlements → download the settlement recon report" },
    contact: "Cashfree support (merchant dashboard → Help → raise a ticket)",
    rateHelp: "Your Cashfree pricing in the dashboard or your agreement email.",
    exampleGateway: gw(1.95, 1.95, 3),
  },
  {
    id: "phonepe",
    name: "PhonePe",
    type: "gateway",
    status: "beta",
    fileHint: /phonepe/i,
    headerHints: ["phonepe transaction id", "merchant transaction id", "provider reference id", "merchant order id"],
    bankHint: /phonepe/i,
    shopifyHint: /phonepe/i,
    columns: {
      gateway_settlements: {
        id: ["phonepe transaction id", "transaction id", "phonepe reference id"],
        orderReceipt: ["merchant order id", "merchant transaction id", "merchant reference id"],
        type: ["transaction type", "type"],
        status: ["transaction status", "status"],
        amount: ["transaction amount", "amount"],
        fee: ["fee", "mdr", "fee amount", "commission"],
        tax: ["gst", "igst", "tax"],
        net: ["settlement amount", "net amount", "settled amount"],
        utr: ["utr", "settlement utr", "bank reference number"],
        method: ["payment instrument", "instrument type", "payment mode"],
        createdAt: ["transaction date", "transaction time"],
        settledAt: ["settlement date", "settled on"],
      },
    },
    reports: { gateway_settlements: "PhonePe Business dashboard → Reports → Settlements → download" },
    contact: "PhonePe PG merchant support (dashboard → Help)",
    rateHelp: "Your PhonePe PG pricing in the dashboard or your agreement.",
    exampleGateway: gw(1.9, 0, 3),
  },
  {
    id: "paytm",
    name: "Paytm",
    type: "gateway",
    status: "beta",
    fileHint: /paytm/i,
    headerHints: ["commission", "settled amount", "paytm transaction id"],
    bankHint: /paytm|one ?97/i,
    shopifyHint: /paytm/i,
    columns: {
      gateway_settlements: {
        id: ["transaction id", "txn id", "paytm transaction id"],
        orderReceipt: ["order id", "merchant order id"],
        type: ["transaction type", "txn type"],
        status: ["status", "transaction status"],
        amount: ["amount", "transaction amount", "txn amount"],
        fee: ["commission", "mdr", "charges"],
        tax: ["gst", "service tax"],
        net: ["settled amount", "settlement amount", "net amount"],
        utr: ["utr no", "utr number", "utr"],
        method: ["payment mode", "pay mode"],
        createdAt: ["transaction date", "txn date"],
        settledAt: ["settled date", "settlement date"],
      },
    },
    reports: { gateway_settlements: "Paytm for Business dashboard → Settlements → download transaction-wise report" },
    contact: "Paytm for Business support (dashboard → Help)",
    rateHelp: "Your Paytm PG pricing in the dashboard or your agreement.",
    exampleGateway: gw(1.99, 0, 3),
  },
  {
    id: "ccavenue",
    name: "CCAvenue",
    type: "gateway",
    status: "beta",
    fileHint: /ccavenue|ccav/i,
    headerHints: ["ccavenue ref", "ccavenue reference", "tdr", "order no"],
    bankHint: /ccavenue|infibeam|avenues/i,
    shopifyHint: /ccavenue/i,
    columns: {
      gateway_settlements: {
        id: ["ccavenue ref", "ccavenue ref no", "ccavenue reference no", "reference no"],
        orderReceipt: ["order no", "order number", "order id"],
        type: ["transaction type", "type"],
        status: ["order status", "status"],
        amount: ["gross amount", "amount", "transaction amount"],
        fee: ["tdr", "fees", "tdr amount"],
        tax: ["service tax", "gst", "tax on tdr"],
        net: ["net amount", "payable amount"],
        utr: ["utr", "utr no", "bank reference"],
        method: ["payment mode", "pay mode"],
        createdAt: ["transaction date", "order date"],
        settledAt: ["settlement date", "payout date"],
      },
    },
    reports: { gateway_settlements: "CCAvenue dashboard → Reports → Settlement report → download" },
    contact: "CCAvenue merchant support",
    rateHelp: "Your CCAvenue pricing in your agreement.",
    exampleGateway: gw(2, 2, 3),
  },
  {
    id: "other_gateway",
    name: "Other gateway",
    type: "gateway",
    status: "beta",
    headerHints: [],
    bankHint: /payment gateway|\bpg\b/i,
    columns: {},
    reports: { gateway_settlements: "Your gateway's dashboard → settlement or transaction report" },
    contact: "your payment gateway's support team",
    rateHelp: "Your gateway's pricing page or agreement.",
    exampleGateway: gw(2, 2, 3),
  },

  // ───────────── Couriers and shipping aggregators ─────────────
  {
    id: "shiprocket",
    name: "Shiprocket",
    type: "courier",
    aggregator: true,
    status: "beta",
    fileHint: /shiprocket|\bsr[_ -]/i,
    headerHints: ["awb code", "crf id", "channel order id", "excess charges"],
    bankHint: /shiprocket|bigfoot/i,
    columns: {},
    reports: {
      courier_shipments: "Shiprocket → Shipments (or Billing → Shipping charges) → Export",
      courier_cod: "Shiprocket → Billing → COD remittance → Export",
      courier_weight: "Shiprocket → Billing → Weight reconciliation → Export",
    },
    contact: "Shiprocket support (raise a ticket from the Shiprocket panel, or email your account manager)",
    rateHelp: "Shiprocket → Tools → Rate calculator, or the rate card for your plan.",
    exampleCourier: cr([34, 41, 49, 58, 72], 1.5, 30, 7),
  },
  {
    id: "delhivery",
    name: "Delhivery",
    type: "courier",
    status: "beta",
    fileHint: /delhivery/i,
    headerHints: ["waybill", "waybill no", "waybill number"],
    bankHint: /delhivery/i,
    columns: {
      courier_shipments: {
        awb: ["waybill", "waybill no", "waybill number"],
        orderId: ["order id", "reference no", "order no"],
        freight: ["freight charge", "freight charges", "forward charge", "total freight"],
        codFee: ["cod charge", "cod charges"],
        rtoCharge: ["rto charge", "rto charges"],
        chargedKg: ["charged weight", "charged weight gm", "billed weight"],
        zone: ["zone", "billing zone"],
      },
      courier_cod: {
        awb: ["waybill", "waybill no", "waybill number"],
        batchId: ["remittance id", "remittance no", "crn"],
        utr: ["utr no", "utr", "bank ref no"],
      },
      courier_weight: {
        awb: ["waybill", "waybill no", "waybill number"],
        enteredKg: ["declared weight", "declared weight gm", "dead weight"],
        chargedKg: ["charged weight", "charged weight gm", "audited weight"],
        extraCharge: ["weight difference charge", "excess charge", "additional charge"],
      },
    },
    reports: {
      courier_shipments: "Delhivery One → Billing → Shipment-wise charges → Download",
      courier_cod: "Delhivery One → Finance → COD remittance → Download",
      courier_weight: "Delhivery One → Weight discrepancy → Download",
    },
    contact: "Delhivery support (Delhivery One panel → Help → raise a ticket, or your account manager)",
    rateHelp: "The rate card in your Delhivery One panel or your agreement.",
    exampleCourier: cr([32, 38, 45, 55, 68], 1.75, 35, 7),
  },
  {
    id: "ekart",
    name: "Ekart",
    type: "courier",
    status: "beta",
    fileHint: /ekart/i,
    headerHints: ["ekart tracking id"],
    bankHint: /ekart|instakart/i,
    columns: {
      courier_shipments: { awb: ["tracking id", "tracking number", "ekart tracking id"], orderId: ["order id", "merchant reference id", "client reference"] },
      courier_cod: { awb: ["tracking id", "tracking number"] },
      courier_weight: { awb: ["tracking id", "tracking number"] },
    },
    reports: COURIER_REPORTS("Ekart"),
    contact: "Ekart seller support (panel → Help, or your account manager)",
    rateHelp: "Your Ekart rate card or agreement.",
    exampleCourier: cr([30, 37, 44, 52, 65], 1.5, 30, 7),
  },
  {
    id: "bluedart",
    name: "Blue Dart",
    type: "courier",
    status: "beta",
    fileHint: /blue ?dart|bluedart/i,
    headerHints: ["awb no"],
    bankHint: /blue ?dart/i,
    columns: {},
    reports: COURIER_REPORTS("Blue Dart"),
    contact: "Blue Dart customer service or your account manager",
    rateHelp: "Your Blue Dart rate card or agreement.",
    exampleCourier: cr([45, 55, 68, 80, 95], 2, 40, 7),
  },
  {
    id: "xpressbees",
    name: "Xpressbees",
    type: "courier",
    status: "beta",
    fileHint: /xpressbees|xbees/i,
    headerHints: ["xb awb"],
    bankHint: /xpressbees|busybees/i,
    columns: {},
    reports: COURIER_REPORTS("Xpressbees"),
    contact: "Xpressbees support (panel → Help, or your account manager)",
    rateHelp: "Your Xpressbees rate card or agreement.",
    exampleCourier: cr([30, 36, 43, 52, 64], 1.5, 30, 7),
  },
  {
    id: "shadowfax",
    name: "Shadowfax",
    type: "courier",
    status: "beta",
    fileHint: /shadowfax|sfx/i,
    headerHints: ["sfx awb"],
    bankHint: /shadowfax/i,
    columns: {},
    reports: COURIER_REPORTS("Shadowfax"),
    contact: "Shadowfax support or your account manager",
    rateHelp: "Your Shadowfax rate card or agreement.",
    exampleCourier: cr([29, 35, 42, 50, 62], 1.5, 30, 7),
  },
  {
    id: "dtdc",
    name: "DTDC",
    type: "courier",
    status: "beta",
    fileHint: /dtdc/i,
    headerHints: ["consignment number", "consignment no", "cn number"],
    bankHint: /dtdc/i,
    columns: {
      courier_shipments: { awb: ["consignment number", "consignment no", "cn number", "cn no"] },
      courier_cod: { awb: ["consignment number", "consignment no", "cn number", "cn no"] },
      courier_weight: { awb: ["consignment number", "consignment no", "cn number", "cn no"] },
    },
    reports: COURIER_REPORTS("DTDC"),
    contact: "DTDC customer support or your account manager",
    rateHelp: "Your DTDC rate card or agreement.",
    exampleCourier: cr([32, 39, 47, 56, 70], 1.75, 35, 7),
  },
  {
    id: "nimbuspost",
    name: "NimbusPost",
    type: "courier",
    aggregator: true,
    status: "beta",
    fileHint: /nimbus/i,
    headerHints: [],
    bankHint: /nimbus/i,
    columns: {},
    reports: COURIER_REPORTS("NimbusPost"),
    contact: "NimbusPost support (panel → Support → raise a ticket)",
    rateHelp: "NimbusPost → Tools → Rate calculator, or your plan's rate card.",
    exampleCourier: cr([33, 40, 48, 57, 70], 1.5, 30, 7),
  },
  {
    id: "ithink",
    name: "iThink Logistics",
    type: "courier",
    aggregator: true,
    status: "beta",
    fileHint: /ithink/i,
    headerHints: [],
    bankHint: /ithink/i,
    columns: {},
    reports: COURIER_REPORTS("iThink Logistics"),
    contact: "iThink Logistics support (panel → Support)",
    rateHelp: "iThink Logistics → Rate calculator, or your plan's rate card.",
    exampleCourier: cr([33, 40, 48, 57, 70], 1.5, 30, 7),
  },
  {
    id: "other_courier",
    name: "Other courier",
    type: "courier",
    status: "beta",
    headerHints: [],
    bankHint: /logistics|courier|express/i,
    columns: {},
    reports: COURIER_REPORTS("Your courier's"),
    contact: "your courier's support team",
    rateHelp: "Your courier's rate card or agreement.",
    exampleCourier: cr([35, 42, 50, 60, 75], 1.75, 35, 7),
  },
];

export const PARTNER_BY_ID: Record<string, PartnerProfile> = Object.fromEntries(PARTNERS.map((p) => [p.id, p]));

export const partnerName = (id: string | null | undefined) => (id ? PARTNER_BY_ID[id]?.name ?? id : "");

export function partnerTypeForKind(kind: FileKind | null): PartnerType | null {
  if (kind === "gateway_settlements") return "gateway";
  if (kind === "courier_shipments" || kind === "courier_cod" || kind === "courier_weight") return "courier";
  return null;
}

/** Partners shown on the website, most common first. "Other" entries are left out. */
export const LISTED = {
  gateways: PARTNERS.filter((p) => p.type === "gateway" && !p.id.startsWith("other")),
  couriers: PARTNERS.filter((p) => p.type === "courier" && !p.id.startsWith("other")),
};

/**
 * Guess who sent a file from its name and header rows. Returns the best partner of the
 * given type, or null when nothing points clearly to one (the founder then picks).
 */
export function guessPartner(fileName: string, table: unknown[][], type?: PartnerType | null): string | null {
  const head = table
    .slice(0, 16)
    .map((r) => (Array.isArray(r) ? r.map((c) => normHeader(String(c ?? ""))).join(" | ") : ""))
    .join(" | ");
  let best: { id: string; score: number } | null = null;
  for (const p of PARTNERS) {
    if (type && p.type !== type) continue;
    let score = 0;
    if (p.fileHint?.test(fileName)) score += 10;
    for (const h of p.headerHints) if (new RegExp(`(^| )${h}( |$)`).test(head)) score += 3;
    if (score > 0 && (!best || score > best.score)) best = { id: p.id, score };
  }
  return best?.id ?? null;
}

/** Which gateway Shopify says an order was paid through. */
export function gatewayFromShopify(paymentMethod: string): string | null {
  for (const p of PARTNERS) if (p.type === "gateway" && p.shopifyHint?.test(paymentMethod)) return p.id;
  return null;
}

// ───────────── Rate cards ─────────────

export interface RateCard {
  partner: string;
  /** raw text as typed, so a field can be blank while the founder fills it */
  values: Record<string, string>;
  confirmed: boolean;
  /** true when filled from example rates and not yet edited */
  example: boolean;
}

export interface RateField {
  key: string;
  label: string;
  hint: string;
  unit: "%" | "₹" | "days";
}

export const GATEWAY_FIELDS: RateField[] = [
  { key: "standardPct", label: "Cards, net banking and wallets", hint: "Your standard rate", unit: "%" },
  { key: "upiPct", label: "UPI", hint: "Use 0 if UPI is free on your plan", unit: "%" },
  { key: "premiumPct", label: "Amex, Diners and international cards", hint: "Usually higher than standard", unit: "%" },
  { key: "fixedFee", label: "Fixed fee per payment", hint: "Usually 0", unit: "₹" },
  { key: "gstPct", label: "GST on the fee", hint: "Usually 18", unit: "%" },
  { key: "settleDays", label: "Pays you within", hint: "T+2 means 2 days", unit: "days" },
];

export const COURIER_EXTRA_FIELDS: RateField[] = [
  { key: "codPct", label: "COD fee", hint: "Percent of the cash collected", unit: "%" },
  { key: "codMin", label: "Minimum COD fee", hint: "Charged when the percent is lower", unit: "₹" },
  { key: "rtoPct", label: "Return (RTO) charge", hint: "Percent of the forward charge. Often 100", unit: "%" },
  { key: "weightDisputeDays", label: "Days to dispute a weight charge", hint: "Working days from when it's raised", unit: "days" },
  { key: "codPayDays", label: "COD paid within", hint: "Days after delivery", unit: "days" },
];

export const zoneKey = (z: Zone, part: "first" | "extra") => `zone${z}_${part}`;

export function courierFieldKeys(): string[] {
  return [...ZONES.flatMap((z) => [zoneKey(z, "first"), zoneKey(z, "extra")]), ...COURIER_EXTRA_FIELDS.map((f) => f.key)];
}

export function rateFieldKeys(partnerId: string): string[] {
  return PARTNER_BY_ID[partnerId]?.type === "gateway" ? GATEWAY_FIELDS.map((f) => f.key) : courierFieldKeys();
}

const numOk = (s: string | undefined, max = Infinity) => {
  if (s === undefined || s.trim() === "") return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= max;
};

/** Fields still blank or invalid on a rate card. */
export function missingRates(card: RateCard): string[] {
  return rateFieldKeys(card.partner).filter((k) => !numOk(card.values[k], /Pct$/.test(k) && k !== "rtoPct" ? 100 : k === "rtoPct" ? 200 : Infinity));
}

export const isCardComplete = (card: RateCard | undefined) => !!card && missingRates(card).length === 0;
export const isCardReady = (card: RateCard | undefined) => isCardComplete(card) && !!card?.confirmed;

export function emptyCard(partner: string): RateCard {
  return { partner, values: {}, confirmed: false, example: false };
}

export function exampleCard(partner: string): RateCard {
  const p = PARTNER_BY_ID[partner];
  const values: Record<string, string> = {};
  if (p?.type === "gateway" && p.exampleGateway) {
    for (const [k, v] of Object.entries(p.exampleGateway)) values[k] = String(v);
  } else if (p?.exampleCourier) {
    const c = p.exampleCourier;
    for (const z of ZONES) {
      values[zoneKey(z, "first")] = String(c.zones[z].first);
      values[zoneKey(z, "extra")] = String(c.zones[z].extra);
    }
    for (const f of COURIER_EXTRA_FIELDS) values[f.key] = String(c[f.key as keyof CourierRates]);
  }
  return { partner, values, confirmed: false, example: true };
}

/** Turn complete rate cards into the numbers the audit uses. Incomplete cards are skipped. */
export function ratesFromCards(cards: Record<string, RateCard>): { gateway: Record<string, GatewayRates>; courier: Record<string, CourierRates> } {
  const gateway: Record<string, GatewayRates> = {};
  const courier: Record<string, CourierRates> = {};
  for (const card of Object.values(cards)) {
    if (!isCardComplete(card)) continue;
    const v = (k: string) => Number(card.values[k]);
    const p = PARTNER_BY_ID[card.partner];
    if (!p) continue;
    if (p.type === "gateway") {
      gateway[p.id] = { standardPct: v("standardPct"), upiPct: v("upiPct"), premiumPct: v("premiumPct"), fixedFee: v("fixedFee"), gstPct: v("gstPct"), settleDays: v("settleDays") };
    } else {
      courier[p.id] = {
        zones: Object.fromEntries(ZONES.map((z) => [z, { first: v(zoneKey(z, "first")), extra: v(zoneKey(z, "extra")) }])) as CourierRates["zones"],
        codPct: v("codPct"),
        codMin: v("codMin"),
        rtoPct: v("rtoPct"),
        weightDisputeDays: v("weightDisputeDays"),
        codPayDays: v("codPayDays"),
      };
    }
  }
  return { gateway, courier };
}

/** Courier zone names differ: "z_a", "Zone A", "Within City", "Metro to Metro", "Special". */
export function zoneFrom(text: string): Zone | null {
  const t = normHeader(text);
  if (!t) return null;
  const letter = t.match(/^(?:z|zone)? ?([a-e])$/);
  if (letter) return letter[1].toUpperCase() as Zone;
  if (/within city|intra ?city|local|same city/.test(t)) return "A";
  if (/within state|intra ?state|regional|within zone|same state/.test(t)) return "B";
  if (/metro/.test(t)) return "C";
  if (/rest of india|roi|national|inter ?state/.test(t)) return "D";
  if (/special|north ?east|\bne\b|j ?k|jammu|kashmir|island|remote/.test(t)) return "E";
  return null;
}
