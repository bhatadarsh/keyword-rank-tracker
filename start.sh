#!/usr/bin/env bash
# ============================================================
#  start.sh — Start NexusRank (Backend + Frontend) for macOS & Linux
#  Usage: chmod +x start.sh && ./start.sh
# ============================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"
ROOT_ENV="$DIR/.env"
BACKEND_ENV="$BACKEND_DIR/.env"
ENV_EXAMPLE="$DIR/.env.example"

echo ""
echo "=========================================="
echo " ⚡ NexusRank - Dev Launcher (macOS / Linux)"
echo "=========================================="
echo ""

# 1. Check requirements
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH. Please install Python 3.11+."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Node.js / npm is not installed or not in PATH. Please install Node.js 18+."
    exit 1
fi

# 2. Setup .env files if missing
if [ ! -f "$ROOT_ENV" ] && [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ROOT_ENV"
    echo "✅ Created root .env from .env.example"
fi

if [ ! -f "$BACKEND_ENV" ] && [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$BACKEND_ENV"
    echo "✅ Created backend/.env from .env.example"
fi

# 3. Virtual Environment check / setup
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Initializing Python virtual environment in backend/venv..."
    python3 -m venv "$VENV_DIR"
    echo "📥 Installing backend dependencies..."
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
    echo "✅ Backend virtual environment ready!"
fi

# 4. Frontend node_modules check / setup
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "📦 Installing frontend dependencies via npm install..."
    (cd "$FRONTEND_DIR" && npm install)
    echo "✅ Frontend dependencies ready!"
fi

# 5. Trap cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down NexusRank servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "👋 Servers stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Start Backend
echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
(cd "$BACKEND_DIR" && "$VENV_DIR/bin/python" -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# 7. Start Frontend
echo "🚀 Starting Vite frontend on http://localhost:5173 ..."
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

sleep 2

echo ""
echo "=========================================="
echo " ⚡ NexusRank is running and live!"
echo "=========================================="
echo "  UI (Frontend):     http://localhost:5173"
echo "  API (Backend):     http://localhost:8000"
echo "  API Docs:          http://localhost:8000/docs"
echo "  Health Check:      http://localhost:8000/health"
echo "=========================================="
echo " Press Ctrl+C at any time to stop all services."
echo ""

wait
