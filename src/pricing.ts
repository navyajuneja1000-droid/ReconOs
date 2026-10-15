// Early-access pricing. Edit here; the Overview and Pricing pages both read from this file.
export const PLANS = [
  {
    id: "audit",
    name: "Free audit",
    price: 0,
    period: "",
    blurb: "See how much is missing before you pay anything.",
    features: ["Every check on one month of files", "Every courier and gateway you use", "Totals combined and by partner", "Files never leave your browser"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "/month",
    blurb: "For brands up to about 2,000 orders a month.",
    features: ["Monthly audit", "Up to 2 couriers and 2 gateways", "Claim emails for each partner", "Weight-dispute deadline list", "Recovery report for your accountant"],
    highlight: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    period: "/month",
    blurb: "For brands up to about 15,000 orders a month.",
    features: ["Everything in Starter", "Every courier and gateway you use", "Weekly audits during sale season", "Priority help with claims"],
  },
] as const;
