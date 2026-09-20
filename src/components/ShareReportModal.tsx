import React, { useState } from 'react';
import { X, Copy, Check, Printer, MessageSquare, FileText } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalyzeResponse;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({ isOpen, onClose, result }) => {
  const [copiedFormat, setCopiedFormat] = useState<'whatsapp' | 'markdown' | null>(null);

  if (!isOpen) return null;

  const { companyResearch, jobAnalysis, riskBreakdown, searchDiagnostics } = result;

  const generateWhatsAppText = () => {
    return `*🛡️ JOBSHIELD VERIFICATION DOSSIER*
*Employer:* ${companyResearch.company_name}
*Verdict:* ${jobAnalysis.verdict.title}
*Scam Risk:* ${riskBreakdown.overallRiskScore}/100 (${riskBreakdown.riskLevel})
*Employer Confidence:* ${companyResearch.identity_confidence}/100

*Key Facts:*
• Official Website: ${companyResearch.official_presence.domain || 'Not verified'}
• ATS/Channel: ${jobAnalysis.recruitmentChannel.channelName}
• Upfront Fee: ${jobAnalysis.paymentRequests.detected ? '🚨 YES: ' + jobAnalysis.paymentRequests.feeType : '✅ ₹0 (No Fee Requested)'}
• Recruiter: ${jobAnalysis.recruiterIdentity?.email || 'Not specified'}

*Recommended Action:*
${jobAnalysis.verdict.actionGuidance}

_Generated via JobShield AI (Autonomous Job Scam & Employer Verification Engine)_`;
  };

  const generateMarkdownText = () => {
    return `# JobShield Verification Report
**Employer:** ${companyResearch.company_name}  
**Date:** ${new Date(searchDiagnostics.timestamp).toLocaleDateString()}  
**Verdict:** ${jobAnalysis.verdict.title}  
**Overall Scam Risk:** ${riskBreakdown.overallRiskScore}/100 (${riskBreakdown.riskLevel})  
**Employer Identity Confidence:** ${companyResearch.identity_confidence}/100  

---

## Analysis Summary
- **Official Domain:** ${companyResearch.official_presence.domain || 'Unverified'}
- **Recruiter Contact:** ${jobAnalysis.recruiterIdentity?.email || 'None provided'} (${jobAnalysis.recruiterIdentity?.emailType || 'unknown'})
- **Application Channel:** ${jobAnalysis.recruitmentChannel.channelName}
- **Fee Demanded:** ${jobAnalysis.paymentRequests.detected ? 'CRITICAL HAZARD - ' + jobAnalysis.paymentRequests.details : 'None (Legitimate standard)'}

## Actionable Recommendation
${jobAnalysis.verdict.actionGuidance}
`;
  };

  const handleCopy = (format: 'whatsapp' | 'markdown') => {
    const text = format === 'whatsapp' ? generateWhatsAppText() : generateMarkdownText();
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              Share Verification Dossier
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share this report with parents, college placement coordinators, or classmates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Action Buttons */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleCopy('whatsapp')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              {copiedFormat === 'whatsapp' ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              <span>{copiedFormat === 'whatsapp' ? 'Copied to Clipboard!' : 'Copy for WhatsApp / Chat'}</span>
            </button>

            <button
              onClick={() => handleCopy('markdown')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {copiedFormat === 'markdown' ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>{copiedFormat === 'markdown' ? 'Copied Markdown' : 'Copy Formatted Text'}</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print or Save as PDF</span>
          </button>

          {/* Preview Box */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Message Preview:
            </label>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-64 overflow-y-auto select-all">
              {generateWhatsAppText()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
