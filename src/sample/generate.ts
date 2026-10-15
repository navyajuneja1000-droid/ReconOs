/**
 * Builds a realistic month of data for a fictional D2C brand ("Indigo Loom"), in the shapes of
 * Shopify, Shiprocket, Razorpay and bank exports, with a known set of planted leaks.
 * Used for the "Try with sample data" demo and for tests that prove every leak is found
 * and nothing else is flagged.
 */
import type { FileKind, Table } from "../engine/types";

export interface Planted {
  id: string;
  kind: "claim" | "check";
  amount: number;
  note: string;
}

export interface SampleData {
  asOf: Date;
  files: { name: string; kind: FileKind; table: Table }[];
  planted: Planted[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const ymdHms = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
const dmy = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
const dmyShort = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dMonY = (d: Date) => `${pad(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const dayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const CATALOG = [
  { sku: "IL-KUR-01", name: "Block print cotton kurta", price: 1299, kg: 0.35 },
  { sku: "IL-KUR-02", name: "Indigo dabu kurta", price: 1499, kg: 0.38 },
  { sku: "IL-DUP-01", name: "Bagru print dupatta", price: 799, kg: 0.2 },
  { sku: "IL-SET-01", name: "Unstitched suit set", price: 2199, kg: 0.75 },
  { sku: "IL-TOT-01", name: "Quilted tote bag", price: 899, kg: 0.4 },
  { sku: "IL-POU-03", name: "3-piece pouch set", price: 649, kg: 0.25 },
  { sku: "IL-COP-01", name: "Copper water bottle", price: 1099, kg: 0.55 },
  { sku: "IL-JWL-01", name: "Meenakari earrings", price: 499, kg: 0.08 },
  { sku: "IL-CRD-01", name: "Cotton co-ord set", price: 1899, kg: 0.6 },
  { sku: "IL-STL-01", name: "Hand block stole", price: 699, kg: 0.18 },
];
const COURIERS = ["Delhivery Surface", "Xpressbees", "Ekart Logistics", "Blue Dart", "Shadowfax"];
const ZONE_RATE: Record<string, number> = { A: 34, B: 41, C: 49, D: 58, E: 72 };
const CITIES = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Lucknow", "Patna", "Indore", "Kolkata", "Jaipur", "Delhi", "Surat", "Kochi"];

interface GenOrder {
  num: number;
  created: Date;
  items: { sku: string; name: string; price: number; qty: number; kg: number }[];
  total: number;
  cod: boolean;
  cancelled: boolean;
  refunded: number;
  payId?: string;
  method?: string;
  network?: string;
  city: string;
}

interface GenShip {
  order: GenOrder;
  awb: string;
  courier: string;
  zone: string;
  slabs: number;
  freight: number;
  codFee: number;
  rtoCharge: number;
  status: "Delivered" | "RTO Delivered" | "In Transit";
  delivered: Date | null;
  dupRow: boolean;
}

export function generateSample(seed = 20260914): SampleData {
  const rand = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
  const alnum = (n: number) => Array.from({ length: n }, () => "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(rand() * 62)]).join("");

  const asOf = new Date(Date.UTC(2026, 9, 10, 18, 0, 0)); // 10 Oct 2026
  const start = Date.UTC(2026, 8, 1); // 1 Sep 2026
  const lastOrderDay = Date.UTC(2026, 9, 8); // 8 Oct 2026
  const planted: Planted[] = [];

  // ───── Orders ─────
  const orders: GenOrder[] = [];
  const N = 380;
  for (let i = 0; i < N; i++) {
    const created = new Date(start + Math.floor(rand() * (lastOrderDay - start + DAY)) + between(8, 22) * 3600_000 + between(0, 59) * 60_000);
    const nItems = rand() < 0.75 ? 1 : 2;
    const items = Array.from({ length: nItems }, () => {
      const p = pick(CATALOG);
      return { ...p, qty: rand() < 0.9 ? 1 : 2 };
    });
    const total = items.reduce((a, it) => a + it.price * it.qty, 0);
    const cod = rand() < 0.55;
    orders.push({ num: 0, created, items, total, cod, cancelled: false, refunded: 0, city: pick(CITIES) });
  }
  orders.sort((a, b) => a.created.getTime() - b.created.getTime());
  orders.forEach((o, i) => (o.num = 10001 + i));

  // a few cancelled COD orders, never shipped
  for (const o of orders.filter((o) => o.cod).slice(5, 9)) o.cancelled = true;

  // two prepaid orders on 9 Oct, captured but not yet settled (inside the grace period: must not be flagged)
  for (let k = 0; k < 2; k++) {
    const created = new Date(Date.UTC(2026, 9, 9, 11 + k, 15));
    const it = { ...CATALOG[k], qty: 1 };
    orders.push({ num: 10001 + orders.length, created, items: [it], total: it.price, cod: false, cancelled: false, refunded: 0, city: pick(CITIES) });
  }

  // prepaid payment details
  for (const o of orders) {
    if (o.cod) continue;
    o.payId = `pay_${alnum(14)}`;
    const r = rand();
    o.method = r < 0.6 ? "upi" : r < 0.9 ? "card" : "netbanking";
    if (o.method === "card") o.network = rand() < 0.12 ? "amex" : pick(["visa", "mastercard", "rupay"]);
  }

  // refunds on a few prepaid orders (partial), matching in both systems
  const prepaidOld = orders.filter((o) => !o.cod && !o.cancelled && o.created.getTime() < Date.UTC(2026, 8, 25));
  for (const o of prepaidOld.slice(3, 9)) o.refunded = Math.min(o.total, pick([200, 300, 450]));

  // ───── Shipments ─────
  const ships: GenShip[] = [];
  for (const o of orders) {
    if (o.cancelled || o.created.getTime() > Date.UTC(2026, 9, 9)) continue;
    const kg = o.items.reduce((a, it) => a + it.kg * it.qty, 0) + 0.1;
    const slabs = Math.ceil(kg / 0.5);
    const zone = pick(Object.keys(ZONE_RATE));
    const freight = ZONE_RATE[zone] * slabs;
    const codFee = o.cod ? r2(Math.max(30, o.total * 0.015)) : 0;
    const rto = rand() < (o.cod ? 0.2 : 0.03);
    const delivered = new Date(o.created.getTime() + between(2, 5) * DAY + between(1, 8) * 3600_000);
    let status: GenShip["status"] = rto ? "RTO Delivered" : "Delivered";
    if (delivered > asOf) status = "In Transit";
    ships.push({
      order: o,
      awb: `1${digits(13)}`,
      courier: pick(COURIERS),
      zone,
      slabs,
      freight,
      codFee,
      rtoCharge: status === "RTO Delivered" ? freight : 0,
      status,
      delivered: status === "Delivered" ? delivered : null,
      dupRow: false,
    });
  }

  const deliveredCod = ships.filter((s) => s.status === "Delivered" && s.order.cod);
  const deliveredPrepaid = ships.filter((s) => s.status === "Delivered" && !s.order.cod);
  const inRange = (d: Date | null, a: number, b: number) => !!d && d.getTime() >= Date.UTC(2026, 8, a) && d.getTime() < Date.UTC(2026, 8, b);

  // L4 duplicate forward charge (prepaid, delivered)
  for (const s of deliveredPrepaid.filter((s) => inRange(s.delivered, 8, 24)).slice(0, 2)) {
    s.dupRow = true;
    planted.push({ id: `dup:${s.awb}|forward`, kind: "claim", amount: s.freight, note: "shipping billed twice" });
  }
  // L5 COD fee on prepaid
  for (const s of deliveredPrepaid.filter((s) => inRange(s.delivered, 5, 28) && !s.dupRow).slice(2, 5)) {
    s.codFee = r2(Math.max(30, s.order.total * 0.015));
    planted.push({ id: `codfee_prepaid:${s.awb}`, kind: "claim", amount: s.codFee, note: "COD fee on prepaid" });
  }
  // L6 RTO charge on delivered
  for (const s of deliveredCod.filter((s) => inRange(s.delivered, 6, 26)).slice(10, 12)) {
    s.rtoCharge = s.freight;
    planted.push({ id: `rto_delivered:${s.awb}`, kind: "claim", amount: s.freight, note: "RTO charge on delivered" });
  }

  // ───── COD remittance ─────
  interface Rem { ship: GenShip; remitted: number; date: Date; crf: string; utr: string }
  const rems: Rem[] = [];
  const unpaid = new Set(deliveredCod.filter((s) => inRange(s.delivered, 5, 26)).slice(0, 4).map((s) => s.awb));
  const shorts = new Map(deliveredCod.filter((s) => inRange(s.delivered, 5, 26)).slice(4, 7).map((s, i) => [s.awb, [50, 120, 300][i]]));
  const batchKey = new Map<string, { crf: string; utr: string }>();
  for (const s of deliveredCod) {
    let d = dayStart(new Date(s.delivered!.getTime() + 7 * DAY));
    while (![2, 5].includes(d.getUTCDay())) d = new Date(d.getTime() + DAY);
    if (d > asOf) continue; // not yet due
    if (unpaid.has(s.awb)) {
      planted.push({ id: `cod_unpaid:${s.awb}`, kind: "claim", amount: s.order.total, note: "COD never paid" });
      continue;
    }
    const short = shorts.get(s.awb) ?? 0;
    if (short) planted.push({ id: `cod_short:${s.awb}`, kind: "claim", amount: short, note: "COD paid short" });
    const key = d.toISOString().slice(0, 10);
    if (!batchKey.has(key)) batchKey.set(key, { crf: `CRF${digits(6)}`, utr: `ICIC${digits(12)}` });
    const b = batchKey.get(key)!;
    rems.push({ ship: s, remitted: s.order.total - short, date: new Date(d.getTime() + 15 * 3600_000), crf: b.crf, utr: b.utr });
  }

  // ───── Razorpay ─────
  interface Pay { order: GenOrder; id: string; amount: number; fee: number; tax: number; created: Date; settled: Date | null; method: string; network: string }
  const pays: Pay[] = [];
  const feeOver = new Set<string>();
  const gstOver = new Set<string>();
  const domestic = orders.filter((o) => !o.cod && !o.cancelled && o.method !== "card" && o.created.getTime() < Date.UTC(2026, 8, 28));
  domestic.slice(4, 8).forEach((o) => feeOver.add(o.payId!));
  domestic.slice(12, 14).forEach((o) => gstOver.add(o.payId!));
  const missingPay = new Set(domestic.filter((o) => o.created.getTime() > Date.UTC(2026, 8, 10)).slice(20, 22).map((o) => o.payId!));

  for (const o of orders) {
    if (o.cod || o.cancelled || !o.payId) continue;
    if (missingPay.has(o.payId)) {
      planted.push({ id: `gw_missing:${o.num}`, kind: "check", amount: o.total, note: "paid order missing from settlements" });
      continue;
    }
    const premium = o.network === "amex";
    let fee = r2(o.total * (premium ? 0.03 : 0.02));
    if (feeOver.has(o.payId)) {
      const correct = fee;
      fee = r2(o.total * 0.03);
      planted.push({ id: `fee:${o.payId}`, kind: "claim", amount: r2((fee - correct) * 1.18), note: "fee above plan" });
    }
    let tax = r2(fee * 0.18);
    if (gstOver.has(o.payId)) {
      tax = r2(fee * 0.28);
      planted.push({ id: `gst:${o.payId}`, kind: "claim", amount: r2(tax - r2(fee * 0.18)), note: "GST charged wrongly" });
    }
    const settledAt = new Date(dayStart(o.created).getTime() + 2 * DAY + 11 * 3600_000);
    pays.push({ order: o, id: o.payId, amount: o.total, fee, tax, created: o.created, settled: settledAt <= asOf ? settledAt : null, method: o.method!, network: o.network ?? "" });
  }

  // refunds: matching ones plus one over-refund
  interface Refund { id: string; pay: Pay; amount: number; created: Date; settled: Date }
  const refunds: Refund[] = [];
  const refundOrders = pays.filter((p) => p.order.refunded > 0);
  for (const p of refundOrders) {
    const created = new Date(p.created.getTime() + 5 * DAY);
    refunds.push({ id: `rfnd_${alnum(14)}`, pay: p, amount: p.order.refunded, created, settled: new Date(dayStart(created).getTime() + DAY + 11 * 3600_000) });
  }
  const over = pays.find((p) => p.order.refunded === 0 && p.created.getTime() < Date.UTC(2026, 8, 20) && p.created.getTime() > Date.UTC(2026, 8, 12))!;
  over.order.refunded = 200;
  {
    const created = new Date(over.created.getTime() + 4 * DAY);
    refunds.push({ id: `rfnd_${alnum(14)}`, pay: over, amount: 500, created, settled: new Date(dayStart(created).getTime() + DAY + 11 * 3600_000) });
    planted.push({ id: `refund_over:${over.order.num}`, kind: "check", amount: 300, note: "refunded more than approved" });
  }

  // settlement batches by settlement day
  const setl = new Map<string, { id: string; utr: string; date: Date; net: number }>();
  const batchFor = (d: Date) => {
    const key = d.toISOString().slice(0, 10);
    if (!setl.has(key)) setl.set(key, { id: `setl_${alnum(14)}`, utr: `UTIB${digits(12)}`, date: d, net: 0 });
    return setl.get(key)!;
  };
  for (const p of pays) if (p.settled) batchFor(p.settled).net += p.amount - p.fee - p.tax;
  for (const rf of refunds) if (rf.settled <= asOf) batchFor(rf.settled).net -= rf.amount;

  // ───── Bank statement ─────
  interface BankRow { date: Date; narration: string; ref: string; wd: number; dep: number }
  const bank: BankRow[] = [];
  const setlList = [...setl.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  const missingSetl = setlList.find((b) => b.date.getTime() > Date.UTC(2026, 8, 14) && b.net > 1500)!;
  planted.push({ id: `gateway_payout_missing:${missingSetl.utr}`, kind: "claim", amount: r2(missingSetl.net), note: "settlement not in bank" });
  for (const b of setlList) {
    if (b === missingSetl) continue;
    bank.push({ date: b.date, narration: `NEFT CR-UTIB0000100-RAZORPAY SOFTWARE PRIVATE LIMITED-INDIGO LOOM-${b.utr}`, ref: b.utr, wd: 0, dep: r2(b.net) });
  }
  const remBatches = new Map<string, { utr: string; crf: string; date: Date; total: number }>();
  for (const r of rems) {
    const b = remBatches.get(r.utr) ?? { utr: r.utr, crf: r.crf, date: r.date, total: 0 };
    b.total += r.remitted;
    remBatches.set(r.utr, b);
  }
  const remList = [...remBatches.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  const missingRem = remList.find((b) => b.date.getTime() > Date.UTC(2026, 8, 12))!;
  planted.push({ id: `courier_payout_missing:${missingRem.utr}`, kind: "claim", amount: r2(missingRem.total), note: "courier payout not in bank" });
  for (const b of remList) {
    if (b === missingRem) continue;
    bank.push({ date: b.date, narration: `NEFT CR-ICIC0000104-SHIPROCKET LIMITED-${b.utr}`, ref: b.utr, wd: 0, dep: r2(b.total) });
  }
  // everyday noise
  for (let d = start; d <= asOf.getTime(); d += DAY) {
    const day = new Date(d + 10 * 3600_000);
    if (rand() < 0.35) bank.push({ date: day, narration: `UPI-SHIPROCKET-WALLET RECHARGE-${digits(12)}`, ref: digits(12), wd: pick([2000, 3000, 5000]), dep: 0 });
    if (rand() < 0.4) bank.push({ date: day, narration: `POS FACEBOOK *ADS ${digits(10)}`, ref: "", wd: between(800, 4500), dep: 0 });
    if (new Date(d).getUTCDate() === 1) bank.push({ date: day, narration: "NEFT DR-RENT JAIPUR WORKSHOP", ref: digits(10), wd: 18000, dep: 0 });
    if (rand() < 0.08) bank.push({ date: day, narration: `IMPS-${digits(12)}-B2B GIFTING ORDER`, ref: digits(12), wd: 0, dep: between(5000, 18000) + 0.5 });
  }
  bank.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ───── Weight discrepancies ─────
  interface W { ship: GenShip; raised: Date; charged: number; extra: number; status: string }
  const ws: W[] = [];
  const shipped = ships.filter((s) => s.status !== "In Transit");
  const oldPool = shipped.filter((s) => s.order.created.getTime() < Date.UTC(2026, 8, 22));
  const statuses = ["Auto Accepted", "Dispute Accepted", "Accepted", "Dispute Raised", "Dispute Rejected"];
  oldPool.slice(0, 18).forEach((s, i) => {
    const extraSlabs = 1 + (i % 2);
    ws.push({ ship: s, raised: new Date(s.order.created.getTime() + 3 * DAY), charged: (s.slabs + extraSlabs) * 0.5, extra: ZONE_RATE[s.zone] * extraSlabs, status: statuses[i % statuses.length] });
  });
  // L7 open and still disputable (raised in the last few days)
  const recent = shipped.filter((s) => s.order.created.getTime() >= Date.UTC(2026, 9, 1) && s.order.created.getTime() < Date.UTC(2026, 9, 6));
  recent.slice(0, 3).forEach((s, i) => {
    const raised = new Date(Date.UTC(2026, 9, 6 + i, 12));
    const extra = ZONE_RATE[s.zone];
    ws.push({ ship: s, raised, charged: (s.slabs + 1) * 0.5, extra, status: "New Discrepancy" });
    planted.push({ id: `weight:${s.awb}`, kind: "check", amount: extra, note: "weight charge still disputable" });
  });
  // open but window already closed: should show as lost, not as a finding
  oldPool.slice(18, 20).forEach((s) => {
    ws.push({ ship: s, raised: new Date(s.order.created.getTime() + 3 * DAY), charged: (s.slabs + 1) * 0.5, extra: ZONE_RATE[s.zone], status: "New Discrepancy" });
  });

  // ───── Tables ─────
  const shopifyHead = ["Name", "Email", "Financial Status", "Paid at", "Fulfillment Status", "Currency", "Subtotal", "Shipping", "Taxes", "Total", "Discount Amount", "Created at", "Lineitem quantity", "Lineitem name", "Lineitem price", "Lineitem sku", "Cancelled at", "Payment Method", "Payment Reference", "Refunded Amount", "Id", "Shipping City"];
  const shopify: Table = [shopifyHead];
  for (const o of orders) {
    const fin = o.cod ? (o.cancelled ? "voided" : "pending") : o.refunded > 0 ? "partially_refunded" : "paid";
    const shipped = ships.find((s) => s.order === o);
    o.items.forEach((it, idx) => {
      const first = idx === 0;
      shopify.push([
        `#${o.num}`,
        first ? `customer${o.num}@example.com` : "",
        first ? fin : "",
        first && !o.cod ? `${ymdHms(o.created)} +0530` : "",
        first ? (shipped ? "fulfilled" : "unfulfilled") : "",
        first ? "INR" : "",
        first ? o.total.toFixed(2) : "",
        first ? "0.00" : "",
        first ? r2(o.total - o.total / 1.05).toFixed(2) : "",
        first ? o.total.toFixed(2) : "",
        first ? "0.00" : "",
        `${ymdHms(o.created)} +0530`,
        it.qty,
        it.name,
        it.price.toFixed(2),
        it.sku,
        first && o.cancelled ? `${ymdHms(new Date(o.created.getTime() + 3600_000))} +0530` : "",
        first ? (o.cod ? "Cash on Delivery (COD)" : "Razorpay Secure (UPI, Cards, Wallets, NetBanking)") : "",
        first && !o.cod ? o.payId : "",
        first ? o.refunded.toFixed(2) : "",
        first ? String(5000000000 + o.num) : "",
        first ? o.city : "",
      ]);
    });
  }

  const shipHead = ["Order ID", "AWB Code", "Courier Name", "Payment Method", "Status", "Order Date", "Delivered Date", "COD Amount", "Charged Weight (KG)", "Zone", "Freight Charges", "COD Charges", "RTO Charges", "Total Charges"];
  const shipTable: Table = [shipHead];
  for (const s of ships) {
    const row = [String(s.order.num), s.awb, s.courier, s.order.cod ? "COD" : "Prepaid", s.status, dMonY(s.order.created), s.delivered ? dMonY(s.delivered) : "", s.order.cod ? s.order.total.toFixed(2) : "0.00", (s.slabs * 0.5).toFixed(2), s.zone, s.freight.toFixed(2), s.codFee.toFixed(2), s.rtoCharge.toFixed(2), r2(s.freight + s.codFee + s.rtoCharge).toFixed(2)];
    shipTable.push(row);
    if (s.dupRow) shipTable.push([...row]);
  }

  const codHead = ["CRF ID", "Remittance Date", "UTR", "Order ID", "AWB Code", "Courier Name", "COD Amount", "Remitted Amount", "Delivered Date"];
  const codTable: Table = [codHead];
  for (const r of rems.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    codTable.push([r.crf, dmy(r.date), r.utr, String(r.ship.order.num), r.ship.awb, r.ship.courier, r.ship.order.total.toFixed(2), r.remitted.toFixed(2), dmy(r.ship.delivered!)]);
  }

  const weightHead = ["Order ID", "AWB Code", "Courier Name", "Discrepancy Date", "Entered Weight (KG)", "Charged Weight (KG)", "Excess Charges", "Status"];
  const weightTable: Table = [weightHead];
  for (const w of ws) weightTable.push([String(w.ship.order.num), w.ship.awb, w.ship.courier, dMonY(w.raised), (w.ship.slabs * 0.5).toFixed(2), w.charged.toFixed(2), w.extra.toFixed(2), w.status]);

  const rzpHead = ["entity_id", "type", "debit", "credit", "amount", "currency", "fee", "tax", "on_hold", "settled", "created_at", "settled_at", "settlement_id", "settlement_utr", "payment_id", "order_receipt", "method", "card_network"];
  const rzp: Table = [rzpHead];
  for (const p of pays) {
    const b = p.settled ? setl.get(p.settled.toISOString().slice(0, 10))! : null;
    rzp.push([p.id, "payment", "0", r2(p.amount - p.fee - p.tax).toFixed(2), p.amount.toFixed(2), "INR", p.fee.toFixed(2), p.tax.toFixed(2), "0", p.settled ? "1" : "0", `${dmy(p.created)} ${pad(p.created.getUTCHours())}:${pad(p.created.getUTCMinutes())}:00`, p.settled ? `${dmy(p.settled)} 11:00:00` : "", b?.id ?? "", b?.utr ?? "", "", String(p.order.num), p.method, p.network]);
  }
  for (const rf of refunds) {
    const b = rf.settled <= asOf ? setl.get(rf.settled.toISOString().slice(0, 10))! : null;
    rzp.push([rf.id, "refund", rf.amount.toFixed(2), "0", rf.amount.toFixed(2), "INR", "0.00", "0.00", "0", b ? "1" : "0", `${dmy(rf.created)} 12:00:00`, b ? `${dmy(rf.settled)} 11:00:00` : "", b?.id ?? "", b?.utr ?? "", rf.pay.id, String(rf.pay.order.num), "", ""]);
  }

  const bankTable: Table = [["HDFC BANK Ltd.  Statement of account"], ["Account: INDIGO LOOM  A/C No: XXXXXXXX4821"], [], ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]];
  let bal = 85000;
  for (const b of bank) {
    bal = r2(bal - b.wd + b.dep);
    bankTable.push([dmyShort(b.date), b.narration, b.ref, dmyShort(b.date), b.wd ? b.wd.toFixed(2) : "", b.dep ? b.dep.toFixed(2) : "", bal.toFixed(2)]);
  }

  return {
    asOf,
    planted,
    files: [
      { name: "orders_export.csv", kind: "shopify_orders", table: shopify },
      { name: "shiprocket_shipments.csv", kind: "courier_shipments", table: shipTable },
      { name: "shiprocket_cod_remittance.csv", kind: "courier_cod", table: codTable },
      { name: "shiprocket_weight_discrepancy.csv", kind: "courier_weight", table: weightTable },
      { name: "razorpay_settlement_recon.csv", kind: "gateway_settlements", table: rzp },
      { name: "hdfc_statement.csv", kind: "bank", table: bankTable },
    ],
  };
}

export function toCsv(table: Table): string {
  return table
    .map((row) =>
      row
        .map((c) => {
          const s = c === null || c === undefined ? "" : String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
