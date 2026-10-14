"use client";

import { useMemo, useState } from "react";
import type { AuditResult, BucketSummary, Finding } from "@/engine/types";
import { buildClaims, findingsCsv } from "@/engine/claims";
import { fmtDate, fmtINR } from "@/engine/util";
import { download } from "@/lib/readFile";

function Amount({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`figure ${className}`}>{fmtINR(n, { decimals: false })}</span>;
}

function Tag({ kind }: { kind: Finding["kind"] }) {
  return kind === "claim" ? (
    <span className="rounded border border-stamp/40 bg-stamp-soft px-1.5 py-0.5 text-xs font-medium text-stamp">Claim</span>
  ) : (
    <span className="rounded border border-amber/30 bg-amber-soft px-1.5 py-0.5 text-xs font-medium text-amber">Check</span>
  );
}

function BucketBlock({ b, findings, open, onToggle }: { b: BucketSummary; findings: Finding[]; open: boolean; onToggle: () => void }) {
  const total = b.claimTotal + b.checkTotal;
  if (!b.ran) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-sheet/60 p-4">
        <p className="font-medium text-ink-2">{b.title}</p>
        <p className="mt-1 text-sm text-muted">Not checked. Add {b.needs} to run this check.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-rule bg-sheet">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-paper/50 sm:p-5" disabled={!findings.length}>
        <div className="min-w-0">
          <p className="font-semibold">{b.title}</p>
          <p className="mt-1 text-sm text-muted">{b.blurb}</p>
          <p className="mt-2 text-sm text-ink-2">
            {findings.length === 0 ? "Nothing found. This all matches." : `${findings.length} item${findings.length === 1 ? "" : "s"}${open ? "" : ", show list"}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {b.claimTotal > 0 && (
            <p className="text-lg font-semibold text-stamp"><Amount n={b.claimTotal} /></p>
          )}
          {b.checkTotal > 0 && (
            <p className={`${b.claimTotal > 0 ? "text-sm" : "text-lg font-semibold"} text-amber`}>
              <Amount n={b.checkTotal} /> to check
            </p>
          )}
          {total === 0 && <p className="text-lg font-semibold text-moss">₹0</p>}
        </div>
      </button>
      {open && findings.length > 0 && (
        <div className="border-t border-rule-2">
          <ul className="divide-y divide-rule-2">
            {findings.map((f) => (
              <li key={f.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:gap-4 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag kind={f.kind} />
                    <span className="font-medium">{f.title}</span>
                    {f.deadline && f.daysLeft !== undefined && (
                      <span className={`text-xs font-medium ${f.daysLeft <= 2 ? "text-stamp" : "text-amber"}`}>Dispute by {fmtDate(f.deadline)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{f.reason}</p>
                  <p className="mt-1 break-all text-xs text-muted">
                    {[f.orderId && `Order ${f.orderId}`, f.awb && `AWB ${f.awb}`, f.ref && `Ref ${f.ref}`].filter(Boolean).join(", ")}
                  </p>
                </div>
                <p className={`text-right font-semibold ${f.kind === "claim" ? "text-ink" : "text-amber"}`}><Amount n={f.amount} /></p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// The shareable preview runs where downloads are blocked, so it offers copy buttons only.
const CAN_DOWNLOAD = process.env.RECONOS_PREVIEW !== "1";

export function Results({ result, businessName, onRestart, isSample }: { result: AuditResult; businessName: string; onRestart: () => void; isSample: boolean }) {
  const [open, setOpen] = useState<string | null>(result.buckets.find((b) => b.count > 0)?.id ?? null);
  const [copied, setCopied] = useState<string | null>(null);
  const drafts = useMemo(() => buildClaims(result, businessName || "our store"), [result, businessName]);
  const c = result.cash;
  const claimCount = result.findings.filter((f) => f.kind === "claim").length;
  const checkCount = result.findings.length - claimCount;
  const urgent = result.findings.filter((f) => f.deadline && (f.daysLeft ?? 99) <= 3);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="grid gap-10">
      <section aria-labelledby="summary" className="grid gap-6 rounded-xl border border-rule bg-sheet p-5 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h2 id="summary" className="text-sm text-muted">
            {isSample ? "Sample audit for Indigo Loom, a made-up brand. " : ""}
            Orders from {fmtDate(result.period.from)} to {fmtDate(result.period.to)}, checked as of {fmtDate(result.asOf)}
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="stamp stamp-in inline-block px-5 py-3">
              <p className="text-sm font-medium">You can claim</p>
              <p className="figure text-4xl font-bold sm:text-5xl"><Amount n={result.claimTotal} /></p>
            </div>
            <div>
              <p className="figure text-2xl font-semibold text-amber"><Amount n={result.checkTotal} /></p>
              <p className="text-sm text-muted">worth a look before claiming</p>
            </div>
          </div>
          <p className="mt-5 max-w-prose text-ink-2">
            {claimCount
              ? `${claimCount} item${claimCount === 1 ? "" : "s"} where the evidence says money is owed to you, and ${checkCount} that need a quick look. The claim emails below are ready to send.`
              : "Nothing to claim in these files. Everything we could check matched."}
          </p>
          {urgent.length > 0 && (
            <p className="mt-3 rounded-md bg-stamp-soft px-3 py-2 text-sm text-stamp">
              {urgent.length} weight charge{urgent.length === 1 ? "" : "s"} can only be disputed for a few more days. Start with those.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-paper p-4 sm:p-5">
          <p className="font-semibold">Where your sales went</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <Row label="Sold in Shopify" value={c.sold} strong />
            <Row label="Prepaid" value={c.prepaidSold} indent />
            <Row label="Cash on delivery" value={c.codSold} indent />
            <Row label="Gateway fees and GST" value={-(c.gatewayFees + c.gatewayTax)} />
            <Row label="Shipping charges billed" value={-c.shippingCharges} />
            <Row label="COD paid out by courier" value={c.codRemitted} />
            <Row label="COD delivered, not due yet" value={c.codPendingInGrace} />
            <Row label="Settled by Razorpay" value={c.gatewaySettledNet} />
            {c.reachedBank !== null && <Row label="Matched in your bank" value={c.reachedBank} strong />}
          </dl>
          <p className="mt-3 text-xs text-muted">Undelivered (RTO) orders bring in no cash, so payouts are always below sales. {c.rtoOrders} orders came back this period.</p>
        </div>
      </section>

      <section aria-labelledby="findings">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="findings" className="text-xl font-semibold">What we found</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy("csv", findingsCsv(result))} className="rounded-md border border-rule bg-sheet px-3 py-2 text-sm font-medium hover:border-ink-2">
              {copied === "csv" ? "Copied" : "Copy as CSV"}
            </button>
            {CAN_DOWNLOAD && <button type="button" onClick={() => download("reconos-findings.csv", findingsCsv(result))} className="rounded-md border border-rule bg-sheet px-3 py-2 text-sm font-medium hover:border-ink-2">
              Download all items (CSV)
            </button>}
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {result.buckets.map((b) => (
            <BucketBlock key={b.id} b={b} findings={result.findings.filter((f) => f.bucket === b.id)} open={open === b.id} onToggle={() => setOpen(open === b.id ? null : b.id)} />
          ))}
        </div>
      </section>

      {drafts.length > 0 && (
        <section aria-labelledby="claims">
          <h2 id="claims" className="text-xl font-semibold">Claim emails, ready to send</h2>
          <p className="mt-1 max-w-prose text-muted">Only items marked Claim are included. Attach the matching rows from your reports when you send them.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {drafts.map((d) => (
              <article key={d.counterparty} className="flex flex-col rounded-lg border border-rule bg-sheet">
                <header className="border-b border-rule-2 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">To {d.counterparty}</h3>
                    <span className="font-semibold text-stamp"><Amount n={d.total} /></span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Send via {d.to}</p>
                  <p className="mt-2 text-sm"><span className="text-muted">Subject:</span> {d.subject}</p>
                </header>
                <pre className="max-h-72 flex-1 overflow-auto whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed text-ink-2">{d.body}</pre>
                <footer className="flex flex-wrap gap-2 border-t border-rule-2 p-3">
                  <button type="button" onClick={() => copy(d.counterparty, `Subject: ${d.subject}\n\n${d.body}`)} className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-ink-2">
                    {copied === d.counterparty ? "Copied" : "Copy email"}
                  </button>
                  {CAN_DOWNLOAD && <button type="button" onClick={() => download(`claim-${d.counterparty.toLowerCase()}.txt`, `Subject: ${d.subject}\n\n${d.body}`, "text/plain")} className="rounded-md border border-rule px-3 py-2 text-sm font-medium hover:border-ink-2">
                    Download
                  </button>}
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      {(result.insights.length > 0 || result.notes.length > 0) && (
        <section aria-labelledby="notes" className="grid gap-4 lg:grid-cols-2">
          {result.insights.length > 0 && (
            <div>
              <h2 id="notes" className="text-xl font-semibold">Also worth knowing</h2>
              <ul className="mt-3 grid gap-2">
                {result.insights.map((i) => (
                  <li key={i.title} className="rounded-lg border border-rule bg-sheet p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{i.title}</p>
                      {i.amount !== undefined && <Amount n={i.amount} className="font-semibold" />}
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{i.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.notes.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold">About these files</h2>
              <ul className="mt-3 grid gap-2">
                {result.notes.map((n) => (
                  <li key={n} className="rounded-lg border border-rule bg-sheet p-4 text-sm text-ink-2">{n}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <button type="button" onClick={onRestart} className="rounded-md border border-rule bg-sheet px-4 py-2 font-medium hover:border-ink-2">
          {isSample ? "Check my own files" : "Start a new audit"}
        </button>
        <p className="text-sm text-muted">Your files stayed in this tab. Closing it clears everything.</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong, indent }: { label: string; value: number; strong?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${indent ? "pl-4 text-muted" : ""}`}>
      <dt className={strong ? "font-medium" : ""}>{label}</dt>
      <dd className={`figure ${strong ? "font-semibold" : ""}`}>{value < 0 ? "−" : ""}{fmtINR(Math.abs(value), { decimals: false })}</dd>
    </div>
  );
}
