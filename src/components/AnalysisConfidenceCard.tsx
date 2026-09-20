import React from 'react';
import { Gauge, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { AnalysisConfidenceInfo } from '../types';

interface Props {
  confidence: AnalysisConfidenceInfo;
}

export const AnalysisConfidenceCard: React.FC<Props> = ({ confidence }) => {
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return {
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          bar: 'bg-emerald-500',
          label: 'High Confidence',
        };
      case 'MEDIUM':
        return {
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          bar: 'bg-amber-500',
          label: 'Medium Confidence',
        };
      default:
        return {
          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          bar: 'bg-zinc-500',
          label: 'Low / Sparse Data',
        };
    }
  };

  const badge = getLevelBadge(confidence.level);

  return (
    <div id="analysis-confidence-card" className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Analysis Confidence Level</h4>
            <span className="text-[11px] text-zinc-400">Statistical data sufficiency</span>
          </div>
        </div>

        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.color}`}>
          {badge.label} ({confidence.score}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full transition-all duration-500 ${badge.bar}`}
            style={{ width: `${confidence.score}%` }}
          />
        </div>
      </div>

      {/* Data Coverage Checklist */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2">
          {confidence.dataCoverage.employerPresence ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span className={confidence.dataCoverage.employerPresence ? 'text-zinc-300' : 'text-zinc-500'}>
            Employer Web Index
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2">
          {confidence.dataCoverage.channelIdentified ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span className={confidence.dataCoverage.channelIdentified ? 'text-zinc-300' : 'text-zinc-500'}>
            Channel Classified
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2">
          {confidence.dataCoverage.jobSpecificMatch ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span className={confidence.dataCoverage.jobSpecificMatch ? 'text-zinc-300' : 'text-zinc-500'}>
            Role Detected
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2">
          {confidence.dataCoverage.recruiterIdentified ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span className={confidence.dataCoverage.recruiterIdentified ? 'text-zinc-300' : 'text-zinc-500'}>
            Recruiter Identified
          </span>
        </div>
      </div>

      {/* Rationale Reasons */}
      <div className="mt-3 space-y-1">
        {confidence.reasons.map((r, i) => (
          <p key={i} className="text-[11px] text-zinc-400">
            • {r}
          </p>
        ))}
      </div>
    </div>
  );
};
