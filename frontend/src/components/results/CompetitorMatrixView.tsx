import React from 'react';
import { Users, Globe } from 'lucide-react';
import type { Result, TopCompetitorSummary } from '../../types';

interface CompetitorMatrixViewProps {
  domain: string;
  topCompetitors: TopCompetitorSummary[];
  results: Result[];
}

export const CompetitorMatrixView: React.FC<CompetitorMatrixViewProps> = ({
  domain,
  topCompetitors,
  results,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            Competitor SERP Share-of-Voice Matrix
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Aggregated Page 1 real estate captured by external domains across your monitored keyword set.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
          Target: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{domain}</span>
        </div>
      </div>

      {/* Top 5 Competitors Dominance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {topCompetitors.map((comp, idx) => (
          <div
            key={comp.domain}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-zinc-500 font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800">
                  #{idx + 1}
                </span>
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {comp.share_pct}%
                </span>
              </div>
              <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate mb-1" title={comp.domain}>
                {comp.domain}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Owns <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{comp.count}</span> keywords on Page 1
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${Math.min(100, comp.share_pct * 2)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {topCompetitors.length === 0 && (
        <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
          No competitor data aggregated yet. Run a scan with Page 1 results to populate this matrix.
        </div>
      )}

      {/* Cross-Reference Breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-zinc-500" />
          Page 1 Competitive Overlap Breakdown
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          The table below highlights keywords where these leading competitors appear in the Top 5 organic rankings, giving you clear insight into who you need to displace.
        </p>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Keyword</th>
                <th className="py-2.5 px-3 font-mono">Your Rank</th>
                <th className="py-2.5 px-3">Top Competing Domain</th>
                <th className="py-2.5 px-3">Competitor URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {results.slice(0, 15).map((r) => {
                const topComp = r.top_competitors && r.top_competitors[0];
                return (
                  <tr key={r.id || r.keyword} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">{r.keyword}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {r.rank ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">#{r.rank}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {topComp ? (
                        <span className="font-mono text-zinc-600 dark:text-zinc-400">{topComp.domain}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[300px]">
                      {topComp ? (
                        <a
                          href={topComp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[11px]"
                        >
                          {topComp.url}
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
