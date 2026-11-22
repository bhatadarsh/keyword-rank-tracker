# NexusRank

NexusRank is a local-first keyword rank tracker built with React, TypeScript, Tailwind CSS, and FastAPI. Upload keywords, inspect rankings and top-five SERP snapshots, review overlapping ranking URLs, compare compatible historical observations, and export CSV/XLSX reports.

[Setup](#setup) · [Search sources](#search-sources-and-data-trust) · [Input format](#keyword-files) · [API](#api-reference) · [Verification](#testing-and-verification) · [Changelog](./CHANGELOG.md)

## Current status

**Wave 1 (P0) is complete.** It adds recorded source/fallback provenance, bounded uploads, URL navigation, request cancellation, error recovery, reliable theme selection, and isolated backend tests. The last Wave 1 verification on **2026-11-22** recorded **93 passing backend tests** and frontend lint/build with **zero errors and zero warnings**.

Wave 2 has not started. The canvas-first UI overhaul, font/contrast polish, and command-palette keyboard improvements remain queued. SSE, direct keyword paste, cancel/retry, and re-run actions are also not implemented yet. See [planned waves](#planned-waves).

## Search sources and data trust

| Provider | Data | Coverage and settings |
|---|---|---|
| `free` | DuckDuckGo Lite or a configured SearXNG instance; no API key | One results batch, up to the requested maximum of 100. Full-depth coverage is not certified. Country, language, and device settings—including file overrides—are not applied. |
| `mock` | Deterministic synthetic rankings and competitor snapshots | Offline demonstration/testing at requested depths of 100, 200, or 500. These are simulated observations, never evidence of live rankings. |
| `serpapi` | Google results supplied by SerpApi; requires `SERP_API_KEY` | Requested depths of 100, 200, or 500 with pagination. Actual coverage may be smaller; incomplete responses are labeled accordingly. |

**Simulation fallback is off by default.** For free search, the scan form offers an explicit option to allow simulation when live search returns no usable results. API clients opt in using `allow_fallback=true`. Enabling fallback does not mean it was used.

Each processed keyword records its actual provider, fallback use/reason, observation time, results examined, coverage, and effective settings. A calm persistent banner identifies fallback results; individual rows and detail views identify synthetic data. A job can report `mixed` sources if its tasks came from different providers. Older scans retain `unknown` provenance; the app cannot retroactively verify whether their results were live or simulated.

Pending tasks, request errors, incomplete searches, and verified missing rankings are separate states. “Not found in retrieved results” does not mean the domain was absent throughout the requested depth. Job states are `queued`, `processing`, `completed`, `completed_with_errors`, and `failed`; review row details even when a job has finished.

### Metrics and historical comparisons

- **Visibility score** is a modeled rank index, not measured traffic, click probability, or market share. Rank 1 receives 30 points, rank 2 gets 18, rank 3 gets 12, ranks 4–10 get 8 down to 2, ranks 11–30 get 1, and other ranks get zero. The sum is divided by 30 times the eligible observation count and expressed as a percentage.
- Aggregates use complete, successful observations from one known actual source. Request failures and incomplete coverage are excluded. Mixed-source jobs have no combined visibility/competitor aggregate; the sample size is exposed separately. Entirely synthetic scans can have modeled scores and remain labeled as simulations.
- **Competitor coverage** counts each external domain once per eligible keyword where it appears at ranks 1–10. Percentages are keyword coverage, not traffic share. The keyword comparison table selects a non-target entry from each top-five snapshot.
- **Historical movement** compares earlier completed jobs with the same domain, keyword, requested settings, depth, selected provider, actual source, fallback usage, and compatible effective settings. Both observations require complete coverage. Simulated and live rankings are never compared.
- `FIRST` identifies a first eligible observation, `NEW` a previously absent ranking now found, and `DROPPED` a previously found ranking now absent within complete coverage. Incompatible, incomplete, and unverifiable history has no delta.

Overlapping URLs are flagged for review. The presence of two URLs alone does not establish that a redirect or canonical change is appropriate.

## Setup

### Requirements

- Python **3.11+** with a virtual environment. Wave 1 was verified locally on Python **3.13.1**; CI is configured for **3.11**.
- Node.js **22.12+** recommended, or Node.js **20.19+**. Node 18 is not supported by the installed Vite version. Wave 1 was built locally on Node **22.14.0**.
- npm, included with Node.js.

Run **one backend instance/worker only**. Background jobs run inside that process; startup recovery assumes any previously queued/processing jobs were interrupted. No distributed worker coordination is implemented.

### Manual startup

From the project directory, open two terminals.

**Backend — Windows PowerShell:**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item ../.env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Backend — macOS/Linux:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp ../.env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Copy the environment template only on first setup; preserve an existing configuration. Edit the backend environment file before starting if you need a provider key or a different database location.

**Frontend — second terminal, from the project directory:**

```bash
cd frontend
npm ci
npm run dev
```

Open [NexusRank](http://localhost:5173). [API health](http://localhost:8000/health), [provider configuration](http://localhost:8000/api/config), and [interactive API documentation](http://localhost:8000/docs) are available while the backend is running.

### Existing launchers and containers

[Windows launcher](./start.ps1) and [macOS/Linux launcher](./start.sh) provide automated local setup. The Windows launcher currently force-stops processes occupying ports 8000/5173; use manual startup if those ports belong to another application.

[Compose configuration](./docker-compose.yml), [backend image](./backend/Dockerfile), and [frontend image](./frontend/Dockerfile) are included. Container execution was not reverified in Wave 1. Provider environment variables are specified directly in Compose; the root environment file does not automatically override them. The current database volume mounts the application directory, so container persistence/build-context cleanup remains part of the final polish wave.

### First scan

1. Open New Scan and load the GitHub or Wikipedia sample dataset, or upload your own file.
2. Enter a company/project name and target domain.
3. Select an available provider. Choose Simulation for an offline demonstration. Free search has limited coverage; enable simulation fallback only if synthetic substitute results are acceptable.
4. Start the scan. The welcome guide also has a direct GitHub demo action using the configured default provider.
5. Inspect results, filter Opportunities (11–30), open a top-five snapshot, copy an AI brief prompt, or download a report.

## Navigation and recovery

| URL | View |
|---|---|
| `/` | New Scan |
| `/scans/:jobId` | Rankings for a saved scan |
| `/scans/:jobId?filter=opportunities` | Opportunities within that scan |
| `/competitors?jobId=:jobId` | Competitors for the selected scan |
| `/history` | Recent scan history |
| `/help` | Help, glossary, and sample CSV |

Scan URLs retain search (`q`), filter (`filter`), sort column (`sort`), and direction (`dir`). Refresh and browser Back/Forward preserve this context. New Scan opens an empty form. Missing scans and unknown routes provide recovery links.

Live updates currently use HTTP polling about every two seconds, paused while the tab is hidden. Requests are scoped to the selected job, cancelled on navigation, and prevented from overlapping. Transient connection loss retains the last saved results; a missing/deleted scan clears cached results. The command palette is currently opened with the header button; its advertised keyboard opening/navigation improvements are queued for Wave 2.

Theme selection overrides the OS preference using a class-based dark variant and is initialized before paint. Disabled browser storage falls back safely; malformed onboarding state is discarded. A root Error Boundary provides a recovery link for rendering failures.

## Configuration

See the [environment template](./.env.example). The backend loads its environment before creating the database engine.

| Variable | Default / behavior |
|---|---|
| `DATABASE_URL` | `sqlite:///./rank_tracker.db`, relative to the backend working directory. SQLite is the default local storage. |
| `SERP_PROVIDER` | `free`. Configuration falls back to free search if the default is unknown or SerpApi lacks a key; explicit invalid/unconfigured scan submissions are rejected. |
| `SERP_API_KEY` | Empty. Required for SerpApi. |
| `SEARXNG_URL` | Empty. Optional SearXNG search endpoint; free search tries it before DuckDuckGo. |
| `CORS_ORIGINS` | Comma-separated localhost defaults: `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost`. Wildcard entries are not accepted. |
| `EXPORT_DIR` | `exports/files` under the backend working directory. Override to change export storage. |

Fallback permission is a per-scan form field, not a global environment setting. CORS is a browser-origin policy, not authentication; the application remains intended for local use.

### Startup and existing databases

FastAPI lifespan creates missing tables, adds supported missing columns, then marks interrupted jobs failed and settles their pending tasks. **Migration errors abort startup visibly.** Importing the application does not initialize or repair a database.

Back up the existing SQLite file before upgrading. P0 migration preserves existing rows and adds provenance fields; old observations remain unknown and their unverified comparisons/aggregates are not presented as trustworthy. Do not delete the database to resolve a migration error unless you explicitly intend to lose scan history.

## Keyword files

Supported inputs are **UTF-8 CSV** (with or without BOM) and **XLSX**. Legacy **XLS is rejected** with a message to save as XLSX or CSV.

Limits enforced by the shared parser:

| Limit | Maximum |
|---|---|
| Uploaded file | 5 MiB (5,242,880 bytes) |
| Data rows, before deduplication | 2,000 |
| Columns | 20, with unique normalized names |
| Keyword length | 500 characters; no null bytes |
| Expanded XLSX archive | 50 MiB |

Only `keyword` is required. Optional `country`, `language`, and `device` values override requested job settings; blank overrides inherit defaults. Overrides are validated even when the chosen provider cannot apply them. Free search does not apply locale/device settings.

```csv
keyword,country,language,device
"rank tracker, free",United States,English,desktop
00123,India,English,mobile
NA,United Kingdom,English,desktop
```

Quoted commas and multiline CSV fields are supported. CSV keyword text is not converted into numbers or missing-value tokens, so `00123` and `NA` remain literal strings. In XLSX, store keywords as text to preserve leading zeros; formula keywords must be replaced with text values. Empty keyword rows are skipped. Duplicate keyword/settings tuples are removed, with skipped/duplicate counts returned in the preview. Invalid overrides reject the upload with a row-specific message.

Preview and submission use the same server parser, off the event loop. Submission validates again. Example datasets: [sample keywords](./sample_keywords.csv), [GitHub](./test_github.csv), and [Wikipedia](./test_wikipedia.csv).

## Exports

CSV uses UTF-8 BOM for Excel compatibility. XLSX contains a Rankings worksheet with fitted column widths. Reports include requested and actual source, task/job fallback use and reason, actual coverage, results examined, effective settings, observation time, comparison state, and errors alongside the ranking fields.

A missing rank on an error or pending task is not exported as a verified missing result. Legacy provenance remains unknown. Exports are generated on demand and removed when their scan is deleted; automatic TTL cleanup remains queued. Running scans cannot be deleted. Clipboard copy uses the current table filter/sort; CSV/XLSX downloads contain the entire scan.

## API reference

Interactive schemas are available at `/docs` and `/redoc` on the backend.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/config` | Provider availability/capabilities, locales, upload limits, and default provider. Alias: `/api/rank-check/config`. |
| `POST` | `/api/rank-check/preview` | Validate a CSV/XLSX upload and return counts, columns, and sample keywords. No job is created. |
| `POST` | `/api/rank-check` | Validate input and queue a scan. Returns its ID immediately. |
| `GET` | `/api/rank-check` | Latest 50 jobs with counts, status, source, and aggregate data. |
| `GET` | `/api/rank-check/{job_id}` | Job progress, errors, provenance, coverage, and keyword results. |
| `DELETE` | `/api/rank-check/{job_id}` | Delete a terminal job and associated reports; returns 409 while running. |
| `GET` | `/api/rank-check/{job_id}/download/{format}` | Download `csv` or `xlsx` for the entire scan. |
| `GET` | `/health` | Basic API health and configured default-provider information. |

Create-job requests use multipart fields `company_name`, `domain`, `country`, `language`, `device`, `depth`, `provider`, `file`, and optional `allow_fallback` (default `false`). Preview accepts `file` and optional country/language/device defaults. Unknown providers, invalid settings, and unsupported depths are rejected. SerpApi is rejected when its key is missing. Free search accepts depth 100 only, as a maximum for one batch rather than a guaranteed number of results.

## Testing and verification

From the backend directory, activate its virtual environment and run:

```bash
python -m pytest tests/ -v
```

Run pytest in a **dedicated process**. [Test fixtures](./backend/tests/conftest.py) select a temporary SQLite database and export directory before application imports, reset the schema between tests, and clean up at session end. They replace provider settings and clear live credentials. [P0 regression tests](./backend/tests/test_p0.py) cover ingestion, fallback provenance, partial responses, compatible history, worker terminal states, exports, migration/recovery, CORS, import safety, and parsing off the event loop. Upstream failure cases use mocks; passing tests do not certify live provider availability.

From the frontend directory:

```bash
npm run lint
npm run build
```

The build runs TypeScript checking followed by Vite bundling. [CI](./.github/workflows/ci.yml) is configured to run backend pytest on Python 3.11 and frontend lint/build on Node 20.

**Last completed Wave 1 checks (2026-11-22):**

- 93 backend tests passed, including all 33 original tests.
- Frontend lint/build passed with zero errors and warnings; editor diagnostics and whitespace checks were clean.
- Browser checks covered refresh/filter URLs, Back navigation, New Scan, stale-response cancellation, explicit themes, malformed onboarding state, uploads/previews, preserved inputs after errors, fallback disclosure, missing routes/scans, and Error Boundary recovery.
- Browser tests used a disposable database. The existing application database's SHA-256 was unchanged. Container execution, live provider availability, and the queued visual overhaul were not certified by these checks.

## Source map

- [API routes](./backend/api/routes.py), [models](./backend/models.py), and [startup](./backend/main.py).
- [Database migration/recovery](./backend/database.py), [upload parser](./backend/services/ingestion.py), [worker](./backend/services/job_processor.py), and [analytics](./backend/services/rank_tracker.py).
- [Search providers](./backend/providers/) and [report generator](./backend/exports/generator.py).
- [Application routing](./frontend/src/App.tsx), [job polling](./frontend/src/hooks/useJob.ts), and [API client](./frontend/src/api/client.ts).
- [UI components](./frontend/src/components/), including [source disclosures](./frontend/src/components/results/ProvenanceNotice.tsx) and [Error Boundary](./frontend/src/components/common/ErrorBoundary.tsx).

## Planned waves

| Wave | Status / scope |
|---|---|
| 1 — P0 | Complete: trust, routing, stability, ingestion, theme correctness, migration, and test isolation. |
| 2 — P1 + P3.1 + P2.6 | Queued: canvas-first layout, compact metrics, plain copy, restrained motion, table rendering improvements, skeletons/toasts, font/contrast polish, and command-palette keyboard navigation. |
| 3 — P2 | Queued after the UI visual check: lightweight SSE with polling fallback, paste keywords, cancel/retry, re-run/duplicate settings, and worker pacing improvements. No multi-process event bus. |
| 4 — remaining P3 | Queued: accessibility completion, mobile navigation, export retention/safety, history performance, deployment/launcher hygiene, tests, and documentation polish. Authentication is out of scope; configurable CORS has already landed. |

See the [changelog](./CHANGELOG.md) for the implementation history. Historical entries describe behavior at the time they were written; this README describes the current P0 implementation.
