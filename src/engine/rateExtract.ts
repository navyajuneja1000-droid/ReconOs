/**
 * Read rates out of a rate card or agreement addendum: text from a PDF, a screenshot (after
 * OCR), a spreadsheet or text pasted from an email.
 *
 * Rate cards come in many shapes, so this reads line by line with plain rules (method and zone
 * names, percent signs, rupee amounts) rather than expecting one layout. Every value it finds
 * keeps the line it came from, so the founder can see why, and nothing counts until they confirm.
 */
import { INSTRUMENTS, type Instrument } from "./instruments";
import { COURIER_EXTRA_FIELDS, fixKey, pctKey, ZONES, zoneKey, type PartnerType, type Zone } from "./partners";

export interface Extraction {
  values: Record<string, string>;
  /** the line each value was read from */
  notes: Record<string, string>;
}

const clean = (s: string) =>
  s
    .replace(/[–—]/g, "-")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/\s+/g, " ")
    .trim();

const num = (s: string) => Number(s.replace(/,/g, ""));
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const RUPEE = String.raw`(?:rs\.?|inr|₹|₹|r\$)`;

/** Lines from any text: also splits on table separators so each table row stays one line. */
export function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(clean)
    .filter((l) => l.length > 1);
}

/** Lines from OCR text: wide runs of spaces are table column gaps, so they become cell breaks. */
export function ocrToLines(text: string): string[] {
  return toLines(text.replace(/[ \t]{3,}/g, " | "));
}

/** OCR settings that keep table rows together (tested on rate card screenshots). */
export const OCR_PARAMS = { tessedit_pageseg_mode: "4", preserve_interword_spaces: "1" } as const;

/** Lines from spreadsheet rows. */
export function rowsToLines(rows: unknown[][]): string[] {
  return rows.map((r) => clean(r.map((c) => String(c ?? "").trim()).filter(Boolean).join(" | "))).filter((l) => l.length > 1);
}

// ───────────── Gateways ─────────────

const SLAB = String.raw`(?:${RUPEE}\s*)?2,?000(?:\.00)?`;
const LOW = new RegExp(String.raw`(?:up ?to|upto|below|less than|under|<=|<|lte|till|0 ?- ?|not exceeding)\s*${SLAB}|${SLAB}\s*(?:and below|or less|& below)`, "i");
const HIGH = new RegExp(String.raw`(?:above|more than|greater than|over|exceeding|>=|>|gt)\s*${SLAB}|${SLAB}\s*(?:and above|\+|or more|& above)|2,?001`, "i");

interface Hit { keys: Instrument[]; level: number }

/** Which payment methods a line is about. Higher level wins over lower (specific over general). */
function methodsIn(t: string): Hit | null {
  const debit = /debit/.test(t);
  const credit = /credit/.test(t);
  const nets = (["visa", "mastercard", "rupay"] as const).filter((n) => (n === "mastercard" ? /master ?card|\bmc\b/ : new RegExp(n)).test(t));
  const amex = /amex|american express/.test(t);
  const diners = /diners/.test(t);
  if (amex || diners) return { keys: [...(amex ? (["amex"] as Instrument[]) : []), ...(diners ? (["diners"] as Instrument[]) : [])], level: 3 };
  if (/international|foreign|overseas|non[- ]?indian/.test(t)) return { keys: ["international"], level: 3 };
  if (debit && /rupay/.test(t) && !credit) return { keys: ["debitRupay"], level: 3 };
  if (debit && !credit) {
    if (LOW.test(t)) return { keys: ["debitLow"], level: 3 };
    if (HIGH.test(t)) return { keys: ["debitHigh"], level: 3 };
    return { keys: ["debitLow", "debitHigh"], level: 2 };
  }
  if (credit && !debit) {
    const map = { visa: "creditVisa", mastercard: "creditMastercard", rupay: "creditRupay" } as const;
    if (nets.length) return { keys: nets.map((n) => map[n]), level: 3 };
    return { keys: ["creditVisa", "creditMastercard", "creditRupay"], level: 2 };
  }
  if (/\bupi\b/.test(t)) return { keys: ["upi"], level: 3 };
  if (/net ?banking|internet banking|\bnb\b/.test(t)) return { keys: ["netbanking"], level: 3 };
  if (/wallet/.test(t)) return { keys: ["wallet"], level: 3 };
  if (/\bemi\b|pay ?later|bnpl|cardless/.test(t)) return { keys: ["emi"], level: 3 };
  if ((debit && credit) || /\bcards?\b/.test(t)) return { keys: ["debitLow", "debitHigh", "creditVisa", "creditMastercard", "creditRupay"], level: 1 };
  if (/all (?:other )?(?:payment )?(?:methods|modes|instruments|options)|standard (?:rate|plan|pricing)|default rate|flat rate|any other|^others?\b/.test(t)) {
    return { keys: INSTRUMENTS.map((i) => i.key), level: 0 };
  }
  return null;
}

/** The percent on a line, ignoring the ₹2,000 slab. "Nil", "zero" and "free" are 0. */
function percentIn(t: string, tableHint: boolean): number | null {
  const m = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return num(m[1]);
  if (/\b(nil|zero|free|no charge|waived|0 ?mdr)\b/.test(t)) return 0;
  if (tableHint) {
    // a table cell with a bare number like "1.75", after the slab amount is taken out
    const cells = t.replace(new RegExp(SLAB, "gi"), " ").split("|").map((c) => c.trim());
    for (const c of cells.slice(1)) if (/^\d{1,2}(?:\.\d+)?$/.test(c) && num(c) <= 10) return num(c);
  }
  return null;
}

/** A fixed rupee fee on top: "+ ₹3", "plus Rs 2 per transaction", "₹5/txn". */
function fixedIn(t: string): number | null {
  const m =
    t.match(new RegExp(String.raw`(?:\+|plus)\s*${RUPEE}?\s*(\d+(?:\.\d+)?)`, "i")) ??
    t.match(new RegExp(String.raw`${RUPEE}\s*(\d+(?:\.\d+)?)\s*(?:/|per)\s*(?:txn|transaction|payment)`, "i"));
  return m ? num(m[1]) : null;
}

export function extractGateway(lines: string[]): Extraction {
  const values: Record<string, string> = {};
  const notes: Record<string, string> = {};
  const level: Record<string, number> = {};
  const tableHint = lines.some((l) => /mdr|tdr|rate|pricing|fee|charges?/i.test(l) && /%/.test(l)) || lines.some((l) => /\(%\)|in %|%\s*\|/i.test(l));
  let lastFamily: "debit" | "" = "";
  const unclear: Partial<Record<Instrument, string>> = {};
  for (const raw of lines) {
    const t = raw.toLowerCase();
    const settle = t.match(/t ?\+ ?(\d{1,2})\b/) ?? (/settle|payout/.test(t) ? t.match(/within (\d{1,2}) (?:working |business )?days?/) : null);
    if (settle && /settle|payout|t ?\+/.test(t) && !/remit|cod/.test(t)) {
      values.settleDays = settle[1];
      notes.settleDays = raw;
    }
    if (/\bgst\b|tax/.test(t) && !/\bupi\b|card|banking|wallet|emi/.test(t)) {
      const g = t.match(/(\d+(?:\.\d+)?)\s*%/);
      if (g && num(g[1]) >= 5 && num(g[1]) <= 28) {
        values.gstPct = fmt(num(g[1]));
        notes.gstPct = raw;
      }
      continue;
    }
    let hit = methodsIn(t);
    // "above Rs 2000 - 0.85%" on its own line, right after a debit card line
    if (!hit && lastFamily === "debit") hit = LOW.test(t) ? { keys: ["debitLow"], level: 3 } : HIGH.test(t) ? { keys: ["debitHigh"], level: 3 } : null;
    if (!hit) continue;
    lastFamily = hit.keys.every((k) => k.startsWith("debit")) ? "debit" : "";
    const pct = percentIn(t, tableHint || raw.includes("|"));
    if (pct === null || pct > 10) {
      // a line about a method whose rate can't be read (a scan that dropped the decimal point, say):
      // better blank than a wrong number borrowed from a more general line
      if (hit.level >= 3 && /\d/.test(t)) for (const k of hit.keys) unclear[k] = raw;
      continue;
    }
    const fixed = fixedIn(t);
    for (const k of hit.keys) {
      if ((level[k] ?? -1) > hit.level) continue;
      level[k] = hit.level;
      values[pctKey(k)] = fmt(pct);
      notes[pctKey(k)] = raw;
      if (fixed !== null) {
        values[fixKey(k)] = fmt(fixed);
        notes[fixKey(k)] = raw;
      }
    }
  }
  for (const [k, line] of Object.entries(unclear) as [Instrument, string][]) {
    if ((level[k] ?? -1) >= 3) continue;
    delete values[pctKey(k)];
    delete values[fixKey(k)];
    notes[pctKey(k)] = `Couldn't read the rate clearly in: "${line}". Please type it in.`;
  }
  return { values, notes };
}

// ───────────── Couriers ─────────────

const ZONE_RE: [Zone, RegExp][] = [
  ["A", /zone[ -]?a\b|\bz[ _-]?a\b|within[ -]?city|intra[ -]?city|\blocal\b|same city/gi],
  ["B", /zone[ -]?b\b|\bz[ _-]?b\b|within[ -]?state|intra[ -]?state|regional|same state|within[ -]?zone/gi],
  ["C", /zone[ -]?c\b|\bz[ _-]?c\b|metro(?:[ -]?to[ -]?metro|s)?\b/gi],
  ["D", /zone[ -]?d\b|\bz[ _-]?d\b|rest of india|\broi\b|national/gi],
  ["E", /zone[ -]?e\b|\bz[ _-]?e\b|special(?: zone)?s?|north[ -]?east|\bne\b|j ?& ?k|jammu|kashmir/gi],
];

/** Zones named in a line, in the order they appear. */
function zonesIn(t: string): Zone[] {
  const found: { z: Zone; at: number }[] = [];
  for (const [z, re] of ZONE_RE) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m) found.push({ z, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.z);
}

/** Rupee amounts on a line, with weights ("0.5 kg", "500 g") and the zone letters taken out. */
function amountsIn(t: string): number[] {
  const stripped = t
    .replace(/\b\d+(?:\.\d+)?\s*(?:kgs?|kilo(?:gram)?s?|g|gms?|grams?)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*%/g, " ")
    .replace(/t ?\+ ?\d+/gi, " ");
  return [...stripped.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g)].map((m) => num(m[1])).filter((n) => n >= 5 && n < 5000);
}

export function extractCourier(lines: string[]): Extraction {
  const values: Record<string, string> = {};
  const notes: Record<string, string> = {};
  const set = (k: string, v: number, line: string) => {
    values[k] = fmt(v);
    notes[k] = line;
  };
  let header: Zone[] | null = null;
  const rto: number[] = [];
  for (const raw of lines) {
    const t = raw.toLowerCase();
    const zones = zonesIn(t);

    // a header row naming several zones: the rows under it give one amount per zone
    if (zones.length >= 3) {
      header = zones;
      const amounts = amountsIn(t);
      if (amounts.length >= zones.length) zones.forEach((z, i) => { set(zoneKey(z, "first"), amounts[i], raw); });
      continue;
    }

    if (/\bcod\b|cash on delivery/.test(t) && !/remit|cycle|payout|paid within|t ?\+/.test(t)) {
      const p = t.match(/(\d+(?:\.\d+)?)\s*%/);
      if (p) set("codPct", num(p[1]), raw);
      const mins = amountsIn(t).filter((n) => !p || n !== num(p[1]));
      if (mins.length) set("codMin", mins[0], raw);
      continue;
    }
    if (/\brto\b|return to origin|return charge|reverse/.test(t)) {
      const p = t.match(/(\d+(?:\.\d+)?)\s*%/);
      if (p) set("rtoPct", num(p[1]), raw);
      else if (/same as (?:the )?forward|equal to (?:the )?forward|forward (?:rate|charge)s? (?:apply|applicable)/.test(t)) set("rtoPct", 100, raw);
      else if (header && zones.length < 3) {
        const a = amountsIn(t);
        if (a.length >= header.length) header.forEach((z, i) => rto.push(z && values[zoneKey(z, "first")] ? (a[i] / Number(values[zoneKey(z, "first")])) * 100 : NaN));
      }
      continue;
    }
    if (/dispute/.test(t)) {
      const d = t.match(/(\d{1,2})\s*(?:working |business )?days?/);
      if (d) set("weightDisputeDays", num(d[1]), raw);
      continue;
    }
    if (/remit|cod (?:cycle|payout|payment)|paid within/.test(t)) {
      const d = t.match(/t ?\+ ?(\d{1,2})/) ?? t.match(/(\d{1,2})\s*(?:working |business )?days?/);
      if (d) set("codPayDays", num(d[1]), raw);
      continue;
    }

    const extra = /add(?:'|itional|l\.?)?|extra|each|every|subsequent|incremental/.test(t);
    if (header && zones.length === 0) {
      const a = amountsIn(t);
      if (a.length >= header.length) {
        header.forEach((z, i) => set(zoneKey(z, extra ? "extra" : "first"), a[i], raw));
        // a "first 500 g" row with no "extra" row yet: assume the same until one appears
        if (!extra) header.forEach((z) => { if (!values[zoneKey(z, "extra")]) { values[zoneKey(z, "extra")] = values[zoneKey(z, "first")]; notes[zoneKey(z, "extra")] = `${raw} (no separate rate for each extra 500 g, so the same is used)`; } });
      }
      continue;
    }
    if (zones.length === 1) {
      const a = amountsIn(t);
      const z = zones[0];
      if (a.length >= 2) {
        set(zoneKey(z, "first"), a[0], raw);
        set(zoneKey(z, "extra"), a[1], raw);
      } else if (a.length === 1) {
        set(zoneKey(z, extra ? "extra" : "first"), a[0], raw);
        if (!extra && !values[zoneKey(z, "extra")]) { values[zoneKey(z, "extra")] = fmt(a[0]); notes[zoneKey(z, "extra")] = `${raw} (no separate rate for each extra 500 g, so the same is used)`; }
      }
    }
  }
  const okRto = rto.filter((x) => Number.isFinite(x));
  if (!values.rtoPct && okRto.length && okRto.every((x) => Math.abs(x - okRto[0]) < 1)) {
    values.rtoPct = fmt(Math.round(okRto[0]));
    notes.rtoPct = "Worked out from the return charges by zone";
  }
  // keep only keys the rate card knows
  const known = new Set([...ZONES.flatMap((z) => [zoneKey(z, "first"), zoneKey(z, "extra")]), ...COURIER_EXTRA_FIELDS.map((f) => f.key)]);
  for (const k of Object.keys(values)) if (!known.has(k)) { delete values[k]; delete notes[k]; }
  return { values, notes };
}

export function extractRates(lines: string[], type: PartnerType): Extraction {
  return type === "gateway" ? extractGateway(lines) : extractCourier(lines);
}

/** Rebuild lines from PDF text pieces: same height = same line, a wide gap = a new table cell. */
export function linesFromPdfItems(items: { str: string; x: number; y: number; w: number }[]): string[] {
  const rows: { y: number; items: typeof items }[] = [];
  for (const it of items.filter((i) => i.str.trim())) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= 3);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      const sorted = r.items.sort((a, b) => a.x - b.x);
      let out = "";
      let end = -Infinity;
      for (const it of sorted) {
        const gap = it.x - end;
        out += out ? (gap > 12 ? " | " : gap > 1.5 ? " " : "") : "";
        out += it.str.trim();
        end = it.x + it.w;
      }
      return clean(out);
    })
    .filter((l) => l.length > 1);
}
