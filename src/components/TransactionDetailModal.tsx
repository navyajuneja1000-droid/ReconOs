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
