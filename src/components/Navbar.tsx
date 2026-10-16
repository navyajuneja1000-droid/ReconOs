import React from "react";
import { inr } from "../ui";

export type Tab = "overview" | "dashboard" | "partners" | "upload" | "orders" | "leaks" | "fees" | "report" | "pricing";

export const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "How it works" },
  { id: "dashboard", label: "Dashboard" },
  { id: "partners", label: "Partners" },
  { id: "upload", label: "Upload files" },
  { id: "orders", label: "Every order" },
  { id: "leaks", label: "Claims" },
  { id: "fees", label: "Gateway fees" },
  { id: "report", label: "Report" },
  { id: "pricing", label: "Pricing" },
];

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#052e2b" stroke="#10b981" strokeWidth="1.5" />
      <path d="M8 11h11M8 16h8M8 21h5" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="20" r="4" fill="none" stroke="#34d399" strokeWidth="2" />
      <path d="M25 23l2.5 2.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Navbar({
  tab, setTab, source, brandName, claimTotal, checkTotal, onBackToSample,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  source: "sample" | "files";
  brandName: string;
  claimTotal: number;
  checkTotal: number;
  onBackToSample: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className={`border-b text-sm ${source === "sample" ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-200" : "border-sky-900/60 bg-sky-950/40 text-sky-200"}`}>
        <div className="gutter mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          {source === "sample" ? (
            <p>You're looking at sample data for <strong className="font-semibold">Indigo Loom</strong>, a made-up brand. Every screen works the same with your own files.</p>
          ) : (
            <p>You're looking at <strong className="font-semibold">{brandName}</strong>'s files. Nothing has left this browser tab.</p>
          )}
          {source === "sample" ? (
            <button type="button" onClick={() => setTab("upload")} className="font-semibold text-emerald-300 underline-offset-4 hover:underline">Check my own files</button>
          ) : (
            <button type="button" onClick={onBackToSample} className="font-semibold text-sky-300 underline-offset-4 hover:underline">Back to sample data</button>
          )}
        </div>
      </div>

      <div className="gutter mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <button type="button" onClick={() => setTab("overview")} className="flex items-center gap-3 text-left">
          <Logo />
          <span>
            <span className="block text-lg leading-tight font-bold tracking-tight">ReconOS</span>
            <span className="hidden text-xs text-slate-400 sm:block">Money trail checks for D2C brands</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTab("leaks")} className="hidden rounded-lg border border-slate-800 px-3 py-1.5 text-right sm:block hover:border-slate-600">
            <span className="block text-xs text-slate-400">You can claim</span>
            <span className="block font-semibold text-emerald-400 tabular-nums">{inr(claimTotal)}</span>
          </button>
          <button type="button" onClick={() => setTab("leaks")} className="hidden rounded-lg border border-slate-800 px-3 py-1.5 text-right md:block hover:border-slate-600">
            <span className="block text-xs text-slate-400">Worth a check</span>
            <span className="block font-semibold text-amber-300 tabular-nums">{inr(checkTotal)}</span>
          </button>
          <button type="button" onClick={() => setTab("upload")} className="rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            Upload files
          </button>
        </div>
      </div>

      <nav aria-label="Sections" className="gutter mx-auto max-w-7xl overflow-x-auto">
        <ul className="flex gap-1 text-sm">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 transition ${tab === t.id ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"}`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
