import React, { useState } from 'react';
import {
  HelpCircle, Search, Target, Activity, AlertTriangle, Layers,
  TrendingUp, Users, Download, RotateCcw
} from 'lucide-react';

interface HelpViewProps {
  onResetGuide: () => void;
  onNavigateHome: () => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const HelpView: React.FC<HelpViewProps> = ({
  onResetGuide,
  onNavigateHome,
  onAddToast,
}) => {
  const [search, setSearch] = useState('');

  const handleDownloadSampleCSV = () => {
    const csvContent =
      'keyword,country,language,device\n' +
      'keyword rank tracker,United States,English,desktop\n' +
      'seo serp checker,United States,English,desktop\n' +
      'organic visibility index,United States,English,desktop\n' +
      'competitor share of voice,United States,English,desktop\n' +
      'keyword cannibalization audit,United States,English,desktop\n' +
      'striking distance seo keywords,United States,English,desktop\n' +
      'serp analysis tool,United Kingdom,English,desktop\n' +
      'google ranking api,Canada,English,desktop\n' +
      'free serp api open source,Germany,English,desktop\n' +
      'search engine ranking checker,India,English,mobile\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nexusrank_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onAddToast('success', 'Sample CSV template downloaded!');
  };

  const handleRestart = () => {
    onResetGuide();
    onAddToast('info', 'Welcome guide restarted. Returning to Launchpad...');
    onNavigateHome();
  };

  const glossaryItems = [
    {
      id: 'opportunities',
      title: 'Striking-Distance Opportunities (Ranks 11–30)',
      icon: Target,
      tag: 'Core Feature',
      color: 'text-amber-600 dark:text-amber-400',
      description:
        'Keywords sitting on Page 2 and Page 3 (positions 11–30) are your highest-leverage optimization targets. Google already considers your domain authoritative enough to rank near Page 1. Small optimizations—such as refreshing title tags, adding targeted H2 sections, or adding 2–3 internal links from high-authority pages—frequently push these into Page 1 traffic.',
    },
    {
      id: 'visibility',
      title: 'Organic Visibility Score (Share-of-Voice %)',
      icon: Activity,
      tag: 'Metric',
      color: 'text-blue-600 dark:text-blue-400',
      description:
        'A single 0–100% weighted metric representing your domain\'s organic search market share. Instead of a naive unweighted average, it applies an industry-standard organic CTR decay curve: Rank #1 receives 30 points, Rank #2 gets 18, Rank #3 gets 12, Ranks #4–10 get 8–2 points, and Ranks #11–30 get 1 point. A higher score means more real click volume.',
    },
    {
      id: 'cannibalization',
      title: 'Keyword Cannibalization Audits',
      icon: AlertTriangle,
      tag: 'Audit',
      color: 'text-rose-600 dark:text-rose-400',
      description:
        'Occurs when two or more distinct URLs from your own domain rank simultaneously for the exact same query. When this happens, search engines split ranking authority and CTR between your competing pages, frequently keeping both stuck below their potential. NexusRank flags these automatically and displays both URLs and their respective ranks.',
    },
    {
      id: 'xray',
      title: 'SERP X-Ray & AI Action Brief',
      icon: Layers,
      tag: 'Intelligence',
      color: 'text-indigo-600 dark:text-indigo-400',
      description:
        'For every keyword, NexusRank captures the Top 5 competing organic search results (URL, page title, and domain). Clicking any keyword row opens the SERP X-Ray drawer. The "Copy AI Optimization Brief" button generates a complete prompt with your ranking URL and the 5 competitors, ready to paste into Claude or ChatGPT for instant content gap analysis.',
    },
    {
      id: 'deltas',
      title: 'Historical Rank Deltas (▲ / ▼ / NEW)',
      icon: TrendingUp,
      tag: 'Analytics',
      color: 'text-emerald-600 dark:text-emerald-400',
      description:
        'Whenever you scan a keyword that was previously tracked for the same target domain, country, language, and device, NexusRank automatically correlates previous position and calculates movement (+5 ranks, -2 ranks, or NEW). This lets you measure the direct impact of on-page updates over time.',
    },
    {
      id: 'matrix',
      title: 'Competitor Share-of-Voice Matrix',
      icon: Users,
      tag: 'Intelligence',
      color: 'text-purple-600 dark:text-purple-400',
      description:
        'NexusRank extracts all root domains appearing on Page 1 across your keyword batch at zero extra API cost. It aggregates market share percentage and surfaces the Top 5 competing domains dominating search real estate in your vertical.',
    },
  ];

  const filteredGlossary = glossaryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            Help & Documentation Center
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Complete technical guide, SEO glossary, and file format specifications.
          </p>
        </div>

        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          <span>Restart Welcome Guide</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search glossary terms, metric definitions, or features..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Section 1: How NexusRank Works */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
            1
          </span>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            How NexusRank Works (3-Step Workflow)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-400">Step 1</span>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 mb-1.5">
              Input Keywords & Parameters
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Upload a CSV or Excel file containing a <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">keyword</code> column, or click one of our 1-click sample demo presets (GitHub or Wikipedia).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-400">Step 2</span>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 mb-1.5">
              Multi-Engine Search Scan
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              NexusRank queries the selected SERP engine (zero-key live search, deterministic simulation, or SerpApi) and locates your domain among organic search results.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-400">Step 3</span>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 mb-1.5">
              Filter Opportunities & Export
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Isolate Page 2–3 opportunities (11–30), inspect ranking competitors via SERP X-Ray, copy AI Action Briefs, and export formatted CSV or auto-fitted Excel reports.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Metric & Feature Glossary */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
            2
          </span>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Feature & Metric Glossary
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGlossary.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {item.tag}
                    </span>
                    <Icon className={`w-4 h-4 ${item.color}`} strokeWidth={1.75} />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGlossary.length === 0 && (
          <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
            No glossary items matched your query &ldquo;{search}&rdquo;.
          </div>
        )}
      </section>

      {/* Section 3: Search Engines Comparison Table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
            3
          </span>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Search Engines Compared
          </h3>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
              <tr>
                <th className="py-3 px-4">Engine</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Depth</th>
                <th className="py-3 px-4">Best Used For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Free Live Search
                </td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">$0 / Zero Keys</td>
                <td className="py-3 px-4">DuckDuckGo Lite &amp; SearXNG</td>
                <td className="py-3 px-4 font-mono">Top 50–100</td>
                <td className="py-3 px-4">Production scans with zero API subscription costs.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Smart Simulation
                </td>
                <td className="py-3 px-4 text-blue-600 dark:text-blue-400 font-medium">$0 / Instant</td>
                <td className="py-3 px-4">Deterministic SHA-256 Engine</td>
                <td className="py-3 px-4 font-mono">Top 100</td>
                <td className="py-3 px-4">Offline testing, rapid prototyping, CI/CD validation.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  SerpApi
                </td>
                <td className="py-3 px-4 text-zinc-500 font-medium">Paid Key Required</td>
                <td className="py-3 px-4">Google Search (Official API)</td>
                <td className="py-3 px-4 font-mono">Top 100–500</td>
                <td className="py-3 px-4">Enterprise-grade deep position tracking beyond Page 1.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: CSV / Excel File Format Guide */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
            4
          </span>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            CSV &amp; Excel Input Format
          </h3>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Required Columns &amp; Overrides
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Only the <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">keyword</code> column is required. Other columns inherit default scan settings if omitted.
              </p>
            </div>

            <button
              onClick={handleDownloadSampleCSV}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Download Sample CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Column Header</th>
                  <th className="py-2.5 px-3">Required?</th>
                  <th className="py-2.5 px-3">Description / Allowed Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">keyword</td>
                  <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">Yes</td>
                  <td className="py-2.5 px-3">The search phrase to query in Google.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">country</td>
                  <td className="py-2.5 px-3 text-zinc-400">Optional</td>
                  <td className="py-2.5 px-3">Country override (e.g. &ldquo;United States&rdquo;, &ldquo;India&rdquo;, &ldquo;United Kingdom&rdquo;).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">language</td>
                  <td className="py-2.5 px-3 text-zinc-400">Optional</td>
                  <td className="py-2.5 px-3">Language override (e.g. &ldquo;English&rdquo;, &ldquo;Spanish&rdquo;, &ldquo;German&rdquo;).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">device</td>
                  <td className="py-2.5 px-3 text-zinc-400">Optional</td>
                  <td className="py-2.5 px-3"><code className="font-mono">desktop</code> or <code className="font-mono">mobile</code>.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
