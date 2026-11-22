import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Download, ClipboardCopy, Check, AlertTriangle,
  ExternalLink, ChevronRight, X, ArrowUpRight, ArrowDownRight,
  Minus, Globe, Monitor, Smartphone, Layers, Trophy, Target, TrendingUp
} from 'lucide-react';
import type { Result, StatusFilter, SortCol, SortDir } from '../../types';

interface ResultsDataGridProps {
  results: Result[];
  domain: string;
  onDownload: (format: 'csv' | 'xlsx') => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
  onFilterOpportunities?: () => void;
  onExpandRow?: () => void;
}

export const ResultsDataGrid: React.FC<ResultsDataGridProps> = ({
  results,
  domain,
  onDownload,
  onAddToast,
  onFilterOpportunities,
  onExpandRow,
}) => {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const allowedFilters: StatusFilter[] = ['all', 'opportunities', 'page1', 'cannibalization', 'deltas', 'not_found', 'errors'];
  const filter = allowedFilters.includes(params.get('filter') as StatusFilter) ? params.get('filter') as StatusFilter : 'all';
  const sortCol: SortCol = ['keyword', 'rank', 'delta'].includes(params.get('sort') || '') ? params.get('sort') as SortCol : 'rank';
  const sortDir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
  const updateQuery = (values: Record<string, string>, replace = false) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    return next;
  }, { replace });
  const setSearch = (value: string) => updateQuery({ q: value }, true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedResult = results.find((row) => row.id === selectedId) || null;
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
    if (filter === 'errors') return ['api_error', 'rate_limited', 'timeout', 'invalid', 'incomplete'].includes(r.status);
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
      updateQuery({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateQuery({ sort: col, dir: 'asc' });
    }
  };

  const handleSelectFilter = (f: StatusFilter) => {
    updateQuery({ filter: f });
    if (f === 'opportunities' && onFilterOpportunities) {
      onFilterOpportunities();
    }
  };

  const handleOpenRow = (res: Result) => {
    setSelectedId(res.id);
    if (onExpandRow) {
      onExpandRow();
    }
  };

  // Copy filtered table to clipboard (TSV formatted for Google Sheets)
  const handleCopyTSV = () => {
    const header = 'Keyword\tRank\tPrevious Rank\tDelta\tRanking URL\tCannibalization\tPage Title\tStatus\tActual Source\tFallback Used\tFallback Reason\tCoverage Complete';
    const rows = sorted.map((r) =>
      [
        r.keyword,
        r.rank ?? r.status,
        r.previous_rank ?? '—',
        r.rank_delta !== null ? (r.rank_delta > 0 ? `+${r.rank_delta}` : r.rank_delta) : r.comparison_status,
        r.ranking_url ?? '',
        r.cannibalization ? 'Yes (2+ URLs)' : 'No',
        r.page_title ?? '',
        r.status,
        r.actual_provider, r.fallback_used === null ? 'Unknown' : String(r.fallback_used),
        r.fallback_reason || '', r.coverage_complete === null ? 'Unknown' : String(r.coverage_complete),
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
      `Source: ${res.actual_provider}; simulation fallback: ${String(res.fallback_used)}\n` +
      `Coverage complete: ${String(res.coverage_complete)}; results examined: ${res.results_examined}\n` +
      `Current Organic Position: ${res.rank ? `#${res.rank}` : res.status}\n` +
      `Current Ranking URL: ${res.ranking_url || 'None'}\n` +
      `Page Title: ${res.page_title || 'None'}\n` +
      (res.cannibalization
        ? `Cannibalization Alert: Secondary URL ranks at #${res.secondary_rank} (${res.secondary_ranking_url})\n`
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
  const page1Count = results.filter((r) => r.rank && r.rank >= 1 && r.rank <= 10).length;
  const cannibalizedCount = results.filter((r) => r.cannibalization).length;
  const deltaCount = results.filter((r) => r.rank_delta !== null && r.rank_delta !== 0).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleSelectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            All Keywords <span className="font-mono text-[11px] ml-1 opacity-70">({results.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFilter('page1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'page1'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Top 10 Wins</span>
            <span className="font-mono text-[11px] opacity-70">({page1Count})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFilter('opportunities')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'opportunities'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Opportunities (11–30)</span>
            <span className="font-mono text-[11px] opacity-70">({oppCount})</span>
          </button>

          {cannibalizedCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectFilter('cannibalization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                filter === 'cannibalization'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Cannibalization</span>
              <span className="font-mono text-[11px] opacity-70">({cannibalizedCount})</span>
            </button>
          )}

          {deltaCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectFilter('deltas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                filter === 'deltas'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Movements</span>
              <span className="font-mono text-[11px] opacity-70">({deltaCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSelectFilter('not_found')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'not_found'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Not Found
          </button>
          <button type="button" onClick={() => handleSelectFilter('errors')}
            aria-pressed={filter === 'errors'} className="px-3 py-1.5 text-xs font-medium whitespace-nowrap text-rose-700 dark:text-rose-300">
            Errors / incomplete
          </button>
        </div>

        {/* Search & Export Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyTSV}
            title="Copy as TSV (paste directly into Google Sheets)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            {clipCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{clipCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownload('csv')}
            title="Download CSV report"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onDownload('xlsx')}
            title="Download Excel report"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
              <tr>
                <th
                  onClick={() => toggleSort('rank')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors w-24"
                >
                  Rank {sortCol === 'rank' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => toggleSort('delta')}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors w-20"
                >
                  Delta {sortCol === 'delta' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => toggleSort('keyword')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  Keyword {sortCol === 'keyword' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4">Ranking URL</th>
                <th className="py-3 px-4 hidden lg:table-cell">Page Title</th>
                <th className="py-3 px-3 hidden sm:table-cell">Requested Locale / Device</th>
                <th className="py-3 px-4 text-right">SERP X-Ray</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
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
                      onClick={() => handleOpenRow(res)}
                      className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                        isTop3
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isOpp
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-3.5 px-4 font-mono">
                        {res.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-xs font-semibold tabular-nums border ${
                              isTop3
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : isTop10
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                                : isOpp
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            #{res.rank}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Rank Delta Badge */}
                      <td className="py-3.5 px-3 font-mono">
                        {res.rank_delta !== null ? (
                          res.rank_delta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                              <ArrowUpRight className="w-3.5 h-3.5" /> +{res.rank_delta}
                            </span>
                          ) : res.rank_delta < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                              <ArrowDownRight className="w-3.5 h-3.5" /> {res.rank_delta}
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-medium flex items-center">
                              <Minus className="w-3 h-3" />
                            </span>
                          )
                        ) : ['first_seen', 'newly_found', 'dropped'].includes(res.comparison_status) ? (
                          <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 px-1.5 py-0.2 rounded">
                            {res.comparison_status === 'first_seen' ? 'FIRST' : res.comparison_status === 'dropped' ? 'DROPPED' : 'NEW'}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Keyword Name */}
                      <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[220px]">{res.keyword}</span>
                          {res.cannibalization && (
                            <span
                              title={`Keyword cannibalization: ${res.matching_urls_count} URLs rank for this term`}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded"
                            >
                              <AlertTriangle className="w-3 h-3" /> 2+ URLs
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] font-normal text-zinc-600 dark:text-zinc-300">
                          {res.status === 'pending' ? 'Waiting to be processed' : res.actual_provider}
                          {res.fallback_used ? ' · Simulated fallback' : res.actual_provider === 'mock' ? ' · Synthetic' : ''}
                          {res.status !== 'pending' && res.coverage_complete === false ? ' · Partial coverage' : ''}
                        </p>
                      </td>

                      {/* Ranking URL */}
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 max-w-[260px]">
                        {res.ranking_url ? (
                          <span className="truncate block font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                            {res.ranking_url}
                          </span>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-300" title={res.error_message || undefined}>
                            {res.status === 'pending' ? 'Pending' : res.status === 'not_found' ? 'Not found within searched depth'
                              : res.status === 'incomplete' ? 'Not found in retrieved results'
                              : res.error_message || res.status.replaceAll('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Page Title */}
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 hidden lg:table-cell max-w-[220px]">
                        <span className="truncate block" title={res.page_title || ''}>
                          {res.page_title || <span className="text-zinc-400">—</span>}
                        </span>
                      </td>

                      {/* Locale & Device */}
                      <td className="py-3.5 px-3 text-zinc-400 hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 opacity-60" /> {res.country}
                          </span>
                          <span>
                            {res.device === 'desktop' ? <Monitor className="w-3 h-3 inline" /> : <Smartphone className="w-3 h-3 inline" />}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRow(res);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedId(null)}
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> SERP X-Ray Snapshot
                  </span>
                  {selectedResult.cannibalization && (
                    <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2 py-0.2 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Cannibalization Detected
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  &ldquo;{selectedResult.keyword}&rdquo;
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Target Domain: <span className="font-mono text-zinc-700 dark:text-zinc-300">{domain}</span> • Requested: {selectedResult.country} ({selectedResult.device})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                <p>Source: {selectedResult.actual_provider}{selectedResult.actual_provider === 'mock' ? ' (synthetic)' : ''}</p>
                <p>Status: {selectedResult.status.replaceAll('_', ' ')} · {selectedResult.results_examined} results examined</p>
                <p>Coverage: {selectedResult.coverage_complete === null ? 'Unknown' : selectedResult.coverage_complete ? 'Complete' : 'Partial'}</p>
                <p>Effective settings: {selectedResult.effective_country || 'Country unspecified'} · {selectedResult.effective_language || 'Language unspecified'} · {selectedResult.effective_device || 'Device unspecified'}</p>
                {selectedResult.fallback_used && <p>Simulation fallback: {selectedResult.fallback_reason}</p>}
                {selectedResult.error_message && <p role="alert">{selectedResult.error_message}</p>}
              </div>
              {/* Primary vs Secondary Ranking Details */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Your Best Ranking Position
                  </span>
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {selectedResult.rank ? `Rank #${selectedResult.rank}` : selectedResult.status.replaceAll('_', ' ')}
                  </span>
                </div>

                {selectedResult.ranking_url ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selectedResult.page_title}</p>
                    <a
                      href={selectedResult.ranking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      <span>{selectedResult.ranking_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">{selectedResult.status === 'not_found'
                    ? 'Domain was not found within searched depth.' : selectedResult.status === 'incomplete'
                      ? 'Domain was not found in the retrieved results. Requested depth was not fully checked.'
                      : selectedResult.status === 'pending' ? 'This keyword has not been processed yet.' : 'A verified ranking is unavailable.'}</p>
                )}

                {/* Secondary URL if cannibalized */}
                {selectedResult.cannibalization && selectedResult.secondary_ranking_url && (
                  <div className="mt-3 pt-3 border-t border-rose-200/80 dark:border-rose-900/60 space-y-1 bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-200 dark:border-rose-900/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Competing Internal Page
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        Rank #{selectedResult.secondary_rank}
                      </span>
                    </div>
                    <a
                      href={selectedResult.secondary_ranking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      <span>{selectedResult.secondary_ranking_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                      Two separate pages from your domain are competing for this exact term. Consider 301 redirecting or canonicalizing to the primary ranking URL.
                    </p>
                  </div>
                )}
              </div>

              {/* Top 5 SERP Competitors Snapshot */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Top 5 SERP results ({selectedResult.actual_provider})
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
                              ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100'
                              : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-semibold text-xs shrink-0 ${
                              comp.rank <= 3
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            #{comp.rank}
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{comp.title}</span>
                              <span className="font-mono text-[10px] text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                {comp.domain}
                              </span>
                            </div>
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-mono truncate"
                            >
                              <span className="truncate">{comp.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-400 py-3">No competitor snapshot available for this row.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedResult.keyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Search on Google</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => handleCopyActionBrief(selectedResult)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {copiedBrief ? <Check className="w-3.5 h-3.5 text-white" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                <span>{copiedBrief ? 'Copied Prompt!' : 'Copy AI Optimization Brief'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
