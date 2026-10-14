// Small, dependency-free helpers for reading messy Indian finance exports.

export const DAY_MS = 86_400_000;

/** Lowercase, keep letters/digits, collapse whitespace. "Deposit Amt." -> "deposit amt" */
export function normHeader(h: string): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Order ids from different systems ("#10023", "10023", " #10023 ") collapse to one key. */
export function normOrderId(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "");
}

/** AWB / tracking numbers: uppercase letters and digits only. */
export function normAwb(v: unknown): string {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Parse a money cell. Handles "₹1,23,456.50", "Rs. 450", "(120.00)", "450 Cr", "450 Dr", "-12".
 * Returns NaN when the cell is empty or not a number.
 */
export function parseMoney(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  if (/\bdr\.?$/i.test(s)) {
    sign = -1;
    s = s.replace(/\bdr\.?$/i, "");
  }
  s = s.replace(/\bcr\.?$/i, "");
  s = s.replace(/₹|rs\.?|inr/gi, "").replace(/[,\s]/g, "");
  if (s.startsWith("-")) {
    sign *= -1;
    s = s.slice(1);
  }
  if (!/^\d*\.?\d+$/.test(s)) return NaN;
  return sign * parseFloat(s);
}

/** Money cell that treats blanks as zero. */
export function money0(v: unknown): number {
  const n = parseMoney(v);
  return Number.isFinite(n) ? n : 0;
}

/** Round to paise to avoid floating point noise. */
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse dates the way Indian exports write them. Day-first is assumed for slashed dates
 * (06/09/2026 is 6 September). Returns a UTC-midnight-based Date (time kept when present) or null.
 */
export function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    if (v > 1e9 && v < 1e11) return new Date(v * 1000); // unix seconds
    if (v > 1e11) return new Date(v); // unix ms
    if (v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * DAY_MS); // Excel serial
    return null;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s, 10) * 1000);

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return mk(+m[1], +m[2] - 1, +m[3], m[4], m[5], m[6]);

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    let hh = m[4];
    if (hh && m[7]) {
      let h = +hh % 12;
      if (m[7].toLowerCase() === "pm") h += 12;
      hh = String(h);
    }
    return mk(y, +m[2] - 1, +m[1], hh, m[5], m[6]);
  }

  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,4})[a-z]*[\s-,]+(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return mk(y, MONTHS[m[2].toLowerCase()], +m[1], m[4], m[5], m[6]);
  }

  m = s.match(/^([A-Za-z]{3,4})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return mk(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);

  return null;
}

function mk(y: number, mo: number, d: number, h?: string, mi?: string, se?: string): Date | null {
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo, d, h ? +h : 0, mi ? +mi : 0, se ? +se : 0));
  return isNaN(dt.getTime()) ? null : dt;
}

/** Whole days from a to b (b - a), using calendar days. */
export function daysBetween(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / DAY_MS);
}

/**
 * Add working days, counting Monday to Saturday (Sundays skipped). Counting Saturdays makes the
 * deadline earlier, never later, so founders are warned on the safe side.
 */
export function addWorkingDays(start: Date, n: number): Date {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) added++;
  }
  return d;
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtINR(n: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? !Number.isInteger(r2(n));
  return "₹" + r2(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

/** Pull candidate UTR / bank reference numbers out of a narration line. */
export function extractRefs(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text ?? "").toUpperCase().matchAll(/[A-Z0-9]{10,24}/g)) {
    if (/\d{6,}/.test(m[0])) out.add(m[0]);
  }
  return [...out];
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
