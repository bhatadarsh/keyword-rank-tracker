import React, { useState, useEffect } from 'react';
import {
  Search, PlusCircle, Target, Users, History, Download, Sun, Moon,
  Building2, ArrowRight
} from 'lucide-react';
import type { HistoryJob, ViewType } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onLoadJob: (jobId: string) => void;
  onDownload?: (fmt: 'csv' | 'xlsx') => void;
  onToggleTheme: () => void;
  isDark: boolean;
  jobs: HistoryJob[];
  currentJobId: string | null;
  jobCompleted: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLoadJob,
  onDownload,
  onToggleTheme,
  isDark,
  jobs,
  currentJobId: _currentJobId,
  jobCompleted,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredJobs = jobs.filter(
    (j) =>
      j.company_name.toLowerCase().includes(query.toLowerCase()) ||
      j.domain.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-zinc-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-zinc-950/60">
          <Search className="w-4 h-4 text-slate-500 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search past domains (e.g. github.com)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-zinc-800 border border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {/* Quick Actions */}
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Quick Actions
            </div>

            <button
              onClick={() => {
                onNavigate('new-scan');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-indigo-400" />
                <span>Start New Rank Check Scan</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => {
                onNavigate('opportunities');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>View Striking Distance Opportunities (Ranks 11–30)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => {
                onNavigate('competitors');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>View Competitor Share-of-Voice Matrix</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => {
                onNavigate('history');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-blue-400" />
                <span>Browse Scan History</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => {
                onToggleTheme();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                <span>Toggle Theme ({isDark ? 'Switch to Light' : 'Switch to Dark'})</span>
              </div>
            </button>

            {jobCompleted && onDownload && (
              <>
                <button
                  onClick={() => {
                    onDownload('csv');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Download Current Scan as CSV</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onDownload('xlsx');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download Current Scan as Excel (.xlsx)</span>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Past Scans */}
          {filteredJobs.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Past Scans ({filteredJobs.length})
              </div>
              {filteredJobs.slice(0, 5).map((job) => (
                <button
                  key={job.job_id}
                  onClick={() => {
                    onLoadJob(job.job_id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-white mr-1.5">{job.company_name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({job.domain})</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-zinc-800/80 px-2 py-0.5 rounded-md ml-2 shrink-0">
                    {job.keyword_count} kws
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
