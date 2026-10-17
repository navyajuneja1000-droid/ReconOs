import { PARTNER_BY_ID, type RateCard } from "./partners";

/**
 * Rates, brand name and partner list, kept in this browser's local storage so a brand doesn't
 * retype them every month. Files are never saved. Nothing here is sent anywhere.
 */
export interface Saved {
  cards: Record<string, RateCard>;
  brand: string;
  picked: string[];
}

const KEY = "reconos.saved.v1";

const hasValues = (c: RateCard) => Object.values(c.values).some((v) => String(v).trim() !== "");

function clean(raw: unknown): Saved | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const cards: Record<string, RateCard> = {};
  if (r.cards && typeof r.cards === "object") {
    for (const [id, c] of Object.entries(r.cards as Record<string, unknown>)) {
      if (!PARTNER_BY_ID[id] || !c || typeof c !== "object") continue;
      const card = c as Partial<RateCard>;
      if (!card.values || typeof card.values !== "object") continue;
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(card.values)) if (typeof v === "string" || typeof v === "number") values[k] = String(v);
      // notes describe last month's files, so they're dropped
      const next: RateCard = { partner: id, values, confirmed: card.confirmed === true, example: card.example === true, source: card.source };
      if (hasValues(next)) cards[id] = next;
    }
  }
  const brand = typeof r.brand === "string" ? r.brand.slice(0, 120) : "";
  const picked = Array.isArray(r.picked) ? r.picked.filter((p): p is string => typeof p === "string" && !!PARTNER_BY_ID[p]) : [];
  return { cards, brand, picked };
}

export function loadSaved(): Saved | null {
  try {
    const text = window.localStorage.getItem(KEY);
    if (!text) return null;
    return clean(JSON.parse(text));
  } catch {
    return null;
  }
}

export function isEmpty(s: Saved): boolean {
  return !Object.keys(s.cards).length && !s.brand.trim() && !s.picked.length;
}

/** Save, or remove the entry when there's nothing worth keeping. */
export function storeSaved(s: Saved): void {
  try {
    const c = clean(s);
    if (!c || isEmpty(c)) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // storage blocked (private window, site data off): the tool still works, it just won't remember
  }
}

export function clearSaved(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
