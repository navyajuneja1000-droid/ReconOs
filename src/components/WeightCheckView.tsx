import React, { useMemo, useRef, useState } from "react";
import type { Tab } from "./Navbar";
import { intakeTable, isReady, runAuditFull, type Intake } from "../engine/intake";
import { emptyCard, PARTNER_BY_ID, PARTNERS, partnerName, type RateCard } from "../engine/partners";
import { download, readTable, UnsupportedFileError } from "../engine/readFile";
import { FALLBACK_COURIER_DAYS } from "../engine/types";
import { addWorkingDays, daysBetween } from "../engine/util";
import { Btn, fmtDay, inr, Panel, PanelHead } from "../ui";
import { Locked } from "./AccountView";

type Item = Intake & { uid: string };
let seq = 0;

const COURIERS = PARTNERS.filter((p) => p.type === "courier" && p.id !== "other_courier");

/** Working days a brand has to dispute this courier's weight charges, and where that number came from. */
export function disputeDays(partner: string, cards: Record<string, RateCard>): { days: number; from: "card" | "usual" } {
  const typed = Number(cards[partner]?.values.weightDisputeDays);
  if (Number.isFinite(typed) && typed > 0) return { days: Math.round(typed), from: "card" };
  return { days: PARTNER_BY_ID[partner]?.exampleCourier?.weightDisputeDays ?? FALLBACK_COURIER_DAYS.weightDisputeDays, from: "usual" };
}

/** Today's date at midnight UTC, the way the rest of the app counts days. */
const today = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};

/** A calendar file with a reminder every Monday and Thursday at 10 am India time. */
export function reminderIcs(from: Date, url: string): string {
  const d = new Date(from);
  while (![1, 4].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReconOS//Weekly weight check//EN",
    "BEGIN:VEVENT",
    `UID:weight-check-${ymd}@reconos`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T043000Z`,
    `DTEND:${ymd}T044500Z`,
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TH",
    "SUMMARY:ReconOS weekly weight check",
    `DESCRIPTION:Download your courier's weight report and check it on ReconOS. Dispute anything flagged before its last date. ${url}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function WeightCheckView({
  cards, setCard, sample, sampleAsOf, setTab, locked = false,
}: {
  cards: Record<string, RateCard>;
  setCard: (c: RateCard) => void;
  sample: Intake[];
  sampleAsOf: Date;
  setTab: (t: Tab) => void;
  /** weekly checks on the brand's own files are a paid feature when accounts are on */
  locked?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const mine = items.filter((i) => i.kind === "courier_weight");
  const ready = mine.filter(isReady);
  const usingSample = ready.length === 0;
  const asOf = usingSample ? sampleAsOf : today();
  const weightFiles = usingSample ? sample.filter((i) => i.kind === "courier_weight") : ready;

  const weights = useMemo(() => runAuditFull(weightFiles).data.weights, [weightFiles]);
  const couriers = [...new Set(weights.map((w) => w.partner))];

  const rows = useMemo(
    () =>
      weights.map((w) => {
        const { days } = disputeDays(w.partner, cards);
        const deadline = w.raisedAt ? addWorkingDays(w.raisedAt, days) : null;
        const daysLeft = deadline ? daysBetween(asOf, deadline) : null;
        const group =
          w.status === "disputed" ? "disputed" : w.status === "closed" ? "closed" : w.status === "accepted" || (daysLeft !== null && daysLeft < 0) ? "lost" : "open";
        return { w, deadline, daysLeft, group };
      }),
    [weights, cards, asOf],
  );

  const open = rows.filter((r) => r.group === "open").sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.w.extraCharge - a.w.extraCharge);
  const urgent = open.filter((r) => r.daysLeft !== null && r.daysLeft <= 2);
  const lost = rows.filter((r) => r.group === "lost");
  const disputed = rows.filter((r) => r.group === "disputed");
  const sum = (list: typeof rows) => list.reduce((a, r) => a + r.w.extraCharge, 0);

  const add = async (files: FileList | File[]) => {
    setBusy(true);
    const out: Item[] = [];
    const errs: { name: string; message: string }[] = [];
    for (const f of Array.from(files)) {
      try {
        const it = intakeTable(f.name, await readTable(f));
        if (it.kind !== "courier_weight") {
          errs.push({ name: f.name, message: "This doesn't look like a courier weight report. Add it on the Upload files page for the monthly audit, or export the weight discrepancy (weight reconciliation) report instead." });
          continue;
        }
        out.push({ ...it, uid: `w${++seq}` });
      } catch (e) {
        errs.push({ name: f.name, message: e instanceof UnsupportedFileError ? e.message : "This file couldn't be read. Export it again as CSV or Excel and try once more." });
      }
    }
    setItems((prev) => [...prev, ...out]);
    setErrors(errs);
    setBusy(false);
  };

  const setPartner = (uid: string, partner: string) =>
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...intakeTable(it.name, it.table, { kind: "courier_weight", headerRow: it.headerRow, partner: partner || null }), uid } : it)));

  const setDays = (partner: string, v: string) => {
    const card = cards[partner] ?? emptyCard(partner);
    setCard({ ...card, values: { ...card.values, weightDisputeDays: v } });
  };

  const downloadList = () => {
    const head = ["Last day to dispute", "Days left", "Courier", "AWB", "Order", "Weight you entered (kg)", "Weight charged (kg)", "Extra charge (Rs)"];
    const body = open.map((r) => [r.deadline ? fmtDay(r.deadline) : "Unknown", r.daysLeft ?? "", partnerName(r.w.partner), r.w.awb, r.w.orderId, r.w.enteredKg, r.w.chargedKg, r.w.extraCharge]);
    download(`weight-charges-to-dispute-${asOf.toISOString().slice(0, 10)}.csv`, [head, ...body].map((r) => r.map(csvCell).join(",")).join("\n"));
  };

  const due = (r: (typeof rows)[number]) => {
    if (r.daysLeft === null) return <span className="text-slate-400">No date in file</span>;
    const tone = r.daysLeft <= 1 ? "bg-rose-500/15 text-rose-300" : r.daysLeft <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-slate-800 text-slate-300";
    return (
      <span className="grid gap-0.5">
        <span>{fmtDay(r.deadline)}</span>
        <span className={`w-fit rounded-md px-1.5 py-0.5 text-xs font-medium ${tone}`}>{r.daysLeft === 0 ? "Last day" : r.daysLeft === 1 ? "1 day left" : `${r.daysLeft} days left`}</span>
      </span>
    );
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Weekly weight check</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Catch wrong weight charges while you can still dispute them. Upload one file, your courier's weight report, every Monday and Thursday. It takes about two minutes.</p>
      </div>

      <Panel className="grid gap-5 p-5 md:grid-cols-3">
        <div>
          <h2 className="font-semibold">The problem</h2>
          <p className="mt-1 text-sm text-slate-300">When a courier re-weighs a parcel and finds it heavier than you entered, it bills you extra. You can dispute that, but only for a few working days after the charge is raised, often about 7. After that, the extra charge is final.</p>
        </div>
        <div>
          <h2 className="font-semibold">Why monthly is too late</h2>
          <p className="mt-1 text-sm text-slate-300">Weight charges come in all month. By the time you run the monthly audit, most of them are past their last date. They show up as money already lost, with nothing left to do about it.</p>
        </div>
        <div>
          <h2 className="font-semibold">Why Monday and Thursday</h2>
          <p className="mt-1 text-sm text-slate-300">Checking twice a week means a charge waits at most 3 working days before you see it. With a 7 working day window, that still leaves you about 4 days to send your proof.</p>
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Add this week's weight report" sub="Weight discrepancy or weight reconciliation report, as CSV or Excel. Read in this browser and never uploaded." />
        <div className="grid gap-4 p-5">
          <label
            htmlFor="weight-file-input"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
            className={`grid cursor-pointer place-items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? "border-emerald-400 bg-emerald-500/5" : "border-slate-700 hover:border-slate-500"}`}
          >
            <span className="font-medium">{busy ? "Reading…" : "Drop the file here or tap to choose"}</span>
            <span className="text-sm text-slate-400">One file per courier</span>
          </label>
          <input ref={input} id="weight-file-input" type="file" multiple accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />

          {errors.map((e) => <p key={e.name} className="text-sm text-rose-300"><strong className="font-medium">{e.name}:</strong> {e.message}</p>)}

          {mine.length > 0 && (
            <ul className="grid gap-2">
              {mine.map((it) => (
                <li key={it.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm">
                  <span className="min-w-0 break-all">{it.name}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {it.partner ? <span className="text-slate-400">{partnerName(it.partner)}</span> : (
                      <label className="flex items-center gap-2 text-amber-200">
                        Which courier?
                        <select aria-label={`Courier for ${it.name}`} value="" onChange={(e) => setPartner(it.uid, e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100">
                          <option value="">Choose</option>
                          {PARTNERS.filter((p) => p.type === "courier").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                    )}
                    {it.partner && it.missing.length > 0 && <span className="text-amber-200">Some columns weren't found. Open it on the Upload files page to match them.</span>}
                    <Btn variant="ghost" className="px-2 py-1 text-slate-400" onClick={() => setItems((prev) => prev.filter((x) => x.uid !== it.uid))}>Remove</Btn>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="text-sm text-slate-300">
            <summary className="cursor-pointer text-slate-200">Where to download it</summary>
            <ul className="mt-2 grid gap-1">
              {COURIERS.filter((p) => p.reports.courier_weight).map((p) => <li key={p.id}><span className="font-medium">{p.name}:</span> {p.reports.courier_weight}</li>)}
            </ul>
            <p className="mt-2 text-slate-400">Menu names change sometimes. If you can't find it, ask your courier's support for the weight discrepancy report.</p>
          </details>
        </div>
      </Panel>

      {usingSample && <p className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">Showing an example with the sample brand's data, as of {fmtDay(sampleAsOf)}. Add your own weight report above to see yours.</p>}

      {!usingSample && locked && (
        <Locked title={`${open.length} weight charge${open.length === 1 ? "" : "s"} found in your file, worth ${inr(sum(open))}`}>
          The weekly weight check is part of ReconOS Pro: every charge you can still dispute, closest deadline first, with a download and reminders.
        </Locked>
      )}
      {(usingSample || !locked) && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "You can still dispute", value: inr(sum(open)), sub: `${open.length} charge${open.length === 1 ? "" : "s"}`, tone: "text-emerald-400" },
          { label: "Due in 2 days or less", value: String(urgent.length), sub: urgent.length ? inr(sum(urgent)) : "Nothing urgent", tone: urgent.length ? "text-rose-300" : "text-slate-200" },
          { label: "Already disputed", value: inr(sum(disputed)), sub: `${disputed.length} charge${disputed.length === 1 ? "" : "s"}`, tone: "text-slate-200" },
          { label: "Missed", value: inr(sum(lost)), sub: "Accepted or past the last date", tone: "text-slate-400" },
        ].map((t) => (
          <Panel key={t.label} className="p-4">
            <p className="text-sm text-slate-400">{t.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${t.tone}`}>{t.value}</p>
            <p className="text-xs text-slate-400">{t.sub}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHead
          title="Dispute these, closest date first"
          sub="Send the courier a photo of the packed parcel on a weighing scale with the shipping label visible, and its length, width and height."
          right={<Btn onClick={downloadList} disabled={!open.length}>Download list</Btn>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Last day</th>
                <th className="px-5 py-2 font-medium">Courier</th>
                <th className="px-5 py-2 font-medium">AWB</th>
                <th className="px-5 py-2 font-medium">Order</th>
                <th className="px-5 py-2 text-right font-medium">You entered</th>
                <th className="px-5 py-2 text-right font-medium">Charged for</th>
                <th className="px-5 py-2 text-right font-medium">Extra charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {open.map((r) => (
                <tr key={`${r.w.partner}:${r.w.awb}`}>
                  <td className="whitespace-nowrap px-5 py-2">{due(r)}</td>
                  <td className="px-5 py-2 text-slate-300">{partnerName(r.w.partner)}</td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-300">{r.w.awb}</td>
                  <td className="px-5 py-2 text-slate-300">{r.w.orderId || "–"}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{r.w.enteredKg} kg</td>
                  <td className="px-5 py-2 text-right tabular-nums">{r.w.chargedKg} kg</td>
                  <td className="px-5 py-2 text-right font-semibold tabular-nums text-emerald-400">{inr(r.w.extraCharge)}</td>
                </tr>
              ))}
              {!open.length && <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-400">{weights.length ? "Nothing left to dispute in this file." : "No weight charges found in this file."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      </>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead title="Days you get to dispute" sub="Working days from when the charge is raised. Check your courier agreement; this is saved in your rate card." />
          <div className="grid gap-3 p-5">
            {couriers.map((p) => {
              const d = disputeDays(p, cards);
              return (
                <label key={p} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{partnerName(p)}</span>
                    <span className="block text-slate-400">{d.from === "card" ? "From your rate card" : "The usual window. Change it if yours is different."}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      id={`dispute-days-${p}`}
                      inputMode="numeric"
                      aria-label={`Working days to dispute ${partnerName(p)} weight charges`}
                      value={cards[p]?.values.weightDisputeDays ?? ""}
                      placeholder={String(d.days)}
                      onChange={(e) => setDays(p, e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                      className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-base tabular-nums"
                    />
                    <span className="text-slate-400">days</span>
                  </span>
                </label>
              );
            })}
            {!couriers.length && <p className="text-sm text-slate-400">Add a weight report to set this for each courier.</p>}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Get a reminder" sub="So the check happens without you having to remember it." />
          <div className="grid gap-3 p-5 text-sm text-slate-300">
            <p>Add a repeating reminder to your calendar for every Monday and Thursday at 10 am. It works with Google Calendar, Outlook and Apple Calendar.</p>
            <div className="flex flex-wrap gap-3">
              <Btn variant="primary" onClick={() => download("reconos-weight-check.ics", reminderIcs(today(), `${window.location.origin}/#weights`), "text/calendar")}>Add Monday and Thursday reminder</Btn>
              <Btn onClick={() => setTab("upload")}>Run the full monthly audit</Btn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
