import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { generateSample, toCsv } from "../src/sample/generate";
import { intakeTable, isReady, partnersIn, runAudit } from "../src/engine/intake";
import { buildClaims, findingsCsv } from "../src/engine/claims";
import { addWorkingDays, extractRefs, parseDate, parseMoney } from "../src/engine/util";
import type { Settings, Table } from "../src/engine/types";
import {
  exampleCard, gatewayFromShopify, guessPartner, isCardReady, missingRates, PARTNERS, ratesFromCards, zoneFrom,
} from "../src/engine/partners";
import { fieldsFor, SPEC_BY_KIND } from "../src/engine/detect";
import { expectedFee, gatewayRates, instrumentsFor, methodFromFileName } from "../src/engine/instruments";

const sample = generateSample();
const rates: Partial<Settings> = { asOf: sample.asOf, ...ratesFromCards(sample.cards) };
// Round-trip through CSV text so the test sees exactly what a founder's upload would look like.
const csvTables = sample.files.map((f) => ({
  ...f,
  csv: Papa.parse<string[]>(toCsv(f.table), { skipEmptyLines: false }).data as Table,
}));
const intakes = csvTables.map((f) => intakeTable(f.name, f.csv));
const result = runAudit(intakes, rates);

describe("file recognition", () => {
  it("recognises every sample file as the right kind, from the right partner", () => {
    for (let i = 0; i < csvTables.length; i++) {
      expect(intakes[i].kind, csvTables[i].name).toBe(csvTables[i].kind);
      expect(intakes[i].partner, csvTables[i].name).toBe(csvTables[i].partner);
      expect(isReady(intakes[i]), csvTables[i].name).toBe(true);
    }
    expect(partnersIn(intakes)).toEqual(["razorpay", "payu", "shiprocket", "delhivery"]);
  });

  it("reads Delhivery weights in grams and its own column names", () => {
    const dl = intakes.find((i) => i.partner === "delhivery" && i.kind === "courier_shipments")!;
    const headers = dl.table[0] as string[];
    expect(headers[dl.map.awb]).toBe("Waybill");
    expect(headers[dl.map.freight]).toBe("Freight Charge");
  });

  it("asks who sent a courier or gateway file when nothing points to a partner", () => {
    const sr = csvTables.find((f) => f.name === "shiprocket_cod_remittance.csv")!;
    const renamed = intakeTable("export_2026.csv", [["Order", "Tracking Number", "Remitted Amount", "Paid On"], ["1001", "123456789012", "500", "01/09/2026"]]);
    expect(renamed.kind).toBe("courier_cod");
    expect(renamed.partner).toBeNull();
    expect(isReady(renamed)).toBe(false);
    const fixed = intakeTable("export_2026.csv", renamed.table, { kind: "courier_cod", partner: "ekart" });
    expect(isReady(fixed)).toBe(true);
    expect(intakeTable("export.csv", sr.csv).partner).toBe("shiprocket"); // known from its columns
  });

  it("finds the bank header below the statement title rows", () => {
    const bank = intakes.find((i) => i.kind === "bank")!;
    expect(bank.headerRow).toBe(3);
  });
});

describe("audit on sample data", () => {
  it("finds every planted leak with the exact amount, type and partner", () => {
    for (const p of sample.planted) {
      const f = result.findings.find((x) => x.id === p.id);
      expect(f, `missing planted finding ${p.id} (${p.note})`).toBeDefined();
      expect(f!.kind, p.id).toBe(p.kind);
      expect(f!.amount, p.id).toBeCloseTo(p.amount, 2);
      expect(f!.partner, p.id).toBe(p.partner);
    }
  });

  it("flags nothing that wasn't planted", () => {
    const plantedIds = new Set(sample.planted.map((p) => p.id));
    const extra = result.findings.filter((f) => !plantedIds.has(f.id));
    expect(extra.map((f) => `${f.id}: ${f.title}`)).toEqual([]);
  });

  it("totals add up", () => {
    const claim = sample.planted.filter((p) => p.kind === "claim").reduce((a, p) => a + p.amount, 0);
    expect(result.claimTotal).toBeCloseTo(claim, 2);
    for (const b of result.buckets) expect(b.ran, b.id).toBe(true);
  });

  it("reports weight charges already lost as an insight, not a finding", () => {
    expect(result.insights.some((i) => i.title === "Weight charges already lost")).toBe(true);
  });

  it("splits findings by partner and adds up to the combined totals", () => {
    expect(result.partners.map((p) => p.id)).toEqual(["razorpay", "payu", "shiprocket", "delhivery"]);
    const claim = result.partners.reduce((a, p) => a + p.claimTotal, 0);
    const check = result.partners.reduce((a, p) => a + p.checkTotal, 0);
    expect(claim).toBeCloseTo(result.claimTotal, 2);
    expect(check).toBeCloseTo(result.checkTotal, 2);
    for (const p of result.partners) {
      const planted = sample.planted.filter((x) => x.partner === p.id && x.kind === "claim").reduce((a, x) => a + x.amount, 0);
      expect(p.claimTotal, p.id).toBeCloseTo(planted, 2);
    }
    expect(result.partners.find((p) => p.id === "delhivery")!.missingFiles).toEqual(["courier_weight"]);
  });

  it("checks charges against each partner's own rate card", () => {
    // Delhivery is booked directly, so a rate card gap is a claim; Shiprocket prices vary by courier, so it's a check
    expect(result.findings.filter((f) => f.id.startsWith("rate_freight:") && f.partner === "delhivery").every((f) => f.kind === "claim")).toBe(true);
    expect(result.findings.filter((f) => f.id.startsWith("rate_freight:") && f.partner === "shiprocket").every((f) => f.kind === "check")).toBe(true);
    const noCards = runAudit(intakes, { asOf: sample.asOf });
    expect(noCards.findings.some((f) => f.id.startsWith("rate_"))).toBe(false);
    expect(noCards.notes.join(" ")).toMatch(/Delhivery rate card/);
  });

  it("uses each gateway's own rates for the fee check", () => {
    // with every PayU rate two points higher, none of its payments should look overcharged
    const payu = rates.gateway!.payu;
    const higher = { ...payu, pct: Object.fromEntries(Object.entries(payu.pct).map(([k, v]) => [k, v + 2])) as typeof payu.pct };
    const r = runAudit(intakes, { ...rates, gateway: { ...rates.gateway!, payu: higher } });
    expect(r.findings.filter((f) => f.partner === "payu" && f.id.startsWith("fee:")).length).toBe(0);
  });

  it("builds one claim email per partner with only claim items", () => {
    const drafts = buildClaims(result, "Indigo Loom");
    expect(drafts.map((d) => d.counterparty).sort()).toEqual(["Delhivery", "PayU", "Razorpay", "Shiprocket"]);
    const total = drafts.reduce((a, d) => a + d.total, 0);
    expect(total).toBeCloseTo(result.claimTotal, 2);
    expect(drafts[0].body).toContain("Indigo Loom");
  });

  it("exports a CSV with one row per finding", () => {
    const csv = findingsCsv(result);
    expect(csv.split("\n").length).toBe(result.findings.length + 1);
  });
});

describe("partial uploads", () => {
  it("runs with only Shopify + COD remittance and explains what's missing", () => {
    const pick = intakes.filter((i) => i.kind === "shopify_orders" || i.kind === "courier_cod");
    const r = runAudit(pick, rates);
    expect(r.buckets.find((b) => b.id === "cod_unpaid")!.ran).toBe(true);
    expect(r.buckets.find((b) => b.id === "shipping_overcharge")!.ran).toBe(false);
    expect(r.notes.join(" ")).toMatch(/shipments file/i);
    // short payments are still found
    for (const p of sample.planted.filter((p) => p.id.startsWith("cod_short"))) {
      expect(r.findings.some((f) => f.id === p.id)).toBe(true);
    }
  });

  it("runs on gateway files alone (fee and GST checks need nothing else)", () => {
    const r = runAudit(intakes.filter((i) => i.kind === "gateway_settlements"), rates);
    const feeIds = sample.planted.filter((p) => p.id.startsWith("fee:") || p.id.startsWith("gst:")).map((p) => p.id);
    for (const id of feeIds) expect(r.findings.some((f) => f.id === id), id).toBe(true);
  });

  it("returns an empty, valid result when nothing is uploaded", () => {
    const r = runAudit([], { asOf: sample.asOf });
    expect(r.claimTotal).toBe(0);
    expect(r.findings).toEqual([]);
  });
});

describe("robustness", () => {
  it("converts Razorpay amounts given in paise", () => {
    const rzp = csvTables.find((f) => f.partner === "razorpay")!.csv.map((row, i) =>
      i === 0 ? row : row.map((c, j) => ([2, 3, 4, 6, 7].includes(j) && c !== "" ? String(Math.round(parseFloat(String(c)) * 100)) : c)),
    );
    const ins = [intakes.find((i) => i.kind === "shopify_orders")!, intakeTable("rzp_paise.csv", rzp)];
    const r = runAudit(ins, rates);
    expect(r.notes.join(" ")).toMatch(/Razorpay amounts looked like paise/);
    const feeIds = sample.planted.filter((p) => p.id.startsWith("fee:") && p.partner === "razorpay").map((p) => p.id);
    for (const id of feeIds) expect(r.findings.some((f) => f.id === id), id).toBe(true);
  });

  it("lets a founder map an unrecognised file by hand", () => {
    const weird: Table = [["Tracking", "Money paid", "Paid date"], ["1234567890123", "500", "01/09/2026"]];
    expect(intakeTable("x.csv", weird).kind).toBeNull();
    const manual = intakeTable("x.csv", weird, { kind: "courier_cod", overrides: { awb: 0, remitted: 1, remittedAt: 2 } });
    expect(isReady(manual)).toBe(false); // still needs to know which courier sent it
    expect(isReady({ ...manual, partner: "other_courier" })).toBe(true);
  });

  it("does not crash on junk", () => {
    const junk: Table = [["hello"], [], ["a", "b", "c"], [1, 2, 3]];
    const i = intakeTable("junk.csv", junk);
    expect(i.kind).toBeNull();
    expect(() => runAudit([i])).not.toThrow();
  });
});

describe("parsers", () => {
  it("reads Indian money formats", () => {
    expect(parseMoney("₹1,23,456.50")).toBe(123456.5);
    expect(parseMoney("Rs. 450")).toBe(450);
    expect(parseMoney("(120.00)")).toBe(-120);
    expect(parseMoney("450 Dr")).toBe(-450);
    expect(parseMoney("450 Cr")).toBe(450);
    expect(Number.isNaN(parseMoney(""))).toBe(true);
  });

  it("reads day-first dates and other common formats", () => {
    expect(parseDate("06/09/2026")!.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(parseDate("06/09/26")!.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(parseDate("06 Sep 2026")!.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(parseDate("06-Sep-2026")!.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(parseDate("2026-09-06 14:23:11 +0530")!.toISOString().slice(0, 10)).toBe("2026-09-06");
    expect(parseDate(46271)!.toISOString().slice(0, 10)).toBe("2026-09-06"); // Excel serial
  });

  it("counts working days Monday to Saturday", () => {
    // Fri 2 Oct 2026 + 2 working days = Mon 5 Oct (Sunday skipped)
    expect(addWorkingDays(new Date(Date.UTC(2026, 9, 2)), 2).toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("reads zone names the way couriers write them", () => {
    expect(zoneFrom("z_a")).toBe("A");
    expect(zoneFrom("Zone C")).toBe("C");
    expect(zoneFrom("Within State")).toBe("B");
    expect(zoneFrom("Metro to Metro")).toBe("C");
    expect(zoneFrom("Rest of India")).toBe("D");
    expect(zoneFrom("Special Zone (NE, J&K)")).toBe("E");
    expect(zoneFrom("")).toBeNull();
  });

  it("pulls UTRs out of bank narrations", () => {
    expect(extractRefs("NEFT CR-UTIB0000100-RAZORPAY-UTIB123456789012")).toContain("UTIB123456789012");
  });
});

import { runAuditFull } from "../src/engine/intake";
import { buildTrail } from "../src/engine/trail";

describe("order trail", () => {
  const { result: r, data } = runAuditFull(intakes, rates);
  const trail = buildTrail(data, r);

  it("has one row per Shopify order", () => {
    expect(trail.length).toBe(data.orders.length);
  });

  it("marks every order touched by a planted claim as a leak", () => {
    const leakOrders = r.findings.filter((f) => f.kind === "claim" && f.orderId).map((f) => f.orderId);
    for (const id of leakOrders) expect(trail.find((t) => t.orderId === id)?.state, id).toBe("leak");
  });

  it("marks most delivered orders as fully matched", () => {
    const matched = trail.filter((t) => t.state === "matched").length;
    expect(matched / trail.length).toBeGreaterThan(0.4);
  });
});

describe("order trail across partners", () => {
  const { result: r, data } = runAuditFull(intakes, rates);
  const trail = buildTrail(data, r);
  it("names the courier and gateway on each order", () => {
    expect(new Set(trail.map((t) => t.courierPartner).filter(Boolean))).toEqual(new Set(["shiprocket", "delhivery"]));
    expect(new Set(trail.map((t) => t.gatewayPartner).filter(Boolean))).toEqual(new Set(["razorpay", "payu"]));
  });
});

describe("partner library", () => {
  it("every partner's own column names are recognised as that partner's file", () => {
    for (const p of PARTNERS) {
      if (!p.fileHint) continue;
      for (const [kind, cols] of Object.entries(p.columns)) {
        const spec = SPEC_BY_KIND[kind as keyof typeof SPEC_BY_KIND];
        const fields = fieldsFor(spec.kind, p.id);
        // header: the partner's first name for each field it defines, then generic names for any other required field
        const header: string[] = [];
        for (const f of fields) {
          const own = cols[f.key]?.[0];
          if (own) header.push(own);
          else if (spec.required.some((alts) => alts[0] === f.key)) header.push(f.synonyms[0]);
        }
        header.push("Internal tag", "Batch label"); // real exports always have a few columns ReconOS doesn't use
        const row = header.map(() => "100");
        const it = intakeTable(`${p.id}_report.csv`, [header, row]);
        expect(it.kind, `${p.id} ${kind}: ${header.join(", ")}`).toBe(kind);
        expect(it.partner, `${p.id} ${kind}`).toBe(p.id);
        expect(it.missing, `${p.id} ${kind}`).toEqual([]);
      }
    }
  });

  it("knows gateways by the name Shopify gives them", () => {
    expect(gatewayFromShopify("Razorpay Secure (UPI, Cards, Wallets, NetBanking)")).toBe("razorpay");
    expect(gatewayFromShopify("PayU India")).toBe("payu");
    expect(gatewayFromShopify("Cashfree Payments")).toBe("cashfree");
    expect(gatewayFromShopify("PhonePe Payment Gateway")).toBe("phonepe");
    expect(gatewayFromShopify("Paytm Payment Gateway")).toBe("paytm");
    expect(gatewayFromShopify("Cash on Delivery (COD)")).toBeNull();
  });

  it("guesses a partner from the file name", () => {
    expect(guessPartner("Cashfree_settlement_Sep.csv", [], "gateway")).toBe("cashfree");
    expect(guessPartner("delhivery-billing.xlsx", [], "courier")).toBe("delhivery");
    expect(guessPartner("report.csv", [], "courier")).toBeNull();
  });

  it("needs every rate filled in and confirmed before a rate card counts", () => {
    const ex = exampleCard("delhivery");
    expect(missingRates(ex)).toEqual([]);
    expect(isCardReady(ex)).toBe(false); // example rates must be confirmed
    expect(isCardReady({ ...ex, confirmed: true })).toBe(true);
    const blank = { ...ex, confirmed: true, values: { ...ex.values, zoneC_first: "" } };
    expect(missingRates(blank)).toEqual(["zoneC_first"]);
    expect(isCardReady(blank)).toBe(false);
    expect(missingRates({ ...ex, values: { ...ex.values, codPct: "150" } })).toEqual(["codPct"]);
  });
});

describe("payment method rates", () => {
  const pay = (method: string, cardType = "", cardNetwork = "", amount = 1000, international = false) => ({ method, cardType, cardNetwork, amount, international });
  it("picks the right rate for each method", () => {
    expect(instrumentsFor(pay("upi"))).toEqual(["upi"]);
    expect(instrumentsFor(pay("netbanking"))).toEqual(["netbanking"]);
    expect(instrumentsFor(pay("net_banking"))).toEqual(["netbanking"]); // Cashfree's payment_group
    expect(instrumentsFor(pay("NB"))).toEqual(["netbanking"]); // PayU's mode
    expect(instrumentsFor(pay("card", "debit", "visa", 2000))).toEqual(["debitLow"]);
    expect(instrumentsFor(pay("card", "debit", "visa", 2000.5))).toEqual(["debitHigh"]);
    expect(instrumentsFor(pay("dc", "", "MAST", 5000))).toEqual(["debitHigh"]);
    expect(instrumentsFor(pay("card", "debit", "rupay", 5000))).toEqual(["debitRupay"]);
    expect(instrumentsFor(pay("credit_card", "", "visa"))).toEqual(["creditVisa"]);
    expect(instrumentsFor(pay("cc", "", "MAST"))).toEqual(["creditMastercard"]);
    expect(instrumentsFor(pay("card", "credit", "rupay"))).toEqual(["creditRupay"]);
    expect(instrumentsFor(pay("card", "credit", "amex"))).toEqual(["amex"]);
    expect(instrumentsFor(pay("card", "", "diners club"))).toEqual(["diners"]);
    expect(instrumentsFor(pay("card", "credit", "visa", 1000, true))).toEqual(["international"]);
    expect(instrumentsFor(pay("wallet"))).toEqual(["wallet"]);
    expect(instrumentsFor(pay("cardless_emi"))).toEqual(["emi"]);
  });

  it("checks a payment against its highest possible rate when the file doesn't say enough", () => {
    const rates = gatewayRates({ card: 1.8, upi: 0, debitLow: 0.4, debitHigh: 0.9, debitRupay: 0, creditRupay: 1.6 });
    // a Visa card with no credit/debit column could be a debit card (0.4%) or a credit card (1.8%)
    const e = expectedFee(pay("card", "", "visa", 1000), rates);
    expect(e.exact).toBe(false);
    expect(e.fee).toBe(18);
    expect(e.label).toMatch(/credit or debit not in the file/);
    // a fee of 0.4% on it is fine, even though it might have been a debit card
    expect(expectedFee(pay("card", "debit", "visa", 1000), rates).fee).toBe(4);
  });

  it("adds the fixed rupee fee for a method", () => {
    const rates = gatewayRates({ card: 1.8, upi: 0 });
    rates.fixed.netbanking = 5;
    expect(expectedFee(pay("netbanking", "", "", 1000), rates).fee).toBe(23);
  });

  it("reads which method a one-method file holds from its name", () => {
    expect(methodFromFileName("payu_upi_settlements.csv")).toBe("upi");
    expect(methodFromFileName("Cashfree-Cards-Sep.xlsx")).toBe("card");
    expect(methodFromFileName("netbanking_report.csv")).toBe("netbanking");
    expect(methodFromFileName("settlements_sep.csv")).toBe("");
    const upi = intakes.find((i) => i.name === "payu_upi_settlements.csv")!;
    expect(upi.map.method).toBeUndefined();
    expect(upi.methodHint).toBe("upi");
  });

  it("finds a debit card charged at the wrong ₹2,000 slab and a RuPay debit card that was charged", () => {
    for (const note of ["debit card charged at the above-₹2,000 rate", "fee on a RuPay debit card"]) {
      const planted = sample.planted.filter((p) => p.note === note);
      expect(planted.length, note).toBeGreaterThan(0);
      for (const p of planted) expect(result.findings.find((f) => f.id === p.id)?.reason, p.id).toMatch(/Debit card|RuPay debit/);
    }
  });
});
