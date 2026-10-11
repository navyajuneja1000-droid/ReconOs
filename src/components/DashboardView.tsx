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
