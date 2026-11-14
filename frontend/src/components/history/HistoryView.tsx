import React, { useState, useEffect, useCallback } from 'react';
import {
  History, Search, Download, Trash2, Building2,
  Calendar, RefreshCw, Loader2, ArrowRight
} from 'lucide-react';
import { apiClient } from '../../api/client';
import type { HistoryJob } from '../../types';

interface HistoryViewProps {
  onLoadJob: (jobId: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onLoadJob, onAddToast }) => {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.listJobs();
      setJobs(data);
    } catch {
      onAddToast('error', 'Failed loading past scans.');
    } finally {
      setIsLoading(false);
    }
  }, [onAddToast]);

  useEffect(() => {
    let mounted = true;
    apiClient
      .listJobs()
      .then((data) => {
        if (mounted) {
          setJobs(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          onAddToast('error', 'Failed loading past scans.');
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [onAddToast]);

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this scan and all associated reports?')) {
      return;
    }
    setDeletingId(jobId);
    try {
      await apiClient.deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      onAddToast('info', 'Scan deleted from history.');
    } catch {
      onAddToast('error', 'Could not delete scan.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      j.company_name.toLowerCase().includes(search.toLowerCase()) ||
      j.domain.toLowerCase().includes(search.toLowerCase()) ||
      j.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            Scan History Archive
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Browse and reload past rank tracking audits or download archived spreadsheets.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by company, domain, or provider..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Scans List / Table */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Loading past scans...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
          No scans found in history.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';

            return (
              <div
                key={job.job_id}
                onClick={() => onLoadJob(job.job_id)}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {job.company_name}
                      </h4>
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {job.domain}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.2 rounded-md ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-60" />
                        {job.created_at ? new Date(job.created_at).toLocaleString() : 'Recent'}
                      </span>
                      <span>Engine: <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{job.provider}</span></span>
                      <span>Keywords: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{job.found_count}/{job.keyword_count}</span></span>
                      {isCompleted && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium font-mono">
                          SoV: {job.visibility_score.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <a
                    href={apiClient.getDownloadUrl(job.job_id, 'xlsx')}
                    onClick={(e) => e.stopPropagation()}
                    title="Download Excel spreadsheet"
                    className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, job.job_id)}
                    disabled={deletingId === job.job_id}
                    title="Delete scan from history"
                    className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Results
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
