# ReconOS

**Find the money your courier and payment gateway owe you.**

ReconOS is for Indian D2C brands selling on Shopify, with any mix of couriers and payment gateways. A founder exports last month's reports from every partner, adds each partner's rate card, and ReconOS traces every order from sale to courier or gateway to the bank. It flags what's missing or overcharged, shows the total and each partner's share, and writes a claim email per partner.

**Gateways:** Razorpay, PayU, Cashfree, PhonePe, Paytm, CCAvenue
**Couriers and aggregators:** Shiprocket, Delhivery, Ekart, Blue Dart, Xpressbees, Shadowfax, DTDC, NimbusPost, iThink Logistics
Plus "Other" for any partner not listed, with columns matched by hand. All are in beta until a real export of each has been added to `tests/fixtures` (see [docs/ADDING_PARTNER_FILES.md](docs/ADDING_PARTNER_FILES.md)).

Files are read in the browser only. Nothing is uploaded or stored.

## What's on the site

| Page | What it shows |
| --- | --- |
| **How it works** | The problem, the 4-step workflow, a live preview of the sample dashboard, who it's for, FAQ and early-access sign-up |
| **Dashboard** | Claim and check totals, leaks by type, where sales went, what to act on first, totals by partner |
| **Partners** | Every courier and gateway side by side; open one for its leaks, reports, rate card and claim email |
| **Upload files** | Drop in CSV or Excel exports; each is matched to its type and partner. Each partner's rate card is required before the audit runs |
| **Order trail** | Every order traced from sale to payout to bank, with filters |
| **Leaks & claims** | Every finding with its evidence, filterable by partner, plus a ready-to-send email per partner |
| **Fee check** | Every gateway payment re-priced against that gateway's rate card, by payment method |
| **Recovery report** | A one-page summary to share with a co-founder or accountant |
| **Pricing** | Free audit, then monthly plans |

The site opens on a made-up brand (Indigo Loom) that uses Razorpay and PayU, ships through Shiprocket and Delhivery direct, and has a realistic month of data with a known set of planted leaks, so every screen can be explored before uploading anything.

## Checks

1. COD a courier never paid, or paid short
2. Shipping overcharges: above the rate card (by zone and weight), COD fee above the rate, return charge above the rate, charged twice, COD fee on prepaid orders, return charges on delivered orders
3. Weight charges still open to dispute, with the last date from each courier's rate card
4. Gateway fees above the rate card, priced per payment method (UPI, debit card up to or above ₹2,000, RuPay debit, credit card by network, Amex, Diners, international, net banking, wallets, EMI, each with an optional fixed fee), wrong GST on fees, paid orders never settled, refund mismatches. When a file doesn't say enough (say, no credit/debit column), the payment is checked against the highest rate it could be on, so nothing is over-claimed. Gateways that send one file per method are supported; the method is read from the file name or chosen by hand
5. Courier payouts and gateway settlements that never reached the bank

Rates are compulsory, but founders rarely type them. ReconOS fills each rate card from what the brand was charged most often, or reads it from the rate card itself: a PDF addendum, a screenshot or photo (read with on-device OCR), an Excel sheet or text pasted from an email. Every value shows where it came from, and differences between the agreement and the actual charges are flagged. The founder confirms before the audit runs.

The Partners page also compares couriers zone by zone, including each courier booked through Shiprocket: share of parcels that came back, COD payout speed, overcharges, and the real cost per 500 g delivered.

Rate card gaps on aggregators (Shiprocket, NimbusPost, iThink) are marked Check, since their prices differ by courier.

**Claim** means the founder's own files prove the money is owed. **Check** means something doesn't add up and needs a look first.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # every planted leak in the sample is found, and nothing else is flagged
npm run build    # production build in dist/
npm run inspect -- file.csv   # see how a real partner export is read (add --redact for a test copy)
```

Early-access sign-ups post to `VITE_WAITLIST_ENDPOINT` (for example a Formspree form URL). Without it, the form tells visitors sign-ups aren't open yet and saves nothing.

## Layout

```
src/engine/      file recognition, parsing, checks, order trail, claim emails (pure TypeScript)
src/engine/partners.ts   every courier and gateway: column names, bank words, example rates
src/sample/      the Indigo Loom sample month with planted leaks
src/components/  one file per page
src/pricing.ts   plan names and prices (edit here)
tests/           engine tests, plus tests/fixtures for real partner files
scripts/         inspect tool for real files
docs/            how to add a real partner file
```

## Marketing skills

`.claude/skills/` holds the [marketingskills](https://github.com/coreyhaines31/marketingskills) library by Corey Haines (MIT, see `.claude/skills/LICENSE-marketingskills`), copied at commit `17772c7` without its eval files. Claude Code picks them up automatically in this repo: ask for an SEO audit, landing page copy, a cold email or a launch plan and the matching skill runs.

Every skill reads `.agents/product-marketing.md` first: the product, customer, competitors, voice and proof in one place. Keep it true. Add real founder quotes, results and tested lessons there as they come in, and never add a number that didn't happen.

`public/robots.txt`, `public/sitemap.xml` and `public/llms.txt` are served as real files. The structured data in `index.html` and the prices in `llms.txt` must match `src/pricing.ts`; `tests/seo.test.ts` fails if they drift.

To update the skills later: `npx skills add coreyhaines31/marketingskills`.
