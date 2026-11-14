# ============================================================
#  start.ps1 — Start NexusRank (Backend + Frontend)
#  Usage: .\start.ps1
# ============================================================

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv     = Join-Path $Backend "venv\Scripts\python.exe"
$RootEnv  = Join-Path $Root ".env"
$BackendEnv = Join-Path $Backend ".env"
$EnvExample = Join-Path $Root ".env.example"

# -- Colour helpers ------------------------------------------
function Info  { param($m) Write-Host "  $m" -ForegroundColor Cyan }
function Ok    { param($m) Write-Host "  $m" -ForegroundColor Green }
function Warn  { param($m) Write-Host "  $m" -ForegroundColor Yellow }
function Err   { param($m) Write-Host "  $m" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host "   ⚡ NexusRank - Production Dev Launcher" -ForegroundColor White
Write-Host "  ==========================================" -ForegroundColor Blue
Write-Host ""

# -- Environment setup ---------------------------------------
if (-not (Test-Path $RootEnv) -and (Test-Path $EnvExample)) {
    Copy-Item $EnvExample $RootEnv
    Info "Created root .env from .env.example"
}
if (-not (Test-Path $BackendEnv) -and (Test-Path $EnvExample)) {
    Copy-Item $EnvExample $BackendEnv
    Info "Created backend/.env from .env.example"
}

# -- Port cleanup --------------------------------------------
Info "Checking for existing processes on ports 8000 and 5173..."
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            Warn "Port $port occupied by PID $pidToKill — stopping it..."
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}

# -- Virtual Environment check / auto-install ---------------
if (-not (Test-Path $Venv)) {
    Warn "Python virtual environment not found. Initializing backend/venv..."
    Push-Location $Backend
    python -m venv venv
    if (-not (Test-Path $Venv)) {
        Err "Failed to create Python virtual environment. Please verify Python 3.11+ is installed."
        Pop-Location
        exit 1
    }
    Info "Installing backend dependencies from requirements.txt..."
    & $Venv -m pip install --upgrade pip
    & $Venv -m pip install -r requirements.txt
    Pop-Location
    Ok "Backend virtual environment created successfully!"
}

# -- Node modules check / auto-install -----------------------
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Warn "node_modules not found in frontend. Running npm install..."
    Push-Location $Frontend
    npm install
    Pop-Location
    Ok "Frontend dependencies installed successfully!"
}

# -- Start Backend --------------------------------------------
Info "Starting FastAPI backend on http://localhost:8000 ..."
$backendJob = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", `
        "Set-Location '$Backend'; & '$Venv' -m uvicorn main:app --reload --port 8000" `
    -PassThru `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# -- Start Frontend -------------------------------------------
Info "Starting React frontend on http://localhost:5173 ..."
$frontendJob = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", `
        "Set-Location '$Frontend'; npm run dev" `
    -PassThru `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# -- Open Browser ---------------------------------------------
Start-Process "http://localhost:5173"

# -- Done -----------------------------------------------------
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Ok "  ⚡ NexusRank is running and live!"
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
Ok "  UI (Frontend):     http://localhost:5173"
Ok "  API (Backend):     http://localhost:8000"
Ok "  API Docs:          http://localhost:8000/docs"
Ok "  Health Check:      http://localhost:8000/health"
Write-Host ""
Write-Host "  Close the terminal windows or stop tasks to end services." -ForegroundColor DarkGray
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
