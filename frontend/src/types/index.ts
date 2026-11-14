export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type KeywordStatus =
  | 'pending'
  | 'found'
  | 'not_found'
  | 'api_error'
  | 'rate_limited'
  | 'timeout'
  | 'invalid';

export type ViewType = 'new-scan' | 'opportunities' | 'competitors' | 'history' | 'help';

export interface OnboardingState {
  demoRun: boolean;
  opportunitiesViewed: boolean;
  xrayInspected: boolean;
}

export type SortCol = 'keyword' | 'rank' | 'delta';
export type SortDir = 'asc' | 'desc';

export type StatusFilter =
  | 'all'
  | 'opportunities'     // Ranks 11–30
  | 'page1'             // Ranks 1–10
  | 'cannibalization'   // 2+ matching URLs
  | 'deltas'            // keywords with rank movements
  | 'not_found'
  | 'errors';

export interface CompetitorItem {
  rank: number;
  domain: string;
  url: string;
  title: string;
  is_target?: boolean;
}

export interface TopCompetitorSummary {
  domain: string;
  count: number;
  share_pct: number;
}

export interface Result {
  id: number;
  keyword: string;
  rank: number | null;
  previous_rank: number | null;
  rank_delta: number | null;
  ranking_url: string | null;
  page_title: string | null;
  matching_urls_count: number;
  secondary_ranking_url: string | null;
  secondary_rank: number | null;
  cannibalization: boolean;
  status: KeywordStatus;
  country: string;
  language: string;
  device: string;
  top_competitors: CompetitorItem[];
}

export interface Progress {
  total: number;
  completed: number;
  percent: number;
}

export interface JobDetails {
  job_id: string;
  status: JobStatus;
  company_name: string;
  domain: string;
  provider: string;
  country: string;
  language: string;
  device: string;
  depth: number;
  visibility_score: number;
  top_competitors_summary: TopCompetitorSummary[];
  created_at: string | null;
  progress: Progress;
  results: Result[];
}

export interface HistoryJob {
  job_id: string;
  company_name: string;
  domain: string;
  provider: string;
  status: JobStatus;
  country: string;
  language: string;
  device: string;
  depth: number;
  keyword_count: number;
  found_count: number;
  cannibalized_count: number;
  visibility_score: number;
  top_competitors: TopCompetitorSummary[];
  created_at: string | null;
}

export interface ProviderOption {
  id: string;
  name: string;
  tag: string;
  status: string;
  description: string;
}

export interface ConfigResponse {
  providers: ProviderOption[];
  default_provider: string;
  has_serpapi_key: boolean;
  countries: string[];
  languages: string[];
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
