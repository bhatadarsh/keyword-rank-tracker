import React from 'react';
import { Users, ExternalLink, Globe } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Competitor SERP Share-of-Voice Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated Page 1 real estate captured by external domains across your monitored keyword set.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-slate-800 text-xs text-slate-300 font-mono">
          Target: <span className="font-bold text-white">{domain}</span>
        </div>
      </div>

      {/* Top 5 Competitors Dominance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {topCompetitors.map((comp, idx) => (
          <div
            key={comp.domain}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-slate-800 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-zinc-950 border border-slate-800">
                  Rank #{idx + 1}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {comp.share_pct}%
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-100 truncate mb-1" title={comp.domain}>
                {comp.domain}
              </h4>
              <p className="text-xs text-slate-400">
                Dominates <span className="font-mono text-white font-bold">{comp.count}</span> keywords on Page 1
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, comp.share_pct)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-Reference Table: Which competitors rank for which keywords? */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-zinc-950/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" /> SERP Competitor Cross-Reference
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {results.length} Keywords Analyzed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 border-b border-slate-800/60 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Monitored Keyword</th>
                <th className="py-3 px-3 text-center">Your Rank</th>
                <th className="py-3 px-4">#1 Organic Competitor</th>
                <th className="py-3 px-4">#2 Organic Competitor</th>
                <th className="py-3 px-4 hidden md:table-cell">#3 Organic Competitor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {results.slice(0, 30).map((r) => {
                const c1 = r.top_competitors?.[0];
                const c2 = r.top_competitors?.[1];
                const c3 = r.top_competitors?.[2];

                return (
                  <tr key={r.id || r.keyword} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {r.keyword}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {r.rank ? (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            r.rank <= 3
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : r.rank <= 10
                              ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{r.rank}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-[200px]">
                      {c1 ? (
                        <a
                          href={c1.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate flex items-center gap-1 hover:text-indigo-400 font-mono text-[11px]"
                          title={c1.title}
                        >
                          <span className="truncate">{c1.domain}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-[200px]">
                      {c2 ? (
                        <a
                          href={c2.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate flex items-center gap-1 hover:text-indigo-400 font-mono text-[11px]"
                          title={c2.title}
                        >
                          <span className="truncate">{c2.domain}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300 hidden md:table-cell max-w-[200px]">
                      {c3 ? (
                        <a
                          href={c3.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate flex items-center gap-1 hover:text-indigo-400 font-mono text-[11px]"
                          title={c3.title}
                        >
                          <span className="truncate">{c3.domain}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
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
