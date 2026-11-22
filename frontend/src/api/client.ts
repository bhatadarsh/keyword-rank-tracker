import axios from 'axios';
import type { ConfigResponse, JobDetails, HistoryJob, UploadPreview } from '../types';

const API_BASE = '/api/rank-check';
const http = axios.create({ timeout: 30000 });

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg || 'Invalid input').join(' ');
    if (error.code === 'ECONNABORTED') return 'The request timed out. Check History before submitting another scan.';
    return 'Could not reach the backend. Check the connection and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export const apiClient = {
  async getConfig(signal?: AbortSignal): Promise<ConfigResponse> {
    return (await http.get<ConfigResponse>('/api/config', { signal })).data;
  },
  async createJob(formData: FormData): Promise<{
    job_id: string; status: string; provider: string; keyword_count: number; domain: string; message: string;
  }> {
    return (await http.post(API_BASE, formData)).data;
  },
  async previewUpload(formData: FormData, signal?: AbortSignal): Promise<UploadPreview> {
    return (await http.post<UploadPreview>(API_BASE + '/preview', formData, { signal })).data;
  },
  async getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobDetails> {
    return (await http.get<JobDetails>(API_BASE + '/' + encodeURIComponent(jobId), { signal })).data;
  },
  async listJobs(signal?: AbortSignal): Promise<HistoryJob[]> {
    return (await http.get<HistoryJob[]>(API_BASE, { signal })).data;
  },
  async deleteJob(jobId: string): Promise<{ deleted: boolean; job_id: string }> {
    return (await http.delete(API_BASE + '/' + encodeURIComponent(jobId))).data;
  },
  getDownloadUrl(jobId: string, format: 'csv' | 'xlsx'): string {
    return API_BASE + '/' + encodeURIComponent(jobId) + '/download/' + format;
  },
};
