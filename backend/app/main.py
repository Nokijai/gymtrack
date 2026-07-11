import os
import uuid
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import auth, sessions, dashboard, leaderboard, admin, profile
from app.routers import ai as ai_router
from app.routers import programs
from app import sse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Sensitive fields to redact from logs
SENSITIVE_FIELDS = [
    "authorization", "password", "token", "cookie",
    "session_id", "api_key", "secret", "credential"
]

def redact_sensitive_headers(headers: dict) -> dict:
    """Remove sensitive values from headers before logging"""
    return {
        k: "***REDACTED***" if k.lower() in SENSITIVE_FIELDS else v
        for k, v in headers.items()
    }

app = FastAPI(title="GymTrack API", version="1.0.0")


# ---- Request ID and logging middleware -------------------------------------------
@app.middleware("http")
async def add_request_id_and_log(request: Request, call_next):
    # Generate unique request ID
    request_id = str(uuid.uuid4())[:8]
    
    # Log request start
    start_time = time.time()
    logger.info(
        f"[{request_id}] Request started: {request.method} {request.url.path}"
    )
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    # Log request completion
    logger.info(
        f"[{request_id}] Request completed: {response.status_code} ({duration_ms:.1f}ms)"
    )
    
    return response


# ---- Security headers middleware -------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ---- CORS — production origin + localhost for local dev --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gymteam.worldofnoki.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(dashboard.router)
app.include_router(leaderboard.router)
app.include_router(sse.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(ai_router.router)
app.include_router(programs.router)


UPLOAD_ROOT = os.environ.get("UPLOAD_ROOT", "/app/uploads")


@app.on_event("startup")
def startup():
    init_db()
    # Ensure uploads directory exists (UPLOAD_ROOT overrides Docker path for local dev)
    os.makedirs(os.path.join(UPLOAD_ROOT, "avatars"), exist_ok=True)


# ---- Health check endpoints ------------------------------------------------
@app.get("/api/health")
def health():
    """Basic health check (liveness)"""
    return {"status": "ok"}


@app.get("/api/health/live")
def health_live():
    """Liveness probe - process is alive"""
    return {"status": "alive"}


@app.get("/api/health/ready")
def health_ready():
    """Readiness probe - database and dependencies are usable"""
    try:
        from app.database import engine
        from sqlalchemy import text
        
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "database": "connected",
            "version": os.environ.get("GIT_SHA", "unknown")[:8]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "not_ready",
            "error": str(e)
        }, 503


# ---- Serve uploaded avatars as static files --------------------------------
# Mount AFTER routes so /api/* endpoints take priority
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
