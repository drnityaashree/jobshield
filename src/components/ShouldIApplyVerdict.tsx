import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Share2,
  CheckCircle2,
  Building,
  Briefcase,
  UserCheck,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { CompanyResearchResult, JobPostingAnalysis, RiskBreakdown } from '../types';

interface ShouldIApplyVerdictProps {
  verdict: JobPostingAnalysis['verdict'];
  riskBreakdown: RiskBreakdown;
  companyResearch: CompanyResearchResult;
  jobAnalysis: JobPostingAnalysis;
  onOpenShare: () => void;
}

export const ShouldIApplyVerdict: React.FC<ShouldIApplyVerdictProps> = ({
  verdict,
  riskBreakdown,
  companyResearch,
  jobAnalysis,
  onOpenShare,
}) => {
  const [copied, setCopied] = useState(false);

  const getStyle = () => {
    switch (verdict.status) {
      case 'SAFE_TO_APPLY':
        return {
          bannerBg: 'bg-emerald-900 text-white',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          cardBg: 'bg-emerald-950/40 border-emerald-800',
          icon: ShieldCheck,
          accentColor: 'text-emerald-400',
          titleColor: 'text-emerald-300',
          tag: 'VERIFIED OPPORTUNITY',
        };
      case 'PROCEED_WITH_CAUTION':
        return {
          bannerBg: 'bg-amber-950 text-white',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          cardBg: 'bg-amber-950/40 border-amber-800',
          icon: AlertTriangle,
          accentColor: 'text-amber-400',
          titleColor: 'text-amber-300',
          tag: 'VERIFICATION RECOMMENDED',
        };
      case 'DO_NOT_APPLY':
      default:
        return {
          bannerBg: 'bg-rose-950 text-white',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          cardBg: 'bg-rose-950/40 border-rose-800',
          icon: ShieldAlert,
          accentColor: 'text-rose-400',
          titleColor: 'text-rose-300',
          tag: 'HIGH-RISK HAZARD',
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  const handleQuickCopy = () => {
    const text = `🛡️ JobShield Safety Verdict for ${companyResearch.company_name}
Status: ${verdict.title}
Risk Score: ${riskBreakdown.overallRiskScore}/100 (${riskBreakdown.riskLevel})
Company Identity: ${companyResearch.identity_confidence}/100 Confidence
Action: ${verdict.actionGuidance}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border ${style.cardBg} ${style.bannerBg} shadow-lg p-6 sm:p-7 relative overflow-hidden`}>
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10 space-y-6">
        {/* Top Header: Tag, Title, and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${style.badgeBg}`}>
                {style.tag}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Student Decision Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3 mt-2">
              <Icon className={`w-8 h-8 ${style.accentColor} shrink-0`} />
              <span>{verdict.title}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors"
              title="Copy quick summary to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Quick Copy'}</span>
            </button>

            <button
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Dossier</span>
            </button>
          </div>
        </div>

        {/* 10-Second Executive Summary */}
        <div className="text-sm text-slate-200 leading-relaxed max-w-4xl">
          <p className="font-medium text-white">{verdict.summary}</p>
        </div>

        {/* 4-Pillar Status Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Pillar 1: Employer Authenticity */}
          <div className="bg-black/30 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
              <Building className="w-4 h-4 text-blue-400" />
              <span>Employer</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">
                {companyResearch.identity_confidence >= 70
                  ? 'Verified Real'
                  : companyResearch.identity_confidence >= 40
                  ? 'Limited Record'
                  : 'Unverified'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {companyResearch.identity_confidence}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              {companyResearch.official_presence.domain || 'No domain verified'}
            </p>
          </div>

          {/* Pillar 2: Job Opening Legitimacy */}
          <div className="bg-black/30 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Opening</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">
                {jobAnalysis.atsIdentified
                  ? 'Certified ATS'
                  : jobAnalysis.careersPageMatch?.found
                  ? 'Careers Match'
                  : 'Direct Post'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {jobAnalysis.paymentRequests.detected ? 'Scam Vector' : 'Standard'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              {jobAnalysis.atsIdentified || (jobAnalysis.paymentRequests.detected ? 'Demands Fee' : 'Zero Fee')}
            </p>
          </div>

          {/* Pillar 3: Recruiter Affiliation */}
          <div className="bg-black/30 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Recruiter</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">
                {jobAnalysis.recruiterIdentity?.emailType === 'corporate'
                  ? 'Corporate'
                  : jobAnalysis.recruiterIdentity?.emailType === 'free_mail'
                  ? 'Personal Gmail'
                  : 'Unstated'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {jobAnalysis.recruiterIdentity?.emailType === 'corporate' ? 'Verified' : 'Unauthenticated'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              {jobAnalysis.recruiterIdentity?.email || 'No email specified'}
            </p>
          </div>

          {/* Pillar 4: Application Channel Safety */}
          <div className="bg-black/30 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Channel</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">
                {jobAnalysis.recruitmentChannel.isHighRisk
                  ? 'High Risk'
                  : jobAnalysis.domainMismatch.detected
                  ? 'Divergent'
                  : 'Standard'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {jobAnalysis.recruitmentChannel.channelName.split(' ')[0]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              {jobAnalysis.domainMismatch.detected ? 'Domain mismatch' : 'Channel matches'}
            </p>
          </div>
        </div>

        {/* Immediate Next Action Guidance */}
        <div className="bg-white/10 rounded-xl p-4 border border-white/15 flex items-start space-x-3.5">
          <CheckCircle2 className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200">
            <span className="font-bold text-white uppercase tracking-wider block mb-0.5">
              Candidate Action Directive:
            </span>
            <p className="leading-relaxed text-slate-100 font-medium">{verdict.actionGuidance}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
