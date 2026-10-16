import React, { useRef, useState } from "react";
import {
  COURIER_EXTRA_FIELDS, exampleCard, fixKey, GATEWAY_FIELDS, isCardComplete, isCardReady, missingRates, PARTNER_BY_ID,
  pctKey, ZONE_LABEL, zoneKey, ZONES, type RateCard, type RateField,
} from "../engine/partners";
import { INSTRUMENTS } from "../engine/instruments";
import { extractRates, toLines } from "../engine/rateExtract";
import { suggestCard } from "../engine/suggest";
import type { Dataset } from "../engine/types";
import { Btn } from "../ui";

const sameZones = (v: Record<string, string>) => ZONES.every((z) => (v[zoneKey(z, "extra")] ?? "") === (v[zoneKey(z, "first")] ?? ""));

/** Small note under a field: where its value came from. */
function Note({ text }: { text?: string }) {
  if (!text) return null;
  const warn = /^Heads up|Couldn't read/.test(text);
  return <span className={`block text-xs ${warn ? "text-amber-300" : "text-emerald-300/80"}`}>{text}</span>;
}

export function CardStatus({ card }: { card: RateCard | undefined }) {
  if (isCardReady(card)) return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Rates confirmed</span>;
  if (card && isCardComplete(card)) return <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">{card.example ? "Example rates, please check" : "Tick to confirm"}</span>;
  const left = card ? missingRates(card).length : null;
  return <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">{left === null ? "Rates needed" : `${left} rate${left === 1 ? "" : "s"} to fill`}</span>;
}

function Num({ id, value, onChange, unit, label, blankWarn, placeholder = "–" }: { id: string; value: string | undefined; onChange: (v: string) => void; unit: RateField["unit"]; label: string; blankWarn: boolean; placeholder?: string }) {
  const blank = value === undefined || value.trim() === "";
  const bad = !blank && !(Number.isFinite(Number(value)) && Number(value) >= 0);
  return (
    <span className={`flex items-center rounded-lg border bg-slate-950 focus-within:border-emerald-400 ${bad ? "border-rose-500" : blank && blankWarn ? "border-amber-500/70" : "border-slate-700"}`}>
      {unit === "₹" && <span className="pl-2.5 text-sm text-slate-400">₹</span>}
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-base tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none"
      />
      {unit !== "₹" && <span className="pr-2.5 text-sm text-slate-400">{unit}</span>}
    </span>
  );
}

/**
 * One partner's rate card. Every rate is required; the founder can start from example rates
 * but must tick that they match their own agreement before the audit runs.
 */
export function RateCardEditor({ card, onChange, compact = false, data }: { card: RateCard; onChange: (c: RateCard) => void; compact?: boolean; data?: Dataset }) {
  const p = PARTNER_BY_ID[card.partner];
  const [same, setSame] = useState(sameZones(card.values));
  const [touched, setTouched] = useState(false);
  const [quick, setQuick] = useState("");
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!p) return null;
  const notes = card.notes ?? {};

  /** Rates read from a document replace what's there; the files then show if they were charged differently. */
  const applyDocument = (lines: string[], from: string) => {
    const got = extractRates(lines, p.type);
    const n = Object.keys(got.values).filter((k) => !k.startsWith("fix_") || got.values[k] !== "0").length;
    if (!n) {
      setMsg({ text: `No rates could be read from ${from}. Try a clearer file, or paste the rates as text.`, bad: true });
      return;
    }
    const values = { ...card.values, ...got.values };
    const fresh: Record<string, string> = { ...notes };
    for (const [k, line] of Object.entries(got.notes)) fresh[k] = k in got.values ? `From your document: "${line.length > 70 ? `${line.slice(0, 70)}…` : line}"` : line;
    let differ = 0;
    if (data) {
      const charged = suggestCard(data, { partner: card.partner, values: {}, confirmed: false, example: false });
      for (const [k, v] of Object.entries(got.values)) {
        const c = charged.values[k];
        if (c !== undefined && Number(c) !== Number(v) && !/days|Days/.test(k)) {
          fresh[k] = `Heads up: your document says ${v}, but most of your ${p.name} charges in the files were at ${c}. That gap may be money owed.`;
          differ++;
        }
      }
    }
    if (!sameZones(values)) setSame(false);
    onChange({ ...card, values, notes: fresh, source: "document", example: false, confirmed: false });
    const left = missingRates({ ...card, values }).length;
    setMsg({ text: `Read ${n} rate${n === 1 ? "" : "s"} from ${from}.${differ ? ` ${differ} differ from what you were actually charged, marked below.` : ""} ${left ? `${left} still to fill.` : "Check them, then tick to confirm."}` });
  };

  const readFile = async (f: File) => {
    setReading(true);
    setMsg({ text: /\.(png|jpe?g|webp)$/i.test(f.name) ? "Reading your screenshot. This can take up to half a minute the first time." : `Reading ${f.name}…` });
    try {
      const { readRateDocument } = await import("../engine/rateDocs");
      const doc = await readRateDocument(f);
      applyDocument(doc.lines, `your ${doc.how}`);
    } catch (e) {
      setMsg({ text: e instanceof Error && e.message && !/fetch|network|undefined/i.test(e.message) ? e.message : "That file couldn't be read. Try a PDF, an Excel file, or paste the rates as text.", bad: true });
    } finally {
      setReading(false);
    }
  };

  const fromFiles = () => {
    if (!data) return;
    const next = suggestCard(data, card);
    const filled = Object.keys(next.values).filter((k) => !(k in card.values) || card.values[k] === "").filter((k) => next.values[k] !== undefined && next.values[k] !== "").length;
    if (!sameZones(next.values)) setSame(false);
    onChange(next);
    setMsg(filled ? { text: `Filled ${filled} rate${filled === 1 ? "" : "s"} from what you were charged most often. Check them against your agreement.` } : { text: `Nothing new could be read from your ${p.name} files. Fill the rest from your agreement.`, bad: true });
  };
  const complete = isCardComplete(card);
  const left = missingRates(card);

  const set = (k: string, v: string) => {
    setTouched(true);
    const values = { ...card.values, [k]: v };
    const n = { ...notes };
    delete n[k];
    if (same && k.endsWith("_first")) {
      values[k.replace("_first", "_extra")] = v;
      delete n[k.replace("_first", "_extra")];
    }
    onChange({ ...card, values, notes: n, example: false });
  };
  const toggleSame = (on: boolean) => {
    setSame(on);
    if (on) {
      const values = { ...card.values };
      for (const z of ZONES) values[zoneKey(z, "extra")] = values[zoneKey(z, "first")] ?? "";
      onChange({ ...card, values });
    }
  };
  const uid = `rc-${card.partner}`;

  const fieldGrid = (fields: RateField[]) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <label key={f.key} className="grid content-start gap-1 text-sm">
          <span className="font-medium text-slate-200">{f.label}</span>
          <Num id={`${uid}-${f.key}`} label={`${p.name}: ${f.label}`} value={card.values[f.key]} onChange={(v) => set(f.key, v)} unit={f.unit} blankWarn={touched || card.example} />
          {notes[f.key] ? <Note text={notes[f.key]} /> : <span className="text-xs text-slate-400">{f.hint}</span>}
        </label>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3">
        <p className="text-sm font-medium text-slate-100">Fill it in for me</p>
        <div className="flex flex-wrap gap-2">
          {data && <Btn onClick={fromFiles} disabled={reading}>From what I was charged</Btn>}
          <Btn onClick={() => fileRef.current?.click()} disabled={reading}>{reading ? "Reading…" : "From my rate card or agreement"}</Btn>
          <Btn variant="ghost" onClick={() => setPaste(paste === null ? "" : null)} disabled={reading}>Paste the rates</Btn>
          <input ref={fileRef} id={`${uid}-doc`} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.txt" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
        </div>
        <p className="text-xs text-slate-400">A PDF addendum, a screenshot or photo, an Excel sheet, or text from an email. It's read on this device.{!compact && ` Where to find it: ${p.rateHelp}`}</p>
        {paste !== null && (
          <div className="grid gap-2">
            <textarea id={`${uid}-paste`} value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder={p.type === "gateway" ? "UPI - 1.2%\nDebit cards up to Rs 2000 - 0.4%\nCredit cards - 1.75%\n…" : "Zone A 34, additional 500 g 34\nCOD: 1.5% or Rs 30, whichever is higher\n…"} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600" />
            <div><Btn variant="primary" disabled={!paste.trim()} onClick={() => { applyDocument(toLines(paste), "the text you pasted"); setPaste(null); }}>Read these rates</Btn></div>
          </div>
        )}
        {msg && <p role="status" className={`text-sm ${msg.bad ? "text-amber-300" : "text-emerald-200"}`}>{msg.text}</p>}
      </div>

      {p.type === "gateway" ? (
        <>
          <div>
            <p className="text-sm font-medium text-slate-200">Fee for each payment method</p>
            <p className="mt-0.5 text-xs text-slate-400">Gateways price each method differently. Fill in the rate from your agreement for each one. If a method has a fixed fee on top, add it in the second column.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 text-sm">
              <span className="text-slate-300">Most methods on one rate?</span>
              <span className="w-24"><Num id={`${uid}-quick`} label={`${p.name}: one rate for every blank method`} value={quick} onChange={setQuick} unit="%" blankWarn={false} /></span>
              <Btn
                className="py-1.5"
                disabled={quick.trim() === "" || !Number.isFinite(Number(quick))}
                onClick={() => {
                  setTouched(true);
                  const values = { ...card.values };
                  for (const i of INSTRUMENTS) if (!(values[pctKey(i.key)] ?? "").trim()) values[pctKey(i.key)] = quick;
                  onChange({ ...card, values, example: false });
                }}
              >
                Fill the blanks
              </Btn>
            </div>
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-left text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-2 py-2 font-medium">Rate</th>
                    <th className="px-2 py-2 font-medium">+ fixed fee</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTRUMENTS.map((i, n) => (
                    <React.Fragment key={i.key}>
                      {(n === 0 || INSTRUMENTS[n - 1].group !== i.group) && (
                        <tr className="border-t border-slate-800 bg-slate-900/50"><td colSpan={3} className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">{i.group}</td></tr>
                      )}
                      <tr>
                        <td className="px-3 py-1.5">
                          <span className="text-slate-200">{i.label}</span>
                          {notes[pctKey(i.key)] ? <Note text={notes[pctKey(i.key)]} /> : i.hint && <span className="block text-xs text-slate-500">{i.hint}</span>}
                        </td>
                        <td className="w-24 px-2 py-1.5 sm:w-32">
                          <Num id={`${uid}-pct-${i.key}`} label={`${p.name}: ${i.label} rate`} value={card.values[pctKey(i.key)]} onChange={(v) => set(pctKey(i.key), v)} unit="%" blankWarn={touched || card.example} />
                        </td>
                        <td className="w-20 px-2 py-1.5 sm:w-28">
                          <Num id={`${uid}-fix-${i.key}`} label={`${p.name}: ${i.label} fixed fee (optional)`} value={card.values[fixKey(i.key)]} onChange={(v) => set(fixKey(i.key), v)} unit="₹" blankWarn={false} placeholder="0" />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {fieldGrid(GATEWAY_FIELDS)}
        </>
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">Shipping rate for each 500 g, by zone</p>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input id={`${uid}-same`} type="checkbox" checked={same} onChange={(e) => toggleSame(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                Every 500 g costs the same
              </label>
            </div>
            {p.aggregator && <p className="mt-1 text-xs text-slate-400">{p.name} prices differ by courier. Enter the courier you use most; gaps on other couriers are marked Check, not Claim.</p>}
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-left text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Zone</th>
                    <th className="px-2 py-2 font-medium">{same ? "Per 500 g" : "First 500 g"}</th>
                    {!same && <th className="px-2 py-2 font-medium">Each extra 500 g</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ZONES.map((z) => (
                    <tr key={z}>
                      <td className="px-3 py-1.5">
                        <span className="font-semibold">{z}</span> <span className="text-slate-400">{ZONE_LABEL[z]}</span>
                        <Note text={notes[zoneKey(z, "first")] ?? notes[zoneKey(z, "extra")]} />
                      </td>
                      <td className="w-28 px-2 py-1.5 sm:w-36">
                        <Num id={`${uid}-${z}-first`} label={`${p.name}: zone ${z} ${same ? "per 500 g" : "first 500 g"}`} value={card.values[zoneKey(z, "first")]} onChange={(v) => set(zoneKey(z, "first"), v)} unit="₹" blankWarn={touched || card.example} />
                      </td>
                      {!same && (
                        <td className="w-28 px-2 py-1.5 sm:w-36">
                          <Num id={`${uid}-${z}-extra`} label={`${p.name}: zone ${z} each extra 500 g`} value={card.values[zoneKey(z, "extra")]} onChange={(v) => set(zoneKey(z, "extra"), v)} unit="₹" blankWarn={touched || card.example} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {fieldGrid(COURIER_EXTRA_FIELDS)}
        </>
      )}

      <p className="text-xs text-slate-400">Enter rates the same way your {p.name} bill shows them, with or without GST.</p>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
        <Btn variant="ghost" onClick={() => { setTouched(false); setMsg(null); onChange(exampleCard(card.partner)); setSame(true); }}>Use example rates</Btn>
        <label className={`flex items-center gap-2 text-sm ${complete ? "text-slate-100" : "text-slate-500"}`}>
          <input
            id={`${uid}-confirm`}
            type="checkbox"
            disabled={!complete}
            checked={card.confirmed && complete}
            onChange={(e) => onChange({ ...card, confirmed: e.target.checked, example: e.target.checked ? false : card.example })}
            className="h-4 w-4 accent-emerald-500"
          />
          These match my {p.name} rate card
        </label>
        {!complete && <span className="text-sm text-amber-300">{left.length} left to fill</span>}
      </div>
      {card.example && <p className="-mt-2 text-xs text-amber-300">These are example rates, not yours. Wrong rates mean wrong claims, so change any that differ from your agreement.</p>}
    </div>
  );
}
