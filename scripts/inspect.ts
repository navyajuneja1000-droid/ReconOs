/**
 * Check how ReconOS reads a real partner export.
 *
 *   npm run inspect -- path/to/file.csv
 *   npm run inspect -- path/to/file.xlsx --redact   (also writes an anonymised copy for tests/fixtures)
 *
 * Prints what the file was recognised as, which partner, which column each field came from,
 * what's still missing, and the first few records as ReconOS understood them.
 */
import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fieldsFor, missingRequired, SPEC_BY_KIND } from "../src/engine/detect";
import { intakeTable, isReady, needsPartner } from "../src/engine/intake";
import { normalise } from "../src/engine/normalize";
import { partnerName } from "../src/engine/partners";
import { toCsv } from "../src/sample/generate";
import type { Table } from "../src/engine/types";
import { normHeader } from "../src/engine/util";
import { loadTable } from "./loadTable";

const PERSONAL = ["name", "first name", "last name", "email", "phone", "mobile", "contact", "address", "address1", "address2", "city", "pincode", "pin code", "zip", "customer", "buyer", "consignee", "receiver", "gstin", "pan", "account number", "account no", "ifsc", "card number", "vpa", "upi id", "company"];
const isPersonal = (h: string) => PERSONAL.some((w) => new RegExp(`(^| )${w}( |$)`).test(h)) && !/courier|gateway|status|awb|lineitem|product|sku|item|file|bank name/.test(h);

/**
 * Keep headers, ids, amounts, dates and statuses; blank anything that identifies a person.
 * Columns ReconOS reads (`keep`) are never blanked, since the test needs them.
 */
export function redact(table: Table, headerRow: number, keep: Set<number>): Table {
  const heads = (table[headerRow] ?? []).map((h) => normHeader(String(h ?? "")));
  return table.map((row, i) => {
    if (i < headerRow) return row.map((c) => (String(c ?? "").trim() ? "REDACTED" : "")); // title rows often carry the account holder
    if (i === headerRow) return row;
    return row.map((c, j) => (!keep.has(j) && isPersonal(heads[j] ?? "") && String(c ?? "") !== "" ? "REDACTED" : c));
  });
}

async function main() {
  const [path, ...flags] = process.argv.slice(2);
  if (!path) {
    console.log("Usage: npm run inspect -- <file.csv|file.xlsx> [--redact]");
    process.exit(1);
  }
  const table = await loadTable(path);
  const intake = intakeTable(basename(path), table);
  const headers = (table[intake.headerRow] ?? []).map((h) => String(h ?? ""));
  console.log(`\nFile:       ${path}`);
  console.log(`Rows:       ${intake.rows} (header on row ${intake.headerRow + 1})`);
  console.log(`Recognised: ${intake.kind ? SPEC_BY_KIND[intake.kind].label : "NOT RECOGNISED"}`);
  if (intake.kind && needsPartner(intake)) console.log(`Partner:    ${intake.partner ? partnerName(intake.partner) : "NOT DETECTED (the founder must pick one)"}`);
  console.log(`Ready:      ${isReady(intake) ? "yes" : "no"}`);

  if (!intake.kind) {
    console.log("\nHeaders found:", headers.filter(Boolean).join(" | "));
    console.log("\nAdd these column names to the partner's `columns` in src/engine/partners.ts, then run this again.");
    return;
  }
  console.log("\nField                         Column");
  for (const f of fieldsFor(intake.kind, intake.partner)) {
    const col = intake.map[f.key];
    console.log(`${f.label.padEnd(30)}${col === undefined ? "–" : `${headers[col]} (column ${col + 1})`}`);
  }
  const used = new Set(Object.values(intake.map));
  const unused = headers.filter((h, i) => h && !used.has(i));
  if (unused.length) console.log(`\nColumns not used: ${unused.join(" | ")}`);
  const missing = missingRequired(intake.kind, intake.map);
  if (missing.length) console.log(`\nStill missing (need one of each): ${missing.map((alts) => alts.join(" or ")).join("; ")}`);

  if (isReady(intake)) {
    const ds = normalise([{ name: intake.name, kind: intake.kind, partner: intake.partner, table: intake.table, headerRow: intake.headerRow, map: intake.map }]);
    const records = { shopify_orders: ds.orders, courier_shipments: ds.shipments, courier_cod: ds.remittances, courier_weight: ds.weights, gateway_settlements: ds.gateway, bank: ds.bank }[intake.kind];
    console.log(`\nRead ${records.length} records. First three:`);
    console.dir(records.slice(0, 3), { depth: 3 });
    if (intake.kind === "courier_shipments") console.log(`Charges read: ${ds.charges.length}`);
    for (const n of ds.notes) console.log(`Note: ${n}`);
  }

  if (flags.includes("--redact")) {
    const out = path.replace(/\.(csv|xlsx|txt)$/i, "") + ".redacted.csv";
    writeFileSync(out, toCsv(redact(intake.table, intake.headerRow, new Set(Object.values(intake.map)))));
    console.log(`\nWrote an anonymised copy to ${out}. Open it and check nothing personal is left before committing it.`);
  }
}

main();
