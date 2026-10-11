import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Mail, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';
import { CanonicalTransaction } from '../types/recon';
import { generateDisputeNotice } from '../utils/reconciliationEngine';

interface DisputeModalProps {
  transaction: CanonicalTransaction | null;
  onClose: () => void;
  onDisputeSent?: (txnId: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  transaction,
  onClose,
  onDisputeSent,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!transaction) return null;

  const noticeText = generateDisputeNotice(transaction);

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setIsSent(true);
    if (onDisputeSent) {
      onDisputeSent(transaction.id);
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Payment Aggregator Formal Dispute Packet
              </h3>
              <p className="text-xs text-slate-500">
                Auto-generated legal claim for {transaction.gateway} · Ticket Reference #DISP-{transaction.orderId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Preview Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {noticeText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Letter' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSent}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5 transition disabled:bg-emerald-600"
            >
              {isSent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Claim Dispatched to PG!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Formal Dispute with {transaction.gateway}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
