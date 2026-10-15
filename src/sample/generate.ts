/**
 * Builds a realistic month of data for a fictional D2C brand ("Indigo Loom") that uses two
 * payment gateways (Razorpay and PayU) and two shipping partners (Shiprocket, which books
 * several couriers, and Delhivery direct). Files are in the shapes of each partner's export,
 * with a known set of planted leaks spread across the partners.
 * Used for the sample dashboard and for tests that prove every leak is found and nothing
 * else is flagged.
 */
import type { FileKind, Table } from "../engine/types";
import { ZONES, zoneKey, type RateCard, type Zone } from "../engine/partners";

export interface Planted {
  id: string;
  kind: "claim" | "check";
  amount: number;
  partner: string;
  note: string;
}

export interface SampleData {
  asOf: Date;
  files: { name: string; kind: FileKind; partner: string | null; table: Table }[];
  planted: Planted[];
  /** the brand's confirmed rate cards, one per partner */
  cards: Record<string, RateCard>;
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
const SR_COURIERS = ["Delhivery Surface", "Xpressbees", "Ekart Logistics", "Blue Dart", "Shadowfax"];
const CITIES = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Lucknow", "Patna", "Indore", "Kolkata", "Jaipur", "Delhi", "Surat", "Kochi"];

/** The brand's agreed rates. Shiprocket and Delhivery price each extra 500 g the same as the first. */
const COURIER = {
  shiprocket: { zone: { A: 34, B: 41, C: 49, D: 58, E: 72 } as Record<Zone, number>, codPct: 1.5, codMin: 30, codDays: [2, 5] },
  delhivery: { zone: { A: 32, B: 38, C: 45, D: 55, E: 68 } as Record<Zone, number>, codPct: 1.75, codMin: 35, codDays: [3, 6] },
} as const;
type CourierId = keyof typeof COURIER;
const GATEWAY = {
  razorpay: { std: 2, premium: 3, settleAfter: 2, settleHour: 11 },
  payu: { std: 1.95, premium: 3, settleAfter: 1, settleHour: 10 },
} as const;
type GatewayId = keyof typeof GATEWAY;

export function sampleCards(): Record<string, RateCard> {
  const card = (partner: string, values: Record<string, number>): RateCard => ({
    partner,
    values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])),
    confirmed: true,
    example: false,
  });
  const courier = (id: CourierId) => {
    const c = COURIER[id];
    const v: Record<string, number> = { codPct: c.codPct, codMin: c.codMin, rtoPct: 100, weightDisputeDays: 7, codPayDays: 10 };
    for (const z of ZONES) {
      v[zoneKey(z, "first")] = c.zone[z];
      v[zoneKey(z, "extra")] = c.zone[z];
    }
    return card(id, v);
  };
  return {
    razorpay: card("razorpay", { standardPct: 2, upiPct: 2, premiumPct: 3, fixedFee: 0, gstPct: 18, settleDays: 2 }),
    payu: card("payu", { standardPct: 1.95, upiPct: 1.95, premiumPct: 3, fixedFee: 0, gstPct: 18, settleDays: 2 }),
    shiprocket: courier("shiprocket"),
    delhivery: courier("delhivery"),
  };
}

interface GenOrder {
  num: number;
  created: Date;
  items: { sku: string; name: string; price: number; qty: number; kg: number }[];
  total: number;
  cod: boolean;
  cancelled: boolean;
  refunded: number;
  gateway?: GatewayId;
  payId?: string;
  method?: string;
  network?: string;
  city: string;
}

interface GenShip {
  order: GenOrder;
  partner: CourierId;
  awb: string;
  courier: string;
  zone: Zone;
  slabs: number;
  freight: number;
  codFee: number;
  rtoCharge: number;
  status: "Delivered" | "RTO Delivered" | "In Transit";
  delivered: Date | null;
  dupRow: boolean;
  touched: boolean;
}

export function generateSample(seed = 20260914): SampleData {
  const rand = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
  const alnum = (n: number) => Array.from({ length: n }, () => "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(rand() * 62)]).join("");

  const asOf = new Date(Date.UTC(2026, 9, 10, 18, 0, 0)); // 10 Oct 2026
  const start = Date.UTC(2026, 8, 1); // 1 Sep 2026
  const lastOrderDay = Date.UTC(2026, 9, 8); // 8 Oct 2026
  const planted: Planted[] = [];
  const plant = (p: Planted) => planted.push({ ...p, amount: r2(p.amount) });

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

  // two Razorpay orders on 9 Oct, captured but not yet settled (inside the payout window: must not be flagged)
  for (let k = 0; k < 2; k++) {
    const created = new Date(Date.UTC(2026, 9, 9, 11 + k, 15));
    const it = { ...CATALOG[k], qty: 1 };
    orders.push({ num: 10001 + orders.length, created, items: [it], total: it.price, cod: false, cancelled: false, refunded: 0, gateway: "razorpay", city: pick(CITIES) });
  }

  // prepaid payment details: about two thirds through Razorpay, the rest through PayU
  for (const o of orders) {
    if (o.cod) continue;
    o.gateway = o.gateway ?? (rand() < 0.65 ? "razorpay" : "payu");
    o.payId = o.gateway === "razorpay" ? `pay_${alnum(14)}` : `40${digits(14)}`;
    const r = rand();
    o.method = r < 0.6 ? "upi" : r < 0.9 ? "card" : "netbanking";
    if (o.method === "card") o.network = rand() < 0.12 ? "amex" : pick(["visa", "mastercard", "rupay"]);
  }

  // partial refunds on a few Razorpay orders, matching in both systems
  const rzpOld = orders.filter((o) => o.gateway === "razorpay" && !o.cancelled && o.created.getTime() < Date.UTC(2026, 8, 25));
  for (const o of rzpOld.slice(3, 9)) o.refunded = Math.min(o.total, pick([200, 300, 450]));

  // ───── Shipments: about 60% through Shiprocket, the rest booked with Delhivery directly ─────
  const ships: GenShip[] = [];
  for (const o of orders) {
    if (o.cancelled || o.created.getTime() > Date.UTC(2026, 9, 9)) continue;
    const partner: CourierId = rand() < 0.6 ? "shiprocket" : "delhivery";
    const c = COURIER[partner];
    const kg = o.items.reduce((a, it) => a + it.kg * it.qty, 0) + 0.1;
    const slabs = Math.ceil(kg / 0.5);
    const zone = pick(ZONES);
    const freight = c.zone[zone] * slabs;
    const codFee = o.cod ? r2(Math.max(c.codMin, (o.total * c.codPct) / 100)) : 0;
    const rto = rand() < (o.cod ? 0.2 : 0.03);
    const delivered = new Date(o.created.getTime() + between(2, 5) * DAY + between(1, 8) * 3600_000);
    let status: GenShip["status"] = rto ? "RTO Delivered" : "Delivered";
    if (delivered > asOf) status = "In Transit";
    ships.push({
      order: o,
      partner,
      awb: partner === "shiprocket" ? `1${digits(13)}` : `2${digits(13)}`,
      courier: partner === "shiprocket" ? pick(SR_COURIERS) : "Delhivery",
      zone,
      slabs,
      freight,
      codFee,
      rtoCharge: status === "RTO Delivered" ? freight : 0,
      status,
      delivered: status === "Delivered" ? delivered : null,
      dupRow: false,
      touched: false,
    });
  }

  const inRange = (d: Date | null, a: number, b: number) => !!d && d.getTime() >= Date.UTC(2026, 8, a) && d.getTime() < Date.UTC(2026, 8, b);
  const free = (s: GenShip) => !s.touched;
  const deliveredCod = ships.filter((s) => s.status === "Delivered" && s.order.cod);
  const deliveredPrepaid = ships.filter((s) => s.status === "Delivered" && !s.order.cod);

  // shipping billed twice (prepaid, delivered)
  for (const s of deliveredPrepaid.filter((s) => inRange(s.delivered, 8, 24)).slice(0, 2)) {
    s.dupRow = true;
    s.touched = true;
    plant({ id: `dup:${s.awb}|forward`, kind: "claim", amount: s.freight, partner: s.partner, note: "shipping billed twice" });
  }
  // COD fee on prepaid
  for (const s of deliveredPrepaid.filter((s) => inRange(s.delivered, 5, 28) && free(s)).slice(2, 5)) {
    s.codFee = r2(Math.max(COURIER[s.partner].codMin, (s.order.total * COURIER[s.partner].codPct) / 100));
    s.touched = true;
    plant({ id: `codfee_prepaid:${s.awb}`, kind: "claim", amount: s.codFee, partner: s.partner, note: "COD fee on prepaid" });
  }
  // return charge on delivered
  for (const s of deliveredCod.filter((s) => inRange(s.delivered, 6, 26)).slice(10, 12)) {
    s.rtoCharge = s.freight;
    s.touched = true;
    plant({ id: `rto_delivered:${s.awb}`, kind: "claim", amount: s.freight, partner: s.partner, note: "RTO charge on delivered" });
  }
  // Delhivery billed a zone higher than the rate card (claim: direct contract)
  for (const s of deliveredPrepaid.filter((s) => s.partner === "delhivery" && free(s) && s.zone !== "E").slice(0, 2)) {
    const next = ZONES[ZONES.indexOf(s.zone) + 1];
    const billed = COURIER.delhivery.zone[next] * s.slabs;
    plant({ id: `rate_freight:${s.awb}`, kind: "claim", amount: billed - s.freight, partner: s.partner, note: "Delhivery freight above rate card" });
    s.freight = billed;
    s.touched = true;
  }
  // Shiprocket charged more than the rate card (check: prices vary by courier on an aggregator)
  for (const s of deliveredPrepaid.filter((s) => s.partner === "shiprocket" && free(s)).slice(0, 1)) {
    s.freight += 15;
    s.touched = true;
    plant({ id: `rate_freight:${s.awb}`, kind: "check", amount: 15, partner: s.partner, note: "Shiprocket freight above rate card" });
  }
  // Delhivery COD fee above the agreed rate
  for (const s of deliveredCod.filter((s) => s.partner === "delhivery" && free(s) && inRange(s.delivered, 3, 28)).slice(0, 1)) {
    s.codFee = r2(s.codFee + 25);
    s.touched = true;
    plant({ id: `rate_cod:${s.awb}`, kind: "claim", amount: 25, partner: s.partner, note: "Delhivery COD fee above rate card" });
  }

  // ───── COD remittance: each courier pays twice a week, at least 7 days after delivery ─────
  interface Rem { ship: GenShip; remitted: number; date: Date; crf: string; utr: string }
  const rems: Rem[] = [];
  const codPool = deliveredCod.filter((s) => inRange(s.delivered, 5, 26));
  const unpaid = new Set(codPool.slice(0, 4).map((s) => s.awb));
  const shorts = new Map(codPool.slice(4, 7).map((s, i) => [s.awb, [50, 120, 300][i]]));
  const batchKey = new Map<string, { crf: string; utr: string }>();
  for (const s of deliveredCod) {
    let d = dayStart(new Date(s.delivered!.getTime() + 7 * DAY));
    while (!(COURIER[s.partner].codDays as readonly number[]).includes(d.getUTCDay())) d = new Date(d.getTime() + DAY);
    if (d > asOf) continue; // not yet due
    if (unpaid.has(s.awb)) {
      plant({ id: `cod_unpaid:${s.awb}`, kind: "claim", amount: s.order.total, partner: s.partner, note: "COD never paid" });
      continue;
    }
    const short = shorts.get(s.awb) ?? 0;
    if (short) plant({ id: `cod_short:${s.awb}`, kind: "claim", amount: short, partner: s.partner, note: "COD paid short" });
    const key = `${s.partner}|${d.toISOString().slice(0, 10)}`;
    if (!batchKey.has(key)) batchKey.set(key, s.partner === "shiprocket" ? { crf: `CRF${digits(6)}`, utr: `ICIC${digits(12)}` } : { crf: `DLRM${digits(7)}`, utr: `HDFCN${digits(11)}` });
    const b = batchKey.get(key)!;
    rems.push({ ship: s, remitted: s.order.total - short, date: new Date(d.getTime() + 15 * 3600_000), crf: b.crf, utr: b.utr });
  }

  // ───── Gateway payments ─────
  interface Pay { order: GenOrder; gateway: GatewayId; id: string; amount: number; fee: number; tax: number; created: Date; settled: Date | null; method: string; network: string }
  const pays: Pay[] = [];
  const feeOver = new Map<string, number>();
  const gstOver = new Set<string>();
  const domestic = (g: GatewayId) => orders.filter((o) => o.gateway === g && !o.cancelled && o.method !== "card" && o.created.getTime() < Date.UTC(2026, 8, 28));
  domestic("razorpay").slice(4, 8).forEach((o) => feeOver.set(o.payId!, 3));
  domestic("razorpay").slice(12, 14).forEach((o) => gstOver.add(o.payId!));
  domestic("payu").slice(3, 5).forEach((o) => feeOver.set(o.payId!, 2.5));
  const missingPay = new Set([
    ...domestic("razorpay").filter((o) => o.created.getTime() > Date.UTC(2026, 8, 10)).slice(20, 22).map((o) => o.payId!),
    ...domestic("payu").filter((o) => o.created.getTime() > Date.UTC(2026, 8, 10)).slice(8, 9).map((o) => o.payId!),
  ]);

  for (const o of orders) {
    if (o.cod || o.cancelled || !o.payId || !o.gateway) continue;
    const g = GATEWAY[o.gateway];
    if (missingPay.has(o.payId)) {
      plant({ id: `gw_missing:${o.num}`, kind: "check", amount: o.total, partner: o.gateway, note: "paid order missing from settlements" });
      continue;
    }
    const premium = o.network === "amex";
    let fee = r2((o.total * (premium ? g.premium : g.std)) / 100);
    const overPct = feeOver.get(o.payId);
    if (overPct) {
      const correct = fee;
      fee = r2((o.total * overPct) / 100);
      plant({ id: `fee:${o.payId}`, kind: "claim", amount: (fee - correct) * 1.18, partner: o.gateway, note: "fee above rate card" });
    }
    let tax = r2(fee * 0.18);
    if (gstOver.has(o.payId)) {
      tax = r2(fee * 0.28);
      plant({ id: `gst:${o.payId}`, kind: "claim", amount: tax - r2(fee * 0.18), partner: o.gateway, note: "GST charged wrongly" });
    }
    const settledAt = new Date(dayStart(o.created).getTime() + g.settleAfter * DAY + g.settleHour * 3600_000);
    pays.push({ order: o, gateway: o.gateway, id: o.payId, amount: o.total, fee, tax, created: o.created, settled: settledAt <= asOf ? settledAt : null, method: o.method!, network: o.network ?? "" });
  }

  // Razorpay refunds: matching ones plus one over-refund
  interface Refund { id: string; pay: Pay; amount: number; created: Date; settled: Date }
  const refunds: Refund[] = [];
  const rzpPays = pays.filter((p) => p.gateway === "razorpay");
  for (const p of rzpPays.filter((p) => p.order.refunded > 0)) {
    const created = new Date(p.created.getTime() + 5 * DAY);
    refunds.push({ id: `rfnd_${alnum(14)}`, pay: p, amount: p.order.refunded, created, settled: new Date(dayStart(created).getTime() + DAY + 11 * 3600_000) });
  }
  const over = rzpPays.find((p) => p.order.refunded === 0 && p.created.getTime() < Date.UTC(2026, 8, 20) && p.created.getTime() > Date.UTC(2026, 8, 12))!;
  over.order.refunded = 200;
  {
    const created = new Date(over.created.getTime() + 4 * DAY);
    refunds.push({ id: `rfnd_${alnum(14)}`, pay: over, amount: 500, created, settled: new Date(dayStart(created).getTime() + DAY + 11 * 3600_000) });
    plant({ id: `refund_over:${over.order.num}`, kind: "check", amount: 300, partner: "razorpay", note: "refunded more than approved" });
  }

  // settlement batches, one per gateway per day
  const setl = new Map<string, { gateway: GatewayId; id: string; utr: string; date: Date; net: number }>();
  const batchFor = (gateway: GatewayId, d: Date) => {
    const key = `${gateway}|${d.toISOString().slice(0, 10)}`;
    if (!setl.has(key)) setl.set(key, { gateway, id: `setl_${alnum(14)}`, utr: gateway === "razorpay" ? `UTIB${digits(12)}` : `YESB${digits(12)}`, date: d, net: 0 });
    return setl.get(key)!;
  };
  for (const p of pays) if (p.settled) batchFor(p.gateway, p.settled).net += p.amount - p.fee - p.tax;
  for (const rf of refunds) if (rf.settled <= asOf) batchFor("razorpay", rf.settled).net -= rf.amount;

  // ───── Bank statement ─────
  interface BankRow { date: Date; narration: string; ref: string; wd: number; dep: number }
  const bank: BankRow[] = [];
  const setlList = [...setl.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  const missingSetl = (["razorpay", "payu"] as const).map((g) => setlList.find((b) => b.gateway === g && b.date.getTime() > Date.UTC(2026, 8, 14) && b.net > 1500)!);
  for (const m of missingSetl) plant({ id: `gateway_payout_missing:${m.utr}`, kind: "claim", amount: m.net, partner: m.gateway, note: "settlement not in bank" });
  for (const b of setlList) {
    if (missingSetl.includes(b)) continue;
    const narration = b.gateway === "razorpay"
      ? `NEFT CR-UTIB0000100-RAZORPAY SOFTWARE PRIVATE LIMITED-INDIGO LOOM-${b.utr}`
      : `NEFT CR-YESB0000001-PAYU PAYMENTS PRIVATE LIMITED-${b.utr}`;
    bank.push({ date: b.date, narration, ref: b.utr, wd: 0, dep: r2(b.net) });
  }
  const remBatches = new Map<string, { partner: CourierId; utr: string; crf: string; date: Date; total: number }>();
  for (const r of rems) {
    const b = remBatches.get(r.utr) ?? { partner: r.ship.partner, utr: r.utr, crf: r.crf, date: r.date, total: 0 };
    b.total += r.remitted;
    remBatches.set(r.utr, b);
  }
  const remList = [...remBatches.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  const missingRem = (["shiprocket", "delhivery"] as const).map((p) => remList.find((b) => b.partner === p && b.date.getTime() > Date.UTC(2026, 8, 12))!);
  for (const m of missingRem) plant({ id: `courier_payout_missing:${m.utr}`, kind: "claim", amount: m.total, partner: m.partner, note: "courier payout not in bank" });
  for (const b of remList) {
    if (missingRem.includes(b)) continue;
    const narration = b.partner === "shiprocket" ? `NEFT CR-ICIC0000104-SHIPROCKET LIMITED-${b.utr}` : `NEFT CR-HDFC0000060-DELHIVERY LIMITED-COD REMIT-${b.utr}`;
    bank.push({ date: b.date, narration, ref: b.utr, wd: 0, dep: r2(b.total) });
  }
  // everyday noise
  for (let d = start; d <= asOf.getTime(); d += DAY) {
    const day = new Date(d + 10 * 3600_000);
    if (rand() < 0.35) bank.push({ date: day, narration: `UPI-SHIPROCKET-WALLET RECHARGE-${digits(12)}`, ref: digits(12), wd: pick([2000, 3000, 5000]), dep: 0 });
    if (rand() < 0.15) bank.push({ date: day, narration: `NEFT DR-DELHIVERY LIMITED-FREIGHT INVOICE-${digits(8)}`, ref: digits(12), wd: between(3000, 9000), dep: 0 });
    if (rand() < 0.4) bank.push({ date: day, narration: `POS FACEBOOK *ADS ${digits(10)}`, ref: "", wd: between(800, 4500), dep: 0 });
    if (new Date(d).getUTCDate() === 1) bank.push({ date: day, narration: "NEFT DR-RENT JAIPUR WORKSHOP", ref: digits(10), wd: 18000, dep: 0 });
    if (rand() < 0.08) bank.push({ date: day, narration: `IMPS-${digits(12)}-B2B GIFTING ORDER`, ref: digits(12), wd: 0, dep: between(5000, 18000) + 0.5 });
  }
  bank.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ───── Weight discrepancies (Shiprocket only; the brand hasn't added Delhivery's file) ─────
  interface W { ship: GenShip; raised: Date; charged: number; extra: number; status: string }
  const ws: W[] = [];
  const srShipped = ships.filter((s) => s.partner === "shiprocket" && s.status !== "In Transit");
  const oldPool = srShipped.filter((s) => s.order.created.getTime() < Date.UTC(2026, 8, 22));
  const statuses = ["Auto Accepted", "Dispute Accepted", "Accepted", "Dispute Raised", "Dispute Rejected"];
  oldPool.slice(0, 18).forEach((s, i) => {
    const extraSlabs = 1 + (i % 2);
    ws.push({ ship: s, raised: new Date(s.order.created.getTime() + 3 * DAY), charged: (s.slabs + extraSlabs) * 0.5, extra: COURIER.shiprocket.zone[s.zone] * extraSlabs, status: statuses[i % statuses.length] });
  });
  // open and still disputable (raised in the last few days)
  const recent = srShipped.filter((s) => s.order.created.getTime() >= Date.UTC(2026, 9, 1) && s.order.created.getTime() < Date.UTC(2026, 9, 6));
  recent.slice(0, 3).forEach((s, i) => {
    const raised = new Date(Date.UTC(2026, 9, 6 + i, 12));
    const extra = COURIER.shiprocket.zone[s.zone];
    ws.push({ ship: s, raised, charged: (s.slabs + 1) * 0.5, extra, status: "New Discrepancy" });
    plant({ id: `weight:${s.awb}`, kind: "check", amount: extra, partner: "shiprocket", note: "weight charge still disputable" });
  });
  // open but window already closed: should show as lost, not as a finding
  oldPool.slice(18, 20).forEach((s) => {
    ws.push({ ship: s, raised: new Date(s.order.created.getTime() + 3 * DAY), charged: (s.slabs + 1) * 0.5, extra: COURIER.shiprocket.zone[s.zone], status: "New Discrepancy" });
  });

  // ───── Tables ─────
  const shopifyHead = ["Name", "Email", "Financial Status", "Paid at", "Fulfillment Status", "Currency", "Subtotal", "Shipping", "Taxes", "Total", "Discount Amount", "Created at", "Lineitem quantity", "Lineitem name", "Lineitem price", "Lineitem sku", "Cancelled at", "Payment Method", "Payment Reference", "Refunded Amount", "Id", "Shipping City"];
  const shopify: Table = [shopifyHead];
  const shipOf = new Map(ships.map((s) => [s.order, s]));
  for (const o of orders) {
    const fin = o.cod ? (o.cancelled ? "voided" : "pending") : o.refunded > 0 ? "partially_refunded" : "paid";
    const method = o.cod ? "Cash on Delivery (COD)" : o.gateway === "razorpay" ? "Razorpay Secure (UPI, Cards, Wallets, NetBanking)" : "PayU India";
    o.items.forEach((it, idx) => {
      const first = idx === 0;
      shopify.push([
        `#${o.num}`,
        first ? `customer${o.num}@example.com` : "",
        first ? fin : "",
        first && !o.cod ? `${ymdHms(o.created)} +0530` : "",
        first ? (shipOf.has(o) ? "fulfilled" : "unfulfilled") : "",
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
        first ? method : "",
        first && !o.cod ? o.payId : "",
        first ? o.refunded.toFixed(2) : "",
        first ? String(5000000000 + o.num) : "",
        first ? o.city : "",
      ]);
    });
  }

  // Shiprocket: one row per shipment, weights in kg, zones as letters
  const srShipHead = ["Order ID", "AWB Code", "Courier Name", "Payment Method", "Status", "Order Date", "Delivered Date", "COD Amount", "Charged Weight (KG)", "Zone", "Freight Charges", "COD Charges", "RTO Charges", "Total Charges"];
  const srShip: Table = [srShipHead];
  // Delhivery: waybills, weights in grams, zones as "Zone B"
  const dlShipHead = ["Waybill", "Order ID", "Payment Mode", "Status", "Pickup Date", "Delivered Date", "COD Amount", "Charged Weight (gm)", "Zone", "Freight Charge", "COD Charge", "RTO Charge", "Total Amount"];
  const dlShip: Table = [dlShipHead];
  for (const s of ships) {
    const total = r2(s.freight + s.codFee + s.rtoCharge).toFixed(2);
    const row = s.partner === "shiprocket"
      ? [String(s.order.num), s.awb, s.courier, s.order.cod ? "COD" : "Prepaid", s.status, dMonY(s.order.created), s.delivered ? dMonY(s.delivered) : "", s.order.cod ? s.order.total.toFixed(2) : "0.00", (s.slabs * 0.5).toFixed(2), s.zone, s.freight.toFixed(2), s.codFee.toFixed(2), s.rtoCharge.toFixed(2), total]
      : [s.awb, String(s.order.num), s.order.cod ? "COD" : "Pre-paid", s.status === "RTO Delivered" ? "RTO" : s.status, dmy(new Date(s.order.created.getTime() + DAY)), s.delivered ? dmy(s.delivered) : "", s.order.cod ? s.order.total.toFixed(2) : "0", String(s.slabs * 500), `Zone ${s.zone}`, s.freight.toFixed(2), s.codFee.toFixed(2), s.rtoCharge.toFixed(2), total];
    const table = s.partner === "shiprocket" ? srShip : dlShip;
    table.push(row);
    if (s.dupRow) table.push([...row]);
  }

  const srCodHead = ["CRF ID", "Remittance Date", "UTR", "Order ID", "AWB Code", "Courier Name", "COD Amount", "Remitted Amount", "Delivered Date"];
  const srCod: Table = [srCodHead];
  const dlCodHead = ["Remittance ID", "Remittance Date", "UTR No", "Waybill", "Order ID", "COD Amount", "Remitted Amount"];
  const dlCod: Table = [dlCodHead];
  for (const r of rems.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (r.ship.partner === "shiprocket") srCod.push([r.crf, dmy(r.date), r.utr, String(r.ship.order.num), r.ship.awb, r.ship.courier, r.ship.order.total.toFixed(2), r.remitted.toFixed(2), dmy(r.ship.delivered!)]);
    else dlCod.push([r.crf, dmy(r.date), r.utr, r.ship.awb, String(r.ship.order.num), r.ship.order.total.toFixed(2), r.remitted.toFixed(2)]);
  }

  const weightHead = ["Order ID", "AWB Code", "Courier Name", "Discrepancy Date", "Entered Weight (KG)", "Charged Weight (KG)", "Excess Charges", "Status"];
  const weightTable: Table = [weightHead];
  for (const w of ws) weightTable.push([String(w.ship.order.num), w.ship.awb, w.ship.courier, dMonY(w.raised), (w.ship.slabs * 0.5).toFixed(2), w.charged.toFixed(2), w.extra.toFixed(2), w.status]);

  const setlOf = (g: GatewayId, d: Date | null) => (d ? setl.get(`${g}|${d.toISOString().slice(0, 10)}`) ?? null : null);
  const rzpHead = ["entity_id", "type", "debit", "credit", "amount", "currency", "fee", "tax", "on_hold", "settled", "created_at", "settled_at", "settlement_id", "settlement_utr", "payment_id", "order_receipt", "method", "card_network"];
  const rzp: Table = [rzpHead];
  for (const p of pays.filter((p) => p.gateway === "razorpay")) {
    const b = setlOf("razorpay", p.settled);
    rzp.push([p.id, "payment", "0", r2(p.amount - p.fee - p.tax).toFixed(2), p.amount.toFixed(2), "INR", p.fee.toFixed(2), p.tax.toFixed(2), "0", p.settled ? "1" : "0", `${dmy(p.created)} ${pad(p.created.getUTCHours())}:${pad(p.created.getUTCMinutes())}:00`, p.settled ? `${dmy(p.settled)} 11:00:00` : "", b?.id ?? "", b?.utr ?? "", "", String(p.order.num), p.method, p.network]);
  }
  for (const rf of refunds) {
    const b = rf.settled <= asOf ? setlOf("razorpay", rf.settled) : null;
    rzp.push([rf.id, "refund", rf.amount.toFixed(2), "0", rf.amount.toFixed(2), "INR", "0.00", "0.00", "0", b ? "1" : "0", `${dmy(rf.created)} 12:00:00`, b ? `${dmy(rf.settled)} 11:00:00` : "", b?.id ?? "", b?.utr ?? "", rf.pay.id, String(rf.pay.order.num), "", ""]);
  }

  // PayU: one row per transaction, its own column names, a status column, and net amount instead of credit/debit
  const payuHead = ["payu_id", "txnid", "status", "mode", "card_type", "amount", "payu_fee", "payu_fee_tax", "net_amount", "txn_addedon", "settledon", "settlementUTR"];
  const payu: Table = [payuHead];
  const MODE: Record<string, string> = { upi: "UPI", card: "CC", netbanking: "NB" };
  for (const p of pays.filter((p) => p.gateway === "payu")) {
    const b = setlOf("payu", p.settled);
    payu.push([p.id, String(p.order.num), "captured", MODE[p.method], p.network.toUpperCase(), p.amount.toFixed(2), p.fee.toFixed(2), p.tax.toFixed(2), r2(p.amount - p.fee - p.tax).toFixed(2), ymdHms(p.created), p.settled ? ymdHms(p.settled) : "", b?.utr ?? ""]);
  }
  // a failed attempt and a dropped one: no money moved, so they must be ignored
  orders.filter((o) => o.gateway === "payu").slice(1, 3).forEach((o, i) => {
    payu.push([`40${digits(14)}`, String(o.num), i === 0 ? "failed" : "userCancelled", "UPI", "", o.total.toFixed(2), "0.00", "0.00", "0.00", ymdHms(new Date(o.created.getTime() - 120_000)), "", ""]);
  });

  const bankTable: Table = [["HDFC BANK Ltd.  Statement of account"], ["Account: INDIGO LOOM  A/C No: XXXXXXXX4821"], [], ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]];
  let bal = 85000;
  for (const b of bank) {
    bal = r2(bal - b.wd + b.dep);
    bankTable.push([dmyShort(b.date), b.narration, b.ref, dmyShort(b.date), b.wd ? b.wd.toFixed(2) : "", b.dep ? b.dep.toFixed(2) : "", bal.toFixed(2)]);
  }

  return {
    asOf,
    planted,
    cards: sampleCards(),
    files: [
      { name: "orders_export.csv", kind: "shopify_orders", partner: null, table: shopify },
      { name: "razorpay_settlement_recon.csv", kind: "gateway_settlements", partner: "razorpay", table: rzp },
      { name: "payu_settlement_report.csv", kind: "gateway_settlements", partner: "payu", table: payu },
      { name: "shiprocket_shipments.csv", kind: "courier_shipments", partner: "shiprocket", table: srShip },
      { name: "shiprocket_cod_remittance.csv", kind: "courier_cod", partner: "shiprocket", table: srCod },
      { name: "shiprocket_weight_discrepancy.csv", kind: "courier_weight", partner: "shiprocket", table: weightTable },
      { name: "delhivery_shipment_charges.csv", kind: "courier_shipments", partner: "delhivery", table: dlShip },
      { name: "delhivery_cod_remittance.csv", kind: "courier_cod", partner: "delhivery", table: dlCod },
      { name: "hdfc_statement.csv", kind: "bank", partner: null, table: bankTable },
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
