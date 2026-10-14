// Builds a single self-contained HTML file of the app (for a shareable preview link).
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "preview");
fs.mkdirSync(outDir, { recursive: true });

const js = await build({
  entryPoints: [path.join(root, "src/preview/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  jsx: "automatic",
  target: "es2020",
  define: { "process.env.NODE_ENV": "\"production\"", "process.env.RECONOS_PREVIEW": "\"1\"" },
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "warning",
});

// Reuse the CSS Next/Tailwind already compiled, with font files inlined.
const cssFile = fs.readdirSync(path.join(root, "out/_next/static/chunks")).find((f) => f.endsWith(".css"));
let css = fs.readFileSync(path.join(root, "out/_next/static/chunks", cssFile), "utf8");
css = css.replace(/url\((?:\.\.\/)*(?:\/?_next\/static\/media\/|\.\.\/media\/)([^)]+\.woff2)\)/g, (_, f) => {
  const file = path.join(root, "out/_next/static/media", f);
  return `url(data:font/woff2;base64,${fs.readFileSync(file).toString("base64")})`;
});
if (/url\([^d][^)]*woff2/.test(css)) throw new Error("a font url was not inlined");

const html = `<title>ReconOS</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Find the money your courier and payment gateway owe you. Files never leave your browser.">
<style>${css}</style>
<div id="root"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(outDir, "reconos.html"), html);
console.log("preview/reconos.html", (html.length / 1024).toFixed(0), "KB");
