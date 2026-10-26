import React, { useMemo, useState } from "react";
import type { ViewCtx } from "../App";
import { buildClaims, findingsCsv } from "../engine/claims";
import { Locked } from "./AccountView";
import type { BucketId, Finding } from "../engine/types";
import { partnerName } from "../engine/partners";
import { Btn, fmtDay, inr, KindTag, Panel, PanelHead, useCopy } from "../ui";

export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FindingItem({ f }: { f: Finding }) {
  return (
    <li className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <KindTag kind={f.kind} />
          <span className="font-medium">{f.title}</span>
          {f.deadline && <span className={`text-xs font-medium ${(f.daysLeft ?? 9) <= 2 ? "text-rose-300" : "text-amber-300"}`}>Dispute by {fmtDay(f.deadline)}</span>}
        </div>
        <p className="mt-1 text-sm text-slate-300">{f.reason}</p>
        <p className="mt-1 text-xs text-slate-500 [overflow-wrap:anywhere]">{[f.orderId && `Order ${f.orderId}`, f.awb && `AWB ${f.awb}`, f.ref && `Ref ${f.ref}`, f.counterparty === "Your team" && f.partner ? `About ${partnerName(f.partner)}, for your team` : `Raise with ${f.counterparty}`].filter(Boolean).join(", ")}</p>
      </div>
      <p className={`font-semibold tabular-nums sm:text-right ${f.kind === "claim" ? "text-emerald-400" : "text-amber-300"}`}>{inr(f.amount)}</p>
    </li>
  );
}

export function LeaksView({ result, brandName, source, partner: who, setPartner: setWho, locked }: ViewCtx) {
  const [kind, setKind] = useState<"all" | "claim" | "check">("all");
  const { copied, copy } = useCopy();
  const allDrafts = useMemo(() => buildClaims(result, source === "sample" ? "Indigo Loom" : brandName), [result, brandName, source]);
  const matchWho = (f: Finding) => who === "all" || (who === "team" ? f.counterparty === "Your team" : f.partner === who);
  const shown = result.findings.filter((f) => (kind === "all" || f.kind === kind) && matchWho(f));
  const groups = result.buckets.map((b) => ({ b, items: shown.filter((f) => f.bucket === b.id) })).filter((g) => g.items.length);
  const drafts = allDrafts.filter((d) => who === "all" || d.partner === who);
  const sumOf = (fs: Finding[]) => fs.reduce((a, f) => a + f.amount, 0);
  const whos = [
    ...result.partners.filter((p) => p.count > 0).map((p) => ({ id: p.id, label: p.name, total: p.claimTotal + p.checkTotal })),
    ...(result.findings.some((f) => f.counterparty === "Your team") ? [{ id: "team", label: "Your team", total: sumOf(result.findings.filter((f) => f.counterparty === "Your team")) }] : []),
  ];
  const kindPool = result.findings.filter(matchWho);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Claims: money owed to you</h1>
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
            {k === "all" ? `Everything ${inr(sumOf(kindPool))}` : k === "claim" ? `Claim ${inr(sumOf(kindPool.filter((f) => f.kind === "claim")))}` : `Check ${inr(sumOf(kindPool.filter((f) => f.kind === "check")))}`}
          </button>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-slate-800 sm:block" />
        {[{ id: "all", label: "Every partner", total: 0 }, ...whos].map((w) => (
          <button key={w.id} type="button" aria-pressed={who === w.id} onClick={() => setWho(w.id)} className={`rounded-full border px-3 py-1.5 text-sm ${who === w.id ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
            {w.label}{w.id !== "all" && <span className="ml-1 text-slate-400">{inr(w.total)}</span>}
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
              <ul className="divide-y divide-slate-800">{items.map((f) => <FindingItem key={f.id} f={f} />)}</ul>
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
          <h2 className="text-lg font-semibold">Claim emails, one per partner</h2>
          {locked && drafts.length > 0 && (
            <Locked title={`${drafts.length} claim email${drafts.length === 1 ? "" : "s"} ready, worth ${inr(drafts.reduce((a, d) => a + d.total, 0))}`}>
              Upgrade to get a ready-to-send email for each partner, listing every order and amount. The list on the left stays free.
            </Locked>
          )}
          {!locked && drafts.map((d) => (
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
                <Btn onClick={() => download(`claim-${d.partner}.txt`, `Subject: ${d.subject}\n\n${d.body}`, "text/plain")}>Download</Btn>
              </div>
            </Panel>
          ))}
          {!drafts.length && <Panel className="p-5 text-sm text-slate-400">No claims to send{who !== "all" && who !== "team" ? ` to ${partnerName(who)}` : ""}. Items marked Check need a look first.</Panel>}
        </div>
      </div>
    </div>
  );
}
