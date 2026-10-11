import React, { useState } from 'react';
import { 
  Calculator, 
  Check, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  Building, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatINR, formatCompactINR } from '../utils/reconciliationEngine';

export const RoiCalculatorView: React.FC = () => {
  const [annualGmvCr, setAnnualGmvCr] = useState<number>(48); // ₹48 Cr
  const [leakagePct, setLeakagePct] = useState<number>(0.65); // 0.65% standard
  const [selectedTier, setSelectedTier] = useState<'STARTER' | 'GROWTH' | 'SCALE'>('GROWTH');

  const gmvRupees = annualGmvCr * 10000000;
  const estimatedLeakage = (gmvRupees * leakagePct) / 100;
  
  const tierPricing = {
    STARTER: { monthly: 15000, annual: 180000, name: 'Starter', limit: '≤ 1L txns/mo · 2 PGs' },
    GROWTH: { monthly: 45000, annual: 540000, name: 'Growth (Recommended)', limit: '≤ 10L txns/mo · Unlimited PGs · MDR Audit' },
    SCALE: { monthly: 120000, annual: 1440000, name: 'Scale', limit: '> 10L txns/mo · API · SSO · Dedicated Engineer' },
  };

  const selectedTierData = tierPricing[selectedTier];
  const implementationFee = 50000;
  const recoveryFee15Pct = estimatedLeakage * 0.15;
  const totalCustomerCost = selectedTierData.annual + implementationFee + recoveryFee15Pct;
  const netMerchantGain = estimatedLeakage - totalCustomerCost;
  const roiMultiple = totalCustomerCost > 0 ? (estimatedLeakage / totalCustomerCost).toFixed(1) : '1.0';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Commercial Architecture · Pitch Deck Slides 08 & 09
              </span>
              <span className="text-xs text-slate-500">Self-Funding Economic Model</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              SaaS Pricing, Self-Funding Recovery & ROI Calculator
            </h2>
            <p className="text-xs text-slate-500">
              How mid-market merchants fund ReconOS purely from identified and recovered leakage
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              Blended ACV: ₹3.0 Lakhs · 80% Gross Margin
            </span>
          </div>
        </div>
      </div>

      {/* Interactive ROI Calculator Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-white">
            Interactive Merchant ROI & Payback Simulation
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300">Merchant Annual Online GMV:</span>
                <span className="font-mono text-emerald-400 text-sm font-bold">₹{annualGmvCr} Crores</span>
              </div>
              <input
                type="range"
                min={25}
                max={500}
                step={5}
                value={annualGmvCr}
                onChange={(e) => setAnnualGmvCr(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>₹25 Cr (Target ICP min)</span>
                <span>₹250 Cr</span>
                <span>₹500 Cr (Mid-market cap)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300">Observed Settlement & MDR Drift:</span>
                <span className="font-mono text-amber-400 text-sm font-bold">{leakagePct}% of GMV</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={1.2}
                step={0.05}
                value={leakagePct}
                onChange={(e) => setLeakagePct(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.30% (Best Case)</span>
                <span>0.65% (ReconOS Industry Benchmark)</span>
                <span>1.20% (High Complexity)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select SaaS Plan Tier:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['STARTER', 'GROWTH', 'SCALE'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      selectedTier === tier
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-[10px] block font-mono uppercase">{tier}</span>
                    <span className="font-bold text-white block">₹{(tierPricing[tier].monthly / 1000)}k/mo</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROI Outputs */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="text-slate-400">Total Unexplained Annual Leakage:</span>
                <span className="font-mono text-lg font-bold text-rose-400">
                  {formatINR(estimatedLeakage)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">ReconOS Annual Subscription:</span>
                <span className="font-mono text-white">
                  {formatINR(selectedTierData.annual)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">One-time Implementation:</span>
                <span className="font-mono text-white">
                  ₹50,000
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">15% Self-Funding Recovery Fee:</span>
                <span className="font-mono text-white">
                  {formatINR(recoveryFee15Pct)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="font-bold text-emerald-400">Net Merchant Value Returned:</span>
                <span className="font-mono text-xl font-black text-emerald-400">
                  {formatINR(netMerchantGain)}
                </span>
              </div>
            </div>

            <div className="mt-5 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-center">
              <span className="text-[11px] text-emerald-300 uppercase font-bold tracking-wider block">
                Estimated Year 1 Return On Investment
              </span>
              <span className="text-3xl font-black font-mono text-white block my-0.5">
                {roiMultiple}x ROI
              </span>
              <span className="text-[11px] text-slate-400">
                Fully paid back in less than 45 days through recovered gateway leakage.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* The Three SaaS Tiers Grid from Deck Slide 08 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Starter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Starter Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹15,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Designed for early mid-market D2C merchants launching multi-gateway operations.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Up to 1,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>2 Payment Aggregators</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Daily 3-way matching engine</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Standard exception queue</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('STARTER')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Select Starter
          </button>
        </div>

        {/* Growth (Most Popular) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl p-6 flex flex-col justify-between shadow-md relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
            Most Popular
          </span>
          <div>
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Growth Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹45,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Full transaction-level re-pricing with automated rate-card validation & recovery.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Up to 10,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Unlimited Payment Aggregators</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Rate-Card Re-pricing Engine (Sharp Edge)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Tally & Zoho Books auto-export</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Automated dispute letter generation</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('GROWTH')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
          >
            Select Growth Plan
          </button>
        </div>

        {/* Scale */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Scale Tier</span>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">₹1,20,000</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enterprise volume reconciliation with direct REST APIs and SSO governance.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>&gt; 10,00,000 transactions / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Direct Webhooks & Scheduled SFTP Ingestion</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Custom ERP & NetSuite / SAP Connectors</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Dedicated Payments Operations Partner</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTier('SCALE')}
            className="w-full mt-6 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Select Scale
          </button>
        </div>
      </div>
    </div>
  );
};
