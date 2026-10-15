/**
 * Payment methods ("instruments") and how a gateway prices each one.
 *
 * Indian gateways don't charge one rate. UPI, debit cards (split at ₹2,000), RuPay debit,
 * credit cards by network, Amex, Diners, international cards, net banking, wallets and EMI
 * usually each have their own rate, sometimes with a fixed rupee fee on top.
 *
 * When a file doesn't say enough to tell which rate applies (for example a card payment with
 * no credit/debit column), the payment is checked against the HIGHEST rate it could be on.
 * That way ReconOS never claims money that might not be owed.
 */

export const DEBIT_SLAB = 2000;

export const INSTRUMENTS = [
  { key: "upi", label: "UPI", group: "UPI", hint: "Use 0 if UPI is free on your plan" },
  { key: "debitLow", label: `Debit card, ₹${DEBIT_SLAB.toLocaleString("en-IN")} or less`, group: "Debit cards", hint: "Visa, Mastercard and others" },
  { key: "debitHigh", label: `Debit card, above ₹${DEBIT_SLAB.toLocaleString("en-IN")}`, group: "Debit cards", hint: "Visa, Mastercard and others" },
  { key: "debitRupay", label: "RuPay debit card", group: "Debit cards", hint: "Often 0" },
  { key: "creditVisa", label: "Visa credit card", group: "Credit cards", hint: "" },
  { key: "creditMastercard", label: "Mastercard credit card", group: "Credit cards", hint: "" },
  { key: "creditRupay", label: "RuPay credit card", group: "Credit cards", hint: "" },
  { key: "amex", label: "Amex", group: "Premium and international", hint: "" },
  { key: "diners", label: "Diners", group: "Premium and international", hint: "" },
  { key: "international", label: "International cards", group: "Premium and international", hint: "" },
  { key: "netbanking", label: "Net banking", group: "Other methods", hint: "" },
  { key: "wallet", label: "Wallets", group: "Other methods", hint: "Paytm, Amazon Pay, Mobikwik and others" },
  { key: "emi", label: "EMI and pay later", group: "Other methods", hint: "" },
] as const;

export type Instrument = (typeof INSTRUMENTS)[number]["key"];
export const INSTRUMENT_LABEL = Object.fromEntries(INSTRUMENTS.map((i) => [i.key, i.label])) as Record<Instrument, string>;

const DOMESTIC: Instrument[] = ["upi", "debitLow", "debitHigh", "debitRupay", "creditVisa", "creditMastercard", "creditRupay", "netbanking", "wallet", "emi"];

export interface GatewayRates {
  /** percent of the payment, per method */
  pct: Record<Instrument, number>;
  /** rupees per payment on top of the percent, per method (usually 0) */
  fixed: Record<Instrument, number>;
  gstPct: number;
  settleDays: number; // settles within this many days of payment
}

/** Build rates from a short list; anything not given falls back to the "card" rate. */
export function gatewayRates(r: Partial<Record<Instrument, number>> & { card: number }, gstPct = 18, settleDays = 2): GatewayRates {
  const pct = Object.fromEntries(INSTRUMENTS.map((i) => [i.key, r[i.key] ?? r.card])) as Record<Instrument, number>;
  const fixed = Object.fromEntries(INSTRUMENTS.map((i) => [i.key, 0])) as Record<Instrument, number>;
  return { pct, fixed, gstPct, settleDays };
}

/** Payment methods a file can be limited to, for gateways that export one file per method. */
export const FILE_METHODS = [
  { key: "", label: "A mix (or shown in the file)" },
  { key: "upi", label: "Only UPI" },
  { key: "card", label: "Only cards" },
  { key: "netbanking", label: "Only net banking" },
  { key: "wallet", label: "Only wallets" },
  { key: "emi", label: "Only EMI and pay later" },
] as const;

export function methodFromFileName(name: string): string {
  const n = name.toLowerCase().replace(/[_\-.]+/g, " ");
  if (/\bupi\b/.test(n)) return "upi";
  if (/net ?banking|\bnb\b/.test(n)) return "netbanking";
  if (/\bcards?\b|credit|debit/.test(n)) return "card";
  if (/wallet/.test(n)) return "wallet";
  if (/\bemi\b|pay ?later/.test(n)) return "emi";
  return "";
}

export function networkFrom(text: string): "visa" | "mastercard" | "rupay" | "amex" | "diners" | "" {
  const t = text.toLowerCase();
  if (/amex|american/.test(t)) return "amex";
  if (/diners/.test(t)) return "diners";
  if (/rupay/.test(t)) return "rupay";
  if (/master|\bmast\b|\bmc\b|maestro/.test(t)) return "mastercard";
  if (/visa/.test(t)) return "visa";
  return "";
}

export function cardTypeFrom(text: string): "credit" | "debit" | "" {
  const t = text.toLowerCase().replace(/[_-]+/g, " ");
  if (/debit|^dc$|prepaid/.test(t)) return "debit";
  if (/credit|^cc$/.test(t)) return "credit";
  return "";
}

export interface PaymentShape {
  method: string;
  cardType: string;
  cardNetwork: string;
  international: boolean;
  amount: number;
}

/** Which rates could apply to a payment. One candidate means we know exactly. */
export function instrumentsFor(p: PaymentShape): Instrument[] {
  const m = p.method.toLowerCase().replace(/[_-]+/g, " ").trim();
  const net = networkFrom(`${p.cardNetwork} ${m}`);
  const type = cardTypeFrom(p.cardType) || cardTypeFrom(m);
  const debit: Instrument = p.amount <= DEBIT_SLAB ? "debitLow" : "debitHigh";
  if (p.international) return ["international"];
  if (net === "amex") return ["amex"];
  if (net === "diners") return ["diners"];
  if (/upi/.test(m)) return ["upi"];
  if (/net ?bank|^nb$/.test(m)) return ["netbanking"];
  if (/wallet|mobikwik|amazon ?pay|freecharge|airtel money|jio ?money/.test(m)) return ["wallet"];
  if (/emi|pay ?later|bnpl|cardless|lazypay|simpl/.test(m)) return ["emi"];
  const isCard = /card|^cc$|^dc$|credit|debit|prepaid/.test(m) || !!net || !!type;
  if (isCard) {
    if (type === "debit") return [net === "rupay" ? "debitRupay" : debit];
    const credit: Instrument[] = net === "visa" ? ["creditVisa"] : net === "mastercard" ? ["creditMastercard"] : net === "rupay" ? ["creditRupay"] : ["creditVisa", "creditMastercard", "creditRupay"];
    if (type === "credit") return credit;
    return [...(net === "rupay" ? ["debitRupay" as Instrument] : net ? [debit] : [debit, "debitRupay" as Instrument]), ...credit];
  }
  return DOMESTIC;
}

/** How a payment is described in findings and the fee check. */
export function instrumentLabel(p: PaymentShape, candidates = instrumentsFor(p)): string {
  if (candidates.length === 1) return INSTRUMENT_LABEL[candidates[0]];
  if (candidates.every((c) => c.startsWith("credit"))) return "Credit card, network not in the file";
  if (candidates.some((c) => c.startsWith("debit")) && candidates.some((c) => c.startsWith("credit"))) return "Card, credit or debit not in the file";
  return "Method not in the file";
}

/**
 * The fee a payment should carry. When more than one rate could apply, the highest is used,
 * so a fee is only flagged if it's above every rate it could fairly be on.
 */
export function expectedFee(p: PaymentShape, rates: GatewayRates): { fee: number; pct: number; fixed: number; instrument: Instrument; label: string; exact: boolean } {
  const candidates = instrumentsFor(p);
  let best = { fee: -1, instrument: candidates[0] };
  for (const c of candidates) {
    const fee = Math.round(((p.amount * rates.pct[c]) / 100 + rates.fixed[c]) * 100) / 100;
    if (fee > best.fee) best = { fee, instrument: c };
  }
  return { fee: best.fee, pct: rates.pct[best.instrument], fixed: rates.fixed[best.instrument], instrument: best.instrument, label: instrumentLabel(p, candidates), exact: candidates.length === 1 };
}
