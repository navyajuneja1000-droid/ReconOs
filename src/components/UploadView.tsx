import React, { useRef, useState } from "react";
import { KIND_SPECS, SPEC_BY_KIND } from "../engine/detect";
import { intakeTable, isReady, type Intake } from "../engine/intake";
import type { FileKind } from "../engine/types";
import { readTable, UnsupportedFileError } from "../engine/readFile";
import type { Rates } from "../App";
import { Btn, Panel, PanelHead } from "../ui";

export interface TrayItem extends Intake {
  uid: string;
}

let seq = 0;

export function UploadView({
  items, setItems, brand, setBrand, rates, setRates, onRun,
}: {
  items: TrayItem[];
  setItems: React.Dispatch<React.SetStateAction<TrayItem[]>>;
  brand: string;
  setBrand: (s: string) => void;
  rates: Rates;
  setRates: (r: Rates) => void;
  onRun: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const have = new Set(items.filter(isReady).map((i) => i.kind));
  const ready = items.filter(isReady).length;

  const add = async (files: FileList | File[]) => {
    setBusy(true);
    const out: TrayItem[] = [];
    const errs: { name: string; message: string }[] = [];
    for (const f of Array.from(files)) {
      try {
        out.push({ ...intakeTable(f.name, await readTable(f)), uid: `f${++seq}` });
      } catch (e) {
        errs.push({ name: f.name, message: e instanceof UnsupportedFileError ? e.message : "This file couldn't be read. Export it again as CSV and add it once more." });
      }
    }
    setItems((p) => [...p, ...out]);
    setErrors((p) => [...p, ...errs]);
    setBusy(false);
  };

  const setKind = (uid: string, kind: FileKind | "") =>
    setItems((p) => p.map((it) => (it.uid === uid ? { ...intakeTable(it.name, it.table, kind ? { kind, headerRow: it.headerRow } : undefined), uid } : it)));
  const setCol = (uid: string, field: string, col: number | null) =>
    setItems((p) =>
      p.map((it) => {
        if (it.uid !== uid || !it.kind) return it;
        const overrides = { ...it.map };
        if (col === null) delete overrides[field];
        else overrides[field] = col;
        return { ...intakeTable(it.name, it.table, { kind: it.kind, headerRow: it.headerRow, overrides }), uid };
      }),
    );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload files</h1>
        <p className="mt-1 max-w-[65ch] text-slate-300">Add last month's exports. ReconOS reads each one in this browser tab, works out what it is, and never uploads it anywhere.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-emerald-400 bg-emerald-500/10" : "border-slate-700 bg-slate-900/40"}`}
      >
        <p className="text-lg font-semibold">Drop your reports here</p>
        <p className="mt-1 text-sm text-slate-400">CSV or Excel (.xlsx). Add them all at once; we sort out which is which.</p>
        <input ref={input} id="file-input" type="file" multiple accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
        <Btn variant="primary" className="mt-4" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Reading files" : "Choose files"}</Btn>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <PanelHead title="Your files" sub={items.length ? `${ready} of ${items.length} ready` : "Nothing added yet"} />
          <ul className="divide-y divide-slate-800">
            {items.map((it) => {
              const ok = isReady(it);
              const headers = (it.table[it.headerRow] ?? []).map((h) => String(h ?? ""));
              return (
                <li key={it.uid} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.name}</p>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {ok ? `${SPEC_BY_KIND[it.kind!].label}, ${it.rows.toLocaleString("en-IN")} rows` : it.kind ? `Looks like ${SPEC_BY_KIND[it.kind].label}, but some columns weren't found` : "We couldn't tell what this file is"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{ok ? "Ready" : "Needs your help"}</span>
                      <Btn variant="ghost" className="px-2 py-1" onClick={() => setItems((p) => p.filter((x) => x.uid !== it.uid))}>Remove</Btn>
                    </div>
                  </div>
                  {!ok && (
                    <div className="mt-3 grid gap-3 rounded-lg bg-slate-950/60 p-3 text-sm">
                      <label className="grid gap-1">
                        <span className="text-slate-300">What is this file?</span>
                        <select id={`kind-${it.uid}`} value={it.kind ?? ""} onChange={(e) => setKind(it.uid, e.target.value as FileKind | "")} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5">
                          <option value="">Choose a file type</option>
                          {KIND_SPECS.map((s) => <option key={s.kind} value={s.kind}>{s.label}</option>)}
                        </select>
                      </label>
                      {it.kind && SPEC_BY_KIND[it.kind].fields.filter((f) => SPEC_BY_KIND[it.kind!].required.flat().includes(f.key)).map((f) => (
                        <label key={f.key} className="grid gap-1">
                          <span className="text-slate-300">Which column has the {/^[A-Z]{2}/.test(f.label) ? f.label : f.label.toLowerCase()}?</span>
                          <select id={`col-${it.uid}-${f.key}`} value={it.map[f.key] ?? ""} onChange={(e) => setCol(it.uid, f.key, e.target.value === "" ? null : Number(e.target.value))} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5">
                            <option value="">Not in this file</option>
                            {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            {errors.map((e, i) => (
              <li key={`e${i}`} className="px-5 py-4">
                <p className="font-medium">{e.name}</p>
                <p className="mt-0.5 text-sm text-rose-300">{e.message}</p>
              </li>
            ))}
            {!items.length && !errors.length && <li className="px-5 py-6 text-sm text-slate-400">Start with your Shopify orders export. Each extra file switches on more checks.</li>}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="What each file unlocks" />
          <ul className="divide-y divide-slate-800">
            {KIND_SPECS.map((s) => {
              const ok = have.has(s.kind);
              return (
                <li key={s.kind} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{s.label}</p>
                    <span className={`shrink-0 text-xs font-medium ${ok ? "text-emerald-300" : "text-slate-500"}`}>{ok ? "Added" : s.kind === "shopify_orders" ? "Start here" : "Optional"}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{s.unlocks}</p>
                  {!ok && <p className="mt-1 text-xs text-slate-500">Where to get it: {s.source}</p>}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel className="grid gap-4 p-5 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Brand name</span>
          <span className="text-slate-400">Signs your claim emails.</span>
          <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Indigo Loom" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Razorpay fee rate (%)</span>
          <span className="text-slate-400">Standard plan is 2%. Change it if you negotiated.</span>
          <input id="fee" inputMode="decimal" value={rates.feePct} onChange={(e) => setRates({ ...rates, feePct: Number(e.target.value) || 0 })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Days before COD counts as late</span>
          <span className="text-slate-400">After delivery. Default 10.</span>
          <input id="grace" inputMode="numeric" value={rates.codGraceDays} onChange={(e) => setRates({ ...rates, codGraceDays: Number(e.target.value) || 0 })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
        </label>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="primary" className="px-5 py-3 text-base" onClick={onRun} disabled={!ready}>Run my audit</Btn>
        <p className="text-sm text-slate-400">{ready ? `${ready} file${ready === 1 ? "" : "s"} ready.` : "Add at least one recognised file to run the audit."} Closing this tab clears everything.</p>
      </div>
    </div>
  );
}
