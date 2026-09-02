import random
import time
import logging
from providers.base import SerpProvider, SearchResponse, SearchResult

logger = logging.getLogger(__name__)

# Realistic pool of domains to simulate SERP competition
DOMAIN_POOL = [
    "linkedin.com",
    "coursera.org",
    "indeed.com",
    "wikipedia.org",
    "glassdoor.com",
    "udemy.com",
    "edx.org",
    "naukri.com",
    "monster.com",
    "upwork.com",
    "toptal.com",
    "hackerrank.com",
    "leetcode.com",
    "geeksforgeeks.org",
    "testgorilla.com",
    "mettl.com",
    "imocha.io",
    "criteria.com",
]


class MockProvider(SerpProvider):
    """
    Simulates SERP API responses for local development and testing.
    No API key required. Simulates realistic latency, found/not-found rates,
    and occasional API errors to test error-handling paths.
    """

    TARGET_DOMAIN = "hiree.com"  # Domain that will be "found" in mock results
    FOUND_RATE = 0.80            # 80% chance the target domain appears
    ERROR_RATE = 0.04            # 4% chance of a simulated API error
    RATE_LIMIT_RATE = 0.01       # 1% chance of a simulated rate-limit

    def search(
        self,
        keyword: str,
        country: str,
        language: str,
        device: str,
        depth: int = 100,
    ) -> SearchResponse:
        # Simulate realistic network latency
        latency = random.uniform(0.4, 1.2)
        time.sleep(latency)

        logger.info(
            "MockProvider | keyword=%r country=%s lang=%s device=%s depth=%d (latency=%.2fs)",
            keyword, country, language, device, depth, latency,
        )

        # Simulate rare error paths
        roll = random.random()
        if roll < self.ERROR_RATE:
            logger.warning("MockProvider simulating api_error for %r", keyword)
            return SearchResponse(
                keyword=keyword, results=[], error="Simulated API Error", status="api_error"
            )
        if roll < self.ERROR_RATE + self.RATE_LIMIT_RATE:
            logger.warning("MockProvider simulating rate_limited for %r", keyword)
            return SearchResponse(
                keyword=keyword, results=[], error="Simulated Rate Limit", status="rate_limited"
            )

        # Determine how many results to generate
        num_results = min(depth, random.randint(40, 100))
        results = []

        # Decide if the target domain appears and at what rank
        target_rank = None
        if random.random() < self.FOUND_RATE:
            target_rank = random.randint(1, num_results)

        for i in range(1, num_results + 1):
            if i == target_rank:
                domain = self.TARGET_DOMAIN
                path = random.choice(["/assessment", "/exams", "/career-roadmap", "/hiring"])
                title = f"Hiree | {keyword.title()} Platform"
            else:
                domain = random.choice(DOMAIN_POOL)
                path = f"/page-{i}"
                title = f"{domain.split('.')[0].title()} — {keyword.title()} Resources"

            results.append(
                SearchResult(
                    rank=i,
                    url=f"https://{domain}{path}",
                    title=title,
                )
            )

        return SearchResponse(keyword=keyword, results=results)
