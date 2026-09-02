import sys
import os

# Ensure the backend directory is on the path so imports resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from services.rank_tracker import normalize_domain, match_domain, calculate_best_rank
from providers.base import SearchResult


# ─── normalize_domain ────────────────────────────────────────────────────────

class TestNormalizeDomain:
    def test_strips_https(self):
        assert normalize_domain("https://hiree.com") == "hiree.com"

    def test_strips_http(self):
        assert normalize_domain("http://hiree.com") == "hiree.com"

    def test_strips_www(self):
        assert normalize_domain("www.hiree.com") == "hiree.com"

    def test_strips_path(self):
        assert normalize_domain("https://hiree.com/assessment") == "hiree.com"

    def test_strips_query_params(self):
        assert normalize_domain("https://hiree.com/page?ref=google") == "hiree.com"

    def test_strips_trailing_slash(self):
        assert normalize_domain("https://www.hiree.com/") == "hiree.com"

    def test_preserves_subdomain(self):
        # Subdomains are kept intact — matching handles them
        assert normalize_domain("https://app.hiree.com") == "app.hiree.com"

    def test_bare_domain_no_scheme(self):
        assert normalize_domain("hiree.com") == "hiree.com"

    def test_empty_string_doesnt_crash(self):
        result = normalize_domain("")
        assert isinstance(result, str)


# ─── match_domain ─────────────────────────────────────────────────────────────

class TestMatchDomain:
    def test_exact_match(self):
        assert match_domain("hiree.com", "https://hiree.com/page") is True

    def test_www_match(self):
        assert match_domain("hiree.com", "https://www.hiree.com/page") is True

    def test_subdomain_match(self):
        assert match_domain("hiree.com", "https://app.hiree.com") is True

    def test_deep_subdomain_match(self):
        assert match_domain("hiree.com", "https://api.v2.hiree.com/endpoint") is True

    def test_different_domain_no_match(self):
        assert match_domain("hiree.com", "https://linkedin.com/page") is False

    def test_path_containing_target_no_match(self):
        # URL path "/hiree" should NOT match domain "hiree.com"
        assert match_domain("hiree.com", "https://otherdomain.com/hiree") is False

    def test_suffix_attack_no_match(self):
        # "hiree.com.evil.com" must NOT match "hiree.com"
        assert match_domain("hiree.com", "https://hiree.com.evil.com") is False

    def test_partial_tld_no_match(self):
        assert match_domain("hiree.com", "https://nothiree.com") is False


# ─── calculate_best_rank ─────────────────────────────────────────────────────

class TestCalculateBestRank:
    def _make_results(self, urls: list[str]) -> list[SearchResult]:
        return [
            SearchResult(rank=i + 1, url=url, title=f"Title {i + 1}")
            for i, url in enumerate(urls)
        ]

    def test_found_at_rank_3(self):
        results = self._make_results([
            "https://indeed.com",
            "https://linkedin.com",
            "https://hiree.com/assessment",
            "https://glassdoor.com",
        ])
        rank, url, title = calculate_best_rank("hiree.com", results)
        assert rank == 3
        assert "hiree.com" in url

    def test_returns_best_rank_when_multiple_appearances(self):
        results = self._make_results([
            "https://indeed.com",
            "https://hiree.com/page-one",     # rank 2
            "https://linkedin.com",
            "https://hiree.com/page-two",     # rank 4
        ])
        rank, url, title = calculate_best_rank("hiree.com", results)
        assert rank == 2  # Must return the best (lowest) rank

    def test_not_found_returns_none(self):
        results = self._make_results([
            "https://indeed.com",
            "https://linkedin.com",
            "https://glassdoor.com",
        ])
        rank, url, title = calculate_best_rank("hiree.com", results)
        assert rank is None
        assert url is None
        assert title is None

    def test_empty_results_returns_none(self):
        rank, url, title = calculate_best_rank("hiree.com", [])
        assert rank is None

    def test_rank_is_positive_integer(self):
        results = self._make_results(["https://hiree.com"])
        rank, _, _ = calculate_best_rank("hiree.com", results)
        assert isinstance(rank, int)
        assert rank > 0

    def test_title_is_returned(self):
        results = [SearchResult(rank=1, url="https://hiree.com", title="Hiree Assessment")]
        _, _, title = calculate_best_rank("hiree.com", results)
        assert title == "Hiree Assessment"
