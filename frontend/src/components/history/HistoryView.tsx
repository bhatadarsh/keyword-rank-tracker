import React, { useState, useEffect, useCallback } from 'react';
import {
  History, Search, Download, Trash2, Building2,
  Calendar, RefreshCw, Loader2, ArrowRight, ShieldCheck, Activity
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
      onAddToast('success', 'Scan and export artifacts deleted.');
    } catch {
      onAddToast('error', 'Failed to delete scan.');
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" /> Scan Archive & Historical Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access past ranking scans, compare delta progress, and download historical reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-52"
            />
          </div>

          <button
            onClick={fetchHistory}
            className="p-2 text-slate-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-zinc-900/60 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-sm">Loading historical scans...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-zinc-900/60 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center text-slate-500 gap-3">
          <History className="w-10 h-10 opacity-30" />
          <p className="text-sm font-semibold text-slate-300">No scans found</p>
          <p className="text-xs max-w-xs text-slate-500">
            {search ? 'Try clearing the search query.' : 'Launch your first automated keyword scan from the Launchpad.'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Target Domain</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Provider</th>
                  <th className="py-3.5 px-4 text-center">Keywords</th>
                  <th className="py-3.5 px-4 text-center">Found %</th>
                  <th className="py-3.5 px-4 text-center">Visibility</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/40">
                {filteredJobs.map((job) => {
                  const foundPct =
                    job.keyword_count > 0 ? Math.round((job.found_count / job.keyword_count) * 100) : 0;

                  return (
                    <tr
                      key={job.job_id}
                      onClick={() => onLoadJob(job.job_id)}
                      className="group hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      {/* Domain and Company */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                              {job.company_name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 truncate">{job.domain}</p>
                          </div>
                        </div>
                      </td>

                      {/* Engine */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-zinc-950 px-2 py-0.5 rounded-lg border border-slate-800 capitalize">
                          {job.provider === 'free' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Free Live
                            </>
                          ) : job.provider === 'mock' ? (
                            'Smart Sim'
                          ) : (
                            'SerpApi'
                          )}
                        </span>
                      </td>

                      {/* Keywords Count */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-200">
                        {job.keyword_count}
                      </td>

                      {/* Found % */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`font-mono font-bold ${
                            foundPct >= 50 ? 'text-emerald-400' : foundPct >= 20 ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {foundPct}%
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({job.found_count}/{job.keyword_count})
                        </span>
                      </td>

                      {/* Visibility Score */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-300">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          {job.visibility_score ? `${job.visibility_score.toFixed(1)}%` : '0%'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 hidden lg:table-cell text-slate-400">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>
                            {job.created_at
                              ? new Date(job.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : job.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onLoadJob(job.job_id)}
                            className="p-1.5 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
                            title="Inspect scan"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {job.status === 'completed' && (
                            <a
                              href={apiClient.getDownloadUrl(job.job_id, 'xlsx')}
                              className="p-1.5 text-slate-400 hover:text-white bg-zinc-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-all"
                              title="Download Excel"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={(e) => handleDelete(e, job.job_id)}
                            disabled={deletingId === job.job_id}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Delete scan"
                          >
                            {deletingId === job.job_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
