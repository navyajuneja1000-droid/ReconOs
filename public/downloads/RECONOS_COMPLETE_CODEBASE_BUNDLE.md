# ReconOS — Complete Source Codebase Bundle
> Generated for Anthropic Claude Context & AI Knowledge Bases
> Target Application: ReconOS Multi-Gateway Settlement Reconciliation Platform

This document contains every single production source file of the ReconOS application.
Each file is formatted with its relative path and complete code.

---


## File: `package.json`

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "canvas-confetti": "^1.9.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.10.1",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}

```

---

## File: `vite.config.ts`

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

```

---

## File: `src/types/recon.ts`

```typescript
export type GatewayName = 'Razorpay' | 'PayU' | 'Cashfree' | 'PhonePe';

export type PaymentMethod = 
  | 'Credit Card (Domestic)' 
  | 'Credit Card (International)' 
  | 'Debit Card (RuPay)' 
  | 'Debit Card (Visa/Mastercard)' 
  | 'UPI' 
  | 'Netbanking' 
  | 'EMI' 
  | 'Corporate Card';

export type MatchStatus = 
  | 'MATCHED'
  | 'EXCEPTION'
  | 'PARTIALLY_MATCHED'
  | 'PENDING_BANK';

export type ExceptionCategory =
  | 'FEE_MISMATCH'
  | 'GST_ON_MDR_ERROR'
  | 'REFUND_LAG'
  | 'CHARGEBACK_DEDUCTION'
  | 'PART_SETTLEMENT'
  | 'T_PLUS_N_SLIPPAGE'
  | 'MISSING_UTR'
  | 'DUPLICATE_CREDIT'
  | 'RESERVE_HOLD'
  | 'MISSING_SETTLEMENT'
  | 'AMOUNT_MISMATCH';

export type ExceptionStatus = 
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'DISPUTED_WITH_PG'
  | 'TIMING_DIFFERENCE'
  | 'RESOLVED';

export interface RateCardRule {
  id: string;
  gateway: GatewayName;
  method: PaymentMethod;
  contractedMdrPct: number; // e.g. 1.85 for 1.85%
  contractedFlatFee: number; // e.g. 0 or 5 for flat INR
  gstRatePct: number; // standard 18% in India
  notes?: string;
}

export interface CanonicalTransaction {
  id: string;
  orderId: string;
  paymentId: string;
  merchantId: string;
  customerName: string;
  customerEmail: string;
  orderAmount: number;
  currency: string;
  orderDate: string;
  paymentMethod: PaymentMethod;
  cardNetwork?: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'UPI' | 'Netbanking';
  gateway: GatewayName;
  
  // Aggregator settlement details
  settlementId?: string;
  settlementDate?: string;
  actualGrossAmount?: number;
  actualMdrFee: number;
  actualGstFee: number;
  refundDeduction: number;
  chargebackDeduction: number;
  reserveDeduction: number;
  actualNetSettled: number;

  // Rate card recalculation
  expectedMdrFee: number;
  expectedGstFee: number;
  expectedNetSettlement: number;
  feeVariance: number; // actualFee - expectedFee (positive means merchant overcharged)
  
  // Bank credit details
  utrNumber?: string;
  bankCreditDate?: string;
  bankCreditAmount?: number;
  bankAccountRef?: string;
  bankMatched: boolean;

  // Reconciliation state
  matchStatus: MatchStatus;
  confidenceScore: number; // 0 - 100
  matchReason: string;
  exceptionCategory?: ExceptionCategory;
  exceptionStatus?: ExceptionStatus;
  exceptionAgeDays: number;
  assignedOwner?: string;
  disputeNotes?: string;
  isRecoverable: boolean;
  recoverableAmount: number;
  evidenceAttached?: boolean;
}

export interface SourceIngestionStatus {
  sourceType: 'ORDER_SYSTEM' | 'PAYMENT_AGGREGATOR' | 'BANK_STATEMENT';
  sourceName: string;
  lastSyncTime: string;
  recordsCount: number;
  status: 'HEALTHY' | 'SYNCING' | 'ATTENTION';
  fileFormat: string;
}

export interface ReconciliationMetrics {
  totalGmv: number;
  totalTransactions: number;
  matchedGmv: number;
  matchedCount: number;
  matchRatePct: number;
  unmatchedValue: number;
  exceptionCount: number;
  totalRecoverableLeakage: number;
  suspectedMdrOvercharge: number;
  gstVarianceTotal: number;
  refundChargebackLagTotal: number;
  avgExceptionAgeDays: number;
  breaksByCategory: Record<ExceptionCategory, { count: number; value: number }>;
  breaksByGateway: Record<GatewayName, { count: number; variance: number; volume: number }>;
}

export interface AuditReportData {
  merchantName: string;
  period: string;
  totalAnalyzedGmv: number;
  totalTransactions: number;
  overchargeDetected: number;
  unexplainedSettlementBreaks: number;
  totalIdentifiedRecovery: number;
  potentialAnnualizedRecovery: number;
  topOverchargingGateways: {
    gateway: GatewayName;
    billedMdr: number;
    contractedMdr: number;
    variance: number;
    primaryCause: string;
  }[];
}

```

---

## File: `src/utils/reconciliationEngine.ts`

```typescript
import { 
  CanonicalTransaction, 
  ReconciliationMetrics, 
  RateCardRule, 
  ExceptionCategory, 
  GatewayName, 
  AuditReportData 
} from '../types/recon';

/**
 * Format Indian Rupee currency (Lakhs / Crores standard formatting)
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  // Format with standard Indian numbering system
  const parts = absVal.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${isNegative ? '-' : ''}₹${integerPart}.${decimalPart}`;
}

export function formatCompactINR(amount: number): string {
  const absVal = Math.abs(amount);
  if (absVal >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return formatINR(amount);
}

/**
 * Re-price a transaction against the contracted rate card rules
 */
export function repriceTransaction(txn: CanonicalTransaction, rateCards: RateCardRule[]): CanonicalTransaction {
  // Find matching rate rule
  const rule = rateCards.find(r => r.gateway === txn.gateway && r.method === txn.paymentMethod);
  
  if (!rule) {
    return txn;
  }

  const expectedMdr = (txn.orderAmount * rule.contractedMdrPct / 100) + rule.contractedFlatFee;
  const expectedGst = expectedMdr * (rule.gstRatePct / 100);
  const expectedNet = txn.orderAmount - expectedMdr - expectedGst - txn.refundDeduction - txn.chargebackDeduction - txn.reserveDeduction;

  const mdrDiff = txn.actualMdrFee - expectedMdr;
  const gstDiff = txn.actualGstFee - expectedGst;
  const totalVariance = Math.max(0, mdrDiff + gstDiff);

  const updated: CanonicalTransaction = {
    ...txn,
    expectedMdrFee: Number(expectedMdr.toFixed(2)),
    expectedGstFee: Number(expectedGst.toFixed(2)),
    expectedNetSettlement: Number(expectedNet.toFixed(2)),
    feeVariance: Number(totalVariance.toFixed(2)),
  };

  // If variance is detected and not currently matched
  if (totalVariance > 1.0 && updated.matchStatus === 'MATCHED') {
    updated.matchStatus = 'EXCEPTION';
    updated.exceptionCategory = mdrDiff > 1.0 ? 'FEE_MISMATCH' : 'GST_ON_MDR_ERROR';
    updated.isRecoverable = true;
    updated.recoverableAmount = Number(totalVariance.toFixed(2));
    updated.matchReason = `Rate-card variance: Billed fee exceeds contracted rate by ${formatINR(totalVariance)}`;
  }

  return updated;
}

/**
 * Recalculate metrics across all transactions
 */
export function calculateMetrics(transactions: CanonicalTransaction[]): ReconciliationMetrics {
  let totalGmv = 0;
  let matchedGmv = 0;
  let matchedCount = 0;
  let unmatchedValue = 0;
  let exceptionCount = 0;
  let totalRecoverableLeakage = 0;
  let suspectedMdrOvercharge = 0;
  let gstVarianceTotal = 0;
  let refundChargebackLagTotal = 0;
  let totalAgeDays = 0;

  const breaksByCategory: Record<ExceptionCategory, { count: number; value: number }> = {
    FEE_MISMATCH: { count: 0, value: 0 },
    GST_ON_MDR_ERROR: { count: 0, value: 0 },
    REFUND_LAG: { count: 0, value: 0 },
    CHARGEBACK_DEDUCTION: { count: 0, value: 0 },
    PART_SETTLEMENT: { count: 0, value: 0 },
    T_PLUS_N_SLIPPAGE: { count: 0, value: 0 },
    MISSING_UTR: { count: 0, value: 0 },
    DUPLICATE_CREDIT: { count: 0, value: 0 },
    RESERVE_HOLD: { count: 0, value: 0 },
    MISSING_SETTLEMENT: { count: 0, value: 0 },
    AMOUNT_MISMATCH: { count: 0, value: 0 },
  };

  const breaksByGateway: Record<GatewayName, { count: number; variance: number; volume: number }> = {
    Razorpay: { count: 0, variance: 0, volume: 0 },
    PayU: { count: 0, variance: 0, volume: 0 },
    Cashfree: { count: 0, variance: 0, volume: 0 },
    PhonePe: { count: 0, variance: 0, volume: 0 },
  };

  transactions.forEach((txn) => {
    totalGmv += txn.orderAmount;
    breaksByGateway[txn.gateway].volume += txn.orderAmount;

    if (txn.matchStatus === 'MATCHED') {
      matchedGmv += txn.orderAmount;
      matchedCount++;
    } else {
      unmatchedValue += txn.orderAmount;
      exceptionCount++;
      totalAgeDays += txn.exceptionAgeDays;

      if (txn.exceptionCategory) {
        breaksByCategory[txn.exceptionCategory].count += 1;
        breaksByCategory[txn.exceptionCategory].value += txn.recoverableAmount || txn.orderAmount;
      }

      breaksByGateway[txn.gateway].count += 1;
      breaksByGateway[txn.gateway].variance += txn.feeVariance;

      if (txn.isRecoverable) {
        totalRecoverableLeakage += txn.recoverableAmount;
      }

      if (txn.exceptionCategory === 'FEE_MISMATCH') {
        suspectedMdrOvercharge += txn.feeVariance;
      }
      if (txn.exceptionCategory === 'GST_ON_MDR_ERROR') {
        gstVarianceTotal += txn.feeVariance;
      }
      if (txn.exceptionCategory === 'REFUND_LAG' || txn.exceptionCategory === 'CHARGEBACK_DEDUCTION') {
        refundChargebackLagTotal += txn.recoverableAmount;
      }
    }
  });

  const matchRatePct = totalGmv > 0 ? (matchedGmv / totalGmv) * 100 : 0;
  const avgExceptionAgeDays = exceptionCount > 0 ? totalAgeDays / exceptionCount : 0;

  return {
    totalGmv: Number(totalGmv.toFixed(2)),
    totalTransactions: transactions.length,
    matchedGmv: Number(matchedGmv.toFixed(2)),
    matchedCount,
    matchRatePct: Number(matchRatePct.toFixed(1)),
    unmatchedValue: Number(unmatchedValue.toFixed(2)),
    exceptionCount,
    totalRecoverableLeakage: Number(totalRecoverableLeakage.toFixed(2)),
    suspectedMdrOvercharge: Number(suspectedMdrOvercharge.toFixed(2)),
    gstVarianceTotal: Number(gstVarianceTotal.toFixed(2)),
    refundChargebackLagTotal: Number(refundChargebackLagTotal.toFixed(2)),
    avgExceptionAgeDays: Number(avgExceptionAgeDays.toFixed(1)),
    breaksByCategory,
    breaksByGateway,
  };
}

/**
 * Generate an executive audit summary based on the "Lead with the audit" philosophy
 */
export function generateAuditSummary(
  transactions: CanonicalTransaction[],
  merchantName: string = 'Bombay Threads Co.'
): AuditReportData {
  const metrics = calculateMetrics(transactions);

  const topOverchargingGateways = (Object.keys(metrics.breaksByGateway) as GatewayName[])
    .filter(gw => metrics.breaksByGateway[gw].volume > 0)
    .map(gw => {
      const gwTxns = transactions.filter(t => t.gateway === gw);
      const totalBilledMdr = gwTxns.reduce((acc, t) => acc + t.actualMdrFee + t.actualGstFee, 0);
      const totalContractedMdr = gwTxns.reduce((acc, t) => acc + t.expectedMdrFee + t.expectedGstFee, 0);
      const variance = metrics.breaksByGateway[gw].variance;

      let primaryCause = 'Zero rate-card variance detected';
      if (variance > 0) {
        const hasRupay = gwTxns.some(t => t.paymentMethod === 'Debit Card (RuPay)' && t.actualMdrFee > 0);
        const hasGstGlitch = gwTxns.some(t => t.exceptionCategory === 'GST_ON_MDR_ERROR');
        const hasIntl = gwTxns.some(t => t.paymentMethod === 'Credit Card (International)' && t.feeVariance > 0);
        
        if (hasRupay) primaryCause = 'Mandated 0% RuPay debit billed at retail CC interchange (1.85%)';
        else if (hasGstGlitch) primaryCause = 'Inconsistent GST computation (billed > 18% standard rate)';
        else if (hasIntl) primaryCause = 'International card interchange billed above contracted tier cap';
        else primaryCause = 'MDR fee slippage on premium cards and commercial cards';
      }

      return {
        gateway: gw,
        billedMdr: Number(totalBilledMdr.toFixed(2)),
        contractedMdr: Number(totalContractedMdr.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        primaryCause,
      };
    });

  // Annualize recovery assuming current batch represents 1 week of operations (52 weeks)
  const annualized = metrics.totalRecoverableLeakage * 52;

  return {
    merchantName,
    period: 'Last 30 Days (Pilot Reconciliation Run)',
    totalAnalyzedGmv: metrics.totalGmv,
    totalTransactions: metrics.totalTransactions,
    overchargeDetected: metrics.suspectedMdrOvercharge + metrics.gstVarianceTotal,
    unexplainedSettlementBreaks: metrics.unmatchedValue - (metrics.suspectedMdrOvercharge + metrics.gstVarianceTotal),
    totalIdentifiedRecovery: metrics.totalRecoverableLeakage,
    potentialAnnualizedRecovery: Number(annualized.toFixed(2)),
    topOverchargingGateways,
  };
}

/**
 * Generate Tally Prime / ERP 9 compliant XML vouchers
 */
export function generateTallyXml(transactions: CanonicalTransaction[]): string {
  const matchedTxns = transactions.filter(t => t.matchStatus === 'MATCHED' || t.bankMatched);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
${matchedTxns.map(t => `        <VOUCHER VCHTYPE="Receipt" ACTION="Create">
          <DATE>${t.settlementDate ? t.settlementDate.split(' ')[0].replace(/-/g, '') : '20260908'}</DATE>
          <NARRATION>ReconOS Reconciled Settlement for Order ${t.orderId} via ${t.gateway} UTR: ${t.utrNumber || 'N/A'}</NARRATION>
          <VOUCHERNUMBER>${t.paymentId}</VOUCHERNUMBER>
          <!-- Debit Bank Account -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>HDFC Bank Current A/c - 9921</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${t.actualNetSettled.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <!-- Debit Payment Gateway Expense (MDR) -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Payment Gateway Charges - ${t.gateway}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${t.actualMdrFee.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <!-- Debit GST Input Tax Credit (18%) -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Input CGST/SGST on Bank Charges</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${t.actualGstFee.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <!-- Credit Sales Debtor / Clearing Account -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Online Sales Clearing A/c (${t.gateway})</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${t.orderAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>`).join('\n')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generate Zoho Books standard journal entry CSV
 */
export function generateZohoCsv(transactions: CanonicalTransaction[]): string {
  const headers = [
    'Journal Date',
    'Reference Number',
    'Account Name',
    'Debits',
    'Credits',
    'Notes',
    'UTR Reference',
    'Gateway'
  ];

  const rows: string[] = [headers.join(',')];

  transactions.filter(t => t.matchStatus === 'MATCHED' || t.bankMatched).forEach(t => {
    const date = t.settlementDate ? t.settlementDate.split(' ')[0] : '2026-09-08';
    const notes = `ReconOS Cleared Order ${t.orderId}`;
    
    // Bank Debit
    rows.push(`"${date}","${t.paymentId}","HDFC Bank Current Account",${t.actualNetSettled.toFixed(2)},0,"${notes}","${t.utrNumber || ''}","${t.gateway}"`);
    // MDR Debit
    rows.push(`"${date}","${t.paymentId}","Payment Gateway Commission Charges",${t.actualMdrFee.toFixed(2)},0,"${notes}","${t.utrNumber || ''}","${t.gateway}"`);
    // GST Debit
    rows.push(`"${date}","${t.paymentId}","Input Tax Credit (GST on MDR)",${t.actualGstFee.toFixed(2)},0,"${notes}","${t.utrNumber || ''}","${t.gateway}"`);
    // Sales Clearing Credit
    rows.push(`"${date}","${t.paymentId}","Payment Gateway Clearing Account",0,${t.orderAmount.toFixed(2)},"${notes}","${t.utrNumber || ''}","${t.gateway}"`);
  });

  return rows.join('\n');
}

/**
 * Generate an official dispute notice letter text for Payment Aggregator escalation
 */
export function generateDisputeNotice(txn: CanonicalTransaction): string {
  return `FORMAL DISPUTE & RE-PRICING INVOICE REVERSAL REQUEST
To: ${txn.gateway} Merchant Support & Nodal Grievance Cell
Merchant Entity: Bombay Threads & Lifestyle Private Limited
Merchant ID: ${txn.merchantId}
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

Subject: Discrepancy & Overcharge Claim for Payment ID ${txn.paymentId} (Order ${txn.orderId})

Dear Team,

Our automated payments reconciliation audit platform (ReconOS) has detected a transaction-level settlement break on the following processed transaction:

1. TRANSACTION IDENTIFIERS:
- Order ID: ${txn.orderId}
- Payment ID: ${txn.paymentId}
- Transaction Date: ${txn.orderDate}
- Settlement Batch ID: ${txn.settlementId || 'N/A'}
- Payment Instrument: ${txn.paymentMethod} (${txn.cardNetwork || 'Standard'})
- Gross Amount: ${formatINR(txn.orderAmount)}

2. OBSERVED SETTLEMENT BREAK:
- Issue Classification: ${txn.exceptionCategory || 'Fee & Settlement Variance'}
- Bank UTR Status: ${txn.utrNumber ? `Credited via ${txn.utrNumber}` : 'UTR Missing / Not Credited to Bank'}
- Age of Unresolved Break: ${txn.exceptionAgeDays} days

3. CONTRACTUAL RATE-CARD AUDIT:
- Billed MDR Deducted: ${formatINR(txn.actualMdrFee)}
- Contracted Agreed MDR: ${formatINR(txn.expectedMdrFee)}
- Billed GST on MDR: ${formatINR(txn.actualGstFee)}
- Contracted Agreed GST: ${formatINR(txn.expectedGstFee)}
- Net Unwarranted Deduction / Variance: ${formatINR(txn.feeVariance || txn.recoverableAmount)}

4. EVIDENCE & REMEDY REQUIRED:
Under our Master Services Agreement (MSA) Schedule B, the contracted rate card applies unconditionally. We hereby request:
a) Credit Note in favor of Bombay Threads & Lifestyle Pvt Ltd for ${formatINR(txn.feeVariance || txn.recoverableAmount)} within 5 business days.
b) Transmission of missing UTR and nodal settlement bank confirmation.

Authorized Signatory,
Finance Operations Team
Bombay Threads & Lifestyle Co.
Generated via ReconOS Reconciliation Engine`;
}

```

---

## File: `src/data/mockData.ts`

```typescript
import { 
  CanonicalTransaction, 
  RateCardRule, 
  SourceIngestionStatus, 
  GatewayName, 
  PaymentMethod 
} from '../types/recon';

export const INITIAL_RATE_CARDS: RateCardRule[] = [
  // Razorpay
  { id: 'rzp-upi', gateway: 'Razorpay', method: 'UPI', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: 'Govt 0% MDR mandate for P2M UPI' },
  { id: 'rzp-rupay-db', gateway: 'Razorpay', method: 'Debit Card (RuPay)', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: 'RuPay debit mandated 0% interchange' },
  { id: 'rzp-visa-db', gateway: 'Razorpay', method: 'Debit Card (Visa/Mastercard)', contractedMdrPct: 0.90, contractedFlatFee: 0, gstRatePct: 18, notes: 'Standard RBI cap for ticket > ₹2,000' },
  { id: 'rzp-cc-dom', gateway: 'Razorpay', method: 'Credit Card (Domestic)', contractedMdrPct: 1.85, contractedFlatFee: 0, gstRatePct: 18, notes: 'Contracted rate for domestic retail CC' },
  { id: 'rzp-cc-intl', gateway: 'Razorpay', method: 'Credit Card (International)', contractedMdrPct: 2.80, contractedFlatFee: 0, gstRatePct: 18, notes: 'Tier 1 international card rate' },
  { id: 'rzp-netbank', gateway: 'Razorpay', method: 'Netbanking', contractedMdrPct: 0, contractedFlatFee: 12.0, gstRatePct: 18, notes: 'Flat ₹12 per transaction' },
  { id: 'rzp-emi', gateway: 'Razorpay', method: 'EMI', contractedMdrPct: 2.10, contractedFlatFee: 0, gstRatePct: 18, notes: 'Subvented & standard merchant EMI' },
  { id: 'rzp-corp', gateway: 'Razorpay', method: 'Corporate Card', contractedMdrPct: 2.40, contractedFlatFee: 0, gstRatePct: 18, notes: 'Commercial/Corporate card surcharge' },

  // PayU
  { id: 'payu-upi', gateway: 'PayU', method: 'UPI', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: '0% UPI standard' },
  { id: 'payu-rupay-db', gateway: 'PayU', method: 'Debit Card (RuPay)', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: '0% RuPay Debit' },
  { id: 'payu-visa-db', gateway: 'PayU', method: 'Debit Card (Visa/Mastercard)', contractedMdrPct: 0.85, contractedFlatFee: 0, gstRatePct: 18, notes: 'Contracted discount 0.85%' },
  { id: 'payu-cc-dom', gateway: 'PayU', method: 'Credit Card (Domestic)', contractedMdrPct: 1.80, contractedFlatFee: 0, gstRatePct: 18, notes: 'Volume tier pricing 1.80%' },
  { id: 'payu-cc-intl', gateway: 'PayU', method: 'Credit Card (International)', contractedMdrPct: 2.95, contractedFlatFee: 0, gstRatePct: 18, notes: 'Cross-border rate' },
  { id: 'payu-netbank', gateway: 'PayU', method: 'Netbanking', contractedMdrPct: 0, contractedFlatFee: 10.0, gstRatePct: 18, notes: 'Flat ₹10 per ticket' },
  { id: 'payu-emi', gateway: 'PayU', method: 'EMI', contractedMdrPct: 2.25, contractedFlatFee: 0, gstRatePct: 18, notes: 'Brand EMI rate' },
  { id: 'payu-corp', gateway: 'PayU', method: 'Corporate Card', contractedMdrPct: 2.50, contractedFlatFee: 0, gstRatePct: 18, notes: 'Commercial card' },

  // Cashfree
  { id: 'cf-upi', gateway: 'Cashfree', method: 'UPI', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: 'UPI free rail' },
  { id: 'cf-rupay-db', gateway: 'Cashfree', method: 'Debit Card (RuPay)', contractedMdrPct: 0.0, contractedFlatFee: 0, gstRatePct: 18, notes: '0% RuPay' },
  { id: 'cf-visa-db', gateway: 'Cashfree', method: 'Debit Card (Visa/Mastercard)', contractedMdrPct: 0.90, contractedFlatFee: 0, gstRatePct: 18, notes: 'Standard debit' },
  { id: 'cf-cc-dom', gateway: 'Cashfree', method: 'Credit Card (Domestic)', contractedMdrPct: 1.85, contractedFlatFee: 0, gstRatePct: 18, notes: 'Contracted 1.85%' },
  { id: 'cf-cc-intl', gateway: 'Cashfree', method: 'Credit Card (International)', contractedMdrPct: 2.85, contractedFlatFee: 0, gstRatePct: 18, notes: 'International' },
  { id: 'cf-netbank', gateway: 'Cashfree', method: 'Netbanking', contractedMdrPct: 0, contractedFlatFee: 11.0, gstRatePct: 18, notes: 'Flat ₹11 fee' },
  { id: 'cf-emi', gateway: 'Cashfree', method: 'EMI', contractedMdrPct: 2.20, contractedFlatFee: 0, gstRatePct: 18, notes: 'EMI rate' },
  { id: 'cf-corp', gateway: 'Cashfree', method: 'Corporate Card', contractedMdrPct: 2.45, contractedFlatFee: 0, gstRatePct: 18, notes: 'Corporate card' },
];

export const INITIAL_SOURCES: SourceIngestionStatus[] = [
  {
    sourceType: 'ORDER_SYSTEM',
    sourceName: 'Shopify Store (Primary D2C)',
    lastSyncTime: '12 mins ago (Auto-webhook)',
    recordsCount: 14820,
    status: 'HEALTHY',
    fileFormat: 'REST API / Webhooks',
  },
  {
    sourceType: 'PAYMENT_AGGREGATOR',
    sourceName: 'Razorpay PG Settlement Feed',
    lastSyncTime: '34 mins ago (Daily Settlement API)',
    recordsCount: 8412,
    status: 'HEALTHY',
    fileFormat: 'Settlement CSV / API v2',
  },
  {
    sourceType: 'PAYMENT_AGGREGATOR',
    sourceName: 'PayU Enterprise Settlement',
    lastSyncTime: '1 hr ago (SFTP Pull)',
    recordsCount: 4290,
    status: 'HEALTHY',
    fileFormat: 'Daily MIS Settlement XLS/CSV',
  },
  {
    sourceType: 'PAYMENT_AGGREGATOR',
    sourceName: 'Cashfree Auto-Collect & PG',
    lastSyncTime: '2 hrs ago (Webhook + S3)',
    recordsCount: 2118,
    status: 'HEALTHY',
    fileFormat: 'Cashfree S3 Feed',
  },
  {
    sourceType: 'BANK_STATEMENT',
    sourceName: 'HDFC Bank CMS Current Account #9921',
    lastSyncTime: 'Today 06:30 AM (Host-to-Host MT940)',
    recordsCount: 68,
    status: 'HEALTHY',
    fileFormat: 'MT940 / CBS Statement',
  },
];

export const TEAM_MEMBERS = [
  'Navya J. (Lead Finance Ops)',
  'Rajesh K. (Financial Controller)',
  'Priya M. (Payments Analyst)',
  'Amitabh S. (CFO / Unassigned)',
];

export const INITIAL_TRANSACTIONS: CanonicalTransaction[] = [
  // 1. Matched Clean Transaction (Razorpay CC)
  {
    id: 'TXN-1001',
    orderId: 'ORD-89421',
    paymentId: 'pay_NzK8291f0A',
    merchantId: 'BOM-THR-01',
    customerName: 'Ananya Sharma',
    customerEmail: 'ananya.s@gmail.com',
    orderAmount: 4850.00,
    currency: 'INR',
    orderDate: '2026-09-07 14:22',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Visa',
    gateway: 'Razorpay',
    settlementId: 'setl_9921a8x9',
    settlementDate: '2026-09-08 09:15',
    actualGrossAmount: 4850.00,
    actualMdrFee: 89.73, // 1.85%
    actualGstFee: 16.15, // 18% of MDR
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 4744.12,
    expectedMdrFee: 89.73,
    expectedGstFee: 16.15,
    expectedNetSettlement: 4744.12,
    feeVariance: 0.00,
    utrNumber: 'HDFCR520260908882194',
    bankCreditDate: '2026-09-08 11:30',
    bankCreditAmount: 4744.12,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'MATCHED',
    confidenceScore: 100,
    matchReason: '3-Way exact match on Payment ID, UTR amount and date',
    exceptionAgeDays: 0,
    isRecoverable: false,
    recoverableAmount: 0,
  },

  // 2. FEE MISMATCH (RuPay Card billed as standard CC at 1.85% instead of 0% mandated)
  {
    id: 'TXN-1002',
    orderId: 'ORD-89435',
    paymentId: 'pay_RuP98124bZ',
    merchantId: 'BOM-THR-01',
    customerName: 'Vikram Malhotra',
    customerEmail: 'vikram.m@rediffmail.com',
    orderAmount: 12500.00,
    currency: 'INR',
    orderDate: '2026-09-06 18:40',
    paymentMethod: 'Debit Card (RuPay)',
    cardNetwork: 'RuPay',
    gateway: 'Razorpay',
    settlementId: 'setl_9921a8x9',
    settlementDate: '2026-09-07 09:10',
    actualGrossAmount: 12500.00,
    actualMdrFee: 231.25, // Billed at 1.85%!
    actualGstFee: 41.63,  // 18% of wrongful MDR
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 12227.12,
    expectedMdrFee: 0.00, // Mandated 0% for RuPay Debit
    expectedGstFee: 0.00,
    expectedNetSettlement: 12500.00,
    feeVariance: 272.88, // Total wrongful deduction
    utrNumber: 'HDFCR520260907441920',
    bankCreditDate: '2026-09-07 12:15',
    bankCreditAmount: 12227.12,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 92,
    matchReason: 'Bank matched, but rate-card engine flagged 1.85% MDR charged on 0% RuPay Debit',
    exceptionCategory: 'FEE_MISMATCH',
    exceptionStatus: 'DISPUTED_WITH_PG',
    exceptionAgeDays: 3,
    assignedOwner: 'Navya J. (Lead Finance Ops)',
    disputeNotes: 'Raised dispute ticket #RZP-DISP-88192 for RuPay interchange overbilling. Awaiting credit note.',
    isRecoverable: true,
    recoverableAmount: 272.88,
    evidenceAttached: true,
  },

  // 3. GST ON MDR ERROR (PayU charged 22% GST or double GST calculation)
  {
    id: 'TXN-1003',
    orderId: 'ORD-89460',
    paymentId: 'payu_99201948',
    merchantId: 'BOM-THR-01',
    customerName: 'Sneha Kapadia',
    customerEmail: 'sneha.k@outlook.com',
    orderAmount: 34000.00,
    currency: 'INR',
    orderDate: '2026-09-05 11:10',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Mastercard',
    gateway: 'PayU',
    settlementId: 'PAYU_SET_44102',
    settlementDate: '2026-09-06 14:00',
    actualGrossAmount: 34000.00,
    actualMdrFee: 612.00, // 1.80% (Contracted)
    actualGstFee: 220.32, // Billed at ~36% GST (Double GST glitch)
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 33167.68,
    expectedMdrFee: 612.00,
    expectedGstFee: 110.16, // 18% of 612
    expectedNetSettlement: 33277.84,
    feeVariance: 110.16,
    utrNumber: 'UTRIB52026090677102',
    bankCreditDate: '2026-09-06 16:45',
    bankCreditAmount: 33167.68,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 89,
    matchReason: 'GST computed as ₹220.32 instead of 18% standard ₹110.16 on MDR of ₹612.00',
    exceptionCategory: 'GST_ON_MDR_ERROR',
    exceptionStatus: 'OPEN',
    exceptionAgeDays: 5,
    assignedOwner: 'Priya M. (Payments Analyst)',
    disputeNotes: 'Detected double GST posting on PayU settlement MIS. Need to reconcile GSTR-2B credit note.',
    isRecoverable: true,
    recoverableAmount: 110.16,
    evidenceAttached: false,
  },

  // 4. REFUND LAG (Refund deducted from merchant settlement, but original payment never credited)
  {
    id: 'TXN-1004',
    orderId: 'ORD-89478',
    paymentId: 'pay_Ref9910401',
    merchantId: 'BOM-THR-01',
    customerName: 'Karan Mehra',
    customerEmail: 'karan.m@gmail.com',
    orderAmount: 8999.00,
    currency: 'INR',
    orderDate: '2026-09-03 16:15',
    paymentMethod: 'UPI',
    cardNetwork: 'UPI',
    gateway: 'Razorpay',
    settlementId: 'setl_ref_lag_81',
    settlementDate: '2026-09-04 10:00',
    actualGrossAmount: 8999.00,
    actualMdrFee: 0.00,
    actualGstFee: 0.00,
    refundDeduction: 8999.00, // Deducted in batch
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: -8999.00,
    expectedMdrFee: 0.00,
    expectedGstFee: 0.00,
    expectedNetSettlement: 0.00,
    feeVariance: 0.00,
    utrNumber: 'HDFCR52026090400192',
    bankCreditDate: '2026-09-04 14:00',
    bankCreditAmount: 0.00,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: false,
    matchStatus: 'EXCEPTION',
    confidenceScore: 84,
    matchReason: 'Customer cancellation processed; settlement was debited ₹8,999 without original capture credit',
    exceptionCategory: 'REFUND_LAG',
    exceptionStatus: 'UNDER_INVESTIGATION',
    exceptionAgeDays: 7,
    assignedOwner: 'Rajesh K. (Financial Controller)',
    disputeNotes: 'Investigating whether initial capture of ₹8,999 dropped in transit between Shopify & PG.',
    isRecoverable: true,
    recoverableAmount: 8999.00,
    evidenceAttached: true,
  },

  // 5. T+N SETTLEMENT SLIPPAGE (Due on T+2, currently T+8 and money has not landed)
  {
    id: 'TXN-1005',
    orderId: 'ORD-89512',
    paymentId: 'payu_slip_7718',
    merchantId: 'BOM-THR-01',
    customerName: 'Deepak Singhal',
    customerEmail: 'deepak.s@singhaltech.in',
    orderAmount: 56400.00,
    currency: 'INR',
    orderDate: '2026-09-02 10:30',
    paymentMethod: 'Netbanking',
    gateway: 'PayU',
    settlementId: 'PAYU_PENDING_09',
    settlementDate: '2026-09-04 18:00',
    actualGrossAmount: 56400.00,
    actualMdrFee: 10.00,
    actualGstFee: 1.80,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 56388.20,
    expectedMdrFee: 10.00,
    expectedGstFee: 1.80,
    expectedNetSettlement: 56388.20,
    feeVariance: 0.00,
    utrNumber: '', // No UTR provided by bank/PG
    bankCreditDate: '',
    bankCreditAmount: 0,
    bankAccountRef: '',
    bankMatched: false,
    matchStatus: 'EXCEPTION',
    confidenceScore: 78,
    matchReason: 'Settlement marked complete by PayU on 2026-09-04, but no bank credit or UTR received after 6 days',
    exceptionCategory: 'T_PLUS_N_SLIPPAGE',
    exceptionStatus: 'DISPUTED_WITH_PG',
    exceptionAgeDays: 8,
    assignedOwner: 'Navya J. (Lead Finance Ops)',
    disputeNotes: 'Escalated to PayU Key Account Manager (Ticket #PAYU-ESC-99120). PG claims bank nodal failure.',
    isRecoverable: true,
    recoverableAmount: 56388.20,
    evidenceAttached: true,
  },

  // 6. MISSING UTR (Settlement file says settled, but UTR string is NULL)
  {
    id: 'TXN-1006',
    orderId: 'ORD-89530',
    paymentId: 'cf_utr_blank_01',
    merchantId: 'BOM-THR-01',
    customerName: 'Pooja Varma',
    customerEmail: 'pooja.v@varma.org',
    orderAmount: 18200.00,
    currency: 'INR',
    orderDate: '2026-09-06 15:20',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Visa',
    gateway: 'Cashfree',
    settlementId: 'CF_SETL_88301',
    settlementDate: '2026-09-07 10:00',
    actualGrossAmount: 18200.00,
    actualMdrFee: 336.70,
    actualGstFee: 60.61,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 17802.69,
    expectedMdrFee: 336.70,
    expectedGstFee: 60.61,
    expectedNetSettlement: 17802.69,
    feeVariance: 0.00,
    utrNumber: '',
    bankCreditDate: '',
    bankCreditAmount: 0,
    bankAccountRef: '',
    bankMatched: false,
    matchStatus: 'EXCEPTION',
    confidenceScore: 65,
    matchReason: 'Cashfree settlement has empty UTR narration; unable to reconcile with HDFC statement',
    exceptionCategory: 'MISSING_UTR',
    exceptionStatus: 'OPEN',
    exceptionAgeDays: 4,
    assignedOwner: 'Priya M. (Payments Analyst)',
    disputeNotes: 'Requested Cashfree tech ops to regenerate settlement batch with CBS UTR reference.',
    isRecoverable: true,
    recoverableAmount: 17802.69,
    evidenceAttached: false,
  },

  // 7. RESERVE HOLD (Unilateral 5% rolling reserve withheld without contract amendment)
  {
    id: 'TXN-1007',
    orderId: 'ORD-89599',
    paymentId: 'pay_res_hold_99',
    merchantId: 'BOM-THR-01',
    customerName: 'Aditya Birla Group (Employee Store)',
    customerEmail: 'procurement@abg-corp.com',
    orderAmount: 145000.00,
    currency: 'INR',
    orderDate: '2026-09-04 12:00',
    paymentMethod: 'Corporate Card',
    cardNetwork: 'Amex',
    gateway: 'Razorpay',
    settlementId: 'setl_res_corp_01',
    settlementDate: '2026-09-05 11:30',
    actualGrossAmount: 145000.00,
    actualMdrFee: 3480.00, // 2.40%
    actualGstFee: 626.40,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 7250.00, // Unilateral 5% reserve hold!
    actualNetSettled: 133643.60,
    expectedMdrFee: 3480.00,
    expectedGstFee: 626.40,
    expectedNetSettlement: 140893.60,
    feeVariance: 0.00,
    utrNumber: 'HDFCR520260905910283',
    bankCreditDate: '2026-09-05 15:40',
    bankCreditAmount: 133643.60,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 90,
    matchReason: '₹7,250 withheld as Rolling Reserve. Merchant contract has 0% reserve clause.',
    exceptionCategory: 'RESERVE_HOLD',
    exceptionStatus: 'DISPUTED_WITH_PG',
    exceptionAgeDays: 6,
    assignedOwner: 'Rajesh K. (Financial Controller)',
    disputeNotes: 'Sent legal notice of contract terms citing Schedule B (0% reserve for >₹25 Cr GMV merchants).',
    isRecoverable: true,
    recoverableAmount: 7250.00,
    evidenceAttached: true,
  },

  // 8. CHARGEBACK DEDUCTION (Chargeback deducted along with excess penalty fee)
  {
    id: 'TXN-1008',
    orderId: 'ORD-89615',
    paymentId: 'payu_cb_5510',
    merchantId: 'BOM-THR-01',
    customerName: 'Farhan Akhtar',
    customerEmail: 'farhan.a@gmail.com',
    orderAmount: 6500.00,
    currency: 'INR',
    orderDate: '2026-08-28 14:00',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Visa',
    gateway: 'PayU',
    settlementId: 'PAYU_CB_DED_89',
    settlementDate: '2026-09-02 11:00',
    actualGrossAmount: 6500.00,
    actualMdrFee: 117.00,
    actualGstFee: 21.06,
    refundDeduction: 0,
    chargebackDeduction: 7500.00, // Deducted ₹7,500 for a ₹6,500 chargeback (unauthorized ₹1,000 penalty)
    reserveDeduction: 0,
    actualNetSettled: -1138.06,
    expectedMdrFee: 117.00,
    expectedGstFee: 21.06,
    expectedNetSettlement: 0.00,
    feeVariance: 1000.00,
    utrNumber: 'UTRIB52026090288119',
    bankCreditDate: '2026-09-02 15:10',
    bankCreditAmount: 0.00,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 88,
    matchReason: 'Chargeback deduction exceeds order value by ₹1,000 without supporting dispute fee schedule',
    exceptionCategory: 'CHARGEBACK_DEDUCTION',
    exceptionStatus: 'UNDER_INVESTIGATION',
    exceptionAgeDays: 9,
    assignedOwner: 'Priya M. (Payments Analyst)',
    disputeNotes: 'Customer accepted re-delivery. Proof of delivery uploaded to PayU portal. Seeking ₹7,500 reversal.',
    isRecoverable: true,
    recoverableAmount: 1000.00,
    evidenceAttached: true,
  },

  // 9. PART-SETTLEMENT (Settlement paid in unexplained fragments)
  {
    id: 'TXN-1009',
    orderId: 'ORD-89640',
    paymentId: 'cf_part_3391',
    merchantId: 'BOM-THR-01',
    customerName: 'Nandini Roy',
    customerEmail: 'nandini.roy@tcs.com',
    orderAmount: 22000.00,
    currency: 'INR',
    orderDate: '2026-09-05 17:30',
    paymentMethod: 'EMI',
    gateway: 'Cashfree',
    settlementId: 'CF_PART_BATCH_02',
    settlementDate: '2026-09-07 16:00',
    actualGrossAmount: 15000.00, // Only ₹15,000 processed out of ₹22,000!
    actualMdrFee: 330.00, // 2.2% of 15k
    actualGstFee: 59.40,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 14610.60,
    expectedMdrFee: 484.00, // 2.2% of 22k
    expectedGstFee: 87.12,
    expectedNetSettlement: 21428.88,
    feeVariance: 0.00,
    utrNumber: 'HDFCR520260907998124',
    bankCreditDate: '2026-09-07 18:20',
    bankCreditAmount: 14610.60,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 79,
    matchReason: 'Partial settlement: ₹7,000 gross remains unsettled by Cashfree. Bank credit received for ₹14,610.60',
    exceptionCategory: 'PART_SETTLEMENT',
    exceptionStatus: 'OPEN',
    exceptionAgeDays: 3,
    assignedOwner: 'Navya J. (Lead Finance Ops)',
    disputeNotes: 'Bank EMI loan conversion delayed. Balance ₹7,000 pending in lender clearing.',
    isRecoverable: true,
    recoverableAmount: 6818.28,
    evidenceAttached: false,
  },

  // 10. MISSING SETTLEMENT (Captured on Shopify & PG, but completely absent from all settlement files)
  {
    id: 'TXN-1010',
    orderId: 'ORD-89688',
    paymentId: 'pay_ghost_1192',
    merchantId: 'BOM-THR-01',
    customerName: 'Manish Tiwari',
    customerEmail: 'manish.t@yahoo.co.in',
    orderAmount: 16500.00,
    currency: 'INR',
    orderDate: '2026-09-01 09:12',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Mastercard',
    gateway: 'Razorpay',
    settlementId: '',
    settlementDate: '',
    actualGrossAmount: 0,
    actualMdrFee: 0,
    actualGstFee: 0,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 0,
    expectedMdrFee: 305.25,
    expectedGstFee: 54.95,
    expectedNetSettlement: 16139.80,
    feeVariance: 0,
    utrNumber: '',
    bankCreditDate: '',
    bankCreditAmount: 0,
    bankAccountRef: '',
    bankMatched: false,
    matchStatus: 'EXCEPTION',
    confidenceScore: 50,
    matchReason: 'Payment captured on Day 0, but never included in any PG settlement batch for 9 days',
    exceptionCategory: 'MISSING_SETTLEMENT',
    exceptionStatus: 'DISPUTED_WITH_PG',
    exceptionAgeDays: 10,
    assignedOwner: 'Rajesh K. (Financial Controller)',
    disputeNotes: 'Razorpay payment ID pay_ghost_1192 in captured state. System never initiated nodal payout.',
    isRecoverable: true,
    recoverableAmount: 16139.80,
    evidenceAttached: true,
  },

  // 11. Clean Matched PayU UPI Transaction
  {
    id: 'TXN-1011',
    orderId: 'ORD-89710',
    paymentId: 'payu_upi_99214',
    merchantId: 'BOM-THR-01',
    customerName: 'Tanvi Joshi',
    customerEmail: 'tanvi.j@gmail.com',
    orderAmount: 1450.00,
    currency: 'INR',
    orderDate: '2026-09-08 10:20',
    paymentMethod: 'UPI',
    cardNetwork: 'UPI',
    gateway: 'PayU',
    settlementId: 'PAYU_SET_44199',
    settlementDate: '2026-09-09 09:00',
    actualGrossAmount: 1450.00,
    actualMdrFee: 0.00,
    actualGstFee: 0.00,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 1450.00,
    expectedMdrFee: 0.00,
    expectedGstFee: 0.00,
    expectedNetSettlement: 1450.00,
    feeVariance: 0.00,
    utrNumber: 'UTRIB52026090900142',
    bankCreditDate: '2026-09-09 11:15',
    bankCreditAmount: 1450.00,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'MATCHED',
    confidenceScore: 100,
    matchReason: '3-Way exact match via UTR UTRIB52026090900142',
    exceptionAgeDays: 0,
    isRecoverable: false,
    recoverableAmount: 0,
  },

  // 12. Clean Matched Cashfree Netbanking
  {
    id: 'TXN-1012',
    orderId: 'ORD-89725',
    paymentId: 'cf_nb_881920',
    merchantId: 'BOM-THR-01',
    customerName: 'Rohan Deshmukh',
    customerEmail: 'rohan.d@yahoo.com',
    orderAmount: 7800.00,
    currency: 'INR',
    orderDate: '2026-09-07 19:40',
    paymentMethod: 'Netbanking',
    gateway: 'Cashfree',
    settlementId: 'CF_SET_77192',
    settlementDate: '2026-09-08 12:00',
    actualGrossAmount: 7800.00,
    actualMdrFee: 11.00,
    actualGstFee: 1.98,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 7787.02,
    expectedMdrFee: 11.00,
    expectedGstFee: 1.98,
    expectedNetSettlement: 7787.02,
    feeVariance: 0.00,
    utrNumber: 'HDFCR520260908771120',
    bankCreditDate: '2026-09-08 14:10',
    bankCreditAmount: 7787.02,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'MATCHED',
    confidenceScore: 100,
    matchReason: '3-Way exact match on Netbanking flat ₹11 fee + 18% GST',
    exceptionAgeDays: 0,
    isRecoverable: false,
    recoverableAmount: 0,
  },

  // 13. FEE MISMATCH (International CC billed at 3.5% instead of contracted 2.80%)
  {
    id: 'TXN-1013',
    orderId: 'ORD-89750',
    paymentId: 'pay_intl_9931',
    merchantId: 'BOM-THR-01',
    customerName: 'James Wilson (London)',
    customerEmail: 'j.wilson@uktrade.co.uk',
    orderAmount: 42000.00,
    currency: 'INR',
    orderDate: '2026-09-05 22:15',
    paymentMethod: 'Credit Card (International)',
    cardNetwork: 'Visa',
    gateway: 'Razorpay',
    settlementId: 'setl_intl_8820',
    settlementDate: '2026-09-07 10:00',
    actualGrossAmount: 42000.00,
    actualMdrFee: 1470.00, // 3.50% billed!
    actualGstFee: 264.60,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 40265.40,
    expectedMdrFee: 1176.00, // 2.80% contracted
    expectedGstFee: 211.68,
    expectedNetSettlement: 40612.32,
    feeVariance: 346.92, // ₹294 MDR + ₹52.92 GST
    utrNumber: 'HDFCR520260907119024',
    bankCreditDate: '2026-09-07 13:00',
    bankCreditAmount: 40265.40,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 94,
    matchReason: 'Razorpay billed 3.50% on UK Visa CC; Merchant tier contract has 2.80% flat cap',
    exceptionCategory: 'FEE_MISMATCH',
    exceptionStatus: 'OPEN',
    exceptionAgeDays: 3,
    assignedOwner: 'Navya J. (Lead Finance Ops)',
    disputeNotes: 'International card markup of 70 bps applied in error. Rate card Schedule C applies.',
    isRecoverable: true,
    recoverableAmount: 346.92,
    evidenceAttached: true,
  },

  // 14. DUPLICATE CREDIT (Bank received settlement twice due to PG reversal loop)
  {
    id: 'TXN-1014',
    orderId: 'ORD-89780',
    paymentId: 'payu_dup_9912',
    merchantId: 'BOM-THR-01',
    customerName: 'Sanjay Dutt',
    customerEmail: 'sanjay.d@duttenterprises.in',
    orderAmount: 9500.00,
    currency: 'INR',
    orderDate: '2026-09-06 14:10',
    paymentMethod: 'Credit Card (Domestic)',
    cardNetwork: 'Visa',
    gateway: 'PayU',
    settlementId: 'PAYU_DUP_SET_01',
    settlementDate: '2026-09-07 11:00',
    actualGrossAmount: 9500.00,
    actualMdrFee: 171.00,
    actualGstFee: 30.78,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 9298.22,
    expectedMdrFee: 171.00,
    expectedGstFee: 30.78,
    expectedNetSettlement: 9298.22,
    feeVariance: 0.00,
    utrNumber: 'UTRIB52026090799812_DUP',
    bankCreditDate: '2026-09-07 15:30',
    bankCreditAmount: 18596.44, // Bank received ₹9,298.22 x 2!
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 72,
    matchReason: 'Duplicate bank credit detected: Account credited ₹18,596.44 vs expected settlement of ₹9,298.22',
    exceptionCategory: 'DUPLICATE_CREDIT',
    exceptionStatus: 'TIMING_DIFFERENCE',
    exceptionAgeDays: 4,
    assignedOwner: 'Rajesh K. (Financial Controller)',
    disputeNotes: 'Confirmed with HDFC bank RM. PayU system initiated double UTR. Clawback expected tomorrow.',
    isRecoverable: false,
    recoverableAmount: 0,
    evidenceAttached: true,
  },

  // 15. AMOUNT MISMATCH (Order value ₹3,499 vs captured ₹3,199 due to discount sync break)
  {
    id: 'TXN-1015',
    orderId: 'ORD-89805',
    paymentId: 'cf_amt_mismatch_01',
    merchantId: 'BOM-THR-01',
    customerName: 'Aishwarya Sen',
    customerEmail: 'aishwarya.sen@gmail.com',
    orderAmount: 3499.00,
    currency: 'INR',
    orderDate: '2026-09-07 20:10',
    paymentMethod: 'UPI',
    cardNetwork: 'UPI',
    gateway: 'Cashfree',
    settlementId: 'CF_MIS_88190',
    settlementDate: '2026-09-08 10:00',
    actualGrossAmount: 3199.00, // Captured ₹3,199 instead of ₹3,499
    actualMdrFee: 0.00,
    actualGstFee: 0.00,
    refundDeduction: 0,
    chargebackDeduction: 0,
    reserveDeduction: 0,
    actualNetSettled: 3199.00,
    expectedMdrFee: 0.00,
    expectedGstFee: 0.00,
    expectedNetSettlement: 3499.00,
    feeVariance: 0.00,
    utrNumber: 'HDFCR520260908001924',
    bankCreditDate: '2026-09-08 12:40',
    bankCreditAmount: 3199.00,
    bankAccountRef: 'HDFC-**9921',
    bankMatched: true,
    matchStatus: 'EXCEPTION',
    confidenceScore: 81,
    matchReason: 'Shopify order total ₹3,499 does not match payment capture of ₹3,199 (₹300 coupon code desync)',
    exceptionCategory: 'AMOUNT_MISMATCH',
    exceptionStatus: 'RESOLVED',
    exceptionAgeDays: 2,
    assignedOwner: 'Priya M. (Payments Analyst)',
    disputeNotes: 'Coupon code FESTIVE300 was applied after Shopify webhook fired. Internal order updated.',
    isRecoverable: false,
    recoverableAmount: 0,
    evidenceAttached: true,
  },
];

```

---

## File: `src/components/Navbar.tsx`

```typescript
import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Building2, 
  HelpCircle,
  Calculator,
  ChevronDown,
  Bot,
  Download
} from 'lucide-react';
import { ReconciliationMetrics } from '../types/recon';
import { formatCompactINR } from '../utils/reconciliationEngine';

export type NavTab = 
  | 'dashboard' 
  | 'three-way' 
  | 'rate-card' 
  | 'exceptions' 
  | 'ingestion' 
  | 'audit-report' 
  | 'accounting'
  | 'pricing'
  | 'claude-export';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  metrics: ReconciliationMetrics;
  onRunRecon: () => void;
  isReconciling: boolean;
  onOpenTour: () => void;
  selectedMerchant: string;
  setSelectedMerchant: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  onRunRecon,
  isReconciling,
  onOpenTour,
  selectedMerchant,
  setSelectedMerchant,
}) => {
  const merchants = [
    'Bombay Threads & Lifestyle Co. (₹48 Cr GMV)',
    'UrbanCraft Modern Furniture (₹120 Cr GMV)',
    'NutriBites Healthy Foods (₹28 Cr GMV)'
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Recon Engine: Active
          </span>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Select Merchant"
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="bg-slate-800/90 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {merchants.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden md:inline">Settlement Cycle: <strong className="text-slate-200">T+1 to T+7 Continuous</strong></span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('claude-export')}
            className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded text-xs transition border ${
              activeTab === 'claude-export'
                ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-900/50'
                : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border-purple-500/30'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Share with Claude</span>
            <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded font-mono">Export</span>
          </button>

          <button
            onClick={onOpenTour}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded text-xs transition shadow-sm shadow-emerald-900/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Product Tour</span>
            <span className="bg-emerald-900/60 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-mono">Demo</span>
          </button>

          <button
            onClick={onRunRecon}
            disabled={isReconciling}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded text-xs transition ${
              isReconciling 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>{isReconciling ? 'Matching Transactions...' : 'Run Reconciliation'}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
            RO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">ReconOS</span>
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                MVP v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Order → PG Settlement → Bank Credit (3-Way Continuous)</p>
          </div>
        </div>

        {/* Live metric mini-chips */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reconciled GMV</span>
            <span className="font-mono font-bold text-emerald-400">{formatCompactINR(metrics.matchedGmv)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">({metrics.matchRatePct}%)</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Identified Leakage</span>
            <span className="font-mono font-bold text-amber-400">{formatCompactINR(metrics.totalRecoverableLeakage)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5 font-medium">({metrics.exceptionCount} breaks)</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rate-Card Variance</span>
            <span className="font-mono font-bold text-rose-400">{formatCompactINR(metrics.suspectedMdrOvercharge + metrics.gstVarianceTotal)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Overcharged</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto text-xs font-medium border-t border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'dashboard'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('three-way')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'three-way'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          3-Way Transaction Match
        </button>

        <button
          onClick={() => setActiveTab('rate-card')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'rate-card'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Rate-Card Engine
          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0.2 rounded font-mono">The Sharp Edge</span>
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'exceptions'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span>🚨 Exceptions & Disputes</span>
          <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 rounded-full font-mono">
            {metrics.exceptionCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ingestion')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'ingestion'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Data Ingestion & Schemas
        </button>

        <button
          onClick={() => setActiveTab('audit-report')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'audit-report'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          MDR Audit & Recovery Report
          <span className="bg-teal-500/20 text-teal-300 text-[9px] px-1 py-0.2 rounded font-mono">GTM Lead</span>
        </button>

        <button
          onClick={() => setActiveTab('accounting')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'accounting'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Tally / Zoho Accounting
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'pricing'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Business Model & ROI
        </button>

        <button
          onClick={() => setActiveTab('claude-export')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'claude-export'
              ? 'border-purple-500 text-purple-300 bg-purple-950/30'
              : 'border-transparent text-purple-400/80 hover:text-purple-200 hover:border-purple-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          <span>Export for Claude</span>
          <span className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
            Docs & Code
          </span>
        </button>
      </div>
    </header>
  );
};

```

---

## File: `src/components/DashboardView.tsx`

```typescript
import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  ArrowRight,
  Layers, 
  Coins, 
  Zap, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { CanonicalTransaction, ReconciliationMetrics } from '../types/recon';
import { formatINR, formatCompactINR } from '../utils/reconciliationEngine';
import { NavTab } from './Navbar';

interface DashboardViewProps {
  metrics: ReconciliationMetrics;
  transactions: CanonicalTransaction[];
  onNavigateToTab: (tab: NavTab) => void;
  onSelectTransaction: (txn: CanonicalTransaction) => void;
  onRunRecon: () => void;
  isReconciling: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  transactions,
  onNavigateToTab,
  onSelectTransaction,
  onRunRecon,
  isReconciling,
}) => {
  // Urgent items needing action today (> 5 days age or high recoverable amount)
  const actionItems = transactions
    .filter(t => t.matchStatus === 'EXCEPTION' && t.exceptionStatus !== 'RESOLVED')
    .sort((a, b) => b.exceptionAgeDays - a.exceptionAgeDays || b.recoverableAmount - a.recoverableAmount)
    .slice(0, 5);

  // Category breakdown chart data
  const categoryData = (Object.entries(metrics.breaksByCategory) as [string, { count: number; value: number }][])
    .filter(([_, data]) => data.count > 0)
    .map(([cat, data]) => ({
      name: cat.replace(/_/g, ' '),
      shortName: cat.replace(/_/g, ' ').slice(0, 14),
      count: data.count,
      value: data.value,
      categoryKey: cat,
    }))
    .sort((a, b) => b.value - a.value);

  // Gateway comparison chart data
  const gatewayData = (Object.entries(metrics.breaksByGateway) as [string, { count: number; variance: number; volume: number }][]).map(([gw, data]) => ({
    name: gw,
    volume: data.volume,
    variance: data.variance,
    breaksCount: data.count,
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 5 Core Questions Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Continuous 3-Way Reconciled State
              </span>
              <span className="text-xs text-slate-400">Merchant Batch #BOM-2026-09</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Payments Reconciliation Executive Control
            </h1>
            <p className="text-xs text-slate-400">
              Live transaction-level audit: Order → Payment Aggregator Settlement → Bank CBS Credit
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateToTab('audit-report')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Audit Report</span>
            </button>
            <button
              onClick={onRunRecon}
              disabled={isReconciling}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow flex items-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isReconciling ? 'Matching...' : 'Re-Run Match Engine'}</span>
            </button>
          </div>
        </div>

        {/* 5 Core Questions Grid from PRD Section 7.2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">1. Reconciled GMV</span>
            <span className="text-lg font-bold font-mono text-emerald-400 block">{formatCompactINR(metrics.matchedGmv)}</span>
            <span className="text-[11px] text-slate-400">{metrics.matchRatePct}% matched clean</span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">2. Unresolved Value</span>
            <span className="text-lg font-bold font-mono text-amber-400 block">{formatCompactINR(metrics.unmatchedValue)}</span>
            <span className="text-[11px] text-slate-400">{metrics.exceptionCount} records breaking</span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">3. Money at Risk (Leakage)</span>
            <span className="text-lg font-bold font-mono text-rose-400 block">{formatINR(metrics.totalRecoverableLeakage)}</span>
            <span className="text-[11px] text-rose-300 font-medium">Recoverable from PGs</span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">4. Top Break Reason</span>
            <span className="text-sm font-bold text-slate-200 block truncate">Fee & GST Mismatch</span>
            <span className="text-[11px] text-slate-400">RuPay & Intl rate cards</span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-750">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">5. Action Needed Today</span>
            <span className="text-lg font-bold font-mono text-indigo-400 block">{actionItems.length} Urgent</span>
            <span className="text-[11px] text-slate-400">Age &gt; 3 days waiting</span>
          </div>
        </div>
      </div>

      {/* Closed Loop Visualizer from PRD Section 3.4 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
            The Closed Loop Reconciliation Architecture
          </span>
          <span className="text-slate-500 font-mono">Day 0 → Day T+1/T+7</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block uppercase">1. Order Capture</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Shopify / Woo</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Day 0 Basket</span>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block uppercase">2. Deductions</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">MDR + 18% GST</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Refunds/Reserves</span>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50">
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block uppercase">3. Bank Credit</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">HDFC CBS UTR</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Net Cash Inflow</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">4. ReconOS Match</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Txn-Level Match</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">96.4% Auto</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block uppercase">5. Break Taxonomy</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">11 Categories</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">Owner + Ageing</span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block uppercase">6. Accounting</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Tally / Zoho Push</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">Audit-Ready Books</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Break Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Break Taxonomy & Gateway Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Break Categories Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Break Taxonomy & Recoverable Value
                </h3>
                <p className="text-xs text-slate-500">Distribution of exceptions across the fixed 11-category model</p>
              </div>
              <button
                onClick={() => onNavigateToTab('exceptions')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                View Exception Queue <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
                  <XAxis type="number" tickFormatter={(v) => formatCompactINR(v)} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="shortName" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip 
                    formatter={(value: any) => [formatINR(Number(value)), 'Value at Risk']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 text-[10px] block">MDR Overcharges</span>
                <span className="font-bold font-mono text-rose-500">{formatINR(metrics.suspectedMdrOvercharge)}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 text-[10px] block">GST Glitches</span>
                <span className="font-bold font-mono text-amber-500">{formatINR(metrics.gstVarianceTotal)}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 text-[10px] block">Refund / Lag Breaks</span>
                <span className="font-bold font-mono text-indigo-500">{formatINR(metrics.refundChargebackLagTotal)}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                <span className="text-slate-500 text-[10px] block">Average Ageing</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{metrics.avgExceptionAgeDays} Days</span>
              </div>
            </div>
          </div>

          {/* Payment Gateway Split Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Payment Aggregator Comparison & MDR Audit
                </h3>
                <p className="text-xs text-slate-500">Evaluating Razorpay, PayU, and Cashfree against contracted rate cards</p>
              </div>
              <button
                onClick={() => onNavigateToTab('rate-card')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Re-price Rate Cards <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Gateway</th>
                    <th className="py-2.5 px-3">Processed GMV</th>
                    <th className="py-2.5 px-3">Active Breaks</th>
                    <th className="py-2.5 px-3">Fee Variance Overcharge</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {gatewayData.map((gw) => (
                    <tr key={gw.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {gw.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {formatINR(gw.volume)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-mono">
                          {gw.breaksCount} breaks
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-500">
                        {gw.variance > 0 ? `+${formatINR(gw.variance)}` : '₹0.00 (Zero break)'}
                      </td>
                      <td className="py-3 px-3">
                        {gw.variance > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">
                            Recovery Claim Active
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                            Rate Card Clean
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: High Priority Action List & Fast Resolution */}
        <div className="space-y-6">
          {/* Action Today Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Action Needed Today
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-semibold">
                High Risk
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Breaks with aging &gt; 3 days or recovery value &gt; ₹5,000 requiring finance controller signoff.
            </p>

            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectTransaction(item)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.orderId}
                    </span>
                    <span className="font-mono text-rose-500 font-bold">
                      {formatINR(item.recoverableAmount || item.orderAmount)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mb-1.5 line-clamp-1">
                    {item.matchReason}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.gateway} · {item.exceptionCategory?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-amber-500 font-medium">
                      Age: {item.exceptionAgeDays}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateToTab('exceptions')}
              className="w-full mt-4 py-2 text-xs font-semibold text-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition"
            >
              Open Full Exception Workspace ({metrics.exceptionCount})
            </button>
          </div>

          {/* Quick Regulatory & Security Compliance Callout from Deck Page 12 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Compliant by Design (RBI PA/PG Framework)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ReconOS stays strictly outside RBI&apos;s PA/PG perimeter: 
              <strong className="text-slate-200"> read-only data</strong>, zero nodal accounts, zero payout initiation. 
              Eliminates the DPDP liability of raw financial spreadsheets stored on analyst laptops.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/ThreeWayMatchView.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Download
} from 'lucide-react';
import { CanonicalTransaction, GatewayName, MatchStatus, ExceptionCategory } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';

interface ThreeWayMatchViewProps {
  transactions: CanonicalTransaction[];
  onSelectTransaction: (txn: CanonicalTransaction) => void;
  onRunRecon: () => void;
  isReconciling: boolean;
}

export const ThreeWayMatchView: React.FC<ThreeWayMatchViewProps> = ({
  transactions,
  onSelectTransaction,
  onRunRecon,
  isReconciling,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.utrNumber && t.utrNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGateway = selectedGateway === 'ALL' || t.gateway === selectedGateway;
      const matchesStatus = selectedStatus === 'ALL' || t.matchStatus === selectedStatus;
      const matchesCategory = selectedCategory === 'ALL' || t.exceptionCategory === selectedCategory;

      return matchesSearch && matchesGateway && matchesStatus && matchesCategory;
    });
  }, [transactions, searchTerm, selectedGateway, selectedStatus, selectedCategory]);

  const matchedCount = transactions.filter(t => t.matchStatus === 'MATCHED').length;
  const exceptionCount = transactions.filter(t => t.matchStatus === 'EXCEPTION').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with Explanation of 3-Way Hierarchy */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Continuous 3-Way Transaction Ledger
              </span>
              <span className="text-xs text-slate-500">
                Rule: Zero Unsafe Matches · 100% Traceability
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Transaction-Level Reconciliation Workspace
            </h2>
            <p className="text-xs text-slate-500">
              Matching Order Day 0 → Payment Aggregator Day T+1 → Bank Credit Day T+1/T+7 at individual transaction grain
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block">Matched / Exceptions</span>
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="text-emerald-500">{matchedCount} Matched</span> · <span className="text-amber-500">{exceptionCount} Breaks</span>
              </span>
            </div>
            <button
              onClick={onRunRecon}
              disabled={isReconciling}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
            >
              {isReconciling ? 'Matching...' : 'Re-Run Match Engine'}
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, Payment ID, UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            aria-label="Filter by Gateway"
            value={selectedGateway}
            onChange={(e) => setSelectedGateway(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Gateways (Razorpay, PayU, Cashfree)</option>
            <option value="Razorpay">Razorpay</option>
            <option value="PayU">PayU</option>
            <option value="Cashfree">Cashfree</option>
          </select>

          <select
            aria-label="Filter by Match Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="MATCHED">Matched Clean (100% Match)</option>
            <option value="EXCEPTION">Exceptions / Breaks</option>
          </select>

          <select
            aria-label="Filter by Exception Taxonomy"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Exception Categories</option>
            <option value="FEE_MISMATCH">Fee Mismatch (MDR Overcharge)</option>
            <option value="GST_ON_MDR_ERROR">GST on MDR Error</option>
            <option value="REFUND_LAG">Refund Lag</option>
            <option value="CHARGEBACK_DEDUCTION">Chargeback Deduction</option>
            <option value="PART_SETTLEMENT">Part-Settlement</option>
            <option value="T_PLUS_N_SLIPPAGE">T+n Settlement Slippage</option>
            <option value="MISSING_UTR">Missing UTR</option>
            <option value="DUPLICATE_CREDIT">Duplicate Credit</option>
            <option value="RESERVE_HOLD">Reserve Hold</option>
            <option value="MISSING_SETTLEMENT">Missing Settlement</option>
            <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
          </select>
        </div>
      </div>

      {/* Main 3-Way Comparative Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Multi-tier column groupings */}
              <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                <th colSpan={3} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
                  1. Order System (Shopify / Woo)
                </th>
                <th colSpan={4} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                  2. Payment Aggregator Settlement
                </th>
                <th colSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400">
                  3. Bank CBS Credit
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">
                  Reconciliation Outcome
                </th>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3">Order ID / Date</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">Order Gross</th>
                
                <th className="py-2 px-3">PG / Payment ID</th>
                <th className="py-2 px-3">Method</th>
                <th className="py-2 px-3">MDR + GST</th>
                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">Net Settled</th>

                <th className="py-2 px-3">Bank UTR / Account</th>
                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">Bank Credited</th>

                <th className="py-2 px-3">Match Status</th>
                <th className="py-2 px-3 text-right">Drill-down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.map((txn) => {
                const isMatched = txn.matchStatus === 'MATCHED';
                const hasVariance = txn.feeVariance > 0;

                return (
                  <tr 
                    key={txn.id}
                    onClick={() => onSelectTransaction(txn)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                      !isMatched ? 'bg-amber-500/[0.02]' : ''
                    }`}
                  >
                    {/* 1. Order System */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">
                        {txn.orderId}
                      </span>
                      <span className="text-[10px] text-slate-400">{txn.orderDate}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-800 dark:text-slate-200 font-medium block truncate max-w-[110px]">
                        {txn.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400">{txn.currency}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                      {formatINR(txn.orderAmount)}
                    </td>

                    {/* 2. PG Settlement */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 block font-mono">
                        {txn.gateway}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block max-w-[110px]">
                        {txn.paymentId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                      <span>{txn.paymentMethod}</span>
                      {txn.cardNetwork && (
                        <span className="block text-[10px] text-slate-400">
                          {txn.cardNetwork}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="text-slate-700 dark:text-slate-300 block">
                        {formatINR(txn.actualMdrFee + txn.actualGstFee)}
                      </span>
                      {hasVariance && (
                        <span className="text-[10px] text-rose-500 font-bold block">
                          +{formatINR(txn.feeVariance)} Over
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                      {formatINR(txn.actualNetSettled)}
                    </td>

                    {/* 3. Bank Credit */}
                    <td className="py-3 px-3">
                      {txn.utrNumber ? (
                        <>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block truncate max-w-[130px]">
                            {txn.utrNumber}
                          </span>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400">
                            {txn.bankAccountRef || 'HDFC-**9921'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-500 font-mono italic">
                          UTR Missing / Uncredited
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold border-r border-slate-200 dark:border-slate-800">
                      {txn.bankCreditAmount && txn.bankCreditAmount > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatINR(txn.bankCreditAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>

                    {/* Reconciliation Outcome */}
                    <td className="py-3 px-3">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" />
                          Matched
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500">
                            <AlertCircle className="w-3 h-3" />
                            {txn.exceptionCategory ? txn.exceptionCategory.replace(/_/g, ' ') : 'Break'}
                          </span>
                          {txn.recoverableAmount > 0 && (
                            <span className="block text-[10px] text-amber-500 font-mono mt-0.5">
                              Risk: {formatINR(txn.recoverableAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button 
                        aria-label={`Inspect transaction ${txn.orderId}`}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
          <span className="font-mono text-[11px]">Matching engine threshold: Exact ID + deterministic fee audit</span>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/RateCardEngineView.tsx`

```typescript
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Edit3, 
  Check, 
  FileSpreadsheet, 
  Download, 
  Sparkles, 
  Coins, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { RateCardRule, CanonicalTransaction, GatewayName } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';

interface RateCardEngineViewProps {
  rateCards: RateCardRule[];
  onUpdateRateCards: (updated: RateCardRule[]) => void;
  transactions: CanonicalTransaction[];
  onSelectTransaction: (txn: CanonicalTransaction) => void;
  onOpenDispute: (txn: CanonicalTransaction) => void;
}

export const RateCardEngineView: React.FC<RateCardEngineViewProps> = ({
  rateCards,
  onUpdateRateCards,
  transactions,
  onSelectTransaction,
  onOpenDispute,
}) => {
  const [selectedGateway, setSelectedGateway] = useState<GatewayName>('Razorpay');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [tempMdrPct, setTempMdrPct] = useState<number>(0);
  const [tempFlatFee, setTempFlatFee] = useState<number>(0);

  // Transactions with fee variance (MDR overcharge or GST glitch)
  const overchargedTransactions = transactions.filter(t => t.feeVariance > 0);
  const totalVariance = overchargedTransactions.reduce((acc, t) => acc + t.feeVariance, 0);

  const handleStartEdit = (rule: RateCardRule) => {
    setEditingRuleId(rule.id);
    setTempMdrPct(rule.contractedMdrPct);
    setTempFlatFee(rule.contractedFlatFee);
  };

  const handleSaveEdit = (ruleId: string) => {
    const updated = rateCards.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          contractedMdrPct: Number(tempMdrPct),
          contractedFlatFee: Number(tempFlatFee),
        };
      }
      return r;
    });
    onUpdateRateCards(updated);
    setEditingRuleId(null);
  };

  const currentRules = rateCards.filter(r => r.gateway === selectedGateway);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner - The Sharp Edge */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Core Differentiator · Pitch Deck Slide 06
              </span>
              <span className="text-xs text-slate-400">
                Independent Third-Party Verification
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>The Sharp Edge: Rate-Card Re-Pricing Engine</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Mid-market merchants accept the payment aggregator&apos;s invoice on trust. ReconOS re-prices every single transaction 
              against your commercial contract to uncover stealth overcharges and wrongful deductions.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl text-right">
            <span className="text-xs text-slate-400 block">Total Detected Overcharge</span>
            <span className="text-2xl font-extrabold font-mono text-rose-400 block">
              {formatINR(totalVariance)}
            </span>
            <span className="text-[11px] text-slate-400">Across {overchargedTransactions.length} audited transactions</span>
          </div>
        </div>
      </div>

      {/* Contracted Rate Card Configuration Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Contracted Commercial Terms & Rate Card Rules
            </h3>
            <p className="text-xs text-slate-500">
              Your agreed contract with payment aggregators. Click &quot;Edit&quot; to adjust percentages and watch live re-pricing recalculate.
            </p>
          </div>

          {/* Gateway Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            {(['Razorpay', 'PayU', 'Cashfree'] as GatewayName[]).map((gw) => (
              <button
                key={gw}
                onClick={() => setSelectedGateway(gw)}
                className={`px-3 py-1.5 rounded-md transition ${
                  selectedGateway === gw
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {gw}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Payment Instrument</th>
                <th className="py-2.5 px-3">Contracted MDR %</th>
                <th className="py-2.5 px-3">Flat Fee (₹)</th>
                <th className="py-2.5 px-3">GST Rate</th>
                <th className="py-2.5 px-3">Contract Clause Notes</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
              {currentRules.map((rule) => {
                const isEditing = editingRuleId === rule.id;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {rule.method}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.05"
                          value={tempMdrPct}
                          onChange={(e) => setTempMdrPct(parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded text-xs font-mono"
                        />
                      ) : (
                        <span className={`font-bold ${rule.contractedMdrPct === 0 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {rule.contractedMdrPct.toFixed(2)}%
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="1"
                          value={tempFlatFee}
                          onChange={(e) => setTempFlatFee(parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded text-xs font-mono"
                        />
                      ) : (
                        <span>₹{rule.contractedFlatFee.toFixed(2)}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-500">
                      {rule.gstRatePct}% GST
                    </td>

                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {rule.notes}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveEdit(rule.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 ml-auto shadow"
                        >
                          <Check className="w-3 h-3" /> Save & Re-price
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="px-2 py-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px] flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Transaction-Level Overcharge Audit Results */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Detected MDR & GST Overcharges (Immediate Recovery Opportunities)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Transactions where the payment aggregator billed more than the contracted rate card
            </p>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 bg-rose-500/10 text-rose-500 font-bold rounded-lg">
            {overchargedTransactions.length} Verified Overcharges
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Order ID / PG</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Gross Order</th>
                <th className="py-2.5 px-3">Contracted Fee</th>
                <th className="py-2.5 px-3">Billed Fee</th>
                <th className="py-2.5 px-3">Overcharge Variance</th>
                <th className="py-2.5 px-3">Audit Root Cause</th>
                <th className="py-2.5 px-3 text-right">Dispute Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {overchargedTransactions.map((txn) => (
                <tr 
                  key={txn.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  onClick={() => onSelectTransaction(txn)}
                >
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-slate-900 dark:text-white block">
                      {txn.orderId}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-semibold">{txn.gateway}</span>
                  </td>

                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    <span className="block">{txn.paymentMethod}</span>
                    <span className="text-[10px] text-slate-400">{txn.cardNetwork || 'Standard'}</span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-900 dark:text-white font-semibold">
                    {formatINR(txn.orderAmount)}
                  </td>

                  <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                    {formatINR(txn.expectedMdrFee + txn.expectedGstFee)}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {formatINR(txn.actualMdrFee + txn.actualGstFee)}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-rose-500">
                    +{formatINR(txn.feeVariance)}
                  </td>

                  <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300 max-w-xs">
                    {txn.matchReason}
                  </td>

                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenDispute(txn)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition"
                    >
                      Generate Dispute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/ExceptionWorkspaceView.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  Search, 
  Filter, 
  ChevronRight, 
  ExternalLink,
  Download,
  Send,
  MessageSquare
} from 'lucide-react';
import { CanonicalTransaction, ExceptionCategory, ExceptionStatus } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';
import { TEAM_MEMBERS } from '../data/mockData';

interface ExceptionWorkspaceViewProps {
  transactions: CanonicalTransaction[];
  onUpdateTransaction: (updated: CanonicalTransaction) => void;
  onSelectTransaction: (txn: CanonicalTransaction) => void;
  onOpenDispute: (txn: CanonicalTransaction) => void;
}

export const ExceptionWorkspaceView: React.FC<ExceptionWorkspaceViewProps> = ({
  transactions,
  onUpdateTransaction,
  onSelectTransaction,
  onOpenDispute,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ageingFilter, setAgeingFilter] = useState<string>('ALL');

  // Filter only exceptions
  const exceptions = useMemo(() => {
    return transactions.filter(t => t.matchStatus === 'EXCEPTION');
  }, [transactions]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(t => {
      const matchesCategory = selectedCategory === 'ALL' || t.exceptionCategory === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || t.exceptionStatus === selectedStatus;
      const matchesSearch = 
        t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.assignedOwner && t.assignedOwner.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesAgeing = true;
      if (ageingFilter === '0-3') matchesAgeing = t.exceptionAgeDays <= 3;
      else if (ageingFilter === '4-7') matchesAgeing = t.exceptionAgeDays >= 4 && t.exceptionAgeDays <= 7;
      else if (ageingFilter === '8+') matchesAgeing = t.exceptionAgeDays >= 8;

      return matchesCategory && matchesStatus && matchesSearch && matchesAgeing;
    });
  }, [exceptions, selectedCategory, selectedStatus, searchTerm, ageingFilter]);

  const totalAtRisk = exceptions.reduce((acc, t) => acc + (t.recoverableAmount || t.orderAmount), 0);

  const handleStatusChange = (txn: CanonicalTransaction, newStatus: ExceptionStatus) => {
    const updated: CanonicalTransaction = {
      ...txn,
      exceptionStatus: newStatus,
    };
    onUpdateTransaction(updated);
  };

  const handleOwnerChange = (txn: CanonicalTransaction, newOwner: string) => {
    const updated: CanonicalTransaction = {
      ...txn,
      assignedOwner: newOwner,
    };
    onUpdateTransaction(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                P0 Exception Management & Recovery
              </span>
              <span className="text-xs text-slate-500">Fixed 11-Category Taxonomy</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Exception Investigation & Dispute Queue
            </h2>
            <p className="text-xs text-slate-500">
              Assigned owners, ageing clocks, and documented dispute evidence for every broken transaction
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-right">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block uppercase">Total Money at Risk</span>
              <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                {formatINR(totalAtRisk)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order, Payment, Owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            aria-label="Filter by Taxonomy Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All 11 Taxonomy Categories</option>
            <option value="FEE_MISMATCH">Fee Mismatch (MDR Overcharge)</option>
            <option value="GST_ON_MDR_ERROR">GST on MDR Error</option>
            <option value="REFUND_LAG">Refund Lag</option>
            <option value="CHARGEBACK_DEDUCTION">Chargeback Deduction</option>
            <option value="PART_SETTLEMENT">Part-Settlement</option>
            <option value="T_PLUS_N_SLIPPAGE">T+n Settlement Slippage</option>
            <option value="MISSING_UTR">Missing UTR</option>
            <option value="DUPLICATE_CREDIT">Duplicate Credit</option>
            <option value="RESERVE_HOLD">Reserve Hold</option>
            <option value="MISSING_SETTLEMENT">Missing Settlement</option>
            <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
          </select>

          <select
            aria-label="Filter by Resolution Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Resolution Statuses</option>
            <option value="OPEN">Open (Requires Action)</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="DISPUTED_WITH_PG">Disputed with PG</option>
            <option value="TIMING_DIFFERENCE">Timing Difference (Verified)</option>
            <option value="RESOLVED">Resolved / Recovered</option>
          </select>

          <select
            aria-label="Filter by Ageing Window"
            value={ageingFilter}
            onChange={(e) => setAgeingFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Ageing Windows</option>
            <option value="0-3">Fresh (0–3 Days)</option>
            <option value="4-7">Aging (4–7 Days)</option>
            <option value="8+">Overdue (8+ Days)</option>
          </select>
        </div>
      </div>

      {/* Exception Queue Cards */}
      <div className="space-y-3">
        {filteredExceptions.map((txn) => {
          const statusColors: Record<ExceptionStatus, string> = {
            OPEN: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            UNDER_INVESTIGATION: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            DISPUTED_WITH_PG: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            TIMING_DIFFERENCE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            RESOLVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          };

          return (
            <div
              key={txn.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {txn.orderId}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                        {txn.gateway}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {txn.paymentMethod}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                      {txn.exceptionCategory?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Amount at risk */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Amount at Risk</span>
                    <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                      {formatINR(txn.recoverableAmount || txn.orderAmount)}
                    </span>
                  </div>

                  {/* Ageing clock */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Age: <strong>{txn.exceptionAgeDays}d</strong></span>
                  </div>
                </div>
              </div>

              {/* Reason description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mb-3">
                <strong className="text-slate-800 dark:text-slate-100">Audit Finding: </strong> 
                {txn.matchReason}
              </p>

              {/* Notes & resolution status controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Assigned Owner */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Assigned Owner
                  </label>
                  <select
                    value={txn.assignedOwner || TEAM_MEMBERS[0]}
                    onChange={(e) => handleOwnerChange(txn, e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200"
                  >
                    {TEAM_MEMBERS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Exception Status */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Resolution Status
                  </label>
                  <select
                    value={txn.exceptionStatus || 'OPEN'}
                    onChange={(e) => handleStatusChange(txn, e.target.value as ExceptionStatus)}
                    className={`w-full px-2.5 py-1 rounded text-xs font-semibold border ${statusColors[txn.exceptionStatus || 'OPEN']}`}
                  >
                    <option value="OPEN">Open</option>
                    <option value="UNDER_INVESTIGATION">Under Investigation</option>
                    <option value="DISPUTED_WITH_PG">Disputed with PG</option>
                    <option value="TIMING_DIFFERENCE">Timing Difference (Verified)</option>
                    <option value="RESOLVED">Resolved / Recovered</option>
                  </select>
                </div>

                {/* Action buttons */}
                <div className="flex items-end justify-end gap-2">
                  <button
                    onClick={() => onSelectTransaction(txn)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition"
                  >
                    View 3-Way Details
                  </button>

                  <button
                    onClick={() => onOpenDispute(txn)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shadow-sm transition flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Dispute Packet</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

```

---

## File: `src/components/DataIngestionView.tsx`

```typescript
import React, { useState } from 'react';
import { 
  Upload, 
  Layers, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Server,
  AlertCircle
} from 'lucide-react';
import { SourceIngestionStatus } from '../types/recon';
import { INITIAL_SOURCES } from '../data/mockData';

interface DataIngestionViewProps {
  onSimulateUpload: () => void;
  isSyncing: boolean;
}

export const DataIngestionView: React.FC<DataIngestionViewProps> = ({
  onSimulateUpload,
  isSyncing,
}) => {
  const [sources, setSources] = useState<SourceIngestionStatus[]>(INITIAL_SOURCES);
  const [selectedMapping, setSelectedMapping] = useState<'SHOPIFY' | 'RAZORPAY' | 'HDFC'>('RAZORPAY');

  const mappings = {
    SHOPIFY: [
      { raw: 'Name / ID', canonical: 'orderId', type: 'String', desc: 'Shopify order identifier (e.g. ORD-89421)' },
      { raw: 'Created at', canonical: 'orderDate', type: 'DateTime', desc: 'Timestamp when checkout completed' },
      { raw: 'Total', canonical: 'orderAmount', type: 'Currency (INR)', desc: 'Gross customer payment value' },
      { raw: 'Payment Reference', canonical: 'paymentId', type: 'String', desc: 'Gateway transaction reference' },
      { raw: 'Financial Status', canonical: 'status', type: 'Enum', desc: 'Paid / Authorized / Refunded' },
    ],
    RAZORPAY: [
      { raw: 'entity_id / pay_id', canonical: 'paymentId', type: 'String', desc: 'Razorpay unique payment token' },
      { raw: 'settlement_id', canonical: 'settlementId', type: 'String', desc: 'Batch settlement credit ID' },
      { raw: 'fee', canonical: 'actualMdrFee', type: 'Number', desc: 'MDR charges deducted' },
      { raw: 'tax', canonical: 'actualGstFee', type: 'Number', desc: '18% GST deducted on fee' },
      { raw: 'amount', canonical: 'orderAmount', type: 'Number', desc: 'Gross transaction value in paise / rupees' },
      { raw: 'settled_at', canonical: 'settlementDate', type: 'DateTime', desc: 'Settlement timestamp (T+1 to T+7)' },
      { raw: 'utr', canonical: 'utrNumber', type: 'String', desc: 'RBI CBS UTR reference for bank clearance' },
    ],
    HDFC: [
      { raw: 'Transaction Date', canonical: 'bankCreditDate', type: 'Date', desc: 'Date cash hit merchant account' },
      { raw: 'Narration / Description', canonical: 'utrNumber', type: 'String', desc: 'CBS Narration with parsed UTR code' },
      { raw: 'Credit Amount', canonical: 'bankCreditAmount', type: 'Number', desc: 'Net funds received in current account' },
      { raw: 'Account Number', canonical: 'bankAccountRef', type: 'String', desc: 'Virtual or Primary Current A/c' },
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Layer 1 & 2 · Ingestion & Canonical Normalisation
              </span>
              <span className="text-xs text-slate-500">Read-Only Architecture</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Data Ingestion Connectors & Schemas
            </h2>
            <p className="text-xs text-slate-500">
              Ingests raw settlement feeds, orders, and bank statements without touching nodal funds
            </p>
          </div>

          <button
            onClick={onSimulateUpload}
            disabled={isSyncing}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Feeds...' : 'Sync All Ingestion Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Active Connectors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((src, i) => (
          <div 
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {src.sourceType.replace(/_/g, ' ')}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Sync
              </span>
            </div>

            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              {src.sourceName}
            </h4>

            <div className="text-xs text-slate-500 space-y-1 mb-3">
              <div>Records Ingested: <strong className="font-mono text-slate-700 dark:text-slate-300">{src.recordsCount.toLocaleString()}</strong></div>
              <div>Format: <strong className="text-slate-700 dark:text-slate-300">{src.fileFormat}</strong></div>
              <div>Last Synced: <span className="text-slate-400">{src.lastSyncTime}</span></div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">API Health: Normal</span>
              <button 
                onClick={onSimulateUpload}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Trigger Pull
              </button>
            </div>
          </div>
        ))}

        {/* Upload Manual File Card */}
        <div className="bg-slate-50 dark:bg-slate-850 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center flex flex-col items-center justify-center">
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
            Manual Settlement / Bank Statement Upload
          </h4>
          <p className="text-[11px] text-slate-500 max-w-xs mb-3">
            Drop your Razorpay MIS, PayU settlement XLS, or HDFC MT940 bank statement here
          </p>
          <button
            onClick={onSimulateUpload}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Upload CSV / MT940 File
          </button>
        </div>
      </div>

      {/* Canonical Transaction Normalisation Schema Viewer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Layer 2: Canonical Transaction Model Normalizer
            </h3>
            <p className="text-xs text-slate-500">
              How heterogeneous gateway payloads map deterministically into ReconOS schema
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedMapping('RAZORPAY')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedMapping === 'RAZORPAY'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Razorpay Settlement
            </button>
            <button
              onClick={() => setSelectedMapping('SHOPIFY')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedMapping === 'SHOPIFY'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Shopify Order
            </button>
            <button
              onClick={() => setSelectedMapping('HDFC')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedMapping === 'HDFC'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              HDFC Bank MT940
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Raw Source Header</th>
                <th className="py-2.5 px-3"></th>
                <th className="py-2.5 px-3">Canonical Attribute</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3">Reconciliation Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {mappings[selectedMapping].map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {m.raw}
                  </td>
                  <td className="py-3 px-2 text-emerald-500">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {m.canonical}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {m.type}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                    {m.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/AuditReportView.tsx`

```typescript
import React from 'react';
import { 
  Printer, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Coins, 
  ArrowRight,
  Building,
  Sparkles
} from 'lucide-react';
import { AuditReportData, CanonicalTransaction } from '../types/recon';
import { formatINR, formatCompactINR } from '../utils/reconciliationEngine';

interface AuditReportViewProps {
  auditData: AuditReportData;
  transactions: CanonicalTransaction[];
  merchantName: string;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  auditData,
  transactions,
  merchantName,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
            GTM Lead Artifact · Pitch Deck Slide 10
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Executive MDR & Settlement Leakage Audit Report
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Executive Audit Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Document Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                RO
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">ReconOS</span>
              <span className="text-xs text-slate-400">· Independent Forensic Audit</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Payment Settlement & MDR Leakage Audit
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Prepared for the Chief Financial Officer & Finance Controller
            </p>
          </div>

          <div className="sm:text-right text-xs text-slate-500 space-y-0.5">
            <div><strong>Client:</strong> {merchantName}</div>
            <div><strong>Audit Period:</strong> {auditData.period}</div>
            <div><strong>Report Reference:</strong> AUD-BOM-2026-09</div>
            <div><strong>Classification:</strong> Strictly Confidential</div>
          </div>
        </div>

        {/* Executive Recovery Callout - "Sell the recovery number before selling the software" */}
        <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-5 sm:p-6 text-slate-200">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Forensic Audit Conclusion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2">
            <div>
              <span className="text-xs text-slate-400 block">Total Audited Volume</span>
              <span className="text-2xl font-black font-mono text-white block">
                {formatINR(auditData.totalAnalyzedGmv)}
              </span>
              <span className="text-[11px] text-slate-400">{auditData.totalTransactions} online transactions</span>
            </div>

            <div className="border-l border-slate-800 md:pl-6">
              <span className="text-xs text-rose-400 font-semibold block">Identified Settlement Leakage</span>
              <span className="text-2xl font-black font-mono text-rose-400 block">
                {formatINR(auditData.totalIdentifiedRecovery)}
              </span>
              <span className="text-[11px] text-slate-400">Overcharges & uncredited funds</span>
            </div>

            <div className="border-l border-slate-800 md:pl-6">
              <span className="text-xs text-emerald-400 font-semibold block">Annualized Run-Rate Recovery</span>
              <span className="text-2xl font-black font-mono text-emerald-400 block">
                {formatCompactINR(auditData.potentialAnnualizedRecovery)}
              </span>
              <span className="text-[11px] text-slate-400">Projected 12-month savings</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            <strong>Key Finding:</strong> Across the audited sample, 
            <strong className="text-white"> {((auditData.totalIdentifiedRecovery / auditData.totalAnalyzedGmv) * 100).toFixed(2)}% of GMV </strong> 
            was subjected to unauthorized fee slippage, GST computation errors, or uncredited T+7 settlement lag. 
            This matches the industry standard problem band of <strong>0.3% to 1.2% GMV drift</strong> identified in the ReconOS market index.
          </div>
        </div>

        {/* Aggregator Variance Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            Payment Aggregator Breakdown & Rate-Card Overcharges
          </h3>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Payment Aggregator</th>
                  <th className="py-2.5 px-3">Billed MDR + GST</th>
                  <th className="py-2.5 px-3">Contracted MDR + GST</th>
                  <th className="py-2.5 px-3">Calculated Variance</th>
                  <th className="py-2.5 px-3">Forensic Root Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditData.topOverchargingGateways.map((item) => (
                  <tr key={item.gateway}>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {item.gateway}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {formatINR(item.billedMdr)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {formatINR(item.contractedMdr)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-500">
                      {item.variance > 0 ? `+${formatINR(item.variance)}` : '₹0.00'}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                      {item.primaryCause}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations & Claims Process */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            Actionable Recovery & Dispute Roadmap
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
            <li>
              <strong>Issue Formal Dispute Notice:</strong> Submit documented transaction-level schedule to Razorpay and PayU citing clause Schedule B (Contracted Interchange Rates).
            </li>
            <li>
              <strong>GSTR-2B Input Tax Credit Reconciliation:</strong> Reconcile GST differences to ensure your business claims the full credit notes for excessive 22%+ GST billing.
            </li>
            <li>
              <strong>Automate Daily 3-Way Reconciliation:</strong> Switch from batch Excel matching to continuous ReconOS transaction matching to prevent future drift.
            </li>
          </ol>
        </div>

        {/* Sign-off footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>Audit Engine: <strong>ReconOS Forensic Engine v1.0</strong></span>
          </div>
          <div>
            <span>Certified by: <strong>ReconOS Payments Operations Cell</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/AccountingExportView.tsx`

```typescript
import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import { CanonicalTransaction } from '../types/recon';
import { generateTallyXml, generateZohoCsv, formatINR } from '../utils/reconciliationEngine';

interface AccountingExportViewProps {
  transactions: CanonicalTransaction[];
}

export const AccountingExportView: React.FC<AccountingExportViewProps> = ({
  transactions,
}) => {
  const [activeFormat, setActiveFormat] = useState<'TALLY' | 'ZOHO'>('TALLY');
  const [copied, setCopied] = useState(false);

  const matchedTxns = transactions.filter(t => t.matchStatus === 'MATCHED' || t.bankMatched);
  const tallyXml = generateTallyXml(transactions);
  const zohoCsv = generateZohoCsv(transactions);

  const handleCopy = () => {
    const textToCopy = activeFormat === 'TALLY' ? tallyXml : zohoCsv;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeFormat === 'TALLY' ? tallyXml : zohoCsv;
    const filename = activeFormat === 'TALLY' ? 'ReconOS_Tally_Import.xml' : 'ReconOS_Zoho_Journals.csv';
    const mimeType = activeFormat === 'TALLY' ? 'application/xml' : 'text/csv';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                P1 ERP / Accounting Synchronisation
              </span>
              <span className="text-xs text-slate-500">Auto-balanced Ledger Entries</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Tally Prime & Zoho Books Accounting Export
            </h2>
            <p className="text-xs text-slate-500">
              Transform reconciled settlements into structured journal vouchers with verified GST Input Tax Credit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Voucher Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFormat === 'TALLY' ? 'XML Voucher' : 'CSV Journal'}</span>
            </button>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveFormat('TALLY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeFormat === 'TALLY'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-500" />
            <span>Tally Prime XML (ODBC/XML Import)</span>
          </button>

          <button
            onClick={() => setActiveFormat('ZOHO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeFormat === 'ZOHO'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-500" />
            <span>Zoho Books Journal CSV</span>
          </button>
        </div>
      </div>

      {/* Accounting Workflow Explanation Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Debit Bank A/c</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block">HDFC Current A/c</span>
          <span className="text-slate-500 text-[11px]">Net cash received via UTR</span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Debit Expense</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block">MDR Commission</span>
          <span className="text-slate-500 text-[11px]">Direct finance expense</span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Debit Input GST</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block">18% ITC Credit</span>
          <span className="text-slate-500 text-[11px]">Matches GSTR-2B filing</span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Credit Clearing A/c</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 block">Online Sales Clearing</span>
          <span className="text-slate-500 text-[11px]">Reconciles Day 0 order debtor</span>
        </div>
      </div>

      {/* Code / Payload Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
            <span className="font-mono text-slate-300 ml-2">
              {activeFormat === 'TALLY' ? 'Tally_Prime_Receipt_Vouchers.xml' : 'Zoho_Books_Import.csv'}
            </span>
          </div>
          <span className="font-mono text-[11px]">
            {matchedTxns.length} Reconciled Records Ready for Import
          </span>
        </div>

        <div className="p-4 overflow-x-auto max-h-96">
          <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre">
            {activeFormat === 'TALLY' ? tallyXml : zohoCsv}
          </pre>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/RoiCalculatorView.tsx`

```typescript
import React, { useState } from 'react';
import { 
  Calculator, 
  Check, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  Building, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatINR, formatCompactINR } from '../utils/reconciliationEngine';

export const RoiCalculatorView: React.FC = () => {
  const [annualGmvCr, setAnnualGmvCr] = useState<number>(48); // ₹48 Cr
  const [leakagePct, setLeakagePct] = useState<number>(0.65); // 0.65% standard
  const [selectedTier, setSelectedTier] = useState<'STARTER' | 'GROWTH' | 'SCALE'>('GROWTH');

  const gmvRupees = annualGmvCr * 10000000;
  const estimatedLeakage = (gmvRupees * leakagePct) / 100;
  
  const tierPricing = {
    STARTER: { monthly: 15000, annual: 180000, name: 'Starter', limit: '≤ 1L txns/mo · 2 PGs' },
    GROWTH: { monthly: 45000, annual: 540000, name: 'Growth (Recommended)', limit: '≤ 10L txns/mo · Unlimited PGs · MDR Audit' },
    SCALE: { monthly: 120000, annual: 1440000, name: 'Scale', limit: '> 10L txns/mo · API · SSO · Dedicated Engineer' },
  };

  const selectedTierData = tierPricing[selectedTier];
  const implementationFee = 50000;
  const recoveryFee15Pct = estimatedLeakage * 0.15;
  const totalCustomerCost = selectedTierData.annual + implementationFee + recoveryFee15Pct;
  const netMerchantGain = estimatedLeakage - totalCustomerCost;
  const roiMultiple = totalCustomerCost > 0 ? (estimatedLeakage / totalCustomerCost).toFixed(1) : '1.0';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Commercial Architecture · Pitch Deck Slides 08 & 09
              </span>
              <span className="text-xs text-slate-500">Self-Funding Economic Model</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              SaaS Pricing, Self-Funding Recovery & ROI Calculator
            </h2>
            <p className="text-xs text-slate-500">
              How mid-market merchants fund ReconOS purely from identified and recovered leakage
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              Blended ACV: ₹3.0 Lakhs · 80% Gross Margin
            </span>
          </div>
        </div>
      </div>

      {/* Interactive ROI Calculator Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-white">
            Interactive Merchant ROI & Payback Simulation
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300">Merchant Annual Online GMV:</span>
                <span className="font-mono text-emerald-400 text-sm font-bold">₹{annualGmvCr} Crores</span>
              </div>
              <input
                type="range"
                min={25}
                max={500}
                step={5}
                value={annualGmvCr}
                onChange={(e) => setAnnualGmvCr(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>₹25 Cr (Target ICP min)</span>
                <span>₹250 Cr</span>
                <span>₹500 Cr (Mid-market cap)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300">Observed Settlement & MDR Drift:</span>
                <span className="font-mono text-amber-400 text-sm font-bold">{leakagePct}% of GMV</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={1.2}
                step={0.05}
                value={leakagePct}
                onChange={(e) => setLeakagePct(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.30% (Best Case)</span>
                <span>0.65% (ReconOS Industry Benchmark)</span>
                <span>1.20% (High Complexity)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select SaaS Plan Tier:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['STARTER', 'GROWTH', 'SCALE'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      selectedTier === tier
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-[10px] block font-mono uppercase">{tier}</span>
                    <span className="font-bold text-white block">₹{(tierPricing[tier].monthly / 1000)}k/mo</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROI Outputs */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-slate-400">Total Unexplained Annual Leakage:</span>
                <span className="font-mono text-lg font-bold text-rose-400">
                  {formatINR(estimatedLeakage)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">ReconOS Annual Subscription:</span>
                <span className="font-mono text-white">
                  {formatINR(selectedTierData.annual)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">One-time Implementation:</span>
                <span className="font-mono text-white">
                  ₹50,000
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">15% Self-Funding Recovery Fee:</span>
                <span className="font-mono text-white">
                  {formatINR(recoveryFee15Pct)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="font-bold text-emerald-400">Net Merchant Value Returned:</span>
                <span className="font-mono text-xl font-black text-emerald-400">
                  {formatINR(netMerchantGain)}
                </span>
              </div>
            </div>

            <div className="mt-5 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-center">
              <span className="text-[11px] text-emerald-300 uppercase font-bold tracking-wider block">
                Estimated Year 1 Return On Investment
              </span>
              <span className="text-3xl font-black font-mono text-white block my-0.5">
                {roiMultiple}x ROI
              </span>
              <span className="text-[11px] text-slate-400">
                Fully paid back in less than 45 days through recovered gateway leakage.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* The Three SaaS Tiers Grid from Deck Slide 08 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Starter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Starter Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹15,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Designed for early mid-market D2C merchants launching multi-gateway operations.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Up to 1,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>2 Payment Aggregators</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Daily 3-way matching engine</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Standard exception queue</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('STARTER')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Select Starter
          </button>
        </div>

        {/* Growth (Most Popular) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl p-6 flex flex-col justify-between shadow-md relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
            Most Popular
          </span>
          <div>
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Growth Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹45,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Full transaction-level re-pricing with automated rate-card validation & recovery.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Up to 10,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Unlimited Payment Aggregators</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Rate-Card Re-pricing Engine (Sharp Edge)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Tally & Zoho Books auto-export</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Automated dispute letter generation</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('GROWTH')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
          >
            Select Growth Plan
          </button>
        </div>

        {/* Scale */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Scale Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹1,20,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enterprise volume reconciliation with direct REST APIs and SSO governance.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>&gt; 10,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Direct Webhooks & Scheduled SFTP Ingestion</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Custom ERP & NetSuite / SAP Connectors</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Dedicated Payments Operations Partner</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('SCALE')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Select Scale
          </button>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/TransactionDetailModal.tsx`

```typescript
import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Send, 
  Clock, 
  UserCheck, 
  Layers,
  Coins
} from 'lucide-react';
import { CanonicalTransaction } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';

interface TransactionDetailModalProps {
  transaction: CanonicalTransaction | null;
  onClose: () => void;
  onOpenDispute: (txn: CanonicalTransaction) => void;
  onUpdateTransaction?: (txn: CanonicalTransaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onOpenDispute,
  onUpdateTransaction,
}) => {
  if (!transaction) return null;

  const isMatched = transaction.matchStatus === 'MATCHED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isMatched ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {isMatched ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-base text-slate-900 dark:text-white">
                  {transaction.orderId}
                </h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="font-mono text-xs text-indigo-500 font-semibold">{transaction.paymentId}</span>
              </div>
              <span className="text-xs text-slate-500">{transaction.customerName} ({transaction.customerEmail})</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 3-Way Comparative Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Layer 1: Order */}
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">
                1. Order System (Day 0)
              </span>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div>Source: <strong className="text-slate-800 dark:text-slate-100">Shopify</strong></div>
                <div>Date: <strong className="text-slate-800 dark:text-slate-100">{transaction.orderDate}</strong></div>
                <div>Amount: <strong className="font-mono text-slate-900 dark:text-white text-sm block">{formatINR(transaction.orderAmount)}</strong></div>
                <div>Status: <span className="text-emerald-500 font-semibold">Captured</span></div>
              </div>
            </div>

            {/* Layer 2: PG Settlement */}
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/50">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                2. PG Settlement (Day T+1)
              </span>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div>Gateway: <strong className="text-slate-800 dark:text-slate-100">{transaction.gateway}</strong></div>
                <div>Method: <strong className="text-slate-800 dark:text-slate-100">{transaction.paymentMethod}</strong></div>
                <div>MDR Billed: <span className="font-mono">{formatINR(transaction.actualMdrFee)}</span></div>
                <div>GST Billed: <span className="font-mono">{formatINR(transaction.actualGstFee)}</span></div>
                <div>Net Settled: <strong className="font-mono text-slate-900 dark:text-white block">{formatINR(transaction.actualNetSettled)}</strong></div>
              </div>
            </div>

            {/* Layer 3: Bank Credit */}
            <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900/50">
              <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block mb-1">
                3. Bank Credit (Day T+1/T+7)
              </span>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div>Bank: <strong className="text-slate-800 dark:text-slate-100">HDFC Bank Current A/c</strong></div>
                <div>UTR: <strong className="font-mono text-slate-800 dark:text-slate-100 break-all">{transaction.utrNumber || 'N/A (Missing)'}</strong></div>
                <div>Credit Date: <span className="text-slate-800 dark:text-slate-100">{transaction.bankCreditDate || 'Uncredited'}</span></div>
                <div>Cash Hit: <strong className="font-mono text-slate-900 dark:text-white text-sm block">{formatINR(transaction.bankCreditAmount || 0)}</strong></div>
              </div>
            </div>
          </div>

          {/* Forensic Rate-Card Recalculation Formula */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Rate-Card Mathematical Verification
              </span>
              <span className={`font-bold font-mono ${transaction.feeVariance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {transaction.feeVariance > 0 ? `Overcharge: +${formatINR(transaction.feeVariance)}` : 'Zero Variance (Clean)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Expected MDR</span>
                <span className="text-slate-800 dark:text-slate-200">{formatINR(transaction.expectedMdrFee)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Expected GST (18%)</span>
                <span className="text-slate-800 dark:text-slate-200">{formatINR(transaction.expectedGstFee)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Actual MDR Billed</span>
                <span className="text-slate-800 dark:text-slate-200">{formatINR(transaction.actualMdrFee)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Actual GST Billed</span>
                <span className="text-slate-800 dark:text-slate-200">{formatINR(transaction.actualGstFee)}</span>
              </div>
            </div>
          </div>

          {/* Audit Finding & Notes */}
          <div className="space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
              Reconciliation Finding & Explanation
            </span>
            <p className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {transaction.matchReason}
            </p>
          </div>

          {transaction.disputeNotes && (
            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                Internal Investigation Notes
              </span>
              <p className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 italic">
                &ldquo;{transaction.disputeNotes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Assigned: <strong>{transaction.assignedOwner || 'Unassigned'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenDispute(transaction);
              }}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Generate Dispute Packet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/DisputeModal.tsx`

```typescript
import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Mail, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';
import { CanonicalTransaction } from '../types/recon';
import { generateDisputeNotice } from '../utils/reconciliationEngine';

interface DisputeModalProps {
  transaction: CanonicalTransaction | null;
  onClose: () => void;
  onDisputeSent?: (txnId: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  transaction,
  onClose,
  onDisputeSent,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!transaction) return null;

  const noticeText = generateDisputeNotice(transaction);

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setIsSent(true);
    if (onDisputeSent) {
      onDisputeSent(transaction.id);
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Payment Aggregator Formal Dispute Packet
              </h3>
              <p className="text-xs text-slate-500">
                Auto-generated legal claim for {transaction.gateway} · Ticket Reference #DISP-{transaction.orderId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Preview Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {noticeText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Letter' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSent}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5 transition disabled:bg-emerald-600"
            >
              {isSent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Claim Dispatched to PG!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Formal Dispute with {transaction.gateway}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/InteractiveTourModal.tsx`

```typescript
import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Coins,
  Building,
  TrendingDown
} from 'lucide-react';
import { NavTab } from './Navbar';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: NavTab) => void;
}

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      step: 1,
      badge: '01 · The Problem',
      title: 'The Books Drift, Silently — 0.3% to 1.2% GMV Lost',
      subtitle: 'Mid-market merchants running 2-4 payment aggregators cannot reconcile transaction by transaction.',
      icon: TrendingDown,
      color: 'from-rose-500/20 to-amber-500/20 text-rose-400 border-rose-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            A merchant collecting ₹25–500 Cr GMV runs 2–4 payment aggregators (Razorpay, PayU, Cashfree) alongside bank accounts. 
            Money leaves customer on <strong className="text-white">Day 0</strong> and reaches bank on <strong className="text-white">Day T+1 to T+7</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-white block">2–4 PGs</span>
              <span className="text-xs text-slate-400">Run in parallel with disparate settlement formats</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-rose-400 block">T+1 to T+7</span>
              <span className="text-xs text-slate-400">Days for cash to land after 5 layers of deductions</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-amber-400 block">0.3%–1.2%</span>
              <span className="text-xs text-slate-400">Of GMV sits in unexplained breaks & silent drift</span>
            </div>
          </div>
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-200 text-xs">
            <strong>The spreadsheet trap:</strong> Finance teams download 4–8 settlement files daily and match at batch level. 
            Nobody re-prices the invoice against the contract, so overcharges are silently absorbed into company books.
          </div>
        </div>
      ),
      actionLabel: 'Explore Dashboard Overview',
      targetTab: 'dashboard' as NavTab,
    },
    {
      step: 2,
      badge: '02 · Layer 1 & 2',
      title: 'Canonical Ingestion Across Order, PG & Bank',
      subtitle: 'Read-only architecture normalizing Shopify, Razorpay, PayU, and HDFC Bank into a single schema.',
      icon: Layers,
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            ReconOS sits outside RBI’s PA/PG perimeter by design — purely <strong>read-only data access</strong>, no nodal accounts, and no payout initiation.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <strong className="text-white">Order System:</strong> Shopify / WooCommerce order ID, timestamp, gross basket value, discount codes.
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <strong className="text-white">Payment Aggregators:</strong> Razorpay, PayU, Cashfree settlement batches, MDR deducted, GST on MDR, reserves, refunds.
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <strong className="text-white">Bank Feed:</strong> CBS bank credits, UTR reference number, account credit timestamp.
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Data Ingestion & Schemas',
      targetTab: 'ingestion' as NavTab,
    },
    {
      step: 3,
      badge: '03 · Matching Engine',
      title: '3-Way Match, Daily, at Transaction Level',
      subtitle: 'Deterministic 6-stage matching hierarchy prioritizing zero false matches over superficial automation.',
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Instead of matching batch totals in Excel, ReconOS matches every individual rupee from <strong>Order → PG Settlement → Bank Credit</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="font-semibold text-white block mb-1">Hierarchy Priority</span>
              <ol className="list-decimal list-inside text-slate-400 space-y-1">
                <li>Exact Payment ID</li>
                <li>Exact Order ID</li>
                <li>UTR / Bank Reference</li>
                <li>Settlement ID + Amount</li>
              </ol>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="font-semibold text-emerald-300 block mb-1">Conservative Safety</span>
              <p className="text-slate-400">
                A system that creates false matches introduces severe financial risk. ReconOS sends uncertain records straight to an explicit exception queue.
              </p>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'Inspect 3-Way Match Table',
      targetTab: 'three-way' as NavTab,
    },
    {
      step: 4,
      badge: '04 · The Sharp Edge',
      title: 'Rate-Card Engine: Turning Visibility into Rupee Recovery',
      subtitle: 'Re-prices every transaction by card type, network, issuer, MCC, EMI, and cross-border status.',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            The fundamental differentiator: a merchant cannot rely on the payment aggregator to audit its own fee invoices. 
            ReconOS recalculates what the fee <em>should</em> have been under the contracted rate card.
          </p>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200 text-xs space-y-1.5">
            <div className="font-bold text-sm">Example Detected Overcharge:</div>
            <div>• Mandated 0% RuPay Debit Card billed at 1.85% retail credit card rate</div>
            <div>• Inconsistent 18% GST calculation on exempt banking interchange</div>
            <div>• International cards billed at 3.50% when commercial contract capped at 2.80%</div>
          </div>
        </div>
      ),
      actionLabel: 'Test Rate-Card Engine',
      targetTab: 'rate-card' as NavTab,
    },
    {
      step: 5,
      badge: '05 · Exception Taxonomy',
      title: 'Fixed 11-Category Taxonomy, Ageing Clock & Dispute Packets',
      subtitle: 'Moves finance analysts from mind-numbing matching to structured exception resolution.',
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Every break lands in one standardized taxonomy with an assigned owner, ageing clock (T+1 to T+30+), and auto-generated dispute evidence.
          </p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {[
              'Fee Mismatch', 'GST-on-MDR Error', 'Refund Lag', 
              'Chargeback Deduction', 'Part-settlement', 'T+n Slippage', 
              'Missing UTR', 'Duplicate Credit', 'Reserve Hold', 
              'Missing Settlement', 'Amount Mismatch'
            ].map(cat => (
              <span key={cat} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                {cat}
              </span>
            ))}
          </div>
        </div>
      ),
      actionLabel: 'Open Exception Workspace',
      targetTab: 'exceptions' as NavTab,
    },
    {
      step: 6,
      badge: '06 · GTM & Commercials',
      title: 'Lead with the Audit, Not the Software',
      subtitle: 'SaaS subscription (₹15k–₹1.2L/mo) plus self-funding 15% recovery fee. Path to ₹7.4 Cr ARR.',
      icon: Coins,
      color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            The sales motion leads with: <em className="text-white">"Let us show you how much money your payment aggregators are overcharging or failing to settle."</em>
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Starter</span>
              <span className="font-bold text-white block">₹15,000/mo</span>
              <span className="text-[10px] text-slate-500">≤1L txns, 2 PGs</span>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-emerald-500/50 bg-emerald-950/20">
              <span className="text-emerald-400 block text-[10px] font-semibold">Growth (Popular)</span>
              <span className="font-bold text-white block">₹45,000/mo</span>
              <span className="text-[10px] text-slate-500">MDR Audit, Unlimited</span>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Scale</span>
              <span className="font-bold text-white block">₹1,20,000/mo</span>
              <span className="text-[10px] text-slate-500">&gt;10L txns, API, SSO</span>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Executive Audit & Recovery Report',
      targetTab: 'audit-report' as NavTab,
    },
  ];

  const current = tourSteps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-gradient-to-br ${current.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-400">
                {current.badge}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {current.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Tour"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <p className="text-xs sm:text-sm text-slate-400 font-medium mb-4">
            {current.subtitle}
          </p>
          {current.content}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {tourSteps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${s.step}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(c => c - 1)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}

            <button
              onClick={() => {
                onNavigateToTab(current.targetTab);
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-md flex items-center gap-1 font-medium transition"
            >
              {current.actionLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {currentStep < tourSteps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(c => c + 1)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow flex items-center gap-1 transition"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow flex items-center gap-1 transition"
              >
                Start Using ReconOS
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/components/ClaudeExportView.tsx`

```typescript
import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Code2, 
  Layers, 
  Sparkles, 
  Bot, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  BookOpen,
  Share2,
  Terminal,
  FileCode,
  Zap
} from 'lucide-react';

interface FileDownloadItem {
  id: string;
  name: string;
  filename: string;
  path: string;
  sizeDesc: string;
  badge: string;
  badgeColor: string;
  description: string;
  claudeUseCases: string[];
}

export const ClaudeExportView: React.FC = () => {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<'all' | 'spec' | 'flow' | 'code'>('all');
  const [previewContent, setPreviewContent] = useState<string>('Loading document preview...');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const downloadableFiles: FileDownloadItem[] = [
    {
      id: 'all-in-one',
      name: 'Master All-in-One Context Bundle',
      filename: 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
      path: '/downloads/RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
      sizeDesc: '~55 KB Markdown',
      badge: 'Recommended for Claude',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description: 'The complete system in a single document: Executive overview, PRD specification, architecture diagrams, mathematical equations, 11-category exception taxonomy, and complete source code.',
      claudeUseCases: [
        'Single drag-and-drop into any Claude chat or Project',
        'Ask Claude to build new features, backend APIs, or connectors',
        'Ask Claude to audit compliance with RBI and Indian GST regulations'
      ]
    },
    {
      id: 'master-spec',
      name: 'Functional PRD & Market Specification',
      filename: 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
      path: '/downloads/RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
      sizeDesc: '~14 KB Markdown',
      badge: 'Product Requirements',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Deep-dive into the market problem, mid-market D2C merchant pain points, the 11-category deterministic taxonomy, rate-card mechanics, accounting rules, and SaaS commercial tiers.',
      claudeUseCases: [
        'Claude project knowledge base for product management',
        'Refining GTM pitch decks, customer battlecards, and sales scripts',
        'Creating customer onboarding checklists and training guides'
      ]
    },
    {
      id: 'e2e-flow',
      name: 'End-to-End Flow & Architecture',
      filename: 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
      path: '/downloads/RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
      sizeDesc: '~11 KB Markdown',
      badge: 'Technical Blueprint',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description: 'Step-by-step 7-stage pipeline walkthrough from Day 0 order capture to Day T+7 bank credit settlement, rate-card mathematical variance algorithms, and state machines.',
      claudeUseCases: [
        'Ask Claude to architect a high-throughput backend in Go or Node.js',
        'Ask Claude to generate database migration schemas in PostgreSQL',
        'Ask Claude to design webhook receivers with idempotency guarantees'
      ]
    },
    {
      id: 'codebase-bundle',
      name: 'Complete Source Codebase Bundle',
      filename: 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md',
      path: '/downloads/RECONOS_COMPLETE_CODEBASE_BUNDLE.md',
      sizeDesc: '~38 KB Markdown',
      badge: '100% Production Code',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description: 'Full code of every file in the project (React 19, TypeScript, Tailwind, Reconciliation engine, mock data, modals, and export generators).',
      claudeUseCases: [
        'Ask Claude to write automated Vitest unit & integration test suites',
        'Ask Claude to refactor or add new payment aggregators (e.g. Pine Labs, PhonePe)',
        'Code quality reviews, security audits, and type-safety validations'
      ]
    }
  ];

  // Fetch document preview on tab switch
  React.useEffect(() => {
    const fetchDoc = async () => {
      setIsLoadingPreview(true);
      const filenameMap = {
        all: 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
        spec: 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
        flow: 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
        code: 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md'
      };
      try {
        const res = await fetch(`/downloads/${filenameMap[selectedPreviewDoc]}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        } else {
          setPreviewContent('Unable to load document preview. Please use the direct download buttons above.');
        }
      } catch (err) {
        setPreviewContent('Failed to fetch document. Please use the direct download buttons.');
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchDoc();
  }, [selectedPreviewDoc]);

  const handleDownload = (file: FileDownloadItem) => {
    const link = document.createElement('a');
    link.href = file.path;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccessId(file.id);
    setTimeout(() => setDownloadSuccessId(null), 3000);
  };

  const handleCopyFileContent = async (file: FileDownloadItem) => {
    try {
      const res = await fetch(file.path);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadAll = () => {
    downloadableFiles.forEach((file, index) => {
      setTimeout(() => {
        handleDownload(file);
      }, index * 400);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Bot className="w-3 h-3" />
                Anthropic Claude Knowledge Base & Share Center
              </span>
              <span className="text-xs text-slate-400">Zero Configuration Needed</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Everything to Claude
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Download clean, pre-bundled Markdown packages containing the complete PRD, functional specifications, end-to-end data pipelines, mathematical formulas, and full production codebase ready to share with Claude.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload(downloadableFiles[0])}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 flex items-center gap-2 transition hover:scale-102"
            >
              <Download className="w-4 h-4" />
              <span>Download Master Bundle (.md)</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download All 4 Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {downloadableFiles.map((file) => {
          const isCopied = copiedFileId === file.id;
          const isDownloaded = downloadSuccessId === file.id;

          return (
            <div
              key={file.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${file.badgeColor}`}>
                    {file.badge}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{file.sizeDesc}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-400 transition">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  {file.description}
                </p>

                {/* Key Use cases for Claude */}
                <div className="mb-4 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">What Claude can do with this:</span>
                  {file.claudeUseCases.map((uc, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{uc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                  {file.filename}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyFileContent(file)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition flex items-center gap-1"
                    title="Copy full contents to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(file)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{isDownloaded ? 'Downloaded' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Prompts for Claude */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Recommended Prompts to Ask Claude Once Uploaded
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div 
            onClick={() => {
              navigator.clipboard.writeText("Review the ReconOS 11-category exception taxonomy and rate-card engine. How can we add support for Pine Labs PoS and PhonePe PG settlements, including UPI Intent vs QR fee structures?");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>PG Expansion</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Review the ReconOS 11-category exception taxonomy and rate-card engine. How can we add support for Pine Labs PoS and PhonePe PG settlements, including UPI Intent vs QR fee structures?&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Based on the mathematical formulas in RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md, generate a complete Vitest automated test suite covering all edge cases for domestic card interchange, GST on flat fee, and RuPay debit zero-MDR compliance.");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>Automated Testing</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Based on the mathematical formulas in the architecture doc, generate a complete Vitest automated test suite covering edge cases for domestic card interchange, GST on flat fees, and RuPay debit zero-MDR compliance.&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Design a scalable production backend for ReconOS using Node.js/TypeScript, PostgreSQL (with Drizzle ORM), BullMQ for settlement file parsing, and S3 for raw MT940 statement storage. Provide database migrations for the canonical transactions and audit tables.");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>Backend Architecture</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Design a scalable production backend for ReconOS using Node.js/TypeScript, PostgreSQL (with Drizzle ORM), BullMQ for settlement file parsing, and S3 for raw MT940 statement storage.&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Analyze the Tally Prime XML voucher generation logic in AccountingExportView.tsx. How does it handle GST Input Tax Credit (ITC) reconciliation with GSTR-2B under Section 16(2)(aa) of the CGST Act?");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>GST & Audit Compliance</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Analyze the Tally Prime XML voucher generation logic. How does it handle GST Input Tax Credit (ITC) reconciliation with GSTR-2B under Section 16(2)(aa) of the CGST Act?&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Live Document Preview Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Live Document Viewer & Inspector
            </h3>
          </div>

          {/* Document switcher tabs */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSelectedPreviewDoc('all')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'all'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Master All-in-One
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('spec')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'spec'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              PRD Specification
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('flow')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'flow'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              E2E Flow & Arch
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('code')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'code'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Codebase Bundle
            </button>
          </div>
        </div>

        {/* Document Content View */}
        <div className="p-5 max-h-[500px] overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-purple-600 selection:text-white">
          {isLoadingPreview ? (
            <div className="text-center py-12 text-slate-500">Loading document preview...</div>
          ) : (
            previewContent
          )}
        </div>
      </div>
    </div>
  );
};

```

---

## File: `src/App.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Navbar, 
  NavTab 
} from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ThreeWayMatchView } from './components/ThreeWayMatchView';
import { RateCardEngineView } from './components/RateCardEngineView';
import { ExceptionWorkspaceView } from './components/ExceptionWorkspaceView';
import { DataIngestionView } from './components/DataIngestionView';
import { AuditReportView } from './components/AuditReportView';
import { AccountingExportView } from './components/AccountingExportView';
import { RoiCalculatorView } from './components/RoiCalculatorView';
import { ClaudeExportView } from './components/ClaudeExportView';
import { InteractiveTourModal } from './components/InteractiveTourModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { DisputeModal } from './components/DisputeModal';

import { 
  INITIAL_RATE_CARDS, 
  INITIAL_TRANSACTIONS 
} from './data/mockData';
import { 
  CanonicalTransaction, 
  RateCardRule 
} from './types/recon';
import { 
  calculateMetrics, 
  generateAuditSummary, 
  repriceTransaction 
} from './utils/reconciliationEngine';
import { Sparkles, Info, ShieldCheck, CheckCircle2, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [rateCards, setRateCards] = useState<RateCardRule[]>(INITIAL_RATE_CARDS);
  const [transactions, setTransactions] = useState<CanonicalTransaction[]>(INITIAL_TRANSACTIONS);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('Bombay Threads & Lifestyle Co. (₹48 Cr GMV)');
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CanonicalTransaction | null>(null);
  const [disputeTransaction, setDisputeTransaction] = useState<CanonicalTransaction | null>(null);
  const [reconToast, setReconToast] = useState<string | null>(null);

  // Compute live metrics
  const metrics = useMemo(() => {
    return calculateMetrics(transactions);
  }, [transactions]);

  // Compute live audit summary
  const auditData = useMemo(() => {
    return generateAuditSummary(transactions, selectedMerchant.split(' (')[0]);
  }, [transactions, selectedMerchant]);

  // Handle rate card updates
  const handleUpdateRateCards = (updatedRules: RateCardRule[]) => {
    setRateCards(updatedRules);
    // Recalculate transactions with new rate cards
    const repriced = transactions.map(t => repriceTransaction(t, updatedRules));
    setTransactions(repriced);
    showToast('Rate cards updated! All transactions re-priced successfully.');
  };

  // Handle single transaction update (e.g. status or owner change)
  const handleUpdateTransaction = (updatedTxn: CanonicalTransaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTxn.id ? updatedTxn : t));
    showToast(`Updated ${updatedTxn.orderId}: Status → ${updatedTxn.exceptionStatus || 'Updated'}`);
  };

  const handleDisputeSent = (txnId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          exceptionStatus: 'DISPUTED_WITH_PG',
          disputeNotes: 'Official formal claim dispatched to payment aggregator nodal cell via ReconOS.',
        };
      }
      return t;
    }));
    showToast('Formal dispute notice dispatched to Payment Aggregator!');
  };

  const showToast = (msg: string) => {
    setReconToast(msg);
    setTimeout(() => {
      setReconToast(null);
    }, 4000);
  };

  // Run full simulated reconciliation batch
  const handleRunRecon = () => {
    setIsReconciling(true);
    setTimeout(() => {
      // Re-price and re-evaluate
      const repriced = transactions.map(t => repriceTransaction(t, rateCards));
      setTransactions(repriced);
      setIsReconciling(false);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      showToast('Reconciliation Complete: 96.4% Auto-Match Rate · Zero Unsafe Matches');
    }, 1200);
  };

  // Simulate source feeds pull
  const handleSimulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Ingestion Feeds Synced: 14,820 orders, 14,820 settlement records, 68 CBS credits updated.');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Guided Demo Helper Callout Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-800/40 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>ReconOS Working Model & Interactive Demo:</strong> Every screen is clickable, functional, and grounded in the PRD & Pitch Deck specifications.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('claude-export')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Export for Claude (Files & Code)</span>
          </button>

          <button
            onClick={() => setIsTourOpen(true)}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Guided Product Tour</span>
          </button>
        </div>
      </div>

      {/* Main App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        onRunRecon={handleRunRecon}
        isReconciling={isReconciling}
        onOpenTour={() => setIsTourOpen(true)}
        selectedMerchant={selectedMerchant}
        setSelectedMerchant={setSelectedMerchant}
      />

      {/* Toast Notification */}
      {reconToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{reconToast}</span>
        </div>
      )}

      {/* Primary Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            transactions={transactions}
            onNavigateToTab={setActiveTab}
            onSelectTransaction={setSelectedTransaction}
            onRunRecon={handleRunRecon}
            isReconciling={isReconciling}
          />
        )}

        {activeTab === 'three-way' && (
          <ThreeWayMatchView
            transactions={transactions}
            onSelectTransaction={setSelectedTransaction}
            onRunRecon={handleRunRecon}
            isReconciling={isReconciling}
          />
        )}

        {activeTab === 'rate-card' && (
          <RateCardEngineView
            rateCards={rateCards}
            onUpdateRateCards={handleUpdateRateCards}
            transactions={transactions}
            onSelectTransaction={setSelectedTransaction}
            onOpenDispute={setDisputeTransaction}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionWorkspaceView
            transactions={transactions}
            onUpdateTransaction={handleUpdateTransaction}
            onSelectTransaction={setSelectedTransaction}
            onOpenDispute={setDisputeTransaction}
          />
        )}

        {activeTab === 'ingestion' && (
          <DataIngestionView
            onSimulateUpload={handleSimulateSync}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'audit-report' && (
          <AuditReportView
            auditData={auditData}
            transactions={transactions}
            merchantName={selectedMerchant.split(' (')[0]}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingExportView
            transactions={transactions}
          />
        )}

        {activeTab === 'pricing' && (
          <RoiCalculatorView />
        )}

        {activeTab === 'claude-export' && (
          <ClaudeExportView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">ReconOS</span>
            <span>·</span>
            <span>Multi-Gateway Settlement Reconciliation System</span>
            <span>·</span>
            <span className="text-emerald-500">Compliant by Design (RBI / DPDP Act)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsTourOpen(true)} className="hover:text-white transition">Product Tour</button>
            <button onClick={() => setActiveTab('claude-export')} className="text-purple-400 hover:text-purple-300 font-semibold transition flex items-center gap-1">
              <Bot className="w-3 h-3" />
              <span>Export for Claude</span>
            </button>
            <button onClick={() => setActiveTab('rate-card')} className="hover:text-white transition">Rate-Card Engine</button>
            <button onClick={() => setActiveTab('audit-report')} className="hover:text-white transition">Audit Report</button>
            <button onClick={() => setActiveTab('pricing')} className="hover:text-white transition">SaaS Model</button>
          </div>
        </div>
      </footer>

      {/* Interactive Tour Walkthrough Modal */}
      <InteractiveTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateToTab={setActiveTab}
      />

      {/* Transaction 3-Way Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onOpenDispute={setDisputeTransaction}
        onUpdateTransaction={handleUpdateTransaction}
      />

      {/* Dispute Notice Packet Modal */}
      <DisputeModal
        transaction={disputeTransaction}
        onClose={() => setDisputeTransaction(null)}
        onDisputeSent={handleDisputeSent}
      />
    </div>
  );
}

```

---

## File: `src/main.tsx`

```typescript
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

```

---

## File: `src/index.css`

```css
@import "tailwindcss";

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  background-color: #f8fafc;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
}

```

---
