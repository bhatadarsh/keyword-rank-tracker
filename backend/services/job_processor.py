import asyncio
import logging
from sqlalchemy.orm import Session
from models import Job, KeywordTask, JobStatus, KeywordStatus
from providers import get_provider
from services.rank_tracker import calculate_best_rank
from database import SessionLocal

logger = logging.getLogger(__name__)

# Max concurrent keywords in flight per job (respects rate limits)
CONCURRENCY_LIMIT = 1
# Delay between API calls (seconds) to avoid rate limiting
REQUEST_DELAY = 1.2


async def process_job(job_id: str):
    """
    Background task to process a rank check job.

    Flow:
      1. Fetch the job and all pending keyword tasks from DB.
      2. For each task, call the configured SERP provider.
      3. Run calculate_best_rank() on the results.
      4. Persist rank, url, title, and status back to DB.
      5. Mark the job as completed (or failed on exception).
    """
    db: Session = SessionLocal()
    job = None

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error("Job %s not found in DB — aborting.", job_id)
            return

        logger.info(
            "Starting job %s | company=%r domain=%r depth=%d",
            job_id, job.company_name, job.domain, job.depth,
        )

        job.status = JobStatus.processing.value
        db.commit()

        provider = get_provider()

        tasks = (
            db.query(KeywordTask)
            .filter(
                KeywordTask.job_id == job_id,
                KeywordTask.status == KeywordStatus.pending.value,
            )
            .all()
        )

        total = len(tasks)
        logger.info("Job %s — processing %d keywords", job_id, total)

        for idx, task in enumerate(tasks, start=1):
            logger.info(
                "[%d/%d] Searching: %r | country=%s lang=%s device=%s",
                idx, total, task.keyword, task.country, task.language, task.device,
            )

            response = provider.search(
                keyword=task.keyword,
                country=task.country,
                language=task.language,
                device=task.device,
                depth=job.depth,
            )

            if response.status == "success":
                rank, url, title = calculate_best_rank(job.domain, response.results)

                if rank is not None:
                    task.rank = rank
                    task.ranking_url = url
                    task.page_title = title
                    task.status = KeywordStatus.found.value
                    logger.info("  → Found at rank %d: %s", rank, url)
                else:
                    task.status = KeywordStatus.not_found.value
                    logger.info("  → Not found in top %d results", job.depth)

            elif response.status == "rate_limited":
                task.status = KeywordStatus.rate_limited.value
                logger.warning("  → Rate limited for %r — marking task accordingly", task.keyword)

            elif response.status == "timeout":
                task.status = KeywordStatus.timeout.value
                logger.warning("  → Timeout for %r", task.keyword)

            else:
                task.status = KeywordStatus.api_error.value
                logger.error("  → API error for %r: %s", task.keyword, response.error)

            db.commit()

            # Throttle between requests to respect rate limits
            if idx < total:
                await asyncio.sleep(REQUEST_DELAY)

        job.status = JobStatus.completed.value
        db.commit()
        logger.info("Job %s completed successfully.", job_id)

    except Exception as exc:
        logger.exception("Unhandled exception in job %s: %s", job_id, exc)
        if job:
            job.status = JobStatus.failed.value
            db.commit()
    finally:
        db.close()
