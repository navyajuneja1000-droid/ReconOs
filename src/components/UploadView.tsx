import React, { useRef, useState } from "react";
import { KIND_SPECS, SPEC_BY_KIND } from "../engine/detect";
import { intakeTable, isReady, needsPartner, type Intake } from "../engine/intake";
import type { FileKind } from "../engine/types";
import { isCardReady, LISTED, missingRates, PARTNER_BY_ID, PARTNERS, partnerTypeForKind, type RateCard } from "../engine/partners";
import { readTable, UnsupportedFileError } from "../engine/readFile";
import { FILE_METHODS } from "../engine/instruments";
import type { Dataset } from "../engine/types";
import { Btn, Panel, PanelHead } from "../ui";
import { CardStatus, RateCardEditor } from "./RateCardEditor";

export interface TrayItem extends Intake {
  uid: string;
}

let seq = 0;

const COURIER_KINDS: FileKind[] = ["courier_shipments", "courier_cod", "courier_weight"];
export const SHORT: Record<FileKind, string> = {
  shopify_orders: "Shopify orders",
  courier_shipments: "Shipments and charges",
  courier_cod: "COD payouts",
  courier_weight: "Extra weight charges",
  gateway_settlements: "Payouts (settlement report)",
  bank: "Bank statement",
};
const WHY: Record<FileKind, string> = {
  shopify_orders: "What you sold. Needed for every check.",
  courier_shipments: "Which orders were delivered or came back, and what you were billed.",
  courier_cod: "The cash the courier collected and paid you.",
  courier_weight: "Extra charges after the courier re-weighed a parcel. You can dispute these.",
  gateway_settlements: "Every online payment, the fee taken and what was paid to you.",
  bank: "Shows which payouts actually reached your account.",
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
  items, setItems, brand, setBrand, cards, setCard, onRun, picked, setPicked, data,
}: {
  /** partners the brand said it works with */
  picked: string[];
  setPicked: (p: string[]) => void;
  /** the files read so far, for filling rates from what was charged */
  data: Dataset;
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
  const [editing, setEditing] = useState<Set<string>>(new Set());
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
  const setMethodHint = (uid: string, methodHint: string) =>
    redo(uid, (it) => intakeTable(it.name, it.table, { kind: it.kind!, partner: it.partner, headerRow: it.headerRow, overrides: it.map, methodHint }));
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
  // partners ticked by the brand, plus any that sent a file
  const shown = PARTNERS.filter((p) => picked.includes(p.id) || partnerIds.includes(p.id)).map((p) => p.id);
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const chip = (id: string, name: string) => {
    const on = shown.includes(id);
    const locked = partnerIds.includes(id);
    return (
      <button key={id} type="button" id={`pick-${id}`} aria-pressed={on} disabled={locked} onClick={() => toggle(id)} title={locked ? "You've added a file from this partner" : undefined}
        className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-emerald-400 bg-emerald-500/15 text-emerald-100" : "border-slate-700 text-slate-300 hover:border-slate-500"} disabled:cursor-default`}>
        {on ? "✓ " : ""}{name}
      </button>
    );
  };
  const reportRow = (key: string, label: string, why: string, where: string | undefined, added: boolean, must = false) => (
    <li key={key} className="flex items-start justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="block text-xs text-slate-400">{why}</span>
        {!added && where && <span className="block text-xs text-slate-500">How to get it: {where}</span>}
      </span>
      <span className={`shrink-0 text-xs font-medium ${added ? "text-emerald-300" : must ? "text-amber-300" : "text-slate-500"}`}>{added ? "✓ Added" : must ? "Needed" : "Not yet"}</span>
    </li>
  );
  const haveShopify = ready.some((i) => i.kind === "shopify_orders");
  const haveBank = ready.some((i) => i.kind === "bank");

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload files</h1>
        <p className="mt-1 max-w-[68ch] text-slate-300">Add last month's exports from Shopify, every courier and every payment gateway you use, and your bank. ReconOS reads each one in this browser tab and never uploads it anywhere.</p>
      </div>

      <Step n={1} title="Who do you work with?" sub="Tick every payment gateway and courier you use. We'll show you exactly which reports to download from each.">
        <Panel className="grid gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-slate-300">Payment gateways</p>
            <div className="mt-2 flex flex-wrap gap-2">{LISTED.gateways.map((p) => chip(p.id, p.name))}{chip("other_gateway", "Other")}</div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Couriers and shipping platforms</p>
            <div className="mt-2 flex flex-wrap gap-2">{LISTED.couriers.map((p) => chip(p.id, p.name))}{chip("other_courier", "Other")}</div>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Reports to download" sub="Last month is a good start. Each one switches on more checks." />
          <div className="gap-x-8 px-5 py-2 text-sm md:columns-2">
            <div className="break-inside-avoid">
              <p className="pt-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Your store and bank</p>
              <ul className="divide-y divide-slate-800">
                {reportRow("shopify", SHORT.shopify_orders, WHY.shopify_orders, SPEC_BY_KIND.shopify_orders.source, haveShopify, true)}
                {reportRow("bank", SHORT.bank, WHY.bank, SPEC_BY_KIND.bank.source, haveBank)}
              </ul>
            </div>
            {shown.map((id) => {
              const p = PARTNER_BY_ID[id];
              const have = kindsFor(id);
              const kinds = p.type === "courier" ? COURIER_KINDS : (["gateway_settlements"] as FileKind[]);
              return (
                <div key={id} className="break-inside-avoid">
                  <p className="pt-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">{p.name}</p>
                  <ul className="divide-y divide-slate-800">{kinds.map((k) => reportRow(`${id}-${k}`, SHORT[k], WHY[k], p.reports[k], have.has(k), k !== "courier_weight"))}</ul>
                </div>
              );
            })}
          </div>
          {!shown.length && <p className="border-t border-slate-800 px-5 py-3 text-sm text-slate-400">Tick your gateways and couriers above to see their reports.</p>}
        </Panel>
      </Step>

      <Step n={2} title="Drop the reports in" sub="All at once is fine. ReconOS works out what each file is and who sent it. Check the partner on each file.">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-emerald-400 bg-emerald-500/10" : "border-slate-700 bg-slate-900/40"}`}
        >
          <p className="text-lg font-semibold">Drop your reports here</p>
          <p className="mt-1 text-sm text-slate-400">CSV or Excel (.xlsx). Files are read on this device and never uploaded.</p>
          <input ref={input} id="file-input" type="file" multiple accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
          <Btn variant="primary" className="mt-4" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Reading files" : "Choose files"}</Btn>
        </div>

        <div className="grid gap-6">
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
                          {it.kind ? `${SHORT[it.kind]}${it.partner ? ` from ${PARTNER_BY_ID[it.partner]?.name}` : ""}, ${it.rows.toLocaleString("en-IN")} row${it.rows === 1 ? "" : "s"}` : "We couldn't tell what this file is"}
                          {it.kind && !columnsOk && ". Some columns weren't found"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {ok ? "Ready" : columnsOk && type && !it.partner ? "Who sent it?" : "Needs your help"}
                        </span>
                        {ok && !editing.has(it.uid) && <Btn variant="ghost" className="px-2 py-1" onClick={() => setEditing(new Set([...editing, it.uid]))}>Change</Btn>}
                        <Btn variant="ghost" className="px-2 py-1" onClick={() => setItems((p) => p.filter((x) => x.uid !== it.uid))}>Remove</Btn>
                      </div>
                    </div>
                    {(!ok || editing.has(it.uid)) && <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
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
                            {PARTNERS.filter((p) => p.type === type).map((p) => <option key={p.id} value={p.id}>{p.name}{p.aggregator ? " (shipping platform)" : ""}</option>)}
                          </select>
                        </label>
                      )}
                      {it.kind === "gateway_settlements" && it.map.method === undefined && columnsOk && (
                        <label className="grid gap-1 sm:col-span-2">
                          <span className="text-slate-300">This file has no payment method column. Which methods are in it?</span>
                          <select id={`method-${it.uid}`} value={it.methodHint} onChange={(e) => setMethodHint(it.uid, e.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5">
                            {FILE_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                          </select>
                          {!it.methodHint && <span className="text-xs text-slate-400">With a mix, each payment is checked against your highest rate, so only clear overcharges are flagged.</span>}
                        </label>
                      )}
                    </div>}
                    {ok && !editing.has(it.uid) && it.kind === "gateway_settlements" && it.map.method === undefined && (
                      <p className="mt-1 text-xs text-slate-400">No payment method column, so ReconOS reads this file as: {FILE_METHODS.find((m) => m.key === it.methodHint)?.label}. <button type="button" className="text-emerald-300 hover:underline" onClick={() => setEditing(new Set([...editing, it.uid]))}>Change</button></p>
                    )}
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

        </div>
      </Step>

      <Step n={3} title="Check each partner's rates (required)" sub="ReconOS checks every fee and shipping charge against the rates you agreed. We've filled in what you were charged most often. Check each number against your agreement, or fill it from your rate card document, then tick to confirm.">
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
                  {isOpen && <div className="border-t border-slate-800 px-5 py-4"><RateCardEditor card={c} onChange={setCard} data={data} /></div>}
                </Panel>
              );
            })}
          </div>
        )}
      </Step>

      <Step n={4} title="Run the audit">
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
