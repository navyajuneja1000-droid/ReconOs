import React from "react";
import { LEGAL } from "../legal/content";
import { openCookieSettings } from "../analytics";

const LINKS = [
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/refunds", "Refunds and cancellation"],
  ["/shipping", "Delivery"],
  ["/contact", "Contact"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900/60">
      <div className="gutter mx-auto grid max-w-7xl gap-3 py-6 text-sm text-slate-400">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-slate-200">ReconOS</span> finds the money your couriers and payment gateways owe you.
          </p>
          <p>Your files are checked in your browser and never uploaded.</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-slate-200 hover:underline">{label}</a>
          ))}
          <button type="button" onClick={openCookieSettings} className="hover:text-slate-200 hover:underline">Cookie settings</button>
          <a href={`mailto:${LEGAL.email}`} className="hover:text-slate-200 hover:underline">{LEGAL.email}</a>
        </nav>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} ReconOS, {LEGAL.place}. Not affiliated with or endorsed by any courier, payment gateway or other company named on this site. Their names are trademarks of their owners.
        </p>
      </div>
    </footer>
  );
}
