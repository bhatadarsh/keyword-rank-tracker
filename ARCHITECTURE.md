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

    subgraph Frontend ["Frontend — React SPA (Vite :5173)"]
        UI_Form["ConfigForm\ncompany, domain, country,\nlanguage, device, depth, file"]
        UI_Results["ResultsPanel\nRank Tier Cards · Table · Filters"]
        UI_History["HistoryView\nPast scan list"]
        UI_Toast["ToastContainer"]
    end

    subgraph Backend ["Backend — FastAPI (Uvicorn :8000)"]
        MW_CORS["CORSMiddleware\nallow: localhost:5173"]
        Router["api/routes.py\nAPIRouter prefix=/api/rank-check"]
        EP_POST["POST / — create_job()"]
        EP_GET["GET /{job_id} — get_job_status()"]
        EP_LIST["GET / — list_jobs()"]
        EP_DL["GET /{job_id}/download/{fmt}"]
    end

    subgraph Services ["Services Layer"]
        JP["services/job_processor.py\nprocess_job()"]
        RT["services/rank_tracker.py\nnormalize_domain()\nmatch_domain()\ncalculate_best_rank()"]
        EX["exports/generator.py\ngenerate_csv()\ngenerate_excel()"]
    end

    subgraph Providers ["Provider Abstraction"]
        PF["providers/__init__.py\nget_provider() factory\nreads SERP_PROVIDER env"]
        MOCK["providers/mock_provider.py\nMockProvider\n80% found rate, simulated latency"]
        SERP["providers/serpapi_provider.py\nSerpApiProvider\nhttpx GET serpapi.com/search"]
    end

    subgraph DB ["Data Layer — SQLAlchemy"]
        DBEngine["database.py\nSessionLocal · engine · Base"]
        Jobs["jobs table"]
        Tasks["keyword_tasks table"]
    end

    ExtAPI["🌐 serpapi.com\nProxied Google Search API"]

    User -->|"fill form + upload CSV"| UI_Form
    UI_Form -->|"POST multipart/form-data"| EP_POST
    UI_Results -->|"GET poll every 2s"| EP_GET
    UI_History -->|"GET"| EP_LIST
    UI_Results -->|"window.location.href"| EP_DL

    EP_POST --> MW_CORS
    MW_CORS --> Router
    Router --> EP_POST
    Router --> EP_GET
    Router --> EP_LIST
    Router --> EP_DL

    EP_POST -->|"db.add Job + KeywordTasks"| DBEngine
    EP_POST -->|"FastAPI BackgroundTasks"| JP
    EP_GET -->|"db.query"| DBEngine
    EP_LIST -->|"db.query"| DBEngine
    EP_DL --> EX

    JP -->|"db.query pending tasks"| DBEngine
    JP --> PF
    JP --> RT
    JP -->|"db.commit results"| DBEngine

    PF -->|"SERP_PROVIDER=mock"| MOCK
    PF -->|"SERP_PROVIDER=serpapi"| SERP

    SERP -->|"httpx.get + SERP_API_KEY"| ExtAPI
    ExtAPI -->|"organic_results[]"| SERP

    DBEngine --- Jobs
    DBEngine --- Tasks
    Jobs -->|"1:N"| Tasks
```

---

## 2. Directory & Codebase Map

```
keyword-rank-tracker/
│
├── .env.example                  # Template env vars (safe to commit)
├── .gitignore                    # Excludes venv, .env, *.db, exports/files/, node_modules
├── .gitattributes
├── start.ps1                     # ⭐ Windows dev launcher (kills ports, starts both servers)
├── sample_keywords.csv           # Example CSV with keyword/country/language/device columns
├── test_github.csv               # 10 keywords for github.com (integration test data)
├── test_wikipedia.csv            # 10 keywords for wikipedia.org (gold-standard verification)
├── README.md                     # Full system design doc with Mermaid diagrams
├── CHANGELOG.md                  # Chronological development log
│
├── backend/
│   ├── main.py                   # ⭐ FastAPI app entrypoint — creates tables, registers CORS + router
│   ├── database.py               # SQLAlchemy engine factory; get_db() session dependency
│   ├── models.py                 # Job + KeywordTask ORM models; JobStatus + KeywordStatus enums
│   ├── requirements.txt          # Pinned Python dependencies
│   ├── .env                      # Actual secrets (gitignored); SERP_PROVIDER, SERP_API_KEY, DATABASE_URL
│   ├── rank_tracker.db           # SQLite file (auto-created; gitignored in production)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py             # ⭐ All 4 REST endpoints: POST, GET status, GET list, GET download
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── job_processor.py      # ⭐ Background task: loops tasks, calls provider, writes results
│   │   └── rank_tracker.py       # Domain normalization + matching + best-rank extraction
│   │
│   ├── providers/
│   │   ├── __init__.py           # get_provider() factory (reads SERP_PROVIDER env var)
│   │   ├── base.py               # Abstract SerpProvider + SearchResult/SearchResponse Pydantic models
│   │   ├── mock_provider.py      # Fake SERP — 80% found rate, simulated latency, error injection
│   │   └── serpapi_provider.py   # Real SerpApi integration: country/lang maps, httpx, error handling
│   │
│   ├── exports/
│   │   ├── __init__.py
│   │   ├── generator.py          # generate_csv() and generate_excel() via pandas + openpyxl
│   │   └── files/                # Generated export files (gitignored); named results_{job_id}.{fmt}
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_domain_matching.py  # 18 pytest tests: TestNormalizeDomain, TestMatchDomain, TestCalculateBestRank
│   │
│   └── venv/                     # Python virtual environment (gitignored)
│
└── frontend/
    ├── index.html                # Vite SPA shell — mounts <div id="root">
    ├── vite.config.ts            # Vite config: React + Tailwind plugins; /api proxy → :8000
    ├── package.json              # NPM manifest with all dependencies
    ├── tsconfig.json             # TypeScript project references config
    ├── tsconfig.app.json         # App target TS config (strict mode)
    ├── tsconfig.node.json        # Node tools TS config
    ├── .oxlintrc.json            # Oxlint (Rust linter) config
    │
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    │
    └── src/
        ├── main.tsx              # React entry: ReactDOM.createRoot → <App /> in StrictMode
        ├── App.tsx               # ⭐ Entire frontend: 998 lines, all components in one file
        ├── App.css               # (minimal; most styling is Tailwind utility classes)
        ├── index.css             # @import "tailwindcss" + Outfit font + custom scrollbar
        └── assets/
            ├── hero.png
            ├── react.svg
            └── vite.svg
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
┌──────────────────────────────────────────┐
│                  jobs                    │
├────────────────┬─────────────────────────┤
│ id             │ VARCHAR(UUID) PK        │  str(uuid.uuid4())
│ status         │ VARCHAR (JobStatus)     │  queued|processing|completed|failed
│ company_name   │ VARCHAR NOT NULL        │
│ domain         │ VARCHAR NOT NULL        │  normalized (bare hostname)
│ country        │ VARCHAR NOT NULL        │  human-readable ("India")
│ language       │ VARCHAR NOT NULL        │  human-readable ("English")
│ device         │ VARCHAR NOT NULL        │  "desktop" | "mobile"
│ depth          │ INTEGER DEFAULT 100     │  100 | 200 | 500
│ created_at     │ DATETIME DEFAULT now()  │
└────────────────┴─────────────────────────┘
         │ 1:N (cascade delete-orphan)
         ▼
┌──────────────────────────────────────────┐
│             keyword_tasks                │
├────────────────┬─────────────────────────┤
│ id             │ INTEGER PK autoincrement │
│ job_id         │ VARCHAR FK → jobs.id    │  indexed
│ keyword        │ VARCHAR NOT NULL        │  indexed
│ country        │ VARCHAR NOT NULL        │  per-row override or job default
│ language       │ VARCHAR NOT NULL        │  per-row override or job default
│ device         │ VARCHAR NOT NULL        │  per-row override or job default
│ rank           │ INTEGER NULLABLE        │  NULL until processed
│ ranking_url    │ VARCHAR NULLABLE        │  NULL until processed
│ page_title     │ VARCHAR NULLABLE        │  NULL until processed
│ status         │ VARCHAR (KeywordStatus) │  pending|found|not_found|api_error|rate_limited|timeout|invalid
└────────────────┴─────────────────────────┘
```

**Keyword Status Lifecycle:**
```
pending → found         (domain found in SERP results)
        → not_found     (domain absent from top N results)
        → api_error     (SerpApi returned error or HTTP non-429 error)
        → rate_limited  (HTTP 429, exhausted retries)
        → timeout       (httpx timeout, exhausted retries)
```

**ORM relationships:**
- `Job.tasks` → `relationship("KeywordTask", back_populates="job", cascade="all, delete-orphan")`
- `KeywordTask.job` → `relationship("Job", back_populates="tasks")`

---

### External Integrations & APIs

| Integration | Type | Location | Notes |
|---|---|---|---|
| **SerpApi** (`serpapi.com`) | REST API (GET) | `providers/serpapi_provider.py` | Proxied Google Search; `no_cache=true` always; max 100 results per call; docs: `serpapi.com/search-api` |
| **Mock Provider** | In-process simulation | `providers/mock_provider.py` | 80% found rate, 4% error rate, 1% rate-limit rate; hardcoded `TARGET_DOMAIN = "hiree.com"` |

**SerpApi request parameters built in `SerpApiProvider.search()`:**

| Param | Value | Notes |
|---|---|---|
| `q` | keyword | raw search query |
| `engine` | `"google"` | hardcoded |
| `api_key` | `SERP_API_KEY` | from env |
| `num` | `min(depth, 100)` | SerpApi cap is 100 per page |
| `gl` | `COUNTRY_MAP[country.lower()]` | 50+ countries mapped; falls back to `"us"` with warning |
| `hl` | `LANGUAGE_MAP[language.lower()]` | 24 languages mapped; falls back to `"en"` |
| `device` | `"desktop"` or `"mobile"` | |
| `no_cache` | `"true"` | always fetch fresh |

> [!IMPORTANT]
> `depth` values of 200 or 500 are accepted by the form but SerpApi's `num` parameter is capped at 100. The current code uses `min(depth, 100)`. Depths > 100 would require pagination via SerpApi's `start` parameter — this is **not implemented**.

---

### Configuration & Secrets

**File:** `backend/.env` (copied from `.env.example` on setup)

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///./rank_tracker.db` | No (has default) | SQLAlchemy connection string. Switch to `postgresql://user:pass@host/db` for production |
| `SERP_PROVIDER` | `mock` or `serpapi` | No (defaults to `mock`) | Selects provider. `mock` = no API key needed; `serpapi` = real Google data |
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

Currently 1 test file: `tests/test_domain_matching.py` with **18 tests** across 3 classes:

| Class | Coverage |
|---|---|
| `TestNormalizeDomain` | 9 tests: https stripping, http stripping, www stripping, path stripping, query param stripping, trailing slash, subdomain preservation, bare domain, empty string safety |
| `TestMatchDomain` | 6 tests: exact match, www match, subdomain match, deep subdomain, different domain, path-contains-name (no match), suffix attack prevention, partial TLD |
| `TestCalculateBestRank` | 6 tests: found at rank 3, multiple appearances returns best rank, not found returns None, empty results, rank is positive int, title is returned |

**Frontend lint:**
```powershell
cd frontend
npm run lint    # oxlint (Rust-based, very fast)
```

### Containerization / CI/CD

> [!WARNING]
> There is **no Dockerfile, docker-compose.yml, Kubernetes manifests, or CI/CD pipeline** in this repository. No `.github/workflows/` directory exists. The project is purely local-dev at this stage.

The README explicitly notes planned next steps:
- GitHub Actions to run pytest on every push
- PostgreSQL + Alembic migrations
- Redis + Celery worker queue

---

## 6. Technical Debt, Edge Cases & "Gotchas"

### 🔴 Critical: BackgroundTasks are In-Process and Non-Persistent

`process_job()` runs in FastAPI's threadpool via `BackgroundTasks`. If the Uvicorn process restarts mid-job:
- The job row will remain in `status="processing"` forever — it **never transitions to "failed"**
- There is no startup reconciliation (no code at startup that finds and fails "processing" jobs)
- **Impact:** Stale "processing" jobs accumulate in the History view after crashes

**Mitigation today:** Restart the server manually and re-submit the job  
**Fix:** Startup hook that sets `status="failed"` for all jobs stuck in `processing`

---

### 🔴 Critical: depth > 100 is Silently Truncated

The UI offers "Top 200" and "Top 500" options. The form validation allows `depth ∈ {100, 200, 500}`. But in `SerpApiProvider.search()`:
```python
"num": min(depth, 100),  # SerpApi max per-page is 100
```
Selecting "Top 500" actually only checks 100 results with **no error or warning to the user**. SerpApi pagination (`start` offset) is not implemented.

---

### 🟠 High: Hardcoded `TARGET_DOMAIN` in MockProvider

```python
# providers/mock_provider.py line 38
TARGET_DOMAIN = "hiree.com"  # Domain that will be "found" in mock results
```

In mock mode, **only** `hiree.com` appears in fake SERP results. If you submit a job for `github.com` with `SERP_PROVIDER=mock`, it will always return `not_found`. This can confuse new developers expecting mock mode to simulate any domain.

---

### 🟠 High: No Schema Migration Tool

SQLAlchemy's `Base.metadata.create_all()` creates tables on startup but **does not alter existing tables**. If you add a column to a model (like `page_title` was added in Session 2), you must:
1. Delete `rank_tracker.db` (losing all history), or
2. Run a manual `ALTER TABLE` SQL, or
3. Add Alembic (recommended future fix)

The CHANGELOG explicitly notes this happened once: `"Deleted stale SQLite database that was missing the new page_title column."`

---

### 🟠 High: Single DB Session per Background Task (Thread Safety)

`process_job()` opens its own `SessionLocal()` (line 24) instead of using the dependency-injected session from the request. This is **correct** for background tasks (request sessions close at response time), but it means:
- The background task's session is entirely separate from any concurrent API requests
- If the DB connection drops mid-job, the whole task crashes (caught by the outer `except Exception`)
- With SQLite: `check_same_thread=False` is set in `database.py` to allow this multi-thread usage

---

### 🟡 Medium: Polling is Client-Side Only (No WebSockets / SSE)

The frontend polls `GET /api/rank-check/{jobId}` every **2 seconds** regardless of job size:
```typescript
// App.tsx line 769
intervalRef.current = setInterval(poll, 2000);
```
- For large batches (100+ keywords), each poll returns the **entire results array** growing with each commit
- No Server-Sent Events or WebSocket — purely HTTP polling
- Poll does not stop if the tab loses focus

---

### 🟡 Medium: `react-router-dom` is Installed but Not Used

`package.json` lists `react-router-dom ^7.18.3`, but `App.tsx` and `main.tsx` have no `<BrowserRouter>` or `useNavigate`. The entire UI is a **single-component state machine** using `activeView: 'new-scan' | 'history'` toggle. The router is dead weight for now.

---

### 🟡 Medium: Export Files Accumulate Indefinitely

Download endpoints write files to `exports/files/results_{job_id}.{fmt}`. There is **no cleanup mechanism** — these files grow forever. For 1000 jobs × 2 formats = 2000 files. Needs a TTL-based cleanup job or S3 pre-signed URLs for production.

---

### 🟡 Medium: No Authentication

The API is fully open. Any client on the network can:
- Submit jobs (potential SerpApi credit drain)
- Read any job's results by guessing/brute-forcing UUIDs
- Download reports from any job

---

### 🟡 Medium: Country/Language Hardcoded in Two Places

The `COUNTRIES` and `LANGUAGES` dropdown lists in `App.tsx` (lines 37–43) must be manually kept in sync with `COUNTRY_MAP` and `LANGUAGE_MAP` in `serpapi_provider.py`. There is no single source of truth — if you add a country to the provider map, the UI won't show it unless you also update the React constants.

---

### 🟢 Low: Keyword Dedup is In-Memory Only

Deduplication uses a Python `set` during job creation. It correctly prevents duplicate `(keyword, country, language, device)` tuples within a **single upload**. However, there's no cross-job dedup — the same keyword can appear in multiple historical jobs (by design).

---

### 🟢 Low: ETA Calculation is Approximate

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
