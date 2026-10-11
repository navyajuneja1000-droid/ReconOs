import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Code2, 
  Layers, 
  Sparkles, 
  Bot, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  BookOpen,
  Share2,
  Terminal,
  FileCode,
  Zap
} from 'lucide-react';

interface FileDownloadItem {
  id: string;
  name: string;
  filename: string;
  path: string;
  sizeDesc: string;
  badge: string;
  badgeColor: string;
  description: string;
  claudeUseCases: string[];
}

export const ClaudeExportView: React.FC = () => {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<'all' | 'spec' | 'flow' | 'code'>('all');
  const [previewContent, setPreviewContent] = useState<string>('Loading document preview...');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const downloadableFiles: FileDownloadItem[] = [
    {
      id: 'all-in-one',
      name: 'Master All-in-One Context Bundle',
      filename: 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
      path: '/downloads/RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
      sizeDesc: '~55 KB Markdown',
      badge: 'Recommended for Claude',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description: 'The complete system in a single document: Executive overview, PRD specification, architecture diagrams, mathematical equations, 11-category exception taxonomy, and complete source code.',
      claudeUseCases: [
        'Single drag-and-drop into any Claude chat or Project',
        'Ask Claude to build new features, backend APIs, or connectors',
        'Ask Claude to audit compliance with RBI and Indian GST regulations'
      ]
    },
    {
      id: 'master-spec',
      name: 'Functional PRD & Market Specification',
      filename: 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
      path: '/downloads/RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
      sizeDesc: '~14 KB Markdown',
      badge: 'Product Requirements',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Deep-dive into the market problem, mid-market D2C merchant pain points, the 11-category deterministic taxonomy, rate-card mechanics, accounting rules, and SaaS commercial tiers.',
      claudeUseCases: [
        'Claude project knowledge base for product management',
        'Refining GTM pitch decks, customer battlecards, and sales scripts',
        'Creating customer onboarding checklists and training guides'
      ]
    },
    {
      id: 'e2e-flow',
      name: 'End-to-End Flow & Architecture',
      filename: 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
      path: '/downloads/RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
      sizeDesc: '~11 KB Markdown',
      badge: 'Technical Blueprint',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description: 'Step-by-step 7-stage pipeline walkthrough from Day 0 order capture to Day T+7 bank credit settlement, rate-card mathematical variance algorithms, and state machines.',
      claudeUseCases: [
        'Ask Claude to architect a high-throughput backend in Go or Node.js',
        'Ask Claude to generate database migration schemas in PostgreSQL',
        'Ask Claude to design webhook receivers with idempotency guarantees'
      ]
    },
    {
      id: 'codebase-bundle',
      name: 'Complete Source Codebase Bundle',
      filename: 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md',
      path: '/downloads/RECONOS_COMPLETE_CODEBASE_BUNDLE.md',
      sizeDesc: '~38 KB Markdown',
      badge: '100% Production Code',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description: 'Full code of every file in the project (React 19, TypeScript, Tailwind, Reconciliation engine, mock data, modals, and export generators).',
      claudeUseCases: [
        'Ask Claude to write automated Vitest unit & integration test suites',
        'Ask Claude to refactor or add new payment aggregators (e.g. Pine Labs, PhonePe)',
        'Code quality reviews, security audits, and type-safety validations'
      ]
    }
  ];

  // Fetch document preview on tab switch
  React.useEffect(() => {
    const fetchDoc = async () => {
      setIsLoadingPreview(true);
      const filenameMap = {
        all: 'RECONOS_ALL_IN_ONE_FOR_CLAUDE.md',
        spec: 'RECONOS_CLAUDE_MASTER_SPECIFICATION.md',
        flow: 'RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md',
        code: 'RECONOS_COMPLETE_CODEBASE_BUNDLE.md'
      };
      try {
        const res = await fetch(`/downloads/${filenameMap[selectedPreviewDoc]}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        } else {
          setPreviewContent('Unable to load document preview. Please use the direct download buttons above.');
        }
      } catch (err) {
        setPreviewContent('Failed to fetch document. Please use the direct download buttons.');
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchDoc();
  }, [selectedPreviewDoc]);

  const handleDownload = async (file: FileDownloadItem) => {
    try {
      const res = await fetch(file.path);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 300);

      setDownloadSuccessId(file.id);
      setTimeout(() => setDownloadSuccessId(null), 4000);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback
      window.open(file.path, '_blank');
    }
  };

  const handleCopyFileContent = async (file: FileDownloadItem) => {
    try {
      const res = await fetch(file.path);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 3500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < downloadableFiles.length; i++) {
      await handleDownload(downloadableFiles[i]);
      await new Promise(r => setTimeout(r, 350));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Bot className="w-3 h-3" />
                Anthropic Claude Knowledge Base & Share Center
              </span>
              <span className="text-xs text-slate-400">Zero Configuration Needed</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Everything to Claude
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Download clean, pre-bundled Markdown packages containing the complete PRD, functional specifications, end-to-end data pipelines, mathematical formulas, and full production codebase ready to share with Claude.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload(downloadableFiles[0])}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 flex items-center gap-2 transition hover:scale-102"
            >
              <Download className="w-4 h-4" />
              <span>{downloadSuccessId === 'all-in-one' ? '✓ Master File Downloaded!' : 'Download Master Bundle (.md)'}</span>
            </button>

            <button
              onClick={() => handleCopyFileContent(downloadableFiles[0])}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-2 transition shadow-sm"
            >
              {copiedFileId === 'all-in-one' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedFileId === 'all-in-one' ? '✓ Copied to Clipboard!' : 'Copy Master File (Ctrl+V)'}</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="px-3 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download All 4</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step "How to Download & Use in Claude" Visual Guide */}
        <div className="mt-6 pt-5 border-t border-purple-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div>
              <strong className="text-white block mb-0.5">Click "Download Master Bundle"</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Click the purple button above. Your browser will immediately download <code className="text-purple-300">RECONOS_ALL_IN_ONE_FOR_CLAUDE.md</code> to your computer.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div>
              <strong className="text-white block mb-0.5">Drag & Drop into Claude</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Open <a href="https://claude.ai" target="_blank" rel="noreferrer" className="text-purple-400 underline">claude.ai</a>, start a new chat (or open your Claude Project), and drag the file directly into the message box.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div>
              <strong className="text-white block mb-0.5">Or Use "Copy Master File"</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Don't want to save a file? Click <strong className="text-emerald-400">"Copy Master File"</strong>, then simply press <code className="text-purple-300">Ctrl+V</code> (or <code className="text-purple-300">Cmd+V</code>) in Claude to paste everything.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {downloadableFiles.map((file) => {
          const isCopied = copiedFileId === file.id;
          const isDownloaded = downloadSuccessId === file.id;

          return (
            <div
              key={file.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${file.badgeColor}`}>
                    {file.badge}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{file.sizeDesc}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-400 transition">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  {file.description}
                </p>

                {/* Key Use cases for Claude */}
                <div className="mb-4 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">What Claude can do with this:</span>
                  {file.claudeUseCases.map((uc, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{uc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                  {file.filename}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyFileContent(file)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition flex items-center gap-1"
                    title="Copy full contents to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(file)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{isDownloaded ? 'Downloaded' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Prompts for Claude */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Recommended Prompts to Ask Claude Once Uploaded
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div 
            onClick={() => {
              navigator.clipboard.writeText("Review the ReconOS 11-category exception taxonomy and rate-card engine. How can we add support for Pine Labs PoS and PhonePe PG settlements, including UPI Intent vs QR fee structures?");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>PG Expansion</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Review the ReconOS 11-category exception taxonomy and rate-card engine. How can we add support for Pine Labs PoS and PhonePe PG settlements, including UPI Intent vs QR fee structures?&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Based on the mathematical formulas in RECONOS_END_TO_END_FLOW_AND_ARCHITECTURE.md, generate a complete Vitest automated test suite covering all edge cases for domestic card interchange, GST on flat fee, and RuPay debit zero-MDR compliance.");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>Automated Testing</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Based on the mathematical formulas in the architecture doc, generate a complete Vitest automated test suite covering edge cases for domestic card interchange, GST on flat fees, and RuPay debit zero-MDR compliance.&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Design a scalable production backend for ReconOS using Node.js/TypeScript, PostgreSQL (with Drizzle ORM), BullMQ for settlement file parsing, and S3 for raw MT940 statement storage. Provide database migrations for the canonical transactions and audit tables.");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>Backend Architecture</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Design a scalable production backend for ReconOS using Node.js/TypeScript, PostgreSQL (with Drizzle ORM), BullMQ for settlement file parsing, and S3 for raw MT940 statement storage.&rdquo;
            </p>
          </div>

          <div 
            onClick={() => {
              navigator.clipboard.writeText("Analyze the Tally Prime XML voucher generation logic in AccountingExportView.tsx. How does it handle GST Input Tax Credit (ITC) reconciliation with GSTR-2B under Section 16(2)(aa) of the CGST Act?");
              alert("Copied prompt to clipboard!");
            }}
            className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-1">
              <span>GST & Audit Compliance</span>
              <Copy className="w-3 h-3 group-hover:text-purple-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              &ldquo;Analyze the Tally Prime XML voucher generation logic. How does it handle GST Input Tax Credit (ITC) reconciliation with GSTR-2B under Section 16(2)(aa) of the CGST Act?&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Live Document Preview Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Live Document Viewer & Inspector
            </h3>
          </div>

          {/* Document switcher tabs */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSelectedPreviewDoc('all')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'all'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Master All-in-One
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('spec')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'spec'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              PRD Specification
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('flow')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'flow'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              E2E Flow & Arch
            </button>
            <button
              onClick={() => setSelectedPreviewDoc('code')}
              className={`px-3 py-1 rounded transition ${
                selectedPreviewDoc === 'code'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Codebase Bundle
            </button>
          </div>
        </div>

        {/* Document Content View */}
        <div className="p-5 max-h-[500px] overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-purple-600 selection:text-white">
          {isLoadingPreview ? (
            <div className="text-center py-12 text-slate-500">Loading document preview...</div>
          ) : (
            previewContent
          )}
        </div>
      </div>
    </div>
  );
};
