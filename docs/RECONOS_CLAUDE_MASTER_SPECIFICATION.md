# ReconOS — Product Requirements & Master Functional Specification
**System Title:** ReconOS Multi-Gateway Settlement Reconciliation & Rate-Card Audit Platform  
**Target Market:** Indian Mid-Market D2C & eCommerce Merchants (₹25 Cr to ₹500 Cr Annual GMV)  
**Document Purpose:** Complete knowledge base and context for Anthropic Claude to understand, analyze, extend, and execute all capabilities of ReconOS.

---

## 1. Executive Summary & Market Problem

### 1.1 The Mid-Market Merchant Dilemma
Mid-market online merchants processing ₹25 Cr to ₹500 Cr in gross merchandise value (GMV) across India operate under severe payments friction:
- **Multi-Gateway Complexity:** High-volume merchants route transactions across 2 to 4 Payment Aggregators (Razorpay, PayU, Cashfree, PhonePe) to optimize transaction success rates and avoid downtime.
- **Opaque Deductions:** Payment aggregators deduct Merchant Discount Rate (MDR) and 18% Goods & Services Tax (GST) at source before settling net funds into merchant current accounts.
- **Settlement Drift:** Between 0.3% and 1.2% of GMV slips through unexplained discrepancies:
  1. *Interchange rate creep:* RuPay debit cards billed as retail credit cards (charging 1.85% instead of 0%).
  2. *GST computation glitches:* Billed at 22%+ effective rates due to rounding or misclassified slab errors.
  3. *Uncredited settlements:* T+7 or T+14 settlement slippage where bank accounts never receive the credited funds.
  4. *Missing UTRs:* Settlements lumped into generic batch references with missing RBI Unique Transaction References.
  5. *Refund & Chargeback double-dips:* Gateways debiting full customer refunds plus retained non-refundable MDR.

### 1.2 ReconOS Core Thesis
- **"Lead with the audit, not the software."** Merchants are sold on immediate recovered capital from previous 90-day gateway leakages before paying for continuous software.
- **Non-Custodial Architecture:** ReconOS is 100% read-only. It NEVER holds nodal funds or executes bank transfers, ensuring compliance with RBI Master Directions on Payment Aggregators and the Digital Personal Data Protection (DPDP) Act.
- **Self-Funding Economics:** Customers fund their annual subscription through discovered gateway leakage recovery.

---

## 2. Core Functional Modules & Feature Breakdown

ReconOS is built around 8 core functional modules, each addressing a critical link in the payments lifecycle:

### Module 1: Continuous 3-Way Reconciliation Engine
- **Layer 1: Order Management System (Shopify / WooCommerce / Custom OMS):**
  - Captured at Day 0 when the customer completes checkout.
  - Key attributes: `orderId`, `orderDate`, `orderAmount`, customer metadata, checkout payment method.
- **Layer 2: Payment Aggregator Settlement Feeds (Razorpay, PayU, Cashfree):**
  - Received at Day T+1 to T+3 via batch MIS feeds or settlement webhooks.
  - Key attributes: `paymentId`, `settlementId`, gross amount, billed MDR, billed GST, net settled funds.
- **Layer 3: Bank Credit Statement (HDFC Bank Current Account CBS):**
  - Downloaded via MT940 or bank API at Day T+1 to T+7.
  - Key attributes: Bank credit date, net credit amount, narration containing the 16-22 character RBI UTR reference.
- **Strict Matching Rules:**
  - Strict matching requirement: **Zero Unsafe Matches**.
  - Transactions with missing UTRs, timing differences, or MDR fee discrepancies are never force-matched; they are automatically classified into the Exception Taxonomy.

### Module 2: The Sharp Edge — Rate-Card Re-Pricing Engine
ReconOS's core competitive moat is dynamic transaction-level fee re-pricing:
- Every transaction is matched against the merchant's contracted rate card based on:
  - Gateway (Razorpay, PayU, Cashfree)
  - Payment Method (UPI, RuPay Debit, Visa/Mastercard Debit, Domestic CC, International CC, Netbanking, EMI, Corporate Cards)
- **Mathematical Formula:**
  $$\text{Expected MDR} = (\text{Order Amount} \times \text{Contracted MDR \%}) + \text{Contracted Flat Fee}$$
  $$\text{Expected GST} = \text{Expected MDR} \times 18\%$$
  $$\text{Expected Net} = \text{Order Amount} - \text{Expected MDR} - \text{Expected GST}$$
  $$\text{Fee Variance} = (\text{Actual MDR} + \text{Actual GST}) - (\text{Expected MDR} + \text{Expected GST})$$
- When $\text{Fee Variance} > 0$, ReconOS identifies an overcharge and tags the exact rupee amount as `recoverableAmount`.

### Module 3: Fixed 11-Category Exception Taxonomy
Unlike generic reconcilers that group failures into generic "Break" buckets, ReconOS uses a strict 11-category deterministic taxonomy:
1. `FEE_MISMATCH`: Billed MDR exceeds contracted rate card (e.g. RuPay billed as CC).
2. `GST_ON_MDR_ERROR`: Effective GST exceeds the statutory 18% slab.
3. `REFUND_LAG`: Refund debited by gateway before original settlement cleared.
4. `CHARGEBACK_DEDUCTION`: Chargeback clawback with unjustified dispute fee.
5. `PART_SETTLEMENT`: Net credit is less than gross order value minus documented fees.
6. `T_PLUS_N_SLIPPAGE`: Settlement delayed past agreed contractual SLA (e.g. T+7 instead of T+2).
7. `MISSING_UTR`: Settlement claimed by gateway but absent from bank CBS narration.
8. `DUPLICATE_CREDIT`: Duplicate settlement batch created by gateway.
9. `RESERVE_HOLD`: Gateway withheld rolling risk reserve without contractual notification.
10. `MISSING_SETTLEMENT`: Order captured successfully on Day 0 but completely missing from gateway settlement files.
11. `AMOUNT_MISMATCH`: Order amount differs from gateway transaction gross amount.

### Module 4: Exception Queue & Dispute Workflows
- **Assigned Ownership:** Every break is assigned to a finance team member (e.g., Ananya Sharma - Lead Settlement Controller).
- **Ageing Clocks:** Tracked in days (0-3d Fresh, 4-7d Aging, 8+d Overdue).
- **Automated Formal Dispute Packets:** One-click generation of legally grounded dispute letters citing Schedule B of merchant contracts, detailing transaction tokens, billed vs. contracted amounts, and requesting formal credit notes.

### Module 5: Layer 1 & 2 Ingestion Connectors & Normalizer
- Connectors for Shopify, Razorpay, PayU, Cashfree, and HDFC Bank MT940.
- Unified canonical normalization schema ensuring heterogeneous gateway column names map to standard fields.

### Module 6: Executive Forensic Audit Report (GTM Asset)
- "Sell the recovery number before selling the software."
- Quantifies total GMV analyzed, identified leakage, annualized recovery run-rate, and gateway variance comparison.
- Formatted as a printable, C-level executive document for CFOs and Finance Controllers.

### Module 7: ERP & Accounting Synchronisation (Tally Prime & Zoho Books)
- Auto-balances four-legged journal entries:
  - **Debit:** Bank Current Account (Net funds received)
  - **Debit:** MDR Commission Expense (Direct finance expense)
  - **Debit:** GST Input Tax Credit (18% ITC claimable in GSTR-2B)
  - **Credit:** Online Sales Clearing Account (Clearing Day 0 debtor)
- Formatted as Tally Prime XML vouchers and Zoho Books journal CSVs with 1-click download.

### Module 8: Commercial SaaS Pricing & Self-Funding ROI Calculator
- **Starter:** ₹15,000/mo (≤ 1L txns/mo, 2 PGs, standard matching).
- **Growth (Flagship):** ₹45,000/mo (≤ 10L txns/mo, unlimited PGs, Rate-Card Re-pricing Engine, Tally/Zoho export, dispute generator).
- **Scale:** ₹1,20,000/mo (> 10L txns/mo, API webhooks, custom ERP connectors, dedicated payments partner).
- **Self-Funding 15% Recovery Fee:** Charged purely on recovered leakage from gateways, delivering 4x–18x first-year ROI.
