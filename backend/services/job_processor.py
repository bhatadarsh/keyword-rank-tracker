import json
import logging
import time
from datetime import datetime, timezone

from database import SessionLocal
from models import Job, KeywordTask, JobStatus, KeywordStatus
from providers import get_provider
from providers.base import SearchResponse
from services.rank_tracker import analyze_serp_intelligence, calculate_visibility_score, aggregate_top_competitors

logger = logging.getLogger(__name__)
REQUEST_DELAY = 1.0
MAX_RETRIES = 3
RETRY_BACKOFF = [3, 7, 15]
SUCCESS_STATES = {"found", "not_found"}
ERROR_STATES = {"api_error", "rate_limited", "timeout", "invalid"}


def compare_previous_observation(db, job, task):
    """Only completed, earlier, like-for-like observations can establish movement."""
    task.previous_rank = None
    task.previous_status = None
    task.rank_delta = None
    task.comparison_status = "unavailable"
    if task.status not in SUCCESS_STATES or not task.coverage_complete or task.actual_provider == "unknown":
        return
    earlier = db.query(KeywordTask).join(Job).filter(
        Job.created_at < job.created_at,
        Job.domain == job.domain,
        KeywordTask.keyword == task.keyword,
        KeywordTask.country == task.country,
        KeywordTask.language == task.language,
        KeywordTask.device == task.device,
    )
    previous = earlier.filter(
        Job.status.in_(["completed", "completed_with_errors"]),
        Job.provider == job.provider, Job.depth == job.depth,
        KeywordTask.status.in_(SUCCESS_STATES),
        KeywordTask.actual_provider == task.actual_provider,
        KeywordTask.fallback_used == task.fallback_used,
        KeywordTask.coverage_complete.is_(True),
        KeywordTask.effective_country == task.effective_country,
        KeywordTask.effective_language == task.effective_language,
        KeywordTask.effective_device == task.effective_device,
        KeywordTask.observed_at < task.observed_at,
    ).order_by(Job.created_at.desc(), KeywordTask.id.desc()).first()
    if previous is None:
        if earlier.first() is None:
            task.comparison_status = "first_seen"
        return
    task.previous_rank = previous.rank
    task.previous_status = previous.status
    if task.rank is not None and previous.rank is not None:
        task.rank_delta = previous.rank - task.rank
        task.comparison_status = "up" if task.rank_delta > 0 else "down" if task.rank_delta < 0 else "unchanged"
    elif task.rank is not None:
        task.comparison_status = "newly_found"
    elif previous.rank is not None:
        task.comparison_status = "dropped"
    else:
        task.comparison_status = "unchanged"


def update_job_summary(job, tasks):
    observed = [task for task in tasks if task.status != "pending"]
    sources = {task.actual_provider or "unknown" for task in observed}
    job.actual_provider = next(iter(sources)) if len(sources) == 1 else "mixed" if sources else "unknown"
    job.fallback_used = any(task.fallback_used for task in observed)
    reasons = sorted({task.fallback_reason for task in observed if task.fallback_reason})
    job.fallback_reason = "; ".join(reasons) or None
    # Never mix simulated and live rankings in an aggregate, or score request failures as zero.
    eligible = [task for task in tasks if task.status in SUCCESS_STATES and task.coverage_complete]
    if len(sources) != 1 or "unknown" in sources:
        eligible = []
    job.metrics_sample_size = len(eligible)
    job.visibility_score = calculate_visibility_score([task.rank for task in eligible]) if eligible else None
    job.top_competitors_summary = json.dumps(aggregate_top_competitors(
        [json.loads(task.page_1_competitors_json or "[]") for task in eligible], len(eligible)
    ) if eligible else [])


def process_job(job_id: str):
    """Single-instance background worker with durable per-keyword results."""
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if job is None:
            return
        try:
            job.status = JobStatus.processing.value
            db.commit()
            provider = get_provider(job.provider, allow_fallback=job.allow_fallback)
            tasks = db.query(KeywordTask).filter_by(job_id=job_id).order_by(KeywordTask.id).all()
            pending = [task for task in tasks if task.status == KeywordStatus.pending.value]
            for index, task in enumerate(pending):
                response = None
                for attempt in range(MAX_RETRIES + 1):
                    try:
                        response = provider.search(
                            keyword=task.keyword, country=task.country, language=task.language,
                            device=task.device, depth=job.depth, target_domain=job.domain,
                        )
                    except Exception:
                        logger.exception("Provider failed for task %s", task.id)
                        response = SearchResponse(keyword=task.keyword, results=[], status="api_error",
                                                  error="Search provider could not complete this request.")
                    if response.status not in {"rate_limited", "timeout"} or attempt == MAX_RETRIES:
                        break
                    time.sleep(RETRY_BACKOFF[attempt])
                task.actual_provider = response.actual_provider
                if task.actual_provider == "unknown" and response.status != "success":
                    task.actual_provider = job.provider
                task.fallback_used = response.fallback_used
                task.fallback_reason = response.fallback_reason
                task.coverage_complete = response.coverage_complete
                task.results_examined = len(response.results)
                task.effective_country = response.effective_country
                task.effective_language = response.effective_language
                task.effective_device = response.effective_device
                task.observed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                task.error_message = response.error
                if response.status == "success":
                    intel = analyze_serp_intelligence(job.domain, response.results)
                    task.rank = intel["best_rank"]
                    task.ranking_url = intel["best_url"]
                    task.page_title = intel["best_title"]
                    task.matching_urls_count = intel["matching_urls_count"]
                    task.secondary_ranking_url = intel["secondary_url"]
                    task.secondary_rank = intel["secondary_rank"]
                    task.top_competitors_json = json.dumps(intel["top_5_competitors"])
                    task.page_1_competitors_json = json.dumps(intel["page_1_competitors"])
                    task.status = "found" if task.rank is not None else "not_found" if task.coverage_complete else "incomplete"
                else:
                    task.status = response.status if response.status in ERROR_STATES else "api_error"
                    task.error_message = task.error_message or "Search request failed."
                compare_previous_observation(db, job, task)
                update_job_summary(job, tasks)
                db.commit()
                if index < len(pending) - 1 and job.provider != "mock":
                    time.sleep(REQUEST_DELAY)
            errors = sum(task.status in ERROR_STATES for task in tasks)
            partial = any(task.coverage_complete is not True for task in tasks)
            job.status = "failed" if errors == len(tasks) else "completed_with_errors" if errors or partial else "completed"
            job.error_message = "No keyword requests succeeded." if errors == len(tasks) else None
            update_job_summary(job, tasks)
            db.commit()
        except Exception:
            logger.exception("Scan %s failed", job_id)
            db.rollback()
            job = db.get(Job, job_id)
            if job is not None:
                job.status = JobStatus.failed.value
                job.error_message = "Scan interrupted by an internal error. Completed results have been preserved."
                db.query(KeywordTask).filter_by(job_id=job_id, status="pending").update({
                    "status": "api_error", "error_message": "Not processed because the scan was interrupted."
                })
                db.commit()
