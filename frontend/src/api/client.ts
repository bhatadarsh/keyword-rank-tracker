import axios from 'axios';
import type { ConfigResponse, JobDetails, HistoryJob } from '../types';

const API_BASE = '/api/rank-check';

export const apiClient = {
  async getConfig(): Promise<ConfigResponse> {
    const { data } = await axios.get<ConfigResponse>('/api/config');
    return data;
  },

  async createJob(formData: FormData): Promise<{
    job_id: string;
    status: string;
    provider: string;
    keyword_count: number;
    domain: string;
    message: string;
  }> {
    const { data } = await axios.post(API_BASE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async getJobStatus(jobId: string): Promise<JobDetails> {
    const { data } = await axios.get<JobDetails>(`${API_BASE}/${jobId}`);
    return data;
  },

  async listJobs(): Promise<HistoryJob[]> {
    const { data } = await axios.get<HistoryJob[]>(API_BASE);
    return data;
  },

  async deleteJob(jobId: string): Promise<{ deleted: boolean; job_id: string }> {
    const { data } = await axios.delete<{ deleted: boolean; job_id: string }>(`${API_BASE}/${jobId}`);
    return data;
  },

  getDownloadUrl(jobId: string, format: 'csv' | 'xlsx'): string {
    return `${API_BASE}/${jobId}/download/${format}`;
  },
};
