import random
import time
import hashlib
import logging
from typing import Optional
from providers.base import SerpProvider, SearchResponse, SearchResult

logger = logging.getLogger(__name__)

# Institutional-grade pool of realistic competing domains
COMPETITOR_DOMAIN_POOL = [
    "wikipedia.org",
    "reddit.com",
    "github.com",
    "medium.com",
    "forbes.com",
    "youtube.com",
    "quora.com",
    "linkedin.com",
    "techcrunch.com",
    "stackoverflow.com",
    "glassdoor.com",
    "hubspot.com",
    "coursera.org",
    "g2.com",
    "businessinsider.com",
    "nytimes.com",
    "bloomberg.com",
    "theverge.com",
]


class MockProvider(SerpProvider):
    """
    High-fidelity deterministic SERP simulation engine.
    Zero API key required, 100% free.
    
    Dynamically models the user's target domain, competitor search share-of-voice,
    cannibalization scenarios (multi-URL ranking), and realistic organic positions.
    """

    FOUND_RATE = 0.78       # ~78% of simulated keywords find target domain
    CANNIBALIZATION_RATE = 0.22  # ~22% of found keywords rank 2+ distinct URLs
    ERROR_RATE = 0.02       # 2% chance of simulated error to test resilience

    def search(
        self,
        keyword: str,
        country: str,
        language: str,
        device: str,
        depth: int = 100,
        target_domain: Optional[str] = None,
    ) -> SearchResponse:
        # Subtle realistic latency (0.2s - 0.5s)
        time.sleep(random.uniform(0.15, 0.4))

        clean_target = (target_domain or "example.com").lower().strip()
        if clean_target.startswith("www."):
            clean_target = clean_target[4:]

        # Deterministic seed for reproducible results on repeat scans
        seed_str = f"{keyword.lower().strip()}:{clean_target}:{country.lower()}:{device.lower()}"
        seed_hash = hashlib.sha256(seed_str.encode("utf-8")).hexdigest()
        rng = random.Random(int(seed_hash[:12], 16))

        # Check for simulated network fault
        if rng.random() < self.ERROR_RATE:
            logger.warning("MockProvider simulating occasional transient API fault for %r", keyword)
            return SearchResponse(
                keyword=keyword,
                results=[],
                error="Simulated upstream SERP gateway timeout",
                status="api_error",
                actual_provider="mock",
            )

        num_results = min(depth, rng.randint(45, max(50, depth)))
        results = []

        # Determine if target domain appears and at what primary rank
        target_found = rng.random() < self.FOUND_RATE
        primary_rank = None
        secondary_rank = None

        if target_found:
            # Check if brand keyword (e.g. contains part of domain name)
            domain_name_part = clean_target.split(".")[0].lower()
            if domain_name_part in keyword.lower():
                primary_rank = rng.randint(1, 3)
            else:
                # Weighted distribution: some top 3, some 4-10, some 11-30, some beyond
                roll = rng.random()
                if roll < 0.25:
                    primary_rank = rng.randint(1, 3)
                elif roll < 0.55:
                    primary_rank = rng.randint(4, 10)
                elif roll < 0.85:
                    primary_rank = rng.randint(11, 30)  # High-ROI striking distance opportunities!
                else:
                    primary_rank = rng.randint(31, min(num_results, 80))

            # Check if cannibalization scenario applies
            if rng.random() < self.CANNIBALIZATION_RATE and num_results > (primary_rank + 4):
                secondary_rank = rng.randint(primary_rank + 3, min(primary_rank + 35, num_results))

        # Target domain URL path templates
        primary_paths = [
            "/products", "/features", "/solutions", "/pricing", "/resources",
            "/docs", "/guide", "/best-practices", "/platform", "/tools"
        ]
        secondary_paths = [
            "/blog/" + keyword.lower().replace(" ", "-"),
            "/community/discussion/" + keyword.lower().replace(" ", "-"),
            "/kb/articles/" + keyword.lower().replace(" ", "-"),
            "/reviews",
        ]

        # Shuffle competitor pool deterministically for this keyword
        competitor_pool = list(COMPETITOR_DOMAIN_POOL)
        rng.shuffle(competitor_pool)

        for i in range(1, num_results + 1):
            if i == primary_rank:
                path = rng.choice(primary_paths)
                results.append(
                    SearchResult(
                        rank=i,
                        url=f"https://{clean_target}{path}",
                        title=f"{clean_target.split('.')[0].title()} | Official {keyword.title()} Platform",
                        domain=clean_target,
                    )
                )
            elif i == secondary_rank:
                path = rng.choice(secondary_paths)
                results.append(
                    SearchResult(
                        rank=i,
                        url=f"https://{clean_target}{path}",
                        title=f"{keyword.title()} Overview & Guide — {clean_target.split('.')[0].title()} Blog",
                        domain=clean_target,
                    )
                )
            else:
                comp_domain = competitor_pool[(i - 1) % len(competitor_pool)]
                slug = keyword.lower().replace(" ", "-")
                results.append(
                    SearchResult(
                        rank=i,
                        url=f"https://{comp_domain}/topic/{slug}-p{i}",
                        title=f"{keyword.title()} - In-Depth Analysis on {comp_domain.split('.')[0].title()}",
                        domain=comp_domain,
                    )
                )

        logger.info(
            "MockProvider generated %d results for %r (target=%s, primary_rank=%s, secondary_rank=%s)",
            len(results), keyword, clean_target, primary_rank, secondary_rank,
        )

        return SearchResponse(keyword=keyword, results=results, status="success",
                              actual_provider="mock", coverage_complete=True,
                              effective_country=country, effective_language=language, effective_device=device)
