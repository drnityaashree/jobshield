import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  Building,
  Lock,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import { RiskBreakdown, CompanyResearchResult } from '../types';

interface RiskScoreCardProps {
  riskBreakdown: RiskBreakdown;
  companyResearch: CompanyResearchResult;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  riskBreakdown,
  companyResearch,
}) => {
  const {
    overallRiskScore,
    riskLevel,
    employerAuthenticityRisk,
    jobPostingContentRisk,
    recruitmentChannelRisk,
    impersonationRisk,
    rationale,
    recommendations,
    whyThisScore,
  } = riskBreakdown;

  const identityConfidence = companyResearch.identity_confidence;

  // Visual risk palette
  const getRiskTheme = (score: number) => {
    if (score <= 30) {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
        badgeBorder: 'border-emerald-300',
        gaugeColor: '#10b981',
        icon: ShieldCheck,
      };
    }
    if (score <= 60) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300',
        gaugeColor: '#f59e0b',
        icon: AlertTriangle,
      };
    }
    if (score <= 80) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-800',
        badgeBorder: 'border-orange-300',
        gaugeColor: '#ea580c',
        icon: ShieldAlert,
      };
    }
    return {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-300',
      gaugeColor: '#e11d48',
      icon: ShieldAlert,
    };
  };

  const theme = getRiskTheme(overallRiskScore);
  const RiskIcon = theme.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Banner with dual scores */}
      <div className={`p-6 border-b ${theme.border} ${theme.bg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main Scam Risk Score */}
          <div className="flex items-start sm:items-center space-x-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${theme.badgeBg} border ${theme.badgeBorder} shadow-sm shrink-0`}>
              <RiskIcon className={`w-9 h-9 ${theme.text}`} />
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                  {riskLevel}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Calculated Risk Index
                </span>
              </div>

              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
                  {overallRiskScore}
                </span>
                <span className="text-base text-slate-500 font-semibold">/ 100</span>
                <span className="text-sm font-medium text-slate-600 ml-2">
                  Scam Probability
                </span>
              </div>
            </div>
          </div>

          {/* Separate Employer Identity Confidence */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/90 flex items-center space-x-4 min-w-[260px]">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Building className="w-6 h-6 text-blue-600" />
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Employer Identity
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                  Autonomous
                </span>
              </div>

              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-bold text-slate-900">
                  {identityConfidence}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
                <span className="text-xs font-medium text-emerald-600 ml-1">
                  Confidence
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluated from public web, LinkedIn, & domain footprint
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Risk Gauges */}
      <div className="p-6 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Risk Factor Breakdown
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Content Risk */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700">Posting Content</span>
              <span className="font-bold text-slate-900 font-mono">{jobPostingContentRisk}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  jobPostingContentRisk > 50 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${jobPostingContentRisk}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Fees, deposits, sensitive data, or extreme urgency
            </p>
          </div>

          {/* Channel Risk */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700">Recruiting Channel</span>
              <span className="font-bold text-slate-900 font-mono">{recruitmentChannelRisk}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  recruitmentChannelRisk > 50 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${recruitmentChannelRisk}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              ATS vs corporate domain vs Telegram / Gmail
            </p>
          </div>

          {/* Impersonation Risk */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700">Impersonation Risk</span>
              <span className="font-bold text-slate-900 font-mono">{impersonationRisk}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  impersonationRisk > 50 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${impersonationRisk}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Domain mismatch between official brand & application
            </p>
          </div>

          {/* Authenticity Risk */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700">Footprint Void</span>
              <span className="font-bold text-slate-900 font-mono">{employerAuthenticityRisk}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  employerAuthenticityRisk > 50 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${employerAuthenticityRisk}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Inverse of verified public digital footprint
            </p>
          </div>
        </div>
      </div>

      {/* WHY THIS SCORE? Transparent Evidence Trace */}
      {whyThisScore && (
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2 mb-4">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              "Why This Score?" Transparent Evidence Trace
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive Safeguards */}
            <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Safeguards ({whyThisScore.positives.length})</span>
              </div>
              {whyThisScore.positives.length > 0 ? (
                <ul className="space-y-2.5">
                  {whyThisScore.positives.map((p, i) => (
                    <li key={i} className="text-xs text-slate-700">
                      <span className="font-bold text-emerald-950 block">{p.point}</span>
                      <span className="text-[11px] text-slate-500 leading-tight">{p.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No verified positive safeguards found.</p>
              )}
            </div>

            {/* Warning Indicators */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs">
              <div className="flex items-center space-x-2 text-amber-800 text-xs font-bold mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Caution Indicators ({whyThisScore.warnings.length})</span>
              </div>
              {whyThisScore.warnings.length > 0 ? (
                <ul className="space-y-2.5">
                  {whyThisScore.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-slate-700">
                      <span className="font-bold text-amber-950 block">{w.point}</span>
                      <span className="text-[11px] text-slate-500 leading-tight">{w.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No secondary warnings identified.</p>
              )}
            </div>

            {/* Critical Hazards */}
            <div className="bg-white rounded-xl p-4 border border-rose-200/80 shadow-2xs">
              <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold mb-3">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Critical Hazards ({whyThisScore.hazards.length})</span>
              </div>
              {whyThisScore.hazards.length > 0 ? (
                <ul className="space-y-2.5">
                  {whyThisScore.hazards.map((h, i) => (
                    <li key={i} className="text-xs text-rose-900">
                      <span className="font-bold text-rose-950 block">{h.point}</span>
                      <span className="text-[11px] text-rose-700 leading-tight">{h.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No critical extortion or task traps detected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rationale & Recommendations */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
        {/* Rationale */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            Evaluation Rationale
          </h4>
          <ul className="space-y-2">
            {rationale.map((item, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-600 flex items-start space-x-2 leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actionable Recommendations */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600" />
            Actionable Next Steps for Candidates
          </h4>
          <ul className="space-y-2.5">
            {recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-700 flex items-start space-x-2 font-medium leading-relaxed"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
