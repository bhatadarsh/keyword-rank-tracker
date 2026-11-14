import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusCircle, RefreshCw, CheckCircle2,
  AlertCircle, Info, X, Zap, Target
} from 'lucide-react';
import { apiClient } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { CommandPalette } from './components/common/CommandPalette';
import { ScanLaunchpad } from './components/scan/ScanLaunchpad';
import { BentoAnalyticsHeader } from './components/results/BentoAnalyticsHeader';
import { ResultsDataGrid } from './components/results/ResultsDataGrid';
import { CompetitorMatrixView } from './components/results/CompetitorMatrixView';
import { HistoryView } from './components/history/HistoryView';
import { HelpView } from './components/help/HelpView';
import { WelcomeGuideBanner } from './components/onboarding/WelcomeGuideBanner';
import { useOnboarding } from './hooks/useOnboarding';
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

  // Default to Light Mode as per human-crafted SaaS specification
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('nexus_theme') === 'dark';
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 3-Step Interactive Onboarding State
  const {
    completedSteps,
    completedCount,
    isAllCompleted,
    isDismissed,
    markStepComplete,
    dismissGuide,
    resetGuide,
  } = useOnboarding();

  // Toast dispatch helper
  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
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

  // If user navigates to Opportunities or Competitors without an active job, auto-load latest scan
  const handleNavigate = useCallback(
    async (view: ViewType) => {
      if ((view === 'opportunities' || view === 'competitors') && !activeJob && historyJobs.length > 0) {
        try {
          const latest = await apiClient.getJobStatus(historyJobs[0].job_id);
          setActiveJob(latest);
        } catch {
          // Ignore
        }
      }
      setActiveView(view);
    },
    [activeJob, historyJobs]
  );

  // Start new scan submission
  const handleStartScan = async (formData: FormData) => {
    setIsLoadingScan(true);
    try {
      const res = await apiClient.createJob(formData);
      markStepComplete('demoRun');
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

  // Direct trigger for 1-click GitHub demo from welcome banner
  const handleRunDemoFromBanner = async () => {
    const csvContent =
      'keyword,country,language,device\n' +
      'git repository,United States,English,desktop\n' +
      'code review tool,United States,English,desktop\n' +
      'version control,United States,English,desktop\n' +
      'open source hosting,United States,English,desktop\n' +
      'pull request workflow,United States,English,desktop\n' +
      'github actions ci cd,United States,English,desktop\n' +
      'git clone tutorial,United States,English,desktop\n' +
      'devops platform,United States,English,desktop\n' +
      'collaborative coding,United States,English,desktop\n' +
      'issue tracking software,United States,English,desktop';

    const demoFile = new File([csvContent], 'demo_github_keywords.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', demoFile);
    formData.append('company_name', 'GitHub');
    formData.append('domain', 'github.com');
    formData.append('provider', config?.default_provider || 'free');
    formData.append('country', 'United States');
    formData.append('language', 'English');
    formData.append('device', 'desktop');
    formData.append('depth', '100');

    await handleStartScan(formData);
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
      onNavigate={handleNavigate}
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
              onboardingBanner={
                !isDismissed ? (
                  <WelcomeGuideBanner
                    completedSteps={completedSteps}
                    completedCount={completedCount}
                    isAllCompleted={isAllCompleted}
                    onDismiss={dismissGuide}
                    onRunDemo={handleRunDemoFromBanner}
                    hasActiveJob={false}
                  />
                ) : null
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Optional Onboarding banner on top of active results if not dismissed */}
              {!isDismissed && (
                <WelcomeGuideBanner
                  completedSteps={completedSteps}
                  completedCount={completedCount}
                  isAllCompleted={isAllCompleted}
                  onDismiss={dismissGuide}
                  onRunDemo={handleRunDemoFromBanner}
                  onViewOpportunities={() => {
                    markStepComplete('opportunitiesViewed');
                    setActiveView('opportunities');
                  }}
                  hasActiveJob={true}
                />
              )}

              {/* Scan Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{activeJob.company_name}</h2>
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {activeJob.domain}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          activeJob.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : activeJob.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {activeJob.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {activeJob.progress.completed} of {activeJob.progress.total} keywords processed ({activeJob.progress.percent}%)
                      {isJobRunning && <span className="text-blue-600 dark:text-blue-400 ml-1.5">• In progress</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveJob(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadJob(activeJob.job_id)}
                    className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
                  if (key === 'opportunities') {
                    markStepComplete('opportunitiesViewed');
                    setActiveView('opportunities');
                  } else if (key === 'competitors') {
                    setActiveView('competitors');
                  }
                }}
              />

              {/* Data Grid with SERP X-Ray */}
              <ResultsDataGrid
                results={activeJob.results}
                domain={activeJob.domain}
                onDownload={handleDownload}
                onAddToast={addToast}
                onFilterOpportunities={() => markStepComplete('opportunitiesViewed')}
                onExpandRow={() => markStepComplete('xrayInspected')}
              />
            </div>
          )}
        </div>
      )}

      {/* ── View 2: Results & Opportunities Vault ───────────────────── */}
      {activeView === 'opportunities' && (
        <div className="space-y-6">
          {activeJob ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Striking-Distance Opportunities Vault</span>
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  Keywords currently ranking in positions 11–30. These are your highest-ROI targets: search engines already recognize your authority, so minor on-page optimizations or internal links can push them onto Page 1!
                </p>
              </div>

              <ResultsDataGrid
                results={activeJob.results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30)}
                domain={activeJob.domain}
                onDownload={handleDownload}
                onAddToast={addToast}
                onExpandRow={() => markStepComplete('xrayInspected')}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-16 text-center text-zinc-500 space-y-3 shadow-xs">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No active scan loaded</p>
              <p className="text-xs max-w-sm mx-auto text-zinc-500">
                Run a new scan or choose a past audit from History to isolate striking-distance opportunities.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('new-scan')}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs"
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
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-16 text-center text-zinc-500 space-y-3 shadow-xs">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No active scan loaded</p>
              <p className="text-xs max-w-sm mx-auto text-zinc-500">
                Run a scan to extract competitive intelligence and Page 1 market share.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('new-scan')}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs"
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

      {/* ── View 5: Help & Documentation ────────────────────────────── */}
      {activeView === 'help' && (
        <HelpView
          onResetGuide={resetGuide}
          onNavigateHome={() => setActiveView('new-scan')}
          onAddToast={addToast}
        />
      )}

      {/* Command Palette Modal (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={handleNavigate}
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
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start justify-between gap-3 animate-fade-in ${
              toast.type === 'success'
                ? 'bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-800/80 text-zinc-800 dark:text-zinc-100'
                : toast.type === 'error'
                ? 'bg-white dark:bg-zinc-900 border-rose-200 dark:border-rose-800/80 text-zinc-800 dark:text-zinc-100'
                : toast.type === 'warning'
                ? 'bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-800/80 text-zinc-800 dark:text-zinc-100'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <p className="text-xs font-normal leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
