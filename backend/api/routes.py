import glob
import json
import os
import re
import uuid
from datetime import timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from exports.generator import generate_csv, generate_excel
from models import Job, KeywordTask
from providers.serpapi_provider import COUNTRY_MAP, LANGUAGE_MAP
from services.ingestion import MAX_ROWS, MAX_UPLOAD_BYTES, read_keyword_upload, validate_settings
from services.job_processor import process_job, ERROR_STATES
from services.rank_tracker import normalize_domain

router = APIRouter(prefix="/api/rank-check", tags=["rank-check"])
config_router = APIRouter(prefix="/api/config", tags=["config"])
ALLOWED_DEPTHS = {100, 200, 500}
ALLOWED_PROVIDERS = {"mock", "free", "serpapi"}
TERMINAL = {"completed", "completed_with_errors", "failed"}


@config_router.get("")
@router.get("/config")
def get_config():
    has_key = bool(os.getenv("SERP_API_KEY", "").strip())
    default = os.getenv("SERP_PROVIDER", "free").lower().strip()
    if default not in ALLOWED_PROVIDERS or (default == "serpapi" and not has_key):
        default = "free"
    countries = sorted({key.title() for key in COUNTRY_MAP if key not in {"us", "uk", "usa", "uae"}})
    priority = ["United States", "India", "United Kingdom", "Canada", "Australia", "Germany"]
    providers = [
        dict(id="free", name="Free Live Search", tag="No key", status="ready",
             description="DuckDuckGo or configured SearXNG. Limited coverage; locale and device are not applied.",
             supports_locale=False, supports_device=False, depths=[100], supports_fallback=True),
        dict(id="mock", name="Simulation", tag="Offline", status="ready",
             description="Synthetic rankings for demonstrations and testing.",
             supports_locale=True, supports_device=True, depths=[100, 200, 500], supports_fallback=False),
        dict(id="serpapi", name="SerpApi", tag="Key active" if has_key else "Key required",
             status="ready" if has_key else "unconfigured", description="Google results supplied by SerpApi.",
             supports_locale=True, supports_device=True, depths=[100, 200, 500], supports_fallback=False),
    ]
    return dict(providers=providers, default_provider=default, has_serpapi_key=has_key,
                countries=priority + [country for country in countries if country not in priority],
                languages=["English"] + sorted({key.title() for key in LANGUAGE_MAP if key != "english"}),
                max_upload_bytes=MAX_UPLOAD_BYTES, max_rows=MAX_ROWS)


def _clean_domain(raw: str) -> str:
    return normalize_domain(raw.strip())


def _validate_domain(domain: str) -> bool:
    return bool(re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}", domain, re.I))


def timestamp(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def json_list(value):
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except (ValueError, TypeError):
        return []


def serialize_task(task):
    fields = ("id", "keyword", "rank", "previous_rank", "rank_delta", "ranking_url", "page_title",
              "secondary_ranking_url", "secondary_rank", "status", "country", "language", "device",
              "fallback_used", "fallback_reason", "coverage_complete", "effective_country",
              "effective_language", "effective_device", "error_message", "previous_status")
    data = {field: getattr(task, field) for field in fields}
    data.update(actual_provider=task.actual_provider or "unknown",
                comparison_status=task.comparison_status or "unavailable",
                observed_at=timestamp(task.observed_at), results_examined=task.results_examined or 0,
                matching_urls_count=task.matching_urls_count or 0,
                cannibalization=(task.matching_urls_count or 0) >= 2,
                top_competitors=json_list(task.top_competitors_json))
    # Legacy deltas have no verified provenance; preserve raw DB history but don't present them as trustworthy.
    if data["actual_provider"] == "unknown":
        data.update(rank_delta=None, previous_rank=None, previous_status=None, comparison_status="unavailable",
                    fallback_used=None, coverage_complete=None)
    return data


def serialize_job(job, tasks):
    completed = sum(task.status != "pending" for task in tasks)
    known = job.actual_provider not in {None, "unknown"}
    score = job.visibility_score if known else None
    return dict(job_id=job.id, status=job.status, company_name=job.company_name, domain=job.domain,
                provider=job.provider or "unknown", actual_provider=job.actual_provider or "unknown",
                allow_fallback=job.allow_fallback, fallback_used=job.fallback_used if known else None,
                fallback_reason=job.fallback_reason, fallback_count=sum(bool(task.fallback_used) for task in tasks),
                country=job.country, language=job.language, device=job.device, depth=job.depth,
                error_message=job.error_message, visibility_score=score,
                metrics_sample_size=job.metrics_sample_size or 0,
                top_competitors_summary=json_list(job.top_competitors_summary) if known else [],
                created_at=timestamp(job.created_at),
                progress=dict(total=len(tasks), completed=completed,
                              percent=round(completed / len(tasks) * 100) if tasks else 0,
                              errors=sum(task.status in ERROR_STATES for task in tasks),
                              incomplete=sum(task.status == "incomplete" for task in tasks),
                              partial=sum(task.status != "pending" and task.coverage_complete is not True for task in tasks)),
                results=[serialize_task(task) for task in tasks])


@router.get("")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).limit(50).all()
    result = []
    for job in jobs:
        tasks = db.query(KeywordTask).filter_by(job_id=job.id).all()
        data = serialize_job(job, tasks)
        data.pop("results")
        data.update(keyword_count=len(tasks), found_count=sum(task.status == "found" for task in tasks),
                    cannibalized_count=sum((task.matching_urls_count or 0) >= 2 for task in tasks),
                    top_competitors=data.pop("top_competitors_summary"))
        result.append(data)
    return result


@router.post("/preview")
async def preview_upload(file: UploadFile = File(...), country: str = Form("United States"),
                         language: str = Form("English"), device: str = Form("desktop")):
    parsed = await read_keyword_upload(file, country, language, device)
    parsed.pop("tasks")
    return parsed


@router.post("")
async def create_job(background_tasks: BackgroundTasks, company_name: str = Form(...),
                     domain: str = Form(...), country: str = Form(...), language: str = Form(...),
                     device: str = Form(...), depth: int = Form(100), provider: Optional[str] = Form(None),
                     allow_fallback: bool = Form(False), file: UploadFile = File(...),
                     db: Session = Depends(get_db)):
    if not company_name.strip() or len(company_name.strip()) > 200:
        raise HTTPException(422, "Company name must contain 1-200 characters.")
    cleaned_domain = _clean_domain(domain)
    if len(cleaned_domain) > 253 or not _validate_domain(cleaned_domain):
        raise HTTPException(422, "Provide a valid domain such as example.com.")
    try:
        country, language, device = validate_settings(country, language, device)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    selected = (provider or os.getenv("SERP_PROVIDER", "free")).strip().lower()
    if selected not in ALLOWED_PROVIDERS:
        raise HTTPException(422, "Choose free, mock, or serpapi as the provider.")
    if selected == "serpapi" and not os.getenv("SERP_API_KEY", "").strip():
        raise HTTPException(422, "SerpApi is not configured. Choose another provider or configure the API key.")
    if depth not in ALLOWED_DEPTHS or (selected == "free" and depth != 100):
        raise HTTPException(422, "Free search supports a single results batch (up to 100); other providers support 100, 200, or 500.")
    if allow_fallback and selected != "free":
        raise HTTPException(422, "Simulation fallback is only available for free live search.")
    parsed = await read_keyword_upload(file, country, language, device)
    job = Job(id=str(uuid.uuid4()), company_name=company_name.strip(), domain=cleaned_domain,
              country=country, language=language, device=device, depth=depth, provider=selected,
              allow_fallback=allow_fallback, status="queued")
    try:
        db.add(job)
        db.flush()
        db.add_all([KeywordTask(job_id=job.id, **task) for task in parsed["tasks"]])
        db.commit()
    except Exception:
        db.rollback()
        raise
    background_tasks.add_task(process_job, job.id)
    return dict(job_id=job.id, status="queued", provider=selected, keyword_count=parsed["row_count"],
                domain=cleaned_domain, message="Scan queued.", skipped_blank=parsed["blank_rows"],
                duplicates_removed=parsed["duplicates"])


@router.get("/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Scan not found. It may have been deleted.")
    tasks = db.query(KeywordTask).filter_by(job_id=job_id).order_by(KeywordTask.id).all()
    return serialize_job(job, tasks)


def export_directory():
    return os.getenv("EXPORT_DIR", os.path.join(os.getcwd(), "exports", "files"))


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Scan not found.")
    if job.status not in TERMINAL:
        raise HTTPException(409, "This scan is still running. Wait for it to finish before deleting it.")
    db.delete(job)
    db.commit()
    for path in glob.glob(os.path.join(export_directory(), f"results_{job_id}.*")):
        try:
            os.remove(path)
        except OSError:
            pass
    return dict(deleted=True, job_id=job_id)


@router.get("/{job_id}/download/{format}")
def download_results(job_id: str, format: str, db: Session = Depends(get_db)):
    if format not in {"csv", "xlsx"}:
        raise HTTPException(400, "Choose csv or xlsx.")
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Scan not found.")
    tasks = db.query(KeywordTask).filter_by(job_id=job_id).order_by(KeywordTask.id).all()
    if not tasks:
        raise HTTPException(404, "No keyword results available.")
    os.makedirs(export_directory(), exist_ok=True)
    path = os.path.join(export_directory(), f"results_{job_id}.{format}")
    (generate_csv if format == "csv" else generate_excel)(job, tasks, path)
    return FileResponse(path, filename=f"nexusrank_{job.domain}_{job.created_at:%Y%m%d}.{format}",
                        media_type="text/csv" if format == "csv" else
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
