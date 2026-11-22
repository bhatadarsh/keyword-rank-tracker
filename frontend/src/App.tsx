import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, RefreshCw, CheckCircle2, AlertCircle, Info, X, Zap } from 'lucide-react';
import { apiClient, apiErrorMessage } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { CommandPalette } from './components/common/CommandPalette';
import { ScanLaunchpad } from './components/scan/ScanLaunchpad';
import { BentoAnalyticsHeader } from './components/results/BentoAnalyticsHeader';
import { ResultsDataGrid } from './components/results/ResultsDataGrid';
import { CompetitorMatrixView } from './components/results/CompetitorMatrixView';
import { HistoryView } from './components/history/HistoryView';
import { HelpView } from './components/help/HelpView';
import { WelcomeGuideBanner } from './components/onboarding/WelcomeGuideBanner';
import { ProvenanceNotice } from './components/results/ProvenanceNotice';
import { useOnboarding } from './hooks/useOnboarding';
import { useJob } from './hooks/useJob';
import type { JobDetails, HistoryJob, ConfigResponse, ViewType, ToastItem } from './types';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const scanMatch = useMatch('/scans/:jobId');
  const [params] = useSearchParams();
  const jobId = scanMatch?.params.jobId || (location.pathname === '/competitors' ? params.get('jobId') : null);
  const knownRoute = !!scanMatch || ['/', '/competitors', '/history', '/help'].includes(location.pathname);
  const activeView: ViewType = scanMatch ? (params.get('filter') === 'opportunities' ? 'opportunities' : 'rankings')
    : location.pathname === '/competitors' ? 'competitors'
    : location.pathname === '/history' ? 'history' : location.pathname === '/help' ? 'help' : 'new-scan';
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configRevision, setConfigRevision] = useState(0);
  const [historyJobs, setHistoryJobs] = useState<HistoryJob[]>([]);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const submitting = useRef(false);
  const navigationKey = useRef(location.key);
  const lastJobId = useRef<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { completedSteps, completedCount, isAllCompleted, isDismissed, markStepComplete, dismissGuide, resetGuide } = useOnboarding();

  useEffect(() => { navigationKey.current = location.key; }, [location.key]);
  useEffect(() => { if (jobId) lastJobId.current = jobId; }, [jobId]);

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((previous) => [...previous, { id, type, message }]);
    setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 4000);
  }, []);
  const refreshHistory = useCallback(() => {
    apiClient.listJobs().then(setHistoryJobs).catch(() => {});
  }, []);
  const onTerminal = useCallback((job: JobDetails) => {
    addToast(job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'warning',
      job.status === 'completed' ? 'Scan complete.'
        : job.status === 'failed' ? (job.error_message || 'Scan failed.')
        : 'Scan finished with errors or incomplete coverage. Review the results.');
    refreshHistory();
  }, [addToast, refreshHistory]);
  const { job: activeJob, loading: loadingJob, error: jobError, connectionError, reload } = useJob(jobId, onTerminal);

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => !previous);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('nexus_theme', isDark ? 'dark' : 'light'); } catch { /* Optional preference. */ }
  }, [isDark]);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.getConfig(controller.signal).then(setConfig).catch((error) => {
      if (!controller.signal.aborted) setConfigError(apiErrorMessage(error));
    });
    return () => controller.abort();
  }, [configRevision]);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const handleLoadJob = useCallback((id: string) => {
    navigate('/scans/' + encodeURIComponent(id));
  }, [navigate]);
  const handleNavigate = useCallback((view: ViewType) => {
    const id = jobId || lastJobId.current || historyJobs[0]?.job_id;
    if (view === 'new-scan') navigate('/');
    else if (view === 'history' || view === 'help') navigate('/' + view);
    else if (view === 'competitors') navigate('/competitors' + (id ? '?jobId=' + encodeURIComponent(id) : ''));
    else if (id) {
      if (view === 'opportunities') markStepComplete('opportunitiesViewed');
      navigate('/scans/' + encodeURIComponent(id) + (view === 'opportunities' ? '?filter=opportunities' : ''));
    } else navigate('/');
  }, [jobId, historyJobs, navigate, markStepComplete]);

  const handleStartScan = async (formData: FormData) => {
    if (submitting.current) return;
    submitting.current = true;
    setIsLoadingScan(true);
    const startedAt = navigationKey.current;
    try {
      const response = await apiClient.createJob(formData);
      lastJobId.current = response.job_id;
      markStepComplete('demoRun');
      refreshHistory();
      if (navigationKey.current === startedAt) navigate('/scans/' + encodeURIComponent(response.job_id));
      addToast('info', 'Scan queued (' + response.keyword_count + ' keywords). Open History to view all scans.');
    } catch (error) {
      addToast('error', apiErrorMessage(error));
      throw error;
    } finally {
      submitting.current = false;
      setIsLoadingScan(false);
    }
  };
  const handleRunDemoFromBanner = async () => {
    if (!config || isLoadingScan) return;
    const keywords = ['git repository', 'code review tool', 'version control', 'open source hosting',
      'pull request workflow', 'github actions ci cd', 'git clone tutorial', 'devops platform',
      'collaborative coding', 'issue tracking software'];
    const form = new FormData();
    form.append('file', new File(['keyword\n' + keywords.join('\n')], 'demo_github_keywords.csv', { type: 'text/csv' }));
    form.append('company_name', 'GitHub');
    form.append('domain', 'github.com');
    form.append('provider', config.default_provider);
    form.append('country', 'United States');
    form.append('language', 'English');
    form.append('device', 'desktop');
    form.append('depth', '100');
    form.append('allow_fallback', 'false');
    try { await handleStartScan(form); } catch { /* Submission already reports the error. */ }
  };
  const handleDownload = (format: 'csv' | 'xlsx') => {
    if (activeJob) window.location.href = apiClient.getDownloadUrl(activeJob.job_id, format);
  };
  const isJobRunning = activeJob?.status === 'queued' || activeJob?.status === 'processing';
  const guide = !isDismissed ? <WelcomeGuideBanner completedSteps={completedSteps}
    completedCount={completedCount} isAllCompleted={isAllCompleted} onDismiss={dismissGuide}
    onRunDemo={!isLoadingScan && config ? handleRunDemoFromBanner : undefined}
    onViewOpportunities={() => handleNavigate('opportunities')} hasActiveJob={!!activeJob} /> : null;

  return <AppShell activeView={activeView} onNavigate={handleNavigate}
    onOpenCommandPalette={() => setIsCommandOpen(true)} onToggleTheme={toggleTheme} isDark={isDark}
    jobStatus={activeJob?.status || null} activeProvider={activeJob?.actual_provider || config?.default_provider || 'unknown'}
    results={activeJob?.results || []}>
    {!knownRoute ? <div role="alert" className="space-y-3"><h1 className="text-lg font-semibold">Page not found</h1>
      <Link to="/" className="text-blue-600 underline">Return to New Scan</Link></div> : <>
      {activeView === 'new-scan' && (config ? <ScanLaunchpad onStartScan={handleStartScan}
        providers={config.providers} defaultProvider={config.default_provider} countries={config.countries}
        languages={config.languages} isLoading={isLoadingScan} onboardingBanner={guide} />
        : <div className="space-y-3" role={configError ? 'alert' : 'status'}>
          <p>{configError || 'Loading scan settings…'}</p>
          {configError && <button className="text-blue-600 underline" onClick={() => { setConfigError(null); setConfigRevision((value) => value + 1); }}>Try again</button>}
        </div>)}
      {loadingJob && <p role="status">Loading scan…</p>}
      {jobError && <div className="space-y-3" role="alert"><p>{jobError}</p>
        <button className="text-blue-600 underline" onClick={reload}>Try again</button>
        {' · '}<Link to="/history" className="text-blue-600 underline">Open History</Link></div>}
      {connectionError && <p role="status" className="mb-3 text-amber-700 dark:text-amber-300">
        Connection interrupted. Showing the last saved results; reconnecting…
      </p>}
      {activeJob && <div className="space-y-6">
        <ProvenanceNotice job={activeJob} />
        {activeView === 'competitors' ? <CompetitorMatrixView domain={activeJob.domain}
          topCompetitors={activeJob.top_competitors_summary} results={activeJob.results} />
          : <>
            {guide}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Zap className="w-4 h-4" /></div>
                <div>
                  <h2 className="text-sm font-semibold">{activeJob.company_name} <span className="font-mono text-xs text-zinc-500">{activeJob.domain}</span></h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">{activeJob.status.replaceAll('_', ' ')} · {activeJob.progress.completed} of {activeJob.progress.total} keywords processed ({activeJob.progress.percent}%)</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">Source: {activeJob.actual_provider}{isJobRunning ? ' · In progress' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate('new-scan')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700"><PlusCircle className="w-3.5 h-3.5" />New Scan</button>
                <button onClick={reload} aria-label="Refresh current scan" className="p-2"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <BentoAnalyticsHeader results={activeJob.results} totalKeywords={activeJob.progress.total}
              visibilityScore={activeJob.visibility_score} metricsSampleSize={activeJob.metrics_sample_size}
              topCompetitors={activeJob.top_competitors_summary}
              cannibalizedCount={activeJob.results.filter((row) => row.cannibalization).length}
              onFilterClick={(key) => { if (key === 'opportunities' || key === 'competitors') handleNavigate(key); }} />
            <ResultsDataGrid key={activeJob.job_id} results={activeJob.results} domain={activeJob.domain}
              onDownload={handleDownload} onAddToast={addToast}
              onFilterOpportunities={() => markStepComplete('opportunitiesViewed')}
              onExpandRow={() => markStepComplete('xrayInspected')} />
          </>}
      </div>}
      {activeView === 'competitors' && !jobId && <div className="space-y-3"><p>No scan selected.</p><Link to="/history" className="text-blue-600 underline">Choose a scan from History</Link></div>}
      {activeView === 'history' && <HistoryView onLoadJob={handleLoadJob} onAddToast={addToast} onDeleted={refreshHistory} />}
      {activeView === 'help' && <HelpView onResetGuide={resetGuide} onNavigateHome={() => handleNavigate('new-scan')} onAddToast={addToast} />}
    </>}
    <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} onNavigate={handleNavigate}
      onLoadJob={handleLoadJob} onDownload={handleDownload} onToggleTheme={toggleTheme} isDark={isDark}
      jobs={historyJobs} currentJobId={activeJob?.job_id || null}
      jobCompleted={!!activeJob && !isJobRunning} />
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full">
      {toasts.map((toast) => <div key={toast.id} className="pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start justify-between gap-3 animate-fade-in bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start gap-2.5">
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : toast.type === 'info' ? <Info className="w-4 h-4 text-blue-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
          <p className="text-xs leading-relaxed">{toast.message}</p>
        </div>
        <button aria-label="Dismiss notification" onClick={() => setToasts((previous) => previous.filter((item) => item.id !== toast.id))}><X className="w-3.5 h-3.5" /></button>
      </div>)}
    </div>
  </AppShell>;
}
