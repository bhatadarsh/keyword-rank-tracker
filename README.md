<div align="center">

# 🔍 Automated Google Keyword Rank Tracker

### A Production-Grade SERP Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite%2FPostgreSQL-Ready-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

> Automate the manual performance-marketing workflow of checking Google organic search positions for any domain, across keywords, countries, languages, and devices — at scale.

[Quick Start](#-quick-start) · [System Design](#-system-design) · [API Reference](#-api-reference) · [Configuration](#-configuration) · [Deployment](#-deployment)

---

</div>

## 📖 Table of Contents

1. [Problem Statement](#1--problem-statement)
2. [Solution Overview](#2--solution-overview)
3. [System Design](#3--system-design)
   - [High-Level Architecture](#high-level-architecture)
   - [Component Diagram](#component-diagram)
   - [Data Flow Diagram](#data-flow-diagram)
   - [Database Schema](#database-schema)
   - [Sequence Diagram](#sequence-diagram)
4. [Design Decisions & Trade-offs](#4--design-decisions--trade-offs)
5. [Project Structure](#5--project-structure)
6. [Quick Start](#6--quick-start)
7. [Configuration](#7--configuration)
8. [API Reference](#8--api-reference)
9. [Input Format](#9--input-format)
10. [Output Format](#10--output-format)
11. [Domain Matching Logic](#11--domain-matching-logic)
12. [SERP Provider Setup](#12--serp-provider-setup)
13. [Testing](#13--testing)
14. [Deployment](#14--deployment)
15. [Performance & Scalability](#15--performance--scalability)
16. [Security Considerations](#16--security-considerations)

---

## 1. 🎯 Problem Statement

Performance marketing teams manually check Google search positions for hundreds of keywords each week. The workflow is:

1. Receive a list of keywords
2. Manually Google each keyword
3. Scroll through results to find if the company's site appears
4. Record position in a spreadsheet
5. Repeat for multiple countries & devices

**Pain Points:**
- Extremely time-consuming (100 keywords × 5 mins = ~8 hours/week)
- Error-prone (human mistakes, different VPNs, inconsistent results)
- Not reproducible or auditable
- No historical tracking → impossible to measure SEO progress

**Scale:** A mid-size marketing team tracks 500+ keywords across 5 countries weekly.

---

## 2. 💡 Solution Overview

An end-to-end automated platform where a marketing associate:

1. Enters the company name and domain
2. Configures target country, language, and device
3. Uploads a CSV/Excel file of keywords
4. Clicks **Run Check**
5. Watches real-time progress
6. Downloads a complete Excel or CSV report

All Google ranking data is fetched via a **configurable SERP API** (no direct scraping), ensuring compliance with Google's Terms of Service.

---

## 3. 🏗 System Design

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  React SPA (Vite + TypeScript + Tailwind CSS)               │   │
│   │  • Configuration Form  • Live Progress Bar  • Results Table │   │
│   │  • CSV Upload          • Download Reports                   │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────────┘
                              │ HTTP REST (JSON + multipart/form-data)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                           │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  FastAPI (Python 3.11)                                      │   │
│   │  • CORS Middleware  • Request Validation (Pydantic)         │   │
│   │  • OpenAPI Docs     • BackgroundTasks                       │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌──────────────────────┐       ┌──────────────────────────────────────┐
│   DATABASE LAYER     │       │       SERVICE LAYER                  │
│                      │       │                                      │
│  SQLAlchemy ORM      │◄─────►│  ┌────────────────────────────────┐ │
│  SQLite (dev)        │       │  │  Job Processor (async)         │ │
│  PostgreSQL (prod)   │       │  │  • Batch orchestration         │ │
│                      │       │  │  • Retry with backoff          │ │
│  Tables:             │       │  │  • Rate-limit awareness        │ │
│  • jobs              │       │  └────────────────┬───────────────┘ │
│  • keyword_tasks     │       │                   │                  │
└──────────────────────┘       │  ┌────────────────▼───────────────┐ │
                               │  │  Rank Tracker Service          │ │
                               │  │  • Domain normalization        │ │
                               │  │  • Subdomain matching          │ │
                               │  │  • Best-rank calculation       │ │
                               │  └────────────────┬───────────────┘ │
                               └───────────────────┼──────────────────┘
                                                   │
                               ┌───────────────────▼──────────────────┐
                               │         PROVIDER LAYER               │
                               │                                      │
                               │  ┌──────────────┐  ┌─────────────┐  │
                               │  │  SerpApi     │  │  Mock       │  │
                               │  │  Provider    │  │  Provider   │  │
                               │  └──────┬───────┘  └─────────────┘  │
                               └─────────┼────────────────────────────┘
                                         │ HTTPS
                                         ▼
                               ┌─────────────────────┐
                               │   SERP API          │
                               │  (serpapi.com)      │
                               │  Proxied Google     │
                               │  Search Results     │
                               └─────────────────────┘
```

---

### Component Diagram

```mermaid
graph TB
    subgraph "Frontend [React + Vite]"
        A[App.tsx] --> B[ConfigForm]
        A --> C[ProgressBar]
        A --> D[ResultsTable]
        A --> E[DownloadButtons]
    end

    subgraph "Backend [FastAPI]"
        F[main.py] --> G[api/routes.py]
        G --> H[services/job_processor.py]
        G --> I[services/rank_tracker.py]
        G --> J[exports/generator.py]
    end

    subgraph "Provider Abstraction"
        K[providers/base.py] --> L[providers/serpapi_provider.py]
        K --> M[providers/mock_provider.py]
        N[providers/__init__.py] --> K
    end

    subgraph "Data Layer [SQLAlchemy]"
        O[database.py] --> P[(SQLite / PostgreSQL)]
        Q[models.py] --> O
    end

    A -- "HTTP multipart/JSON" --> G
    H --> N
    H --> Q
    I --> Q
    J --> Q
```

---

### Data Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant BG as Background Task
    participant DB as Database
    participant SERP as SERP Provider

    User->>UI: Fill form + Upload keyword CSV
    UI->>API: POST /api/rank-check (multipart)
    API->>API: Parse & validate CSV/Excel
    API->>API: Deduplicate keywords
    API->>DB: Create Job (status=queued)
    API->>DB: Create KeywordTask rows (status=pending)
    API-->>UI: {job_id, status: "queued"}
    API->>BG: Launch background process(job_id)

    loop Every 2 seconds
        UI->>API: GET /api/rank-check/{job_id}
        API->>DB: Query job + tasks
        API-->>UI: {status, progress, results[]}
        UI->>UI: Update progress bar + table
    end

    loop For each keyword (with rate-limiting)
        BG->>DB: Fetch next pending task
        BG->>SERP: search(keyword, country, lang, device)
        SERP-->>BG: SearchResponse{results[]}
        BG->>BG: calculate_best_rank(domain, results)
        BG->>DB: Update KeywordTask (rank, url, status)
    end

    BG->>DB: Update Job (status=completed)
    UI->>API: GET /api/rank-check/{job_id}/download/csv
    API->>DB: Load all tasks for job
    API->>API: Generate CSV/Excel via pandas
    API-->>UI: File download stream
    User->>UI: Save CSV/Excel report
```

---

### Database Schema

```
┌─────────────────────────────────────────┐
│                  jobs                   │
├────────────────┬────────────────────────┤
│ id             │ VARCHAR (UUID, PK)      │
│ status         │ ENUM (queued,          │
│                │   processing, completed,│
│                │   failed)              │
│ company_name   │ VARCHAR                │
│ domain         │ VARCHAR                │
│ country        │ VARCHAR                │
│ language       │ VARCHAR                │
│ device         │ VARCHAR                │
│ depth          │ INTEGER                │
│ created_at     │ DATETIME               │
└────────────────┴────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────┐
│             keyword_tasks               │
├────────────────┬────────────────────────┤
│ id             │ INTEGER (PK, autoincr) │
│ job_id         │ VARCHAR (FK → jobs.id) │
│ keyword        │ VARCHAR, INDEXED       │
│ country        │ VARCHAR                │
│ language       │ VARCHAR                │
│ device         │ VARCHAR                │
│ rank           │ INTEGER (nullable)     │
│ ranking_url    │ VARCHAR (nullable)     │
│ status         │ ENUM (pending, found,  │
│                │   not_found, api_error,│
│                │   rate_limited,        │
│                │   timeout, invalid)    │
└────────────────┴────────────────────────┘
```

> **Future extension for Phase 3** — Historical tracking will add a `ranking_history` table:
> ```
> ranking_history(id, keyword_task_id, rank, ranking_url, checked_at)
> ```
> This enables `rank_change = previous_rank - current_rank` calculations without any breaking schema changes.

---

## 4. ⚖️ Design Decisions & Trade-offs

### Decision 1: Async Background Jobs vs. Celery/Redis

| Option | Pros | Cons |
|--------|------|------|
| **FastAPI BackgroundTasks** ✅ | Zero infrastructure, simple deployment, great for <500 req/job | Not persistent across restarts, single worker |
| Celery + Redis | Distributed, persistent, scalable | Requires Redis, Celery infra, complex setup |

**Chosen:** FastAPI `BackgroundTasks` for Phase 1 — sufficient for the stated scale. The abstraction is clean enough to swap to Celery by replacing `background_tasks.add_task()` with `job.delay()`.

---

### Decision 2: SQLite for Development, PostgreSQL for Production

| Option | Pros | Cons |
|--------|------|------|
| **SQLAlchemy ORM** ✅ | Database-agnostic, swap by changing `DATABASE_URL` | Slight ORM overhead |
| Raw SQL | Fastest queries | Tightly coupled to one DB engine |

**Chosen:** SQLAlchemy ORM + environment-driven `DATABASE_URL`. Switching from SQLite to PostgreSQL requires **zero code changes**:
```bash
# Dev
DATABASE_URL=sqlite:///./rank_tracker.db

# Prod
DATABASE_URL=postgresql://user:pass@host/db
```

---

### Decision 3: SERP Provider as an Abstraction

The `SerpProvider` base class enforces a clean interface:

```python
class SerpProvider(ABC):
    @abstractmethod
    def search(self, keyword: str, country: str, language: str, device: str, depth: int) -> SearchResponse:
        pass
```

This means adding a new provider (e.g. DataForSEO, ValueSERP) is:
1. Create `providers/datafor_seo_provider.py`
2. Implement the 1 abstract method
3. Add a case in `providers/__init__.py`
4. Update `SERP_PROVIDER=datafor_seo` in `.env`

**Zero changes to business logic.**

---

### Decision 4: Domain Matching Strategy

Matching logic is the most critical piece of ranking accuracy. The algorithm:

```
normalize(url) → strip http(s), www, paths, params → base domain

match(target, result) → result_domain == target OR result_domain.endswith("." + target)
```

**Examples:**
| Result URL | Target Domain | Match? | Reason |
|---|---|---|---|
| `https://hiree.com/assessment` | `hiree.com` | ✅ | Exact match |
| `https://www.hiree.com` | `hiree.com` | ✅ | www stripped |
| `https://app.hiree.com` | `hiree.com` | ✅ | Subdomain |
| `https://notHiree.com/hiree` | `hiree.com` | ❌ | Path, not domain |
| `https://hiree.com.evil.com` | `hiree.com` | ❌ | TLD mismatch |

**Subdomain Behavior:** Configurable. By default, `app.hiree.com` is counted as a match. This can be disabled to only count exact-domain matches.

---

### Decision 5: Status Enum Instead of Boolean

Using `found/not_found/api_error/rate_limited/timeout` instead of `True/False/None` is critical for debugging in production. You can immediately distinguish:

- `not_found` → Your SEO team needs to work on ranking
- `api_error` → Something broke, retry
- `rate_limited` → Slow down requests or upgrade API plan

---

## 5. 📂 Project Structure

```
keyword-rank-tracker/
│
├── 📁 backend/                     # Python FastAPI Application
│   │
│   ├── 📁 api/
│   │   └── routes.py               # REST endpoint definitions
│   │
│   ├── 📁 exports/
│   │   └── generator.py            # CSV & Excel report generation
│   │
│   ├── 📁 providers/               # SERP API abstraction layer
│   │   ├── __init__.py             # Factory: reads SERP_PROVIDER env var
│   │   ├── base.py                 # Abstract SerpProvider interface
│   │   ├── mock_provider.py        # Simulated responses (for dev/tests)
│   │   └── serpapi_provider.py     # Real SerpApi.com integration
│   │
│   ├── 📁 services/
│   │   ├── job_processor.py        # Async background job orchestrator
│   │   └── rank_tracker.py         # Domain normalization & rank logic
│   │
│   ├── 📁 tests/
│   │   └── test_domain_matching.py # Unit tests for critical matching logic
│   │
│   ├── database.py                 # SQLAlchemy engine & session factory
│   ├── models.py                   # ORM models: Job, KeywordTask
│   ├── main.py                     # FastAPI app, CORS, startup
│   └── venv/                       # Python virtual environment
│
├── 📁 frontend/                    # React + TypeScript SPA
│   ├── 📁 src/
│   │   ├── App.tsx                 # Main dashboard component
│   │   └── index.css               # Tailwind CSS entry
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .env.example                    # Environment variable template
├── sample_keywords.csv             # Ready-to-use test input file
└── README.md
```

---

## 6. 🚀 Quick Start

### Prerequisites
- **Python 3.11+** — [Download](https://python.org/downloads)
- **Node.js 18+** — [Download](https://nodejs.org)
- **Git** — [Download](https://git-scm.com)

### Clone & Setup

```bash
git clone <your-repo-url>
cd keyword-rank-tracker
```

### Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate        # Mac / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy ..\\.env.example .env       # Windows
# cp ../.env.example .env         # Mac / Linux

# Edit .env with your values (see Configuration section below)
```

### Frontend Setup

```bash
cd ../frontend
npm install
```

### Run Both Servers

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser. ✅

---

## 7. ⚙️ Configuration

Copy `.env.example` to `backend/.env`:

```env
# ─────────────────────────────────
# Database
# ─────────────────────────────────
# SQLite (local dev — zero setup)
DATABASE_URL=sqlite:///./rank_tracker.db

# PostgreSQL (production)
# DATABASE_URL=postgresql://user:password@localhost:5432/rank_tracker

# ─────────────────────────────────
# SERP Provider
# ─────────────────────────────────
# Options: 'mock' | 'serpapi'
SERP_PROVIDER=mock

# Required when SERP_PROVIDER=serpapi
SERP_API_KEY=your_serpapi_key_here
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `sqlite:///./rank_tracker.db` | SQLAlchemy DB connection string |
| `SERP_PROVIDER` | Yes | `mock` | Which SERP provider to use |
| `SERP_API_KEY` | When using `serpapi` | — | Your SerpApi.com API key |

---

## 8. 📡 API Reference

All endpoints are available at `http://localhost:8000`. Interactive Swagger docs at `http://localhost:8000/docs`.

---

### `POST /api/rank-check`
**Start a new rank check job.**

| Field | Type | Required | Description |
|---|---|---|---|
| `company_name` | string | ✅ | Name of the company |
| `domain` | string | ✅ | Base domain (e.g. `hiree.com`) |
| `country` | string | ✅ | Target country (e.g. `India`) |
| `language` | string | ✅ | Target language (e.g. `English`) |
| `device` | string | ✅ | `desktop` or `mobile` |
| `depth` | integer | ✅ | 100, 200, or 500 |
| `file` | file | ✅ | `.csv` or `.xlsx` keyword file |

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Started processing 7 keywords."
}
```

---

### `GET /api/rank-check/{job_id}`
**Poll job progress and results.**

**Response:**
```json
{
  "job_id": "550e8400-...",
  "status": "processing",
  "progress": {
    "total": 7,
    "completed": 3,
    "percent": 42
  },
  "results": [
    {
      "keyword": "Assessment",
      "rank": 23,
      "ranking_url": "https://hiree.com/assessment",
      "status": "found"
    },
    {
      "keyword": "Online exam platform",
      "rank": null,
      "ranking_url": null,
      "status": "not_found"
    }
  ]
}
```

**Status values:** `queued` → `processing` → `completed` | `failed`

---

### `GET /api/rank-check/{job_id}/download/{format}`
**Download the final report.**

- `format`: `csv` or `xlsx`

Returns a file download. Only available once `status == "completed"`.

---

## 9. 📥 Input Format

The uploaded file **must** contain a `keyword` column. Rows with blank keywords are automatically skipped.

**Minimal CSV:**
```csv
keyword
Assessment
Exam navigation
Career roadmap
Online exam platform
Skill assessment
```

**Rich CSV (per-row overrides):**

When `country`, `language`, or `device` columns are present, they override the global UI settings for that specific keyword.

```csv
keyword,country,language,device
Assessment,India,English,desktop
Exam navigation,India,English,desktop
Career roadmap,United States,English,desktop
Online exam platform,United Kingdom,English,mobile
```

**Rules:**
- Supports `.csv` and `.xlsx` / `.xls` formats
- Column names are case-insensitive (`Keyword`, `keyword`, `KEYWORD` all work)
- Leading/trailing whitespace in keywords is trimmed
- Duplicate keyword rows (same keyword + country + language + device) are deduplicated before sending API requests, saving cost

---

## 10. 📤 Output Format

Reports are available in both CSV and Excel formats.

| Keyword | Company | Domain | Country | Language | Device | Rank | Ranking URL | Status | Search Date |
|---|---|---|---|---|---|---|---|---|---|
| Assessment | Hiree | hiree.com | India | English | desktop | 23 | https://hiree.com/assessment | Found | 2026-09-02 |
| Exam navigation | Hiree | hiree.com | India | English | desktop | 7 | https://hiree.com/exams | Found | 2026-09-02 |
| Online exam platform | Hiree | hiree.com | UK | English | mobile | Not Found | | Not Found | 2026-09-02 |
| Skill assessment | Hiree | hiree.com | Canada | English | desktop | | | API Error | 2026-09-02 |

**Status values in the output:**

| Status | Meaning |
|---|---|
| `Found` | Domain appeared in the top N organic results |
| `Not Found` | Domain was genuinely absent from all results |
| `API Error` | SERP API returned an error — **not** a ranking result |
| `Rate Limited` | API rate limit was hit — request should be retried |
| `Timeout` | Network timeout reaching the API |

---

## 11. 🧬 Domain Matching Logic

The rank matching algorithm is the most important piece of the system.

### Normalization Algorithm

```python
def normalize_domain(url_or_domain: str) -> str:
    # Step 1: Lowercase + strip whitespace
    url = url_or_domain.lower().strip()
    
    # Step 2: Ensure URL scheme for urlparse
    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    # Step 3: Parse and extract netloc (host)
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc  # → "www.hiree.com"
    
    # Step 4: Strip www prefix
    if domain.startswith("www."):
        domain = domain[4:]  # → "hiree.com"
    
    return domain
```

### Match Algorithm

```python
def match_domain(target_domain: str, result_url: str) -> bool:
    normalized_target = normalize_domain(target_domain)  # "hiree.com"
    normalized_result = normalize_domain(result_url)     # "app.hiree.com"
    
    return (
        normalized_result == normalized_target or
        normalized_result.endswith("." + normalized_target)
    )
```

### Edge Cases Handled

| Case | Input | Result |
|---|---|---|
| HTTP vs HTTPS | `http://hiree.com` | Normalized → `hiree.com` ✅ |
| www prefix | `www.hiree.com` | Normalized → `hiree.com` ✅ |
| URL path | `hiree.com/assessment` | Normalized → `hiree.com` ✅ |
| Subdomain | `app.hiree.com` | Matches `hiree.com` ✅ |
| Redirect-like attack | `hiree.com.evil.com` | No match ✅ |
| URL params | `hiree.com?q=1` | Normalized → `hiree.com` ✅ |
| Multiple appearances | `hiree.com` at #5 and #18 | Returns rank **5** ✅ |

---

## 12. 🔌 SERP Provider Setup

### Default: Mock Provider (for development)

No API key needed. The mock provider:
- Simulates realistic network latency (0.5–1.5s per keyword)
- Randomly places the target domain at varying positions
- Has an 80% "found" rate and 20% "not found" rate
- Occasionally simulates API errors (5% of calls)

### SerpApi (for production)

1. Create an account at [serpapi.com](https://serpapi.com)
2. Copy your API key from the dashboard
3. Update `backend/.env`:

```env
SERP_PROVIDER=serpapi
SERP_API_KEY=your_actual_api_key_here
```

**SerpApi Plan Guidance:**

| Plan | Monthly Searches | Cost | Recommended For |
|---|---|---|---|
| Free | 100 | $0 | Development testing |
| Hobby | 5,000 | $50 | Small teams (<200 keywords/week) |
| Business | 30,000 | $200 | Mid-size marketing teams |

### Adding a Custom Provider

Create `backend/providers/my_provider.py`:

```python
from providers.base import SerpProvider, SearchResponse, SearchResult

class MyCustomProvider(SerpProvider):
    def search(self, keyword, country, language, device, depth=100) -> SearchResponse:
        # Call your chosen API here
        # Map the response to SearchResult objects
        return SearchResponse(keyword=keyword, results=[...])
```

Register it in `providers/__init__.py`:

```python
if provider_name == "my_custom":
    return MyCustomProvider()
```

---

## 13. 🧪 Testing

### Run All Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```

### Test Coverage

| Module | Tests |
|---|---|
| `test_domain_matching.py` | Domain normalization, subdomain matching, attack prevention |

### Adding More Tests

All SERP tests use the `MockProvider` — **no live API calls, no cost.**

Example test pattern:

```python
from providers.mock_provider import MockProvider
from services.rank_tracker import calculate_best_rank

def test_best_rank_returns_lowest_position():
    provider = MockProvider()
    response = provider.search("test keyword", "India", "English", "desktop")
    rank, url = calculate_best_rank("hiree.com", response.results)
    # rank is either an integer or None — never 0
    assert rank is None or isinstance(rank, int) and rank > 0
```

---

## 14. 🚢 Deployment

### Docker (Recommended)

```bash
# Backend
docker build -t rank-tracker-backend ./backend
docker run -p 8000:8000 \
  -e SERP_PROVIDER=serpapi \
  -e SERP_API_KEY=your_key \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  rank-tracker-backend

# Frontend (static build)
cd frontend && npm run build
# Serve the `dist/` directory via Nginx or Vercel
```

### Render / Railway (One-Click Alternatives)

1. Push code to GitHub
2. Connect repo in [Render](https://render.com) or [Railway](https://railway.app)
3. Set environment variables in the dashboard
4. Deploy 🎉

### Production Checklist

- [ ] Switch `DATABASE_URL` to PostgreSQL
- [ ] Set `SERP_PROVIDER=serpapi` with a real API key
- [ ] Configure proper CORS origins in `main.py`
- [ ] Set up HTTPS via a reverse proxy (Nginx / Caddy)
- [ ] Add API authentication (Bearer token / API key header)
- [ ] Set up log aggregation (Datadog, Papertrail)
- [ ] Configure database backups

---

## 15. 📈 Performance & Scalability

| Dimension | Current Approach | Scale-Out Path |
|---|---|---|
| **Job Processing** | FastAPI BackgroundTasks (in-process) | Celery + Redis workers |
| **Database** | SQLite | PostgreSQL with connection pooling |
| **Concurrency** | Sequential per-job, 1s delay between requests | Async httpx with semaphore-limited concurrency |
| **Horizontal Scaling** | Single server | Stateless API + external DB → N servers behind load balancer |
| **Caching** | None | Redis cache for repeated keyword+country combos |

**Keyword Volume Estimates:**

| Keywords | Estimated Time | API Calls |
|---|---|---|
| 10 | ~15 seconds | 10 |
| 100 | ~2.5 minutes | 100 |
| 500 | ~12 minutes | 500 |
| 1,000 | ~25 minutes | 1,000 |

> *Estimates assume ~1.5s avg per API call + 1s delay between calls.*

---

## 16. 🔒 Security Considerations

| Risk | Mitigation |
|---|---|
| **API key exposure** | Loaded from environment variables only — never logged or committed |
| **File upload abuse** | Validated file types (`.csv`, `.xls`, `.xlsx`) and parsed defensively |
| **SQL injection** | All DB access through SQLAlchemy ORM with parameterized queries |
| **CORS** | Restricted to known frontend origins (configurable) |
| **Secrets in git** | `.env` is in `.gitignore`; `.env.example` contains no real values |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push to branch: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ for performance marketing teams who deserve better tooling.

</div>
