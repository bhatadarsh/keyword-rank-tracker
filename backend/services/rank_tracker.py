import urllib.parse
from typing import List, Optional, Tuple, Dict, Any
from collections import Counter
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
    sorted_results = sorted(results, key=lambda r: r.rank)

    for res in sorted_results:
        if match_domain(target_domain, res.url):
            return res.rank, res.url, res.title

    return None, None, None


# ── Advanced Zero-Cost SEO Intelligence ──────────────────────────────────────────

CTR_CURVE_POINTS = {
    1: 30.0,
    2: 18.0,
    3: 12.0,
    4: 8.0,
    5: 6.0,
    6: 5.0,
    7: 4.0,
    8: 3.0,
    9: 2.5,
    10: 2.0,
}


def get_ctr_points(rank: Optional[int]) -> float:
    """Calculates weighted organic click-through points based on rank position."""
    if not rank or rank <= 0:
        return 0.0
    if rank in CTR_CURVE_POINTS:
        return CTR_CURVE_POINTS[rank]
    if 11 <= rank <= 30:
        return 1.0  # Striking distance opportunities retain search visibility
    return 0.0


def calculate_visibility_score(ranks: List[Optional[int]]) -> float:
    """
    Calculates an organic Share-of-Voice (SoV) visibility score (0 to 100%)
    weighted by an industry-standard CTR curve.
    """
    if not ranks:
        return 0.0
    max_possible = len(ranks) * 30.0
    actual_pts = sum(get_ctr_points(r) for r in ranks)
    return round((actual_pts / max_possible) * 100.0, 1)


def analyze_serp_intelligence(
    target_domain: str, results: List[SearchResult]
) -> Dict[str, Any]:
    """
    Zero-Cost Deep SERP Extraction:
    - Primary Best Rank + URL + Title
    - Keyword Cannibalization: Detects if 2+ distinct URLs from target domain rank
    - Top 5 SERP Competitors Snapshot (with domain, rank, url, title)
    - Page 1 Competitor domain collection for batch aggregation
    """
    sorted_results = sorted(results, key=lambda r: r.rank)

    target_matches = []
    seen_urls = set()

    for res in sorted_results:
        if match_domain(target_domain, res.url):
            # Normalize URL to avoid trivial fragment/slash duplication
            clean_url = res.url.split("#")[0].rstrip("/")
            if clean_url not in seen_urls:
                seen_urls.add(clean_url)
                target_matches.append(res)

    best_rank = target_matches[0].rank if target_matches else None
    best_url = target_matches[0].url if target_matches else None
    best_title = target_matches[0].title if target_matches else None

    matching_count = len(target_matches)
    sec_rank = target_matches[1].rank if matching_count >= 2 else None
    sec_url = target_matches[1].url if matching_count >= 2 else None

    # Top 5 SERP snapshot
    top_5 = []
    for res in sorted_results[:5]:
        dom = res.domain or normalize_domain(res.url)
        top_5.append({
            "rank": res.rank,
            "domain": dom,
            "url": res.url,
            "title": res.title,
            "is_target": match_domain(target_domain, res.url),
        })

    # Page 1 (Top 10) competitor domains
    page_1_competitors = []
    for res in sorted_results[:10]:
        if not match_domain(target_domain, res.url):
            dom = res.domain or normalize_domain(res.url)
            if dom:
                page_1_competitors.append(dom)

    return {
        "best_rank": best_rank,
        "best_url": best_url,
        "best_title": best_title,
        "matching_urls_count": matching_count,
        "secondary_rank": sec_rank,
        "secondary_url": sec_url,
        "cannibalization": matching_count >= 2,
        "top_5_competitors": top_5,
        "page_1_competitors": page_1_competitors,
    }


def aggregate_top_competitors(
    competitor_lists: List[List[str]], total_keywords: int
) -> List[Dict[str, Any]]:
    """
    Aggregates top non-target domains dominating Page 1 SERPs across the entire job.
    Returns the top 5 competitors with appearance count and SERP share percentage.
    """
    flat_domains = [d for sublist in competitor_lists for d in sublist]
    counts = Counter(flat_domains)

    top_5 = []
    for domain, count in counts.most_common(5):
        share_pct = round((count / max(1, total_keywords)) * 100.0, 1)
        top_5.append({
            "domain": domain,
            "count": count,
            "share_pct": share_pct,
        })
    return top_5
