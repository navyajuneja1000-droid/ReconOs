import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Building2, 
  HelpCircle,
  Calculator,
  ChevronDown,
  Bot,
  Download
} from 'lucide-react';
import { ReconciliationMetrics } from '../types/recon';
import { formatCompactINR } from '../utils/reconciliationEngine';

export type NavTab = 
  | 'dashboard' 
  | 'three-way' 
  | 'rate-card' 
  | 'exceptions' 
  | 'ingestion' 
  | 'audit-report' 
  | 'accounting'
  | 'pricing'
  | 'claude-export';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  metrics: ReconciliationMetrics;
  onRunRecon: () => void;
  isReconciling: boolean;
  onOpenTour: () => void;
  selectedMerchant: string;
  setSelectedMerchant: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  onRunRecon,
  isReconciling,
  onOpenTour,
  selectedMerchant,
  setSelectedMerchant,
}) => {
  const merchants = [
    'Bombay Threads & Lifestyle Co. (₹48 Cr GMV)',
    'UrbanCraft Modern Furniture (₹120 Cr GMV)',
    'NutriBites Healthy Foods (₹28 Cr GMV)'
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Recon Engine: Active
          </span>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Select Merchant"
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="bg-slate-800/90 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {merchants.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden md:inline">Settlement Cycle: <strong className="text-slate-200">T+1 to T+7 Continuous</strong></span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('claude-export')}
            className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded text-xs transition border ${
              activeTab === 'claude-export'
                ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-900/50'
                : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border-purple-500/30'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Share with Claude</span>
            <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded font-mono">Export</span>
          </button>

          <button
            onClick={onOpenTour}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded text-xs transition shadow-sm shadow-emerald-900/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Product Tour</span>
            <span className="bg-emerald-900/60 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-mono">Demo</span>
          </button>

          <button
            onClick={onRunRecon}
            disabled={isReconciling}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded text-xs transition ${
              isReconciling 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>{isReconciling ? 'Matching Transactions...' : 'Run Reconciliation'}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
            RO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">ReconOS</span>
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                MVP v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Order → PG Settlement → Bank Credit (3-Way Continuous)</p>
          </div>
        </div>

        {/* Live metric mini-chips */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reconciled GMV</span>
            <span className="font-mono font-bold text-emerald-400">{formatCompactINR(metrics.matchedGmv)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">({metrics.matchRatePct}%)</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Identified Leakage</span>
            <span className="font-mono font-bold text-amber-400">{formatCompactINR(metrics.totalRecoverableLeakage)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5 font-medium">({metrics.exceptionCount} breaks)</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rate-Card Variance</span>
            <span className="font-mono font-bold text-rose-400">{formatCompactINR(metrics.suspectedMdrOvercharge + metrics.gstVarianceTotal)}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Overcharged</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto text-xs font-medium border-t border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'dashboard'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('three-way')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'three-way'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          3-Way Transaction Match
        </button>

        <button
          onClick={() => setActiveTab('rate-card')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'rate-card'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Rate-Card Engine
          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0.2 rounded font-mono">The Sharp Edge</span>
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'exceptions'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <span>🚨 Exceptions & Disputes</span>
          <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 rounded-full font-mono">
            {metrics.exceptionCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ingestion')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'ingestion'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Data Ingestion & Schemas
        </button>

        <button
          onClick={() => setActiveTab('audit-report')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'audit-report'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          MDR Audit & Recovery Report
          <span className="bg-teal-500/20 text-teal-300 text-[9px] px-1 py-0.2 rounded font-mono">GTM Lead</span>
        </button>

        <button
          onClick={() => setActiveTab('accounting')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'accounting'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Tally / Zoho Accounting
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'pricing'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Business Model & ROI
        </button>

        <button
          onClick={() => setActiveTab('claude-export')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'claude-export'
              ? 'border-purple-500 text-purple-300 bg-purple-950/30'
              : 'border-transparent text-purple-400/80 hover:text-purple-200 hover:border-purple-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          <span>Export for Claude</span>
          <span className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
            Docs & Code
          </span>
        </button>
      </div>
    </header>
  );
};
