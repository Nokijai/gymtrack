import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import auth, sessions, dashboard, leaderboard, admin, profile
from app import sse

app = FastAPI(title="GymTrack API", version="1.0.0")

# ---- Security headers middleware -------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ---- CORS — restrict to known frontend origin ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gymteam.worldofnoki.com"],
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


@app.on_event("startup")
def startup():
    init_db()
    # Ensure uploads directory exists
    os.makedirs("/app/uploads/avatars", exist_ok=True)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- Serve uploaded avatars as static files --------------------------------
# Mount AFTER routes so /api/* endpoints take priority
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")
