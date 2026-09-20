import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { PreFlightChecklistItem } from '../types';

interface PreFlightChecklistProps {
  checklist: PreFlightChecklistItem[];
}

export const PreFlightChecklist: React.FC<PreFlightChecklistProps> = ({ checklist }) => {
  // Allow user to interactively mark items as checked in their session
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    checklist.forEach((item) => {
      if (item.status === 'passed') {
        initial[item.id] = true;
      }
    });
    return initial;
  });

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: PreFlightChecklistItem['status']) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PASSED
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5" />
            CRITICAL STOP
          </span>
        );
      case 'action_required':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3.5 h-3.5" />
            VERIFY MANUALLY
          </span>
        );
    }
  };

  const checkedCount = Object.values(checkedIds).filter(Boolean).length;
  const totalCount = checklist.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900 font-sans">
              "Before You Apply" Candidate Safety Checklist
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Essential pre-flight diligence steps tailored to this specific job opportunity. Verify all points before sending your resume or personal details.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-semibold text-slate-600">Verified:</span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
            {checkedCount} / {totalCount} Steps
          </span>
        </div>
      </div>

      {/* Interactive Checklist Cards */}
      <div className="space-y-3">
        {checklist.map((item) => {
          const isChecked = !!checkedIds[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start space-x-3.5 select-none ${
                isChecked
                  ? 'bg-slate-50/80 border-slate-200'
                  : item.status === 'critical'
                  ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {isChecked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4
                    className={`text-sm font-bold ${
                      isChecked ? 'text-slate-600 line-through' : 'text-slate-900'
                    }`}
                  >
                    {item.title}
                  </h4>
                  {getStatusBadge(item.status)}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                <div
                  className={`mt-2.5 text-xs p-2.5 rounded-lg font-medium ${
                    item.status === 'critical'
                      ? 'bg-rose-100/70 text-rose-800 border border-rose-200'
                      : item.status === 'warning'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-bold mr-1">Guidance:</span>
                  {item.advice}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 flex items-center justify-between text-xs text-blue-900">
        <span className="flex items-center gap-1.5 font-medium">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
          Unsure about any step? Never share Aadhaar, PAN, or pay any money before independent confirmation.
        </span>
      </div>
    </div>
  );
};
