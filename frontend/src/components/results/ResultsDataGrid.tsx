import React, { useState } from 'react';
import {
  Search, Download, ClipboardCopy, Check, AlertTriangle,
  ExternalLink, ChevronRight, X, ArrowUpRight, ArrowDownRight,
  Sparkles, Globe, Monitor, Smartphone, Layers
} from 'lucide-react';
import type { Result, StatusFilter, SortCol, SortDir } from '../../types';

interface ResultsDataGridProps {
  results: Result[];
  domain: string;
  onDownload: (format: 'csv' | 'xlsx') => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const ResultsDataGrid: React.FC<ResultsDataGridProps> = ({
  results,
  domain,
  onDownload,
  onAddToast,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortCol, setSortCol] = useState<SortCol>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [clipCopied, setClipCopied] = useState(false);

  // Filter logic
  const filtered = results.filter((r) => {
    const matchesSearch = r.keyword.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'opportunities') return r.rank !== null && r.rank >= 11 && r.rank <= 30;
    if (filter === 'page1') return r.rank !== null && r.rank >= 1 && r.rank <= 10;
    if (filter === 'cannibalization') return r.cannibalization;
    if (filter === 'deltas') return r.rank_delta !== null && r.rank_delta !== 0;
    if (filter === 'not_found') return r.status === 'not_found';
    if (filter === 'errors') return ['api_error', 'rate_limited', 'timeout'].includes(r.status);
    return true;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortCol === 'rank') {
      const ra = a.rank ?? 99999;
      const rb = b.rank ?? 99999;
      return sortDir === 'asc' ? ra - rb : rb - ra;
    }
    if (sortCol === 'delta') {
      const da = a.rank_delta ?? -9999;
      const db = b.rank_delta ?? -9999;
      return sortDir === 'asc' ? da - db : db - da;
    }
    return sortDir === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
  });

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Copy filtered table to clipboard (TSV formatted for Google Sheets)
  const handleCopyTSV = () => {
    const header = 'Keyword\tRank\tPrevious Rank\tDelta\tRanking URL\tCannibalization\tPage Title\tStatus';
    const rows = sorted.map((r) =>
      [
        r.keyword,
        r.rank ?? 'Not Found',
        r.previous_rank ?? '—',
        r.rank_delta !== null ? (r.rank_delta > 0 ? `+${r.rank_delta}` : r.rank_delta) : 'NEW',
        r.ranking_url ?? '',
        r.cannibalization ? 'Yes (2+ URLs)' : 'No',
        r.page_title ?? '',
        r.status,
      ].join('\t')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setClipCopied(true);
    onAddToast('success', `${sorted.length} rows copied as TSV — paste directly into Google Sheets!`);
    setTimeout(() => setClipCopied(false), 2500);
  };

  // Copy AI SEO Action Brief
  const handleCopyActionBrief = (res: Result) => {
    const comps = res.top_competitors || [];
    const compText = comps
      .slice(0, 5)
      .map((c) => `#${c.rank}: ${c.title} (${c.url})`)
      .join('\n');

    const prompt =
      `Act as a Principal SEO Strategist & Technical Auditor.\n\n` +
      `Target Domain: ${domain}\n` +
      `Keyword: "${res.keyword}"\n` +
      `Current Organic Position: ${res.rank ? `#${res.rank}` : 'Unranked'}\n` +
      `Current Ranking URL: ${res.ranking_url || 'None'}\n` +
      `Page Title: ${res.page_title || 'None'}\n` +
      (res.cannibalization
        ? `⚠️ Cannibalization Detected: Secondary URL ranks at #${res.secondary_rank} (${res.secondary_ranking_url})\n`
        : '') +
      `\nTop 5 Competing SERP Results:\n${compText}\n\n` +
      `Provide an institutional-grade optimization plan with:\n` +
      `1. Search Intent & Gap Analysis (why are top 3 competitors ranking ahead?)\n` +
      `2. On-Page Content, Title Tag & Heading Recommendations\n` +
      `3. Internal Linking Architecture & Canonicalization Directives to push this keyword to Rank #1–#3.`;

    navigator.clipboard.writeText(prompt);
    setCopiedBrief(true);
    onAddToast('success', 'AI SEO Action Brief copied to clipboard!');
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  const oppCount = results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length;
  const cannibalizedCount = results.filter((r) => r.cannibalization).length;
  const deltaCount = results.filter((r) => r.rank_delta !== null && r.rank_delta !== 0).length;

  return (
    <div className="space-y-4">
      {/* Search & Smart Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            All Keywords <span className="font-mono text-[10px] ml-1 opacity-70">({results.length})</span>
          </button>

          <button
            onClick={() => setFilter('opportunities')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'opportunities'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <span>🔥 Opportunities (11-30)</span>
            <span className="font-mono text-[10px] bg-blue-500/20 px-1.5 py-0.2 rounded-full">
              {oppCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('page1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'page1'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span>🏆 Page 1 Wins</span>
            <span className="font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded-full">
              {results.filter((r) => r.rank && r.rank <= 10).length}
            </span>
          </button>

          {cannibalizedCount > 0 && (
            <button
              onClick={() => setFilter('cannibalization')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === 'cannibalization'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <span>⚠️ Cannibalization</span>
              <span className="font-mono text-[10px] bg-rose-500/20 px-1.5 py-0.2 rounded-full">
                {cannibalizedCount}
              </span>
            </button>
          )}

          {deltaCount > 0 && (
            <button
              onClick={() => setFilter('deltas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === 'deltas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              <span>📈 Movements</span>
              <span className="font-mono text-[10px] bg-indigo-500/20 px-1.5 py-0.2 rounded-full">
                {deltaCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setFilter('not_found')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'not_found'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Not Found
          </button>
        </div>

        {/* Search & Export Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-xl bg-zinc-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={handleCopyTSV}
            title="Copy as TSV (paste directly into Google Sheets)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
          >
            {clipCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{clipCopied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={() => onDownload('csv')}
            title="Download CSV report"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={() => onDownload('xlsx')}
            title="Download Excel report"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('rank')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors w-24"
                >
                  Rank {sortCol === 'rank' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => toggleSort('delta')}
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-200 transition-colors w-20"
                >
                  Delta {sortCol === 'delta' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => toggleSort('keyword')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Keyword {sortCol === 'keyword' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3.5 px-4">Ranking URL & SERP Status</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Page Title</th>
                <th className="py-3.5 px-3 hidden sm:table-cell">Locale / Device</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/40">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No keywords found matching this filter criteria.
                  </td>
                </tr>
              ) : (
                sorted.map((res) => {
                  const isTop3 = res.rank !== null && res.rank <= 3;
                  const isTop10 = res.rank !== null && res.rank > 3 && res.rank <= 10;
                  const isOpp = res.rank !== null && res.rank >= 11 && res.rank <= 30;

                  return (
                    <tr
                      key={res.id || res.keyword}
                      onClick={() => setSelectedResult(res)}
                      className={`group hover:bg-slate-800/30 cursor-pointer transition-colors ${
                        isTop3
                          ? 'border-l-2 border-l-amber-400/80'
                          : isTop10
                          ? 'border-l-2 border-l-emerald-400/80'
                          : isOpp
                          ? 'border-l-2 border-l-blue-400/80'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3.5 px-4 font-mono">
                        {res.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black tabular-nums shadow-sm border ${
                              isTop3
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                : isTop10
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-black border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                : isOpp
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            #{res.rank}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">—</span>
                        )}
                      </td>

                      {/* Rank Delta Badge */}
                      <td className="py-3.5 px-3 font-mono">
                        {res.rank_delta !== null ? (
                          res.rank_delta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold tabular-nums">
                              <ArrowUpRight className="w-3.5 h-3.5" /> +{res.rank_delta}
                            </span>
                          ) : res.rank_delta < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold tabular-nums">
                              <ArrowDownRight className="w-3.5 h-3.5" /> {res.rank_delta}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">0</span>
                          )
                        ) : res.rank !== null && res.previous_rank === null ? (
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Keyword Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{res.keyword}</span>
                          {res.cannibalization && (
                            <span
                              title={`Cannibalization detected: ${res.matching_urls_count} URLs rank for this keyword`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded-md"
                            >
                              <AlertTriangle className="w-3 h-3" /> 2+ URLs
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ranking URL & status */}
                      <td className="py-3.5 px-4 text-slate-400 max-w-[280px]">
                        {res.ranking_url ? (
                          <div className="truncate flex items-center gap-1.5">
                            <span className="truncate text-slate-300 font-mono text-[11px]">
                              {res.ranking_url}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Not found in top results</span>
                        )}
                      </td>

                      {/* Page Title */}
                      <td className="py-3.5 px-4 text-slate-400 hidden lg:table-cell max-w-[220px]">
                        <span className="truncate block" title={res.page_title || ''}>
                          {res.page_title || <span className="text-slate-600">—</span>}
                        </span>
                      </td>

                      {/* Locale & Device */}
                      <td className="py-3.5 px-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Globe className="w-3 h-3 opacity-60" /> {res.country}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {res.device === 'desktop' ? <Monitor className="w-3 h-3 inline" /> : <Smartphone className="w-3 h-3 inline" />}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResult(res);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-950 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <span>X-Ray</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SERP X-Ray Modal Drawer ─────────────────────────────────── */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedResult(null)}
          />

          <div className="relative w-full max-w-2xl bg-zinc-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-zinc-950/80 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> SERP X-Ray Intelligence
                  </span>
                  {selectedResult.cannibalization && (
                    <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Keyword Cannibalization Alert
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  "{selectedResult.keyword}"
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target Domain: <span className="font-mono text-slate-200">{domain}</span> • {selectedResult.country} ({selectedResult.device})
                </p>
              </div>

              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Primary vs Secondary Ranking Details */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Your Best Ranking Result
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {selectedResult.rank ? `Rank #${selectedResult.rank}` : 'Unranked'}
                  </span>
                </div>

                {selectedResult.ranking_url ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{selectedResult.page_title}</p>
                    <a
                      href={selectedResult.ranking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      {selectedResult.ranking_url}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Domain does not rank in the analyzed depth.</p>
                )}

                {/* Secondary URL if cannibalized */}
                {selectedResult.cannibalization && selectedResult.secondary_ranking_url && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Competing Internal URL (Cannibalization)
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        Rank #{selectedResult.secondary_rank}
                      </span>
                    </div>
                    <a
                      href={selectedResult.secondary_ranking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-300 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      {selectedResult.secondary_ranking_url}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Two separate pages from your domain are splitting ranking signals. Consolidate keyword targeting to a single primary URL.
                    </p>
                  </div>
                )}
              </div>

              {/* Top 5 SERP Competitors Snapshot */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Top 5 Organic Competitors on Google
                </span>

                <div className="space-y-1.5">
                  {selectedResult.top_competitors && selectedResult.top_competitors.length > 0 ? (
                    selectedResult.top_competitors.map((comp) => {
                      const isMe = comp.is_target;
                      return (
                        <div
                          key={comp.url}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                            isMe
                              ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200'
                              : 'bg-zinc-950/60 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold shrink-0 ${
                              comp.rank <= 3 ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{comp.rank}
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-100 truncate">{comp.title}</span>
                              <span className="font-mono text-[10px] text-slate-500 uppercase px-1.5 py-0.2 rounded bg-zinc-900 border border-slate-800 shrink-0">
                                {comp.domain}
                              </span>
                            </div>
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-mono truncate"
                            >
                              <span className="truncate">{comp.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 py-3">No competitor snapshot available for this row.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-slate-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedResult.keyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>Verify Live on Google</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => handleCopyActionBrief(selectedResult)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                <span>{copiedBrief ? 'Copied Prompt!' : 'Copy AI SEO Action Brief'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
