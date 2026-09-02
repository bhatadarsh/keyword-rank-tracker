from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel


class SearchResult(BaseModel):
    rank: int
    url: str
    title: str = ""  # Page title from SERP result


class SearchResponse(BaseModel):
    keyword: str
    results: List[SearchResult]
    error: Optional[str] = None
    status: str = "success"  # "success" | "api_error" | "rate_limited" | "timeout"


class SerpProvider(ABC):
    @abstractmethod
    def search(
        self,
        keyword: str,
        country: str,
        language: str,
        device: str,
        depth: int = 100,
    ) -> SearchResponse:
        """
        Search for a keyword and return organic results.

        Args:
            keyword:  The search query string.
            country:  Human-readable country name (e.g. "India").
            language: Human-readable language name (e.g. "English").
            device:   "desktop" or "mobile".
            depth:    Maximum number of organic results to retrieve.

        Returns:
            SearchResponse with a ranked list of organic results.
        """
        pass
