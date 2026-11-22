import logging
import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rank_tracker.db")
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    with SessionLocal() as db:
        yield db


def ensure_schema_columns():
    """Additive migration. Legacy provenance remains unknown, never assumed live."""
    provenance = [
        ("actual_provider", "VARCHAR DEFAULT 'unknown'"),
        ("fallback_used", "BOOLEAN"), ("fallback_reason", "TEXT"), ("error_message", "TEXT"),
    ]
    migrations = {
        "jobs": [
            ("provider", "VARCHAR DEFAULT 'mock'"),
            ("visibility_score", "FLOAT"), ("top_competitors_summary", "TEXT"),
            ("allow_fallback", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("metrics_sample_size", "INTEGER DEFAULT 0"), *provenance,
        ],
        "keyword_tasks": [
            ("page_title", "VARCHAR"), ("previous_rank", "INTEGER"),
            ("rank_delta", "INTEGER"), ("matching_urls_count", "INTEGER DEFAULT 0"),
            ("secondary_ranking_url", "VARCHAR"), ("secondary_rank", "INTEGER"),
            ("top_competitors_json", "TEXT"), ("page_1_competitors_json", "TEXT"),
            ("observed_at", "TIMESTAMP"), ("results_examined", "INTEGER DEFAULT 0"),
            ("coverage_complete", "BOOLEAN"), ("effective_country", "VARCHAR"),
            ("effective_language", "VARCHAR"), ("effective_device", "VARCHAR"),
            ("previous_status", "VARCHAR"), ("comparison_status", "VARCHAR DEFAULT 'unavailable'"),
            *provenance,
        ],
    }
    try:
        inspector = inspect(engine)
        for table, columns in migrations.items():
            if not inspector.has_table(table):
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            with engine.begin() as conn:
                for name, sql_type in columns:
                    if name not in existing:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
    except Exception:
        logger.exception("Database migration failed; startup aborted. Back up the database before repair.")
        raise


def reconcile_orphan_jobs():
    """Single-instance startup: settle work interrupted by the previous process."""
    with engine.begin() as conn:
        conn.execute(text(
            "UPDATE keyword_tasks SET status = 'api_error', "
            "error_message = 'Scan interrupted by server restart.' "
            "WHERE status = 'pending' AND job_id IN "
            "(SELECT id FROM jobs WHERE status IN ('queued', 'processing'))"
        ))
        res = conn.execute(text(
            "UPDATE jobs SET status = 'failed', error_message = 'Scan interrupted by server restart.' "
            "WHERE status IN ('queued', 'processing')"
        ))
        if res.rowcount:
            logger.warning("Recovered %d interrupted scans. Run one application instance only.", res.rowcount)
