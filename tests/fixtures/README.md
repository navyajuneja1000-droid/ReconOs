# Real partner files

Every file in this folder is read by `tests/fixtures.test.ts` on each test run, so once a real
export works it keeps working.

Layout: `tests/fixtures/<partner id>/<file kind>/<any name>.csv` (or `.xlsx`)

- Partner ids are in `src/engine/partners.ts` (`razorpay`, `payu`, `cashfree`, `phonepe`, `paytm`,
  `ccavenue`, `shiprocket`, `delhivery`, `ekart`, `bluedart`, `xpressbees`, `shadowfax`, `dtdc`,
  `nimbuspost`, `ithink`).
- File kinds: `shopify_orders`, `courier_shipments`, `courier_cod`, `courier_weight`,
  `gateway_settlements`, `bank`. Use `shopify` or `bank` as the partner folder for those two.

For each file the test checks that it is recognised as that kind, from that partner, with every
required column found, and that at least one record is read with real amounts.

**Only commit anonymised files.** Run `npm run inspect -- <file> --redact` to make a copy with
names, phones, emails and addresses blanked, then open it and check before committing.
See `docs/ADDING_PARTNER_FILES.md` for the full steps.
