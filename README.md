# ReconOS

**Find the money your courier and payment gateway owe you.**

ReconOS is for Indian D2C brands selling on Shopify, shipping with Shiprocket and taking prepaid payments through Razorpay. A founder exports last month's reports, drops them in, and ReconOS traces every order from sale to courier or gateway to the bank. It flags what's missing or overcharged, and writes the claim emails.

Files are read in the browser only. Nothing is uploaded or stored.

## What's on the site

| Page | What it shows |
| --- | --- |
| **How it works** | The problem, the 4-step workflow, a live preview of the sample dashboard, who it's for, FAQ and early-access sign-up |
| **Dashboard** | Claim and check totals, leaks by type, where sales went, what to act on first, totals by partner |
| **Upload files** | Drop in CSV or Excel exports; each file is recognised from its columns, or mapped by hand |
| **Order trail** | Every order traced from sale to payout to bank, with filters |
| **Leaks & claims** | Every finding with its evidence, plus ready-to-send emails to Shiprocket and Razorpay |
| **Fee check** | Every Razorpay payment re-priced against your plan, by payment method |
| **Recovery report** | A one-page summary to share with a co-founder or accountant |
| **Pricing** | Free audit, then monthly plans |

The site opens on a made-up brand (Indigo Loom) with a realistic month of data and a known set of planted leaks, so every screen can be explored before uploading anything.

## Checks

1. COD the courier never paid, or paid short
2. Shipping overcharges: charged twice, COD fee on prepaid orders, return charges on delivered orders
3. Weight charges still open to dispute, with the last date (7 working days on Shiprocket)
4. Razorpay fees above plan, wrong GST on fees, paid orders never settled, refund mismatches
5. Courier payouts and gateway settlements that never reached the bank

**Claim** means the founder's own files prove the money is owed. **Check** means something doesn't add up and needs a look first.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # every planted leak in the sample is found, and nothing else is flagged
npm run build    # production build in dist/
```

Early-access sign-ups post to `VITE_WAITLIST_ENDPOINT` (for example a Formspree form URL). Without it, the form tells visitors sign-ups aren't open yet and saves nothing.

## Layout

```
src/engine/      file recognition, parsing, checks, order trail, claim emails (pure TypeScript)
src/sample/      the Indigo Loom sample month with planted leaks
src/components/  one file per page
src/pricing.ts   plan names and prices (edit here)
tests/           engine tests
```
