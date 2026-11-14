import os
from dotenv import load_dotenv

# Load .env FIRST before anything else imports os.getenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, config_router
from database import engine, Base, ensure_schema_columns, reconcile_orphan_jobs

# 1. Ensure all core tables are created
Base.metadata.create_all(bind=engine)

# 2. Seamless auto-migration: dynamically add any new columns to existing SQLite/Postgres DBs
ensure_schema_columns()

# 3. Crash recovery: Reconcile any orphan/stuck jobs from previous server crash
reconcile_orphan_jobs()

# 4. Ensure export file directory exists
os.makedirs(os.path.join(os.getcwd(), "exports", "files"), exist_ok=True)

app = FastAPI(
    title="NexusRank — Zero-Cost SEO & SERP Intelligence Platform",
    description="Flagship open-source SEO suite with multi-engine SERP tracking, rank delta history, visibility scoring, and cannibalization detection.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for development and production web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:80",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config_router)
app.include_router(router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "platform": "NexusRank",
        "version": "2.0.0",
        "default_provider": os.getenv("SERP_PROVIDER", "free"),
        "open_source": True,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
