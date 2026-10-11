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
