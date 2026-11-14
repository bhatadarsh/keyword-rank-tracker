import os
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rank_tracker.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_columns():
    """
    Auto-migration helper: dynamically adds any missing columns to existing SQLite/Postgres tables.
    Guarantees existing databases seamlessly upgrade without manual deletion or ALTER scripts.
    """
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        if "jobs" in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns("jobs")}
            job_columns = [
                ("provider", "VARCHAR DEFAULT 'mock'"),
                ("visibility_score", "FLOAT"),
                ("top_competitors_summary", "TEXT"),
            ]
            with engine.begin() as conn:
                for col_name, col_type in job_columns:
                    if col_name not in existing_cols:
                        logger.info("Auto-migrating: Adding column 'jobs.%s'...", col_name)
                        conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}"))

        if "keyword_tasks" in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns("keyword_tasks")}
            task_columns = [
                ("page_title", "VARCHAR"),
                ("previous_rank", "INTEGER"),
                ("rank_delta", "INTEGER"),
                ("matching_urls_count", "INTEGER DEFAULT 0"),
                ("secondary_ranking_url", "VARCHAR"),
                ("secondary_rank", "INTEGER"),
                ("top_competitors_json", "TEXT"),
            ]
            with engine.begin() as conn:
                for col_name, col_type in task_columns:
                    if col_name not in existing_cols:
                        logger.info("Auto-migrating: Adding column 'keyword_tasks.%s'...", col_name)
                        conn.execute(text(f"ALTER TABLE keyword_tasks ADD COLUMN {col_name} {col_type}"))

    except Exception as exc:
        logger.warning("ensure_schema_columns warning: %s", exc)


def reconcile_orphan_jobs():
    """
    Crash recovery: Reconciles any jobs stuck in 'queued' or 'processing' from an unexpected
    server shutdown, marking them failed instead of permanently hanging in the UI.
    """
    try:
        with engine.begin() as conn:
            res = conn.execute(
                text("UPDATE jobs SET status = 'failed' WHERE status IN ('queued', 'processing')")
            )
            if res.rowcount > 0:
                logger.warning("Startup reconciliation: marked %d stale jobs as 'failed'", res.rowcount)
                conn.execute(
                    text("UPDATE keyword_tasks SET status = 'api_error' WHERE status = 'pending'")
                )
    except Exception as exc:
        logger.warning("reconcile_orphan_jobs warning: %s", exc)
