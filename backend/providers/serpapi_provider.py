import os
import logging
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


class SerpApiProvider(SerpProvider):
    """
    SerpApi.com integration.
    Docs: https://serpapi.com/search-api
    """

    def __init__(self):
        self.api_key = os.getenv("SERP_API_KEY")
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
                "Country '%s' not found in map, defaulting to 'us'. "
                "Add it to COUNTRY_MAP in serpapi_provider.py.",
                country,
            )

        params = {
            "q": keyword,
            "engine": "google",
            "api_key": self.api_key,
            "num": min(depth, 100),  # SerpApi max per-page is 100
            "gl": gl,
            "hl": hl,
            "device": "desktop" if device.lower() == "desktop" else "mobile",
            "no_cache": "true",  # Always fetch fresh results
        }

        logger.info(
            "Searching SerpApi | keyword=%r gl=%s hl=%s device=%s num=%d",
            keyword,
            gl,
            hl,
            params["device"],
            params["num"],
        )

        try:
            response = httpx.get(self.base_url, params=params, timeout=30.0)
            response.raise_for_status()
            data = response.json()

            if "error" in data:
                logger.error("SerpApi returned error: %s", data["error"])
                return SearchResponse(
                    keyword=keyword,
                    results=[],
                    error=data["error"],
                    status="api_error",
                )

            results = []
            organic_results = data.get("organic_results", [])

            for res in organic_results:
                results.append(
                    SearchResult(
                        rank=res.get("position", 0),
                        url=res.get("link", ""),
                        title=res.get("title", ""),
                    )
                )

            logger.info("Got %d organic results for %r", len(results), keyword)
            return SearchResponse(keyword=keyword, results=results)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("SerpApi rate limit hit for keyword %r", keyword)
                return SearchResponse(
                    keyword=keyword,
                    results=[],
                    error="Rate limited by SerpApi",
                    status="rate_limited",
                )
            logger.error("HTTP error from SerpApi: %s", e)
            return SearchResponse(
                keyword=keyword, results=[], error=str(e), status="api_error"
            )
        except httpx.TimeoutException as e:
            logger.error("Timeout reaching SerpApi for keyword %r: %s", keyword, e)
            return SearchResponse(
                keyword=keyword, results=[], error=str(e), status="timeout"
            )
        except httpx.RequestError as e:
            logger.error("Request error for keyword %r: %s", keyword, e)
            return SearchResponse(
                keyword=keyword, results=[], error=str(e), status="api_error"
            )
