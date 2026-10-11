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
