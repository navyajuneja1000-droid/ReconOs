import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { generateSample, toCsv } from "../src/sample/generate";
import { intakeTable, isReady, runAudit } from "../src/engine/intake";
import { buildClaims, findingsCsv } from "../src/engine/claims";
import { addWorkingDays, extractRefs, parseDate, parseMoney } from "../src/engine/util";
import type { Table } from "../src/engine/types";

const sample = generateSample();
// Round-trip through CSV text so the test sees exactly what a founder's upload would look like.
const csvTables = sample.files.map((f) => ({
  ...f,
  csv: Papa.parse<string[]>(toCsv(f.table), { skipEmptyLines: false }).data as Table,
}));
const intakes = csvTables.map((f) => intakeTable(f.name, f.csv));
const result = runAudit(intakes, { asOf: sample.asOf });

describe("file recognition", () => {
  it("recognises every sample file as the right kind", () => {
    for (let i = 0; i < csvTables.length; i++) {
      expect(intakes[i].kind, csvTables[i].name).toBe(csvTables[i].kind);
      expect(isReady(intakes[i]), csvTables[i].name).toBe(true);
    }
  });

  it("finds the bank header below the statement title rows", () => {
    const bank = intakes.find((i) => i.kind === "bank")!;
    expect(bank.headerRow).toBe(3);
  });
});

describe("audit on sample data", () => {
  it("finds every planted leak with the exact amount and type", () => {
    for (const p of sample.planted) {
      const f = result.findings.find((x) => x.id === p.id);
      expect(f, `missing planted finding ${p.id} (${p.note})`).toBeDefined();
      expect(f!.kind, p.id).toBe(p.kind);
      expect(f!.amount, p.id).toBeCloseTo(p.amount, 2);
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

  it("builds one claim email per counterparty with only claim items", () => {
    const drafts = buildClaims(result, "Indigo Loom");
    expect(drafts.map((d) => d.counterparty).sort()).toEqual(["Razorpay", "Shiprocket"]);
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
    const r = runAudit(pick, { asOf: sample.asOf });
    expect(r.buckets.find((b) => b.id === "cod_unpaid")!.ran).toBe(true);
    expect(r.buckets.find((b) => b.id === "shipping_overcharge")!.ran).toBe(false);
    expect(r.notes.join(" ")).toMatch(/shipments file/i);
    // short payments are still found
    for (const p of sample.planted.filter((p) => p.id.startsWith("cod_short"))) {
      expect(r.findings.some((f) => f.id === p.id)).toBe(true);
    }
  });

  it("runs on Razorpay alone (fee and GST checks need nothing else)", () => {
    const r = runAudit(intakes.filter((i) => i.kind === "gateway_settlements"), { asOf: sample.asOf });
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
    const rzp = csvTables.find((f) => f.kind === "gateway_settlements")!.csv.map((row, i) =>
      i === 0 ? row : row.map((c, j) => ([2, 3, 4, 6, 7].includes(j) && c !== "" ? String(Math.round(parseFloat(String(c)) * 100)) : c)),
    );
    const ins = [intakes.find((i) => i.kind === "shopify_orders")!, intakeTable("rzp_paise.csv", rzp)];
    const r = runAudit(ins, { asOf: sample.asOf });
    expect(r.notes.join(" ")).toMatch(/paise/);
    const feeIds = sample.planted.filter((p) => p.id.startsWith("fee:")).map((p) => p.id);
    for (const id of feeIds) expect(r.findings.some((f) => f.id === id), id).toBe(true);
  });

  it("lets a founder map an unrecognised file by hand", () => {
    const weird: Table = [["Tracking", "Money paid", "Paid date"], ["1234567890123", "500", "01/09/2026"]];
    expect(intakeTable("x.csv", weird).kind).toBeNull();
    const manual = intakeTable("x.csv", weird, { kind: "courier_cod", overrides: { awb: 0, remitted: 1, remittedAt: 2 } });
    expect(isReady(manual)).toBe(true);
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

  it("pulls UTRs out of bank narrations", () => {
    expect(extractRefs("NEFT CR-UTIB0000100-RAZORPAY-UTIB123456789012")).toContain("UTIB123456789012");
  });
});

import { runAuditFull } from "../src/engine/intake";
import { buildTrail } from "../src/engine/trail";

describe("order trail", () => {
  const { result: r, data } = runAuditFull(intakes, { asOf: sample.asOf });
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
