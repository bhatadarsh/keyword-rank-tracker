import os
import logging
from providers.base import SerpProvider
from providers.serpapi_provider import SerpApiProvider
from providers.mock_provider import MockProvider

logger = logging.getLogger(__name__)


def get_provider() -> SerpProvider:
    """
    Factory function that reads SERP_PROVIDER from the environment
    and returns the appropriate provider instance.

    Supported values:
        mock     — local simulation, no API key needed (default)
        serpapi  — real Google results via serpapi.com
    """
    provider_name = os.getenv("SERP_PROVIDER", "mock").lower().strip()

    if provider_name == "serpapi":
        logger.info("Using SerpApiProvider (real Google results)")
        return SerpApiProvider()

    if provider_name == "mock":
        logger.info("Using MockProvider (simulated results)")
        return MockProvider()

    logger.warning(
        "Unknown SERP_PROVIDER=%r — falling back to MockProvider. "
        "Valid options: 'mock', 'serpapi'.",
        provider_name,
    )
    return MockProvider()
