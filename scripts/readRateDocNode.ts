// Node version of src/engine/rateDocs.ts, for tests and for checking real rate cards from the terminal.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { linesFromPdfItems, OCR_PARAMS, ocrToLines, rowsToLines, toLines } from "../src/engine/rateExtract";
import { loadTable } from "./loadTable";

const require = createRequire(import.meta.url);

export async function readRateDocNode(path: string): Promise<string[]> {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), isEvalSupported: false, useSystemFonts: false }).promise;
    const lines: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const c = await (await doc.getPage(n)).getTextContent();
      lines.push(...linesFromPdfItems((c.items as { str?: string; transform?: number[]; width?: number }[]).filter((i) => i.transform).map((i) => ({ str: i.str ?? "", x: i.transform![4], y: i.transform![5], w: i.width ?? 0 }))));
    }
    return lines;
  }
  if (/\.(png|jpe?g)$/.test(lower)) {
    const { createWorker } = await import("tesseract.js");
    const langPath = join(dirname(require.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");
    const worker = await createWorker("eng", 1, { langPath, gzip: true, cachePath: join(process.cwd(), "node_modules/.cache/tesseract") });
    try {
      await worker.setParameters(OCR_PARAMS as unknown as Parameters<typeof worker.setParameters>[0]);
      return ocrToLines((await worker.recognize(path)).data.text);
    } finally {
      await worker.terminate();
    }
  }
  if (/\.(csv|xlsx)$/.test(lower)) return rowsToLines((await loadTable(path)) as unknown[][]);
  return toLines(readFileSync(path, "utf8"));
}
