import type { AuditResult, Finding } from "../engine/types";

export type PlanId = "free" | "starter" | "growth";
export interface Profile {
  user_id: string;
  email: string | null;
  brand: string;
  picked: string[];
  plan: PlanId;
  plan_status: string;
  current_period_end: string | null;
}
export interface SavedAudit {
  id: string;
  month_key: string;
  period_from: string | null;
  period_to: string | null;
  partners: string[];
  claim_total: number;
  check_total: number;
  findings: StoredFinding[];
  created_at: string;
  updated_at: string;
}
/** A finding as stored: dates as ISO text. Holds no customer names, addresses or phone numbers. */
export type StoredFinding = Omit<Finding, "date" | "deadline"> & { date?: string | null; deadline?: string | null };

/** Same rule as public.is_paid in supabase/schema.sql. */
export function isPaid(p: Pick<Profile, "plan" | "plan_status" | "current_period_end"> | null | undefined, now = new Date()): boolean {
  if (!p || (p.plan !== "starter" && p.plan !== "growth")) return false;
  if (p.plan_status === "active") return true;
  return p.plan_status === "cancelled" && !!p.current_period_end && new Date(p.current_period_end) > now;
}

/** The month an audit is about: the month its orders end in (YYYY-MM). */
export function monthKey(r: Pick<AuditResult, "period" | "asOf">): string {
  const d = r.period.to ?? r.period.from ?? r.asOf;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Same rule as public.can_save_audit: paid, or free with no audit for a different month yet. */
export function canRunAudit(paid: boolean, saved: Pick<SavedAudit, "month_key">[], month: string): boolean {
  return paid || saved.every((a) => a.month_key === month);
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
export function toStored(r: AuditResult) {
  return {
    month_key: monthKey(r),
    period_from: r.period.from ? iso(r.period.from)!.slice(0, 10) : null,
    period_to: r.period.to ? iso(r.period.to)!.slice(0, 10) : null,
    partners: r.partners.filter((p) => p.files.length).map((p) => p.id),
    claim_total: Math.round(r.claimTotal * 100) / 100,
    check_total: Math.round(r.checkTotal * 100) / 100,
    findings: r.findings.map((f): StoredFinding => ({ ...f, date: iso(f.date), deadline: iso(f.deadline) })),
  };
}

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};

/** CSV of a saved audit's findings, for the account page. */
export function storedCsv(a: Pick<SavedAudit, "findings">): string {
  const cell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Type", "Partner", "What", "Amount", "Order", "AWB", "Reference", "Date", "Dispute by", "Why"];
  const rows = a.findings.map((f) => [f.kind === "claim" ? "Claim" : "Check", f.counterparty, f.title, f.amount, f.orderId, f.awb, f.ref, f.date?.slice(0, 10), f.deadline?.slice(0, 10), f.reason]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

/** Dodo subscription event → plan status written to the profile. */
export function statusFromEvent(type: string): string | null {
  switch (type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.plan_changed":
      return "active";
    case "subscription.on_hold":
    case "subscription.failed":
      return "on_hold";
    case "subscription.cancelled":
      return "cancelled";
    case "subscription.expired":
      return "expired";
    default:
      return null;
  }
}
