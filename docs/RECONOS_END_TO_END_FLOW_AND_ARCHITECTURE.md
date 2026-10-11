# ReconOS — End-to-End Architecture, Data Pipelines & State Machines

## 1. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              RECONOS SYSTEM ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ LAYER 1: INGESTION ]                                                           |
|  +--------------------+    +--------------------+    +-------------------------+  |
|  | Shopify / Woo OMS  |    | Razorpay / PayU    |    | HDFC Bank MT940 / CBS   |  |
|  | (Day 0 Order Logs) |    | (T+1 Settlement)   |    | (T+1..T+7 Bank Credits) |  |
|  +---------+----------+    +---------+----------+    +------------+------------+  |
|            |                         |                            |               |
|            v                         v                            v               |
|  +-----------------------------------------------------------------------------+  |
|  |                    CANONICAL NORMALISATION & INGESTION PIPE                 |  |
|  |          - Normalizes headers to standard CanonicalTransaction model        |  |
|  |          - Enforces type safety, date normalization & currency parsing      |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|                                        v                                          |
|  [ LAYER 2: RATE-CARD RE-PRICING ENGINE ("THE SHARP EDGE") ]                      |
|  +-----------------------------------------------------------------------------+  |
|  |  Contracted Rate Card Database:                                             |  |
|  |  - UPI: 0% MDR, 0% GST                                                      |  |
|  |  - RuPay Debit: 0% MDR, 0% GST                                              |  |
|  |  - Visa/Mastercard Debit: 0.90% MDR + 18% GST                               |  |
|  |  - Domestic CC: 1.85% MDR + 18% GST                                         |  |
|  |  - International CC: 2.80% MDR + 18% GST                                    |  |
|  |  - Netbanking: Flat Rs 12.00 + 18% GST                                      |  |
|  |                                                                             |  |
|  |  Algorithm:                                                                 |  |
|  |  Expected MDR = (Gross * MDR_rate) + Flat_fee                               |  |
|  |  Expected GST = Expected MDR * 18%                                          |  |
|  |  Fee Variance = (Billed MDR + Billed GST) - (Expected MDR + Expected GST)   |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|                                        v                                          |
|  [ LAYER 3: 3-WAY CONTINUOUS RECONCILIATION ENGINE ]                              |
|  +-----------------------------------------------------------------------------+  |
|  |  Match Evaluation Pipeline:                                                 |  |
|  |  1. Order ID == Gateway Order Reference?                                    |  |
|  |  2. Net Settled Funds == Bank CBS Narration UTR Credit?                     |  |
|  |  3. Fee Variance == 0 (within Rs 0.05 tolerance)?                          |  |
|  |  4. Settlement Date within contractual SLA (T+n)?                           |  |
|  |                                                                             |  |
|  |  [BRANCH A: Clean Match]                 [BRANCH B: Break Detected]         |  |
|  |  - matchStatus = 'MATCHED'               - matchStatus = 'EXCEPTION'        |  |
|  |  - Route to Accounting Sync              - Classify into 11-Category        |  |
|  |                                            Deterministic Taxonomy           |  |
|  +---------------------+-------------------------------+-----------------------+  |
|                        |                               |                          |
|                        v                               v                          |
|  [ ACCOUNTING SYNC ]                 [ EXCEPTION & DISPUTE WORKSPACE ]            |
|  +---------------------------------+ +------------------------------------------+ |
|  | - Auto-Balanced Tally Prime XML | | - Assigned Owner (Lead Controller)       | |
|  | - Zoho Books Journal CSV        | | - Ageing Clock (0-3d, 4-7d, 8+d)         | |
|  | - Claimable 18% GST ITC         | | - Formal Gateway Dispute Packet Generator| |
|  | - Reconciled clearing account   | | - Real-time Status Progression           | |
|  +---------------------------------+ +------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 2. Step-by-Step End-to-End User Journey

### Step 1: Merchant Connects Feeds (Ingestion)
1. Merchant opens **Data Ingestion** tab.
2. ReconOS connects to Shopify Order API, Razorpay/PayU settlement webhooks, and HDFC Bank statement upload (MT940/CSV).
3. The Canonical Transaction Model maps inconsistent field names:
   - Shopify: `Name` -> `orderId`, `Total` -> `orderAmount`
   - Razorpay: `entity_id` -> `paymentId`, `fee` -> `actualMdrFee`, `tax` -> `actualGstFee`, `utr` -> `utrNumber`
   - HDFC: `Narration` -> parsed UTR, `Credit Amount` -> `bankCreditAmount`

### Step 2: The Rate-Card Re-Pricing Engine Executes
1. Each transaction is re-priced against contracted interchange schedules.
2. If Razorpay billed ₹51.92 on a ₹2,800 order that used a domestic debit card contracted at 0.9%, ReconOS calculates:
   - Contracted MDR = ₹25.20
   - Contracted GST = ₹4.54
   - Total Expected = ₹29.74
   - Overcharge detected: ₹51.92 - ₹29.74 = **+₹22.18 leakage**.
3. The transaction is immediately flagged with category `FEE_MISMATCH`.

### Step 3: 3-Way Cross-Matching
1. ReconOS checks if the net settlement reached HDFC Bank via UTR.
2. If the gateway reported ₹2,748.08 settled with UTR `CMS9842187319`, but HDFC statement has no matching credit after 7 days:
   - Tagged as `MISSING_UTR` or `T_PLUS_N_SLIPPAGE`.
   - Ageing clock starts ticking.

### Step 4: CFO Reviews Executive Dashboard
1. Answers the 5 core financial questions in seconds:
   - Total Reconciled GMV: ₹3.42 Cr
   - Total Recoverable Money at Risk: ₹38,420
   - Primary break reasons: Fee Overcharges & Settlement Slippage
   - Actionable tickets for today.

### Step 5: Finance Controller Resolves Exceptions & Generates Dispute Packet
1. Finance controller opens **Exception Queue**.
2. Filters by "Fee Mismatch" or "8+ Days Overdue".
3. Clicks **"Dispute Packet"**:
   - ReconOS generates a formal dispute letter with all transaction hashes, contract schedule references, and exact rupee overcharges.
   - 1-click copies the letter or dispatches it to the aggregator nodal officer.
   - Transaction status updates to `DISPUTED_WITH_PG`.

### Step 6: One-Click ERP Export
1. Finance team opens **Accounting Export**.
2. Selects **Tally Prime XML** or **Zoho Books CSV**.
3. System outputs auto-balanced journal vouchers with exact 18% Input Tax Credit.
4. Downloaded and imported directly into Tally or Zoho.

### Step 7: Commercial GTM Audit & ROI Verification
1. Merchant reviews the **Executive MDR & Settlement Leakage Audit Report**.
2. Opens **ROI Calculator**:
   - Calculates exact payback period (under 45 days).
   - Validates that annual subscription (₹45,000/mo Growth tier) is fully paid for by recovered funds.
