import React from 'react';
import { Activity, Target, Trophy, AlertTriangle, ChevronRight } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import type { Result, TopCompetitorSummary } from '../../types';

interface BentoAnalyticsHeaderProps {
  results: Result[];
  totalKeywords: number;
  visibilityScore: number;
  topCompetitors: TopCompetitorSummary[];
  cannibalizedCount: number;
  onFilterClick?: (filterKey: string) => void;
}

export const BentoAnalyticsHeader: React.FC<BentoAnalyticsHeaderProps> = ({
  results,
  totalKeywords,
  visibilityScore,
  cannibalizedCount,
  onFilterClick,
}) => {
  const top3 = results.filter((r) => r.rank && r.rank <= 3).length;
  const page1 = results.filter((r) => r.rank && r.rank >= 1 && r.rank <= 10).length;
  const opps = results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length;
  const beyond30 = results.filter((r) => r.rank && r.rank > 30).length;
  const notFound = results.filter((r) => r.status === 'not_found').length;

  const validTotal = Math.max(1, totalKeywords);
  const pPage1 = Math.round((page1 / validTotal) * 100);
  const pOpps = Math.round((opps / validTotal) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organic Visibility Score */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              Visibility Score
              <InfoTooltip
                title="Organic Visibility Index"
                content="A 0–100% CTR-weighted Share of Voice score. Rank #1 gets 30 pts, #2 gets 18 pts, down to #11–30 getting 1 pt."
              />
            </span>
            <span className="text-[11px] font-medium text-zinc-400 font-mono">SoV %</span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              {visibilityScore.toFixed(1)}%
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Organic CTR probability across batch
            </p>
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, visibilityScore * 2.5)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Page 1 Presence (Top 10) */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              Page 1 Rankings
              <InfoTooltip
                title="Page 1 Keywords"
                content="Total keywords ranking in positions 1 through 10, receiving the vast majority of organic clicks."
              />
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-mono">
              {pPage1}%
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              {page1}{' '}
              <span className="text-xs font-normal text-zinc-400 font-sans">
                / {totalKeywords}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Includes <span className="font-medium text-zinc-700 dark:text-zinc-300 font-mono">{top3}</span> in Top 3 positions
            </p>
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${pPage1}%` }}
            />
          </div>
        </div>

        {/* Card 3: Opportunities (11–30) */}
        <div
          onClick={() => onFilterClick && onFilterClick('opportunities')}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between hover:border-amber-400/60 dark:hover:border-amber-600/60 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
              Opportunities (11–30)
              <InfoTooltip
                title="Striking-Distance Keywords"
                content="Keywords ranking on Pages 2 & 3. Minor optimizations can push these onto Page 1 for the highest ROI."
              />
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-500 transition-colors" />
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {opps}{' '}
              <span className="text-xs font-normal text-zinc-400 font-sans">
                ({pOpps}%)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Highest-ROI near-miss targets
            </p>
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${pOpps}%` }}
            />
          </div>
        </div>

        {/* Card 4: Cannibalization Audit */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
              Cannibalization
              <InfoTooltip
                title="Keyword Cannibalization"
                content="Flags when 2 or more distinct pages from your domain rank for the same keyword, splitting ranking power."
              />
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Audit</span>
          </div>

          <div className="my-3">
            <div className={`text-2xl font-bold font-mono tracking-tight ${cannibalizedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {cannibalizedCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {cannibalizedCount > 0
                ? 'Queries with competing internal URLs'
                : 'No internal conflicts detected'}
            </p>
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cannibalizedCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: cannibalizedCount > 0 ? '100%' : '100%' }}
            />
          </div>
        </div>
      </div>

      {/* 5-Tier Distribution Strip */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
          Rank Distribution:
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Top 3:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{top3}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Ranks 4–10:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{Math.max(0, page1 - top3)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Ranks 11–30:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{opps}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>Beyond 30:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{beyond30}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span>Not Found:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{notFound}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
