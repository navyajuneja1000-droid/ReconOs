# Adding a real partner file

Every courier and gateway in ReconOS starts in **beta**: its column names come from the partner's
published report formats. When a real export arrives, follow these steps so ReconOS reads it
correctly from then on.

## 1. See how ReconOS reads it

```bash
npm run inspect -- ~/Downloads/payu_settlements_sep.xlsx
```

This prints:

- what the file was recognised as (for example "Gateway settlements") and which partner
- which column each field came from, and which columns weren't used
- anything required that's still missing
- the first three records as ReconOS understood them (check the amounts, dates and IDs look right)

## 2. Fix what it misses

Open `src/engine/partners.ts` and find the partner. Add the real column names to its `columns`,
under the file kind and the field they belong to. Names are matched after lowercasing and turning
punctuation into spaces, so `Settlement UTR No.` is written as `"settlement utr no"`.

```ts
columns: {
  gateway_settlements: {
    utr: ["settlement utr no", "settlementutr", ...],   // put the real name first
  },
},
```

Also check:

- `headerHints`: a column name only this partner uses, so ReconOS knows who sent a file even when
  it's been renamed
- `bankHint`: how this partner's payouts appear in a bank statement narration
- `shopifyHint` (gateways): how Shopify's Payment Method column names this gateway
- `exampleGateway` / `exampleCourier`: typical rates shown as a starting point

Fields you can map are listed in `src/engine/detect.ts` (`KIND_SPECS`). If a partner writes
something in a new way (a new status word, weights in grams, a zone name), the readers are in
`src/engine/normalize.ts` and `zoneFrom` in `partners.ts`.

Run `npm run inspect` again until everything is found.

## 3. Keep it tested

```bash
npm run inspect -- ~/Downloads/payu_settlements_sep.xlsx --redact
```

This writes `payu_settlements_sep.redacted.csv` next to the original with names, emails, phones and
addresses blanked. **Open it and check nothing personal is left.** Trim it to 20 to 50 rows, then
put it in:

```
tests/fixtures/<partner id>/<file kind>/
```

for example `tests/fixtures/payu/gateway_settlements/sep-2026.csv`. `npm test` now checks on every
run that this file is recognised as that kind, from that partner, with every required column.

## 4. Mark the partner as tested

Set `status: "tested"` on the partner in `partners.ts` once at least one real file of each kind it
sends passes. The "in beta" note disappears from that partner's pages.

## 5. Check the whole audit

Run `npm test`, then try the real files together in the app (`npm run dev`, Upload files) with the
brand's real rate cards, and read every finding for that partner on the Partners page.
