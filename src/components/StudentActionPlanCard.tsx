import React, { useState } from 'react';
import {
  CheckSquare,
  ShieldAlert,
  Ban,
  Building,
  Mail,
  Flag,
  CheckCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ActionPlanItem } from '../types';

interface Props {
  actionPlan: ActionPlanItem[];
}

export const StudentActionPlanCard: React.FC<Props> = ({ actionPlan }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'do_not_pay':
        return <Ban className="h-5 w-5 text-rose-400" />;
      case 'block_contact':
        return <ShieldAlert className="h-5 w-5 text-rose-400" />;
      case 'verify_careers':
        return <Building className="h-5 w-5 text-indigo-400" />;
      case 'request_official_email':
        return <Mail className="h-5 w-5 text-amber-400" />;
      case 'report_fraud':
        return <Flag className="h-5 w-5 text-rose-400" />;
      default:
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="student-action-plan-card" className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">What to Do Next: Student Defense Plan</h3>
            <p className="text-xs text-zinc-400">Actionable, step-by-step protective instructions based on detected vectors</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {actionPlan.map((item, idx) => (
          <div
            key={item.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700/80 sm:flex-row sm:items-start"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 ring-1 ring-zinc-700/50">
                {getActionIcon(item.actionType)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    Step {idx + 1}: {item.title}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getPriorityBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{item.action}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-400">Why: </span>
                  {item.why}
                </p>
              </div>
            </div>

            {item.actionType === 'request_official_email' && (
              <button
                onClick={() =>
                  handleCopy(
                    item.id,
                    'Could you please send the job description and interview details from your official company domain email address?'
                  )
                }
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Template</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Reply</span>
                  </>
                )}
              </button>
            )}

            {item.actionType === 'report_fraud' && (
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Cyber Crime Portal</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
