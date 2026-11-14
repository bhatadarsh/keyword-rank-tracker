import React, { useState, useRef } from 'react';
import {
  Upload, Monitor, Smartphone,
  AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import type { ProviderOption } from '../../types';

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
  providers: _providers,
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
  const [filePreview, setFilePreview] = useState<{
    rowCount: number;
    columns: string[];
    sampleRows: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse CSV client-side for instant preview
  const handleFileChange = (incomingFile: File) => {
    setFile(incomingFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const samples = lines.slice(1, 5);
        setFilePreview({
          rowCount: lines.length - 1,
          columns: header,
          sampleRows: samples,
        });

        if (!header.includes('keyword')) {
          setError('Warning: The uploaded file does not appear to contain a "keyword" column header.');
        }
      }
    };
    reader.readAsText(incomingFile.slice(0, 10000));
  };

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
    if (!file) {
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
    formData.append('country', country);
    formData.append('language', language);
    formData.append('device', device);
    formData.append('depth', depth.toString());

    await onStartScan(formData);
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
                accept=".csv,.xlsx,.xls"
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
                    {filePreview && (
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Detected <span className="font-semibold">{filePreview.rowCount}</span> keywords • Headers: {filePreview.columns.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Click to browse or drop your CSV/Excel file here
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Must contain a &ldquo;keyword&rdquo; column header.
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
                  <InfoTooltip content="Depth 100 scans Google Pages 1–10. Depth 200/500 uses pagination to locate deeply buried rankings." />
                </label>
                <span className="text-[11px] text-zinc-400">SERP results</span>
              </div>
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-mono"
              >
                <option value={100}>Top 100 (Standard Page 1–10)</option>
                <option value={200}>Top 200 (Deep Paginated Scan)</option>
                <option value={500}>Top 500 (Enterprise Deep SERP)</option>
              </select>
            </div>
          </div>

          {/* Search Engine Radio Cards */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Search Provider Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Free Provider */}
              <div
                onClick={() => setSelectedProvider('free')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedProvider === 'free'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Free Live Search
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                    $0 Cost
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Real web queries via DuckDuckGo &amp; SearXNG. No keys required.
                </p>
              </div>

              {/* Mock Provider */}
              <div
                onClick={() => setSelectedProvider('mock')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedProvider === 'mock'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Smart Simulation
                  </span>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded">
                    Instant
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Deterministic SHA-256 test engine with competitor modeling.
                </p>
              </div>

              {/* SerpApi Provider */}
              <div
                onClick={() => setSelectedProvider('serpapi')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedProvider === 'serpapi'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    SerpApi
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                    API Key
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Official Google API with deep offset pagination up to 500 ranks.
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
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
