import React, { useState, useEffect } from 'react';
import {
  Search, PlusCircle, Target, Users, History, Download, Sun, Moon,
  Building2, ArrowRight, HelpCircle
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            autoFocus
            placeholder="Search commands, navigate views, or jump to past scans..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {/* Quick Navigation Commands */}
          <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-400">
            Navigation
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigate('new-scan');
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Launch New Rank Scan</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('opportunities');
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Results &amp; Opportunities Vault (Ranks 11–30)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('competitors');
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Competitor Share-of-Voice Matrix</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('history');
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-zinc-500" />
              <span>Scan History Archive</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('help');
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Help, Glossary &amp; Documentation</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Quick Actions */}
          <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            Quick Actions
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
              <span>Toggle Color Theme ({isDark ? 'Light Mode' : 'Dark Mode'})</span>
            </div>
            <span className="text-[10px] text-zinc-400">Theme</span>
          </button>

          {jobCompleted && onDownload && (
            <>
              <button
                type="button"
                onClick={() => {
                  onDownload('xlsx');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel Report (.xlsx)</span>
                </div>
                <span className="text-[10px] text-zinc-400">Export</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDownload('csv');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-zinc-500" />
                  <span>Download CSV Report (.csv)</span>
                </div>
                <span className="text-[10px] text-zinc-400">Export</span>
              </button>
            </>
          )}

          {/* Past Scans */}
          {filteredJobs.length > 0 && (
            <>
              <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                Recent Scans
              </div>
              {filteredJobs.slice(0, 5).map((job) => (
                <button
                  key={job.job_id}
                  type="button"
                  onClick={() => {
                    onLoadJob(job.job_id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="font-medium truncate">{job.company_name}</span>
                    <span className="font-mono text-[11px] text-zinc-400 truncate">({job.domain})</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {job.found_count}/{job.keyword_count} found
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
