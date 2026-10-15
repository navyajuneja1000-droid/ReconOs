// Early-access pricing. Edit here; the Overview and Pricing pages both read from this file.
export const PLANS = [
  {
    id: "audit",
    name: "Free audit",
    price: 0,
    period: "",
    blurb: "See how much is missing before you pay anything.",
    features: ["Every check on one month of files", "Totals by leak type", "Order trail and fee check", "Files never leave your browser"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "/month",
    blurb: "For brands up to about 2,000 orders a month.",
    features: ["Monthly audit", "Ready-to-send claim emails", "Weight-dispute deadline list", "Recovery report for your accountant"],
    highlight: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    period: "/month",
    blurb: "For brands up to about 15,000 orders a month.",
    features: ["Everything in Starter", "Weekly audits during sale season", "More couriers and gateways as they're added", "Priority help with claims"],
  },
] as const;
