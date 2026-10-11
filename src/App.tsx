import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Navbar, 
  NavTab 
} from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ThreeWayMatchView } from './components/ThreeWayMatchView';
import { RateCardEngineView } from './components/RateCardEngineView';
import { ExceptionWorkspaceView } from './components/ExceptionWorkspaceView';
import { DataIngestionView } from './components/DataIngestionView';
import { AuditReportView } from './components/AuditReportView';
import { AccountingExportView } from './components/AccountingExportView';
import { RoiCalculatorView } from './components/RoiCalculatorView';
import { ClaudeExportView } from './components/ClaudeExportView';
import { InteractiveTourModal } from './components/InteractiveTourModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { DisputeModal } from './components/DisputeModal';

import { 
  INITIAL_RATE_CARDS, 
  INITIAL_TRANSACTIONS 
} from './data/mockData';
import { 
  CanonicalTransaction, 
  RateCardRule 
} from './types/recon';
import { 
  calculateMetrics, 
  generateAuditSummary, 
  repriceTransaction 
} from './utils/reconciliationEngine';
import { Sparkles, Info, ShieldCheck, CheckCircle2, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [rateCards, setRateCards] = useState<RateCardRule[]>(INITIAL_RATE_CARDS);
  const [transactions, setTransactions] = useState<CanonicalTransaction[]>(INITIAL_TRANSACTIONS);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('Bombay Threads & Lifestyle Co. (₹48 Cr GMV)');
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CanonicalTransaction | null>(null);
  const [disputeTransaction, setDisputeTransaction] = useState<CanonicalTransaction | null>(null);
  const [reconToast, setReconToast] = useState<string | null>(null);

  // Compute live metrics
  const metrics = useMemo(() => {
    return calculateMetrics(transactions);
  }, [transactions]);

  // Compute live audit summary
  const auditData = useMemo(() => {
    return generateAuditSummary(transactions, selectedMerchant.split(' (')[0]);
  }, [transactions, selectedMerchant]);

  // Handle rate card updates
  const handleUpdateRateCards = (updatedRules: RateCardRule[]) => {
    setRateCards(updatedRules);
    // Recalculate transactions with new rate cards
    const repriced = transactions.map(t => repriceTransaction(t, updatedRules));
    setTransactions(repriced);
    showToast('Rate cards updated! All transactions re-priced successfully.');
  };

  // Handle single transaction update (e.g. status or owner change)
  const handleUpdateTransaction = (updatedTxn: CanonicalTransaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTxn.id ? updatedTxn : t));
    showToast(`Updated ${updatedTxn.orderId}: Status → ${updatedTxn.exceptionStatus || 'Updated'}`);
  };

  const handleDisputeSent = (txnId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          exceptionStatus: 'DISPUTED_WITH_PG',
          disputeNotes: 'Official formal claim dispatched to payment aggregator nodal cell via ReconOS.',
        };
      }
      return t;
    }));
    showToast('Formal dispute notice dispatched to Payment Aggregator!');
  };

  const showToast = (msg: string) => {
    setReconToast(msg);
    setTimeout(() => {
      setReconToast(null);
    }, 4000);
  };

  // Run full simulated reconciliation batch
  const handleRunRecon = () => {
    setIsReconciling(true);
    setTimeout(() => {
      // Re-price and re-evaluate
      const repriced = transactions.map(t => repriceTransaction(t, rateCards));
      setTransactions(repriced);
      setIsReconciling(false);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      showToast('Reconciliation Complete: 96.4% Auto-Match Rate · Zero Unsafe Matches');
    }, 1200);
  };

  // Simulate source feeds pull
  const handleSimulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Ingestion Feeds Synced: 14,820 orders, 14,820 settlement records, 68 CBS credits updated.');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Guided Demo Helper Callout Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-800/40 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>ReconOS Working Model & Interactive Demo:</strong> Every screen is clickable, functional, and grounded in the PRD & Pitch Deck specifications.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('claude-export')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Export for Claude (Files & Code)</span>
          </button>

          <button
            onClick={() => setIsTourOpen(true)}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Guided Product Tour</span>
          </button>
        </div>
      </div>

      {/* Main App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        onRunRecon={handleRunRecon}
        isReconciling={isReconciling}
        onOpenTour={() => setIsTourOpen(true)}
        selectedMerchant={selectedMerchant}
        setSelectedMerchant={setSelectedMerchant}
      />

      {/* Toast Notification */}
      {reconToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{reconToast}</span>
        </div>
      )}

      {/* Primary Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            transactions={transactions}
            onNavigateToTab={setActiveTab}
            onSelectTransaction={setSelectedTransaction}
            onRunRecon={handleRunRecon}
            isReconciling={isReconciling}
          />
        )}

        {activeTab === 'three-way' && (
          <ThreeWayMatchView
            transactions={transactions}
            onSelectTransaction={setSelectedTransaction}
            onRunRecon={handleRunRecon}
            isReconciling={isReconciling}
          />
        )}

        {activeTab === 'rate-card' && (
          <RateCardEngineView
            rateCards={rateCards}
            onUpdateRateCards={handleUpdateRateCards}
            transactions={transactions}
            onSelectTransaction={setSelectedTransaction}
            onOpenDispute={setDisputeTransaction}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionWorkspaceView
            transactions={transactions}
            onUpdateTransaction={handleUpdateTransaction}
            onSelectTransaction={setSelectedTransaction}
            onOpenDispute={setDisputeTransaction}
          />
        )}

        {activeTab === 'ingestion' && (
          <DataIngestionView
            onSimulateUpload={handleSimulateSync}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'audit-report' && (
          <AuditReportView
            auditData={auditData}
            transactions={transactions}
            merchantName={selectedMerchant.split(' (')[0]}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingExportView
            transactions={transactions}
          />
        )}

        {activeTab === 'pricing' && (
          <RoiCalculatorView />
        )}

        {activeTab === 'claude-export' && (
          <ClaudeExportView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">ReconOS</span>
            <span>·</span>
            <span>Multi-Gateway Settlement Reconciliation System</span>
            <span>·</span>
            <span className="text-emerald-500">Compliant by Design (RBI / DPDP Act)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsTourOpen(true)} className="hover:text-white transition">Product Tour</button>
            <button onClick={() => setActiveTab('claude-export')} className="text-purple-400 hover:text-purple-300 font-semibold transition flex items-center gap-1">
              <Bot className="w-3 h-3" />
              <span>Export for Claude</span>
            </button>
            <button onClick={() => setActiveTab('rate-card')} className="hover:text-white transition">Rate-Card Engine</button>
            <button onClick={() => setActiveTab('audit-report')} className="hover:text-white transition">Audit Report</button>
            <button onClick={() => setActiveTab('pricing')} className="hover:text-white transition">SaaS Model</button>
          </div>
        </div>
      </footer>

      {/* Interactive Tour Walkthrough Modal */}
      <InteractiveTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateToTab={setActiveTab}
      />

      {/* Transaction 3-Way Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onOpenDispute={setDisputeTransaction}
        onUpdateTransaction={handleUpdateTransaction}
      />

      {/* Dispute Notice Packet Modal */}
      <DisputeModal
        transaction={disputeTransaction}
        onClose={() => setDisputeTransaction(null)}
        onDisputeSent={handleDisputeSent}
      />
    </div>
  );
}
