/** The money trail every order follows, with the places money quietly drops out. */
export function MoneyTrail() {
  const ink = "var(--color-ink)";
  const rule = "var(--color-rule)";
  const stamp = "var(--color-stamp)";
  const muted = "var(--color-muted)";
  const W = 160;
  const H = 62;
  const box = (x: number, y: number, title: string, sub: string) => (
    <g>
      <rect x={x} y={y} width={W} height={H} rx={8} fill="var(--color-sheet)" stroke={rule} />
      <text x={x + 14} y={y + 26} fontSize={16} fontWeight={600} fill={ink}>{title}</text>
      <text x={x + 14} y={y + 47} fontSize={13} fill={muted}>{sub}</text>
    </g>
  );
  const leak = (x: number, y: number, label: string, anchor: "start" | "end" = "start") => (
    <g>
      <path d={`M${x} ${y} q 5 11 0 17 q -5 -6 0 -17z`} fill={stamp} />
      <text x={anchor === "start" ? x + 11 : x - 11} y={y + 14} fontSize={13.5} fill={stamp} textAnchor={anchor}>{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 600 350" role="img" aria-label="How money flows from an order to your bank, and where it leaks" className="h-auto w-full">
      <defs>
        <marker id="mt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={muted} />
        </marker>
      </defs>
      <g fill="none" stroke={muted} strokeWidth={1.25}>
        <path d="M170 160 C 196 160, 192 61, 216 61" markerEnd="url(#mt-arrow)" />
        <path d="M170 182 C 196 182, 192 279, 216 279" markerEnd="url(#mt-arrow)" />
        <path d="M380 61 C 406 61, 402 160, 426 160" markerEnd="url(#mt-arrow)" />
        <path d="M380 279 C 406 279, 402 182, 426 182" markerEnd="url(#mt-arrow)" />
      </g>
      {box(10, 140, "Shopify order", "₹1,299 sold")}
      {box(220, 30, "Razorpay", "prepaid orders")}
      {box(220, 248, "Shiprocket", "cash on delivery")}
      {box(430, 140, "Your bank", "what you keep")}
      {leak(232, 104, "fees above your plan")}
      {leak(232, 214, "COD not paid")}
      {leak(232, 322, "weight and shipping overcharges")}
      {leak(446, 108, "payouts missing")}
    </svg>
  );
}
