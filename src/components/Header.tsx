import React from 'react';
import { Shield, Search, Sparkles, Database, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  serverStatus: 'connected' | 'checking' | 'error';
}

export const Header: React.FC<HeaderProps> = ({ serverStatus }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                JobShield<span className="text-cyan-400">.ai</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-medium">
                v2.4 Autonomous
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Employer Authenticity & Job Scam Intelligence
            </p>
          </div>
        </div>

        {/* Engine Status Indicators */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multi-Angle Web Discovery</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini Intelligence</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Corroboration Cache</span>
          </div>

          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'connected'
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse'
                  : serverStatus === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400 capitalize">{serverStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
