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
