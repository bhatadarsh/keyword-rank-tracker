# 📋 Development Changelog

All changes and updates to this project are documented here chronologically.
Format: `[TYPE] Description` where TYPE is **FEAT / FIX / REFACTOR / DOCS / TEST / CHORE**.

---

## 2026-11-14

### Version 2.1.0 — Human-Crafted SaaS Redesign & Built-In Help Center

**[REFACTOR]** **Human-Crafted SaaS Visual Identity (Linear & Stripe Aesthetic)**:
- **Typography Overhaul**: Replaced `Outfit` with `Inter` (`weights 400, 500, 600, 700`) as the primary UI font across the entire application with antialiased font smoothing and OpenType contextual features (`cv02`, `cv03`, `cv04`, `cv11`). Pinned `JetBrains Mono` strictly for tabular-nums rank badges, deltas, and URLs.
- **True Neutral Palette**: Defaulted to crisp, airy Light Mode (`#FAFAFA` canvas, `#FFFFFF` surface cards, `#E4E4E7` 1px borders) with a true-neutral Dark Mode toggle (`#09090B` Zinc-950 canvas, `#121215` surface cards, `#27272A` borders). Eliminated all muddy dark-blue backgrounds, glowing neon borders, and glassmorphism clutter.
- **Emoji Elimination**: Stripped all emojis (`🚀`, `🔥`, `🏆`, `⚠️`, `🌐`, `📊`, etc.) from UI buttons, badges, table cells, and headings, replacing them with uniform, clean `lucide-react` icons.
- **Breathing Room & Table Comfort**: Expanded outer container padding to `px-6 py-8` / `px-8 py-8`, flattened nested card borders, and expanded data grid row padding to `py-3.5 px-4`.

**[FEAT]** **Built-In Help & Documentation Center (`frontend/src/components/help/HelpView.tsx`)**:
- Added dedicated Help & Glossary view accessible via the navigation sidebar and `Cmd+K` Command Palette.
- Features real-time search filtering across 4 comprehensive sections:
  1. **How NexusRank Works**: 3-step pipeline walkthrough.
  2. **Feature & Metric Glossary**: Plain-English explanations of Striking-Distance Opportunities (11–30), Organic Visibility Score (SoV %), Keyword Cannibalization, SERP X-Ray, Rank Deltas, and Competitor Dominance Matrix.
  3. **Search Engine Comparison**: Side-by-side comparison of `Free Live Search` ($0 zero keys), `Smart Simulation`, and `SerpApi`.
  4. **CSV / Excel Input Specification**: Column definitions and a 1-click **Download Sample CSV** button.

**[FEAT]** **Dismissible 3-Step Interactive Welcome Guide (`WelcomeGuideBanner.tsx` & `useOnboarding.ts`)**:
- Added an inline 3-step interactive onboarding card on the home screen:
  - **Step 1**: Run 1-Click Sample Scan (direct **"Run GitHub.com Demo"** button triggers scan immediately).
  - **Step 2**: Filter Striking-Distance Opportunities (auto-tracks when user selects Opportunities filter tab).
  - **Step 3**: Inspect SERP X-Ray & Copy an AI Brief (auto-tracks when user expands a keyword row).
- Full state persistence in `localStorage` (`nexusrank_onboarding_progress` and `nexusrank_welcome_dismissed`).
- Added **"Restart Welcome Guide"** button inside the Help Center to replay the walkthrough anytime.

**[FEAT]** **Contextual Metric Tooltips (`InfoTooltip.tsx`)**:
- Created an accessible `HelpCircle` popover tooltip attached to Visibility Score, Striking-Distance Opportunities, Keyword Cannibalization, and Search Depth.

---

### Version 2.0.1 — Cross-Platform Launchers & Universal Onboarding Guide

**[FEAT]** **Zero-Config Cross-Platform Dev Launchers**:
- Updated `start.ps1` (Windows): automatically copies `.env.example`, auto-creates `backend/venv`, auto-installs `requirements.txt` and `node_modules`, kills stale port listeners, starts backend and frontend in separate consoles, and opens the default browser to `http://localhost:5173`.
- Added `start.sh` (macOS / Linux): POSIX-compliant shell script with prerequisites validation, auto-environment setup, parallel background process execution, and automated `SIGINT`/`SIGTERM` cleanup traps (`Ctrl+C` cleanly shuts down all processes).

**[DOCS]** **Exhaustive "How to Run This Project" Guide (`README.md`)**:
- Added foolproof step-by-step onboarding documentation covering 1-Click Windows execution, macOS/Linux execution, Docker Compose (`docker compose up --build`), and granular terminal-by-terminal manual workflows.
- Included pre-flight checklist, ports reference, sample dataset guides (`test_github.csv`, `test_wikipedia.csv`), and common troubleshooting scenarios (port conflicts, PowerShell policies, Docker daemon).

**[CHORE]** **Dependency Manifest & Configuration Hardening**:
- Pinned `pydantic==2.13.5` explicitly in `backend/requirements.txt` alongside `fastapi==0.115.12`, `uvicorn==0.34.3`, and `sqlalchemy==2.0.40`.
- Verified all 33 pytest unit and integration tests passing in <1s.
- Verified 0 oxlint warnings and 0 errors across all frontend TypeScript files.

---

### Version 2.0.0 — Open-Source Zero-Cost SEO & SERP Intelligence Platform

**[FEAT]** **100% Zero-Cost Multi-Engine SERP Architecture (`backend/providers/`)**:
- Added `FreeSerpProvider` (`backend/providers/free_serp_provider.py`) enabling zero-key live search via DuckDuckGo Lite and SearXNG with User-Agent rotation and graceful fallback.
- Overhauled `MockProvider` (`backend/providers/mock_provider.py`): eliminated hardcoded `hiree.com`, implemented dynamic domain injection with deterministic SHA-256 seeding, multi-URL cannibalization simulation, and realistic competitor SERP generation.
- Fixed `SerpApiProvider` depth pagination: queries with `depth > 100` (e.g. 200 or 500) now correctly paginate through `start = page * 100` and map organic positions accurately.
- Added `GET /api/config` single source of truth for providers, supported countries, and languages.

**[FEAT]** **Zero-Cost "Killer" SEO Intelligence Suite (`backend/services/`)**:
- **Organic Visibility Index & Share-of-Voice (SoV)**: Weighted click-through score (0–100%) calculated per-keyword and job-level using industry-standard organic CTR decay curves.
- **Keyword Cannibalization Detection**: Automatically flags when 2 or more distinct URLs from the target domain rank for the same keyword, recording secondary URLs and secondary rank positions.
- **Top 5 SERP Snapshot**: Stores rich organic competitor metadata (#1–#5 URLs, titles, and domains) for every keyword row.
- **Automatic Competitor Discovery**: Aggregates top Page 1 competing domains across all keywords in a scan to reveal top domains capturing organic search volume.
- **Historical Rank Delta Tracking**: Automatically correlates past scans for the same domain and parameters, populating `previous_rank` and `rank_delta` (`+5`, `-2`, `NEW`).

**[FEAT]** **Zero-Friction Auto-Migration & Crash Recovery (`backend/database.py`)**:
- Implemented `ensure_schema_columns()`: dynamic startup schema sync that inspects `PRAGMA table_info` and executes non-destructive `ALTER TABLE ADD COLUMN` for new fields.
- Implemented `reconcile_orphan_jobs()`: on server startup, finds any jobs stuck in `queued` or `processing` from an unexpected crash and marks them `failed`.
- Added `DELETE /api/rank-check/{job_id}`: cleanly deletes jobs, keyword tasks, and associated export files.

**[REFACTOR]** **Modular SaaS Frontend Architecture ("Obsidian & Linear Precision" UI)**:
- Replaced monolithic 998-line `App.tsx` with a modular architecture:
  - `src/types/index.ts`: Strict TypeScript contracts.
  - `src/api/client.ts`: Typed Axios API client.
  - `src/components/layout/AppShell.tsx`: Collapsible navigation, engine indicators, and theme controls.
  - `src/components/common/CommandPalette.tsx`: Global `Cmd+K` / `Ctrl+K` command palette.
  - `src/components/scan/ScanLaunchpad.tsx`: Drag-and-drop CSV uploader with instant client-side preview and 1-Click Demo presets for GitHub and Wikipedia.
  - `src/components/results/BentoAnalyticsHeader.tsx`: Visibility SoV gauge, 5-tier distribution cards, and competitor preview.
  - `src/components/results/ResultsDataGrid.tsx`: Smart filter tabs, tabular-nums rank/delta badges, and interactive SERP X-Ray drawer with 1-click "Copy AI SEO Action Brief" prompt.
  - `src/components/results/CompetitorMatrixView.tsx`: Dedicated Page 1 competitor dominance matrix.
  - `src/components/history/HistoryView.tsx`: Searchable scan archive with status badges and one-click deletion.
- Added smart polling: automatically pauses 2-second poll interval when browser tab is hidden and resumes on focus.

**[CHORE]** **Docker & CI/CD DevOps**:
- Added `backend/Dockerfile` and `frontend/Dockerfile` with Nginx reverse proxy.
- Added root `docker-compose.yml` for 1-command startup (`docker compose up --build`).
- Added `.github/workflows/ci.yml` running pytest and npm build on every push and PR.
- Added 10 new unit tests in `backend/tests/test_seo_analytics.py`; all 33 tests pass in <1s.
- Cleaned all oxlint warnings (0 errors, 0 warnings).

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

**[FIX]** `backend/services/job_processor.py` — Added **retry with exponential backoff** for `rate_limited` and `timeout` responses:
  - Up to **3 automatic retries** per keyword before marking as permanently failed
  - Backoff schedule: 5s → 10s → 20s between retries
  - Increased base `REQUEST_DELAY` from 1.2s to 2.0s between keywords to be safer with SerpApi throttling

**[CHORE]** Switched `SERP_PROVIDER=serpapi` in `backend/.env` — first live test with real Google organic data conducted successfully.

**[TEST]** `test_github.csv` [NEW] — 10 keywords for `github.com` across India, US, UK to verify live ranking detection.

**[TEST]** `test_wikipedia.csv` [NEW] — 10 informational keywords for `wikipedia.org` as a gold-standard verification test.

---

### Session 3 — Bug Fixes & Dev Launcher

**[FIX]** `frontend/src/index.css` — Moved Google Fonts `@import` above `@import "tailwindcss"`.
**[FIX]** `backend/rank_tracker.db` — Auto-recreated on schema evolution.
**[FEAT]** `start.ps1` [NEW] — Single PowerShell launcher for both servers with pre-flight checks.
