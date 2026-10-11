import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Coins,
  Building,
  TrendingDown
} from 'lucide-react';
import { NavTab } from './Navbar';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: NavTab) => void;
}

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      step: 1,
      badge: '01 · The Problem',
      title: 'The Books Drift, Silently — 0.3% to 1.2% GMV Lost',
      subtitle: 'Mid-market merchants running 2-4 payment aggregators cannot reconcile transaction by transaction.',
      icon: TrendingDown,
      color: 'from-rose-500/20 to-amber-500/20 text-rose-400 border-rose-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            A merchant collecting ₹25–500 Cr GMV runs 2–4 payment aggregators (Razorpay, PayU, Cashfree) alongside bank accounts. 
            Money leaves customer on <strong className="text-white">Day 0</strong> and reaches bank on <strong className="text-white">Day T+1 to T+7</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-white block">2–4 PGs</span>
              <span className="text-xs text-slate-400">Run in parallel with disparate settlement formats</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-rose-400 block">T+1 to T+7</span>
              <span className="text-xs text-slate-400">Days for cash to land after 5 layers of deductions</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-xl font-bold font-mono text-amber-400 block">0.3%–1.2%</span>
              <span className="text-xs text-slate-400">Of GMV sits in unexplained breaks & silent drift</span>
            </div>
          </div>
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-200 text-xs">
            <strong>The spreadsheet trap:</strong> Finance teams download 4–8 settlement files daily and match at batch level. 
            Nobody re-prices the invoice against the contract, so overcharges are silently absorbed into company books.
          </div>
        </div>
      ),
      actionLabel: 'Explore Dashboard Overview',
      targetTab: 'dashboard' as NavTab,
    },
    {
      step: 2,
      badge: '02 · Layer 1 & 2',
      title: 'Canonical Ingestion Across Order, PG & Bank',
      subtitle: 'Read-only architecture normalizing Shopify, Razorpay, PayU, and HDFC Bank into a single schema.',
      icon: Layers,
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            ReconOS sits outside RBI’s PA/PG perimeter by design — purely <strong>read-only data access</strong>, no nodal accounts, and no payout initiation.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <strong className="text-white">Order System:</strong> Shopify / WooCommerce order ID, timestamp, gross basket value, discount codes.
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <strong className="text-white">Payment Aggregators:</strong> Razorpay, PayU, Cashfree settlement batches, MDR deducted, GST on MDR, reserves, refunds.
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/70 rounded border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <strong className="text-white">Bank Feed:</strong> CBS bank credits, UTR reference number, account credit timestamp.
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Data Ingestion & Schemas',
      targetTab: 'ingestion' as NavTab,
    },
    {
      step: 3,
      badge: '03 · Matching Engine',
      title: '3-Way Match, Daily, at Transaction Level',
      subtitle: 'Deterministic 6-stage matching hierarchy prioritizing zero false matches over superficial automation.',
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Instead of matching batch totals in Excel, ReconOS matches every individual rupee from <strong>Order → PG Settlement → Bank Credit</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="font-semibold text-white block mb-1">Hierarchy Priority</span>
              <ol className="list-decimal list-inside text-slate-400 space-y-1">
                <li>Exact Payment ID</li>
                <li>Exact Order ID</li>
                <li>UTR / Bank Reference</li>
                <li>Settlement ID + Amount</li>
              </ol>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="font-semibold text-emerald-300 block mb-1">Conservative Safety</span>
              <p className="text-slate-400">
                A system that creates false matches introduces severe financial risk. ReconOS sends uncertain records straight to an explicit exception queue.
              </p>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'Inspect 3-Way Match Table',
      targetTab: 'three-way' as NavTab,
    },
    {
      step: 4,
      badge: '04 · The Sharp Edge',
      title: 'Rate-Card Engine: Turning Visibility into Rupee Recovery',
      subtitle: 'Re-prices every transaction by card type, network, issuer, MCC, EMI, and cross-border status.',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            The fundamental differentiator: a merchant cannot rely on the payment aggregator to audit its own fee invoices. 
            ReconOS recalculates what the fee <em>should</em> have been under the contracted rate card.
          </p>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200 text-xs space-y-1.5">
            <div className="font-bold text-sm">Example Detected Overcharge:</div>
            <div>• Mandated 0% RuPay Debit Card billed at 1.85% retail credit card rate</div>
            <div>• Inconsistent 18% GST calculation on exempt banking interchange</div>
            <div>• International cards billed at 3.50% when commercial contract capped at 2.80%</div>
          </div>
        </div>
      ),
      actionLabel: 'Test Rate-Card Engine',
      targetTab: 'rate-card' as NavTab,
    },
    {
      step: 5,
      badge: '05 · Exception Taxonomy',
      title: 'Fixed 11-Category Taxonomy, Ageing Clock & Dispute Packets',
      subtitle: 'Moves finance analysts from mind-numbing matching to structured exception resolution.',
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Every break lands in one standardized taxonomy with an assigned owner, ageing clock (T+1 to T+30+), and auto-generated dispute evidence.
          </p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {[
              'Fee Mismatch', 'GST-on-MDR Error', 'Refund Lag', 
              'Chargeback Deduction', 'Part-settlement', 'T+n Slippage', 
              'Missing UTR', 'Duplicate Credit', 'Reserve Hold', 
              'Missing Settlement', 'Amount Mismatch'
            ].map(cat => (
              <span key={cat} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                {cat}
              </span>
            ))}
          </div>
        </div>
      ),
      actionLabel: 'Open Exception Workspace',
      targetTab: 'exceptions' as NavTab,
    },
    {
      step: 6,
      badge: '06 · GTM & Commercials',
      title: 'Lead with the Audit, Not the Software',
      subtitle: 'SaaS subscription (₹15k–₹1.2L/mo) plus self-funding 15% recovery fee. Path to ₹7.4 Cr ARR.',
      icon: Coins,
      color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            The sales motion leads with: <em className="text-white">"Let us show you how much money your payment aggregators are overcharging or failing to settle."</em>
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Starter</span>
              <span className="font-bold text-white block">₹15,000/mo</span>
              <span className="text-[10px] text-slate-500">≤1L txns, 2 PGs</span>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-emerald-500/50 bg-emerald-950/20">
              <span className="text-emerald-400 block text-[10px] font-semibold">Growth (Popular)</span>
              <span className="font-bold text-white block">₹45,000/mo</span>
              <span className="text-[10px] text-slate-500">MDR Audit, Unlimited</span>
            </div>
            <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Scale</span>
              <span className="font-bold text-white block">₹1,20,000/mo</span>
              <span className="text-[10px] text-slate-500">&gt;10L txns, API, SSO</span>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Executive Audit & Recovery Report',
      targetTab: 'audit-report' as NavTab,
    },
  ];

  const current = tourSteps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-gradient-to-br ${current.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-400">
                {current.badge}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {current.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Tour"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <p className="text-xs sm:text-sm text-slate-400 font-medium mb-4">
            {current.subtitle}
          </p>
          {current.content}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {tourSteps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${s.step}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(c => c - 1)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}

            <button
              onClick={() => {
                onNavigateToTab(current.targetTab);
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-md flex items-center gap-1 font-medium transition"
            >
              {current.actionLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {currentStep < tourSteps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(c => c + 1)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow flex items-center gap-1 transition"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow flex items-center gap-1 transition"
              >
                Start Using ReconOS
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
