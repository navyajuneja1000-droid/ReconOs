# ReconOS (working name)

Find the money your courier and payment gateway owe you. Indian D2C founders upload their Shopify, Shiprocket, Razorpay and bank exports; ReconOS matches every order to the money that reached the bank and lists what's missing, what was overcharged and what can still be claimed, with ready-to-send claim emails.

Files are processed in the browser only. Nothing is uploaded or stored.

See `SPEC.md` for the v1 scope.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine tests: every planted leak in the sample data is found, nothing else is flagged
npm run build      # static site in out/
node scripts/build-preview.mjs   # single-file preview in preview/reconos.html (after npm run build)
```

## Layout

- `src/engine/` — pure TypeScript: file recognition (`detect.ts`), parsing (`normalize.ts`), checks (`audit.ts`), claim emails and CSV (`claims.ts`)
- `src/sample/generate.ts` — a realistic month of fake data with known planted leaks
- `src/components/` — the UI
- `tests/` — engine tests

## Open questions

- Real Shiprocket, Razorpay and bank export formats: column names in `detect.ts` are best guesses until real files are tested.
- Whether Shiprocket deducts any fees from COD remittances (the engine detects this pattern and downgrades short payments to "check").
