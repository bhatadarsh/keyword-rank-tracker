<div align="center">

# ⚡ NexusRank

### Institutional-Grade, 100% Free & Open-Source SEO & SERP Intelligence Platform
**Automated Rank Tracking · Competitor Share-of-Voice · Cannibalization Audits · SERP X-Ray**

<p align="center">
  <a href="#-how-to-run-this-project">How to Run</a> •
  <a href="#-system-architecture--data-flow">Architecture</a> •
  <a href="#-core-capabilities--zero-cost-intelligence-engine">Features</a> •
  <a href="#-configuration-csv-format--api-reference">Configuration</a> •
  <a href="#-rest-api-reference">API Docs</a> •
  <a href="#-testing--verification">Tests</a> •
  <a href="#-troubleshooting--frequently-asked-questions">Troubleshooting</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript 6.0](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![CI Tests](https://img.shields.io/badge/Pytest-33%20Passed-10B981?style=flat-square&logo=pytest&logoColor=white)](https://docs.pytest.org)
[![Linter](https://img.shields.io/badge/Oxlint-0%20Warnings-10B981?style=flat-square)](https://oxc.rs)

<br/>

<!-- Dashboard Preview Callout Block -->
<table align="center" width="100%">
  <tr>
    <td align="center">
      <img src="docs/assets/dashboard-preview.png" alt="NexusRank Enterprise Analytics Dashboard" width="100%" onerror="this.src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'; this.alt='NexusRank Analytics Preview';" />
      <br/>
      <em>Figure 1: NexusRank Command Center — Organic Share-of-Voice (SoV) Gauge, Rank Tier Distribution, and Live SERP Data Grid.</em>
    </td>
  </tr>
</table>

</div>

---

## 💡 Why NexusRank? (Open-Source vs. Paid Commercial SaaS)

Traditional rank tracking SaaS platforms (Semrush, Ahrefs, Moz) charge hefty monthly subscriptions with artificial keyword caps, while basic open-source scripts either require paid third-party API keys or crash when Google changes their layout.

**NexusRank** is engineered as a **self-hostable, zero-marginal-cost SEO intelligence engine**:

| Capability | NexusRank (Self-Hosted Open-Source) | Commercial SaaS ($99–$299/mo) | Basic Scraper Scripts |
|---|:---:|:---:|:---:|
| **Monthly Software Cost** | **$0.00 / Free Forever** | $1,188 – $3,588 / yr | Free (Broken frequently) |
| **Keyword Tracking Limits** | **Unlimited** (Hardware Bound) | 500 – 1,500 Keyword Caps | Manual Loop / Fragile |
| **Zero-Key Live Search** | **Yes** (DuckDuckGo Lite & SearXNG) | No (Paid Cloud Only) | Blocked by CAPTCHA |
| **Deterministic Simulation** | **Yes** (SHA-256 Seeded Engine) | No | No |
| **Keyword Cannibalization Audits** | **Automated** (Multi-URL Conflict) | Expensive Enterprise Tier | None |
| **Organic Visibility Index (SoV %)** | **Built-in** (Weighted CTR Curve) | High-Tier Addon | None |
| **Top 5 SERP X-Ray & AI Action Brief** | **Built-in** (Prompt Generator) | Manual Analysis | None |
| **Historical Rank Delta Tracking** | **Automated** (`▲+5`, `▼-2`, `NEW`) | Standard | None |
| **Data Privacy & Ownership** | **100% On-Premises** (Local SQLite/PG) | Stored on Vendor Servers | Local Text Files |
| **Export Capabilities** | **UTF-8 BOM CSV & Auto-Fit Excel** | CSV / GSheets Export | Raw CSV |

---

## 🎯 Core Capabilities & Zero-Cost Intelligence Engine

### 1. Multi-Engine SERP Abstraction (`backend/providers/`)
Switch providers on the fly per scan or configure globally via `.env`:
- **Free Live Search (`free`):** 100% Zero-cost live search querying DuckDuckGo Lite and SearXNG with User-Agent rotation, redirect link unquoting, and transparent fallback so scans never fail.
- **Smart Simulation (`mock`):** High-fidelity deterministic simulator using SHA-256 seeding (`hash(keyword + domain + locale)`). Produces reproducible baseline positions, realistic search competition (`wikipedia.org`, `reddit.com`, `github.com`), and multi-URL cannibalization scenarios for offline testing.
- **SerpApi Integration (`serpapi`):** Official Google SERP API integration upgraded with **automated multi-page pagination** (`start = page * 100`) for depths of **200** and **500** results.

### 2. Zero-Extra-Cost SERP Analytics (`backend/services/rank_tracker.py`)
Extract institutional-grade insights from every search response without extra API overhead:
- **Organic Visibility Index & Share-of-Voice (SoV):** Calculates a 0–100% domain score weighted by an organic search CTR curve:
  $$\text{Rank 1: } 30\,\text{pts} \quad \text{Rank 2: } 18\,\text{pts} \quad \text{Rank 3: } 12\,\text{pts} \quad \text{Ranks 4–10: } 8\text{ to }2\,\text{pts} \quad \text{Ranks 11–30: } 1\,\text{pt}$$
- **Automated Keyword Cannibalization Detection:** Detects when 2 or more distinct pages from your domain rank for the same query. Stores `matching_urls_count`, `secondary_ranking_url`, and `secondary_rank` to eliminate keyword self-competition.
- **Top 5 Competitor Discovery:** Extracts root domains from all Page 1 results and aggregates them into the **Top 5 Competing Domains** capturing search volume across your keyword batch.
- **SERP X-Ray Snapshots:** Captures the #1–#5 competitor URLs, page titles, and ranks for every keyword, pairing them with an **instant AI SEO Action Brief** generator.

### 3. High-ROI "Opportunities" Vault
Keywords ranking in positions **11–30** (Pages 2 & 3) represent the highest-ROI optimization targets. NexusRank isolates these near-miss keywords into a dedicated **Opportunities Vault** with live telemetry counters so SEO associates know exactly where to prioritize on-page tweaks and internal linking.

### 4. Human-Crafted SaaS Visual System & Interactive Guide (`frontend/src/`)
- **`Inter` & `JetBrains Mono` Typography:** Crisp, human-crafted `Inter` UI typography with OpenType features (`cv02`, `cv03`, `cv04`, `cv11`). Strict `JetBrains Mono` (`tabular-nums`) styling reserved for numerical rankings, historical deltas, and URLs.
- **True Neutral Zinc Palette:** Clean Light Mode (`#FAFAFA` page background, `#FFFFFF` cards, `#E4E4E7` borders) with a true-neutral Dark Mode toggle (`#09090B` Zinc-950 background, `#121215` cards, `#27272A` borders) and trustworthy Cobalt Blue (`#2563EB`) active accents. Zero neon glows or AI clutter.
- **Dismissible 3-Step Interactive Welcome Guide:** Inline home screen checklist (`WelcomeGuideBanner.tsx`) that walks users through running a sample demo, filtering opportunities (11–30), and inspecting SERP X-Ray drawers, backed by persistent `localStorage` progress tracking.
- **Built-In Help & Documentation Center:** Dedicated in-app documentation view (`HelpView.tsx`) featuring real-time search, plain-English glossary cards, search engines comparison table, and a 1-click sample CSV download.
- **Contextual Metric Tooltips:** Accessible `<InfoTooltip />` popover triggers providing 1–2 sentence definitions directly beside core metrics.
- **Command Palette (`Cmd+K` / `Ctrl+K`):** Global modal to jump between historical scans, filter opportunities, open documentation, trigger exports, and toggle themes.
- **Client-Side CSV Previews:** Drag-and-drop file uploader that parses CSV headers and counts keywords in the browser before transmission.
- **1-Click Instant Demos:** Pre-populated presets for `GitHub.com` (software queries) and `Wikipedia.org` (encyclopedic head terms) that create in-memory CSV files for zero-setup evaluation.
- **Visibility-Aware Polling:** Live 2-second background task polling pauses automatically when the browser tab is hidden (`document.hidden`) and resumes immediately upon refocus.

### 5. Production Reliability & Crash Recovery
- **Self-Healing Startup Migration:** `ensure_schema_columns()` dynamically inspects `PRAGMA table_info()` and adds missing columns automatically. Existing databases never crash across version upgrades.
- **Startup Crash Reconciliation:** `reconcile_orphan_jobs()` finds jobs left in `queued` or `processing` states after a server shutdown and marks them `failed`.
- **Per-Keyword Database Commits:** Commits progress after every keyword query so the frontend updates in real-time and no work is lost if a scan is interrupted.

---

## 🏛️ System Architecture & Data Flow

### System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer · React 19 SPA (Vite :5173)"]
        UI_Launch["ScanLaunchpad.tsx\n• Client-side CSV Preview\n• 1-Click Demo Presets\n• Engine Selector"]
        UI_Onboarding["WelcomeGuideBanner.tsx\n• 3-Step Interactive Walkthrough\n• localStorage Progress Tracking"]
        UI_Bento["BentoAnalyticsHeader.tsx\n• Organic Visibility Gauge\n• 5-Tier Distribution Bar\n• InfoTooltip Metric Popovers"]
        UI_Grid["ResultsDataGrid.tsx\n• Smart Filters (11-30 Opps)\n• SERP X-Ray Drawer\n• AI Action Brief Prompt"]
        UI_Help["HelpView.tsx\n• Built-In SEO Glossary\n• Search Engine Comparison\n• Sample CSV Downloader"]
        UI_Palette["CommandPalette.tsx\n• Cmd+K / Ctrl+K Modal\n• History, Doc & Theme Controls"]
    end

    subgraph APILayer ["API Gateway Layer · FastAPI (Uvicorn :8000)"]
        MW_CORS["CORSMiddleware\nAllow: localhost:5173"]
        Router_Config["GET /api/config\nSingle Source of Truth"]
        Router_Jobs["POST /api/rank-check\nGET /api/rank-check\nGET /api/rank-check/{id}\nDELETE /api/rank-check/{id}"]
        Router_Export["GET /api/rank-check/{id}/download/{fmt}\nCSV (UTF-8 BOM) & Excel .xlsx"]
    end

    subgraph WorkerLayer ["Async Execution & Intelligence Engine"]
        Worker["services/job_processor.py\nprocess_job() Worker Thread"]
        IntelEngine["services/rank_tracker.py\n• CTR Visibility Score (SoV %)\n• Cannibalization Detector (2+ URLs)\n• Page 1 Competitor Aggregation\n• Historical Delta Correlation"]
    end

    subgraph ProviderLayer ["Multi-Engine Provider Abstraction"]
        Factory["providers/__init__.py\nget_provider(name)"]
        FreeProv["providers/free_serp_provider.py\nDuckDuckGo Lite + SearXNG\n(100% Free Live Search)"]
        MockProv["providers/mock_provider.py\nDeterministic SHA-256 Engine\n(Offline Simulation)"]
        SerpProv["providers/serpapi_provider.py\nSerpApi + Offset Pagination\n(Depth 100 - 500)"]
    end

    subgraph StorageLayer ["Persistence & File Cache"]
        DBEngine["database.py\n• ensure_schema_columns()\n• reconcile_orphan_jobs()"]
        DB[(SQLite / PostgreSQL\nJobs & KeywordTasks)]
        Exports["exports/files/\nresults_{job_id}.{csv,xlsx}"]
    end

    UI_Launch -->|"POST /api/rank-check (multipart)"| Router_Jobs
    UI_Bento & UI_Grid -->|"GET /api/rank-check/{id} (poll 2s)"| Router_Jobs
    UI_Palette -->|"GET /api/rank-check"| Router_Jobs
    UI_Grid -->|"GET download"| Router_Export

    Router_Config --> FreeProv & SerpProv
    Router_Jobs --> Worker
    Router_Jobs --> DBEngine
    Router_Export --> Exports

    Worker --> Factory
    Factory --> FreeProv & MockProv & SerpProv
    Worker --> IntelEngine
    Worker -->|"Commit Per Keyword"| DBEngine
    DBEngine --- DB
```

---

### End-to-End Scan & Intelligence Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as User / SEO Associate
    participant UI as React 19 Frontend
    participant API as FastAPI Gateway
    participant Worker as Background Worker
    participant Provider as SERP Engine (Free/Mock/SerpApi)
    participant Intel as Intelligence Engine
    participant DB as SQLite / PostgreSQL

    User->>UI: Selects Engine, Uploads CSV / Triggers 1-Click Demo
    UI->>UI: Instant in-browser CSV parsing & keyword count validation
    UI->>API: POST /api/rank-check (FormData)
    API->>API: Normalize domain, validate parameters, deduplicate keywords
    API->>DB: Insert Job (status="queued") & KeywordTasks (status="pending")
    API->>Worker: Launch process_job(job_id) in thread pool
    API-->>UI: Return {job_id, status: "queued", provider: "free"}

    loop Polling Loop (Every 2s, pauses if tab hidden)
        UI->>API: GET /api/rank-check/{job_id}
        API->>DB: Query job & tasks progress
        API-->>UI: Return progress %, visibility score, and live results
        UI->>UI: Update Bento analytics, SoV gauge & data table
    end

    loop For each KeywordTask
        Worker->>DB: Check historical scan for domain + keyword
        DB-->>Worker: Return previous_rank (if exists)
        Worker->>Provider: search(keyword, country, lang, device, depth, domain)
        Provider-->>Worker: Return SearchResponse(results[])
        Worker->>Intel: analyze_serp_intelligence(domain, results)
        Intel-->>Worker: Return best_rank, cannibalization, top_5_competitors, delta
        Worker->>DB: Commit KeywordTask updates (rank, delta, secondary_url, json)
    end

    Worker->>Intel: calculate_visibility_score() & aggregate_top_competitors()
    Worker->>DB: Update Job (status="completed", visibility_score, competitors_summary)
    Worker-->>API: Processing Finished

    User->>UI: Clicks "Download Excel" or opens "SERP X-Ray Drawer"
    UI->>API: GET /api/rank-check/{job_id}/download/xlsx
    API->>DB: Query all tasks for job
    API->>API: Generate auto-fitted Excel spreadsheet with pandas & openpyxl
    API-->>User: Streams .xlsx file
```

---

## 🚀 How to Run This Project

NexusRank is designed for zero-friction onboarding. Whether you prefer a single-click script, a containerized Docker setup, or manual granular control, follow the method that matches your environment.

### 📋 Prerequisites Checklist

Before running locally without Docker, ensure you have:
- **Python 3.11, 3.12, or 3.13** installed (`python --version` or `python3 --version`)
- **Node.js 18, 20, or 22** + **npm** installed (`node --version` and `npm --version`)
- *(Optional)* **Docker & Docker Compose** (if using containerized execution)

---

### Method 1: Windows 1-Click Automated Launcher (Recommended for Windows)

NexusRank includes an intelligent PowerShell launcher (`start.ps1`) that handles the entire setup lifecycle automatically:

1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd "keyword-rank-tracker"
   ```
2. Run the launcher script:
   ```powershell
   .\start.ps1
   ```

**What the script does automatically:**
- Copies `.env.example` to `.env` (backend & root) if missing.
- Checks if ports `8000` or `5173` are occupied and cleanly terminates zombie processes.
- Creates `backend/venv` and installs all dependencies from `requirements.txt` if not present.
- Runs `npm install` inside `frontend/` if `node_modules` is missing.
- Spawns the FastAPI backend (`http://localhost:8000`) and Vite frontend (`http://localhost:5173`) in independent terminal consoles.
- Automatically launches your default web browser to [http://localhost:5173](http://localhost:5173).

> [!TIP]
> If Windows blocks script execution with an `ExecutionPolicy` error, run:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> .\start.ps1
> ```

---

### Method 2: macOS & Linux 1-Script Launcher (Recommended for Unix)

We provide a POSIX shell script (`start.sh`) with auto-environment configuration and graceful shutdown hooks:

1. Open your terminal and navigate to the project root:
   ```bash
   cd keyword-rank-tracker
   ```
2. Grant execution permissions and run:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

**What the script does automatically:**
- Validates that `python3` and `npm` are installed.
- Provisions `.env` from `.env.example`.
- Builds the `backend/venv` virtual environment and installs pinned dependencies.
- Runs `npm install` inside `frontend/` if dependencies aren't built.
- Starts both servers concurrently in the background.
- Captures `SIGINT` / `SIGTERM` — pressing `Ctrl+C` cleanly shuts down both background processes without leaving orphaned ports.

---

### Method 3: Docker & Docker Compose (Zero Local Dependencies)

Run the entire platform inside isolated, multi-stage production containers with zero host dependencies installed:

```bash
# Clone the repository
git clone https://github.com/your-username/keyword-rank-tracker.git
cd keyword-rank-tracker

# Build and start all services
docker compose up --build
```

- **Run in the background (detached daemon):**
  ```bash
  docker compose up -d
  ```
- **View live streaming container logs:**
  ```bash
  docker compose logs -f
  ```
- **Stop all services:**
  ```bash
  docker compose down
  ```

---

### Method 4: Manual Step-by-Step Local Setup

If you prefer to start each service in separate terminal windows:

#### Step 1: Backend Setup (FastAPI)

1. Open Terminal 1 and enter the backend directory:
   ```bash
   cd keyword-rank-tracker/backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Upgrade `pip` and install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Initialize the environment file:
   ```bash
   # Windows PowerShell:
   Copy-Item ../.env.example .env

   # macOS / Linux:
   cp ../.env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   *The backend will automatically create and migrate `rank_tracker.db` on startup.*

#### Step 2: Frontend Setup (React 19 + Vite)

1. Open Terminal 2 and enter the frontend directory:
   ```bash
   cd keyword-rank-tracker/frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 🌐 Service Verification & Health Checks

Once running, verify each endpoint:

| Interface | URL | Health Expectation |
|---|---|---|
| **Web Dashboard** | [http://localhost:5173](http://localhost:5173) | Obsidian Dark Theme interface loads with Scan Launchpad |
| **Backend Health** | [http://localhost:8000/health](http://localhost:8000/health) | Returns `{"status":"ok","platform":"NexusRank","version":"2.0.0"}` |
| **Config Endpoint** | [http://localhost:8000/api/config](http://localhost:8000/api/config) | Returns available providers (`free`, `mock`, `serpapi`) |
| **Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI Swagger UI to execute API calls |

---

### ⚡ Running Your First Scan in 30 Seconds

1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. In the **Scan Launchpad**, try one of the **1-Click Demo Presets**:
   - Click **`⚡ GitHub.com`** (loads developer search keywords: `git repository`, `code review tool`, `devops pipeline`, etc.)
   - Click **`📚 Wikipedia.org`** (loads general knowledge head terms: `artificial intelligence`, `quantum computing`, etc.)
3. Choose your SERP Engine:
   - **`Free Live Search`**: 100% zero-cost live web queries via DuckDuckGo Lite & SearXNG (no API keys required).
   - **`Domain Simulator`**: Fast deterministic mock engine with reproducible positions and simulated competitor pool.
4. Click **"Start Rank Scan"**.
5. Observe the live **Bento Analytics Header**, **Organic Visibility Index (SoV %)**, **Striking-Distance Opportunities (11–30)** tab, and click any row to open the **SERP X-Ray Drawer**!

---

## ⚙️ Configuration, CSV Format & API Reference

### Environment Variables

NexusRank is ready to run out of the box with zero required configuration. To customize your setup, edit `.env`:

| Variable | Default Value | Description |
|---|:---:|---|
| `DATABASE_URL` | `sqlite:///./rank_tracker.db` | SQLAlchemy connection URL. Switch to `postgresql://user:pass@host/db` for production. |
| `SERP_PROVIDER` | `free` | Default engine: `free` (100% zero-cost live search), `mock` (simulation), or `serpapi` (paid API). |
| `SEARXNG_URL` | *(empty)* | Optional public or self-hosted SearXNG endpoint used by `FreeSerpProvider`. |
| `SERP_API_KEY` | *(empty)* | API key from [serpapi.com](https://serpapi.com/manage-api-key) (only required if `SERP_PROVIDER=serpapi`). |

---

### Input CSV & Excel Format

NexusRank accepts `.csv`, `.xls`, and `.xlsx` files. Only the `keyword` column is required. You can optionally include per-row overrides for country, language, and device:

```csv
keyword,country,language,device
git repository,United States,English,desktop
code review tool,United States,English,desktop
skill assessment platform,India,English,mobile
career roadmap software,United Kingdom,English,desktop
online exam proctoring,Canada,English,desktop
```

- Missing columns default to the job parameters selected in the UI.
- Empty rows and duplicate keywords within the same scan are automatically deduplicated.

---

### REST API Reference

All routes are versioned and documented under `/docs` via Swagger UI:

| HTTP Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns available providers (`free`, `mock`, `serpapi`), supported countries, and languages. |
| `POST` | `/api/rank-check` | Accepts `multipart/form-data` with keyword file and parameters; queues async background scan. |
| `GET` | `/api/rank-check` | Returns the 50 most recent historical scans with visibility scores and completion stats. |
| `GET` | `/api/rank-check/{job_id}` | Returns real-time job status, progress percentage, cannibalization data, and results array. |
| `DELETE` | `/api/rank-check/{job_id}` | Permanently deletes a scan, all associated keyword tasks, and cached export files from disk. |
| `GET` | `/api/rank-check/{job_id}/download/{fmt}` | Generates and streams report in `csv` (UTF-8 BOM) or `xlsx` (auto-fitted Excel columns). |
| `GET` | `/health` | Health check endpoint returning platform status, version (`2.0.0`), and active engine mode. |

---

## 📁 Repository Map

```
keyword-rank-tracker/
├── .github/
│   └── workflows/
│       └── ci.yml                   # Automated GitHub Actions CI workflow
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py                # REST API endpoints, file uploads, delete & config handlers
│   ├── exports/
│   │   ├── __init__.py
│   │   ├── generator.py             # CSV (UTF-8 BOM) and Excel .xlsx spreadsheet generators
│   │   └── files/                   # Cached report artifacts (auto-cleaned on job delete)
│   ├── providers/
│   │   ├── __init__.py              # Provider factory (get_provider)
│   │   ├── base.py                  # Abstract SerpProvider & Pydantic models (SearchResult)
│   │   ├── free_serp_provider.py    # Zero-key live SERP provider (DuckDuckGo Lite + SearXNG)
│   │   ├── mock_provider.py         # Deterministic domain simulation with SHA-256 seeding
│   │   └── serpapi_provider.py      # SerpApi integration with depth > 100 offset pagination
│   ├── services/
│   │   ├── __init__.py
│   │   ├── job_processor.py         # Background worker thread & historical rank correlation
│   │   └── rank_tracker.py          # Domain normalization, CTR curve, cannibalization & competitor SoV
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_domain_matching.py  # 23 tests: normalization, subdomains, suffix attacks, best rank
│   │   └── test_seo_analytics.py    # 10 tests: CTR curves, cannibalization, competitors, recovery
│   ├── database.py                  # SQLAlchemy engine, ensure_schema_columns & crash reconciliation
│   ├── Dockerfile                   # Backend Docker container specification
│   ├── main.py                      # FastAPI entrypoint, lifespan startup tasks & CORS middleware
│   ├── models.py                    # SQLAlchemy ORM models: Job and KeywordTask
│   ├── rank_tracker.db              # SQLite development database (auto-migrating)
│   └── requirements.txt             # Pinned backend Python dependencies
├── docs/
│   └── assets/                      # Screenshot and diagram assets
├── frontend/
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Typed Axios client service
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── CommandPalette.tsx # Global Cmd+K / Ctrl+K search & shortcut modal
│   │   │   │   └── InfoTooltip.tsx    # Contextual popover tooltip component for metrics
│   │   │   ├── help/
│   │   │   │   └── HelpView.tsx       # Built-in Help & Glossary center with sample CSV download
│   │   │   ├── history/
│   │   │   │   └── HistoryView.tsx    # Searchable scan archive with status badges & deletion
│   │   │   ├── layout/
│   │   │   │   └── AppShell.tsx       # Clean 240px navigation, engine status, and theme toggle
│   │   │   ├── onboarding/
│   │   │   │   └── WelcomeGuideBanner.tsx # Dismissible 3-step interactive onboarding card
│   │   │   ├── results/
│   │   │   │   ├── BentoAnalyticsHeader.tsx # Organic Visibility SoV gauge & 5-tier cards
│   │   │   │   ├── CompetitorMatrixView.tsx # Page 1 Competitor domain cross-reference
│   │   │   │   └── ResultsDataGrid.tsx      # Table, smart filters, and SERP X-Ray drawer
│   │   │   └── scan/
│   │   │       └── ScanLaunchpad.tsx  # Centered form, drag & drop upload & 1-click demos
│   │   ├── hooks/
│   │   │   └── useOnboarding.ts       # Persistent localStorage interactive walkthrough state
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript definitions for jobs, tasks, views, and telemetry
│   │   ├── App.tsx                  # Root application orchestrator with visibility-aware polling
│   │   ├── index.css                # Inter & JetBrains Mono typography, true neutral Zinc tokens
│   │   └── main.tsx                 # React 19 application entrypoint
│   ├── Dockerfile                   # Frontend multi-stage build container
│   ├── nginx.conf                   # Nginx reverse proxy configuration for Docker
│   ├── package.json                 # Node dependencies and scripts
│   ├── tsconfig.json                # TypeScript compiler configuration
│   └── vite.config.ts               # Vite configuration with React & Tailwind plugins
├── .env                             # Local environment variables
├── .env.example                     # Environment template documentation
├── ARCHITECTURE.md                  # Comprehensive architectural reference manual
├── CHANGELOG.md                     # Chronological engineering updates log
├── docker-compose.yml               # Multi-container orchestration (Backend + Frontend)
├── sample_keywords.csv              # General sample keywords dataset
├── start.ps1                        # Windows 1-click dev launcher script
├── start.sh                         # macOS/Linux 1-script dev launcher
├── test_github.csv                  # Integration test keywords for GitHub.com
└── test_wikipedia.csv               # Integration test keywords for Wikipedia.org
```

---

## 🧪 Testing & Verification

NexusRank enforces strict testing across both backend and frontend layers:

```bash
# 1. Run backend unit & integration tests (33 tests)
cd backend
pytest tests/ -v

# 2. Run frontend linter (Oxlint)
cd frontend
npm run lint

# 3. Build frontend bundle (TypeScript + Vite)
npm run build
```

**Continuous Integration:** Every commit and pull request triggers `.github/workflows/ci.yml`, running the full pytest suite on Python 3.11 and validating `npm run lint` and `npm run build` on Node 20.

---

## 🛠️ Troubleshooting & Frequently Asked Questions

### Q: Port 8000 or 5173 is already in use
**Solution:**
- If you used `start.ps1`, it automatically kills stale processes on those ports.
- Alternatively, find and stop the process manually:
  - **Windows (PowerShell):**
    ```powershell
    Get-NetTCPConnection -LocalPort 8000, 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
    ```
  - **macOS / Linux:**
    ```bash
    kill -9 $(lsof -ti :8000) 2>/dev/null || true
    kill -9 $(lsof -ti :5173) 2>/dev/null || true
    ```

### Q: PowerShell blocks `start.ps1` with `ExecutionPolicy` error
**Solution:**
Windows restricts execution of unsigned scripts by default. Run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start.ps1
```
*(This bypasses the policy only for the current terminal session without changing system-wide security settings).*

### Q: Do I need a SerpApi API key to use NexusRank?
**Answer:**
**No.** NexusRank defaults to `SERP_PROVIDER=free`, which uses our zero-key `FreeSerpProvider` (querying DuckDuckGo Lite and SearXNG with smart User-Agent rotation). You also have access to `mock` for deterministic domain simulations. You only need a SerpApi key if you explicitly choose the `serpapi` engine.

### Q: How do I reset or clean my database?
**Solution:**
Delete the SQLite file `backend/rank_tracker.db`. The application will automatically recreate the database and all tables with updated schema upon the next startup.

---

## 🗺️ Open-Source Roadmap & Contributing

We welcome contributions from the community! Here are our active development milestones:
- [ ] **Automated Scheduled Scans:** Built-in cron / recurring daily rank checks using APScheduler.
- [ ] **Local LLM SEO Action Briefs:** Native integration with Ollama to generate full content briefs on local models ($0 cost).
- [ ] **Alert Webhooks:** Instant Discord, Slack, and email notifications when high-priority keywords drop out of Page 1.
- [ ] **Additional Search Engines:** Bing, Yahoo, and Baidu search abstraction providers.

### How to Contribute
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Ensure all tests pass (`pytest tests/ -v && npm run build`).
5. Push to your branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📜 License

NexusRank is open-source software licensed under the [MIT License](LICENSE).  
Free for personal, commercial, and enterprise use.

---

<div align="center">
  <sub>Built with precision for SEO engineers, indie hackers, and growth teams worldwide.</sub>
</div>
