import os
import logging
from typing import Optional
from providers.base import SerpProvider
from providers.serpapi_provider import SerpApiProvider
from providers.mock_provider import MockProvider
from providers.free_serp_provider import FreeSerpProvider

logger = logging.getLogger(__name__)


def get_provider(provider_name: Optional[str] = None) -> SerpProvider:
    """
    Factory function returning the selected SERP provider instance.

    Supported engines:
        mock     — Zero-cost deterministic simulation with cannibalization & competitor modeling
        free     — Zero-cost live search engine (DuckDuckGo Lite / SearXNG with smart fallback)
        serpapi  — Real Google SERP results via SerpApi.com (requires SERP_API_KEY)
    """
    name = (provider_name or os.getenv("SERP_PROVIDER", "mock")).lower().strip()

    if name == "serpapi":
        logger.info("Engaging SerpApiProvider (real Google results)")
        return SerpApiProvider()

    if name in ("free", "duckduckgo", "searxng"):
        logger.info("Engaging FreeSerpProvider (zero-cost live search)")
        return FreeSerpProvider()

    if name == "mock":
        logger.info("Engaging MockProvider (smart deterministic simulation)")
        return MockProvider()

    logger.warning("Unknown provider %r — falling back to MockProvider.", name)
    return MockProvider()
