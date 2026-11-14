import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusCircle, RefreshCw, CheckCircle2,
  AlertCircle, Info, X, Zap
} from 'lucide-react';
import { apiClient } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { CommandPalette } from './components/common/CommandPalette';
import { ScanLaunchpad } from './components/scan/ScanLaunchpad';
import { BentoAnalyticsHeader } from './components/results/BentoAnalyticsHeader';
import { ResultsDataGrid } from './components/results/ResultsDataGrid';
import { CompetitorMatrixView } from './components/results/CompetitorMatrixView';
import { HistoryView } from './components/history/HistoryView';
import type {
  JobDetails, HistoryJob, ConfigResponse,
  ViewType, ToastItem
} from './types';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('new-scan');
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [activeJob, setActiveJob] = useState<JobDetails | null>(null);
  const [historyJobs, setHistoryJobs] = useState<HistoryJob[]>([]);
  const [isLoadingScan, setIsLoadingScan] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('nexus_theme') !== 'light';
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toast dispatch helper
  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('nexus_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // Sync theme with DOM on mount
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load backend configuration & history on mount
  useEffect(() => {
    apiClient
      .getConfig()
      .then((cfg) => setConfig(cfg))
      .catch(() => addToast('warning', 'Connecting to backend API...'));

    apiClient
      .listJobs()
      .then((jobs) => setHistoryJobs(jobs))
      .catch(() => {});
  }, [addToast]);

  // Load specific job
  const handleLoadJob = useCallback(
    async (jobId: string) => {
      try {
        const job = await apiClient.getJobStatus(jobId);
        setActiveJob(job);
        setActiveView('new-scan');
        addToast('info', `Loaded scan for ${job.domain}`);
      } catch {
        addToast('error', 'Could not load job details.');
      }
    },
    [addToast]
  );

  // Start new scan submission
  const handleStartScan = async (formData: FormData) => {
    setIsLoadingScan(true);
    try {
      const res = await apiClient.createJob(formData);
      addToast('info', `Scan queued on ${res.provider.toUpperCase()} engine (${res.keyword_count} keywords)`);

      // Immediately fetch job state
      const initialJob = await apiClient.getJobStatus(res.job_id);
      setActiveJob(initialJob);

      // Refresh history list
      apiClient.listJobs().then((jobs) => setHistoryJobs(jobs)).catch(() => {});
    } finally {
      setIsLoadingScan(false);
    }
  };

  // Smart Polling: pauses when tab is hidden, resumes on focus
  useEffect(() => {
    if (!activeJob) return;
    const isRunning = activeJob.status === 'queued' || activeJob.status === 'processing';
    if (!isRunning) return;

    const currentJobId = activeJob.job_id;

    const poll = async () => {
      try {
        const updated = await apiClient.getJobStatus(currentJobId);
        setActiveJob(updated);

        if (updated.status === 'completed') {
          addToast(
            'success',
            `Scan complete! Visibility Score: ${updated.visibility_score.toFixed(1)}% SoV`
          );
          apiClient.listJobs().then((jobs) => setHistoryJobs(jobs)).catch(() => {});
        } else if (updated.status === 'failed') {
          addToast('error', 'Scan failed. Check backend logs for upstream error details.');
        }
      } catch {
        // Silent on transient network glitch
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    pollIntervalRef.current = setInterval(() => {
      if (!document.hidden) {
        poll();
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeJob, addToast]);

  const handleDownload = (format: 'csv' | 'xlsx') => {
    if (!activeJob) return;
    window.location.href = apiClient.getDownloadUrl(activeJob.job_id, format);
  };

  const isJobRunning = activeJob?.status === 'queued' || activeJob?.status === 'processing';
  const cannibalizedCount = activeJob?.results.filter((r) => r.cannibalization).length || 0;

  return (
    <AppShell
      activeView={activeView}
      onNavigate={setActiveView}
      onOpenCommandPalette={() => setIsCommandOpen(true)}
      onToggleTheme={toggleTheme}
      isDark={isDark}
      jobStatus={activeJob ? activeJob.status : null}
      activeProvider={activeJob?.provider || config?.default_provider || 'free'}
      results={activeJob?.results || []}
    >
      {/* ── View 1: New Scan / Active Scan Results ──────────────────── */}
      {activeView === 'new-scan' && (
        <div className="space-y-6">
          {!activeJob ? (
            <ScanLaunchpad
              onStartScan={handleStartScan}
              providers={config?.providers || []}
              defaultProvider={config?.default_provider || 'free'}
              countries={config?.countries || ['United States', 'India', 'United Kingdom']}
              languages={config?.languages || ['English', 'Spanish', 'German']}
              isLoading={isLoadingScan}
            />
          ) : (
            <div className="space-y-6">
              {/* Scan Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-white">{activeJob.company_name}</h2>
                      <span className="font-mono text-xs text-slate-400 bg-zinc-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        {activeJob.domain}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          activeJob.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : activeJob.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        {activeJob.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeJob.progress.completed} of {activeJob.progress.total} keywords processed ({activeJob.progress.percent}%)
                      {isJobRunning && <span className="text-indigo-400 ml-1.5">• In progress</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveJob(null)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Scan</span>
                  </button>
                  <button
                    onClick={() => handleLoadJob(activeJob.job_id)}
                    className="p-2 text-slate-400 hover:text-white bg-zinc-950 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
                    title="Refresh current scan"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bento Analytics Strip */}
              <BentoAnalyticsHeader
                results={activeJob.results}
                totalKeywords={activeJob.progress.total}
                visibilityScore={activeJob.visibility_score}
                topCompetitors={activeJob.top_competitors_summary || []}
                cannibalizedCount={cannibalizedCount}
                onFilterClick={(key) => {
                  if (key === 'competitors') setActiveView('competitors');
                }}
              />

              {/* Data Grid with SERP X-Ray */}
              <ResultsDataGrid
                results={activeJob.results}
                domain={activeJob.domain}
                onDownload={handleDownload}
                onAddToast={addToast}
              />
            </div>
          )}
        </div>
      )}

      {/* ── View 2: Opportunities Vault ─────────────────────────────── */}
      {activeView === 'opportunities' && (
        <div className="space-y-6">
          {activeJob ? (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-blue-950/30 border border-blue-500/30 text-blue-200">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <span>🔥 Striking Distance Opportunities Vault</span>
                </h3>
                <p className="text-xs text-blue-300 mt-1">
                  Keywords currently ranking 11–30. These are your highest-ROI targets: small on-page optimizations or internal links can push them onto Page 1!
                </p>
              </div>

              <ResultsDataGrid
                results={activeJob.results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30)}
                domain={activeJob.domain}
                onDownload={handleDownload}
                onAddToast={addToast}
              />
            </div>
          ) : (
            <div className="bg-zinc-900/60 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-3">
              <p className="text-sm font-semibold text-slate-300">No active scan selected</p>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                Run a new scan or select a scan from history to populate the Opportunities Vault.
              </p>
              <button
                onClick={() => setActiveView('new-scan')}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl cursor-pointer"
              >
                Go to Launchpad
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── View 3: Competitor Matrix ───────────────────────────────── */}
      {activeView === 'competitors' && (
        <div className="space-y-6">
          {activeJob ? (
            <CompetitorMatrixView
              domain={activeJob.domain}
              topCompetitors={activeJob.top_competitors_summary || []}
              results={activeJob.results}
            />
          ) : (
            <div className="bg-zinc-900/60 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-3">
              <p className="text-sm font-semibold text-slate-300">No active scan selected</p>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                Run a scan to extract competitive intelligence and Page 1 market share.
              </p>
              <button
                onClick={() => setActiveView('new-scan')}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl cursor-pointer"
              >
                Go to Launchpad
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── View 4: Scan History Archive ────────────────────────────── */}
      {activeView === 'history' && (
        <HistoryView onLoadJob={handleLoadJob} onAddToast={addToast} />
      )}

      {/* Command Palette Modal (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={setActiveView}
        onLoadJob={handleLoadJob}
        onDownload={handleDownload}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        jobs={historyJobs}
        currentJobId={activeJob?.job_id || null}
        jobCompleted={activeJob?.status === 'completed'}
      />

      {/* Global Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start justify-between gap-3 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/30 text-amber-200'
                : 'bg-zinc-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
              <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-50 hover:opacity-100 text-current transition-opacity shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
