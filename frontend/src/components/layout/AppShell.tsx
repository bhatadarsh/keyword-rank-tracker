import React from 'react';
import {
  TrendingUp, PlusCircle, Target, Users, History, HelpCircle,
  Command, Sun, Moon, Loader2, Sparkles, CheckCircle2
} from 'lucide-react';
import type { ViewType, JobStatus, Result } from '../../types';

interface AppShellProps {
  children: React.ReactNode;
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  jobStatus: JobStatus | null;
  activeProvider: string;
  results: Result[];
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeView,
  onNavigate,
  onOpenCommandPalette,
  onToggleTheme,
  isDark,
  jobStatus,
  activeProvider,
  results,
}) => {
  const isRunning = jobStatus === 'queued' || jobStatus === 'processing';
  const oppCount = results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length;

  const navItems = [
    { id: 'rankings' as ViewType, label: 'Rankings', icon: TrendingUp, badge: null },
    {
      id: 'new-scan' as ViewType,
      label: 'New Rank Scan',
      icon: PlusCircle,
      badge: null,
    },
    {
      id: 'opportunities' as ViewType,
      label: 'Results & Opportunities',
      icon: Target,
      badge: oppCount > 0 ? oppCount : null,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    },
    {
      id: 'competitors' as ViewType,
      label: 'Competitor Matrix',
      icon: Users,
      badge: null,
    },
    {
      id: 'history' as ViewType,
      label: 'Scan History',
      icon: History,
      badge: null,
    },
    {
      id: 'help' as ViewType,
      label: 'Help & Glossary',
      icon: HelpCircle,
      badge: null,
    },
  ];

  return (
    <div className={`h-screen flex flex-col antialiased ${isDark ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="shrink-0 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md z-20 px-5 flex items-center justify-between">
        {/* Logo & Platform Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <TrendingUp className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              NexusRank
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 tabular-nums">
              v2.0
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3" /> Zero-Cost Architecture
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Active Engine Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-md text-xs">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-zinc-500 dark:text-zinc-400">Engine:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {{ free: 'Free search', mock: 'Simulation', serpapi: 'SerpApi', duckduckgo: 'DuckDuckGo',
                searxng: 'SearXNG', mixed: 'Mixed sources', unknown: 'Not yet verified' }[activeProvider] || activeProvider}
            </span>
          </div>

          {/* Running Status Indicator */}
          {isRunning && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-md text-xs font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning SERPs</span>
            </div>
          )}

          {/* Cmd+K trigger button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700/60 rounded-md transition-colors cursor-pointer"
            title="Open Command Palette (Cmd+K / Ctrl+K)"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Commands</span>
            <kbd className="text-[10px] font-mono text-zinc-500 bg-white dark:bg-zinc-900 px-1 py-0.2 rounded border border-zinc-300 dark:border-zinc-700">
              ⌘K
            </kbd>
          </button>

          {/* Light/Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-md transition-colors cursor-pointer"
            title="Toggle color theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </header>

      {/* ── App Body: Sidebar + Main Content ──────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Clean Sidebar Nav (240px) */}
        <aside className="w-60 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-3.5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 px-2.5 py-1">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1 text-xs text-zinc-400 dark:text-zinc-500 px-2">
            <div className="flex items-center justify-between text-[11px]">
              <span>Active Engine</span>
              <span className="font-medium text-zinc-600 dark:text-zinc-300 capitalize">
                {activeProvider}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">Open-Source · MIT License</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
};
