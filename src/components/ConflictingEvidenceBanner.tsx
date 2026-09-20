import React from 'react';
import { AlertTriangle, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { ConflictingEvidence } from '../types';

interface Props {
  conflict: ConflictingEvidence;
}

export const ConflictingEvidenceBanner: React.FC<Props> = ({ conflict }) => {
  if (!conflict.hasConflict) return null;

  return (
    <div
      id="conflicting-evidence-banner"
      className="mb-8 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 p-6 shadow-lg shadow-amber-500/5 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
            <AlertTriangle className="h-6 w-6 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                CRITICAL MISMATCH
              </span>
              <span className="text-xs text-zinc-400">Signal Inconsistency Detected</span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-zinc-100">{conflict.headline}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-300">{conflict.explanation}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Employer Brand:</span>
            </div>
            <p className="text-xs font-semibold text-emerald-300">{conflict.employerStatus}</p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Application Channel:</span>
            </div>
            <p className="text-xs font-semibold text-rose-300">{conflict.opportunityStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
