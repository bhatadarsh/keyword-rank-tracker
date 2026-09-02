# 📋 Development Changelog

All changes and updates to this project are documented here chronologically.
Format: `[TYPE] Description` where TYPE is **FEAT / FIX / REFACTOR / DOCS / TEST / CHORE**.

---

## 2026-09-02

### Session 3 — Bug Fixes & Dev Launcher

**[FIX]** `frontend/src/index.css` — Moved Google Fonts `@import` above `@import "tailwindcss"`. PostCSS requires all `@import` statements to be consecutive and come before any other rules.

**[FIX]** `backend/rank_tracker.db` — Deleted stale SQLite database that was missing the new `page_title` column. SQLAlchemy `create_all` does not add columns to existing tables; DB is auto-recreated on next startup with the correct schema.

**[FEAT]** `start.ps1` [NEW] — Single PowerShell launcher that starts both the FastAPI backend and React frontend in separate terminal windows, with pre-flight checks, coloured output, and auto-opens the browser at `http://localhost:5173`.

**[CHORE]** Switched `SERP_PROVIDER` from `mock` to `serpapi` in `backend/.env` — real Google organic ranking data now active.


**[FEAT]** Scaffolded full-stack project structure:
- `backend/` — FastAPI Python server
- `frontend/` — React 19 + Vite + TypeScript SPA

**[FEAT]** Implemented backend core:
- `database.py` — SQLAlchemy engine and session factory (SQLite dev / PostgreSQL prod)
- `models.py` — `Job` and `KeywordTask` ORM models with `JobStatus` and `KeywordStatus` enums
- `providers/base.py` — Abstract `SerpProvider` interface with `SearchResult` and `SearchResponse` Pydantic models
- `providers/mock_provider.py` — Simulated SERP provider (no API key, realistic latency)
- `providers/serpapi_provider.py` — Real SerpApi.com integration
- `providers/__init__.py` — Factory function reading `SERP_PROVIDER` env var
- `services/rank_tracker.py` — Domain normalization and `calculate_best_rank()` logic
- `services/job_processor.py` — Async background job processor
- `exports/generator.py` — CSV and Excel report generation via pandas + openpyxl
- `api/routes.py` — REST endpoints: POST /api/rank-check, GET status, GET download
- `main.py` — FastAPI app with CORS middleware

**[FEAT]** Implemented frontend:
- `App.tsx` — Single-page dashboard with form, progress bar, results table, download buttons

**[DOCS]** Created comprehensive FAANG-grade `README.md` with system design diagrams, sequence diagrams, component diagrams, database schema, design decisions, API reference, and deployment guide.

**[CHORE]** Created `.env.example` and `sample_keywords.csv`

---

### Session 2 — Production Fixes & Git Setup

**[FIX]** Created missing `requirements.txt` with pinned versions — previously `pip install -r requirements.txt` would fail

**[FIX]** Added `__init__.py` to `api/`, `services/`, `exports/`, `tests/` — Python package imports were broken

**[FIX]** `main.py` — Added `load_dotenv()` at startup so `.env` is actually read before any `os.getenv()` calls

**[FIX]** `providers/base.py` — Added `title: str` field to `SearchResult` so page titles flow through the stack

**[FIX]** `providers/serpapi_provider.py` — Completed country/language mapping: added Singapore, Germany, France, UAE, Brazil, Netherlands, Japan, Spain, Italy, Sweden, South Africa + 25 more countries. Added structured logging. Fixed UK code (`uk` → `gb`). Added `no_cache: true` param.

**[FIX]** `providers/mock_provider.py` — Rewrote with realistic domain pool, configurable found/error/rate-limit rates, page title generation, structured logging

**[FIX]** `models.py` — Added `page_title` column to `KeywordTask`

**[FIX]** `services/rank_tracker.py` — `calculate_best_rank()` now returns 3-tuple `(rank, url, title)`. Added port-stripping to `normalize_domain()`. Added defensive sort.

**[FIX]** `services/job_processor.py` — Updated to handle 3-tuple from `calculate_best_rank()`. Stores `page_title`. Replaced `print()` with structured `logging`. Added per-status error handling (rate_limited, timeout, api_error as distinct cases).

**[FIX]** `exports/generator.py` — Added `Page Title` column to CSV/Excel output. Changed CSV encoding to `utf-8-sig` (Excel compatible). Added auto-fit column widths to Excel export.

**[FIX]** `api/routes.py` — Added domain validation regex. Exposes `page_title` in GET response. Added `keyword_count` to job creation response. Descriptive download filenames include domain + date.

**[FIX]** Frontend Tailwind v4 incompatibility — The project had Tailwind v4 installed but v3 config syntax. Fixed by:
  - Installed `@tailwindcss/vite` plugin
  - Updated `vite.config.ts` to use `@tailwindcss/vite` plugin
  - Updated `src/index.css` to use `@import "tailwindcss"` (v4 syntax)
  - Deleted obsolete `tailwind.config.js` and `postcss.config.js`

**[FEAT]** `frontend/vite.config.ts` — Added `/api` proxy to FastAPI dev server (no more hardcoded localhost URLs)

**[FEAT]** `App.tsx` — Major UI improvement:
  - Color-coded rank badges (🟢 Top 10, 🔵 Top 30, 🟡 Top 100)
  - Status badges with icons
  - Stats bar showing Found / Not Found / Error counts
  - Page Title column in results table
  - New Check button to reset state
  - Clickable ranking URLs

**[TEST]** Rewrote `tests/test_domain_matching.py` — 18 tests covering:
  - `normalize_domain` (https/http, www, paths, query params, ports, empty string)
  - `match_domain` (exact, www, subdomain, deep subdomain, suffix attack prevention, partial TLD)
  - `calculate_best_rank` (found, multiple appearances returns best, not found, empty results, returns title)

**[CHORE]** Created root-level `.gitignore` covering Python venv, SQLite DBs, .env secrets, generated exports, node_modules

**[CHORE]** Created `backend/.env` with safe defaults (SERP_PROVIDER=mock)

**[CHORE]** Initialized Git repository with initial commit

---

## How to Contribute to This Log

When making changes, add an entry at the **top** of the relevant date section (or create a new date heading).
Use the format:

```
**[TYPE]** `filename.py` or module — What changed and why.
```

Types: `FEAT` | `FIX` | `REFACTOR` | `DOCS` | `TEST` | `CHORE` | `PERF` | `SECURITY`
