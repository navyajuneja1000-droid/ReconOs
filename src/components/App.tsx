"use client";

import { useCallback, useRef, useState } from "react";
import { FileTray, type TrayItem } from "./FileTray";
import { MoneyTrail } from "./MoneyTrail";
import { Results } from "./Results";
import { intakeTable, isReady, runAudit } from "@/engine/intake";
import type { AuditResult, FileKind } from "@/engine/types";
import { DEFAULT_SETTINGS } from "@/engine/types";
import { generateSample } from "@/sample/generate";
import { readTable, UnsupportedFileError } from "@/lib/readFile";

type Stage = "home" | "files" | "results";

const CHECKS = [
  ["COD money the courier hasn't paid you", "Delivered cash-on-delivery orders with no payout, or a smaller payout than the cash collected."],
  ["Shipping overcharges", "The same charge billed twice, COD fees on prepaid orders, return charges on delivered orders."],
  ["Weight charges you can still dispute", "Open weight disputes, with the last date you can still contest them."],
  ["Payment gateway shortfalls", "Fees above your plan, wrong GST on fees, paid orders that never settled, refund mismatches."],
  ["Payouts that never reached your bank", "Courier remittances and gateway settlements with no matching credit in your statement."],
];

let uidSeq = 0;
const uid = () => `f${++uidSeq}`;

export function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [items, setItems] = useState<TrayItem[]>([]);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [feePct, setFeePct] = useState(String(DEFAULT_SETTINGS.gatewayFeePct));
  const [asOf, setAsOf] = useState<Date | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    const added: TrayItem[] = [];
    const errs: { name: string; message: string }[] = [];
    for (const file of list) {
      try {
        const table = await readTable(file);
        added.push({ ...intakeTable(file.name, table), uid: uid() });
      } catch (e) {
        errs.push({ name: file.name, message: e instanceof UnsupportedFileError ? e.message : "This file couldn't be read. Export it again as CSV and try once more." });
      }
    }
    if (isSample) {
      setItems(added);
      setIsSample(false);
      setAsOf(undefined);
      setBusinessName("");
    } else {
      setItems((prev) => [...prev, ...added]);
    }
    setErrors((prev) => [...prev, ...errs]);
    setResult(null);
    setStage("files");
    setBusy(false);
  }, [isSample]);

  const loadSample = () => {
    const s = generateSample();
    setItems(s.files.map((f) => ({ ...intakeTable(f.name, f.table), uid: uid() })));
    setErrors([]);
    setIsSample(true);
    setAsOf(s.asOf);
    setBusinessName("Indigo Loom");
    setFeePct("2");
    const r = runAudit(s.files.map((f) => intakeTable(f.name, f.table)), { asOf: s.asOf });
    setResult(r);
    setStage("results");
    requestAnimationFrame(scrollTop);
  };

  const run = () => {
    const fee = parseFloat(feePct);
    const r = runAudit(items, {
      asOf,
      gatewayFeePct: Number.isFinite(fee) && fee > 0 ? fee : DEFAULT_SETTINGS.gatewayFeePct,
    });
    setResult(r);
    setStage("results");
    requestAnimationFrame(scrollTop);
  };

  const restart = () => {
    setItems([]);
    setErrors([]);
    setResult(null);
    setIsSample(false);
    setAsOf(undefined);
    setBusinessName("");
    setStage("home");
    requestAnimationFrame(scrollTop);
  };

  const changeKind = (id: string, kind: FileKind | "") =>
    setItems((prev) => prev.map((it) => (it.uid === id ? { ...intakeTable(it.name, it.table, kind ? { kind, headerRow: it.headerRow } : undefined), uid: id } : it)));

  const mapField = (id: string, field: string, col: number | null) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.uid !== id || !it.kind) return it;
        const overrides = { ...it.map };
        if (col === null) delete overrides[field];
        else overrides[field] = col;
        return { ...intakeTable(it.name, it.table, { kind: it.kind, headerRow: it.headerRow, overrides }), uid: id };
      }),
    );

  const readyCount = items.filter(isReady).length;

  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); },
  };

  return (
    <div ref={topRef} className="gutter mx-auto w-full max-w-6xl pb-20">
      <header className="flex items-center justify-between py-5">
        <button type="button" onClick={restart} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" />
            <path d="M6 9h7M6 13h5" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="17" cy="14" r="2.6" fill="var(--color-stamp)" />
          </svg>
          ReconOS
        </button>
        <p className="hidden text-sm text-muted sm:block">Files stay in your browser</p>
      </header>

      <input ref={inputRef} type="file" multiple accept=".csv,.xlsx,.xls,.txt" className="sr-only" aria-label="Add files" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

      {stage === "home" && (
        <main>
          <section className="grid gap-10 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-14">
            <div>
              <h1 className="max-w-[16ch] text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Find the money your courier and payment gateway still owe you.
              </h1>
              <p className="mt-6 max-w-[56ch] text-lg text-ink-2">
                Add last month&apos;s Shopify, Shiprocket, Razorpay and bank files. ReconOS matches every order to the rupees that reached your bank, then shows what&apos;s missing, what was overcharged and what you can still claim.
              </p>
              <div
                {...dropProps}
                className={`mt-8 rounded-xl border-2 border-dashed p-5 transition-colors sm:p-6 ${dragging ? "border-stamp bg-stamp-soft" : "border-rule bg-sheet"}`}
              >
                <p className="font-semibold">Drop your exported reports here</p>
                <p className="mt-1 text-sm text-muted">CSV or Excel. Add them all at once; we work out which is which.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-md bg-ink px-4 py-2.5 font-medium text-paper hover:bg-ink-2 disabled:opacity-60">
                    {busy ? "Reading files" : "Choose files"}
                  </button>
                  <button type="button" onClick={loadSample} className="rounded-md border border-rule bg-sheet px-4 py-2.5 font-medium hover:border-ink-2">
                    Try it with sample data
                  </button>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
                <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"><path d="M5 9V7a5 5 0 0 1 10 0v2" fill="none" stroke="var(--color-moss)" strokeWidth="1.8" /><rect x="3.5" y="9" width="13" height="9" rx="2" fill="var(--color-moss)" /></svg>
                Your files are checked inside this browser tab. Nothing is uploaded or stored.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-sheet/70 p-4 sm:p-6">
              <MoneyTrail />
              <p className="mt-2 text-sm text-muted">Every order passes through two or three systems before the money is yours. Each one can hold back, overcharge or simply forget a payment.</p>
            </div>
          </section>

          <section aria-labelledby="checks" className="border-t border-rule py-12">
            <h2 id="checks" className="text-2xl font-semibold tracking-tight">What ReconOS checks</h2>
            <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {CHECKS.map(([t, d]) => (
                <div key={t} className="border-l-2 border-stamp/50 pl-4">
                  <p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-ink-2">{d}</p>
                </div>
              ))}
              <div className="border-l-2 border-rule pl-4">
                <p className="font-semibold">Then it writes the claim</p>
                <p className="mt-1 text-sm text-ink-2">One email each for Shiprocket and Razorpay, listing every order and amount, ready to send.</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="files-needed" className="border-t border-rule py-12">
            <h2 id="files-needed" className="text-2xl font-semibold tracking-tight">The files to export</h2>
            <p className="mt-2 max-w-prose text-ink-2">Start with your Shopify orders. Every extra file unlocks more checks; you don&apos;t need all of them.</p>
            <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-sheet">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-rule text-muted">
                  <tr><th className="p-3 font-medium">File</th><th className="p-3 font-medium">Where to find it</th></tr>
                </thead>
                <tbody className="divide-y divide-rule-2">
                  {[
                    ["Shopify orders", "Orders → Export → All orders, CSV for Excel"],
                    ["Shiprocket shipments", "Shipments → filter last month → Export"],
                    ["Shiprocket COD remittance", "Billing → COD Remittance → Export"],
                    ["Shiprocket weight discrepancies", "Billing → Weight Reconciliation → Export"],
                    ["Razorpay settlements", "Reports → Settlement Recon → Download CSV"],
                    ["Bank statement", "Net banking → Account statement → Excel or CSV"],
                  ].map(([a, b]) => (
                    <tr key={a}><td className="p-3 font-medium">{a}</td><td className="p-3 text-ink-2">{b}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {stage === "files" && (
        <main className="pt-4" {...dropProps}>
          <h1 className="text-3xl font-bold tracking-tight">Check your files</h1>
          <p className="mt-2 max-w-prose text-ink-2">We read each file to work out what it is. Add more files any time; each one unlocks more checks.</p>
          <div className="mt-8">
            <FileTray items={items} errors={errors} onRemove={(id) => setItems((p) => p.filter((x) => x.uid !== id))} onChangeKind={changeKind} onMap={mapField} />
          </div>
          <div className="mt-8 grid gap-4 rounded-xl border border-rule bg-sheet p-5 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Your brand name</span>
              <span className="text-muted">Used to sign the claim emails.</span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rounded border border-rule px-3 py-2 text-base" placeholder="e.g. Indigo Loom" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Your Razorpay fee rate (%)</span>
              <span className="text-muted">Standard plan is 2%. Change it if you negotiated a different rate.</span>
              <input value={feePct} onChange={(e) => setFeePct(e.target.value)} inputMode="decimal" className="rounded border border-rule px-3 py-2 text-base" />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={run} disabled={!readyCount} className="rounded-md bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50">
              Run the audit
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md border border-rule bg-sheet px-4 py-3 font-medium hover:border-ink-2">
              Add more files
            </button>
            <p className="text-sm text-muted">{readyCount ? `${readyCount} file${readyCount === 1 ? "" : "s"} ready` : "Add at least one recognised file to run the audit"}</p>
          </div>
        </main>
      )}

      {stage === "results" && result && (
        <main className="pt-4">
          <h1 className="sr-only">Audit results</h1>
          <Results result={result} businessName={businessName} onRestart={restart} isSample={isSample} />
        </main>
      )}
    </div>
  );
}
