# ============================================================
#  start.ps1 — Start Keyword Rank Tracker (Backend + Frontend)
#  Usage: .\start.ps1
# ============================================================

$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv     = Join-Path $Backend "venv\Scripts\python.exe"

# ── Colour helpers ──────────────────────────────────────────
function Info  { param($m) Write-Host "  $m" -ForegroundColor Cyan }
function Ok    { param($m) Write-Host "  $m" -ForegroundColor Green }
function Warn  { param($m) Write-Host "  $m" -ForegroundColor Yellow }
function Err   { param($m) Write-Host "  $m" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host "   Keyword Rank Tracker — Dev Launcher" -ForegroundColor White
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host ""

# ── Pre-flight checks ───────────────────────────────────────
if (-not (Test-Path $Venv)) {
    Err "Python venv not found at $Venv"
    Err "Please run: cd backend; python -m venv venv; .\venv\Scripts\activate; pip install -r requirements.txt"
    exit 1
}

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Warn "node_modules not found. Running npm install first..."
    Push-Location $Frontend
    npm install
    Pop-Location
}

# ── Start Backend ────────────────────────────────────────────
Info "Starting FastAPI backend on http://localhost:8000 ..."
$backendJob = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-Command",
        "cd '$Backend'; .\venv\Scripts\activate; uvicorn main:app --reload --port 8000" `
    -PassThru `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# ── Start Frontend ───────────────────────────────────────────
Info "Starting React frontend on http://localhost:5173 ..."
$frontendJob = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-Command",
        "cd '$Frontend'; npm run dev" `
    -PassThru `
    -WindowStyle Normal

Start-Sleep -Seconds 3

# ── Done ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Ok "Both servers are starting up!"
Write-Host ""
Ok "  App (Frontend):    http://localhost:5173"
Ok "  API (Backend):     http://localhost:8000"
Ok "  API Docs:          http://localhost:8000/docs"
Ok "  Health Check:      http://localhost:8000/health"
Write-Host ""
Write-Host "  Close the two terminal windows to stop the servers." -ForegroundColor DarkGray
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""

# Open the app in the default browser
Start-Process "http://localhost:5173"
