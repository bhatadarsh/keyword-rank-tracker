import json
import time
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from models import Job, KeywordTask, JobStatus, KeywordStatus
from providers import get_provider
from services.rank_tracker import (
    analyze_serp_intelligence,
    calculate_visibility_score,
    aggregate_top_competitors,
)
from database import SessionLocal

logger = logging.getLogger(__name__)

# Delay between API calls (seconds) — prevents rate limiting on free/live providers
REQUEST_DELAY = 1.0

# Retry settings for rate-limited requests
MAX_RETRIES = 3
RETRY_BACKOFF = [3, 7, 15]


def _find_previous_rank(
    db: Session,
    current_job_id: str,
    target_domain: str,
    keyword: str,
    country: str,
    language: str,
    device: str,
) -> Optional[int]:
    """Finds the most recent historical rank for the same domain and keyword parameters."""
    try:
        prev_task = (
            db.query(KeywordTask)
            .join(Job, KeywordTask.job_id == Job.id)
            .filter(
                Job.id != current_job_id,
                Job.domain == target_domain,
                KeywordTask.keyword == keyword,
                KeywordTask.country == country,
                KeywordTask.language == language,
                KeywordTask.device == device,
                KeywordTask.status.in_([KeywordStatus.found.value, KeywordStatus.not_found.value]),
            )
            .order_by(Job.created_at.desc())
            .first()
        )
        if prev_task:
            return prev_task.rank
    except Exception as exc:
        logger.debug("Failed checking previous rank: %s", exc)
    return None


def process_job(job_id: str):
    """
    Background worker to process a rank check job.
    Runs in a dedicated thread with its own database session.
    """
    db: Session = SessionLocal()
    job = None

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error("Job %s not found in DB — aborting.", job_id)
            return

        logger.info(
            "Starting job %s | company=%r domain=%r depth=%d provider=%r",
            job_id, job.company_name, job.domain, job.depth, job.provider,
        )

        job.status = JobStatus.processing.value
        db.commit()

        # Engage selected provider (mock, free, or serpapi)
        provider = get_provider(job.provider)

        tasks = (
            db.query(KeywordTask)
            .filter(
                KeywordTask.job_id == job_id,
                KeywordTask.status == KeywordStatus.pending.value,
            )
            .all()
        )

        total = len(tasks)
        logger.info("Job %s — processing %d keywords with provider %s", job_id, total, type(provider).__name__)

        all_collected_ranks: List[Optional[int]] = []
        all_competitors_by_keyword: List[List[str]] = []

        for idx, task in enumerate(tasks, start=1):
            logger.info(
                "[%d/%d] Searching: %r | country=%s lang=%s device=%s target=%s",
                idx, total, task.keyword, task.country, task.language, task.device, job.domain,
            )

            # Query historical rank delta if this domain has been scanned before
            prev_rank = _find_previous_rank(
                db=db,
                current_job_id=job_id,
                target_domain=job.domain,
                keyword=task.keyword,
                country=task.country,
                language=task.language,
                device=task.device,
            )
            task.previous_rank = prev_rank

            # ── Retry loop with exponential backoff ──────────────────────
            response = None
            for attempt in range(MAX_RETRIES + 1):
                response = provider.search(
                    keyword=task.keyword,
                    country=task.country,
                    language=task.language,
                    device=task.device,
                    depth=job.depth,
                    target_domain=job.domain,
                )

                if response.status not in ("rate_limited", "timeout"):
                    break

                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                logger.warning(
                    "  [%s] for %r — retry %d/%d in %ds",
                    response.status, task.keyword, attempt + 1, MAX_RETRIES, wait,
                )
                time.sleep(wait)

            # ── Process SERP Intelligence ────────────────────────────────
            if response.status == "success":
                intel = analyze_serp_intelligence(job.domain, response.results)

                best_rank = intel["best_rank"]
                task.rank = best_rank
                task.ranking_url = intel["best_url"]
                task.page_title = intel["best_title"]
                task.matching_urls_count = intel["matching_urls_count"]
                task.secondary_ranking_url = intel["secondary_url"]
                task.secondary_rank = intel["secondary_rank"]
                task.top_competitors_json = json.dumps(intel["top_5_competitors"])

                # Calculate rank delta (positive = climbed in rankings, e.g. 8 -> 3 = +5)
                if best_rank is not None and prev_rank is not None:
                    task.rank_delta = prev_rank - best_rank
                elif best_rank is not None and prev_rank is None:
                    task.rank_delta = None  # UI will display "NEW"
                elif best_rank is None and prev_rank is not None:
                    task.rank_delta = None  # Dropped from rankings

                if best_rank is not None:
                    task.status = KeywordStatus.found.value
                    logger.info("  → Found at rank %d (delta: %s): %s", best_rank, task.rank_delta, task.ranking_url)
                else:
                    task.status = KeywordStatus.not_found.value
                    logger.info("  → Not found in top %d results", job.depth)

                all_collected_ranks.append(best_rank)
                all_competitors_by_keyword.append(intel["page_1_competitors"])

            elif response.status == "rate_limited":
                task.status = KeywordStatus.rate_limited.value
                logger.warning("  → Permanently rate limited for %r after %d retries", task.keyword, MAX_RETRIES)
                all_collected_ranks.append(None)

            elif response.status == "timeout":
                task.status = KeywordStatus.timeout.value
                logger.warning("  → Timeout for %r after %d retries", task.keyword, MAX_RETRIES)
                all_collected_ranks.append(None)

            else:
                task.status = KeywordStatus.api_error.value
                logger.error("  → API error for %r: %s", task.keyword, response.error)
                all_collected_ranks.append(None)

            db.commit()

            # Throttle slightly between requests (except when using mock which already has latency)
            if idx < total and job.provider != "mock":
                time.sleep(REQUEST_DELAY)

        # ── Compute Job-Level High-Value SEO Metrics ─────────────────
        job.visibility_score = calculate_visibility_score(all_collected_ranks)
        top_competitors = aggregate_top_competitors(all_competitors_by_keyword, total)
        job.top_competitors_summary = json.dumps(top_competitors)

        job.status = JobStatus.completed.value
        db.commit()
        logger.info(
            "Job %s completed successfully. Visibility Score: %.1f%% | Top Competitors: %s",
            job_id, job.visibility_score, [c['domain'] for c in top_competitors],
        )

    except Exception as exc:
        logger.exception("Unhandled exception in job %s: %s", job_id, exc)
        if job:
            db.rollback()
            try:
                job.status = JobStatus.failed.value
                db.commit()
            except Exception as inner_exc:
                logger.error("Failed to update job status to failed: %s", inner_exc)
    finally:
        db.close()
