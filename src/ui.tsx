import React from "react";
import type { Finding } from "./engine/types";

export const inr = (n: number, decimals = false) =>
  "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });

export const inrCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
};

export const fmtDay = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "";

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>{children}</section>;
}

export function PanelHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-100 text-balance">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function KindTag({ kind }: { kind: Finding["kind"] }) {
  return kind === "claim" ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-300">Claim</span>
  ) : (
    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-300">Check</span>
  );
}

export function Btn({
  children, onClick, variant = "secondary", className = "", type = "button", disabled,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; className?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  const v =
    variant === "primary"
      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold"
      : variant === "ghost"
        ? "text-slate-300 hover:bg-slate-800 hover:text-white"
        : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  );
}

/** Copy text; falls back to selecting a hidden textarea when the clipboard is refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? key : null);
    if (ok) setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}
