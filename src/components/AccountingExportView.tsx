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
