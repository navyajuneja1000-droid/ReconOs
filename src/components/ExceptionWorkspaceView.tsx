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
