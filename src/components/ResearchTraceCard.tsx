import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { ResearchTraceStep } from '../types';

interface Props {
  trace: ResearchTraceStep[];
}

export const ResearchTraceCard: React.FC<Props> = ({ trace }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'flagged':
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div id="research-trace-card" className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700/50">
            <Terminal className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100">Transparent Research Trace</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                {trace.length} Pipeline Steps
              </span>
            </div>
            <p className="text-xs text-zinc-400">Auditable verification trail of autonomous queries and heuristics</p>
          </div>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          aria-label={isOpen ? 'Collapse research trace' : 'Expand research trace'}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 border-t border-zinc-800/80 pt-5 space-y-4">
          {trace.map((step) => (
            <div
              key={step.stepNumber}
              className="relative rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
                    {getStepIcon(step.status)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Step {step.stepNumber}: {step.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400">{step.description}</p>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-500">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {step.findings.length > 0 && (
                <div className="mt-3 space-y-1 rounded-lg bg-zinc-900/60 p-2.5 font-mono text-[11px] text-zinc-300">
                  {step.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-zinc-500">›</span>
                      <span className="break-all">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
