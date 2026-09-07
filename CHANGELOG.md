# 📋 Development Changelog

All changes and updates to this project are documented here chronologically.
Format: `[TYPE] Description` where TYPE is **FEAT / FIX / REFACTOR / DOCS / TEST / CHORE**.

---

## 2026-09-07

### Session 7 — Unique Production Features for SEO Associates

**[FEAT]** Added **Rank Tier Breakdown Cards** — a 5-card visual dashboard showing the full distribution of keyword rankings:
- **Top 3** (Gold): Keywords in the coveted positions 1–3.
- **Top 10** (Emerald): Remaining page 1 keywords (positions 4–10).
- **Page 2–3** (Blue): Positions 11–30, labelled "Near miss".
- **Beyond 30** (Gray): Low-visibility rankings.
- **Not Found** (Rose): Keywords with zero presence.
- Each card shows count, %, and a color-matched mini progress bar at the bottom.

**[FEAT]** Added **"🎯 Opportunities" Filter Tab** — highlights keywords ranking 11–30 (just off page 1). This is pure gold for SEO teams: these are the highest-ROI keywords to focus on.
- The tab shows a **live pulse dot** whenever there are non-zero opportunities, drawing attention without being intrusive.
- A contextual tip banner appears: *"These rank 11–30. Focus SEO here for quick wins."*

**[FEAT]** Added **Expandable Row Detail Panel** — click any keyword row to expand it inline and see:
- The full, untruncated URL and page title.
- A **"Verify on Google"** button that opens a pre-filled Google search for that keyword (for instant manual verification).
- A **"Copy URL"** button with a ✓ confirmation animation.
- This eliminates the need to manually re-search every result.

**[FEAT]** Added **"Copy to Clipboard" button** in the results header:
- Copies the **currently filtered and sorted** results as TSV (tab-separated) to clipboard.
- Pastes directly and correctly into **Google Sheets or Excel** with column headers (Keyword, Rank, Status, Page Title, URL).
- Toast confirms: *"X rows copied — paste directly into Google Sheets!"*

**[FEAT]** Added **Summary Statistics Strip** (shown after scan completes):
- **Best Rank**: The single best keyword position with the keyword name shown as a subtitle.
- **Average Rank**: Mean rank across all found keywords.
- **Page 1 Keywords**: Total count of keywords in positions 1–10.

**[FEAT]** Added **Row-level color-coding by rank tier**:
- Top 3 rows → subtle amber left-border + amber hover.
- Top 10 rows → emerald left-border + emerald hover.
- Page 2–3 rows → blue left-border + blue hover.
- Instant visual grouping without needing to filter.

**[FEAT]** Enhanced **completion toast notification** to include opportunity count:
- *"Scan complete! 23/100 ranking • 14 opportunities near page 1"*

**[FEAT]** Enhanced **sidebar live stats** to show Top 3 / Top 10 / Opportunities / Not Found separately (instead of just Found/Not Found/Errors).

**[FIX]** Added `GET /api/rank-check` (list endpoint) to backend — required by the History tab to load all past jobs with `found_count` and `keyword_count` pre-calculated.

---


### Session 5 — Premium Dark Mode UI Overhaul

**[FEAT]** Completely redesigned the frontend aesthetic to a Premium Dark Mode (Vercel/Linear style), replacing the basic Tailwind template look:
- **Typography**: Switched to the modern, geometric `Outfit` font for a sleek tech feel.
- **Color System**: Implemented a deep dark background (`Zinc 950`) with subtle radial mesh gradients.
- **Glassmorphism**: Added `backdrop-blur` and translucent backgrounds to panels, headers, and tables.
- **Animations**: Added glowing pulse effects to empty states, shimmer effects to progress bars, hover scale transforms, and seamless color transitions on all interactive elements.
- **Rank Badges**: Built custom glowing gradient badges based on rank tiers (Top 3: Gold, Top 10: Emerald, Top 30: Indigo).
- **Custom Scrollbar**: Replaced default webkit scrollbar with a minimal dark mode variant.

---

### Session 4 — Live SerpApi Testing & Stability Improvements
> Git commits: `fe088c9`, `1c5a080`

**[FIX]** `backend/services/job_processor.py` — Added **retry with exponential backoff** for `rate_limited` and `timeout` responses:
  - Up to **3 automatic retries** per keyword before marking as permanently failed
  - Backoff schedule: 5s → 10s → 20s between retries
  - Increased base `REQUEST_DELAY` from 1.2s to 2.0s between keywords to be safer with SerpApi throttling

**[CHORE]** Switched `SERP_PROVIDER=serpapi` in `backend/.env` — first live test with real Google organic data conducted successfully.

**[TEST]** `test_github.csv` [NEW] — 10 keywords for `github.com` across India, US, UK to verify live ranking detection (expected: rank 1–5 for "github", "code repository").

**[TEST]** `test_wikipedia.csv` [NEW] — 10 informational keywords for `wikipedia.org` as a gold-standard verification test (expected: rank 1 for "free encyclopedia", "wikipedia").

**[DOCS]** `CHANGELOG.md` — Backfilled Session 3 entries; established daily log format with git commit hash references.

---

### Session 3 — Bug Fixes & Dev Launcher
> Git commit: `92230b8`

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
