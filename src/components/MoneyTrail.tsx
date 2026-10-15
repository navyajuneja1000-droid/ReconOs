import React from "react";
import type { AuditResult, BucketId } from "../engine/types";
import { inr } from "../ui";

/** Order → Razorpay / Shiprocket → bank, with the amount leaking at each point in the current data. */
export function MoneyTrail({ result }: { result: AuditResult }) {
  const amt = (...ids: BucketId[]) =>
    result.buckets.filter((b) => ids.includes(b.id)).reduce((a, b) => a + b.claimTotal + b.checkTotal, 0);
  const box = (x: number, y: number, title: string, sub: string, accent = false) => (
    <g>
      <rect x={x} y={y} width={170} height={64} rx={10} fill={accent ? "#052e2b" : "#0f172a"} stroke={accent ? "#10b981" : "#334155"} />
      <text x={x + 16} y={y + 27} fontSize={16} fontWeight={600} fill="#f1f5f9">{title}</text>
      <text x={x + 16} y={y + 48} fontSize={13} fill="#94a3b8">{sub}</text>
    </g>
  );
  const leak = (x: number, y: number, label: string, value: number) => (
    <g>
      <path d={`M${x} ${y} q 5 11 0 17 q -5 -6 0 -17z`} fill="#fb7185" />
      <text x={x + 12} y={y + 9} fontSize={13} fill="#fda4af">{label}</text>
      <text x={x + 12} y={y + 26} fontSize={14} fontWeight={600} fill="#fecdd3">{inr(value)}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 380" role="img" aria-label="How money flows from an order to your bank, and how much leaks at each step" className="h-auto w-full">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#64748b" />
        </marker>
      </defs>
      <g fill="none" stroke="#64748b" strokeWidth={1.4}>
        <path d="M180 172 C 208 172, 204 62, 232 62" markerEnd="url(#arrow)" />
        <path d="M180 196 C 208 196, 204 302, 232 302" markerEnd="url(#arrow)" />
        <path d="M406 62 C 434 62, 430 172, 458 172" markerEnd="url(#arrow)" />
        <path d="M406 302 C 434 302, 430 196, 458 196" markerEnd="url(#arrow)" />
      </g>
      {box(10, 152, "Shopify order", "what you sold")}
      {box(236, 30, "Razorpay", "prepaid orders")}
      {box(236, 270, "Shiprocket", "cash on delivery")}
      {box(462, 152, "Your bank", "what you keep", true)}
      {leak(248, 106, "fee and settlement gaps", amt("gateway_shortfall"))}
      {leak(248, 214, "COD not paid", amt("cod_unpaid"))}
      {leak(248, 346, "shipping and weight charges", amt("shipping_overcharge", "weight_dispute"))}
      {leak(476, 236, "payouts not in bank", amt("courier_payout_missing", "gateway_payout_missing"))}
    </svg>
  );
}
