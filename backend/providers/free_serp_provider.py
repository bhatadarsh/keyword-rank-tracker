import os
import re
import urllib.parse
import logging
import random
from typing import List, Optional
from html.parser import HTMLParser
import httpx

from providers.base import SerpProvider, SearchResponse, SearchResult
from providers.mock_provider import MockProvider

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
]


class DDGLiteParser(HTMLParser):
    """
    Lightweight, fast zero-dependency HTML parser for DuckDuckGo Lite.
    Extracts organic result links and titles.
    """
    def __init__(self):
        super().__init__()
        self.results: List[dict] = []
        self.in_result_link = False
        self.current_href = ""
        self.current_title = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "a" and "result-link" in attrs_dict.get("class", ""):
            self.in_result_link = True
            self.current_href = attrs_dict.get("href", "")
            self.current_title = []

    def handle_endtag(self, tag):
        if tag == "a" and self.in_result_link:
            self.in_result_link = False
            title = "".join(self.current_title).strip()
            if self.current_href and title:
                self.results.append({"url": self.current_href, "title": title})
            self.current_href = ""
            self.current_title = []

    def handle_data(self, data):
        if self.in_result_link:
            self.current_title.append(data)


def clean_ddg_url(raw_url: str) -> str:
    """Extract clean destination URL from DuckDuckGo redirect link."""
    if "uddg=" in raw_url:
        try:
            parsed = urllib.parse.urlparse(raw_url)
            qs = urllib.parse.parse_qs(parsed.query)
            if "uddg" in qs and qs["uddg"]:
                return qs["uddg"][0]
        except Exception:
            pass
    if raw_url.startswith("//"):
        return "https:" + raw_url
    return raw_url


def extract_domain(url: str) -> str:
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


class FreeSerpProvider(SerpProvider):
    """
    100% Zero-Cost Live Search Engine.
    Queries DuckDuckGo Lite or a public/self-hosted SearXNG instance without requiring any API keys.
    Gracefully falls back to high-fidelity mock if network blocked or rate-limited.
    """

    def __init__(self):
        self.searxng_url = os.getenv("SEARXNG_URL", "").strip()
        self.mock_fallback = MockProvider()

    def search(
        self,
        keyword: str,
        country: str,
        language: str,
        device: str,
        depth: int = 100,
        target_domain: Optional[str] = None,
    ) -> SearchResponse:
        logger.info(
            "FreeSerpProvider searching | keyword=%r country=%s lang=%s target=%s",
            keyword, country, language, target_domain,
        )

        # 1. Try SearXNG if configured
        if self.searxng_url:
            searx_resp = self._query_searxng(keyword, depth)
            if searx_resp and searx_resp.results:
                return searx_resp

        # 2. Query DuckDuckGo Lite SERP
        ddg_resp = self._query_duckduckgo_lite(keyword, depth, target_domain)
        if ddg_resp and ddg_resp.results:
            return ddg_resp

        # 3. Fallback to dynamic domain simulation if network blocks or rate limits
        logger.warning("Free live search returned no results (rate-limit or network barrier). Engaging smart fallback.")
        fallback = self.mock_fallback.search(
            keyword=keyword,
            country=country,
            language=language,
            device=device,
            depth=depth,
            target_domain=target_domain,
        )
        return fallback

    def _query_searxng(self, keyword: str, depth: int) -> Optional[SearchResponse]:
        try:
            headers = {"User-Agent": random.choice(USER_AGENTS)}
            params = {
                "q": keyword,
                "format": "json",
                "categories": "general",
            }
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.get(self.searxng_url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_results = data.get("results", [])
                    results = []
                    for idx, item in enumerate(raw_results[:depth], start=1):
                        url = item.get("url", "")
                        results.append(
                            SearchResult(
                                rank=idx,
                                url=url,
                                title=item.get("title", ""),
                                domain=extract_domain(url),
                            )
                        )
                    if results:
                        return SearchResponse(keyword=keyword, results=results, status="success")
        except Exception as exc:
            logger.debug("SearXNG query failed: %s", exc)
        return None

    def _query_duckduckgo_lite(
        self, keyword: str, depth: int, target_domain: Optional[str] = None
    ) -> Optional[SearchResponse]:
        url = "https://lite.duckduckgo.com/lite/"
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"q": keyword}

        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.post(url, headers=headers, data=data)
                if resp.status_code != 200:
                    return None

                parser = DDGLiteParser()
                parser.feed(resp.text)

                if not parser.results:
                    return None

                results = []
                for idx, item in enumerate(parser.results[:depth], start=1):
                    clean_url = clean_ddg_url(item["url"])
                    results.append(
                        SearchResult(
                            rank=idx,
                            url=clean_url,
                            title=item["title"],
                            domain=extract_domain(clean_url),
                        )
                    )

                logger.info("DuckDuckGo Lite returned %d organic results for %r", len(results), keyword)
                return SearchResponse(keyword=keyword, results=results, status="success")
        except Exception as exc:
            logger.debug("DuckDuckGo Lite fetch failed: %s", exc)
            return None
