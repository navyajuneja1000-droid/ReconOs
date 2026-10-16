// Copies the OCR engine (used only when a founder uploads a rate card screenshot) into public/ocr,
// so it's served from our own site instead of a third-party CDN.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const out = "public/ocr";
if (existsSync(`${out}/lang/eng.traineddata.gz`)) process.exit(0);
mkdirSync(`${out}/core`, { recursive: true });
mkdirSync(`${out}/lang`, { recursive: true });
cpSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`);
for (const f of ["tesseract-core-simd-lstm.wasm.js", "tesseract-core-lstm.wasm.js"]) cpSync(`node_modules/tesseract.js-core/${f}`, `${out}/core/${f}`);
cpSync("node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", `${out}/lang/eng.traineddata.gz`);
console.log("Copied OCR files to public/ocr");
