import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Upload, Search, Download, AlertCircle, CheckCircle2,
  Loader2, XCircle, TrendingUp, Globe, Monitor, Smartphone,
  FileText, RefreshCw
} from 'lucide-react';

// When the Vite proxy is active, /api hits localhost:8000
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
    found:        { label: 'Found',        cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    not_found:    { label: 'Not Found',    cls: 'text-slate-600 bg-slate-100 border-slate-200',         icon: <XCircle className="w-3.5 h-3.5" /> },
    pending:      { label: 'Pending',      cls: 'text-blue-700 bg-blue-50 border-blue-200',             icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    api_error:    { label: 'API Error',    cls: 'text-red-700 bg-red-50 border-red-200',                icon: <AlertCircle className="w-3.5 h-3.5" /> },
    rate_limited: { label: 'Rate Limited', cls: 'text-orange-700 bg-orange-50 border-orange-200',       icon: <AlertCircle className="w-3.5 h-3.5" /> },
    timeout:      { label: 'Timeout',      cls: 'text-yellow-700 bg-yellow-50 border-yellow-200',       icon: <AlertCircle className="w-3.5 h-3.5" /> },
  };
  const cfg = map[status] ?? { label: status, cls: 'text-slate-600 bg-slate-100 border-slate-200', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-slate-400 text-sm">—</span>;
  const color = rank <= 10 ? 'bg-emerald-500' : rank <= 30 ? 'bg-blue-500' : rank <= 100 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full ${color}`}>
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

  // Poll for job status every 2 seconds while running
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
      } catch {/* network blip — keep polling */}
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
    <div className="min-h-screen bg-slate-50 font-['Inter']">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Rank Tracker</h1>
              <p className="text-xs text-slate-500">Google Organic Position Monitor</p>
            </div>
          </div>
          {jobStatus === 'completed' && (
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" /> New Check
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

        {/* ── Left Panel — Configuration Form ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h2 className="text-base font-semibold text-white">Configuration</h2>
            <p className="text-xs text-blue-100 mt-0.5">Set up your rank check parameters</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Company Name</label>
              <input required name="company_name" value={form.company_name} onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white"
                placeholder="e.g. Hiree" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Domain</label>
              <input required name="domain" value={form.domain} onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white"
                placeholder="e.g. hiree.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  <Globe className="inline w-3 h-3 mr-1" />Country
                </label>
                <select name="country" value={form.country} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition">
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Language</label>
                <select name="language" value={form.language} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition">
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Device</label>
                <select name="device" value={form.device} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition">
                  <option value="desktop"><Monitor className="inline w-3 h-3" /> Desktop</option>
                  <option value="mobile"><Smartphone className="inline w-3 h-3" /> Mobile</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Search Depth</label>
                <select name="depth" value={form.depth} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition">
                  <option value={100}>Top 100</option>
                  <option value={200}>Top 200</option>
                  <option value={500}>Top 500</option>
                </select>
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                <FileText className="inline w-3 h-3 mr-1" />Keywords File
              </label>
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                <Upload className={`w-6 h-6 mb-1.5 ${file ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-xs text-slate-600 font-medium">
                  {file ? file.name : 'Click to upload CSV or Excel'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Requires a "keyword" column</p>
                <input type="file" className="hidden" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || isRunning}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
              {(loading || isRunning) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isRunning ? 'Processing…' : 'Run Check'}
            </button>
          </form>
        </div>

        {/* ── Right Panel — Results ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stats bar */}
          {jobStatus && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Found', value: foundCount, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Not Found', value: notFoundCount, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
                { label: 'Errors', value: errorCount, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-3`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Results panel */}
          {jobStatus ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Results
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                      jobStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      jobStatus === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{jobStatus}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{progress.completed} / {progress.total} keywords processed</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => download('csv')} disabled={jobStatus !== 'completed'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button onClick={() => download('xlsx')} disabled={jobStatus !== 'completed'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {isRunning && (
                <div className="px-6 pt-4 pb-2">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress.percent}%` }} />
                  </div>
                  <p className="text-right text-[11px] text-slate-400 mt-1">{progress.percent}%</p>
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto max-h-[560px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Keyword</th>
                      <th className="px-4 py-3 text-center font-medium w-16">Rank</th>
                      <th className="px-4 py-3 text-left font-medium">Page Title</th>
                      <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">URL</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.keyword}</td>
                        <td className="px-4 py-3 text-center">
                          <RankBadge rank={r.rank} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                          <p className="truncate text-xs" title={r.page_title ?? ''}>
                            {r.page_title || <span className="text-slate-300">—</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell max-w-[200px]">
                          {r.ranking_url
                            ? <a href={r.ranking_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate block" title={r.ranking_url}>
                                {r.ranking_url}
                              </a>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 text-base">No results yet</h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-xs">
                Fill in the configuration, upload your keyword file, and click <strong>Run Check</strong>.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
