import React from 'react';
import { History, Trash2, ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { RecentVerification } from '../types';

interface RecentChecksProps {
  recentChecks: RecentVerification[];
  onSelect: (item: RecentVerification) => void;
  onClear: () => void;
}

export const RecentChecks: React.FC<RecentChecksProps> = ({ recentChecks, onSelect, onClear }) => {
  if (recentChecks.length === 0) return null;

  const getBadge = (verdict: RecentVerification['verdictStatus']) => {
    switch (verdict) {
      case 'SAFE_TO_APPLY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            SAFE
          </span>
        );
      case 'PROCEED_WITH_CAUTION':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" />
            CAUTION
          </span>
        );
      case 'DO_NOT_APPLY':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            <ShieldAlert className="w-3 h-3" />
            HIGH RISK
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <History className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Recent Opportunity Verifications
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
            {recentChecks.length}
          </span>
        </div>

        <button
          onClick={onClear}
          className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          title="Clear recent verification history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recentChecks.slice(0, 6).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="group cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {item.companyName}
                </h4>
                {getBadge(item.verdictStatus)}
              </div>

              {item.jobTitle && (
                <p className="text-[11px] text-slate-500 truncate mb-1">
                  {item.jobTitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 mt-2">
              <span>Risk: {item.overallRiskScore}/100</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-blue-600 font-semibold flex items-center gap-0.5">
                Inspect <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
