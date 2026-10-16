// Reads sample rate cards in every shape a brand might have (PDF addendum, screenshot,
// spreadsheet, pasted email) and checks the rates come out right.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractRates } from "../src/engine/rateExtract";
import { readRateDocNode } from "../scripts/readRateDocNode";

const DIR = join(__dirname, "fixtures/rate-cards");
const expected = JSON.parse(readFileSync(join(DIR, "expected.json"), "utf8")) as Record<string, { type: "gateway" | "courier"; values: Record<string, string> }>;

describe("reading rate cards from documents", () => {
  for (const [file, want] of Object.entries(expected)) {
    it(`reads ${file}`, async () => {
      const lines = await readRateDocNode(join(DIR, file));
      const got = extractRates(lines, want.type);
      const wrong = Object.entries(want.values).filter(([k, v]) => got.values[k] !== v).map(([k, v]) => `${k}: wanted ${v}, got ${got.values[k] ?? "nothing"}`);
      const extra = Object.keys(got.values).filter((k) => !(k in want.values) && got.values[k] !== "0");
      expect(wrong, lines.join("\n")).toEqual([]);
      expect(extra).toEqual([]);
    }, 60_000);
  }
});
