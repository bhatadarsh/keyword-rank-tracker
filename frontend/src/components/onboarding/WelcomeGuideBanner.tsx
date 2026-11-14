import React from 'react';
import { Compass, CheckCircle2, Circle, X, Play, SlidersHorizontal, Layers, Check } from 'lucide-react';
import type { OnboardingState } from '../../types';

interface WelcomeGuideBannerProps {
  completedSteps: OnboardingState;
  completedCount: number;
  isAllCompleted: boolean;
  onDismiss: () => void;
  onRunDemo?: () => void;
  onViewOpportunities?: () => void;
  hasActiveJob?: boolean;
}

export const WelcomeGuideBanner: React.FC<WelcomeGuideBannerProps> = ({
  completedSteps,
  completedCount,
  isAllCompleted,
  onDismiss,
  onRunDemo,
  onViewOpportunities,
  hasActiveJob = false,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-colors mb-6">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {isAllCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            ) : (
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {isAllCompleted ? "Setup complete — you're ready to track live rankings" : 'Getting Started with NexusRank'}
              </h3>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                {completedCount} of 3 completed
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Follow these three quick steps to get full visibility into your organic search rankings and competitors.
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Dismiss guide"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Dismiss</span>
        </button>
      </div>

      {/* 3 Interactive Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Step 1 */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between ${
            completedSteps.demoRun
              ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ring-1 ring-blue-500/10'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Step 1</span>
              {completedSteps.demoRun ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" strokeWidth={2} /> Done
                </span>
              ) : (
                <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.75} />
              )}
            </div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              Run 1-Click Sample Scan
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Test NexusRank immediately with zero CSV setup or API keys using real-world sample keywords.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            {completedSteps.demoRun ? (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Sample scan triggered</span>
            ) : onRunDemo ? (
              <button
                type="button"
                onClick={onRunDemo}
                className="w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run GitHub.com Demo</span>
              </button>
            ) : (
              <span className="text-[11px] text-zinc-400">Start any scan below</span>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between ${
            completedSteps.opportunitiesViewed
              ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Step 2</span>
              {completedSteps.opportunitiesViewed ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" strokeWidth={2} /> Done
                </span>
              ) : (
                <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.75} />
              )}
            </div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
              Filter Opportunities (11–30)
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Isolate keywords on Page 2–3 that already have search engine trust and need minimal effort to reach Page 1.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            {completedSteps.opportunitiesViewed ? (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Opportunities reviewed</span>
            ) : hasActiveJob && onViewOpportunities ? (
              <button
                type="button"
                onClick={onViewOpportunities}
                className="w-full text-xs font-medium py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Opportunities</span>
              </button>
            ) : (
              <span className="text-[11px] text-zinc-400">Filter tabs activate after scan</span>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between ${
            completedSteps.xrayInspected
              ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Step 3</span>
              {completedSteps.xrayInspected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" strokeWidth={2} /> Done
                </span>
              ) : (
                <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.75} />
              )}
            </div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
              SERP X-Ray & AI Brief
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Click any keyword row to compare your page against Top 5 competitors and copy a gap-analysis prompt.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            {completedSteps.xrayInspected ? (
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">X-Ray drawer explored</span>
            ) : (
              <span className="text-[11px] text-zinc-400">Click any keyword row in results</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
