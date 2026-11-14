# NexusRank — Keyword Rank Tracker: Architecture Guide

> Production-grade technical reference for contributors. Every claim below is sourced directly from the actual source files.

---

## 1. High-Level Purpose & Architecture

### Core Problem & Functionality

**NexusRank** is a full-stack automated Google keyword rank tracker. It solves the manual SEO workflow of searching for each keyword, scanning SERP results, finding the target domain, and recording its rank position.

| Dimension | Detail |
|---|---|
| **Primary Users** | SEO associates, digital marketing teams |
| **Primary Inputs** | A CSV/Excel file of keywords + company name, domain, country, language, device, depth |
| **Primary Outputs** | Per-keyword rank, ranking URL, page title; downloadable CSV/XLSX report |
| **Key Feature** | "Opportunities" filter — shows keywords ranking 11–30, closest to Page 1 (highest ROI SEO targets) |

---

### Tech Stack & Key Dependencies

#### Backend (`backend/requirements.txt`)

| Package | Version | Role |
|---|---|---|
| `fastapi` | `0.115.12` | REST API framework |
| `uvicorn[standard]` | `0.34.3` | ASGI server |
| `sqlalchemy` | `2.0.40` | ORM and DB abstraction |
| `pandas` | `2.2.3` | CSV/Excel parsing and export |
| `openpyxl` | `3.1.5` | Excel `.xlsx` writer (pandas engine) |
| `python-multipart` | `0.0.20` | FastAPI file upload support |
| `httpx` | `0.28.1` | Sync HTTP client for SerpApi calls |
| `python-dotenv` | `1.0.1` | `.env` file loading |
| `pydantic` | `2.13.5` | Data validation and schema settings |
| `pytest` | `8.3.5` | Test runner |
| `pytest-asyncio` | `0.25.3` | Async test support |

**Runtime:** Python 3.13 (from `__pycache__` naming: `cpython-313`)  
**Database:** SQLite (dev, file-based `rank_tracker.db`); PostgreSQL-ready (SQLAlchemy dialect switch)

#### Frontend (`frontend/package.json`)

| Package | Version | Role |
|---|---|---|
| `react` | `^19.2.8` | UI framework |
| `react-dom` | `^19.2.8` | React DOM renderer |
| `react-router-dom` | `^7.18.3` | (installed, not yet wired) |
| `axios` | `^1.20.0` | HTTP client for API calls |
| `lucide-react` | `^1.39.0` | Icon library |
| `tailwindcss` | `^4.3.3` | CSS utility framework |
| `vite` | `^8.2.2` | Build tool and dev server |
| `typescript` | `~6.0.2` | Type safety |
| `@vitejs/plugin-react` | `^6.1.0` | Vite React HMR plugin |
| `@tailwindcss/vite` | `^4.3.3` | Tailwind v4 Vite plugin (no postcss.config needed) |
| `oxlint` | `^1.79.0` | Fast Rust-based linter (replaces ESLint) |

---

### System Architecture Diagram

```mermaid
graph TD
    User["👤 User (Browser)"]

    subgraph Frontend ["Frontend — React 19 SPA (Vite :5173)"]
        UI_Shell["AppShell.tsx\nClean 240px Sidebar · Theme Switch · Engine Status"]
        UI_Onboarding["WelcomeGuideBanner.tsx\n3-Step Interactive Walkthrough · LocalStorage"]
        UI_Launch["ScanLaunchpad.tsx\nDrag & Drop CSV Preview · 1-Click Demos · Engine Select"]
        UI_Bento["BentoAnalyticsHeader.tsx\nOrganic Visibility SoV % · 4 Metric Cards · InfoTooltip"]
        UI_Grid["ResultsDataGrid.tsx\nTable (py-3.5) · Opportunities (11-30) · SERP X-Ray Drawer"]
        UI_Comp["CompetitorMatrixView.tsx\nPage 1 Domain Cross-Reference & Dominance"]
        UI_History["HistoryView.tsx\nPast Scans · Reload · Delete · Export"]
        UI_Help["HelpView.tsx\nGlossary · Engine Comparison · Sample CSV Download"]
        UI_Palette["CommandPalette.tsx\nCmd+K / Ctrl+K Modal Controller"]
    end

    subgraph Backend ["Backend — FastAPI (Uvicorn :8000)"]
        MW_CORS["CORSMiddleware\nallow: localhost:5173"]
        Router["api/routes.py\nAPIRouter prefix=/api/rank-check"]
        EP_CONFIG["GET /api/config — get_config()"]
        EP_POST["POST / — create_job()"]
        EP_GET["GET /{job_id} — get_job_status()"]
        EP_LIST["GET / — list_jobs()"]
        EP_DELETE["DELETE /{job_id} — delete_job()"]
        EP_DL["GET /{job_id}/download/{fmt}"]
        EP_HEALTH["GET /health — health_check()"]
    end

    subgraph Services ["Services & Intelligence Layer"]
        JP["services/job_processor.py\nprocess_job() · historical delta correlation"]
        RT["services/rank_tracker.py\nnormalize_domain() · calculate_visibility_score()\nanalyze_serp_intelligence() · aggregate_top_competitors()"]
        EX["exports/generator.py\ngenerate_csv() · generate_excel()"]
    end

    subgraph Providers ["Multi-Engine Provider Abstraction"]
        PF["providers/__init__.py\nget_provider(name) factory"]
        FREE["providers/free_serp_provider.py\nFreeSerpProvider (DuckDuckGo Lite + SearXNG)"]
        MOCK["providers/mock_provider.py\nMockProvider (SHA-256 Dynamic Deterministic Simulation)"]
        SERP["providers/serpapi_provider.py\nSerpApiProvider (Official API + Depth > 100 Pagination)"]
    end

    subgraph DB ["Data Layer — SQLAlchemy"]
        DBEngine["database.py\nensure_schema_columns() · reconcile_orphan_jobs()"]
        Jobs["jobs table (visibility_score, provider, competitors)"]
        Tasks["keyword_tasks table (rank, delta, secondary_url, json)"]
    end

    ExtLive["🌐 DuckDuckGo / SearXNG\nZero-Key Live Search"]
    ExtAPI["🌐 serpapi.com\nProxied Google Search API"]

    User -->|"interact"| UI_Shell
    UI_Launch -->|"POST multipart/form-data"| EP_POST
    UI_Grid & UI_Bento -->|"GET poll every 2s"| EP_GET
    UI_History -->|"GET"| EP_LIST
    UI_History -->|"DELETE"| EP_DELETE
    UI_Grid -->|"window.location.href"| EP_DL
    UI_Shell -->|"GET"| EP_CONFIG

    EP_POST --> MW_CORS
    MW_CORS --> Router
    Router --> EP_CONFIG
    Router --> EP_POST
    Router --> EP_GET
    Router --> EP_LIST
    Router --> EP_DELETE
    Router --> EP_DL

    EP_POST -->|"db.add Job + KeywordTasks"| DBEngine
    EP_POST -->|"FastAPI BackgroundTasks"| JP
    EP_GET -->|"db.query"| DBEngine
    EP_LIST -->|"db.query"| DBEngine
    EP_DELETE -->|"db.delete"| DBEngine
    EP_DL --> EX

    JP -->|"db.query pending tasks"| DBEngine
    JP --> PF
    JP --> RT
    JP -->|"db.commit results per keyword"| DBEngine

    PF -->|"provider=free"| FREE
    PF -->|"provider=mock"| MOCK
    PF -->|"provider=serpapi"| SERP

    FREE -->|"httpx.get organic parsing"| ExtLive
    SERP -->|"httpx.get + offset pagination"| ExtAPI

    DBEngine --- Jobs
    DBEngine --- Tasks
    Jobs -->|"1:N"| Tasks
```

---

## 2. Directory & Codebase Map

```
keyword-rank-tracker/
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # Automated GitHub Actions CI workflow (pytest + npm build)
├── .env.example                  # Template env vars (safe to commit)
├── .env                          # Local environment variables (gitignored)
├── .gitignore                    # Excludes venv, .env, *.db, exports/files/, node_modules
├── docker-compose.yml            # Multi-container production orchestration (Backend + Frontend)
├── start.ps1                     # ⭐ Windows 1-click dev launcher (venv, npm, kills ports, starts servers)
├── start.sh                      # ⭐ macOS/Linux 1-script launcher (auto-setup, traps Ctrl+C)
├── sample_keywords.csv           # Example CSV with keyword/country/language/device columns
├── test_github.csv               # 10 keywords for github.com (integration test data)
├── test_wikipedia.csv            # 10 keywords for wikipedia.org (gold-standard verification)
├── README.md                     # Flagship open-source documentation with architecture diagrams
├── CHANGELOG.md                  # Chronological development log
├── ARCHITECTURE.md               # Technical architecture and onboarding specification
│
├── backend/
│   ├── main.py                   # ⭐ FastAPI app entrypoint with lifespan startup tasks (migration & recovery)
│   ├── database.py               # SQLAlchemy engine factory, ensure_schema_columns() & reconcile_orphan_jobs()
│   ├── models.py                 # Job + KeywordTask ORM models with SoV, delta & cannibalization fields
│   ├── requirements.txt          # Pinned Python dependencies (FastAPI, SQLAlchemy, Pydantic, etc.)
│   ├── Dockerfile                # Backend container definition
│   ├── rank_tracker.db           # SQLite development database (auto-created & auto-migrating)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py             # ⭐ REST endpoints: POST, GET status, GET list, DELETE, GET config, GET download
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── job_processor.py      # ⭐ Background worker thread: delta correlation, provider loop, per-keyword commit
│   │   └── rank_tracker.py       # Domain normalization, CTR Visibility Score (SoV %), cannibalization & competitor aggregation
│   │
│   ├── providers/
│   │   ├── __init__.py           # get_provider() factory (free, mock, serpapi)
│   │   ├── base.py               # Abstract SerpProvider + SearchResult/SearchResponse Pydantic models
│   │   ├── free_serp_provider.py # 100% Zero-key live SERP search via DuckDuckGo Lite & SearXNG
│   │   ├── mock_provider.py      # Dynamic domain simulation with deterministic SHA-256 seeding
│   │   └── serpapi_provider.py   # SerpApi integration with depth > 100 offset pagination
│   │
│   ├── exports/
│   │   ├── __init__.py
│   │   ├── generator.py          # UTF-8 BOM CSV and auto-fitted Excel (.xlsx) report generator
│   │   └── files/                # Generated export files (gitignored); named results_{job_id}.{fmt}
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_domain_matching.py  # 23 pytest tests: normalization, subdomains, suffix attacks, best rank
│   │   └── test_seo_analytics.py    # 10 pytest tests: CTR curve, cannibalization, competitors, recovery
│   │
│   └── venv/                     # Python virtual environment (gitignored)
│
└── frontend/
    ├── index.html                # Vite SPA shell with Inter & JetBrains Mono font preloads
    ├── vite.config.ts            # Vite config: React + Tailwind plugins; /api proxy → :8000
    ├── package.json              # NPM manifest with React 19, TypeScript, Tailwind v4
    ├── tsconfig.json             # TypeScript compiler config
    ├── Dockerfile                # Multi-stage production container build
    ├── nginx.conf                # Nginx reverse proxy configuration for Docker
    │
    └── src/
        ├── main.tsx              # React entry: ReactDOM.createRoot → <App />
        ├── App.tsx               # Root application orchestrator with visibility-aware polling
        ├── index.css             # Inter & JetBrains Mono typography, true neutral Zinc tokens
        ├── api/
        │   └── client.ts         # Typed Axios client service
        ├── hooks/
        │   └── useOnboarding.ts  # Persistent localStorage interactive walkthrough state
        ├── types/
        │   └── index.ts          # TypeScript interfaces for jobs, tasks, views, and telemetry
        └── components/
            ├── common/
            │   ├── CommandPalette.tsx # Global Cmd+K / Ctrl+K search & navigation modal
            │   └── InfoTooltip.tsx    # Accessible contextual popover tooltip for metrics
            ├── help/
            │   └── HelpView.tsx       # Built-in Help & Glossary center with sample CSV download
            ├── history/
            │   └── HistoryView.tsx    # Searchable scan archive with status badges & deletion
            ├── layout/
            │   └── AppShell.tsx       # Clean 240px navigation, engine status, and theme toggle
            ├── onboarding/
            │   └── WelcomeGuideBanner.tsx # Dismissible 3-step interactive onboarding card
            ├── results/
            │   ├── BentoAnalyticsHeader.tsx # Organic Visibility SoV gauge & 4 clean metric cards
            │   ├── CompetitorMatrixView.tsx # Page 1 Competitor domain cross-reference
            │   └── ResultsDataGrid.tsx      # Table, smart filters, and SERP X-Ray drawer
            └── scan/
                └── ScanLaunchpad.tsx  # Centered form, drag & drop upload & 1-click demos
```

### Entry Points

| Layer | Entry Point | How execution begins |
|---|---|---|
| **Backend** | `backend/main.py` | `uvicorn main:app --reload --port 8000` runs the ASGI app; `load_dotenv()` fires first, then table creation, then router registration |
| **Frontend** | `frontend/src/main.tsx` | Vite serves `index.html`; `createRoot` mounts `<App />` |
| **Dev launcher** | `start.ps1` | PowerShell script kills ports 8000/5173, starts both processes in separate windows, opens browser |
| **API docs** | `http://localhost:8000/docs` | FastAPI auto-generated Swagger UI |
| **Health** | `GET /health` | Returns `{status: "ok", provider: "mock|serpapi"}` |

---

## 3. End-to-End Execution & Data Flow

### Workflow 1 — Submitting a New Rank Check Job

**Entry:** User fills form + uploads `sample_keywords.csv` → clicks "Initialize Scan"

```
App.tsx :: handleSubmit()
  → builds FormData (company_name, domain, country, language, device, depth, file)
  → axios.POST('/api/rank-check', fd)                             [multipart/form-data]
  
  ↓ Vite proxy rewrites /api → http://localhost:8000/api

main.py :: CORSMiddleware validates Origin header

api/routes.py :: create_job()   [lines 63–183]
  1. Validates company_name (non-empty)
  2. _clean_domain() → services/rank_tracker.normalize_domain()   strips https/www/path
  3. _validate_domain() → regex check for valid hostname format
  4. Validates device ∈ {"desktop","mobile"}, depth ∈ {100,200,500}
  5. file.read() → pd.read_csv() or pd.read_excel() depending on extension
  6. Normalizes column headers to lowercase
  7. Checks "keyword" column exists
  8. Generates job_id = str(uuid.uuid4())
  9. db.add(Job(...))  [models.py :: Job]
  10. df.iterrows() → deduplication by (keyword, country, language, device) tuple
  11. db.add_all([KeywordTask(...)])
  12. db.commit()
  13. background_tasks.add_task(process_job, job_id)   ← queued in FastAPI threadpool
  14. Returns {job_id, status:"queued", keyword_count, domain}

App.tsx :: setJobId(data.job_id); setJobStatus('queued')
  → starts useEffect polling loop (setInterval 2000ms)
```

### Workflow 2 — Background Job Processing (the core loop)

**Entry:** `background_tasks.add_task(process_job, job_id)` from route

```
services/job_processor.py :: process_job(job_id)   [lines 19–128]
  1. Opens a NEW SQLAlchemy Session (SessionLocal()) — not the request session
  2. db.query(Job).filter(Job.id == job_id).first()
  3. job.status = "processing"; db.commit()
  4. providers/__init__.py :: get_provider()
       reads SERP_PROVIDER env var
       → "serpapi" → SerpApiProvider()
       → "mock"    → MockProvider()
       → unknown   → MockProvider() (fallback with warning)

  5. Queries all pending KeywordTask rows for this job

  6. FOR EACH task (with time.sleep(2.0) between each):
     a. Retry loop (up to 3 retries for rate_limited/timeout):
        providers/serpapi_provider.py :: SerpApiProvider.search()
          builds params: q=keyword, engine=google, api_key=SERP_API_KEY,
                         num=min(depth,100), gl=COUNTRY_MAP[country],
                         hl=LANGUAGE_MAP[language], device=desktop|mobile,
                         no_cache=true
          httpx.get("https://serpapi.com/search", params=params, timeout=30.0)
          Parses response["organic_results"] → List[SearchResult(rank, url, title)]
          Returns SearchResponse(keyword, results, status)
          
          Error cases:
            HTTP 429 → SearchResponse(status="rate_limited")
            httpx.TimeoutException → SearchResponse(status="timeout")
            httpx.RequestError → SearchResponse(status="api_error")
            data["error"] key → SearchResponse(status="api_error")

     b. services/rank_tracker.py :: calculate_best_rank(job.domain, response.results)
          sorted_results = sorted(results, key=lambda r: r.rank)  ← defensive sort
          FOR res IN sorted_results:
            match_domain(target_domain, res.url):
              normalize_domain(target)  → strips scheme/www/path/port
              normalize_domain(result_url)
              returns: result == target OR result.endswith("." + target)
          Returns (best_rank, ranking_url, page_title) or (None, None, None)

     c. Updates task.rank, task.ranking_url, task.page_title, task.status
     d. db.commit()   ← committed after EACH keyword so polling sees live progress

  7. job.status = "completed"; db.commit()
  
  EXCEPTION HANDLER:
    db.rollback()
    job.status = "failed"; db.commit()
  FINALLY: db.close()
```

### Workflow 3 — Polling & Downloading Results

**Polling (every 2s while job is queued/processing):**
```
App.tsx :: useEffect (jobId, isRunning)
  → setInterval(poll, 2000)
  → axios.GET('/api/rank-check/{jobId}')

api/routes.py :: get_job_status()   [lines 186–219]
  db.query(Job).filter(Job.id == job_id).first()
  db.query(KeywordTask).filter(KeywordTask.job_id == job_id).all()
  completed = count(tasks where status != "pending")
  Returns {job_id, status, company_name, domain, progress{total,completed,percent}, results[]}

App.tsx :: setJobStatus / setProgress / setResults
  → ResultsPanel re-renders:
     RankTierCards    — counts top3/top10/page2/beyond/not_found
     SummaryStatsStrip — best rank, avg rank, page1 count
     Status/filter tabs (all/found/opportunities/not_found/errors)
     Keyword search input
     Sortable table (rank asc by default) with expandable row detail
```

**Download:**
```
App.tsx :: download(fmt)
  → window.location.href = '/api/rank-check/{jobId}/download/{fmt}'

api/routes.py :: download_results()   [lines 222–253]
  db.query(Job + Tasks)
  exports/generator.py :: generate_csv(job, tasks, filepath)  or  generate_excel()
    generate_export_dataframe() → pd.DataFrame with 11 columns
    df.to_csv(utf-8-sig)  or  pd.ExcelWriter(openpyxl engine) with auto-fit columns
  FileResponse(path=filepath, filename="rank_results_{domain}_{date}.{fmt}")
```

---

## 4. Data Models, State & Integrations

### Database Schema

```
┌────────────────────────────────────────────────────────┐
│                        jobs                            │
├─────────────────────────┬──────────────────────────────┤
│ id                      │ VARCHAR(UUID) PK             │  str(uuid.uuid4())
│ status                  │ VARCHAR (JobStatus)          │  queued|processing|completed|failed
│ company_name            │ VARCHAR NOT NULL             │
│ domain                  │ VARCHAR NOT NULL             │  normalized (bare hostname)
│ provider                │ VARCHAR DEFAULT "free"       │  free | mock | serpapi
│ country                 │ VARCHAR NOT NULL             │  human-readable ("United States")
│ language                │ VARCHAR NOT NULL             │  human-readable ("English")
│ device                  │ VARCHAR NOT NULL             │  "desktop" | "mobile"
│ depth                   │ INTEGER DEFAULT 100          │  100 | 200 | 500
│ visibility_score        │ FLOAT DEFAULT 0.0            │  CTR-weighted SoV (0–100%)
│ top_competitors_summary │ JSON NULLABLE                │  Top 5 Page 1 competing domains
│ created_at              │ DATETIME DEFAULT now()       │
└─────────────────────────┴──────────────────────────────┘
          │ 1:N (cascade delete-orphan)
          ▼
┌────────────────────────────────────────────────────────┐
│                   keyword_tasks                        │
├─────────────────────────┬──────────────────────────────┤
│ id                      │ INTEGER PK autoincrement     │
│ job_id                  │ VARCHAR FK → jobs.id         │  indexed
│ keyword                 │ VARCHAR NOT NULL             │  indexed
│ country                 │ VARCHAR NOT NULL             │  per-row override or job default
│ language                │ VARCHAR NOT NULL             │  per-row override or job default
│ device                  │ VARCHAR NOT NULL             │  per-row override or job default
│ rank                    │ INTEGER NULLABLE             │  NULL until processed
│ previous_rank           │ INTEGER NULLABLE             │  correlated from historical scans
│ rank_delta              │ INTEGER NULLABLE             │  position change (+5, -2, NULL for NEW)
│ ranking_url             │ VARCHAR NULLABLE             │  primary ranking URL
│ page_title              │ VARCHAR NULLABLE             │  page title tag
│ matching_urls_count     │ INTEGER DEFAULT 0            │  distinct ranking URLs from domain
│ secondary_ranking_url   │ VARCHAR NULLABLE             │  conflicting secondary URL
│ secondary_rank          │ INTEGER NULLABLE             │  secondary URL rank position
│ cannibalization         │ BOOLEAN DEFAULT FALSE        │  TRUE if matching_urls_count >= 2
│ top_competitors_json    │ JSON NULLABLE                │  Top 5 SERP competitors snapshot
│ status                  │ VARCHAR (KeywordStatus)      │  pending|found|not_found|api_error...
└─────────────────────────┴──────────────────────────────┘
```

**Auto-Migration & Database Resilience:**
- `ensure_schema_columns(engine)`: Executes dynamic non-destructive `ALTER TABLE ADD COLUMN` queries inspecting `PRAGMA table_info` on startup.
- `reconcile_orphan_jobs()`: On application boot, reconciles any orphaned jobs stuck in `queued` or `processing` states from server interruptions and marks them `failed`.

---

### External Integrations & APIs

| Integration | Type | Location | Notes |
|---|---|---|---|
| **FreeSerpProvider** | Live SERP (Zero Key) | `providers/free_serp_provider.py` | 100% Zero-cost live search via DuckDuckGo Lite HTML parsing and public/private SearXNG instances with User-Agent rotation. |
| **MockProvider** | In-process simulation | `providers/mock_provider.py` | Deterministic SHA-256 dynamic domain simulation (`hash(keyword + target_domain)`), realistic competitor pools (`wikipedia.org`, `reddit.com`, `github.com`), and multi-URL cannibalization modeling. |
| **SerpApiProvider** | REST API (Official) | `providers/serpapi_provider.py` | Official Google Search API with automated offset pagination (`start = page * 100`) supporting deep scans up to 500 ranks. |

---

### Configuration & Secrets

**File:** `backend/.env` (and root `.env`, copied from `.env.example` on setup)

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///./rank_tracker.db` | No (has default) | SQLAlchemy connection string. Switch to `postgresql://user:pass@host/db` for production |
| `SERP_PROVIDER` | `free`, `mock`, or `serpapi` | No (defaults to `free`) | Selects default engine: `free` (100% $0 live search), `mock` (simulation), or `serpapi` (paid API) |
| `SEARXNG_URL` | `https://searx.be/search` | No | Optional public or private SearXNG instance for `FreeSerpProvider` |
| `SERP_API_KEY` | `0c5926c72...` | Only if `SERP_PROVIDER=serpapi` | SerpApi.com API key. Obtain from `serpapi.com/manage-api-key` |

**Load order:** `main.py` calls `load_dotenv()` as the **first** statement before any other import that calls `os.getenv()`. This is critical — moving it after imports breaks secret loading.

---

## 5. Local Setup, Build, Testing & Deployment

### Quick Start (Windows — single command)

```powershell
# From the keyword-rank-tracker directory
.\start.ps1
```

This script:
1. Kills anything on ports 8000 and 5173
2. Checks for `backend/venv`; exits with instructions if missing
3. Runs `npm install` if `node_modules` absent
4. Starts FastAPI in a new PowerShell window
5. Starts Vite dev server in a new PowerShell window
6. Opens `http://localhost:5173` in the default browser

### Manual Setup

**Backend (from `keyword-rank-tracker/backend/`):**
```powershell
python -m venv venv
.\venv\Scripts\activate            # Windows
# source venv/bin/activate         # macOS/Linux
pip install -r requirements.txt
copy ..\\.env.example .env         # Then edit .env
uvicorn main:app --reload --port 8000
```

**Frontend (from `keyword-rank-tracker/frontend/`):**
```powershell
npm install
npm run dev    # Vite dev server at http://localhost:5173
```

### Building for Production

**Frontend:**
```powershell
cd frontend
npm run build      # tsc -b && vite build → outputs to dist/
npm run preview    # Serve dist/ locally to verify
```

**Backend:** No separate build step. Run with Gunicorn + Uvicorn workers in production:
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Running Tests

**Backend (from `keyword-rank-tracker/backend/`):**
```powershell
.\venv\Scripts\activate
pytest tests/ -v
```

NexusRank includes **33 unit & integration tests** across 2 comprehensive test suites:

| Suite | Test Class | Coverage |
|---|---|---|
| `tests/test_domain_matching.py` (23 tests) | `TestNormalizeDomain` (9) | https/http/www/path stripping, query params, trailing slashes, subdomain preservation, bare domain, empty safety |
| | `TestMatchDomain` (8) | exact match, www match, subdomain match, deep subdomain, different domain, path-contains-name, suffix attacks, partial TLD |
| | `TestCalculateBestRank` (6) | found at rank 3, multiple appearances returns best rank, not found, empty results, rank is positive int, title returned |
| `tests/test_seo_analytics.py` (10 tests) | `TestVisibilityAndCTR` (4) | standard CTR curve calculation, perfect 100% score, empty/unranked scores, mixed rank distributions |
| | `TestCannibalizationAndIntelligence` (4) | single URL clean state, multiple URLs cannibalization trigger, top 5 competitor extraction, competitor aggregation |
| | `TestDynamicMockEngine` (1) | dynamic target domain simulation without hardcoding |
| | `TestDatabaseReconciliation` (1) | orphan crash reconciliation execution |

**Frontend Lint & Build:**
```powershell
cd frontend
npm run lint    # oxlint (Rust-based, zero warnings)
npm run build   # tsc -b && vite build (compiles cleanly)
```

### Containerization & CI/CD Pipelines

NexusRank includes institutional-grade containerization and automation:
- **`backend/Dockerfile`**: Python 3.13-slim image running FastAPI with Uvicorn.
- **`frontend/Dockerfile`**: Multi-stage Node 20 build outputting static assets to Nginx alpine reverse proxy.
- **`docker-compose.yml`**: 1-command orchestration (`docker compose up --build`) binding frontend to `:5173` and backend to `:8000`.
- **`.github/workflows/ci.yml`**: Automated GitHub Actions CI workflow running backend pytest (Python 3.11) and frontend `npm run lint` + `npm run build` (Node 20) on all pushes and pull requests.

---

## 6. Technical Debt, Architecture Decisions & "Gotchas"

### ✅ Resolved: Startup Crash Reconciliation (`reconcile_orphan_jobs()`)
Previously, background tasks that crashed mid-job left rows stranded in `status="processing"`. This is now resolved: on startup, `database.reconcile_orphan_jobs()` finds any orphaned `queued` or `processing` jobs and transitions them to `status="failed"`.

---

### ✅ Resolved: Paginated SerpApi Depth for > 100 Ranks
Previously, depth requests for 200 or 500 were silently capped at 100. This is now resolved: `SerpApiProvider.search()` loops with `start = page * 100` up to `depth`, aggregating results and offsetting rank indices accurately.

---

### ✅ Resolved: Dynamic Domain Simulation (Mock Engine)
The hardcoded `"hiree.com"` mock was eliminated. `MockProvider` now accepts `target_domain` and uses deterministic SHA-256 seeding (`hash(keyword + target_domain)`), ensuring realistic rank movements, simulated competitor domains (`wikipedia.org`, `reddit.com`), and multi-URL cannibalization scenarios for any domain.

---

### ✅ Resolved: Dynamic Schema Auto-Migration (`ensure_schema_columns()`)
SQLite schema drift is handled automatically without manual database deletion. On startup, `ensure_schema_columns()` inspects `PRAGMA table_info` and executes non-destructive `ALTER TABLE ADD COLUMN` for all new fields (`provider`, `visibility_score`, `top_competitors_summary`, `rank_delta`, `secondary_ranking_url`, `top_competitors_json`).

---

### ✅ Resolved: Single Source of Truth for Locales (`GET /api/config`)
The frontend no longer hardcodes country and language maps. `GET /api/config` serves supported countries, languages, and provider status dynamically from the backend provider dictionaries.

---

### ✅ Resolved: Visibility-Aware Client Polling
Polling in `App.tsx` now listens to `document.visibilitychange`. If the browser tab is hidden or minimized, polling halts to conserve network and CPU cycles, resuming immediately once the tab refocuses.

---

### 🟡 Open Architecture Considerations for Future Scaling

1. **Distributed Worker Queues (Celery / Redis / Temporal):**
   `process_job()` runs in FastAPI's background threadpool. For large enterprise deployments with hundreds of concurrent users scanning 10,000+ keywords, offloading to external Celery or Temporal workers with Redis/RabbitMQ is recommended.
2. **API Authentication & Rate Limiting:**
   The current open-source self-hosted release does not enforce bearer token auth. If deployed publicly on the open web, add API key authentication or OAuth2 reverse proxy authentication to prevent unauthorized API credit consumption.
3. **Automated Scheduled Scans:**
   Automated daily or weekly rank check scheduling via APScheduler or cron is on the roadmap.

```typescript
// App.tsx lines 321-325
const eta = (() => {
  if (!isRunning || progress.completed === 0) return null;
  const elapsed = (Date.now() - startTimeRef.current) / 1000;
  return (progress.total - progress.completed) * (elapsed / progress.completed);
})();
```
This assumes uniform per-keyword processing time. In reality, mock provider latency is random (0.4–1.2s) and real SerpApi latency varies. The ETA will be inaccurate but functional.

---

### Key Conventions

| Convention | Detail |
|---|---|
| `db.commit()` after every keyword | Intentional — allows live progress polling to reflect real-time results without buffering |
| `db.rollback()` before status update in exception handler | Critical pattern — without rollback, the broken transaction prevents the status update commit |
| `utf-8-sig` BOM in CSV exports | Ensures Excel on Windows opens the file correctly without encoding issues |
| `no_cache: "true"` on SerpApi calls | Always fresh results, no SerpApi cache hits — important for accuracy but costs more API credits |
| Column headers lowercased on parse | `df.columns = [str(c).lower().strip() for c in df.columns]` — allows mixed-case CSV headers |

---

*Architecture guide generated by exhaustive source inspection on 2026-11-14. Update this document when adding new providers, routes, or columns.*
