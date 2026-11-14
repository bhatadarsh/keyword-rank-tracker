import React from 'react';
import {
  Award, TrendingUp, Target, TrendingDown, Minus,
  Activity, Users, AlertTriangle
} from 'lucide-react';
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
  topCompetitors,
  cannibalizedCount,
  onFilterClick,
}) => {
  const top3 = results.filter((r) => r.rank && r.rank <= 3).length;
  const page1 = results.filter((r) => r.rank && r.rank >= 4 && r.rank <= 10).length;
  const opps = results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length;
  const beyond30 = results.filter((r) => r.rank && r.rank > 30).length;
  const notFound = results.filter((r) => r.status === 'not_found').length;

  const validTotal = Math.max(1, totalKeywords);
  const pTop3 = Math.round((top3 / validTotal) * 100);
  const pPage1 = Math.round((page1 / validTotal) * 100);
  const pOpps = Math.round((opps / validTotal) * 100);
  const pBeyond = Math.round((beyond30 / validTotal) * 100);
  const pNotFound = Math.round((notFound / validTotal) * 100);

  // Health label for Visibility
  const healthBadge =
    visibilityScore >= 35
      ? { label: 'High Organic Dominance', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
      : visibilityScore >= 12
      ? { label: 'Moderate Share-of-Voice', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      : { label: 'Opportunity / Growth Stage', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };

  return (
    <div className="space-y-4">
      {/* Top Bento Row: Visibility Score + Competitor Matrix Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Visibility Score & CTR Gauge */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Organic Visibility Index
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${healthBadge.color}`}>
                {healthBadge.label}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-black text-white font-mono tracking-tight">
                {visibilityScore.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">CTR-Weighted SoV</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Derived from organic SERP click-curve probability across all monitored keywords.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, visibilityScore * 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Cannibalization & Health Telemetry */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> SERP Integrity Checks
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-slate-800">
                Automated Audit
              </span>
            </div>

            <div className="space-y-3 my-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-300">Keyword Cannibalization</span>
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                    cannibalizedCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {cannibalizedCount > 0 ? `⚠️ ${cannibalizedCount} Keywords Affected` : 'Clean (0 Conflicts)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-slate-800/60">
                <span className="text-xs text-slate-300">Striking Distance Potential</span>
                <span className="text-xs font-bold font-mono text-amber-400">
                  {opps} Keywords near Page 1
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
            Resolve cannibalized pages to concentrate ranking equity into single canonical URLs.
          </p>
        </div>

        {/* Card 3: Top Competing Domains */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Top SERP Competitors
              </span>
              <span className="text-[10px] text-slate-500">Page 1 Dominance</span>
            </div>

            {topCompetitors.length > 0 ? (
              <div className="space-y-1.5 my-1">
                {topCompetitors.slice(0, 4).map((comp, idx) => (
                  <div
                    key={comp.domain}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-slate-500 font-bold w-4">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">{comp.domain}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {comp.count} appearances ({comp.share_pct}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                Competitors will populate automatically as SERP results are indexed.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Market share across keyword set</span>
            <span className="text-indigo-400 font-semibold cursor-pointer" onClick={() => onFilterClick?.('competitors')}>
              View Matrix →
            </span>
          </div>
        </div>
      </div>

      {/* 5-Tier Distribution Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Tier 1: Top 3 */}
        <div
          onClick={() => onFilterClick?.('top3')}
          className="cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Top 3
            </span>
            <span className="text-[10px] font-mono text-slate-400">{pTop3}%</span>
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">{top3}</div>
          <p className="text-[11px] text-slate-400 mt-1">Gold zone positions</p>
        </div>

        {/* Tier 2: Page 1 (4-10) */}
        <div
          onClick={() => onFilterClick?.('page1')}
          className="cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Page 1 (4-10)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{pPage1}%</span>
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight">{page1}</div>
          <p className="text-[11px] text-slate-400 mt-1">Prime visibility wins</p>
        </div>

        {/* Tier 3: Opportunities (11-30) */}
        <div
          onClick={() => onFilterClick?.('opportunities')}
          className="cursor-pointer bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 transition-all group relative overflow-hidden"
        >
          {opps > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-400" /> Striking (11-30)
            </span>
            <span className="text-[10px] font-mono text-slate-400">{pOpps}%</span>
          </div>
          <div className="text-2xl font-black text-blue-300 font-mono tracking-tight">{opps}</div>
          <p className="text-[11px] text-slate-400 mt-1">High ROI SEO targets</p>
        </div>

        {/* Tier 4: Beyond 30 */}
        <div
          onClick={() => onFilterClick?.('beyond')}
          className="cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-slate-500" /> Page 4+ (31-100)
            </span>
            <span className="text-[10px] font-mono text-slate-500">{pBeyond}%</span>
          </div>
          <div className="text-2xl font-black text-slate-300 font-mono tracking-tight">{beyond30}</div>
          <p className="text-[11px] text-slate-500 mt-1">Low organic presence</p>
        </div>

        {/* Tier 5: Not Found */}
        <div
          onClick={() => onFilterClick?.('not_found')}
          className="cursor-pointer bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <Minus className="w-4 h-4 text-rose-400" /> Not Found
            </span>
            <span className="text-[10px] font-mono text-slate-400">{pNotFound}%</span>
          </div>
          <div className="text-2xl font-black text-rose-300 font-mono tracking-tight">{notFound}</div>
          <p className="text-[11px] text-slate-400 mt-1">Unranked in top depth</p>
        </div>
      </div>

      {/* Stacked Progress Bar */}
      <div className="w-full bg-zinc-950 rounded-full h-2 flex overflow-hidden border border-slate-800/80">
        {pTop3 > 0 && <div style={{ width: `${pTop3}%` }} className="bg-amber-400 h-full" title={`Top 3: ${top3}`} />}
        {pPage1 > 0 && <div style={{ width: `${pPage1}%` }} className="bg-emerald-400 h-full" title={`Page 1: ${page1}`} />}
        {pOpps > 0 && <div style={{ width: `${pOpps}%` }} className="bg-blue-400 h-full" title={`Opportunities: ${opps}`} />}
        {pBeyond > 0 && <div style={{ width: `${pBeyond}%` }} className="bg-slate-600 h-full" title={`Beyond 30: ${beyond30}`} />}
        {pNotFound > 0 && <div style={{ width: `${pNotFound}%` }} className="bg-rose-500/60 h-full" title={`Not Found: ${notFound}`} />}
      </div>
    </div>
  );
};
