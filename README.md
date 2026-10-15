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
