import uuid
import logging
import re
from typing import Optional

import pandas as pd
import io
import os

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Job, KeywordTask, KeywordStatus
from services.job_processor import process_job
from exports.generator import generate_csv, generate_excel
from services.rank_tracker import normalize_domain

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rank-check", tags=["rank-check"])

ALLOWED_DEPTHS = {100, 200, 500}
ALLOWED_DEVICES = {"desktop", "mobile"}


@router.get("", summary="List all jobs (history)")
def list_jobs(db: Session = Depends(get_db)):
    """Return the 50 most recent jobs, newest first. Used by the History tab."""
    jobs = db.query(Job).order_by(Job.created_at.desc()).limit(50).all()
    result = []
    for job in jobs:
        tasks = db.query(KeywordTask).filter(KeywordTask.job_id == job.id).all()
        found = sum(1 for t in tasks if t.status == KeywordStatus.found.value)
        result.append({
            "job_id": job.id,
            "company_name": job.company_name,
            "domain": job.domain,
            "status": job.status,
            "country": job.country,
            "language": job.language,
            "device": job.device,
            "keyword_count": len(tasks),
            "found_count": found,
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


@router.post("", summary="Start a new rank check job")
async def create_job(
    background_tasks: BackgroundTasks,
    company_name: str = Form(..., description="Company name (e.g. Hiree)"),
    domain: str = Form(..., description="Domain to track (e.g. hiree.com)"),
    country: str = Form(..., description="Target country (e.g. India)"),
    language: str = Form(..., description="Target language (e.g. English)"),
    device: str = Form(..., description="desktop or mobile"),
    depth: int = Form(100, description="Search depth: 100, 200, or 500"),
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
            detail=f"Invalid domain: '{domain}'. Provide a bare domain like 'hiree.com'.",
        )

    if device.lower() not in ALLOWED_DEVICES:
        raise HTTPException(
            status_code=422, detail=f"device must be one of: {sorted(ALLOWED_DEVICES)}"
        )

    if depth not in ALLOWED_DEPTHS:
        raise HTTPException(
            status_code=422, detail=f"depth must be one of: {sorted(ALLOWED_DEPTHS)}"
        )

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
    )
    db.add(job)
    db.flush()

    df = df.dropna(how="all")  # Drop entirely blank rows
    seen = set()  # Deduplicate (keyword + country + language + device)
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
            logger.debug("Skipping duplicate keyword: %r (%s/%s/%s)", kw, kw_country, kw_lang, kw_device)
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

    logger.info("Created job %s with %d keywords (domain=%r)", job_id, len(tasks), cleaned_domain)
    background_tasks.add_task(process_job, job_id)

    return {
        "job_id": job_id,
        "status": "queued",
        "keyword_count": len(tasks),
        "domain": cleaned_domain,
        "message": f"Job queued. Processing {len(tasks)} keywords.",
    }


@router.get("/{job_id}", summary="Get job status and results")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    tasks = db.query(KeywordTask).filter(KeywordTask.job_id == job_id).all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status != KeywordStatus.pending.value)

    results = [
        {
            "keyword": t.keyword,
            "rank": t.rank,
            "ranking_url": t.ranking_url,
            "page_title": t.page_title,
            "status": t.status,
        }
        for t in tasks
    ]

    return {
        "job_id": job.id,
        "status": job.status,
        "company_name": job.company_name,
        "domain": job.domain,
        "progress": {
            "total": total,
            "completed": completed,
            "percent": round((completed / total) * 100) if total > 0 else 0,
        },
        "results": results,
    }


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
            filename=f"rank_results_{job.domain}_{job.created_at.strftime('%Y%m%d')}.csv",
            media_type="text/csv",
        )
    else:
        generate_excel(job, tasks, filepath)
        return FileResponse(
            path=filepath,
            filename=f"rank_results_{job.domain}_{job.created_at.strftime('%Y%m%d')}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
