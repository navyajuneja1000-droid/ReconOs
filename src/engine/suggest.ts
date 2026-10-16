/**
 * Suggest a partner's rates from the brand's own files: whatever it was charged most often
 * for each payment method, zone or fee. The brand still confirms every number, and any
 * payment charged differently from the usual rate then shows up as a possible leak.
 */
import { slabsFor } from "./audit";
import { INSTRUMENTS, instrumentsFor, type Instrument } from "./instruments";
import { PARTNER_BY_ID, pctKey, ZONES, zoneFrom, zoneKey, type RateCard, type Zone } from "./partners";
import type { Dataset } from "./types";
import { daysBetween, r2 } from "./util";

export interface Suggestion {
  values: Record<string, string>;
  notes: Record<string, string>;
}

/** The most common value and how often it appears. Values are rounded first. */
function mode(xs: number[], dp = 2): { value: number; count: number; share: number } | null {
  if (!xs.length) return null;
  const m = new Map<number, number>();
  for (const x of xs) {
    const k = Math.round(x * 10 ** dp) / 10 ** dp;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  let best: [number, number] = [0, 0];
  for (const [k, n] of m) if (n > best[1] || (n === best[1] && k < best[0])) best = [k, n];
  return { value: best[0], count: best[1], share: best[1] / xs.length };
}

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
};

const num = (n: number) => String(r2(n));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** A value is suggested only when it's clearly the usual one, not noise. */
const clear = (m: ReturnType<typeof mode>, minCount = 3): m is NonNullable<ReturnType<typeof mode>> => !!m && m.count >= minCount && m.share >= 0.5;

export function suggestGateway(ds: Dataset, partner: string): Suggestion {
  const values: Record<string, string> = {};
  const notes: Record<string, string> = {};
  const pays = ds.gateway.filter((g) => g.partner === partner && g.type === "payment" && g.amount > 0);
  const by = new Map<Instrument, number[]>();
  for (const p of pays) {
    const c = instrumentsFor(p);
    if (c.length !== 1) continue;
    by.set(c[0], [...(by.get(c[0]) ?? []), (p.fee / p.amount) * 100]);
  }
  for (const i of INSTRUMENTS) {
    const xs = by.get(i.key) ?? [];
    const m = mode(xs);
    if (clear(m, 2)) {
      values[pctKey(i.key)] = num(m.value);
      notes[pctKey(i.key)] = `Charged on ${m.count} of ${plural(xs.length, "payment")} in your file`;
    } else if (xs.length) {
      notes[pctKey(i.key)] = `${plural(xs.length, "payment")} in your file, but no single rate stood out`;
    }
  }
  const gst = mode(pays.filter((p) => p.fee > 0).map((p) => (p.tax / p.fee) * 100), 0);
  if (clear(gst)) {
    values.gstPct = num(gst.value);
    notes.gstPct = `GST on ${gst.count} of ${plural(pays.filter((p) => p.fee > 0).length, "fee")}`;
  }
  const days = pays.filter((p) => p.settledAt && p.createdAt).map((p) => daysBetween(p.createdAt!, p.settledAt!));
  const d90 = percentile(days, 0.9);
  if (d90 !== null && days.length >= 3) {
    values.settleDays = String(Math.max(1, d90));
    notes.settleDays = `9 in 10 payments were paid out within ${plural(Math.max(1, d90), "day")}`;
  }
  return { values, notes };
}

export function suggestCourier(ds: Dataset, partner: string): Suggestion {
  const values: Record<string, string> = {};
  const notes: Record<string, string> = {};
  const ships = ds.shipments.filter((s) => s.partner === partner);
  const first = new Map<string, number>();
  const firstOf = (awb: string, type: string) => first.get(`${awb}|${type}`);
  for (const c of ds.charges) if (c.partner === partner && !first.has(`${c.awb}|${c.type}`)) first.set(`${c.awb}|${c.type}`, c.amount);

  // shipping by zone: one-slab parcels give the first 500 g; heavier ones give each extra 500 g
  for (const z of ZONES) {
    const inZone = ships.filter((s) => zoneFrom(s.zone) === z && s.chargedKg > 0 && firstOf(s.awb, "forward") !== undefined);
    const one = mode(inZone.filter((s) => slabsFor(s.chargedKg) === 1).map((s) => firstOf(s.awb, "forward")!));
    let base: number | null = null;
    if (clear(one, 2)) {
      base = one.value;
      values[zoneKey(z, "first")] = num(base);
      notes[zoneKey(z, "first")] = `Charged on ${one.count} of ${plural(inZone.filter((s) => slabsFor(s.chargedKg) === 1).length, "parcel")} up to 500 g`;
    }
    const heavy = inZone.filter((s) => slabsFor(s.chargedKg) > 1);
    if (base !== null) {
      const extra = mode(heavy.map((s) => (firstOf(s.awb, "forward")! - base!) / (slabsFor(s.chargedKg) - 1)));
      if (clear(extra, 2)) {
        values[zoneKey(z, "extra")] = num(extra.value);
        notes[zoneKey(z, "extra")] = `Worked out from ${plural(extra.count, "heavier parcel")}`;
      }
    } else {
      // no light parcels: if every 500 g costs the same, freight per slab still shows the rate
      const per = mode(inZone.map((s) => firstOf(s.awb, "forward")! / slabsFor(s.chargedKg)));
      if (clear(per, 2)) {
        values[zoneKey(z, "first")] = values[zoneKey(z, "extra")] = num(per.value);
        notes[zoneKey(z, "first")] = `Same price per 500 g on ${per.count} of ${plural(inZone.length, "parcel")}`;
      }
    }
  }

  // COD fee: a percent with a minimum. Rows above the minimum show the percent; the rest show the minimum.
  const cod = ships
    .map((s) => ({ fee: firstOf(s.awb, "cod_fee"), amt: s.codAmount }))
    .filter((x): x is { fee: number; amt: number } => x.fee !== undefined && x.amt > 0 && x.fee > 0);
  const pct = mode(cod.map((x) => (x.fee / x.amt) * 100));
  const pctOk = pct && pct.count >= 3;
  const rest = pctOk ? cod.filter((x) => Math.abs((x.fee / x.amt) * 100 - pct!.value) > 0.01) : cod;
  const min = mode(rest.map((x) => x.fee));
  if (pctOk && min && min.count >= 3 && min.share >= 0.5) {
    values.codPct = num(pct!.value);
    values.codMin = num(min.value);
    notes.codPct = `${pct!.count} COD orders were charged ${num(pct!.value)}%`;
    notes.codMin = `${min.count} smaller COD orders were charged a flat ₹${num(min.value)}`;
  } else if (min && min.count >= 3 && min.share >= 0.8 && !pctOk) {
    values.codMin = num(min.value);
    notes.codMin = `Every COD order was charged about ₹${num(min.value)}; the percent can't be seen in this file`;
  } else if (pctOk && pct!.share >= 0.5) {
    values.codPct = num(pct!.value);
    notes.codPct = `${pct!.count} of ${cod.length} COD orders were charged ${num(pct!.value)}%`;
  }

  const rto = mode(ships.map((s) => ({ r: firstOf(s.awb, "rto"), f: firstOf(s.awb, "forward") })).filter((x) => x.r && x.f).map((x) => (x.r! / x.f!) * 100), 0);
  if (clear(rto, 2)) {
    values.rtoPct = num(rto.value);
    notes.rtoPct = `Return charge was ${num(rto.value)}% of shipping on ${rto.count} returns`;
  }

  const shipBy = new Map(ships.map((s) => [s.awb, s]));
  const rems = ds.remittances.filter((r) => r.partner === partner && r.remittedAt);
  const days = rems
    .map((r) => {
      const sh = shipBy.get(r.awb);
      return sh?.deliveredAt ? daysBetween(sh.deliveredAt, r.remittedAt!) : null;
    })
    .filter((d): d is number => d !== null && d >= 0);
  const d90 = percentile(days, 0.9);
  if (d90 !== null && days.length >= 3) {
    values.codPayDays = String(d90);
    notes.codPayDays = `9 in 10 COD orders were paid within ${plural(d90, "day")} of delivery`;
  }
  const ex = PARTNER_BY_ID[partner]?.exampleCourier;
  if (ex) {
    values.weightDisputeDays = String(ex.weightDisputeDays);
    notes.weightDisputeDays = partner === "shiprocket" ? "Shiprocket's published window" : "A common window. Check your agreement";
  }
  return { values, notes };
}

/** Fill the blanks on a card from the files; anything the brand already typed is kept. */
export function suggestCard(ds: Dataset, card: RateCard): RateCard {
  const p = PARTNER_BY_ID[card.partner];
  if (!p) return card;
  const s = p.type === "gateway" ? suggestGateway(ds, card.partner) : suggestCourier(ds, card.partner);
  const values = { ...card.values };
  const notes = { ...(card.notes ?? {}) };
  for (const [k, v] of Object.entries(s.values)) {
    if ((values[k] ?? "").trim() === "") {
      values[k] = v;
      notes[k] = `From your files: ${s.notes[k]}`;
    }
  }
  for (const [k, n] of Object.entries(s.notes)) if (!(k in s.values) && !notes[k]) notes[k] = n;
  return { ...card, values, notes, source: card.source ?? "files", example: false, confirmed: false };
}
