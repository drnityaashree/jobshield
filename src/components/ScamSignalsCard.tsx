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
  } = analysis;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans">
            Job Posting & Channel Risk Diagnostics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed inspection of compensation, recruiter communication channel, and suspicious vectors.
          </p>
        </div>

        {detectedJobTitle && (
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
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
              Sensitive Credentials
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
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
