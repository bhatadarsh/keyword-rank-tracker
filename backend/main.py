import os
from dotenv import load_dotenv

# Load .env FIRST before anything else imports os.getenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from database import engine, Base

# Ensure all tables are created on startup
Base.metadata.create_all(bind=engine)

# Ensure export file directory exists
os.makedirs(os.path.join(os.getcwd(), "exports", "files"), exist_ok=True)

app = FastAPI(
    title="Keyword Rank Tracker API",
    description="API for tracking Google organic keyword rankings.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "provider": os.getenv("SERP_PROVIDER", "mock")}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
