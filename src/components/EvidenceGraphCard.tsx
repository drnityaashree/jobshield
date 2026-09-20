import React, { useState } from 'react';
import {
  GitFork,
  Building2,
  Briefcase,
  UserCheck,
  Send,
  Coins,
  FileLock2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { EvidenceGraph } from '../types';

interface Props {
  graph: EvidenceGraph;
  opportunityTrustScore: number;
}

export const EvidenceGraphCard: React.FC<Props> = ({ graph, opportunityTrustScore }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'employer':
        return <Building2 className="h-5 w-5" />;
      case 'job_opportunity':
        return <Briefcase className="h-5 w-5" />;
      case 'recruiter':
        return <UserCheck className="h-5 w-5" />;
      case 'channel':
        return <Send className="h-5 w-5" />;
      case 'financial':
        return <Coins className="h-5 w-5" />;
      case 'pii':
        return <FileLock2 className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          label: 'Verified / Safe',
        };
      case 'suspicious':
        return {
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
          label: 'Suspicious Vector',
        };
      case 'hazardous':
        return {
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <XCircle className="h-4 w-4 text-rose-400" />,
          label: 'Hazardous Flag',
        };
      default:
        return {
          color: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
          dot: 'bg-zinc-400',
          icon: <HelpCircle className="h-4 w-4 text-zinc-400" />,
          label: 'Uncorrelated',
        };
    }
  };

  return (
    <div id="evidence-graph-card" className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <GitFork className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Opportunity Evidence Graph</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Cross-dimensional correlation across Employer, Channel, Recruiter, Financial, and Data Vectors
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Opportunity Trust Score</span>
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`text-xl font-black ${
                  opportunityTrustScore >= 70
                    ? 'text-emerald-400'
                    : opportunityTrustScore >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {opportunityTrustScore}
              </span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {graph.nodes.map((node) => {
          const badge = getStatusBadge(node.status);
          const isSelected = selectedNodeId === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
              className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500/60 bg-zinc-800/90 shadow-md ring-1 ring-indigo-500/30'
                  : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-850/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 group-hover:text-indigo-400">
                    {getNodeIcon(node.type)}
                  </div>
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      {node.label}
                    </span>
                    <h4 className="line-clamp-1 text-sm font-semibold text-zinc-200" title={node.value}>
                      {node.value}
                    </h4>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                  {node.status}
                </span>
              </div>

              {node.details && (
                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{node.details}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Flagged Inconsistencies */}
      {graph.inconsistencies.length > 0 ? (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
              Identified Graph Inconsistencies ({graph.inconsistencies.length})
            </h4>
          </div>
          <ul className="mt-2.5 space-y-2">
            {graph.inconsistencies.map((inc, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-rose-200/90">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>All nodes in the opportunity evidence graph demonstrate structural consistency.</span>
        </div>
      )}
    </div>
  );
};
