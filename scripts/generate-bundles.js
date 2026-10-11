import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DOWNLOADS_DIR = path.join(ROOT_DIR, 'public', 'downloads');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

// Ensure target directories exist
if (!fs.existsSync(PUBLIC_DOWNLOADS_DIR)) {
  fs.mkdirSync(PUBLIC_DOWNLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// 1. Gather all codebase files
const codebaseFiles = [
  'package.json',
  'vite.config.ts',
  'src/types/recon.ts',
  'src/utils/reconciliationEngine.ts',
  'src/data/mockData.ts',
  'src/components/Navbar.tsx',
  'src/components/DashboardView.tsx',
  'src/components/ThreeWayMatchView.tsx',
  'src/components/RateCardEngineView.tsx',
  'src/components/ExceptionWorkspaceView.tsx',
  'src/components/DataIngestionView.tsx',
  'src/components/AuditReportView.tsx',
  'src/components/AccountingExportView.tsx',
  'src/components/RoiCalculatorView.tsx',
  'src/components/TransactionDetailModal.tsx',
  'src/components/DisputeModal.tsx',
  'src/components/InteractiveTourModal.tsx',
  'src/components/ClaudeExportView.tsx',
  'src/App.tsx',
  'src/main.tsx',
  'src/index.css'
];

let codebaseMarkdown = `# ReconOS — Complete Source Codebase Bundle
> Generated for Anthropic Claude Context & AI Knowledge Bases
> Target Application: ReconOS Multi-Gateway Settlement Reconciliation Platform

This document contains every single production source file of the ReconOS application.
Each file is formatted with its relative path and complete code.

---

`;

codebaseFiles.forEach(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(relPath).replace('.', '');
    const lang = ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'json' ? 'json' : ext === 'css' ? 'css' : 'text';
    codebaseMarkdown += `\n## File: \`${relPath}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n---\n`;
  }
});

// 2. Generate Master Specification Document
const masterSpecMarkdown = `# ReconOS — Product Requirements & Master Functional Specification
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
  - Key attributes: \`orderId\`, \`orderDate\`, \`orderAmount\`, customer metadata, checkout payment method.
- **Layer 2: Payment Aggregator Settlement Feeds (Razorpay, PayU, Cashfree):**
  - Received at Day T+1 to T+3 via batch MIS feeds or settlement webhooks.
  - Key attributes: \`paymentId\`, \`settlementId\`, gross amount, billed MDR, billed GST, net settled funds.
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
  $$\\text{Expected MDR} = (\\text{Order Amount} \\times \\text{Contracted MDR \\%}) + \\text{Contracted Flat Fee}$$
  $$\\text{Expected GST} = \\text{Expected MDR} \\times 18\\%$$
  $$\\text{Expected Net} = \\text{Order Amount} - \\text{Expected MDR} - \\text{Expected GST}$$
  $$\\text{Fee Variance} = (\\text{Actual MDR} + \\text{Actual GST}) - (\\text{Expected MDR} + \\text{Expected GST})$$
- When $\\text{Fee Variance} > 0$, ReconOS identifies an overcharge and tags the exact rupee amount as \`recoverableAmount\`.

### Module 3: Fixed 11-Category Exception Taxonomy
Unlike generic reconcilers that group failures into generic "Break" buckets, ReconOS uses a strict 11-category deterministic taxonomy:
1. \`FEE_MISMATCH\`: Billed MDR exceeds contracted rate card (e.g. RuPay billed as CC).
2. \`GST_ON_MDR_ERROR\`: Effective GST exceeds the statutory 18% slab.
3. \`REFUND_LAG\`: Refund debited by gateway before original settlement cleared.
4. \`CHARGEBACK_DEDUCTION\`: Chargeback clawback with unjustified dispute fee.
5. \`PART_SETTLEMENT\`: Net credit is less than gross order value minus documented fees.
6. \`T_PLUS_N_SLIPPAGE\`: Settlement delayed past agreed contractual SLA (e.g. T+7 instead of T+2).
7. \`MISSING_UTR\`: Settlement claimed by gateway but absent from bank CBS narration.
8. \`DUPLICATE_CREDIT\`: Duplicate settlement batch created by gateway.
9. \`RESERVE_HOLD\`: Gateway withheld rolling risk reserve without contractual notification.
10. \`MISSING_SETTLEMENT\`: Order captured successfully on Day 0 but completely missing from gateway settlement files.
11. \`AMOUNT_MISMATCH\`: Order amount differs from gateway transaction gross amount.

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
`;

// 3. Generate End-to-End Flow & Architecture Document
const architectureFlowMarkdown = `# ReconOS — End-to-End Architecture, Data Pipelines & State Machines

## 1. High-Level System Architecture Diagram

\`\`\`
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
\`\`\`

---

## 2. Step-by-Step End-to-End User Journey

### Step 1: Merchant Connects Feeds (Ingestion)
1. Merchant opens **Data Ingestion** tab.
2. ReconOS connects to Shopify Order API, Razorpay/PayU settlement webhooks, and HDFC Bank statement upload (MT940/CSV).
3. The Canonical Transaction Model maps inconsistent field names:
   - Shopify: \`Name\` -> \`orderId\`, \`Total\` -> \`orderAmount\`
   - Razorpay: \`entity_id\` -> \`paymentId\`, \`fee\` -> \`actualMdrFee\`, \`tax\` -> \`actualGstFee\`, \`utr\` -> \`utrNumber\`
   - HDFC: \`Narration\` -> parsed UTR, \`Credit Amount\` -> \`bankCreditAmount\`

### Step 2: The Rate-Card Re-Pricing Engine Executes
1. Each transaction is re-priced against contracted interchange schedules.
2. If Razorpay billed ₹51.92 on a ₹2,800 order that used a domestic debit card contracted at 0.9%, ReconOS calculates:
   - Contracted MDR = ₹25.20
   - Contracted GST = ₹4.54
   - Total Expected = ₹29.74
   - Overcharge detected: ₹51.92 - ₹29.74 = **+₹22.18 leakage**.
3. The transaction is immediately flagged with category \`FEE_MISMATCH\`.

### Step 3: 3-Way Cross-Matching
1. ReconOS checks if the net settlement reached HDFC Bank via UTR.
2. If the gateway reported ₹2,748.08 settled with UTR \`CMS9842187319\`, but HDFC statement has no matching credit after 7 days:
   - Tagged as \`MISSING_UTR\` or \`T_PLUS_N_SLIPPAGE\`.
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
   - Transaction status updates to \`DISPUTED_WITH_PG\`.

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
`;

// 4. Generate Single Combined Claude Master Feed Document
const allInOneMarkdown = `# ReconOS — MASTER CONTEXT & COMPLETE SYSTEM BUNDLE FOR ANTHROPIC CLAUDE
> Prompt Instructions for Claude:
> You are reviewing ReconOS, a production-grade multi-gateway settlement reconciliation platform tailored for Indian mid-market merchants (₹25 Cr to ₹500 Cr GMV).
> This document contains:
> 1. Executive Summary & Market Problem
> 2. Full Architecture & End-to-End Functional Flows
> 3. Data Schemas, Mathematical Formulas & 11-Category Taxonomy
> 4. Complete Source Code for all application components and utilities.
>
> Use this comprehensive context to answer questions, review architecture, generate additional integrations (e.g. Pine Labs, Cashfree, SAP, NetSuite), design tests, or audit payments compliance.

---

${masterSpecMarkdown}

---

${architectureFlowMarkdown}

---

${codebaseMarkdown}
`;

// Write all documents to /public/downloads and /docs
fs.writeFileSync(path.join(PUBLIC_DOWNLOADS_DIR, 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md'), codebaseMarkdown, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DOWNLOADS_DIR, 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md'), masterSpecMarkdown, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DOWNLOADS_DIR, 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md'), architectureFlowMarkdown, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DOWNLOADS_DIR, 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md'), allInOneMarkdown, 'utf8');

fs.writeFileSync(path.join(DOCS_DIR, 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md'), codebaseMarkdown, 'utf8');
fs.writeFileSync(path.join(DOCS_DIR, 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md'), masterSpecMarkdown, 'utf8');
fs.writeFileSync(path.join(DOCS_DIR, 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md'), architectureFlowMarkdown, 'utf8');
fs.writeFileSync(path.join(DOCS_DIR, 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md'), allInOneMarkdown, 'utf8');

console.log('Successfully generated all documentation and codebase bundle files for Claude!');
