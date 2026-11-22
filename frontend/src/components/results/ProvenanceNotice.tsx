import type { JobDetails } from '../../types';

export function ProvenanceNotice({ job }: { job: JobDetails }) {
  const unknown = job.results.some((row) => ['found', 'not_found'].includes(row.status) && row.actual_provider === 'unknown');
  const simulated = job.results.filter((row) => row.actual_provider === 'mock').length;
  return <div className="space-y-2 text-xs" aria-live="polite">
    {job.fallback_used && <p className="p-3 border border-amber-300 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">
      Simulation fallback was used for {job.fallback_count} keyword{job.fallback_count === 1 ? '' : 's'}.
      {' '}Those results are synthetic, not live rankings. {job.fallback_reason}
    </p>}
    {simulated > 0 && !job.fallback_used && <p className="p-3 border rounded-lg border-zinc-300 dark:border-zinc-700">
      This is a simulation. Rankings and competitor results are synthetic.
    </p>}
    {unknown && <p className="p-3 border rounded-lg border-amber-300 dark:border-amber-800">
      Source information is unavailable for some older results. Their live/simulated status cannot be verified;
      historical comparisons and aggregate scores are unavailable.
    </p>}
    {job.progress.partial > 0 && <p className="text-zinc-600 dark:text-zinc-300">
      {job.progress.partial} keyword{job.progress.partial === 1 ? '' : 's'} lack complete search coverage.
      Missing rankings are not proof of absence at the requested depth.
    </p>}
    {job.progress.errors > 0 && <p className="text-rose-700 dark:text-rose-300">
      {job.progress.errors} keyword request{job.progress.errors === 1 ? '' : 's'} failed. Use the Errors filter for details.
    </p>}
    {job.error_message && <p role="alert" className="text-rose-700 dark:text-rose-300">{job.error_message}</p>}
  </div>;
}
