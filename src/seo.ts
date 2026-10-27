/**
 * Search engine hints that depend on the address. The site is one page plus the policy pages,
 * so every other address shows the home page: point those at "/" and keep them out of search.
 */
export const SITE = "https://www.reconos.in";

/** The canonical address for a path, or null when the path isn't a real page and shouldn't be indexed. */
export function canonicalFor(path: string, isLegal: boolean): string | null {
  const p = path.replace(/\/+$/, "");
  if (p === "" || p === "/index.html") return `${SITE}/`;
  if (isLegal) return `${SITE}${p}`;
  return null;
}

export function setCanonical(path: string, isLegal: boolean): void {
  const url = canonicalFor(path, isLegal);
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = url ?? `${SITE}/`;
  document.head.appendChild(link);
  if (!url) {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
  }
}

/** Browser tab titles for each section of the app. */
export const TAB_TITLES: Record<string, string> = {
  overview: "ReconOS: find money your couriers and gateways owe you",
  dashboard: "Dashboard | ReconOS",
  partners: "Partners | ReconOS",
  upload: "Check your files | ReconOS",
  orders: "Every order | ReconOS",
  leaks: "Claims | ReconOS",
  fees: "Gateway fees | ReconOS",
  report: "Recovery report | ReconOS",
  weights: "Weekly weight check | ReconOS",
  pricing: "Pricing | ReconOS",
};
