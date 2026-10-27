// Pricing. Edit here; the Overview, Pricing and Account pages all read from this file.
// The paid plan's internal id stays "starter" so the database and payment settings don't change.
export const GST_RATE = 0.18;
export const withGst = (price: number) => Math.round(price * (1 + GST_RATE));

export const PLANS = [
  {
    id: "audit",
    name: "Free audit",
    price: 0,
    period: "",
    blurb: "See how much is missing before you pay anything.",
    features: ["One month of files, every check", "Every courier and gateway you use", "Totals combined and by partner", "Your files never leave your browser"],
  },
  {
    id: "starter",
    name: "ReconOS Pro",
    price: 999,
    period: "/month",
    blurb: "Check every month and send the claims.",
    features: [
      "Unlimited audit months",
      "Every courier and gateway you use",
      "Ready-to-send claim email for each partner",
      "Weekly weight check, with dispute deadlines",
      "Audits and rates saved to your account",
      "Claim list as CSV for your accountant",
    ],
    highlight: true,
  },
] as const;

export const PRO = PLANS[1];
/** "₹999 + GST/month" */
export const proPrice = () => `₹${PRO.price.toLocaleString("en-IN")} + GST${PRO.period}`;
