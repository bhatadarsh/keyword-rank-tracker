import sys
import os

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from providers.base import SearchResult
from providers.mock_provider import MockProvider
from providers.free_serp_provider import FreeSerpProvider
from services.rank_tracker import (
    get_ctr_points,
    calculate_visibility_score,
    analyze_serp_intelligence,
    aggregate_top_competitors,
)
from database import reconcile_orphan_jobs, ensure_schema_columns, SessionLocal
from models import Job, KeywordTask, JobStatus, KeywordStatus


class TestVisibilityAndCTR:
    def test_ctr_points_standard_curve(self):
        assert get_ctr_points(1) == 30.0
        assert get_ctr_points(2) == 18.0
        assert get_ctr_points(3) == 12.0
        assert get_ctr_points(4) == 8.0
        assert get_ctr_points(10) == 2.0
        assert get_ctr_points(15) == 1.0  # Page 2 striking distance
        assert get_ctr_points(30) == 1.0
        assert get_ctr_points(31) == 0.0
        assert get_ctr_points(None) == 0.0

    def test_visibility_score_perfect(self):
        # 3 keywords, all rank #1 -> 30/30 = 100%
        score = calculate_visibility_score([1, 1, 1])
        assert score == 100.0

    def test_visibility_score_empty_or_unranked(self):
        assert calculate_visibility_score([]) == 0.0
        assert calculate_visibility_score([None, None]) == 0.0

    def test_visibility_score_mixed(self):
        # 2 keywords: one at rank 1 (30 pts), one unranked (0 pts). Total = 30 / 60 = 50.0%
        score = calculate_visibility_score([1, None])
        assert score == 50.0


class TestCannibalizationAndIntelligence:
    def test_single_url_no_cannibalization(self):
        results = [
            SearchResult(rank=1, url="https://wikipedia.org/wiki/Python", title="Wiki"),
            SearchResult(rank=2, url="https://github.com/python/cpython", title="GitHub Python"),
            SearchResult(rank=3, url="https://reddit.com/r/python", title="Reddit"),
        ]
        intel = analyze_serp_intelligence("github.com", results)
        assert intel["best_rank"] == 2
        assert intel["matching_urls_count"] == 1
        assert intel["cannibalization"] is False
        assert intel["secondary_rank"] is None

    def test_multiple_urls_triggers_cannibalization(self):
        results = [
            SearchResult(rank=2, url="https://github.com/django/django", title="Django Core"),
            SearchResult(rank=3, url="https://stackoverflow.com/django", title="SO"),
            SearchResult(rank=9, url="https://github.com/django/django-docs", title="Django Docs"),
        ]
        intel = analyze_serp_intelligence("github.com", results)
        assert intel["best_rank"] == 2
        assert intel["matching_urls_count"] == 2
        assert intel["cannibalization"] is True
        assert intel["secondary_rank"] == 9
        assert intel["secondary_url"] == "https://github.com/django/django-docs"

    def test_top_5_competitors_extracted(self):
        results = [
            SearchResult(rank=1, url="https://a.com/1", title="A"),
            SearchResult(rank=2, url="https://b.com/2", title="B"),
            SearchResult(rank=3, url="https://c.com/3", title="C"),
            SearchResult(rank=4, url="https://d.com/4", title="D"),
            SearchResult(rank=5, url="https://e.com/5", title="E"),
            SearchResult(rank=6, url="https://f.com/6", title="F"),
        ]
        intel = analyze_serp_intelligence("target.com", results)
        assert len(intel["top_5_competitors"]) == 5
        assert intel["top_5_competitors"][0]["domain"] == "a.com"

    def test_competitor_aggregation(self):
        competitor_batches = [
            ["wikipedia.org", "reddit.com"],
            ["wikipedia.org", "medium.com"],
            ["wikipedia.org", "reddit.com"],
        ]
        summary = aggregate_top_competitors(competitor_batches, total_keywords=3)
        assert len(summary) >= 2
        assert summary[0]["domain"] == "wikipedia.org"
        assert summary[0]["count"] == 3
        assert summary[0]["share_pct"] == 100.0


class TestDynamicMockEngine:
    def test_mock_engine_dynamic_target_domain(self):
        provider = MockProvider()
        response = provider.search(
            keyword="version control",
            country="United States",
            language="English",
            device="desktop",
            depth=50,
            target_domain="github.com",
        )
        assert response.status == "success"
        # Check that github.com is among results and has proper rank
        matches = [r for r in response.results if "github.com" in r.url]
        assert len(matches) >= 1
        assert matches[0].domain == "github.com"


class TestDatabaseReconciliation:
    def test_orphan_reconciliation_executes_safely(self):
        # Verifies the SQL runs without syntax or schema errors
        reconcile_orphan_jobs()
        ensure_schema_columns()
