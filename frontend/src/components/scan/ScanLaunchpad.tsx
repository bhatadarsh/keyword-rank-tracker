import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Monitor, Smartphone,
  AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import type { ProviderOption, UploadPreview } from '../../types';
import { apiClient, apiErrorMessage } from '../../api/client';

interface ScanLaunchpadProps {
  onStartScan: (formData: FormData) => Promise<void>;
  providers: ProviderOption[];
  defaultProvider: string;
  countries: string[];
  languages: string[];
  isLoading: boolean;
  onboardingBanner?: React.ReactNode;
  onTriggerDemo?: (preset: 'github' | 'wikipedia') => void;
}

export const ScanLaunchpad: React.FC<ScanLaunchpadProps> = ({
  onStartScan,
  providers,
  defaultProvider,
  countries,
  languages,
  isLoading,
  onboardingBanner,
  onTriggerDemo,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState(countries[0] || 'United States');
  const [language, setLanguage] = useState(languages[0] || 'English');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [depth, setDepth] = useState<number>(100);
  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider || 'free');

  const [file, setFile] = useState<File | null>(null);

  const [previewState, setPreviewState] = useState<{
    file: File; settings: string; data: UploadPreview | null; error: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowFallback, setAllowFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selected = providers.find((provider) => provider.id === selectedProvider);
  const previewKey = JSON.stringify([country, language, device]);
  const previewMatches = previewState?.file === file && previewState?.settings === previewKey;
  const filePreview = previewMatches ? previewState?.data : null;
  const previewError = previewMatches ? previewState?.error : null;
  const previewLoading = !!file && !previewMatches;

  const handleFileChange = (incomingFile: File) => {
    setPreviewState(null);
    setError(null);
    if (/\.xls$/i.test(incomingFile.name)) {
      setFile(null);
      setError('Legacy .xls files are not supported. Save as .xlsx or .csv.');
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(incomingFile.name) || incomingFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setError('Choose a CSV or XLSX file up to 5 MB (2,000 rows maximum).');
      return;
    }
    setFile(incomingFile);
  };

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const form = new FormData();
    form.append('file', file);
    form.append('country', country);
    form.append('language', language);
    form.append('device', device);
    apiClient.previewUpload(form, controller.signal).then((preview) => {
      if (!controller.signal.aborted) setPreviewState({ file, settings: previewKey, data: preview, error: null });
    }).catch((cause) => {
      if (!controller.signal.aborted) setPreviewState({ file, settings: previewKey, data: null, error: apiErrorMessage(cause) });
    });
    return () => controller.abort();
  }, [file, country, language, device, previewKey]);

  // Demo presets loader
  const handleLoadDemo = (preset: 'github' | 'wikipedia') => {
    if (preset === 'github') {
      setCompanyName('GitHub');
      setDomain('github.com');
      setCountry('United States');
      setLanguage('English');
      setDevice('desktop');
      setDepth(100);

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
      handleFileChange(demoFile);
    } else {
      setCompanyName('Wikipedia');
      setDomain('wikipedia.org');
      setCountry('United States');
      setLanguage('English');
      setDevice('desktop');
      setDepth(100);

      const csvContent =
        'keyword,country,language,device\n' +
        'artificial intelligence,United States,English,desktop\n' +
        'machine learning,United States,English,desktop\n' +
        'quantum computing,United States,English,desktop\n' +
        'neural networks,United States,English,desktop\n' +
        'deep learning,United States,English,desktop\n' +
        'computer science,United States,English,desktop\n' +
        'data science,United States,English,desktop\n' +
        'natural language processing,United States,English,desktop\n' +
        'reinforcement learning,United States,English,desktop\n' +
        'turing test,United States,English,desktop';

      const demoFile = new File([csvContent], 'demo_wikipedia_keywords.csv', { type: 'text/csv' });
      handleFileChange(demoFile);
    }

    if (onTriggerDemo) {
      onTriggerDemo(preset);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !filePreview || previewLoading) {
      setError('Please upload a CSV/Excel file or choose a sample dataset above.');
      return;
    }
    if (!companyName.trim() || !domain.trim()) {
      setError('Please enter both Company Name and Target Domain.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_name', companyName.trim());
    formData.append('domain', domain.trim());
    formData.append('provider', selectedProvider);
    formData.append('allow_fallback', String(!!selected?.supports_fallback && allowFallback));
    formData.append('country', country);
    formData.append('language', language);
    formData.append('device', device);
    formData.append('depth', depth.toString());

    if (!selected || selected.status !== 'ready') { setError('Choose an available search provider.'); return; }
    try { await onStartScan(formData); } catch (cause) { setError(apiErrorMessage(cause)); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Onboarding Welcome Guide Banner (Dismissible) */}
      {onboardingBanner}

      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        {/* Title */}
        <div className="pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Launch New Keyword Scan
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track organic rankings, identify striking-distance opportunities, and detect keyword cannibalization.
          </p>
        </div>

        {/* 1-Click Quick Test Presets */}
        <div className="mt-5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
              Quick Test: Load Sample Dataset
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Zero configuration required — loads 10 real-world keywords instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleLoadDemo('github')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              GitHub.com (10 keywords)
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemo('wikipedia')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              Wikipedia.org (10 keywords)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Keyword Dataset (CSV or Excel)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-5 text-center bg-zinc-50/50 dark:bg-zinc-800/30 transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <Upload className="w-4 h-4" strokeWidth={1.75} />
                </div>
                {file ? (
                  <div>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {file.name}
                    </span>
                    <span className="text-xs text-zinc-400 ml-1.5">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    {previewLoading && <p role="status" className="text-xs mt-1">Checking file…</p>}
                    {filePreview && (
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Detected <span className="font-semibold">{filePreview.row_count}</span> keywords • {filePreview.duplicates} duplicates and {filePreview.blank_rows} blank rows skipped.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Click to browse or drop your CSV/Excel file here
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Must contain a &ldquo;keyword&rdquo; column. CSV/XLSX, up to 5 MB and 2,000 rows.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Grid 1: Company & Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Company / Project Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Target Domain
                </label>
                <span className="text-[11px] text-zinc-400">root domain or host</span>
              </div>
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. acme.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Form Grid 2: Country & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Country
              </label>
              <select
                disabled={!selected?.supports_locale}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Language
              </label>
              <select
                disabled={!selected?.supports_locale}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Grid 3: Device Segmented Control & Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Device Emulation
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80">
                <button
                  type="button"
                  disabled={!selected?.supports_device}
                  onClick={() => setDevice('desktop')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    device === 'desktop'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  disabled={!selected?.supports_device}
                  onClick={() => setDevice('mobile')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    device === 'mobile'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <span>Search Depth</span>
                  <InfoTooltip content="Requested maximum, not guaranteed coverage. Free search returns one batch and does not apply country, language, or device settings." />
                </label>
                <span className="text-[11px] text-zinc-400">SERP results</span>
              </div>
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-mono"
              >
                {(selected?.depths || [100]).map((value) => <option key={value} value={value}>
                  {selectedProvider === 'free' ? 'One batch (up to 100)' : 'Top ' + value}
                </option>)}
              </select>
            </div>
          </div>


          <fieldset>
            <legend className="block text-xs font-medium mb-1.5">Search Provider Engine</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {providers.map((provider) => <label key={provider.id}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs">
                <input type="radio" name="provider" value={provider.id} checked={selectedProvider === provider.id}
                  disabled={provider.status !== 'ready' || isLoading}
                  onChange={() => {
                    setSelectedProvider(provider.id);
                    if (!provider.depths.includes(depth)) setDepth(provider.depths[0]);
                    setAllowFallback(false);
                  }} />
                <span className="font-semibold ml-2">{provider.name}</span>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">{provider.description}</p>
                {provider.status !== 'ready' && <p className="mt-1">API key required</p>}
              </label>)}
            </div>
            {selected?.supports_fallback && <label className="flex items-start gap-2 mt-3 text-xs text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={allowFallback} onChange={(event) => setAllowFallback(event.target.checked)} />
              <span>Allow simulation if live search is unavailable. Synthetic results will be clearly labeled.</span>
            </label>}
            {selected && !selected.supports_locale && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Free search does not apply country, language, or device settings, including file overrides.
              Results are labeled with the source and actual coverage.
            </p>}
          </fieldset>

          {/* Error Banner */}
          {(error || previewError) && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error || previewError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || previewLoading || !filePreview || selected?.status !== 'ready'}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Scan Task...</span>
              </>
            ) : (
              <>
                <span>Start Rank Scan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
