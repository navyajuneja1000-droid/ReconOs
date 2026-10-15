// Runs every real (anonymised) partner export in tests/fixtures through file recognition.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { intakeTable, isReady } from "../src/engine/intake";
import { normalise } from "../src/engine/normalize";
import { loadTable } from "../scripts/loadTable";

const ROOT = join(__dirname, "fixtures");
const dirs = (p: string) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()) : []);
const cases: { partner: string; kind: string; file: string }[] = [];
for (const partner of dirs(ROOT)) {
  for (const kind of dirs(join(ROOT, partner))) {
    for (const file of readdirSync(join(ROOT, partner, kind))) {
      if (/\.(csv|xlsx)$/i.test(file)) cases.push({ partner, kind, file: join(ROOT, partner, kind, file) });
    }
  }
}

describe("real partner files", () => {
  it.skipIf(cases.length > 0)("none added yet (see tests/fixtures/README.md)", () => {});

  for (const c of cases) {
    it(`${c.partner}/${c.kind}: ${c.file.split("/").pop()}`, async () => {
      const intake = intakeTable(c.file.split("/").pop()!, await loadTable(c.file));
      expect(intake.kind).toBe(c.kind);
      if (!["shopify", "bank"].includes(c.partner)) expect(intake.partner).toBe(c.partner);
      expect(intake.missing).toEqual([]);
      expect(isReady(intake)).toBe(true);
      const ds = normalise([{ name: intake.name, kind: intake.kind!, partner: intake.partner, table: intake.table, headerRow: intake.headerRow, map: intake.map }]);
      const n = ds.orders.length + ds.shipments.length + ds.remittances.length + ds.weights.length + ds.gateway.length + ds.bank.length;
      expect(n).toBeGreaterThan(0);
    });
  }
});
