import React, { useState } from "react";
import {
  COURIER_EXTRA_FIELDS, exampleCard, GATEWAY_FIELDS, isCardComplete, isCardReady, missingRates, PARTNER_BY_ID,
  ZONE_LABEL, zoneKey, ZONES, type RateCard, type RateField,
} from "../engine/partners";
import { Btn } from "../ui";

export function CardStatus({ card }: { card: RateCard | undefined }) {
  if (isCardReady(card)) return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Rates confirmed</span>;
  if (card && isCardComplete(card)) return <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">{card.example ? "Example rates, please check" : "Tick to confirm"}</span>;
  const left = card ? missingRates(card).length : null;
  return <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">{left === null ? "Rates needed" : `${left} rate${left === 1 ? "" : "s"} to fill`}</span>;
}

function Num({ id, value, onChange, unit, label, blankWarn }: { id: string; value: string | undefined; onChange: (v: string) => void; unit: RateField["unit"]; label: string; blankWarn: boolean }) {
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
        placeholder="–"
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
export function RateCardEditor({ card, onChange, compact = false }: { card: RateCard; onChange: (c: RateCard) => void; compact?: boolean }) {
  const p = PARTNER_BY_ID[card.partner];
  const zonesSame = ZONES.every((z) => (card.values[zoneKey(z, "extra")] ?? "") === (card.values[zoneKey(z, "first")] ?? ""));
  const [same, setSame] = useState(zonesSame);
  const [touched, setTouched] = useState(false);
  if (!p) return null;
  const complete = isCardComplete(card);
  const left = missingRates(card);

  const set = (k: string, v: string) => {
    setTouched(true);
    const values = { ...card.values, [k]: v };
    if (same && k.endsWith("_first")) values[k.replace("_first", "_extra")] = v;
    onChange({ ...card, values, example: false });
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
          <span className="text-xs text-slate-400">{f.hint}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4">
      {!compact && <p className="text-sm text-slate-400">Where to find it: {p.rateHelp}</p>}

      {p.type === "gateway" ? (
        fieldGrid(GATEWAY_FIELDS)
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
        <Btn onClick={() => { setTouched(false); onChange(exampleCard(card.partner)); setSame(true); }}>Start from example rates</Btn>
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
