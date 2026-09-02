import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Upload, Search, Download, AlertCircle, CheckCircle2,
  Loader2, XCircle, TrendingUp, Globe, Monitor, Smartphone,
  FileText, RefreshCw, Zap
} from 'lucide-react';

const API_BASE = '/api/rank-check';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | null;

interface Result {
  keyword: string;
  rank: number | null;
  ranking_url: string | null;
  page_title: string | null;
  status: string;
}

interface Progress {
  total: number;
  completed: number;
  percent: number;
}

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'Germany', 'France', 'UAE', 'Brazil', 'Netherlands',
  'Japan', 'Spain', 'Italy', 'Sweden', 'South Africa',
];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Arabic'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    found:        { label: 'Found',        cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    not_found:    { label: 'Not Found',    cls: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',         icon: <XCircle className="w-3.5 h-3.5" /> },
    pending:      { label: 'Pending',      cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    api_error:    { label: 'API Error',    cls: 'text-red-400 bg-red-400/10 border-red-400/20',            icon: <AlertCircle className="w-3.5 h-3.5" /> },
    rate_limited: { label: 'Rate Limited', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
    timeout:      { label: 'Timeout',      cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  };
  const cfg = map[status] ?? { label: status, cls: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full transition-all ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-zinc-500 text-sm font-medium">—</span>;
  
  // Premium glowing rank badges based on tier
  let colorClass = '';
  if (rank <= 3) {
    colorClass = 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.4)] border-amber-300';
  } else if (rank <= 10) {
    colorClass = 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_10px_rgba(52,211,153,0.4)] border-emerald-400';
  } else if (rank <= 30) {
    colorClass = 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-[0_0_10px_rgba(96,165,250,0.4)] border-blue-400';
  } else {
    colorClass = 'bg-zinc-700 border-zinc-600 shadow-sm';
  }

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white border rounded-full ${colorClass}`}>
      {rank}
    </span>
  );
}

export default function App() {
  const [form, setForm] = useState({
    company_name: '', domain: '', country: 'India',
    language: 'English', device: 'desktop', depth: 100,
  });
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>(null);
  const [progress, setProgress] = useState<Progress>({ total: 0, completed: 0, percent: 0 });
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = jobStatus === 'queued' || jobStatus === 'processing';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'depth' ? Number(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setProgress({ total: 0, completed: 0, percent: 0 });

    if (!file) { setError('Please upload a keyword file (CSV or Excel).'); return; }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('file', file);

    try {
      const { data } = await axios.post(API_BASE, fd);
      setJobId(data.job_id);
      setJobStatus('queued');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to start job. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId || !isRunning) return;

    const poll = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/${jobId}`);
        setJobStatus(data.status);
        setProgress(data.progress);
        setResults(data.results);
        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {/* network blip */}
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId, isRunning]);

  const download = (fmt: 'csv' | 'xlsx') => {
    if (jobId) window.location.href = `${API_BASE}/${jobId}/download/${fmt}`;
  };

  const reset = () => {
    setJobId(null); setJobStatus(null);
    setResults([]); setProgress({ total: 0, completed: 0, percent: 0 });
    setFile(null); setError(null);
  };

  const foundCount = results.filter(r => r.status === 'found').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  const errorCount = results.filter(r => !['found', 'not_found', 'pending'].includes(r.status)).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-['Outfit'] selection:bg-indigo-500/30">
      
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/70 border-b border-white/5">
        <div className="max-w-[90rem] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                NexusRank
              </h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide">ENTERPRISE ORGANIC MONITOR</p>
            </div>
          </div>
          {jobStatus === 'completed' && (
            <button onClick={reset} 
              className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> 
              New Scan
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[90rem] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

        {/* ── Left Panel — Configuration Form ──────────────────────────── */}
        <div className="relative group">
          {/* Animated glow effect behind the card */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-7 py-6 border-b border-white/5 bg-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" /> Configuration
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Configure your search parameters</p>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Company Name</label>
                  <input required name="company_name" value={form.company_name} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                    placeholder="e.g. GitHub" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Domain</label>
                  <input required name="domain" value={form.domain} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                    placeholder="e.g. github.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    <Globe className="inline w-3.5 h-3.5 mr-1.5 opacity-70" />Country
                  </label>
                  <select name="country" value={form.country} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-white/20 appearance-none">
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Language</label>
                  <select name="language" value={form.language} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-white/20 appearance-none">
                    {LANGUAGES.map(l => <option key={l} value={l} className="bg-zinc-900">{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Device</label>
                  <select name="device" value={form.device} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-white/20 appearance-none">
                    <option value="desktop" className="bg-zinc-900">Desktop</option>
                    <option value="mobile" className="bg-zinc-900">Mobile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Search Depth</label>
                  <select name="depth" value={form.depth} onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-white/20 appearance-none">
                    <option value={100} className="bg-zinc-900">Top 100</option>
                    <option value={200} className="bg-zinc-900">Top 200</option>
                    <option value={500} className="bg-zinc-900">Top 500</option>
                  </select>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  <FileText className="inline w-3.5 h-3.5 mr-1.5 opacity-70" />Keywords Data
                </label>
                <label className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
                  ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-zinc-950/50 hover:bg-white/5 hover:border-indigo-500/50'}`}>
                  
                  {file && <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-sm"></div>}
                  
                  <Upload className={`relative z-10 w-7 h-7 mb-2 transition-transform duration-300 group-hover:-translate-y-1 ${file ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <p className="relative z-10 text-sm text-zinc-300 font-medium">
                    {file ? file.name : 'Click to upload CSV or Excel'}
                  </p>
                  <p className="relative z-10 text-[11px] text-zinc-500 mt-1">Requires a "keyword" column</p>
                  <input type="file" className="hidden" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-950/50 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading || isRunning}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                {(loading || isRunning) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isRunning ? 'Processing Scan…' : 'Initialize Scan'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right Panel — Results ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Stats bar */}
          {jobStatus && (
            <div className="grid grid-cols-3 gap-5">
              {[
                { label: 'Found Rankings', value: foundCount, color: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.1)]' },
                { label: 'Not Found', value: notFoundCount, color: 'text-zinc-300', border: 'border-white/10', glow: 'shadow-lg' },
                { label: 'Exceptions', value: errorCount, color: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]' },
              ].map(s => (
                <div key={s.label} className={`relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl border ${s.border} px-6 py-5 ${s.glow} overflow-hidden`}>
                  <div className="relative z-10">
                    <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-zinc-400 mt-1 font-semibold uppercase tracking-wider">{s.label}</p>
                  </div>
                  {/* Decorative background circle */}
                  <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 blur-xl bg-current ${s.color}`}></div>
                </div>
              ))}
            </div>
          )}

          {/* Results panel */}
          {jobStatus ? (
            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
              
              {/* Panel header */}
              <div className="px-7 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                    Scan Results
                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-bold uppercase tracking-wider ${
                      jobStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      jobStatus === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {jobStatus === 'processing' && <Loader2 className="w-3 h-3 inline mr-1.5 animate-spin" />}
                      {jobStatus}
                    </span>
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">{progress.completed} of {progress.total} queries processed</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => download('csv')} disabled={jobStatus !== 'completed'}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all border border-white/5">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button onClick={() => download('xlsx')} disabled={jobStatus !== 'completed'}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                    <Download className="w-4 h-4" /> Excel
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {isRunning && (
                <div className="px-7 py-4 bg-zinc-950/30 shrink-0 border-b border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Processing...</span>
                    <span className="text-xs font-bold text-indigo-400">{progress.percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-700 ease-out relative"
                      style={{ width: `${progress.percent}%` }}>
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_1s_infinite_linear]"></div>
                      </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto grow">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/80 backdrop-blur-md text-zinc-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-semibold border-b border-white/5">Keyword</th>
                      <th className="px-6 py-4 font-semibold border-b border-white/5 text-center w-24">Rank</th>
                      <th className="px-6 py-4 font-semibold border-b border-white/5">Page Title</th>
                      <th className="px-6 py-4 font-semibold border-b border-white/5 hidden xl:table-cell">Target URL</th>
                      <th className="px-6 py-4 font-semibold border-b border-white/5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((r, i) => (
                      <tr key={i} className="group hover:bg-white/[0.02] transition-colors duration-200">
                        <td className="px-6 py-4 font-medium text-zinc-100 group-hover:text-white transition-colors">{r.keyword}</td>
                        <td className="px-6 py-4 text-center">
                          <RankBadge rank={r.rank} />
                        </td>
                        <td className="px-6 py-4 text-zinc-400 max-w-[220px]">
                          <p className="truncate text-xs group-hover:text-zinc-300 transition-colors" title={r.page_title ?? ''}>
                            {r.page_title || <span className="text-zinc-600">—</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4 hidden xl:table-cell max-w-[220px]">
                          {r.ranking_url
                            ? <a href={r.ranking_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate block transition-colors" title={r.ranking_url}>
                                {r.ranking_url}
                              </a>
                            : <span className="text-zinc-600 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/40 backdrop-blur-sm rounded-3xl border border-white/5 h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-zinc-800/80 rounded-2xl border border-white/10 shadow-xl">
                  <Globe className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-bold text-white text-xl">Ready to Scan</h3>
              <p className="text-zinc-400 mt-2 max-w-sm leading-relaxed">
                Configure your parameters on the left, upload a keyword dataset, and initialize the scan to track your organic real estate.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Global styles for animations not included in Tailwind base */}
      <style>{`
        @keyframes shimmer {
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
}
