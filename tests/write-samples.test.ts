import { it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateSample, toCsv } from "../src/sample/generate";

// Writes the sample files to disk when SAMPLES_DIR is set (used for browser tests and the public download).
it.runIf(!!process.env.SAMPLES_DIR)("write sample files", () => {
  const dir = process.env.SAMPLES_DIR!;
  fs.mkdirSync(dir, { recursive: true });
  for (const f of generateSample().files) fs.writeFileSync(path.join(dir, f.name), toCsv(f.table));
});
