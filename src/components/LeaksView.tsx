import React, { useMemo, useState } from "react";
import type { ViewCtx } from "../App";
import { buildClaims, findingsCsv } from "../engine/claims";
import type { BucketId, Counterparty, Finding } from "../engine/types";
import { Btn, fmtDay, inr, KindTag, Panel, PanelHead, useCopy } from "../ui";

function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Item({ f }: { f: Finding }) {
  return (
    <li className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind={f.kind} />
          <span className="font-medium">{f.title}</span>
          {f.deadline && <span className={`text-xs font-medium ${(f.daysLeft ?? 9) <= 2 ? "text-rose-300" : "text-amber-300"}`}>Dispute by {fmtDay(f.deadline)}</span>}
        </div>
        <p className="mt-1 text-sm text-slate-300">{f.reason}</p>
        <p className="mt-1 text-xs text-slate-500 [overflow-wrap:anywhere]">{[f.orderId && `Order ${f.orderId}`, f.awb && `AWB ${f.awb}`, f.ref && `Ref ${f.ref}`, `Raise with ${f.counterparty}`].filter(Boolean).join(", ")}</p>
      </div>
      <p className={`font-semibold tabular-nums sm:text-right ${f.kind === "claim" ? "text-emerald-400" : "text-amber-300"}`}>{inr(f.amount)}</p>
    </li>
  );
}

export function LeaksView({ result, brandName, source }: ViewCtx) {
  const [kind, setKind] = useState<"all" | "claim" | "check">("all");
  const [who, setWho] = useState<"all" | Counterparty>("all");
  const { copied, copy } = useCopy();
  const drafts = useMemo(() => buildClaims(result, source === "sample" ? "Indigo Loom" : brandName), [result, brandName, source]);
  const shown = result.findings.filter((f) => (kind === "all" || f.kind === kind) && (who === "all" || f.counterparty === who));
  const groups = result.buckets.map((b) => ({ b, items: shown.filter((f) => f.bucket === b.id) })).filter((g) => g.items.length);
  const whos = Array.from(new Set(result.findings.map((f) => f.counterparty)));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Leaks & claims</h1>
          <p className="mt-1 max-w-[70ch] text-slate-300">
            <span className="text-emerald-300">Claim</span> means your files prove the money is owed. <span className="text-amber-300">Check</span> means something doesn't add up and needs a look before you raise it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => copy("csv", findingsCsv(result))}>{copied === "csv" ? "Copied" : "Copy as CSV"}</Btn>
          <Btn onClick={() => download("reconos-leaks.csv", findingsCsv(result))}>Download CSV</Btn>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "claim", "check"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-sm ${kind === k ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            {k === "all" ? `Everything ${inr(result.claimTotal + result.checkTotal)}` : k === "claim" ? `Claim ${inr(result.claimTotal)}` : `Check ${inr(result.checkTotal)}`}
          </button>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-slate-800 sm:block" />
        {(["all", ...whos] as const).map((w) => (
          <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(w as typeof who)} className={`rounded-full border px-3 py-1.5 text-sm ${who === w ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            {w === "all" ? "Everyone" : w}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-4">
          {groups.map(({ b, items }) => (
            <Panel key={b.id}>
              <PanelHead
                title={b.title}
                sub={b.blurb}
                right={<p className="font-semibold tabular-nums text-slate-100">{inr(items.reduce((a, f) => a + f.amount, 0))}</p>}
              />
              <ul className="divide-y divide-slate-800">{items.map((f) => <Item key={f.id} f={f} />)}</ul>
            </Panel>
          ))}
          {!groups.length && <Panel className="p-8 text-center text-slate-400">Nothing found for these filters.</Panel>}
          {result.buckets.filter((b) => !b.ran).map((b: { id: BucketId; title: string; needs: string }) => (
            <p key={b.id} className="rounded-xl border border-dashed border-slate-700 px-5 py-3 text-sm text-slate-400">
              <span className="font-medium text-slate-300">{b.title}:</span> not checked. Add {b.needs}.
            </p>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <h2 className="text-lg font-semibold">Claim emails, ready to send</h2>
          {drafts.map((d) => (
            <Panel key={d.counterparty} className="flex flex-col">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">To {d.counterparty}</h3>
                  <span className="font-semibold tabular-nums text-emerald-400">{inr(d.total)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Send via {d.to}</p>
                <p className="mt-2 text-sm"><span className="text-slate-400">Subject:</span> {d.subject}</p>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-5 py-4 font-sans text-sm leading-relaxed text-slate-300">{d.body}</pre>
              <div className="flex flex-wrap gap-2 border-t border-slate-800 p-3">
                <Btn variant="primary" onClick={() => copy(d.counterparty, `Subject: ${d.subject}\n\n${d.body}`)}>{copied === d.counterparty ? "Copied" : "Copy email"}</Btn>
                <Btn onClick={() => download(`claim-${d.counterparty.toLowerCase()}.txt`, `Subject: ${d.subject}\n\n${d.body}`, "text/plain")}>Download</Btn>
              </div>
            </Panel>
          ))}
          {!drafts.length && <Panel className="p-5 text-sm text-slate-400">No claims to send. Items marked Check need a look first.</Panel>}
        </div>
      </div>
    </div>
  );
}
