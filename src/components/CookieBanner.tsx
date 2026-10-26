import React, { useEffect, useState } from "react";
import { getChoice, setChoice } from "../analytics";

/** Asks once before Microsoft Clarity runs. Reopened from "Cookie settings" in the footer. */
export function CookieBanner() {
  const [open, setOpen] = useState(() => getChoice() === null);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("reconos-cookie-settings", on);
    return () => window.removeEventListener("reconos-cookie-settings", on);
  }, []);
  if (!open) return null;
  const choose = (c: "yes" | "no") => { setChoice(c); setOpen(false); };
  return (
    <div
      id="cookie-banner"
      role="dialog"
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-900/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="gutter mx-auto flex max-w-7xl flex-col gap-3 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[80ch] text-slate-300">
          Can we use Microsoft Clarity cookies to see how people use this site, like clicks and scrolling? Your files, results and anything you type are hidden from it.{" "}
          <a href="/privacy#cookies" className="text-emerald-300 underline-offset-4 hover:underline">Privacy Policy</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose("no")} className="rounded-lg border border-slate-700 px-3.5 py-2 text-slate-200 hover:border-slate-500">No thanks</button>
          <button type="button" onClick={() => choose("yes")} className="rounded-lg bg-emerald-500 px-3.5 py-2 font-semibold text-slate-950 hover:bg-emerald-400">Allow</button>
        </div>
      </div>
    </div>
  );
}
