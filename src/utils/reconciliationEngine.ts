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
