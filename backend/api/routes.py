import uuid
import logging
import re
import json
import io
import os
import glob
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Job, KeywordTask, KeywordStatus, JobStatus
from services.job_processor import process_job
from exports.generator import generate_csv, generate_excel
from services.rank_tracker import normalize_domain
from providers.serpapi_provider import COUNTRY_MAP, LANGUAGE_MAP

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rank-check", tags=["rank-check"])
config_router = APIRouter(prefix="/api/config", tags=["config"])

ALLOWED_DEPTHS = {100, 200, 500}
ALLOWED_DEVICES = {"desktop", "mobile"}
ALLOWED_PROVIDERS = {"mock", "free", "serpapi"}


# ── Configuration Endpoint (Single Source of Truth) ──────────────────────────

@config_router.get("", summary="Get platform configuration, providers, and locales")
@router.get("/config", summary="Get platform configuration (alias)")
def get_config():
    """Returns supported search providers, countries, and languages."""
    has_serp_key = bool(os.getenv("SERP_API_KEY", "").strip())
    default_provider = os.getenv("SERP_PROVIDER", "free").lower().strip()
    if default_provider not in ALLOWED_PROVIDERS:
        default_provider = "mock"

    # Distinct, clean country names
    excluded_aliases = {"us", "uk", "usa"}
    countries = sorted(
        {
            k.title()
            for k in COUNTRY_MAP.keys()
            if k not in excluded_aliases and len(k) > 2
        }
    )
    # Ensure standard head countries are at top
    priority_countries = ["United States", "India", "United Kingdom", "Canada", "Australia", "Germany"]
    clean_countries = [c for c in priority_countries if c in countries] + [
        c for c in countries if c not in priority_countries
    ]

    languages = sorted({k.title() for k in LANGUAGE_MAP.keys()})

    providers = [
        {
            "id": "free",
            "name": "Free Live Search (0 Cost)",
            "tag": "100% Free",
            "status": "ready",
            "description": "Zero-key live search via DuckDuckGo Lite & SearXNG with smart fallback",
        },
        {
            "id": "mock",
            "name": "Smart Simulation (0 Cost)",
            "tag": "Fast & Offline",
            "status": "ready",
            "description": "Deterministic simulation with cannibalization & competitor modeling",
        },
        {
            "id": "serpapi",
            "name": "SerpApi (Paid Key)",
            "tag": "Key Active" if has_serp_key else "Key Required",
            "status": "ready" if has_serp_key else "unconfigured",
            "description": "Official Google SERP API with multi-page pagination for Depth > 100",
        },
    ]

    return {
        "providers": providers,
        "default_provider": default_provider,
        "has_serpapi_key": has_serp_key,
        "countries": clean_countries,
        "languages": languages,
    }


# ── History / List Jobs ───────────────────────────────────────────────────────

@router.get("", summary="List all jobs (history)")
def list_jobs(db: Session = Depends(get_db)):
    """Return the 50 most recent jobs with aggregate counts and visibility scores."""
    jobs = db.query(Job).order_by(Job.created_at.desc()).limit(50).all()
    result = []
    for job in jobs:
        tasks = db.query(KeywordTask).filter(KeywordTask.job_id == job.id).all()
        found = sum(1 for t in tasks if t.status == KeywordStatus.found.value)
        cannibalized = sum(1 for t in tasks if (t.matching_urls_count and t.matching_urls_count >= 2))

        top_comps = []
        if job.top_competitors_summary:
            try:
                top_comps = json.loads(job.top_competitors_summary)
            except Exception:
                pass

        result.append({
            "job_id": job.id,
            "company_name": job.company_name,
            "domain": job.domain,
            "provider": job.provider or "mock",
            "status": job.status,
            "country": job.country,
            "language": job.language,
            "device": job.device,
            "depth": job.depth,
            "keyword_count": len(tasks),
            "found_count": found,
            "cannibalized_count": cannibalized,
            "visibility_score": job.visibility_score or 0.0,
            "top_competitors": top_comps,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })
    return result


def _clean_domain(raw: str) -> str:
    """Normalise a user-provided domain string."""
    return normalize_domain(raw.strip())


def _validate_domain(domain: str) -> bool:
    """Basic domain format check."""
    pattern = r"^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
    return bool(re.match(pattern, domain, re.IGNORECASE))


# ── Create / Queue Job ────────────────────────────────────────────────────────

@router.post("", summary="Start a new rank check job")
async def create_job(
    background_tasks: BackgroundTasks,
    company_name: str = Form(..., description="Company name (e.g. GitHub)"),
    domain: str = Form(..., description="Domain to track (e.g. github.com)"),
    country: str = Form(..., description="Target country (e.g. United States)"),
    language: str = Form(..., description="Target language (e.g. English)"),
    device: str = Form(..., description="desktop or mobile"),
    depth: int = Form(100, description="Search depth: 100, 200, or 500"),
    provider: Optional[str] = Form(None, description="mock, free, or serpapi"),
    file: UploadFile = File(..., description="CSV or Excel file with keywords"),
    db: Session = Depends(get_db),
):
    # ── Input validation ──────────────────────────────────────────────────────
    if not company_name.strip():
        raise HTTPException(status_code=422, detail="company_name cannot be empty.")

    cleaned_domain = _clean_domain(domain)
    if not cleaned_domain or not _validate_domain(cleaned_domain):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid domain: '{domain}'. Provide a bare domain like 'github.com'.",
        )

    if device.lower() not in ALLOWED_DEVICES:
        raise HTTPException(
            status_code=422, detail=f"device must be one of: {sorted(ALLOWED_DEVICES)}"
        )

    if depth not in ALLOWED_DEPTHS:
        raise HTTPException(
            status_code=422, detail=f"depth must be one of: {sorted(ALLOWED_DEPTHS)}"
        )

    # Provider selection
    selected_provider = (provider or os.getenv("SERP_PROVIDER", "free")).lower().strip()
    if selected_provider not in ALLOWED_PROVIDERS:
        selected_provider = "mock"

    # ── Parse uploaded file ───────────────────────────────────────────────────
    contents = await file.read()
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a .csv, .xls, or .xlsx file.",
            )

        # Normalise column headers
        df.columns = [str(c).lower().strip() for c in df.columns]

        if "keyword" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="File must contain a 'keyword' column.",
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}")

    # ── Build keyword tasks ───────────────────────────────────────────────────
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        company_name=company_name.strip(),
        domain=cleaned_domain,
        country=country.strip(),
        language=language.strip(),
        device=device.lower().strip(),
        depth=depth,
        provider=selected_provider,
        status=JobStatus.queued.value,
    )
    db.add(job)
    db.flush()

    df = df.dropna(how="all")  # Drop entirely blank rows
    seen = set()  # Deduplicate within batch
    tasks = []

    for _, row in df.iterrows():
        kw = str(row.get("keyword", "")).strip()
        if not kw or kw.lower() == "nan":
            continue

        kw_country = str(row["country"]).strip() if "country" in df.columns and pd.notna(row.get("country")) else country.strip()
        kw_lang = str(row["language"]).strip() if "language" in df.columns and pd.notna(row.get("language")) else language.strip()
        kw_device = str(row["device"]).strip().lower() if "device" in df.columns and pd.notna(row.get("device")) else device.lower().strip()

        dedup_key = (kw.lower(), kw_country.lower(), kw_lang.lower(), kw_device)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        tasks.append(
            KeywordTask(
                job_id=job_id,
                keyword=kw,
                country=kw_country,
                language=kw_lang,
                device=kw_device,
            )
        )

    if not tasks:
        raise HTTPException(status_code=400, detail="No valid keywords found in the uploaded file.")

    db.add_all(tasks)
    db.commit()

    logger.info("Created job %s with %d keywords (domain=%r, provider=%r)", job_id, len(tasks), cleaned_domain, selected_provider)
    background_tasks.add_task(process_job, job_id)

    return {
        "job_id": job_id,
        "status": "queued",
        "provider": selected_provider,
        "keyword_count": len(tasks),
        "domain": cleaned_domain,
        "message": f"Job queued on {selected_provider.upper()} engine. Processing {len(tasks)} keywords.",
    }


# ── Job Status & Deep Analytics ───────────────────────────────────────────────

@router.get("/{job_id}", summary="Get job status, SERP analytics, and results")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    tasks = db.query(KeywordTask).filter(KeywordTask.job_id == job_id).all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status != KeywordStatus.pending.value)

    results = []
    for t in tasks:
        top_comps = []
        if t.top_competitors_json:
            try:
                top_comps = json.loads(t.top_competitors_json)
            except Exception:
                pass

        results.append({
            "id": t.id,
            "keyword": t.keyword,
            "rank": t.rank,
            "previous_rank": t.previous_rank,
            "rank_delta": t.rank_delta,
            "ranking_url": t.ranking_url,
            "page_title": t.page_title,
            "matching_urls_count": t.matching_urls_count or 0,
            "secondary_ranking_url": t.secondary_ranking_url,
            "secondary_rank": t.secondary_rank,
            "cannibalization": bool(t.matching_urls_count and t.matching_urls_count >= 2),
            "status": t.status,
            "country": t.country,
            "language": t.language,
            "device": t.device,
            "top_competitors": top_comps,
        })

    top_comps_summary = []
    if job.top_competitors_summary:
        try:
            top_comps_summary = json.loads(job.top_competitors_summary)
        except Exception:
            pass

    return {
        "job_id": job.id,
        "status": job.status,
        "company_name": job.company_name,
        "domain": job.domain,
        "provider": job.provider or "mock",
        "country": job.country,
        "language": job.language,
        "device": job.device,
        "depth": job.depth,
        "visibility_score": job.visibility_score or 0.0,
        "top_competitors_summary": top_comps_summary,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "progress": {
            "total": total,
            "completed": completed,
            "percent": round((completed / total) * 100) if total > 0 else 0,
        },
        "results": results,
    }


# ── Delete Job & Clean Artifacts ──────────────────────────────────────────────

@router.delete("/{job_id}", summary="Delete job and associated reports")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    """Deletes job, all related keyword tasks, and removes generated export files."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Delete generated export files
    export_dir = os.path.join(os.getcwd(), "exports", "files")
    pattern = os.path.join(export_dir, f"results_{job_id}.*")
    for file_path in glob.glob(pattern):
        try:
            os.remove(file_path)
            logger.info("Removed export file: %s", file_path)
        except Exception as e:
            logger.warning("Could not remove export file %s: %s", file_path, e)

    # SQLAlchemy cascade will delete all associated KeywordTask rows
    db.delete(job)
    db.commit()
    logger.info("Successfully deleted job %s", job_id)

    return {"deleted": True, "job_id": job_id}


# ── Download Results ──────────────────────────────────────────────────────────

@router.get("/{job_id}/download/{format}", summary="Download results as CSV or Excel")
def download_results(job_id: str, format: str, db: Session = Depends(get_db)):
    if format not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="format must be 'csv' or 'xlsx'.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    tasks = db.query(KeywordTask).filter(KeywordTask.job_id == job_id).all()
    if not tasks:
        raise HTTPException(status_code=404, detail="No results found for this job.")

    export_dir = os.path.join(os.getcwd(), "exports", "files")
    os.makedirs(export_dir, exist_ok=True)

    filepath = os.path.join(export_dir, f"results_{job_id}.{format}")

    if format == "csv":
        generate_csv(job, tasks, filepath)
        return FileResponse(
            path=filepath,
            filename=f"nexusrank_{job.domain}_{job.created_at.strftime('%Y%m%d')}.csv",
            media_type="text/csv",
        )
    else:
        generate_excel(job, tasks, filepath)
        return FileResponse(
            path=filepath,
            filename=f"nexusrank_{job.domain}_{job.created_at.strftime('%Y%m%d')}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
