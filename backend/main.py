import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env FIRST before anything else imports os.getenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, config_router
from database import engine, Base, ensure_schema_columns, reconcile_orphan_jobs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Single instance owns background jobs. Never run recovery on import.
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    reconcile_orphan_jobs()
    os.makedirs(os.getenv("EXPORT_DIR", os.path.join(os.getcwd(), "exports", "files")), exist_ok=True)
    yield

app = FastAPI(
    lifespan=lifespan,
    title="NexusRank — Zero-Cost SEO & SERP Intelligence Platform",
    description="Flagship open-source SEO suite with multi-engine SERP tracking, rank delta history, visibility scoring, and cannibalization detection.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for development and production web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost"
    ).split(",") if origin.strip() and origin.strip() != "*"],
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
