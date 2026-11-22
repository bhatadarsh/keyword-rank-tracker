export type JobStatus = 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';

export type KeywordStatus =
  | 'pending'
  | 'found'
  | 'not_found'
  | 'api_error'
  | 'rate_limited'
  | 'timeout'
  | 'invalid'
  | 'incomplete';

export type ViewType = 'new-scan' | 'rankings' | 'opportunities' | 'competitors' | 'history' | 'help';

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
  actual_provider: string;
  fallback_used: boolean | null;
  fallback_reason: string | null;
  observed_at: string | null;
  results_examined: number;
  coverage_complete: boolean | null;
  effective_country: string | null;
  effective_language: string | null;
  effective_device: string | null;
  error_message: string | null;
  previous_status: string | null;
  comparison_status: 'first_seen' | 'newly_found' | 'dropped' | 'up' | 'down' | 'unchanged' | 'unavailable';
}

export interface Progress {
  total: number;
  completed: number;
  percent: number;
  errors: number;
  incomplete: number;
  partial: number;
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
  visibility_score: number | null;
  actual_provider: string;
  allow_fallback: boolean;
  fallback_used: boolean | null;
  fallback_reason: string | null;
  fallback_count: number;
  error_message: string | null;
  metrics_sample_size: number;
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
  visibility_score: number | null;
  actual_provider: string;
  fallback_used: boolean | null;
  fallback_count: number;
  top_competitors: TopCompetitorSummary[];
  created_at: string | null;
}

export interface ProviderOption {
  id: string;
  name: string;
  tag: string;
  status: string;
  description: string;
  supports_locale: boolean;
  supports_device: boolean;
  supports_fallback: boolean;
  depths: number[];
}

export interface ConfigResponse {
  providers: ProviderOption[];
  default_provider: string;
  has_serpapi_key: boolean;
  countries: string[];
  languages: string[];
  max_upload_bytes: number;
  max_rows: number;
}

export interface UploadPreview {
  row_count: number;
  columns: string[];
  sample_rows: string[];
  blank_rows: number;
  duplicates: number;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
