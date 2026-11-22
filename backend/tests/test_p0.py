import io
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook, load_workbook
from sqlalchemy import create_engine, inspect, text

import database
from database import SessionLocal
from models import Job, KeywordTask
from providers.base import SearchResponse, SearchResult
from providers.free_serp_provider import FreeSerpProvider
from providers.serpapi_provider import SerpApiProvider
from services.ingestion import parse_keywords, MAX_ROWS, MAX_UPLOAD_BYTES
from services.rank_tracker import aggregate_top_competitors, analyze_serp_intelligence
import services.job_processor as worker


def parse(data, filename="keywords.csv"):
    return parse_keywords(data, filename, "United States", "English", "desktop")


def make_job(db, id="job", **overrides):
    values = dict(id=id, company_name="Example", domain="example.com", country="United States",
                  language="English", device="desktop", depth=100, provider="mock", status="completed",
                  created_at=datetime(2026, 1, 1), actual_provider="mock", fallback_used=False)
    values.update(overrides)
    job = Job(**values)
    db.add(job)
    db.flush()
    return job


def make_task(db, job, **overrides):
    values = dict(job_id=job.id, keyword="test keyword", country=job.country, language=job.language,
                  device=job.device, status="found", rank=5, actual_provider="mock",
                  fallback_used=False, coverage_complete=True,
                  effective_country=job.country, effective_language=job.language,
                  effective_device=job.device, observed_at=job.created_at + timedelta(seconds=10))
    values.update(overrides)
    task = KeywordTask(**values)
    db.add(task)
    db.flush()
    return task


@pytest.fixture
def client(monkeypatch):
    from api import routes
    from main import app
    monkeypatch.setattr(routes, "process_job", lambda job_id: None)
    monkeypatch.delenv("SERP_API_KEY", raising=False)
    with TestClient(app) as client:
        yield client


def upload(client, content=b"keyword\nexample\n", **changes):
    form = dict(company_name="Example", domain="example.com", country="United States",
                language="English", device="desktop", provider="mock", depth="100")
    form.update(changes)
    return client.post("/api/rank-check", data=form, files={"file": ("keywords.csv", content, "text/csv")})


def test_database_is_disposable():
    assert "nexusrank-tests-" in str(database.engine.url)
    assert "rank_tracker.db" not in str(database.engine.url)


def test_csv_bom_quotes_newlines_literal_na_and_numeric_strings():
    result = parse(b'\xef\xbb\xbf"keyword",country\n"hello, world",\n"multi\nline",\nNA,\n00123,\n')
    assert [row["keyword"] for row in result["tasks"]] == ["hello, world", "multi\nline", "NA", "00123"]


def test_blank_rows_and_duplicates_are_reported():
    result = parse(b"keyword,country\nOne,\none,United States\n,\nTwo,India\n")
    assert result["row_count"] == 2
    assert result["duplicates"] == 1
    assert result["blank_rows"] == 1


@pytest.mark.parametrize("data, message", [
    (b"", "empty"), (b"keyword\n\n", "No valid keywords"),
    (b"wrong\na\n", "keyword column"),
    (b"keyword, Keyword\na,b\n", "uniquely"),
    (b"keyword,device\na,tablet\n", "Row 2"),
    (b"keyword,country\na,Atlantis\n", "Row 2"),
    (b"keyword,language\na,Klingon\n", "Row 2"),
    (b"keyword\n\xff\n", "UTF-8"),
    (b"keyword\n" + b"x" * 501, "500"),
    (b"keyword\na,b\n", "more fields"),
])
def test_invalid_csv_rejected(data, message):
    with pytest.raises(ValueError, match=message):
        parse(data)


def test_row_limit():
    with pytest.raises(ValueError, match="Limit"):
        parse(("keyword\n" + "word\n" * (MAX_ROWS + 1)).encode())


def test_xlsx_and_legacy_xls():
    book = Workbook()
    book.active.append(["keyword", "country"])
    book.active.append(["NA", "India"])
    book.active.append(["00123", None])
    stream = io.BytesIO()
    book.save(stream)
    result = parse(stream.getvalue(), "keywords.xlsx")
    assert result["row_count"] == 2
    assert result["tasks"][1]["keyword"] == "00123"
    with pytest.raises(ValueError, match="Legacy"):
        parse(b"old workbook", "keywords.xls")


def test_fallback_requires_explicit_opt_in(monkeypatch):
    for enabled in (False, True):
        provider = FreeSerpProvider(allow_fallback=enabled)
        provider.searxng_url = ""
        monkeypatch.setattr(provider, "_query_duckduckgo_lite", lambda *args: None)
        monkeypatch.setattr(provider.mock_fallback, "search", lambda **kwargs: SearchResponse(
            keyword=kwargs["keyword"], results=[], actual_provider="mock", coverage_complete=True))
        result = provider.search("test", "India", "English", "mobile")
        assert result.fallback_used is enabled
        if enabled:
            assert result.actual_provider == "mock"
            assert result.fallback_reason
        else:
            assert result.status == "api_error"
            assert result.results == []


def test_live_free_response_has_source_and_no_false_locale(monkeypatch):
    html = '<a class="result-link" href="https://example.com">Example</a>'
    class Client:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, *args, **kwargs): return httpx.Response(200, text=html)
    monkeypatch.setattr("providers.free_serp_provider.httpx.Client", Client)
    provider = FreeSerpProvider()
    provider.searxng_url = ""
    result = provider.search("test", "India", "Hindi", "mobile")
    assert result.actual_provider == "duckduckgo"
    assert not result.coverage_complete
    assert result.effective_country is None
    assert result.effective_device is None


def test_serpapi_partial_page_error_is_reported(monkeypatch):
    monkeypatch.setenv("SERP_API_KEY", "test-key")
    class Client:
        def __init__(self, **kwargs): self.calls = 0
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get(self, url, **kwargs):
            self.calls += 1
            data = {"organic_results": [dict(position=i, link=f"https://site{i}.com", title="Title") for i in range(1, 101)]}
            if self.calls == 2:
                data = {"error": "Quota reached"}
            return httpx.Response(200, json=data, request=httpx.Request("GET", url))
    monkeypatch.setattr("providers.serpapi_provider.httpx.Client", Client)
    result = SerpApiProvider().search("test", "India", "English", "desktop", 200)
    assert len(result.results) == 100
    assert result.actual_provider == "serpapi"
    assert result.error
    assert result.coverage_complete is False


def test_competitor_coverage_deduplicates_and_uses_actual_ranks():
    summary = aggregate_top_competitors([["a.com", "a.com"], ["a.com"]], 2)
    assert summary[0]["count"] == 2
    assert summary[0]["share_pct"] == 100
    intelligence = analyze_serp_intelligence("example.com", [
        SearchResult(rank=2, url="https://a.com"), SearchResult(rank=20, url="https://b.com")])
    assert intelligence["page_1_competitors"] == ["a.com"]


@pytest.mark.parametrize("change", [
    {"provider": "serpapi"}, {"depth": 200}, {"created_at": datetime(2026, 3, 1)},
    {"status": "processing"},
])
def test_history_rejects_incompatible_jobs(change):
    with SessionLocal() as db:
        previous = make_job(db, "previous", **change)
        make_task(db, previous, rank=9)
        current = make_job(db, "current", created_at=datetime(2026, 2, 1))
        task = make_task(db, current)
        worker.compare_previous_observation(db, current, task)
        assert task.rank_delta is None
        assert task.comparison_status in {"first_seen", "unavailable"}


@pytest.mark.parametrize("change", [
    {"actual_provider": "duckduckgo"}, {"actual_provider": "unknown"}, {"coverage_complete": False},
    {"fallback_used": True}, {"effective_device": "mobile"}, {"status": "api_error"},
])
def test_history_rejects_incompatible_tasks(change):
    with SessionLocal() as db:
        previous = make_job(db, "previous")
        make_task(db, previous, rank=9, **change)
        current = make_job(db, "current", created_at=datetime(2026, 2, 1))
        task = make_task(db, current)
        worker.compare_previous_observation(db, current, task)
        assert task.comparison_status == "unavailable"
        assert task.rank_delta is None


@pytest.mark.parametrize("old_rank,new_rank,expected,delta", [
    (9, 5, "up", 4), (2, 5, "down", -3), (5, 5, "unchanged", 0),
    (None, 5, "newly_found", None), (5, None, "dropped", None),
])
def test_history_movement_states(old_rank, new_rank, expected, delta):
    with SessionLocal() as db:
        previous = make_job(db, "previous")
        make_task(db, previous, rank=old_rank, status="found" if old_rank else "not_found")
        current = make_job(db, "current", created_at=datetime(2026, 2, 1))
        task = make_task(db, current, rank=new_rank, status="found" if new_rank else "not_found")
        worker.compare_previous_observation(db, current, task)
        assert task.comparison_status == expected
        assert task.rank_delta == delta


def run_worker(monkeypatch, response):
    with SessionLocal() as db:
        job = make_job(db, status="queued", provider="free", allow_fallback=True)
        make_task(db, job, status="pending", rank=None)
        db.commit()
    monkeypatch.setattr(worker, "get_provider", lambda *args, **kwargs: SimpleNamespace(search=lambda **kwargs: response))
    monkeypatch.setattr(worker.time, "sleep", lambda _: None)
    worker.process_job("job")
    with SessionLocal() as db:
        job = db.get(Job, "job")
        task = db.query(KeywordTask).filter_by(job_id="job").one()
        db.expunge_all()
        return job, task


def test_worker_persists_provenance(monkeypatch):
    job, task = run_worker(monkeypatch, SearchResponse(keyword="test", actual_provider="mock",
        fallback_used=True, fallback_reason="Live service unavailable", coverage_complete=True,
        results=[SearchResult(rank=3, url="https://example.com/page")]))
    assert job.fallback_used and task.fallback_used
    assert job.actual_provider == task.actual_provider == "mock"
    assert job.fallback_reason == task.fallback_reason
    assert task.observed_at
    assert task.results_examined == 1
    assert job.status == "completed"


@pytest.mark.parametrize("status,coverage,expected_task,expected_job", [
    ("success", False, "incomplete", "completed_with_errors"),
    ("success", True, "not_found", "completed"),
    ("api_error", False, "api_error", "failed"),
    ("timeout", False, "timeout", "failed"),
])
def test_worker_terminal_states(monkeypatch, status, coverage, expected_task, expected_job):
    job, task = run_worker(monkeypatch, SearchResponse(keyword="test", results=[], actual_provider="serpapi",
                                                      status=status, coverage_complete=coverage))
    assert task.status == expected_task
    assert job.status == expected_job
    if not coverage:
        assert job.visibility_score is None


def test_worker_fatal_exception_settles_pending(monkeypatch):
    with SessionLocal() as db:
        job = make_job(db, status="queued")
        make_task(db, job, status="pending")
        db.commit()
    def fail(*args, **kwargs):
        raise RuntimeError("unexpected startup failure")
    monkeypatch.setattr(worker, "get_provider", fail)
    worker.process_job("job")
    with SessionLocal() as db:
        assert db.get(Job, "job").status == "failed"
        assert db.query(KeywordTask).one().status == "api_error"
        assert db.query(KeywordTask).one().error_message


def test_mixed_sources_have_no_combined_score():
    job = SimpleNamespace()
    tasks = [
        SimpleNamespace(status="found", actual_provider=source, fallback_used=source == "mock",
                        fallback_reason=None, coverage_complete=True, rank=1, page_1_competitors_json="[]")
        for source in ("mock", "serpapi")
    ]
    worker.update_job_summary(job, tasks)
    assert job.actual_provider == "mixed"
    assert job.visibility_score is None
    assert job.metrics_sample_size == 0


def test_api_validation_preview_and_creation(client):
    preview = client.post("/api/rank-check/preview", files={"file": ("test.csv", b'keyword\n"one, two"\nNA\n')})
    assert preview.status_code == 200
    assert preview.json()["row_count"] == 2
    response = upload(client)
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    data = client.get("/api/rank-check/" + job_id).json()
    assert data["progress"]["total"] == 1
    assert data["results"][0]["status"] == "pending"
    assert data["allow_fallback"] is False
    assert client.delete("/api/rank-check/" + job_id).status_code == 409
    assert client.get("/api/rank-check/missing").status_code == 404


@pytest.mark.parametrize("changes", [
    {"provider": "unknown"}, {"provider": "serpapi"}, {"country": "Atlantis"},
    {"device": "tablet"}, {"provider": "free", "depth": "500"}, {"provider": "mock", "allow_fallback": "true"},
])
def test_api_rejects_bad_configuration_without_creating_jobs(client, changes):
    assert upload(client, **changes).status_code == 422
    assert client.get("/api/rank-check").json() == []


def test_upload_byte_limit(client):
    response = upload(client, b"x" * (MAX_UPLOAD_BYTES + 1))
    assert response.status_code == 413


@pytest.mark.parametrize("format", ["csv", "xlsx"])
def test_exports_include_task_and_job_provenance(client, format):
    with SessionLocal() as db:
        job = make_job(db, fallback_used=True, fallback_reason="Live service unavailable", metrics_sample_size=1)
        make_task(db, job, fallback_used=True, fallback_reason="Live service unavailable", results_examined=100)
        db.commit()
    response = client.get("/api/rank-check/job/download/" + format)
    assert response.status_code == 200
    if format == "csv":
        import csv
        rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    else:
        book = load_workbook(io.BytesIO(response.content), read_only=True)
        rows = list(book.active.values)
        book.close()
    row = dict(zip(rows[0], rows[1]))
    assert row["Actual Provider"] == "mock"
    assert row["Fallback Used"] == "Yes"
    assert row["Job Fallback Used"] == "Yes"
    assert row["Fallback Reason"] == "Live service unavailable"
    assert row["Coverage Complete"] == "Yes"


def test_legacy_results_are_not_relabelled_live(client):
    with SessionLocal() as db:
        job = make_job(db, provider="free", actual_provider="unknown", visibility_score=90)
        make_task(db, job, actual_provider="unknown", fallback_used=None, rank_delta=10)
        db.commit()
    data = client.get("/api/rank-check/job").json()
    assert data["visibility_score"] is None
    assert data["results"][0]["fallback_used"] is None
    assert data["results"][0]["rank_delta"] is None
    assert data["results"][0]["comparison_status"] == "unavailable"


def test_recovery_only_settles_interrupted_job_tasks():
    with SessionLocal() as db:
        orphan = make_job(db, "orphan", status="processing")
        finished = make_job(db, "finished")
        make_task(db, orphan, status="pending")
        make_task(db, finished, status="pending")
        db.commit()
    database.reconcile_orphan_jobs()
    with SessionLocal() as db:
        assert db.get(Job, "orphan").status == "failed"
        assert db.query(KeywordTask).filter_by(job_id="orphan").one().status == "api_error"
        assert db.query(KeywordTask).filter_by(job_id="finished").one().status == "pending"


def test_additive_migration_preserves_legacy_provenance(monkeypatch):
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE jobs (id VARCHAR PRIMARY KEY, status VARCHAR)"))
        connection.execute(text("CREATE TABLE keyword_tasks (id INTEGER PRIMARY KEY, job_id VARCHAR, status VARCHAR)"))
        connection.execute(text("INSERT INTO jobs VALUES ('old', 'completed')"))
    monkeypatch.setattr(database, "engine", engine)
    database.ensure_schema_columns()
    database.ensure_schema_columns()
    with engine.connect() as connection:
        row = connection.execute(text("SELECT actual_provider, fallback_used, allow_fallback FROM jobs")).one()
        assert row == ("unknown", None, 0)
    assert "observed_at" in {column["name"] for column in inspect(engine).get_columns("keyword_tasks")}
    engine.dispose()


def test_migration_errors_abort_startup(monkeypatch):
    import main
    def fail():
        raise RuntimeError("migration failed")
    monkeypatch.setattr(main, "ensure_schema_columns", fail)
    with pytest.raises(RuntimeError, match="migration failed"):
        with TestClient(main.app):
            pass


def test_importing_app_does_not_create_database(tmp_path):
    path = tmp_path / "not-created.db"
    env = {**os.environ, "DATABASE_URL": "sqlite:///" + path.as_posix()}
    result = subprocess.run([sys.executable, "-c", "import main"], env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert not path.exists()


@pytest.mark.asyncio
async def test_upload_parsing_runs_off_event_loop(monkeypatch):
    import threading
    from fastapi import UploadFile
    import services.ingestion as ingestion
    event_loop_thread = threading.get_ident()
    parser_threads = []
    original = ingestion.parse_keywords
    def record_thread(*args):
        parser_threads.append(threading.get_ident())
        return original(*args)
    monkeypatch.setattr(ingestion, "parse_keywords", record_thread)
    file = UploadFile(file=io.BytesIO(b"keyword\nhello\n"), filename="keywords.csv")
    result = await ingestion.read_keyword_upload(file, "India", "English", "desktop")
    assert result["row_count"] == 1
    assert parser_threads and parser_threads[0] != event_loop_thread
    assert file.file.closed


def test_migration_does_not_swallow_database_errors(monkeypatch):
    def fail(*args):
        raise RuntimeError("database cannot be inspected")
    monkeypatch.setattr(database, "inspect", fail)
    with pytest.raises(RuntimeError, match="cannot be inspected"):
        database.ensure_schema_columns()


def test_fallback_option_is_persisted(client):
    response = upload(client, provider="free", allow_fallback="true")
    assert response.status_code == 200
    job = client.get("/api/rank-check/" + response.json()["job_id"]).json()
    assert job["allow_fallback"] is True
    assert not job["fallback_used"]  # Enabling fallback is not the same as using it.


def test_cors_only_accepts_configured_local_origins(client):
    allowed = client.options("/api/config", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    denied = client.options("/api/config", headers={
        "Origin": "https://unconfigured.example", "Access-Control-Request-Method": "GET"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in denied.headers
