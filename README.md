# ReconOS

**Multi-gateway settlement reconciliation for Indian mid-market merchants.**

A merchant running two to four payment aggregators gets three views of the same money: orders in the store, net settlements from each gateway (after MDR and 18% GST on MDR are deducted at source), and credits in the bank. ReconOS lines all three up, re-prices every transaction against the contracted rate card, and flags the gap between what the gateway charged and what it should have charged.

This repository is a working front-end model of that product. Every screen is interactive and runs on a seeded dataset of transactions; there is no backend.

## What's in it

| Screen | What it does |
| --- | --- |
| **Dashboard** | GMV, match rate, fee variance and open exceptions across gateways |
| **Three-way match** | Order ↔ gateway settlement ↔ bank credit, transaction by transaction |
| **Rate-card engine** | Contracted MDR per payment method; re-prices each transaction and computes fee variance |
| **Exception workspace** | Triage queue for eleven break types (fee and GST-on-MDR mismatches, part settlements, T+N slippage, missing UTRs, chargebacks, refund lag and more), with dispute-notice drafting |
| **Data ingestion** | Status of the order, aggregator and bank-statement feeds |
| **Audit report** | Leakage summary by gateway and break type |
| **Accounting export** | Tally XML and Zoho Books CSV journal entries |
| **Business model & ROI** | Subscription plus recovery-fee pricing, and payback against a merchant's own GMV and leakage rate |

### How fee variance is calculated

```
Expected MDR  = Gross × contracted MDR rate + flat fee
Expected GST  = Expected MDR × 18%
Fee variance  = (Billed MDR + Billed GST) − (Expected MDR + Expected GST)
```

The logic lives in `src/utils/reconciliationEngine.ts`. Seed data and rate cards are in `src/data/mockData.ts`.

## Run it

Requires Node.js 18 or later. No API keys or environment variables are needed.

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command | |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Stack

React 19, TypeScript, Vite 6, Tailwind CSS 4, Recharts, Motion, Lucide icons.

## Project layout

```
src/
  App.tsx                     tab routing and app state
  components/                 one file per screen, plus modals
  utils/reconciliationEngine.ts   re-pricing, metrics, audit summary, exports
  data/mockData.ts            rate cards, feeds, seeded transactions
  types/recon.ts              canonical transaction model
docs/                         product specification and architecture notes
```
