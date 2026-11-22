import os
import math
import urllib.parse
import logging
from typing import Optional
import httpx
from providers.base import SerpProvider, SearchResponse, SearchResult

logger = logging.getLogger(__name__)

# Full country → Google country code (gl) mapping
COUNTRY_MAP = {
    "india": "in",
    "united states": "us",
    "usa": "us",
    "us": "us",
    "united kingdom": "gb",
    "uk": "gb",
    "canada": "ca",
    "australia": "au",
    "singapore": "sg",
    "germany": "de",
    "france": "fr",
    "uae": "ae",
    "united arab emirates": "ae",
    "brazil": "br",
    "mexico": "mx",
    "netherlands": "nl",
    "japan": "jp",
    "south korea": "kr",
    "spain": "es",
    "italy": "it",
    "sweden": "se",
    "norway": "no",
    "denmark": "dk",
    "poland": "pl",
    "turkey": "tr",
    "south africa": "za",
    "nigeria": "ng",
    "kenya": "ke",
    "new zealand": "nz",
    "ireland": "ie",
    "belgium": "be",
    "switzerland": "ch",
    "austria": "at",
    "portugal": "pt",
    "indonesia": "id",
    "philippines": "ph",
    "malaysia": "my",
    "thailand": "th",
    "vietnam": "vn",
    "argentina": "ar",
    "colombia": "co",
    "chile": "cl",
    "peru": "pe",
    "israel": "il",
    "saudi arabia": "sa",
    "egypt": "eg",
    "pakistan": "pk",
    "bangladesh": "bd",
    "sri lanka": "lk",
    "nepal": "np",
}

# Full language → Google hl (interface language) mapping
LANGUAGE_MAP = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "hindi": "hi",
    "portuguese": "pt",
    "italian": "it",
    "dutch": "nl",
    "japanese": "ja",
    "korean": "ko",
    "chinese": "zh",
    "arabic": "ar",
    "russian": "ru",
    "turkish": "tr",
    "swedish": "sv",
    "norwegian": "no",
    "danish": "da",
    "polish": "pl",
    "malay": "ms",
    "indonesian": "id",
    "thai": "th",
    "vietnamese": "vi",
    "tamil": "ta",
    "telugu": "te",
    "bengali": "bn",
}


def _extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        host = parsed.netloc.lower()
        if ":" in host:
            host = host.split(":")[0]
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""


class SerpApiProvider(SerpProvider):
    """
    SerpApi.com integration with automatic multi-page pagination for depth > 100.
    Docs: https://serpapi.com/search-api
    """

    def __init__(self):
        self.api_key = os.getenv("SERP_API_KEY", "").strip()
        self.base_url = "https://serpapi.com/search"

        if not self.api_key:
            logger.warning(
                "SERP_API_KEY is not set. SerpApiProvider will return api_error for all requests."
            )

    def search(
        self,
        keyword: str,
        country: str,
        language: str,
        device: str,
        depth: int = 100,
        target_domain: Optional[str] = None,
    ) -> SearchResponse:
        if not self.api_key:
            return SearchResponse(
                keyword=keyword,
                results=[],
                error="SERP_API_KEY environment variable is not configured.",
                status="api_error",
            )

        gl = COUNTRY_MAP.get(country.lower(), "us")
        hl = LANGUAGE_MAP.get(language.lower(), "en")

        if gl == "us" and country.lower() not in ("united states", "usa", "us"):
            logger.warning(
                "Country '%s' not found in map, defaulting to 'us'.",
                country,
            )

        max_pages = max(1, math.ceil(depth / 100))
        all_results = []
        partial_error = None

        try:
            with httpx.Client(timeout=35.0) as client:
                for page in range(max_pages):
                    start_offset = page * 100
                    num_for_page = min(depth - start_offset, 100)
                    if num_for_page <= 0:
                        break

                    params = {
                        "q": keyword,
                        "engine": "google",
                        "api_key": self.api_key,
                        "num": num_for_page,
                        "start": start_offset,
                        "gl": gl,
                        "hl": hl,
                        "device": "desktop" if device.lower() == "desktop" else "mobile",
                        "no_cache": "true",
                    }

                    logger.info(
                        "SerpApi request | page=%d start=%d num=%d keyword=%r",
                        page + 1, start_offset, num_for_page, keyword,
                    )

                    response = client.get(self.base_url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    if "error" in data:
                        logger.error("SerpApi returned error: %s", data["error"])
                        if not all_results:
                            return SearchResponse(
                                keyword=keyword,
                                results=[],
                                error=data["error"],
                                status="api_error",
                            )
                        partial_error = "Search stopped before the requested depth because the provider returned an error."
                        break

                    organic_results = data.get("organic_results", [])
                    if not organic_results:
                        break

                    for idx, res in enumerate(organic_results, start=1):
                        pos = res.get("position", idx)
                        computed_rank = start_offset + pos
                        url = res.get("link", "")
                        all_results.append(
                            SearchResult(
                                rank=computed_rank,
                                url=url,
                                title=res.get("title", ""),
                                domain=_extract_domain(url),
                            )
                        )

                    # If fewer results returned than requested, end of SERP reached
                    if len(organic_results) < num_for_page:
                        break

            logger.info("SerpApi collected %d total results for %r", len(all_results), keyword)
            return SearchResponse(keyword=keyword, results=all_results, status="success",
                                  actual_provider="serpapi", error=partial_error,
                                  coverage_complete=not partial_error and len(all_results) >= depth,
                                  effective_country=country, effective_language=language, effective_device=device)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("SerpApi rate limit hit for keyword %r", keyword)
                return SearchResponse(
                    keyword=keyword,
                    results=all_results,
                    error="Rate limited by SerpApi",
                    status="rate_limited",
                )
            logger.error("HTTP error from SerpApi: %s", e)
            return SearchResponse(
                keyword=keyword, results=all_results, error="Search provider returned an HTTP error.", status="api_error"
            )
        except httpx.TimeoutException as e:
            logger.error("Timeout reaching SerpApi for keyword %r: %s", keyword, e)
            return SearchResponse(
                keyword=keyword, results=all_results, error="Search provider timed out.", status="timeout"
            )
        except httpx.RequestError as e:
            logger.error("Request error for keyword %r: %s", keyword, e)
            return SearchResponse(
                keyword=keyword, results=all_results, error="Could not connect to the search provider.", status="api_error"
            )
