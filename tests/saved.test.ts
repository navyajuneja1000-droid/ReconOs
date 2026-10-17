import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearSaved, loadSaved, storeSaved } from "../src/engine/saved";
import { disputeDays, reminderIcs } from "../src/components/WeightCheckView";

class MemStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
}

const g = globalThis as unknown as { window?: unknown };
let store: MemStore;
beforeEach(() => { store = new MemStore(); g.window = { localStorage: store }; });
afterEach(() => { delete g.window; });

describe("saved rates", () => {
  it("round-trips confirmed cards, brand and partners, without last month's notes", () => {
    storeSaved({
      cards: { razorpay: { partner: "razorpay", values: { pct_upi: "0", gstPct: "18" }, confirmed: true, example: false, notes: { pct_upi: "Charged on 40 of 40" } } },
      brand: "Indigo Loom",
      picked: ["razorpay", "shiprocket"],
    });
    const s = loadSaved()!;
    expect(s.brand).toBe("Indigo Loom");
    expect(s.picked).toEqual(["razorpay", "shiprocket"]);
    expect(s.cards.razorpay.values.gstPct).toBe("18");
    expect(s.cards.razorpay.confirmed).toBe(true);
    expect(s.cards.razorpay.notes).toBeUndefined();
  });

  it("drops unknown partners, empty cards and junk", () => {
    store.setItem("reconos.saved.v1", JSON.stringify({ cards: { nope: { values: { a: "1" } }, payu: { values: {} }, cashfree: "x" }, brand: 5, picked: ["nope", "payu"] }));
    expect(loadSaved()).toEqual({ cards: {}, brand: "", picked: ["payu"] });
    store.setItem("reconos.saved.v1", "{not json");
    expect(loadSaved()).toBeNull();
  });

  it("removes the entry when nothing is worth keeping, and on forget", () => {
    storeSaved({ cards: {}, brand: "A", picked: [] });
    expect(store.getItem("reconos.saved.v1")).not.toBeNull();
    storeSaved({ cards: {}, brand: " ", picked: [] });
    expect(store.getItem("reconos.saved.v1")).toBeNull();
    storeSaved({ cards: {}, brand: "A", picked: [] });
    clearSaved();
    expect(loadSaved()).toBeNull();
  });

  it("keeps working when storage is blocked", () => {
    g.window = { get localStorage() { throw new Error("blocked"); } };
    expect(() => storeSaved({ cards: {}, brand: "A", picked: [] })).not.toThrow();
    expect(loadSaved()).toBeNull();
  });
});

describe("weekly weight check", () => {
  it("uses the rate card's dispute days, else the courier's usual window", () => {
    expect(disputeDays("shiprocket", {})).toEqual({ days: 7, from: "usual" });
    expect(disputeDays("shiprocket", { shiprocket: { partner: "shiprocket", values: { weightDisputeDays: "5" }, confirmed: false, example: false } })).toEqual({ days: 5, from: "card" });
    expect(disputeDays("shiprocket", { shiprocket: { partner: "shiprocket", values: { weightDisputeDays: "" }, confirmed: false, example: false } }).from).toBe("usual");
  });

  it("makes a Monday and Thursday reminder starting on the next one", () => {
    const ics = reminderIcs(new Date(Date.UTC(2026, 9, 17)), "https://example.com/#weights"); // Sat 17 Oct 2026
    expect(ics).toContain("DTSTART:20261019T043000Z"); // Mon 19 Oct, 10 am IST
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TH");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(reminderIcs(new Date(Date.UTC(2026, 9, 22)), "x")).toContain("DTSTART:20261022T043000Z"); // a Thursday stays
  });
});
