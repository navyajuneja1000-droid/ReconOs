import React, { useEffect, useMemo } from "react";
import type { ViewCtx } from "../App";
import { bucketMeta } from "../engine/audit";
import { buildClaims } from "../engine/claims";
import { SPEC_BY_KIND } from "../engine/detect";
import { emptyCard, PARTNER_BY_ID } from "../engine/partners";
import type { PartnerSummary } from "../engine/types";
import { Btn, inr, Panel, PanelHead, useCopy } from "../ui";
import { FindingItem } from "./LeaksView";
import { CardStatus, RateCardEditor } from "./RateCardEditor";

const KIND_SHORT: Record<string, string> = {
  courier_shipments: "Shipments & charges",
  courier_cod: "COD remittance",
  courier_weight: "Weight discrepancies",
  gateway_settlements: "Settlement report",
};

export function TypeTag({ p }: { p: Pick<PartnerSummary, "id" | "type"> }) {
  const agg = PARTNER_BY_ID[p.id]?.aggregator;
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${p.type === "gateway" ? "border-sky-500/30 bg-sky-500/10 text-sky-300" : "border-violet-500/30 bg-violet-500/10 text-violet-300"}`}>
      {p.type === "gateway" ? "Gateway" : agg ? "Aggregator" : "Courier"}
    </span>
  );
}

function reportsLine(p: PartnerSummary) {
  const total = p.files.length + p.missingFiles.length;
  if (!p.files.length) return "No reports added";
  return p.missingFiles.length ? `${p.files.length} of ${total} reports added` : total === 1 ? "Report added" : `All ${total} reports added`;
}

function Detail({ p, ctx }: { p: PartnerSummary; ctx: ViewCtx }) {
  const { result, setPartner, setTab, cards, setCard, source, brandName } = ctx;
  const { copied, copy } = useCopy();
  const findings = result.findings.filter((f) => f.partner === p.id);
  const draft = useMemo(() => buildClaims(result, source === "sample" ? "Indigo Loom" : brandName).find((d) => d.partner === p.id), [result, source, brandName, p.id]);
  const profile = PARTNER_BY_ID[p.id];
  const card = cards[p.id] ?? emptyCard(p.id);
  useEffect(() => window.scrollTo({ top: 0 }), [p.id]);

  return (
    <div className="grid gap-6">
      <div>
        <button type="button" onClick={() => setPartner("all")} className="text-sm text-emerald-300 hover:underline">← All partners</button>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{p.name}</h1>
          <TypeTag p={p} />
          {profile.status === "beta" && <span className="text-xs text-slate-400">Reading its reports is in beta</span>}
        </div>
        <p className="mt-1 text-slate-400">{reportsLine(p)}. {p.type === "gateway" ? "Fees, settlements and refunds for payments it took." : "COD payouts, charges and weight disputes for parcels it shipped."}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4"><p className="text-sm text-slate-400">You can claim</p><p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{inr(p.claimTotal)}</p><p className="mt-1 text-xs text-slate-400">{findings.filter((f) => f.kind === "claim").length} items with proof</p></Panel>
        <Panel className="p-4"><p className="text-sm text-slate-400">Worth a check</p><p className="mt-1 text-2xl font-bold tabular-nums text-amber-300">{inr(p.checkTotal)}</p><p className="mt-1 text-xs text-slate-400">{findings.filter((f) => f.kind === "check").length} items to look at</p></Panel>
        <Panel className="p-4 sm:col-span-2">
          <p className="text-sm text-slate-400">In {p.name}'s files</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {p.volume.map((v) => (<React.Fragment key={v.label}><dt className="text-slate-400">{v.label}</dt><dd className="text-right font-medium tabular-nums">{v.value}</dd></React.Fragment>))}
            {!p.volume.length && <dd className="col-span-2 text-slate-400">No {p.name} file added yet.</dd>}
          </dl>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHead title="Leaks by type" />
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400"><tr><th className="px-5 py-2 font-medium">Type</th><th className="px-3 py-2 text-right font-medium">Claim</th><th className="px-5 py-2 text-right font-medium">Check</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {p.byBucket.map((b) => (
                  <tr key={b.bucket}>
                    <td className="px-5 py-2 text-slate-300">{bucketMeta(b.bucket).title}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(b.claim)}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-amber-300">{inr(b.check)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel>
            <PanelHead
              title={`Every ${p.name} item`}
              sub={findings.length ? `${findings.length} found` : undefined}
              right={findings.length ? <Btn onClick={() => setTab("leaks")}>Open in Leaks & claims</Btn> : undefined}
            />
            <ul className="divide-y divide-slate-800">
              {findings.map((f) => <FindingItem key={f.id} f={f} />)}
              {!findings.length && <li className="px-5 py-6 text-sm text-slate-400">Nothing found for {p.name}. Everything ReconOS could check matched.</li>}
            </ul>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel>
            <PanelHead title="Reports" sub="Each one switches on more checks" />
            <ul className="divide-y divide-slate-800 text-sm">
              {[...p.files, ...p.missingFiles].map((k) => {
                const have = p.files.includes(k);
                return (
                  <li key={k} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                    <span className="text-slate-300">{KIND_SHORT[k] ?? SPEC_BY_KIND[k].label}{!have && <span className="block text-xs text-slate-500">{profile.reports[k]}</span>}</span>
                    <span className={`shrink-0 text-xs font-medium ${have ? "text-emerald-300" : "text-slate-500"}`}>{have ? "Added" : "Not added"}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Rate card" sub="Change a rate and every check updates" right={<CardStatus card={card} />} />
            <div className="px-5 py-4"><RateCardEditor key={p.id} card={card} onChange={setCard} compact /></div>
          </Panel>

          {draft && (
            <Panel className="flex flex-col">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="flex items-baseline justify-between gap-3"><h2 className="font-semibold">Claim email to {p.name}</h2><span className="font-semibold tabular-nums text-emerald-400">{inr(draft.total)}</span></div>
                <p className="mt-1 text-sm text-slate-400">Send via {draft.to}</p>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-5 py-4 font-sans text-sm leading-relaxed text-slate-300">{draft.body}</pre>
              <div className="border-t border-slate-800 p-3"><Btn variant="primary" onClick={() => copy("d", `Subject: ${draft.subject}\n\n${draft.body}`)}>{copied === "d" ? "Copied" : "Copy email"}</Btn></div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export function PartnersView(ctx: ViewCtx) {
  const { result, partner, setPartner, setTab, cards } = ctx;
  const sel = result.partners.find((p) => p.id === partner);
  if (sel) return <Detail p={sel} ctx={ctx} />;

  if (!result.partners.length) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-semibold">No couriers or gateways yet</h1>
        <p className="mx-auto mt-2 max-w-[52ch] text-slate-300">Add a file from any courier or payment gateway you use, with its rate card, to see each partner side by side.</p>
        <Btn variant="primary" className="mt-5" onClick={() => setTab("upload")}>Upload files</Btn>
      </Panel>
    );
  }
  const groups = [
    { title: "Payment gateways", list: result.partners.filter((p) => p.type === "gateway") },
    { title: "Couriers", list: result.partners.filter((p) => p.type === "courier") },
  ].filter((g) => g.list.length);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partners</h1>
        <p className="mt-1 max-w-[70ch] text-slate-300">Every courier and payment gateway in your files, side by side. Open one to see only its leaks, its reports and its rate card.</p>
      </div>

      <Panel>
        <PanelHead title="Side by side" sub={`${result.partners.length} partners, ${inr(result.claimTotal)} to claim in total`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Partner</th>
                <th className="px-3 py-2 text-right font-medium">To claim</th>
                <th className="px-3 py-2 text-right font-medium">To check</th>
                <th className="px-3 py-2 text-right font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Reports</th>
                <th className="px-5 py-2 font-medium">Rates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {result.partners.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-slate-800/40" onClick={() => setPartner(p.id)}>
                  <td className="px-5 py-2.5"><button type="button" className="mr-2 font-medium hover:underline" onClick={(e) => { e.stopPropagation(); setPartner(p.id); }}>{p.name}</button><TypeTag p={p} /></td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-400">{inr(p.claimTotal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{inr(p.checkTotal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.count}</td>
                  <td className="px-3 py-2.5 text-slate-300">{reportsLine(p)}</td>
                  <td className="px-5 py-2.5"><CardStatus card={cards[p.id]} /></td>
                </tr>
              ))}
              <tr className="border-t border-slate-700 font-semibold">
                <td className="px-5 py-2.5">All partners</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400">{inr(result.partners.reduce((a, p) => a + p.claimTotal, 0))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{inr(result.partners.reduce((a, p) => a + p.checkTotal, 0))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{result.partners.reduce((a, p) => a + p.count, 0)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {groups.map((g) => (
        <section key={g.title} className="grid gap-3">
          <h2 className="text-lg font-semibold">{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.list.map((p) => (
              <button key={p.id} type="button" id={`partner-${p.id}`} onClick={() => setPartner(p.id)} className="grid content-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:border-slate-600">
                <div className="flex items-center justify-between gap-2"><span className="text-lg font-semibold">{p.name}</span><TypeTag p={p} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-slate-400">To claim</p><p className="text-xl font-bold tabular-nums text-emerald-400">{inr(p.claimTotal)}</p></div>
                  <div><p className="text-xs text-slate-400">To check</p><p className="text-xl font-bold tabular-nums text-amber-300">{inr(p.checkTotal)}</p></div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {p.volume.slice(0, 4).map((v) => (<React.Fragment key={v.label}><dt className="text-slate-400">{v.label}</dt><dd className="text-right tabular-nums">{v.value}</dd></React.Fragment>))}
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs">
                  <span className={p.missingFiles.length ? "text-slate-400" : "text-emerald-300"}>{reportsLine(p)}</span>
                  <CardStatus card={cards[p.id]} />
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
