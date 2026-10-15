import type { AuditResult, Counterparty, Finding } from "./types";
import { fmtDate, fmtINR, r2 } from "./util";

export interface ClaimDraft {
  counterparty: Counterparty;
  to: string;
  subject: string;
  body: string;
  total: number;
  count: number;
}

const CONTACT: Partial<Record<Counterparty, string>> = {
  Shiprocket: "Shiprocket support (raise a ticket from the Shiprocket panel, or email your account manager)",
  Razorpay: "Razorpay support (Dashboard → Help & Support → raise a ticket)",
};

function line(f: Finding, i: number): string {
  const ids = [f.orderId && `Order ${f.orderId}`, f.awb && `AWB ${f.awb}`, f.ref && !f.awb && `Ref ${f.ref}`].filter(Boolean).join(", ");
  return `${i + 1}. ${ids ? ids + ": " : ""}${f.title}. ${f.reason} Amount: ${fmtINR(f.amount)}.`;
}

/** One ready-to-send email per counterparty, built only from claim findings. */
export function buildClaims(result: AuditResult, businessName = "our store"): ClaimDraft[] {
  const parties: Counterparty[] = ["Shiprocket", "Razorpay"];
  const drafts: ClaimDraft[] = [];
  for (const party of parties) {
    const items = result.findings.filter((f) => f.kind === "claim" && f.counterparty === party);
    if (!items.length) continue;
    const total = r2(items.reduce((a, f) => a + f.amount, 0));
    const period = result.period.from && result.period.to ? ` for orders from ${fmtDate(result.period.from)} to ${fmtDate(result.period.to)}` : "";
    const ask =
      party === "Shiprocket"
        ? "Please check these items and credit the amounts to our account, or share the payout details (UTR and date) where you believe they were already paid."
        : "Please check these items and refund the excess charges, or share the settlement details (UTR and date) where you believe they were already paid.";
    const body = [
      `Hello ${party} team,`,
      "",
      `While reconciling our records${period}, we found ${items.length} item${items.length === 1 ? "" : "s"} totalling ${fmtINR(total)} that we believe are owed to us:`,
      "",
      ...items.map(line),
      "",
      ask,
      "",
      "We've attached the matching rows from our reports. Happy to share anything else you need.",
      "",
      "Thanks,",
      businessName,
    ].join("\n");
    drafts.push({
      counterparty: party,
      to: CONTACT[party] ?? party,
      subject: `Reconciliation claim: ${items.length} item${items.length === 1 ? "" : "s"}, ${fmtINR(total)}`,
      body,
      total,
      count: items.length,
    });
  }
  return drafts;
}

/** CSV of every finding, for the founder's records or an accountant. */
export function findingsCsv(result: AuditResult): string {
  const head = ["Type", "Section", "Who", "What", "Order", "AWB", "Reference", "Amount (INR)", "Date", "Dispute by", "Details"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = result.findings.map((f) => [
    f.kind === "claim" ? "Claim" : "Check",
    f.bucket,
    f.counterparty,
    f.title,
    f.orderId ?? "",
    f.awb ?? "",
    f.ref ?? "",
    f.amount.toFixed(2),
    f.date ? f.date.toISOString().slice(0, 10) : "",
    f.deadline ? f.deadline.toISOString().slice(0, 10) : "",
    f.reason,
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
