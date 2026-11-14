import React, { useState, useRef } from 'react';
import {
  Upload, Sparkles, FileText, Globe, Monitor, Smartphone,
  CheckCircle2, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import type { ProviderOption } from '../../types';

interface ScanLaunchpadProps {
  onStartScan: (formData: FormData) => Promise<void>;
  providers: ProviderOption[];
  defaultProvider: string;
  countries: string[];
  languages: string[];
  isLoading: boolean;
}

export const ScanLaunchpad: React.FC<ScanLaunchpadProps> = ({
  onStartScan,
  providers,
  defaultProvider,
  countries,
  languages,
  isLoading,
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

  // One-click demo presets with in-memory CSV creation
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
      setCountry('India');
      setLanguage('English');
      setDevice('desktop');
      setDepth(100);

      const csvContent =
        'keyword,country,language,device\n' +
        'free online encyclopedia,India,English,desktop\n' +
        'history of computer science,India,English,desktop\n' +
        'quantum computing basics,India,English,desktop\n' +
        'world war 2 timeline,India,English,desktop\n' +
        'solar system planets,India,English,desktop\n' +
        'artificial intelligence history,India,English,desktop\n' +
        'dna structure discovery,India,English,desktop\n' +
        'nobel prize winners,India,English,desktop\n' +
        'industrial revolution facts,India,English,desktop\n' +
        'relativity theory explained,India,English,desktop';

      const demoFile = new File([csvContent], 'demo_wikipedia_keywords.csv', { type: 'text/csv' });
      handleFileChange(demoFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a keywords file or use one of the Instant Demo presets.');
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append('company_name', companyName.trim());
    fd.append('domain', domain.trim());
    fd.append('country', country);
    fd.append('language', language);
    fd.append('device', device);
    fd.append('depth', depth.toString());
    fd.append('provider', selectedProvider);
    fd.append('file', file);

    try {
      await onStartScan(fd);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to start rank check. Verify backend is running.';
      setError(errorMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Launchpad Banner */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-zinc-950 border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> 100% Zero-Cost SEO Architecture
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Launch Automated SERP Scan
            </h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Track real Google organic positions, detect cannibalization, and extract competitor share-of-voice with zero paid API keys required.
            </p>
          </div>

          {/* Quick Demo Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleLoadDemo('github')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <span>🚀 Demo: GitHub.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemo('wikipedia')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <span>🌐 Demo: Wikipedia.org</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        {/* Engine Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Search Engine Provider
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-zinc-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white">{p.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isSelected ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {p.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Company and Domain */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Company Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GitHub"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Target Domain
            </label>
            <input
              type="text"
              required
              placeholder="e.g. github.com (or app.github.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Locale and Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              {device === 'desktop' ? <Monitor className="w-3.5 h-3.5 text-slate-500" /> : <Smartphone className="w-3.5 h-3.5 text-slate-500" />}
              Device
            </label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as 'desktop' | 'mobile')}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Search Depth
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/70 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value={100}>Top 100 Ranks</option>
              <option value={200}>Top 200 Ranks</option>
              <option value={500}>Top 500 Ranks</option>
            </select>
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" /> Keywords File (CSV or Excel)
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-indigo-500/80 bg-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-zinc-950/40 hover:bg-zinc-950/70'
            }`}
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

            <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-indigo-400' : 'text-slate-500'}`} />

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-indigo-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {file.name}
                </p>
                {filePreview && (
                  <p className="text-xs text-slate-400">
                    Detected ~<span className="font-bold text-white font-mono">{filePreview.rowCount}</span> keywords
                    across columns:{' '}
                    <span className="font-mono text-slate-300">
                      [{filePreview.columns.join(', ')}]
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  Drop CSV/Excel file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  File must contain a <span className="font-mono text-slate-400">"keyword"</span> column header
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-700 hover:from-indigo-400 hover:to-violet-600 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Initializing SERP Scan...</span>
            </>
          ) : (
            <>
              <span>Initialize Intelligence Scan</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
