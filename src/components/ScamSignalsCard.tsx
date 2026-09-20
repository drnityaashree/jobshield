import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Send,
  CreditCard,
  Clock,
  Key,
  Shield,
  ExternalLink,
  GraduationCap,
  Link2,
  FileCheck,
  Lock,
} from 'lucide-react';
import { JobPostingAnalysis } from '../types';

interface ScamSignalsCardProps {
  analysis: JobPostingAnalysis;
}

export const ScamSignalsCard: React.FC<ScamSignalsCardProps> = ({ analysis }) => {
  const {
    detectedJobTitle,
    detectedCompensation,
    isCompensationSuspicious,
    paymentRequests,
    urgencySignals,
    sensitiveDataRequests,
    recruitmentChannel,
    recruiterIdentity,
    domainMismatch,
    atsIdentified,
    positiveSignals,
    warningSignals,
    criticalFlags,
    internshipAssessment,
    detectedUrls,
  } = analysis;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans">
            Job Posting & Channel Risk Diagnostics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deep analysis of compensation, recruiter communication channels, URL destinations, and student vulnerability patterns.
          </p>
        </div>

        {detectedJobTitle && (
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 shrink-0">
            Role: {detectedJobTitle}
          </span>
        )}
      </div>

      {/* CRITICAL ALERT: Upfront Payment Request */}
      {paymentRequests.detected && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4.5 text-rose-900 flex items-start space-x-3.5 shadow-sm">
          <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
              Critical Red Flag: Upfront Monetary Transaction Demanded
              <span className="text-xs px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-mono">
                {paymentRequests.feeType}
              </span>
            </h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {paymentRequests.details}
            </p>
            <p className="text-xs font-semibold text-rose-800 mt-2">
              Rule of Thumb: Legitimate employers, multinational corporations, and genuine startups NEVER charge candidates fees for training, registration, security deposits, or laptops.
            </p>
          </div>
        </div>
      )}

      {/* Internship & Student Opportunity Scanner */}
      {(internshipAssessment.isPayToIntern ||
        internshipAssessment.isTaskScamPattern ||
        internshipAssessment.isUnrealisticStipend ||
        internshipAssessment.isCertificateTrap) && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 text-amber-900">
          <div className="flex items-center space-x-2 mb-2">
            <GraduationCap className="w-5 h-5 text-amber-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Student & Internship Trap Flags Detected
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {internshipAssessment.isPayToIntern && (
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs">
                <span className="font-bold text-rose-700 block">Pay-to-Intern / Paid Certificate Trap</span>
                <span className="text-slate-600 text-[11px]">Charging students for internships or certificates is a predatory commercial trap, not genuine employment.</span>
              </div>
            )}
            {internshipAssessment.isTaskScamPattern && (
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs">
                <span className="font-bold text-rose-700 block">Daily Task Scam Vector</span>
                <span className="text-slate-600 text-[11px]">Promises quick cash for liking videos, writing fake reviews, or Telegram tasks. Culminates in frozen withdrawals.</span>
              </div>
            )}
            {internshipAssessment.isUnrealisticStipend && (
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs">
                <span className="font-bold text-amber-800 block">Inflated Compensation Bait</span>
                <span className="text-slate-600 text-[11px]">Unusually high compensation offered for simple entry or data typing tasks to lure unsuspecting candidates.</span>
              </div>
            )}
            {internshipAssessment.isCertificateTrap && (
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs">
                <span className="font-bold text-amber-800 block">Experience Letter / Certificate Trap</span>
                <span className="text-slate-600 text-[11px]">Charges for experience certificates or promises placement only after completing unpaid cycles.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid of Key Vectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recruitment Channel */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <Send className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recruitment Channel
            </span>
          </div>

          <div className="mt-2">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md border ${
                recruitmentChannel.isHighRisk
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : atsIdentified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              {recruitmentChannel.channelName}
            </span>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {recruitmentChannel.details}
            </p>
          </div>
        </div>

        {/* Recruiter Email & Domain */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recruiter Communication
            </span>
          </div>

          <div className="mt-2">
            {recruiterIdentity?.email ? (
              <div>
                <p className="text-xs font-mono font-semibold text-slate-800 break-all">
                  {recruiterIdentity.email}
                </p>
                <span
                  className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded mt-1.5 border ${
                    recruiterIdentity.emailType === 'corporate'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : recruiterIdentity.emailType === 'free_mail'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {recruiterIdentity.emailType === 'corporate'
                    ? 'Verified Corporate Domain'
                    : recruiterIdentity.emailType === 'free_mail'
                    ? 'Free Webmail Service'
                    : 'Suspicious TLD Domain'}
                </span>
                <p className="text-xs text-slate-500 mt-1.5">
                  {recruiterIdentity.emailType === 'free_mail'
                    ? 'Free webmail does not prove corporate affiliation. Scammers frequently use public webmail to impersonate brands.'
                    : 'Originates from an authenticated corporate email server.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                No direct recruiter email address detected in the job posting text.
              </p>
            )}
          </div>
        </div>

        {/* Sensitive Information & Compensation */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <Key className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pre-Offer Privacy Shield
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {sensitiveDataRequests.detected ? (
              <div>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                  Premature Data Request
                </span>
                <p className="text-xs text-rose-700 mt-1">
                  Demands: {sensitiveDataRequests.items.join(', ')}.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Do not share national IDs or bank details before a verified offer letter.
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No premature banking/ID credentials requested</span>
              </div>
            )}

            {detectedCompensation && (
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">Stated Compensation: </span>
                <span className="font-mono font-semibold text-slate-900">{detectedCompensation}</span>
                {isCompensationSuspicious && (
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                    Warning: Compensation is disproportionately high for stated qualifications.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destination URLs Inspection Table */}
      {detectedUrls && detectedUrls.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              Detected Application URLs ({detectedUrls.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Verified against certified ATS registries and domain safeguards
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {detectedUrls.map((urlItem, idx) => (
              <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900 truncate max-w-md">
                      {urlItem.domain}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        urlItem.type === 'ats'
                          ? 'bg-emerald-100 text-emerald-800'
                          : urlItem.type === 'official_site'
                          ? 'bg-blue-100 text-blue-800'
                          : urlItem.type === 'unbranded_form'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {urlItem.platformName || urlItem.type.toUpperCase()}
                    </span>
                  </div>
                  {urlItem.warning && (
                    <p className="text-[11px] text-rose-600">{urlItem.warning}</p>
                  )}
                </div>

                <a
                  href={urlItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium shrink-0"
                >
                  <span>Inspect Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain Mismatch Warning if present */}
      {domainMismatch.detected && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h5 className="font-bold uppercase tracking-wider text-amber-800">
              Impersonation Alert: Domain Divergence Detected
            </h5>
            <p className="mt-1 leading-relaxed">{domainMismatch.explanation}</p>
          </div>
        </div>
      )}

      {/* Signal Lists: Positive, Warning, Critical */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Positive Signals */}
        <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4">
          <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Verified Safeguards ({positiveSignals.length})
          </h5>
          <ul className="text-xs text-emerald-900 space-y-1.5">
            {positiveSignals.map((sig, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning Signals */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4">
          <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Warning Flags ({warningSignals.length})
          </h5>
          {warningSignals.length > 0 ? (
            <ul className="text-xs text-amber-900 space-y-1.5">
              {warningSignals.map((sig, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{sig}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No secondary warning anomalies identified.</p>
          )}
        </div>

        {/* Critical Flags */}
        <div className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-4">
          <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Critical Hazards ({criticalFlags.length})
          </h5>
          {criticalFlags.length > 0 ? (
            <ul className="text-xs text-rose-900 space-y-1.5">
              {criticalFlags.map((sig, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span className="font-semibold">{sig}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Zero critical scam triggers present.</p>
          )}
        </div>
      </div>
    </div>
  );
};
