/**
 * Microsoft Clarity, loaded only after the visitor agrees. The choice is kept in this browser.
 * Pages showing a brand's own data are masked (data-clarity-mask) so file contents are never recorded.
 */
const CLARITY_ID = "z3p5c5izg9";
const KEY = "reconos.analytics.v1";

export type Choice = "yes" | "no" | null;

export function getChoice(): Choice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

let loaded = false;
export function loadClarity(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const w = window as unknown as { clarity?: ((...a: unknown[]) => void) & { q?: unknown[] } };
  w.clarity = w.clarity || Object.assign((...args: unknown[]) => { (w.clarity!.q = w.clarity!.q || []).push(args); }, {});
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://www.clarity.ms/tag/" + CLARITY_ID;
  const y = document.getElementsByTagName("script")[0];
  if (y?.parentNode) y.parentNode.insertBefore(t, y); else document.head.appendChild(t);
  w.clarity("consent");
}

export function setChoice(c: "yes" | "no"): void {
  try {
    window.localStorage.setItem(KEY, c);
  } catch {
    // storage blocked: the choice applies to this visit only
  }
  if (c === "yes") loadClarity();
  else if (loaded) {
    // stop recording now; the script is fully gone on the next page load
    (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity?.("consent", false);
  }
  window.dispatchEvent(new Event("reconos-analytics"));
}

/** Call once on page start: loads Clarity if the visitor said yes before. */
export function initAnalytics(): void {
  if (getChoice() === "yes") loadClarity();
}

export const openCookieSettings = () => window.dispatchEvent(new Event("reconos-cookie-settings"));
