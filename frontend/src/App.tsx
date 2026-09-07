import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Upload, Search, Download, AlertCircle, CheckCircle2,
  Loader2, XCircle, TrendingUp, Globe, Monitor, Smartphone,
  FileText, RefreshCw, Zap, Clock, History, Plus, BarChart3,
  ChevronUp, ChevronDown, ArrowUpDown, Bell, X, ExternalLink,
  Calendar, Building2, Copy, ChevronRight, Target, Award,
  TrendingDown, Minus, ClipboardCopy, Check
} from 'lucide-react';

const API_BASE = '/api/rank-check';

// ─── Types ────────────────────────────────────────────────────────────────────
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | null;
type ViewType = 'new-scan' | 'history';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'found' | 'not_found' | 'errors' | 'opportunities';

interface Result {
  keyword: string;
  rank: number | null;
  ranking_url: string | null;
  page_title: string | null;
  status: string;
}

interface Progress { total: number; completed: number; percent: number; }
interface HistoryJob {
  job_id: string; company_name: string; domain: string; status: string;
  country: string; language: string; device: string;
  keyword_count: number; found_count: number; created_at: string;
}
interface ToastItem { id: string; type: 'success' | 'error' | 'info'; message: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'Germany', 'France', 'UAE', 'Brazil', 'Netherlands',
  'Japan', 'Spain', 'Italy', 'Sweden', 'South Africa',
];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Arabic'];

// ─── Rank tier helper ─────────────────────────────────────────────────────────
function getRankTier(rank: number | null): 'top3' | 'top10' | 'page2' | 'beyond' | 'none' {
  if (!rank) return 'none';
  if (rank <= 3)  return 'top3';
  if (rank <= 10) return 'top10';
  if (rank <= 30) return 'page2';
  return 'beyond';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatETA(s: number) {
  if (s <= 0) return 'Almost done…';
  if (s < 60) return `~${Math.ceil(s)}s remaining`;
  return `~${Math.ceil(s / 60)} min remaining`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    found:        { label: 'Found',        cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    not_found:    { label: 'Not Found',    cls: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',         icon: <XCircle className="w-3.5 h-3.5" /> },
    pending:      { label: 'Pending',      cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    api_error:    { label: 'API Error',    cls: 'text-red-400 bg-red-400/10 border-red-400/20',            icon: <AlertCircle className="w-3.5 h-3.5" /> },
    rate_limited: { label: 'Rate Limited', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
    timeout:      { label: 'Timeout',      cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',   icon: <AlertCircle className="w-3.5 h-3.5" /> },
    queued:       { label: 'Queued',       cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         icon: <Clock className="w-3.5 h-3.5" /> },
    processing:   { label: 'Processing',   cls: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',   icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    completed:    { label: 'Completed',    cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    failed:       { label: 'Failed',       cls: 'text-red-400 bg-red-400/10 border-red-400/20',            icon: <XCircle className="w-3.5 h-3.5" /> },
  };
  const cfg = map[status] ?? { label: status, cls: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-zinc-600 text-sm font-medium">—</span>;
  const tier = getRankTier(rank);
  const cls =
    tier === 'top3'  ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.5)] border-amber-400' :
    tier === 'top10' ? 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_12px_rgba(52,211,153,0.5)] border-emerald-400' :
    tier === 'page2' ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-[0_0_10px_rgba(96,165,250,0.4)] border-blue-400' :
                       'bg-zinc-700/80 border-zinc-600';
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 text-xs font-black text-white border rounded-full transition-all ${cls}`}>
      {rank}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-sm [animation:slideIn_0.3s_ease]
            ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' :
              t.type === 'error'   ? 'bg-red-950/90 border-red-500/30 text-red-300' :
                                     'bg-zinc-900/90 border-white/10 text-zinc-300'}`}>
          {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" /> :
           t.type === 'error'   ? <AlertCircle  className="w-5 h-5 text-red-400 flex-shrink-0" /> :
                                  <Bell          className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => onDismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Rank Tier Distribution Cards ─────────────────────────────────────────────
function RankTierCards({ results, total }: { results: Result[]; total: number }) {
  const tiers = [
    {
      label: 'Top 3',
      sublabel: 'Gold zone',
      icon: <Award className="w-4 h-4" />,
      count: results.filter(r => r.rank && r.rank <= 3).length,
      color: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.08)]',
      bg: 'bg-amber-500/5', dot: 'bg-amber-400',
    },
    {
      label: 'Top 10',
      sublabel: 'Page 1',
      icon: <TrendingUp className="w-4 h-4" />,
      count: results.filter(r => r.rank && r.rank > 3 && r.rank <= 10).length,
      color: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.08)]',
      bg: 'bg-emerald-500/5', dot: 'bg-emerald-400',
    },
    {
      label: 'Page 2–3',
      sublabel: 'Near miss',
      icon: <Target className="w-4 h-4" />,
      count: results.filter(r => r.rank && r.rank > 10 && r.rank <= 30).length,
      color: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.08)]',
      bg: 'bg-blue-500/5', dot: 'bg-blue-400',
    },
    {
      label: 'Beyond 30',
      sublabel: 'Low visibility',
      icon: <TrendingDown className="w-4 h-4" />,
      count: results.filter(r => r.rank && r.rank > 30).length,
      color: 'text-zinc-400', border: 'border-zinc-600/40', glow: '',
      bg: 'bg-zinc-800/30', dot: 'bg-zinc-500',
    },
    {
      label: 'Not Found',
      sublabel: 'Unranked',
      icon: <Minus className="w-4 h-4" />,
      count: results.filter(r => r.status === 'not_found').length,
      color: 'text-rose-400', border: 'border-rose-500/20', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.05)]',
      bg: 'bg-rose-500/5', dot: 'bg-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {tiers.map(tier => {
        const pct = total > 0 ? Math.round((tier.count / total) * 100) : 0;
        return (
          <div key={tier.label}
            className={`relative ${tier.bg} ${tier.border} ${tier.glow} border rounded-2xl px-4 py-4 overflow-hidden group transition-all duration-300 hover:scale-[1.02]`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-1.5 rounded-lg bg-current/10 ${tier.color}`}>{tier.icon}</div>
              <span className="text-[10px] text-zinc-600 font-medium">{pct}%</span>
            </div>
            <p className={`text-3xl font-black ${tier.color} leading-none`}>{tier.count}</p>
            <p className="text-xs font-semibold text-zinc-300 mt-1">{tier.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{tier.sublabel}</p>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
              <div className={`h-full ${tier.dot} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary Stats Strip ──────────────────────────────────────────────────────
function SummaryStatsStrip({ results }: { results: Result[] }) {
  const ranked = results.filter(r => r.rank !== null && r.rank > 0);
  if (ranked.length === 0) return null;

  const ranks = ranked.map(r => r.rank!);
  const best  = Math.min(...ranks);
  const avg   = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
  const p1    = ranks.filter(r => r <= 10).length;
  const bestKw = ranked.find(r => r.rank === best)?.keyword ?? '';

  return (
    <div className="flex items-center gap-0 bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden divide-x divide-white/5">
      {[
        { label: 'Best Rank', value: `#${best}`, sub: bestKw, icon: <Award className="w-3.5 h-3.5 text-amber-400" /> },
        { label: 'Avg Rank', value: `#${avg}`, sub: `across ${ranked.length} found`, icon: <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> },
        { label: 'Page 1 Keywords', value: p1, sub: `rank ≤ 10`, icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
      ].map(stat => (
        <div key={stat.label} className="flex-1 px-5 py-3 flex items-center gap-3">
          {stat.icon}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white">{stat.value}</span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[120px]" title={stat.sub}>{stat.sub}</span>
            </div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Expanded Row Detail ──────────────────────────────────────────────────────
function ExpandedRowDetail({ result, onClose }: { result: Result; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const verifyUrl = `https://www.google.com/search?q=${encodeURIComponent(result.keyword)}`;

  const copyUrl = () => {
    if (result.ranking_url) {
      navigator.clipboard.writeText(result.ranking_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <tr>
      <td colSpan={5} className="px-5 py-0">
        <div className="my-2 p-4 bg-zinc-950/60 rounded-2xl border border-white/10 space-y-3 [animation:expandDown_0.2s_ease]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              {result.keyword}
            </span>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* URL */}
            {result.ranking_url && (
              <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Ranking URL</p>
                <p className="text-xs text-zinc-200 break-all leading-relaxed">{result.ranking_url}</p>
              </div>
            )}

            {/* Page Title */}
            {result.page_title && (
              <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Page Title</p>
                <p className="text-xs text-zinc-200 leading-relaxed">{result.page_title}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Verify on Google
            </a>
            {result.ranking_url && (
              <button onClick={copyUrl}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl transition-all">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            )}
            <span className="text-xs text-zinc-600 ml-auto">
              Status: <span className="text-zinc-400 capitalize">{result.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function ResultsPanel({
  results, jobStatus, progress, jobId, onDownload, companyName, domain, addToast,
}: {
  results: Result[];
  jobStatus: JobStatus;
  progress: Progress;
  jobId: string | null;
  onDownload: (fmt: 'csv' | 'xlsx') => void;
  companyName?: string;
  domain?: string;
  addToast: (type: ToastItem['type'], msg: string) => void;
}) {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortCol, setSortCol]       = useState<'keyword' | 'rank'>('rank');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [clipCopied, setClipCopied]   = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const isRunning = jobStatus === 'queued' || jobStatus === 'processing';

  useEffect(() => { if (jobStatus === 'queued') startTimeRef.current = Date.now(); }, [jobStatus]);

  const eta = (() => {
    if (!isRunning || progress.completed === 0) return null;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    return (progress.total - progress.completed) * (elapsed / progress.completed);
  })();

  // Filter
  const filtered = results.filter(r => {
    const matchSearch = r.keyword.toLowerCase().includes(search.toLowerCase());
    const tier = getRankTier(r.rank);
    const matchStatus =
      statusFilter === 'all'           ? true :
      statusFilter === 'found'         ? r.status === 'found' :
      statusFilter === 'not_found'     ? r.status === 'not_found' :
      statusFilter === 'opportunities' ? (tier === 'page2') : // rank 11-30, just off page 1
      !['found', 'not_found', 'pending'].includes(r.status);
    return matchSearch && matchStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortCol === 'rank') {
      const ra = a.rank ?? 9999, rb = b.rank ?? 9999;
      return sortDir === 'asc' ? ra - rb : rb - ra;
    }
    return sortDir === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
  });

  const toggleSort = (col: 'keyword' | 'rank') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: 'keyword' | 'rank' }) =>
    sortCol !== col ? <ArrowUpDown className="w-3 h-3 opacity-25" /> :
    sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />;

  const foundCount    = results.filter(r => r.status === 'found').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  const errorCount    = results.filter(r => !['found', 'not_found', 'pending'].includes(r.status)).length;
  const opportunityCount = results.filter(r => getRankTier(r.rank) === 'page2').length;
  const foundPct      = progress.total > 0 ? Math.round((foundCount / progress.total) * 100) : 0;

  // Copy filtered results to clipboard (TSV format, pastes directly into Google Sheets)
  const copyToClipboard = () => {
    const header = 'Keyword\tRank\tStatus\tPage Title\tURL';
    const rows = sorted.map(r =>
      [r.keyword, r.rank ?? '', r.status.replace('_', ' '), r.page_title ?? '', r.ranking_url ?? ''].join('\t')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setClipCopied(true);
    addToast('success', `${sorted.length} rows copied — paste directly into Google Sheets!`);
    setTimeout(() => setClipCopied(false), 2500);
  };

  const tabs: { key: StatusFilter; label: string; count: number; tip?: string }[] = [
    { key: 'all',           label: 'All',           count: results.filter(r => r.status !== 'pending').length },
    { key: 'found',         label: 'Found',         count: foundCount },
    { key: 'opportunities', label: '🎯 Opportunities', count: opportunityCount, tip: 'Keywords ranking 11–30 — closest to Page 1. Focus your SEO efforts here.' },
    { key: 'not_found',     label: 'Not Found',     count: notFoundCount },
    { key: 'errors',        label: 'Errors',        count: errorCount },
  ];

  // Row background tint by tier
  const rowTintClass = (r: Result) => {
    const tier = getRankTier(r.rank);
    if (tier === 'top3')  return 'hover:bg-amber-500/[0.04]';
    if (tier === 'top10') return 'hover:bg-emerald-500/[0.04]';
    if (tier === 'page2') return 'hover:bg-blue-500/[0.04]';
    return 'hover:bg-white/[0.02]';
  };

  const rankLeftBorder = (r: Result) => {
    const tier = getRankTier(r.rank);
    if (tier === 'top3')  return 'border-l-2 border-l-amber-400/60';
    if (tier === 'top10') return 'border-l-2 border-l-emerald-400/50';
    if (tier === 'page2') return 'border-l-2 border-l-blue-400/40';
    return 'border-l-2 border-l-transparent';
  };

  return (
    <div className="space-y-4">
      {/* Rank Tier Distribution */}
      {results.some(r => r.status !== 'pending') && (
        <RankTierCards results={results} total={progress.total} />
      )}

      {/* Summary stats */}
      {jobStatus === 'completed' && <SummaryStatsStrip results={results} />}

      {/* Main results card */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '440px' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
                {companyName && <span>{companyName}</span>}
                {domain && <span className="text-xs font-normal text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-white/5">{domain}</span>}
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase tracking-wider ${
                  jobStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  jobStatus === 'failed'    ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                             'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {isRunning && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                  {jobStatus}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {progress.completed} / {progress.total} processed
                {isRunning && eta !== null && <span className="ml-2 text-indigo-400 font-semibold">• {formatETA(eta)}</span>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              {/* Copy to clipboard */}
              <button onClick={copyToClipboard} disabled={sorted.length === 0}
                title="Copy filtered results as TSV — paste directly into Google Sheets"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl transition-all border border-white/5">
                {clipCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                {clipCopied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => onDownload('csv')} disabled={jobStatus !== 'completed'}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl transition-all border border-white/5">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={() => onDownload('xlsx')} disabled={jobStatus !== 'completed'}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 disabled:cursor-not-allowed rounded-xl transition-all shadow-[0_0_12px_rgba(79,70,229,0.3)]">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>

          {/* Found % bar */}
          {progress.total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-500"><span className="text-emerald-400 font-bold">{foundCount}</span> / {progress.completed} found</span>
                <span className={`font-bold ${foundPct >= 50 ? 'text-emerald-400' : foundPct >= 20 ? 'text-amber-400' : 'text-zinc-500'}`}>{foundPct}% ranking</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                {isRunning ? (
                  <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-700 relative [animation:shimmer_1s_infinite_linear] bg-[length:20px_20px]" style={{ width: `${progress.percent}%` }} />
                ) : (
                  <div className={`h-full rounded-full transition-all duration-700 ${foundPct >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : foundPct >= 20 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-zinc-600'}`}
                    style={{ width: `${foundPct}%` }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-zinc-950/20 shrink-0 flex items-center gap-3 flex-wrap">
          <div className="flex gap-0.5 bg-zinc-950/60 rounded-xl p-1 border border-white/5">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setExpandedRow(null); }}
                title={tab.tip}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.key ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                } ${tab.key === 'opportunities' && tab.count > 0 && statusFilter !== 'opportunities' ? 'relative' : ''}`}>
                {tab.label}
                <span className={`ml-1.5 text-[10px] ${statusFilter === tab.key ? 'text-indigo-200' : 'text-zinc-600'}`}>{tab.count}</span>
                {/* Pulse dot for non-zero opportunities */}
                {tab.key === 'opportunities' && tab.count > 0 && statusFilter !== 'opportunities' && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input type="text" placeholder="Search keywords…" value={search}
              onChange={e => { setSearch(e.target.value); setExpandedRow(null); }}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-700 text-zinc-200"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors" /></button>}
          </div>

          {statusFilter === 'opportunities' && opportunityCount > 0 && (
            <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl">
              💡 These rank 11–30. Focus SEO here for quick wins.
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-auto grow">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-950/80 text-zinc-500 text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="w-8 px-3 py-3.5 border-b border-white/5" />
                <th className="px-5 py-3.5 border-b border-white/5">
                  <button onClick={() => toggleSort('keyword')} className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors font-semibold">
                    Keyword <SortIcon col="keyword" />
                  </button>
                </th>
                <th className="px-5 py-3.5 border-b border-white/5 w-24">
                  <button onClick={() => toggleSort('rank')} className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors font-semibold mx-auto">
                    Rank <SortIcon col="rank" />
                  </button>
                </th>
                <th className="px-5 py-3.5 border-b border-white/5 font-semibold">Page Title</th>
                <th className="px-5 py-3.5 border-b border-white/5 font-semibold hidden xl:table-cell">URL</th>
                <th className="px-5 py-3.5 border-b border-white/5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-600 text-xs">
                    {search ? `No keywords matching "${search}"` : 'No results in this category.'}
                  </td>
                </tr>
              ) : sorted.map((r, i) => (
                <>
                  <tr key={`row-${i}`}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    className={`group cursor-pointer transition-colors duration-150 border-b border-white/[0.03] ${rankLeftBorder(r)} ${rowTintClass(r)} ${expandedRow === i ? 'bg-white/[0.03]' : ''}`}>
                    {/* Expand chevron */}
                    <td className="px-3 py-3.5 text-center">
                      <ChevronRight className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${expandedRow === i ? 'rotate-90 text-indigo-400' : ''}`} />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-200 group-hover:text-white transition-colors max-w-[180px]">
                      <span className="truncate block" title={r.keyword}>{r.keyword}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center"><RankBadge rank={r.rank} /></td>
                    <td className="px-5 py-3.5 text-zinc-400 max-w-[200px]">
                      <p className="truncate text-xs group-hover:text-zinc-300 transition-colors" title={r.page_title ?? ''}>
                        {r.page_title || <span className="text-zinc-700">—</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell max-w-[200px]">
                      {r.ranking_url
                        ? <a href={r.ranking_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate flex items-center gap-1 transition-colors" title={r.ranking_url}>
                            <span className="truncate">{r.ranking_url}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        : <span className="text-zinc-700 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  </tr>
                  {expandedRow === i && (
                    <ExpandedRowDetail key={`expand-${i}`} result={r} onClose={() => setExpandedRow(null)} />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView({ onLoadJob }: { onLoadJob: (jobId: string) => void }) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(API_BASE).then(({ data }) => setJobs(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-zinc-500 gap-3">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
    </div>
  );
  if (jobs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
      <History className="w-12 h-12 opacity-20" />
      <p className="text-sm">No scans yet — run your first check!</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Scan History</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{jobs.length} scan{jobs.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 bg-zinc-900 border border-white/10 hover:bg-zinc-800 hover:text-white rounded-xl transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/80 text-zinc-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold text-left border-b border-white/5">Company / Domain</th>
              <th className="px-6 py-4 font-semibold text-left border-b border-white/5 hidden md:table-cell">Settings</th>
              <th className="px-6 py-4 font-semibold text-center border-b border-white/5">Keywords</th>
              <th className="px-6 py-4 font-semibold text-center border-b border-white/5">Ranking %</th>
              <th className="px-6 py-4 font-semibold text-left border-b border-white/5 hidden lg:table-cell">Date</th>
              <th className="px-6 py-4 font-semibold text-left border-b border-white/5">Status</th>
              <th className="px-6 py-4 font-semibold text-center border-b border-white/5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {jobs.map(job => {
              const foundPct = job.keyword_count > 0 ? Math.round((job.found_count / job.keyword_count) * 100) : 0;
              return (
                <tr key={job.job_id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-100 truncate">{job.company_name}</p>
                        <p className="text-xs text-zinc-500">{job.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-lg">{job.country}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-lg">{job.device}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-zinc-200">{job.keyword_count}</td>
                  <td className="px-6 py-4">
                    {job.status === 'completed' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${foundPct >= 50 ? 'text-emerald-400' : foundPct >= 20 ? 'text-amber-400' : 'text-zinc-400'}`}>{foundPct}%</span>
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${foundPct >= 50 ? 'bg-emerald-500' : foundPct >= 20 ? 'bg-amber-500' : 'bg-zinc-600'}`} style={{ width: `${foundPct}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-600">{job.found_count}/{job.keyword_count}</span>
                      </div>
                    ) : <span className="text-zinc-600 text-xs block text-center">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {job.created_at ? formatDate(job.created_at) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onLoadJob(job.job_id)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all">
                        View
                      </button>
                      {job.status === 'completed' && (
                        <a href={`${API_BASE}/${job.job_id}/download/xlsx`}
                          className="p-1.5 text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl transition-all">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('new-scan');
  const [form, setForm] = useState({
    company_name: '', domain: '', country: 'India',
    language: 'English', device: 'desktop', depth: 100,
  });
  const [file, setFile]           = useState<File | null>(null);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>(null);
  const [progress, setProgress]   = useState<Progress>({ total: 0, completed: 0, percent: 0 });
  const [results, setResults]     = useState<Result[]>([]);
  const [jobMeta, setJobMeta]     = useState<{ company_name?: string; domain?: string }>({});
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [toasts, setToasts]       = useState<ToastItem[]>([]);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef             = useRef<string | null>(null);

  const isRunning = jobStatus === 'queued' || jobStatus === 'processing';

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'depth' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setResults([]); setProgress({ total: 0, completed: 0, percent: 0 });
    if (!file) { setError('Please upload a keyword file (CSV or Excel).'); return; }
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('file', file);
    try {
      const { data } = await axios.post(API_BASE, fd);
      setJobId(data.job_id);
      setJobStatus('queued');
      setJobMeta({ company_name: form.company_name, domain: form.domain });
      prevStatusRef.current = 'queued';
      addToast('info', `Scan started — ${data.keyword_count} keywords queued`);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to start job. Is the backend running?');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!jobId || !isRunning) return;
    const poll = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/${jobId}`);
        const prev = prevStatusRef.current;
        setJobStatus(data.status); setProgress(data.progress); setResults(data.results);
        setJobMeta({ company_name: data.company_name, domain: data.domain });
        prevStatusRef.current = data.status;
        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (prev !== 'completed' && data.status === 'completed') {
            const found = (data.results as Result[]).filter(r => r.status === 'found').length;
            const opps  = (data.results as Result[]).filter(r => getRankTier(r.rank) === 'page2').length;
            addToast('success', `Scan complete! ${found}/${data.progress.total} ranking${opps > 0 ? ` • ${opps} opportunities near page 1` : ''}`);
          }
          if (prev !== 'failed' && data.status === 'failed') addToast('error', 'Scan failed. Check backend logs.');
        }
      } catch {}
    };
    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId, isRunning, addToast]);

  const download = (fmt: 'csv' | 'xlsx') => {
    if (jobId) window.location.href = `${API_BASE}/${jobId}/download/${fmt}`;
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setJobId(null); setJobStatus(null); setResults([]);
    setProgress({ total: 0, completed: 0, percent: 0 });
    setFile(null); setError(null); setJobMeta({});
    prevStatusRef.current = null;
  };

  const loadJob = async (jid: string) => {
    try {
      const { data } = await axios.get(`${API_BASE}/${jid}`);
      reset();
      setJobId(data.job_id); setJobStatus(data.status);
      setProgress(data.progress); setResults(data.results);
      setJobMeta({ company_name: data.company_name, domain: data.domain });
      prevStatusRef.current = data.status;
      setActiveView('new-scan');
    } catch { addToast('error', 'Could not load job.'); }
  };

  const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'new-scan', label: 'New Scan', icon: Plus },
    { id: 'history',  label: 'History',  icon: History },
  ];

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-['Outfit'] selection:bg-indigo-500/30 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">NexusRank</h1>
              <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Keyword Rank Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                <span className="text-xs text-indigo-400 font-semibold">Scan in progress</span>
              </div>
            )}
            {jobStatus === 'completed' && (
              <button onClick={reset} className="group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all">
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> New Scan
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-[190px] shrink-0 bg-zinc-950/40 border-r border-white/5 pt-5 px-3 flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveView(id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeView === id
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}

          {/* Live scan mini stats */}
          {jobStatus && activeView === 'new-scan' && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-2 mb-2">Live Stats</p>
              {[
                { label: 'Top 3',     value: results.filter(r => r.rank && r.rank <= 3).length,  color: 'text-amber-400' },
                { label: 'Top 10',    value: results.filter(r => r.rank && r.rank > 3 && r.rank <= 10).length, color: 'text-emerald-400' },
                { label: 'Opps',      value: results.filter(r => getRankTier(r.rank) === 'page2').length, color: 'text-blue-400' },
                { label: 'Not Found', value: results.filter(r => r.status === 'not_found').length, color: 'text-zinc-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-xs text-zinc-600">{s.label}</span>
                  <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Main */}
        <main className="flex-1 overflow-auto p-6">
          {activeView === 'history' ? (
            <HistoryView onLoadJob={loadJob} />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[350px_1fr] gap-6 items-start">
              {/* Config form */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl blur opacity-15 group-hover:opacity-25 transition duration-1000" />
                <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-white/5 bg-white/[0.025]">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400" /> Configuration
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Set up your rank check parameters</p>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Company Name</label>
                      <input required name="company_name" value={form.company_name} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                        placeholder="e.g. GitHub" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Domain</label>
                      <input required name="domain" value={form.domain} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                        placeholder="e.g. github.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5"><Globe className="inline w-3 h-3 mr-1 opacity-70" />Country</label>
                        <select name="country" value={form.country} onChange={handleChange}
                          className="w-full px-3 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-white/20 appearance-none">
                          {COUNTRIES.map(c => <option key={c} className="bg-zinc-900">{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Language</label>
                        <select name="language" value={form.language} onChange={handleChange}
                          className="w-full px-3 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-white/20 appearance-none">
                          {LANGUAGES.map(l => <option key={l} className="bg-zinc-900">{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Device</label>
                        <select name="device" value={form.device} onChange={handleChange}
                          className="w-full px-3 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-white/20 appearance-none">
                          <option value="desktop" className="bg-zinc-900"><Monitor className="inline" /> Desktop</option>
                          <option value="mobile" className="bg-zinc-900"><Smartphone className="inline" /> Mobile</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Depth</label>
                        <select name="depth" value={form.depth} onChange={handleChange}
                          className="w-full px-3 py-2.5 text-sm bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-white/20 appearance-none">
                          <option value={100} className="bg-zinc-900">Top 100</option>
                          <option value={200} className="bg-zinc-900">Top 200</option>
                          <option value={500} className="bg-zinc-900">Top 500</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5"><FileText className="inline w-3 h-3 mr-1 opacity-70" />Keywords File</label>
                      <label className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
                        ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 bg-zinc-950/50 hover:bg-white/5 hover:border-indigo-500/40'}`}>
                        {file && <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl" />}
                        <Upload className={`relative z-10 w-6 h-6 mb-1.5 transition-transform group-hover:-translate-y-1 ${file ? 'text-indigo-400' : 'text-zinc-600'}`} />
                        <p className="relative z-10 text-sm text-zinc-300 font-medium truncate max-w-[90%] text-center">{file ? file.name : 'Upload CSV or Excel'}</p>
                        <p className="relative z-10 text-[11px] text-zinc-600 mt-0.5">Requires a "keyword" column</p>
                        <input type="file" className="hidden" accept=".csv,.xls,.xlsx" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                      </label>
                    </div>
                    {error && (
                      <div className="p-3.5 bg-red-950/50 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{error}</p>
                      </div>
                    )}
                    <button type="submit" disabled={loading || isRunning}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                      {(loading || isRunning) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      {isRunning ? 'Processing…' : 'Initialize Scan'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Results */}
              {jobStatus ? (
                <ResultsPanel
                  results={results} jobStatus={jobStatus} progress={progress}
                  jobId={jobId} onDownload={download}
                  companyName={jobMeta.company_name} domain={jobMeta.domain}
                  addToast={addToast}
                />
              ) : (
                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 min-h-[540px] flex flex-col items-center justify-center text-center p-12">
                  <div className="relative mb-6">
                    <div className="absolute -inset-4 bg-indigo-500/15 rounded-full blur-xl animate-pulse" />
                    <div className="relative p-5 bg-zinc-800/80 rounded-2xl border border-white/10 shadow-xl">
                      <BarChart3 className="w-12 h-12 text-zinc-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-xl">Ready to Scan</h3>
                  <p className="text-zinc-500 mt-2 max-w-xs leading-relaxed text-sm">
                    Configure your parameters, upload a keywords file, and click Initialize Scan.
                  </p>
                  <button onClick={() => setActiveView('history')}
                    className="mt-5 flex items-center gap-2 text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
                    <History className="w-3.5 h-3.5" /> View past scans
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
      <style>{`
        @keyframes shimmer    { 100% { background-position: 20px 0; } }
        @keyframes slideIn    { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes expandDown { from { opacity: 0; transform: scaleY(0.95) translateY(-4px); } to { opacity: 1; transform: scaleY(1) translateY(0); } }
      `}</style>
    </div>
  );
}
