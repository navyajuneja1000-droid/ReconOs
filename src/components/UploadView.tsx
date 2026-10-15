import React, { useRef, useState } from "react";
import { KIND_SPECS, SPEC_BY_KIND } from "../engine/detect";
import { intakeTable, isReady, needsPartner, type Intake } from "../engine/intake";
import type { FileKind } from "../engine/types";
import { isCardReady, LISTED, missingRates, PARTNER_BY_ID, PARTNERS, partnerTypeForKind, type RateCard } from "../engine/partners";
import { readTable, UnsupportedFileError } from "../engine/readFile";
import { Btn, Panel, PanelHead } from "../ui";
import { CardStatus, RateCardEditor } from "./RateCardEditor";

export interface TrayItem extends Intake {
  uid: string;
}

let seq = 0;

const COURIER_KINDS: FileKind[] = ["courier_shipments", "courier_cod", "courier_weight"];
const SHORT: Record<FileKind, string> = {
  shopify_orders: "Shopify orders",
  courier_shipments: "Shipments & charges",
  courier_cod: "COD remittance",
  courier_weight: "Weight discrepancies",
  gateway_settlements: "Settlement report",
  bank: "Bank statement",
};

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-slate-950">{n}</span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {sub && <p className="mt-0.5 max-w-[70ch] text-sm text-slate-300">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function UploadView({
  items, setItems, brand, setBrand, cards, setCard, onRun,
}: {
  items: TrayItem[];
  setItems: React.Dispatch<React.SetStateAction<TrayItem[]>>;
  brand: string;
  setBrand: (s: string) => void;
  /** one card per partner found in the ready files */
  cards: Record<string, RateCard>;
  setCard: (c: RateCard) => void;
  onRun: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const ready = items.filter(isReady);
  const partnerIds = Object.keys(cards);

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

  const redo = (uid: string, fn: (it: TrayItem) => Intake) => setItems((p) => p.map((it) => (it.uid === uid ? { ...fn(it), uid } : it)));
  const setKind = (uid: string, kind: FileKind | "") =>
    redo(uid, (it) => intakeTable(it.name, it.table, kind ? { kind, headerRow: it.headerRow, partner: partnerTypeForKind(kind) === partnerTypeForKind(it.kind) ? it.partner : undefined } : undefined));
  const setPartner = (uid: string, partner: string) =>
    redo(uid, (it) => intakeTable(it.name, it.table, { kind: it.kind!, headerRow: it.headerRow, partner: partner || null }));
  const setCol = (uid: string, field: string, col: number | null) =>
    redo(uid, (it) => {
      const overrides = { ...it.map };
      if (col === null) delete overrides[field];
      else overrides[field] = col;
      return intakeTable(it.name, it.table, { kind: it.kind!, partner: it.partner, headerRow: it.headerRow, overrides });
    });

  // what still blocks the audit
  const blockers: string[] = [];
  if (!ready.length) blockers.push("Add at least one file.");
  const unready = items.filter((i) => !isReady(i));
  const noPartner = unready.filter((i) => i.kind && i.missing.length === 0 && needsPartner(i) && !i.partner).length;
  if (noPartner) blockers.push(`Choose who sent ${noPartner === 1 ? "1 file" : `${noPartner} files`}.`);
  if (unready.length - noPartner) blockers.push(`Fix or remove ${unready.length - noPartner === 1 ? "1 file" : `${unready.length - noPartner} files`} marked "Needs your help".`);
  for (const id of partnerIds) {
    const c = cards[id];
    if (isCardReady(c)) continue;
    const left = missingRates(c).length;
    blockers.push(left ? `Fill ${left} more rate${left === 1 ? "" : "s"} for ${PARTNER_BY_ID[id].name}.` : `Confirm the ${PARTNER_BY_ID[id].name} rates match your agreement.`);
  }

  const kindsFor = (id: string) => new Set(ready.filter((i) => i.partner === id).map((i) => i.kind));
  const haveShopify = ready.some((i) => i.kind === "shopify_orders");
  const haveBank = ready.some((i) => i.kind === "bank");

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload files</h1>
        <p className="mt-1 max-w-[68ch] text-slate-300">Add last month's exports from Shopify, every courier and every payment gateway you use, and your bank. ReconOS reads each one in this browser tab and never uploads it anywhere.</p>
      </div>

      <Step n={1} title="Add your reports" sub="Drop them all at once. ReconOS works out what each file is and which partner sent it. Check the partner on each file before moving on.">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-emerald-400 bg-emerald-500/10" : "border-slate-700 bg-slate-900/40"}`}
        >
          <p className="text-lg font-semibold">Drop your reports here</p>
          <p className="mt-1 text-sm text-slate-400">CSV or Excel (.xlsx), from as many couriers and gateways as you use.</p>
          <input ref={input} id="file-input" type="file" multiple accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
          <Btn variant="primary" className="mt-4" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Reading files" : "Choose files"}</Btn>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Panel>
            <PanelHead title="Your files" sub={items.length ? `${ready.length} of ${items.length} ready` : "Nothing added yet"} />
            <ul className="divide-y divide-slate-800">
              {items.map((it) => {
                const ok = isReady(it);
                const type = partnerTypeForKind(it.kind);
                const headers = (it.table[it.headerRow] ?? []).map((h) => String(h ?? ""));
                const columnsOk = !!it.kind && it.missing.length === 0;
                return (
                  <li key={it.uid} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{it.name}</p>
                        <p className="mt-0.5 text-sm text-slate-400">
                          {it.kind ? `${SHORT[it.kind]}${it.partner ? ` from ${PARTNER_BY_ID[it.partner]?.name}` : ""}, ${it.rows.toLocaleString("en-IN")} rows` : "We couldn't tell what this file is"}
                          {it.kind && !columnsOk && ". Some columns weren't found"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {ok ? "Ready" : columnsOk && type && !it.partner ? "Who sent it?" : "Needs your help"}
                        </span>
                        <Btn variant="ghost" className="px-2 py-1" onClick={() => setItems((p) => p.filter((x) => x.uid !== it.uid))}>Remove</Btn>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-slate-300">File type</span>
                        <select id={`kind-${it.uid}`} value={it.kind ?? ""} onChange={(e) => setKind(it.uid, e.target.value as FileKind | "")} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5">
                          <option value="">Choose a file type</option>
                          {KIND_SPECS.map((s) => <option key={s.kind} value={s.kind}>{s.label}</option>)}
                        </select>
                      </label>
                      {type && (
                        <label className="grid gap-1">
                          <span className="text-slate-300">Sent by <span className="text-rose-300">*</span></span>
                          <select id={`partner-${it.uid}`} value={it.partner ?? ""} onChange={(e) => setPartner(it.uid, e.target.value)} className={`rounded-md border bg-slate-900 px-2 py-1.5 ${it.partner ? "border-slate-700" : "border-amber-500/70"}`}>
                            <option value="">Choose the {type === "courier" ? "courier" : "gateway"}</option>
                            {PARTNERS.filter((p) => p.type === type).map((p) => <option key={p.id} value={p.id}>{p.name}{p.aggregator ? " (aggregator)" : ""}</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                    {it.kind && !columnsOk && (
                      <div className="mt-3 grid gap-3 rounded-lg bg-slate-950/60 p-3 text-sm">
                        <p className="text-slate-300">Tell ReconOS which column holds each of these.</p>
                        {SPEC_BY_KIND[it.kind].fields.filter((f) => SPEC_BY_KIND[it.kind!].required.flat().includes(f.key)).map((f) => (
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
              {!items.length && !errors.length && <li className="px-5 py-6 text-sm text-slate-400">Start with your Shopify orders export. Each courier or gateway file you add switches on its checks.</li>}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="What to add" sub="Each partner's reports switch on its checks" />
            <ul className="divide-y divide-slate-800 text-sm">
              <li className="flex items-baseline justify-between gap-3 px-5 py-3">
                <span><span className="font-medium">Shopify orders</span><span className="block text-xs text-slate-400">{SPEC_BY_KIND.shopify_orders.source}</span></span>
                <span className={`shrink-0 text-xs font-medium ${haveShopify ? "text-emerald-300" : "text-amber-300"}`}>{haveShopify ? "Added" : "Start here"}</span>
              </li>
              {partnerIds.map((id) => {
                const p = PARTNER_BY_ID[id];
                const have = kindsFor(id);
                const kinds = p.type === "courier" ? COURIER_KINDS : (["gateway_settlements"] as FileKind[]);
                return (
                  <li key={id} className="px-5 py-3">
                    <p className="font-medium">{p.name}</p>
                    <ul className="mt-1.5 grid gap-1">
                      {kinds.map((k) => (
                        <li key={k} className="flex items-baseline justify-between gap-3">
                          <span className="text-slate-300">{SHORT[k]}{!have.has(k) && <span className="block text-xs text-slate-500">{p.reports[k]}</span>}</span>
                          <span className={`shrink-0 text-xs font-medium ${have.has(k) ? "text-emerald-300" : "text-slate-500"}`}>{have.has(k) ? "Added" : "Not added"}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
              <li className="flex items-baseline justify-between gap-3 px-5 py-3">
                <span><span className="font-medium">Bank statement</span><span className="block text-xs text-slate-400">Shows which payouts actually reached you. {SPEC_BY_KIND.bank.source}</span></span>
                <span className={`shrink-0 text-xs font-medium ${haveBank ? "text-emerald-300" : "text-slate-500"}`}>{haveBank ? "Added" : "Recommended"}</span>
              </li>
              <li className="px-5 py-3 text-xs text-slate-400">
                Works with {LISTED.gateways.map((p) => p.name).join(", ")} and {LISTED.couriers.map((p) => p.name).join(", ")}. Using another one? Choose "Other" as the sender and match its columns.
              </li>
            </ul>
          </Panel>
        </div>
      </Step>

      <Step n={2} title="Add each partner's rates (required)" sub="ReconOS checks every fee and shipping charge against the rates you agreed. Rates differ from brand to brand, so each courier and gateway needs its own rate card before the audit runs.">
        {!partnerIds.length ? (
          <Panel className="p-5 text-sm text-slate-400">A rate card for each courier and gateway appears here as soon as you add its file.</Panel>
        ) : (
          <div className="grid gap-3">
            {partnerIds.map((id) => {
              const c = cards[id];
              const p = PARTNER_BY_ID[id];
              const isOpen = open === id || (open === null && !isCardReady(c) && partnerIds.find((x) => !isCardReady(cards[x])) === id);
              return (
                <Panel key={id}>
                  <button type="button" id={`rates-${id}`} onClick={() => setOpen(isOpen ? "" : id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
                    <span>
                      <span className="font-semibold">{p.name} rate card</span>
                      <span className="block text-sm text-slate-400">{p.type === "gateway" ? "Fee per payment method, GST and payout days" : "Shipping by zone, COD fee, return charge and deadlines"}</span>
                    </span>
                    <span className="flex items-center gap-3"><CardStatus card={c} /><span aria-hidden="true" className="text-slate-500">{isOpen ? "−" : "+"}</span></span>
                  </button>
                  {isOpen && <div className="border-t border-slate-800 px-5 py-4"><RateCardEditor card={c} onChange={setCard} /></div>}
                </Panel>
              );
            })}
          </div>
        )}
      </Step>

      <Step n={3} title="Run the audit">
        <Panel className="grid gap-5 p-5 md:grid-cols-[1fr_1.3fr] md:items-start">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Brand name</span>
            <span className="text-slate-400">Signs your claim emails.</span>
            <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Indigo Loom" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base" />
          </label>
          <div className="grid gap-3">
            {blockers.length ? (
              <ul className="grid gap-1.5 text-sm text-amber-200" aria-live="polite">
                {blockers.map((b) => <li key={b} className="flex gap-2"><span aria-hidden="true">•</span>{b}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-emerald-300">{ready.length} file{ready.length === 1 ? "" : "s"} and {partnerIds.length} rate card{partnerIds.length === 1 ? "" : "s"} ready.</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Btn variant="primary" className="px-5 py-3 text-base" onClick={onRun} disabled={blockers.length > 0}>Run my audit</Btn>
              <p className="text-sm text-slate-400">Closing this tab clears everything.</p>
            </div>
          </div>
        </Panel>
      </Step>
    </div>
  );
}
