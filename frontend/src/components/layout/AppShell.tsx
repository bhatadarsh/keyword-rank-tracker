import React from 'react';
import {
  TrendingUp, PlusCircle, Target, Users, History,
  Command, Sun, Moon, Loader2, Sparkles, ShieldCheck
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

  const navItems = [
    { id: 'new-scan' as ViewType, label: 'Scan Launchpad', icon: PlusCircle, badge: null },
    {
      id: 'opportunities' as ViewType,
      label: 'Opportunities Vault',
      icon: Target,
      badge: results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length || null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'competitors' as ViewType,
      label: 'Competitor Matrix',
      icon: Users,
      badge: null,
    },
    { id: 'history' as ViewType, label: 'Scan History', icon: History, badge: null },
  ];

  // Quick stats
  const top3Count = results.filter((r) => r.rank && r.rank <= 3).length;
  const page1Count = results.filter((r) => r.rank && r.rank >= 4 && r.rank <= 10).length;
  const oppCount = results.filter((r) => r.rank && r.rank >= 11 && r.rank <= 30).length;
  const cannibalizedCount = results.filter((r) => r.cannibalization).length;

  return (
    <div className={`h-screen flex flex-col font-['Outfit'] selection:bg-indigo-500/30 ${isDark ? 'dark bg-[#090D16] text-slate-100' : 'light bg-slate-50 text-slate-900'}`}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-slate-800/80 bg-zinc-950/80 backdrop-blur-xl z-20">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  NexusRank
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v2.0 PRO
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> 100% Zero Cost
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Open-Source SEO & SERP Intelligence Platform</p>
            </div>
          </div>

          {/* Center / Right controls */}
          <div className="flex items-center gap-2.5">
            {/* Active Engine Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 border border-slate-800 rounded-xl text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Engine:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {activeProvider === 'free' ? 'Free Live (DuckDuckGo)' : activeProvider === 'mock' ? 'Smart Simulation' : 'SerpApi'}
              </span>
            </div>

            {/* In Progress Pulse */}
            {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Scanning
                </span>
              </div>
            )}

            {/* Cmd+K trigger button */}
            <button
              onClick={onOpenCommandPalette}
              title="Open Command Palette (Cmd+K / Ctrl+K)"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-zinc-900 hover:bg-zinc-800 hover:text-slate-200 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <Command className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="text-[10px] font-mono text-slate-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-700">
                ⌘K
              </kbd>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={onToggleTheme}
              title="Toggle theme"
              className="p-2 text-slate-400 hover:text-slate-200 bg-zinc-900 hover:bg-zinc-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Open-Source tag */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              title="View on GitHub"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-zinc-900 hover:bg-zinc-800 border border-slate-800 rounded-xl transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Open Source</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── App Body: Sidebar + Main Content ──────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-60 shrink-0 bg-[#090D16]/95 border-r border-slate-800/80 p-3 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
              Platform Views
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Live Scan Telemetry Sidebar Strip */}
            {results.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                  Active Intelligence
                </p>

                <div className="bg-zinc-900/60 border border-slate-800/70 rounded-xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Top 3 Ranks
                    </span>
                    <span className="font-mono font-bold text-amber-400">{top3Count}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Page 1 (4-10)
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{page1Count}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Opportunities (11-30)
                    </span>
                    <span className="font-mono font-bold text-blue-400">{oppCount}</span>
                  </div>

                  {cannibalizedCount > 0 && (
                    <div className="flex items-center justify-between text-rose-300 pt-1 border-t border-slate-800/50">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Cannibalization
                      </span>
                      <span className="font-mono font-bold text-rose-400">{cannibalizedCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 px-2">
            <p className="font-semibold text-slate-400">NexusRank Platform</p>
            <p className="text-[10px] text-slate-600 mt-0.5">100% Zero-Cost Architecture</p>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#090D16]">
          {children}
        </main>
      </div>
    </div>
  );
};
