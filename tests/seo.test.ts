import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANS } from "../src/pricing";
import { LEGAL_DOCS } from "../src/legal/content";
import { LISTED } from "../src/engine/partners";
import { canonicalFor, SITE, TAB_TITLES } from "../src/seo";
import { TABS } from "../src/components/Navbar";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const html = read("index.html");
const llms = read("public/llms.txt");
const sitemap = read("public/sitemap.xml");
const robots = read("public/robots.txt");

const jsonLd = () => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(m).not.toBeNull();
  return JSON.parse(m![1]) as { "@graph": { "@type": string; offers?: { name: string; price: string; priceCurrency: string }[] }[] };
};

describe("structured data and AI-readable files stay in sync with the site", () => {
  it("JSON-LD is valid and its prices match src/pricing.ts", () => {
    const app = jsonLd()["@graph"].find((n) => n["@type"] === "SoftwareApplication");
    expect(app?.offers?.map((o) => [o.name, Number(o.price), o.priceCurrency])).toEqual(PLANS.map((p) => [p.name, p.price, "INR"]));
  });

  it("llms.txt quotes the same prices and every listed partner", () => {
    for (const p of PLANS) expect(llms).toContain(p.price ? `${p.name}: ₹${p.price.toLocaleString("en-IN")}` : `${p.name}: ₹0`);
    for (const p of [...LISTED.gateways, ...LISTED.couriers]) expect(llms).toContain(p.name);
  });

  it("the sitemap lists the home page and every policy page, and robots.txt points to it", () => {
    expect(sitemap).toContain(`<loc>${SITE}/</loc>`);
    for (const d of LEGAL_DOCS) expect(sitemap).toContain(`<loc>${SITE}${d.path}</loc>`);
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it("the Vercel rewrite leaves robots.txt, sitemap.xml and llms.txt as real files", () => {
    const src = JSON.parse(read("vercel.json")).rewrites[0].source as string;
    const re = new RegExp(`^${src}$`);
    for (const f of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/og.png"]) expect(re.test(f)).toBe(false);
    for (const f of ["/", "/privacy", "/anything"]) expect(re.test(f)).toBe(true);
  });
});

describe("canonical addresses", () => {
  it("home and policy pages are canonical; anything else is not indexed", () => {
    expect(canonicalFor("", false)).toBe(`${SITE}/`);
    expect(canonicalFor("/", false)).toBe(`${SITE}/`);
    expect(canonicalFor("/privacy", true)).toBe(`${SITE}/privacy`);
    expect(canonicalFor("/privacy/", true)).toBe(`${SITE}/privacy`);
    expect(canonicalFor("/random-page", false)).toBeNull();
  });

  it("every tab has a page title", () => {
    for (const t of TABS) expect(TAB_TITLES[t.id]).toBeTruthy();
  });
});
