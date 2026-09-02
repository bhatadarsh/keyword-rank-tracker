import urllib.parse
from typing import List, Optional, Tuple
from providers.base import SearchResult


def normalize_domain(url_or_domain: str) -> str:
    """
    Normalises a raw URL or domain string into a bare hostname.

    Examples:
        https://www.hiree.com/assessment?ref=1  →  hiree.com
        www.hiree.com                           →  hiree.com
        http://app.hiree.com/                   →  app.hiree.com
    """
    raw = url_or_domain.lower().strip()

    # Add a scheme so urlparse can parse it correctly
    if not raw.startswith(("http://", "https://")):
        raw = "http://" + raw

    try:
        parsed = urllib.parse.urlparse(raw)
        host = parsed.netloc  # e.g. "www.hiree.com"

        # Strip port numbers (e.g. "localhost:8000" → "localhost")
        if ":" in host:
            host = host.split(":")[0]

        # Strip the "www." prefix only
        if host.startswith("www."):
            host = host[4:]

        return host
    except Exception:
        # Fallback: best-effort strip of common prefixes
        return raw.replace("http://", "").replace("https://", "").replace("www.", "").split("/")[0]


def match_domain(target_domain: str, result_url: str) -> bool:
    """
    Returns True if result_url belongs to target_domain.

    Matching rules:
    - Strips http/https, www, paths, query params.
    - Exact match:   hiree.com  ←→  hiree.com
    - Subdomain:     app.hiree.com  matches  hiree.com
    - NOT matched:   hiree.com.evil.com  (suffix attack prevented)
    - NOT matched:   notHiree.com  (must be the registered domain)
    """
    norm_target = normalize_domain(target_domain)
    norm_result = normalize_domain(result_url)

    if not norm_target or not norm_result:
        return False

    return norm_result == norm_target or norm_result.endswith("." + norm_target)


def calculate_best_rank(
    target_domain: str, results: List[SearchResult]
) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    """
    Scans the organic result list for the best (lowest) rank belonging to target_domain.

    Returns:
        (rank, ranking_url, page_title)  — all three populated if found
        (None, None, None)               — if the domain is not in the results
    """
    # Results should already be sorted by rank from the provider, but sort defensively.
    sorted_results = sorted(results, key=lambda r: r.rank)

    for res in sorted_results:
        if match_domain(target_domain, res.url):
            return res.rank, res.url, res.title

    return None, None, None
