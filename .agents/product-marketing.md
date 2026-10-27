# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-27

Every marketing skill in `.claude/skills/` reads this file first. Keep it true: nothing goes in Proof Points or Customer Language until it really happened.

## Product Overview
**One-liner:** ReconOS finds the money your couriers and payment gateways still owe you, and writes the claim for each one.
**What it does:** A founder exports last month's reports from Shopify, every courier, every payment gateway and the bank, and adds each partner's rate card. ReconOS traces every order from sale to payout to bank, flags what was never paid, paid short or overcharged, and writes one ready-to-send claim email per partner. Files are read in the browser and never uploaded.
**Product category:** Payout and fee reconciliation for D2C brands. How founders search for it: "COD reconciliation", "Shiprocket COD remittance check", "Razorpay settlement reconciliation", "weight discrepancy dispute", "courier overcharge".
**Product type:** Browser-based SaaS (upload version). Connected, automatic version is not built yet.
**Business model:** Free one-time audit, then monthly plans in early access: Starter ₹999/month (up to about 2,000 orders, 2 couriers and 2 gateways), Growth ₹2,499/month (up to about 15,000 orders, all partners). Prices live in `src/pricing.ts`. Paid plans are not open for payment yet. A success-fee model (a share of money recovered) is still being considered.

## Target Audience
**Target companies:** Indian D2C brands selling on their own Shopify store, roughly 300 to 30,000 orders a month, with a real share of cash-on-delivery orders, one or more couriers or aggregators (Shiprocket, Delhivery, Ekart and others) and one or more gateways (Razorpay, PayU, Cashfree, PhonePe, Paytm, CCAvenue). Strongest fit: apparel, beauty, accessories and electronics, where COD and returns are high.
**Decision-makers:** The founder or co-founder, who also does the finance. Sometimes an outside accountant or CA who closes the books.
**Primary use case:** Checking that every rupee sold actually reached the bank, and getting back what didn't.
**Jobs to be done:**
- Tell me exactly which COD orders the courier hasn't paid for, and how much.
- Catch weight and shipping overcharges while I can still dispute them.
- Check the gateway charged me what we agreed, by payment method, with the right GST.
**Use cases:**
- Monthly close: one audit of last month's files before paying the accountant.
- Twice-weekly weight check: upload just the courier's weight report and dispute before the window closes.
- Choosing a courier: compare RTO share, COD payout speed, overcharges and real cost per 500 g by zone.
- Renegotiating gateway rates with evidence.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Founder (user and buyer) | Cash in the bank, time | Ten reports, no finance team, money leaks unseen | One total, split by partner, with claims written |
| Ops or finance hire (user) | Closing the month without errors | Matching AWBs and UTRs by hand in Excel | Every order traced, every gap listed with proof |
| Accountant or CA (influencer) | Clean books, defensible numbers | Gets totals with no order-level backing | A one-page recovery report and exports |

## Problems & Pain Points
**Core problem:** Every order passes through two or three systems before the money is the brand's, and each can pay late, pay short or charge extra without any of them checking the others.
**Why alternatives fall short:**
- Courier and gateway dashboards show their own numbers, never the gap against Shopify and the bank.
- Excel matching across ten files is slow, so most small brands skip it.
- Most recon tools cover one stream (COD only, or marketplaces only) or need a 2 to 4 week setup.
**What it costs them:** Unpaid or short-paid COD, weight charges accepted by default after the dispute window (7 working days on Shiprocket), gateway fees above the agreed rate, settlements that never reached the bank, and days of founder time each month.
**Emotional tension:** "I know money is leaking, I just can't prove where." Fear of missing a deadline. Distrust of handing financial files to a new tool.

## Competitive Landscape
**Direct:** PayTrace (Shopify vs courier COD, ₹999 to ₹9,999+/month), CODReconcile, Shiplystic, OneflowAI ("recovery desk"), ReconPe, Terra Insight, Cointab. Most cover COD only, or need setup, and none clearly owns small D2C yet.
**Secondary:** Profit trackers (UpProfio, Financify, TheTruPoint) show margin after fees but don't produce claims. Marketplace recon tools (eVanik, SaySeller) cover Amazon, Flipkart and Meesho, not Shopify D2C.
**Indirect:** The founder's own Excel, an accountant at month end, or simply trusting the payouts.

## Differentiation
**Key differentiators:**
- All three money streams in one audit: courier COD, gateway settlements and the bank.
- Fees re-priced per payment method against the brand's own rate card, with GST checked.
- Deadlines: weight disputes listed closest deadline first, with a twice-weekly check.
- A ready-to-send claim email per partner, with every order and amount.
- Files never leave the browser.
**How we do it differently:** Uses the reports founders can already export, so there is nothing to connect and no setup call. Every finding is Claim (the files prove it) or Check (needs a look), and nothing is force-matched.
**Why that's better:** Trust (no data leaves the device), speed (one sitting), and claims that partners can't easily wave away.
**Why customers choose us:** To be validated with real brands. Founder edge: Navya ran payment gateway operations at PhonePe (routing, acquirer integrations, reconciliation), so the gateway and bank side is built by someone who has seen it from inside.

## Objections
| Objection | Response |
|-----------|----------|
| "I don't want to upload my financial data." | Nothing is uploaded. Files are read in your browser tab and cleared when you close it. |
| "Exporting ten reports is a lot of work." | Start with Shopify orders alone; every extra file switches on more checks. Rates are pre-filled from what you were charged. |
| "My courier or gateway won't accept the claim." | Claims list order-level proof from your own files. Real recoveries depend on what partners accept, and the site says so. |
| "Is my courier or gateway supported?" | Six gateways and nine couriers listed, plus "Other" with columns matched by hand. All are in beta until tested with real exports. |

**Anti-persona:** Marketplace-only sellers (Amazon, Flipkart, Meesho), brands on Stripe or PayPal, and large finance teams that need approvals and Tally export.

## Switching Dynamics
**Push:** A COD payout that looks short, a sudden wallet debit for weight, an accountant asking why the bank doesn't match Shopify.
**Pull:** A free audit that shows a rupee figure in one sitting, with claims already written.
**Habit:** "The courier pays eventually." Month-end Excel. Trusting the gateway's net settlement.
**Anxiety:** Data privacy, the time to export files, whether the finding is real or a false alarm.

## Customer Language
**How they describe the problem:**
- No verbatim quotes collected yet. Add exact phrases from founder conversations, Shopify App Store reviews and D2C communities here.
- Public signal (paraphrased, not a quote): recent 1-star Shiprocket app reviews mostly complain about wallet debits and weight discrepancy charges.
**How they describe us:**
- None yet.
**Words to use:** COD, remittance, payout, settlement, weight dispute, AWB, UTR, rate card, overcharge, claim, "money owed", "reached your bank".
**Words to avoid:** "platform", "solution", "seamless", "AI-powered" (the checks are rule-based), "guaranteed recovery", any number we can't prove.
**Glossary:**
| Term | Meaning |
|------|---------|
| Claim | The brand's own files prove the money is owed |
| Check | Something doesn't add up and needs a human look |
| COD remittance | The courier paying out cash it collected at the door |
| Weight discrepancy | A courier re-weighing a parcel and charging more |
| UTR | The bank reference on a payout, used to match it to the bank statement |
| Rate card | The rates the brand agreed with each partner |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Plain | Founder language, short sentences | Dumbed down | "Find the money your couriers and payment gateways still owe you." |
| Exact | Rupees, orders, deadlines | Jargon walls | "On Shiprocket you have 7 working days to dispute before the charge is accepted for you." |
| Honest | Says what's beta and what isn't proven | Hedging everything | "Real recoveries depend on what your couriers and gateways accept." |
| Calm | Money is serious; no hype | Cold | "Runs in your browser. Your files are never uploaded." |

**Tone by context:**
- Support: direct steps, name the file and column.
- Launch: what's new and who it's for, no superlatives.
- Errors: say what happened and what to do, never blame the user.
- Sales: lead with the rupee figure from their own files.
- Social: founder voice, one real example per post.
**Terms we own:** Claim and Check. "Money trail". "Weekly weight check".
**Never use (and why):** Em dashes (founder preference: copy should sound human). Invented stats or testimonials (trust is the product). "AI" as a selling point (checks are deterministic).

## Proof Points
**Metrics:** None from real brands yet. The sample brand (Indigo Loom) is made up and must always be labelled as sample.
**Customers:** None yet.
**Testimonials:** None yet.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Private by design | Files read in the browser; Privacy Policy section 2 |
| Deadlines matter | Shiprocket's 7-working-day weight dispute window (shiprocket.in/weight-dispute-management) |
| COD is a big share | Industry estimate: COD is 40 to 60% of D2C orders in apparel, beauty and electronics (vendor estimate, Terra Insight) |

## Goals
**Business goal:** Validate the upload version with real brands: get founders to run a free audit on their own files, and convert some to early access.
**Conversion action:** Primary: "Check my own files" (run a free audit). Secondary: early-access sign-up (Formspree form on Overview and Pricing).
**Current metrics:** Not known. Microsoft Clarity is installed behind cookie consent; no conversion events tracked before 2026-10-27.

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-10 | Founder chose to validate the upload version with real brands before building connected integrations | Founder decision | All | active |
| 2026-10 | Asking brands for many separate inputs may put them off; keep the first step to one file | Founder concern, not tested | cro, onboarding, copywriting | watch |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-10-27) — Initial context, drafted from the README, site copy, pricing.ts and the Oct 2026 idea-validation research.
