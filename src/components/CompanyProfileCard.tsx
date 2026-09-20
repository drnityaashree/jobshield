import React from 'react';
import {
  Building2,
  ExternalLink,
  Linkedin,
  Globe,
  Star,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { CompanyResearchResult, PresenceStatus } from '../types';

interface CompanyProfileCardProps {
  company: CompanyResearchResult;
}

export const CompanyProfileCard: React.FC<CompanyProfileCardProps> = ({ company }) => {
  const renderStatusBadge = (status: PresenceStatus) => {
    switch (status) {
      case 'VERIFIED_FOUND':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified Found
          </span>
        );
      case 'NOT_FOUND_AFTER_SEARCH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Not Found After Search
          </span>
        );
      case 'INACCESSIBLE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            Inaccessible
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            Not Applicable
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-slate-900 font-sans">
                  {company.company_name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium capitalize">
                  {company.company_source}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Normalized Identity: <span className="font-mono text-slate-700 font-semibold">{company.normalized_name}</span>
                {company.alternate_names?.length > 1 && (
                  <span className="ml-2 text-slate-400">
                    (Multi-angle variants: {company.alternate_names.slice(0, 3).join(', ')})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <span className="text-xs text-slate-500">Identity Score</span>
              <p className="text-base font-bold text-slate-900 font-mono">
                {company.identity_confidence}/100
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Verification Pillars */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
        {/* 1. Official Website Presence */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Official Website
                </span>
              </div>
              {renderStatusBadge(company.official_presence.status)}
            </div>

            {company.official_presence.websiteUrl ? (
              <div className="space-y-2 mt-2">
                <a
                  href={company.official_presence.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 break-all"
                >
                  <span>{company.official_presence.domain || company.official_presence.websiteUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                {company.official_presence.title && (
                  <p className="text-xs text-slate-600 font-medium">
                    {company.official_presence.title}
                  </p>
                )}
                {company.official_presence.evidence && company.official_presence.evidence.length > 0 && (
                  <ul className="text-[11px] text-slate-500 space-y-1 mt-2">
                    {company.official_presence.evidence.map((ev, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                No standalone verified corporate website discovered during autonomous web exploration. The entity may operate primarily via social/recruitment channels.
              </p>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
            Domain Confidence: <span className="font-semibold text-slate-700">{company.official_presence.confidence}%</span>
          </div>
        </div>

        {/* 2. LinkedIn Company Presence */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  LinkedIn Profile
                </span>
              </div>
              {renderStatusBadge(company.linkedin.status)}
            </div>

            {company.linkedin.url ? (
              <div className="space-y-2 mt-2">
                <a
                  href={company.linkedin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 break-all"
                >
                  <span>{company.linkedin.title || 'Verified LinkedIn Company Page'}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                <div className="space-y-1 text-xs text-slate-600 mt-2">
                  {company.linkedin.employees && (
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{company.linkedin.employees}</span>
                    </p>
                  )}
                  {company.linkedin.followers && (
                    <p className="text-slate-500">
                      Followers: <span className="font-medium text-slate-700">{company.linkedin.followers}</span>
                    </p>
                  )}
                  {company.linkedin.industry && (
                    <p className="text-slate-500">
                      Industry: <span className="font-medium text-slate-700">{company.linkedin.industry}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                LinkedIn corporate page was not indexed for this name variation during query execution.
              </p>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
            Profile Match: <span className="font-semibold text-slate-700">{company.linkedin.confidence}%</span>
          </div>
        </div>

        {/* 3. Reputation & Employee Reviews */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Reputation & Reviews
                </span>
              </div>
              {renderStatusBadge(company.reputation.status)}
            </div>

            {company.reputation.sources && company.reputation.sources.length > 0 ? (
              <div className="space-y-3 mt-2">
                {company.reputation.sources.slice(0, 2).map((rep, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{rep.platform}</span>
                      {rep.rating && (
                        <span className="font-bold text-amber-600 flex items-center gap-1 font-mono">
                          ★ {rep.rating.toFixed(1)} / 5
                        </span>
                      )}
                    </div>
                    {rep.url && (
                      <a
                        href={rep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>View {rep.reviewCount || 'Reviews'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                No third-party reviews (Glassdoor, AmbitionBox, Indeed) discovered for this specific name.
              </p>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
            Sentiment: <span className="font-semibold text-slate-700">{company.reputation.overallSentiment || 'Unrated'}</span>
          </div>
        </div>
      </div>

      {/* Consistency Audit Notes */}
      <div className="p-4 sm:p-6 bg-slate-50/70 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-800">Employer Consistency Analysis: </span>
          {company.company_consistency.notes.join(' ')}
        </div>
      </div>
    </div>
  );
};
