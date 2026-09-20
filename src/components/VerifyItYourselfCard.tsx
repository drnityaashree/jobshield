import React, { useState } from 'react';
import { Search, ExternalLink, ShieldCheck, Check, Globe, Users, FileText, Clock } from 'lucide-react';
import { VerifyItYourselfTool } from '../types';

interface Props {
  tools: VerifyItYourselfTool[];
}

export const VerifyItYourselfCard: React.FC<Props> = ({ tools }) => {
  const [completedTools, setCompletedTools] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCompletedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getToolIcon = (iconType: string) => {
    switch (iconType) {
      case 'google':
        return <Search className="h-4 w-4 text-sky-400" />;
      case 'linkedin':
        return <Users className="h-4 w-4 text-blue-400" />;
      case 'mca':
        return <FileText className="h-4 w-4 text-emerald-400" />;
      case 'whois':
        return <Clock className="h-4 w-4 text-amber-400" />;
      default:
        return <Globe className="h-4 w-4 text-indigo-400" />;
    }
  };

  const completedCount = Object.values(completedTools).filter(Boolean).length;

  return (
    <div id="verify-it-yourself-card" className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Verify It Yourself Toolkit</h3>
            <p className="text-xs text-zinc-400">One-click external queries to independently corroborate this listing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">
            {completedCount} of {tools.length} Checked
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {tools.map((tool) => {
          const isDone = !!completedTools[tool.id];

          return (
            <div
              key={tool.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-850/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
                      {getToolIcon(tool.iconType)}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-200">{tool.title}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCheck(tool.id)}
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-zinc-700 bg-zinc-800/80 text-transparent hover:border-zinc-600'
                    }`}
                    title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{tool.instruction}</p>
              </div>

              {tool.directUrl && (
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <a
                    href={tool.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setCompletedTools((p) => ({ ...p, [tool.id]: true }))}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/80 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
                  >
                    <span>Launch Investigation</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
