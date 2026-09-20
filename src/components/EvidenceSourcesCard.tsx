import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  FileCode,
  Globe,
  Linkedin,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
} from 'lucide-react';
import { SourceEvidence, SearchDiagnostics } from '../types';

interface EvidenceSourcesCardProps {
  sources: SourceEvidence[];
  diagnostics: SearchDiagnostics;
  extractedText?: string;
}

export const EvidenceSourcesCard: React.FC<EvidenceSourcesCardProps> = ({
  sources,
  diagnostics,
  extractedText,
}) => {
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-[#0077b5]" />;
      case 'reputation':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'official_website':
        return <Globe className="w-4 h-4 text-blue-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Autonomous Web Evidence Gathering
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Public records, corporate profiles, and verified snippets discovered by autonomous multi-angle queries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {sources.length} Corroborated Sources
          </span>
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showDiagnostics ? 'Hide Search Logs' : 'View Search Logs'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics / Search Logs Drawer */}
      {showDiagnostics && (
        <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Query Engine: {diagnostics.provider}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {diagnostics.cached ? 'Served from Cache' : 'Fresh Autonomous Search'}
            </span>
          </div>

          <div>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider mb-1">
              Executed Multi-Angle Verification Queries:
            </p>
            <ul className="space-y-1">
              {diagnostics.queriesExecuted.map((q, i) => (
                <li key={i} className="text-cyan-300 flex items-center gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sources Grid */}
      {sources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => (
            <div
              key={src.id}
              className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {getSourceIcon(src.sourceType)}
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {src.domain}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {src.confidence}% Match
                  </span>
                </div>

                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 leading-snug break-all"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {src.snippet}
                </p>
              </div>

              {src.evidencePoints && src.evidencePoints.length > 0 && (
                <div className="pt-2.5 mt-2.5 border-t border-slate-200/80">
                  <div className="flex flex-wrap gap-1">
                    {src.evidencePoints.map((ep, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200"
                      >
                        {ep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-xs text-slate-500">
            No public internet footprint was established for this entity across major corporate search engines and professional registries.
          </p>
        </div>
      )}

      {/* Extracted Text Collapsible Drawer */}
      {extractedText && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowExtractedText(!showExtractedText)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-4 h-4 text-slate-500" />
            <span>{showExtractedText ? 'Hide Transcribed Input Content' : 'View Transcribed Input Content'}</span>
            {showExtractedText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showExtractedText && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {extractedText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
