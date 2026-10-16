/**
 * Turn a rate card document into lines of text, inside the browser.
 * PDFs are read from their text layer (scanned PDFs and screenshots are read with OCR).
 * Nothing is uploaded: the OCR engine runs on this device; only its program files are downloaded.
 */
import { readTable } from "./readFile";
import { linesFromPdfItems, OCR_PARAMS, ocrToLines, rowsToLines, toLines } from "./rateExtract";

export interface RateDoc {
  lines: string[];
  how: "spreadsheet" | "PDF" | "scanned PDF" | "screenshot" | "text";
}

export class RateDocError extends Error {}

const OCR_BASE = "/ocr";

async function ocr(images: (Blob | HTMLCanvasElement)[]): Promise<string[]> {
  let worker: { recognize: (i: Blob | HTMLCanvasElement) => Promise<{ data: { text: string } }>; setParameters: (p: Record<string, string>) => Promise<unknown>; terminate: () => Promise<unknown> } | undefined;
  try {
    const { createWorker } = await import("tesseract.js");
    worker = (await createWorker("eng", 1, {
      workerPath: `${OCR_BASE}/worker.min.js`,
      corePath: `${OCR_BASE}/core`,
      langPath: `${OCR_BASE}/lang`,
      gzip: true,
    })) as unknown as typeof worker;
  } catch {
    throw new RateDocError("Reading pictures isn't available here. Paste the rates as text, or upload a PDF or Excel file instead.");
  }
  try {
    await worker!.setParameters({ ...OCR_PARAMS });
    const out: string[] = [];
    for (const img of images) out.push(...ocrToLines((await worker!.recognize(await upscale(img))).data.text));
    return out;
  } finally {
    await worker!.terminate();
  }
}

/** OCR reads small text badly. Small screenshots are enlarged first (phone screenshots are usually big enough). */
async function upscale(img: Blob | HTMLCanvasElement): Promise<Blob | HTMLCanvasElement> {
  if (img instanceof HTMLCanvasElement) return img;
  try {
    const bmp = await createImageBitmap(img);
    if (bmp.width >= 1400) return img;
    const k = Math.min(3, 1600 / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  } catch {
    return img;
  }
}

async function readPdf(file: File): Promise<RateDoc> {
  const pdfjs = await import("pdfjs-dist");
  // run pdf.js on the main thread: no separate worker file to host
  await import("pdfjs-dist/build/pdf.worker.min.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const lines: string[] = [];
  const pages = Math.min(doc.numPages, 10);
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const items = (content.items as { str?: string; transform?: number[]; width?: number }[])
      .filter((i) => typeof i.str === "string" && i.transform)
      .map((i) => ({ str: i.str!, x: i.transform![4], y: i.transform![5], w: i.width ?? 0 }));
    lines.push(...linesFromPdfItems(items));
  }
  if (lines.join("").length > 40) return { lines, how: "PDF" };
  // no text layer: a scanned document, so read the first pages as pictures
  const canvases: HTMLCanvasElement[] = [];
  for (let n = 1; n <= Math.min(pages, 3); n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    canvases.push(canvas);
  }
  return { lines: await ocr(canvases), how: "scanned PDF" };
}

export async function readRateDocument(file: File): Promise<RateDoc> {
  const name = file.name.toLowerCase();
  if (/\.(png|jpe?g|webp|bmp|gif)$/.test(name) || file.type.startsWith("image/")) return { lines: await ocr([file]), how: "screenshot" };
  if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(file);
  if (/\.(csv|xlsx|xls)$/.test(name)) return { lines: rowsToLines((await readTable(file)) as unknown[][]), how: "spreadsheet" };
  if (/\.(txt|eml|md)$/.test(name) || file.type.startsWith("text/")) return { lines: toLines(await file.text()), how: "text" };
  throw new RateDocError("Upload a PDF, a screenshot (PNG or JPG), an Excel or CSV file, or paste the rates as text.");
}
