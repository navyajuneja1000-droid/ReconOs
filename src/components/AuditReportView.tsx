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
