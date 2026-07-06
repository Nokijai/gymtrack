# GymTrack — Complete Security, Performance & Resource Audit

**Repo**: `/home/noki/gymtrack`  
**Stack**: FastAPI (Python 3.11) + SQLite + SQLAlchemy + Next.js 14 + Docker  
**Audited**: 2026-07-06

---

## 🔴 CRITICAL

### C1. Hardcoded seed credentials in source code [SECURITY]
**File**: `backend/app/database.py` — lines 613–617  
**Problem**: Three user accounts are seeded with plaintext passwords hardcoded in source:
- `"dennis"` / `"dennis123"`
- `"cyrus"` / `"cyrus123"`
- `"noki"` / `"noki123"` (admin)

The code has a large comment warning about this, but the passwords remain in the repository. Anyone with source access (or who reads the deployed container image layers) knows the passwords. The backup mechanism writes bcrypt hashes to disk, but the plaintext is still in git history and the running image.

**Fix**: Remove plaintext passwords from source. Use environment variables or a secrets manager for bootstrap credentials. Force password change on first login. Delete the `.credentials_backup` file mechanism — it defeats the purpose of hashing.

```python
# Instead of hardcoded tuples, read from env:
import os
ADMIN_PASSWORD = os.environ.get("ADMIN_SEED_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_SEED_PASSWORD must be set for initial seed")
```

---

### C2. JWT token passed in URL query parameter (SSE) [SECURITY]
**File**: `backend/app/sse.py` — lines 17–21  
**File**: `frontend/hooks/useSSE.ts` — line 13  
**Problem**: The SSE endpoint accepts the JWT token as a query parameter (`/api/events?token=xxx`). JWT tokens in URLs are:
- Logged in server access logs (nginx, Docker, etc.)
- Leaked via `Referer` header
- Visible in browser history
- Visible in the URL bar

**Fix**: Use a short-lived, single-use ticket exchange pattern: generate a nonce, store it server-side, pass the nonce in the URL, and validate it on connection. Alternatively, use WebSocket with `Authorization` header (or a dedicated ws:// connection with token in the initial handshake).

```python
# SSE: Use a temporary ticket instead of raw JWT
import secrets
_sse_tickets: dict[str, int] = {}  # ticket -> user_id, 60s TTL

@router.get("/api/events")
async def sse_stream(ticket: str = Query(...)):
    user_id = _sse_tickets.pop(ticket, None)
    if not user_id:
        raise HTTPException(401)
    ...
```

---

### C3. Containers run as root [SECURITY]
**File**: `backend/Dockerfile` — line 1  
**File**: `frontend/Dockerfile` — line 1  
**Problem**: Both Dockerfiles run as root with no `USER` directive. If an attacker achieves RCE (e.g., through a dependency vulnerability), they have full root access to the container. The bind-mounted database directory (`/home/noki/gymtrack-data`) is also writable by root.

**Fix**: Add a non-root user in both Dockerfiles:

```dockerfile
# Backend Dockerfile
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --gid 1001 app
RUN chown -R app:app /app/data /app/uploads
USER app
```

---

### C4. N+1 queries on leaderboard endpoint [PERFORMANCE]
**File**: `backend/app/routers/leaderboard.py` — lines 22–39  
**Problem**: `build_leaderboard()` calls `db.query(User).all()`, then for **every user** in the loop (line 23), it executes a separate query: `db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).all()`. With 100 users, this is **1 + 100 queries**. Also queries all users without pagination.

**Fix**: Use a single query with a join + aggregation:

```python
from sqlalchemy import func
stats = (
    db.query(
        User.id,
        User.username,
        User.xp,
        User.level,
        User.current_streak,
        User.longest_streak,
        User.avatar_url,
        func.count(WorkoutSession.id).label("total_sessions"),
        func.sum(
            case((WorkoutSession.date >= week_start, 1), else_=0)
        ).label("weekly_sessions"),
    )
    .outerjoin(WorkoutSession, WorkoutSession.user_id == User.id)
    .group_by(User.id)
    .order_by(User.xp.desc())
    .all()
)
```

---

### C5. Missing database indexes on all foreign keys [PERFORMANCE]
**File**: `backend/app/database.py` — lines 28–129  
**Problem**: None of the following frequently-queried columns have indexes:
- `sessions.user_id` (queried in every endpoint)
- `sessions.date` (ordering + filtering)
- `exercises.session_id` (queried for every session detail)
- `exercise_sets.exercise_id` (N+1 hot path)
- `badges.user_id`
- `readiness_logs.user_id`
- `readiness_logs.logged_at`

**Fix**: Add explicit indexes on all foreign keys and frequently-filtered columns:

```python
class WorkoutSession(Base):
    __tablename__ = "sessions"
    ...
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)

class Exercise(Base):
    __tablename__ = "exercises"
    ...
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
```

---

## 🟠 HIGH

### H1. N+1 queries in `recalculate_xp` [PERFORMANCE]
**File**: `backend/app/database.py` — lines 317, 327  
**Problem**: `recalculate_xp()` loads all sessions for a user, then for each session (line 327) issues a separate query: `db.query(Exercise).filter(Exercise.session_id == s.id).all()`. Then it accesses `e.set_list` which triggers yet another lazy load per exercise. This 3-level N+1 is called on every session create/update/delete.

**Fix**: Use eager loading:

```python
from sqlalchemy.orm import joinedload
all_sessions = (
    db.query(WorkoutSession)
    .options(joinedload(WorkoutSession.exercises).joinedload(Exercise.set_list))
    .filter(WorkoutSession.user_id == user.id)
    .order_by(WorkoutSession.date.asc())
    .all()
)
```

---

### H2. N+1 queries in dashboard stats endpoint [PERFORMANCE]
**File**: `backend/app/routers/dashboard.py` — lines 38–50  
**Problem**: For each of the 5 recent sessions, a separate query is issued: `db.query(Exercise).filter(Exercise.session_id == s.id).all()`. Same pattern on line 39.

**Fix**: Join eagerly:

```python
recent = (
    db.query(WorkoutSession)
    .options(joinedload(WorkoutSession.exercises))
    .filter(WorkoutSession.user_id == current_user.id)
    .order_by(WorkoutSession.date.desc())
    .limit(5)
    .all()
)
```

---

### H3. N+1 queries in admin session listing [PERFORMANCE]
**File**: `backend/app/routers/admin.py` — lines 131–144, 164–177  
**Problem**: Both `admin_list_sessions` and `admin_list_user_sessions` iterate over sessions and query Exercise separately. Duplicated code.

**Fix**: Same eager loading fix, and deduplicate the two routes.

---

### H4. No pagination on leaderboard [PERFORMANCE]
**File**: `backend/app/routers/leaderboard.py` — line 14  
**Problem**: `db.query(User).all()` loads every user in the system. No skip/limit. As the user base grows, this endpoint will become progressively slower and consume more memory.

**Fix**: Add pagination:

```python
@router.get("")
def leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    ...
```

---

### H5. No rate limiting on registration endpoint [SECURITY]
**File**: `backend/app/routers/auth.py` — lines 60–73  
**Problem**: The `/api/auth/register` endpoint has no rate limiting. An attacker can create thousands of accounts or enumerate existing usernames (409 response reveals if a username exists).

**Fix**: Add rate limiting to registration, distinct from login:

```python
@router.post("/register", ...)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_brute_force(client_ip, endpoint="register")  # stricter limits
    ...
```

---

### H6. No Content-Security-Policy header [SECURITY]
**File**: `backend/app/main.py` — lines 13–20  
**Problem**: The security middleware sets `X-Content-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection`, but **not** `Content-Security-Policy` — the single most important modern security header for preventing XSS.

**Fix**: Add CSP header:

```python
response.headers["Content-Security-Policy"] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "connect-src 'self'"
)
```

---

### H7. JWT token expiry is 24 hours [SECURITY]
**File**: `backend/app/auth.py` — line 22  
**Problem**: `EXPIRE_MINUTES = 60 * 24` = 24 hours. A stolen JWT token gives full access for a full day. Industry standard is 15–30 minutes with refresh tokens.

**Fix**: Implement refresh token rotation:

```python
ACCESS_TOKEN_EXPIRE = 15  # minutes
REFRESH_TOKEN_EXPIRE = 7  # days

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    to_encode["type"] = "access"
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE)
    to_encode["type"] = "refresh"
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
```

---

### H8. No memory/CPU limits in docker-compose [RESOURCE]
**File**: `docker-compose.yml` — lines 1–26  
**Problem**: Neither service has `mem_limit` or `deploy.resources.limits`. A memory leak in the AI coach (which calls external API) or an SSE connection flood could consume all host memory.

**Fix**:
```yaml
services:
  backend:
    ...
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
  frontend:
    ...
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

---

### H9. Unbounded SSE client list [RESOURCE]
**File**: `backend/app/sse.py` — line 8  
**Problem**: `_clients: list[asyncio.Queue] = []` is a global in-memory list with no limit. Each connection holds an open HTTP connection and an `asyncio.Queue`. An attacker could open thousands of connections to exhaust server resources.

**Fix**: Add a maximum client limit:

```python
MAX_SSE_CLIENTS = 100

@router.get("/api/events")
async def sse_stream(token: str = Query(...)):
    if len(_clients) >= MAX_SSE_CLIENTS:
        raise HTTPException(status_code=429, detail="Too many connections")
    ...
```

---

### H10. Unbounded WebSocket connections [RESOURCE]
**File**: `backend/app/websocket.py` — line 9  
**Problem**: Same issue as SSE — no limit on concurrent WebSocket connections.

**Fix**: Add a client limit in `ConnectionManager.connect()`.

---

### H11. No log rotation configuration [RESOURCE]
**File**: `docker-compose.yml` — no logging config  
**Problem**: Docker's default json-file logging driver keeps logs forever with no size limit. On a production server, verbose logs can fill the disk.

**Fix**:
```yaml
services:
  backend:
    ...
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
  frontend:
    ...
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

---

### H12. No .dockerignore files [SECURITY / RESOURCE]
**File**: Missing from both `backend/` and `frontend/`  
**Problem**: Without `.dockerignore`, the Docker build context includes everything in the directory — `__pycache__`, `.env` (if present), `.git`, `node_modules`, `*.pyc` files. This increases build time, image size, and risks leaking secrets.

**Fix**: Create `.dockerignore` in both `backend/` and `frontend/`:

```dockerignore
__pycache__/
*.pyc
.env
.git
.gitignore
*.md
```

---

### H13. No password strength validation [SECURITY]
**File**: `backend/app/routers/auth.py` — lines 60–73  
**File**: `backend/app/routers/admin.py` — lines 83–95  
**Problem**: Registration accepts any password (including empty or single-character). Admin password change endpoint (`PUT /api/admin/users/{id}/password`) also has no validation.

**Fix**: Add Pydantic validation:

```python
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8)

class ChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)
```

---

### H14. Deployment script echoes secret to stdout [SECURITY]
**File**: `.github/workflows/deploy.yml` — line 51  
**Problem**: `echo ${{ secrets.GHCR_TOKEN }}` prints the GHCR token to the build log. While GitHub Actions masks secrets, the echo command is still a bad practice — the secret is expanded in the shell before echo runs.

**Fix**: Remove the echo entirely:

```yaml
# Instead of:
echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u nokijai --password-stdin
# Use:
docker login ghcr.io -u nokijai -p ${{ secrets.GHCR_TOKEN }}
```

---

## 🟡 MEDIUM

### M1. No pagination on admin session list [PERFORMANCE]
**File**: `backend/app/routers/admin.py` — lines 116–145, 148–178  
**Problem**: Both admin session listing endpoints return ALL sessions for a user with no skip/limit. A user with 1000+ sessions causes a large response.

**Fix**: Add `skip` and `limit` query parameters.

---

### M2. `recalculate_xp` called on every session mutation [PERFORMANCE]
**File**: `backend/app/routers/sessions.py` — lines 139–140, 224–225, 257–258  
**Problem**: Every session create/update/delete triggers `recalculate_xp()` which scans ALL sessions for that user. This is O(n) in the number of sessions. For frequent operations (auto-save drafts), this is wasteful.

**Fix**: Use incremental XP updates instead of full recalculation:

```python
# Instead of full recalc, add/subtract the current session's XP
session_xp = calculate_session_xp(...)
user.xp += session_xp  # or -= for delete
```

---

### M3. Leaderboard reloads data on every request [PERFORMANCE]
**File**: `backend/app/routers/leaderboard.py` — lines 12–42  
**Problem**: `build_leaderboard()` is called synchronously on every request, recalculating weekly/monthly stats for every user. This data could be cached for 30–60 seconds.

**Fix**: Add a simple in-memory cache:

```python
from functools import lru_cache
from datetime import timedelta

_cache: dict = {}
_cache_time: float = 0

def build_leaderboard(db):
    if time.time() - _cache_time < 30:
        return _cache
    # ... build ...
    _cache = result
    _cache_time = time.time()
    return result
```

---

### M4. No `Cache-Control` on static file serving [PERFORMANCE]
**File**: `backend/app/main.py` — line 56  
**Problem**: Static files mounted at `/uploads` are served without any caching headers. Avatar images are re-fetched on every page load.

**Fix**: Configure cache headers on the static files mount or add a middleware that sets Cache-Control for `/uploads/` paths.

---

### M5. No avatar image optimization [PERFORMANCE / RESOURCE]
**File**: `backend/app/routers/profile.py` — lines 75–123  
**Problem**: Avatar uploads are saved and served at full resolution. A 2MB 4000×3000px image is served as-is. No resizing, no compression, no WebP conversion.

**Fix**: Resize avatars to a max dimension (e.g., 256×256px) and convert to WebP on upload:

```python
from PIL import Image
img = Image.open(io.BytesIO(data))
img.thumbnail((256, 256))
img.save(filepath, "WEBP", quality=85)
```

---

### M6. No HSTS header [SECURITY]
**File**: `backend/app/main.py` — lines 13–20  
**Problem**: No `Strict-Transport-Security` header. Users could be downgraded to HTTP if they type the URL without https://.

**Fix**:
```python
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

---

### M7. No `Referrer-Policy` header [SECURITY]
**File**: `backend/app/main.py` — lines 13–20  
**Problem**: No referrer policy means the full URL (including query params) may be leaked via the Referer header on external links.

**Fix**:
```python
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
```

---

### M8. CORS origin is hardcoded [SECURITY / DEV UX]
**File**: `backend/app/main.py` — line 26  
**Problem**: `allow_origins=["https://gymteam.worldofnoki.com"]` makes local development impossible without a CORS workaround. During development, the frontend runs on `localhost:3000`.

**Fix**: Allow multiple origins based on environment:

```python
import os
origins = os.environ.get("CORS_ORIGINS", "https://gymteam.worldofnoki.com").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, ...)
```

---

### M9. No `Permissions-Policy` header [SECURITY]
**File**: `backend/app/main.py` — lines 13–20  
**Problem**: No permissions policy to restrict browser features (camera, microphone, geolocation, etc.).

**Fix**:
```python
response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
```

---

### M10. Unpinned dependency version [SECURITY]
**File**: `backend/requirements.txt` — line 9  
**Problem**: `openai>=1.0.0` is unpinned (uses `>=`). Automatic minor/patch upgrades could introduce breaking changes or vulnerabilities.

**Fix**: Pin to a specific version:
```
openai==1.55.0
```

---

### M11. SQLite database file unbounded growth [RESOURCE]
**File**: `backend/app/database.py` — line 8  
**Problem**: `DB_PATH = "/app/data/gymtrack.db"` — the SQLite database grows indefinitely. No VACUUM strategy, no archival of old data, no size monitoring. WAL mode helps but doesn't prevent unbounded growth.

**Fix**: Add periodic VACUUM or auto_vacuum:

```python
# In init_db():
with engine.connect() as conn:
    conn.execute(text("PRAGMA auto_vacuum = INCREMENTAL"))
    conn.execute(text("PRAGMA incremental_vacuum(100)"))
```

---

## 🔵 LOW

### L1. No health checks in docker-compose [RESOURCE]
**File**: `docker-compose.yml` — no healthcheck for either service  
**Problem**: Docker won't automatically detect or restart unhealthy containers. The frontend depends on backend but doesn't wait for it to be healthy.

**Fix**:
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### L2. No environment file template [SECURITY / DEV UX]
**Problem**: No `.env.example` file. Developers must guess which environment variables are needed. The `JWT_SECRET_KEY` and `AI_API_KEY` are documented only in code.

**Fix**: Create `.env.example`:
```
JWT_SECRET_KEY=change-this-to-a-random-secret
AI_API_KEY=your-openai-api-key
CORS_ORIGINS=http://localhost:3000,https://gymteam.worldofnoki.com
DB_PATH=/app/data/gymtrack.db
```

---

### L3. `get_session` endpoint has N+1 pattern [PERFORMANCE]
**File**: `backend/app/routers/sessions.py` — lines 36–85  
**Problem**: Line 43 queries exercises separately after the session query. Also accesses `e.set_list` lazily.

**Fix**: Use `joinedload` in the initial session query.

---

### L4. No frontend bundle analysis [PERFORMANCE]
**File**: `frontend/package.json`  
**Problem**: No `@next/bundle-analyzer` or similar tool configured. The bundle includes `recharts` (~500KB+), `lucide-react` (~200KB), and `react-router-dom` (~40KB) — some of which may not be fully tree-shaken.

**Fix**: Add `@next/bundle-analyzer` and audit bundle size:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

---

### L5. No `next/image` optimization for avatars [PERFORMANCE]
**File**: `frontend` — components  
**Problem**: Avatar images are loaded via `<img>` tags with no optimization — no lazy loading, no size optimization, no WebP conversion.

**Fix**: Use `next/image` component with proper sizing and lazy loading.

---

### L6. Predictable avatar filenames [INFO]
**File**: `backend/app/routers/profile.py` — line 107  
**Problem**: `filename = f"{current_user.id}.{ext}"` — predictable, user-id-based filenames. Not a security issue but allows user enumeration via ID.

**Fix**: Add a random component to the filename.

---

### L7. `check_and_unlock_badges` loads all sessions [PERFORMANCE]
**File**: `backend/app/database.py` — line 351  
**Problem**: Loads ALL sessions and ALL exercises to calculate volume. Called on every session create/update. Could be optimized with aggregate queries.

**Fix**: Use SQL `SUM` aggregation instead of Python iteration.

---

### L8. `recalculate_streak` loads all sessions [PERFORMANCE]
**File**: `backend/app/database.py` — lines 385–390  
**Problem**: Same as L7 — loads all sessions. Could use SQL window functions.

**Fix**: Limit to last 365 days and use SQL aggregation.

---

## 📊 Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| 🔴 CRITICAL | 5 | Hardcoded passwords, JWT in URL, root containers, N+1 leaderboard, missing indexes |
| 🟠 HIGH | 14 | N+1 in 4 more places, no pagination, no rate limiting, no CSP, long JWT expiry, no resource limits, unbounded SSE/WS, no log rotation, missing .dockerignore, weak passwords, secret in CI log |
| 🟡 MEDIUM | 11 | No pagination on admin, expensive recalc, no cache, no image optimization, missing security headers, unpinned dependency, SQLite growth |
| 🔵 LOW | 8 | No health checks, no .env.example, more N+1 patterns, no bundle analysis, predictable filenames |

**Total: 38 issues found**

### Top 3 Immediate Actions
1. **Remove hardcoded passwords** from `database.py` (C1) — worst security risk
2. **Fix SSE JWT-in-URL** pattern (C2) — prevents token leakage
3. **Add database indexes** on all foreign keys (C5) — biggest performance win