import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { apiClient, apiErrorMessage } from '../api/client';
import type { JobDetails } from '../types';

interface Snapshot {
  id: string | null;
  job: JobDetails | null;
  loading: boolean;
  error: string | null;
  connectionError: string | null;
}

export function useJob(jobId: string | null, onTerminal: (job: JobDetails) => void) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    id: null, job: null, loading: false, error: null, connectionError: null,
  });
  const [revision, setRevision] = useState(0);
  const announced = useRef(new Set<string>());
  const lastSuccessful = useRef<JobDetails | null>(null);
  const reload = useCallback(() => {
    setSnapshot((previous) => ({ ...previous, error: null, connectionError: null, loading: !previous.job }));
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let hasData = lastSuccessful.current?.job_id === jobId;
    let wasRunning = hasData && ['queued', 'processing'].includes(lastSuccessful.current?.status || '');
    let running = true;
    const poll = async () => {
      if (inFlight || controller.signal.aborted || !running) return;
      if (timer) clearTimeout(timer);
      inFlight = true;
      try {
        const job = await apiClient.getJobStatus(jobId, controller.signal);
        if (controller.signal.aborted) return;
        hasData = true;
        lastSuccessful.current = job;
        running = job.status === 'queued' || job.status === 'processing';
        setSnapshot({ id: jobId, job, loading: false, error: null, connectionError: null });
        if (!running && wasRunning && !announced.current.has(jobId)) {
          announced.current.add(jobId);
          onTerminal(job);
        }
        wasRunning = running;
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isAxiosError(error) && error.response?.status === 404) {
          hasData = false;
          running = false;
          lastSuccessful.current = null;
        }
        const message = apiErrorMessage(error);
        setSnapshot((previous) => ({
          id: jobId, job: hasData && previous.id === jobId ? previous.job : null, loading: false,
          error: hasData ? null : message, connectionError: hasData ? message : null,
        }));
        if (!hasData) running = false;
      } finally {
        inFlight = false;
        if (!controller.signal.aborted && running && !document.hidden) {
          timer = setTimeout(poll, 2000);
        }
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer);
      } else {
        void poll();
      }
    };
    void poll();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [jobId, revision, onTerminal]);

  return {
    job: snapshot.id === jobId ? snapshot.job : null,
    loading: !!jobId && (snapshot.id !== jobId || snapshot.loading),
    error: snapshot.id === jobId ? snapshot.error : null,
    connectionError: snapshot.id === jobId ? snapshot.connectionError : null,
    reload,
  };
}
