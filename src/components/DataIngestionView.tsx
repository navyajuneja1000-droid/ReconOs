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
