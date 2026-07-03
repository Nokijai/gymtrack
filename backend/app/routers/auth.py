import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.auth import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---- Brute-force protection (in-memory, per IP) ----------------------------
# Max 5 failed attempts per IP per 15 minutes
_FAIL_WINDOW_SECS = 15 * 60
_MAX_FAILS = 5

# {ip: [(timestamp, ...), ...]}
_failed_attempts: dict[str, list[float]] = defaultdict(list)


def _check_brute_force(ip: str) -> None:
    now = time.time()
    window_start = now - _FAIL_WINDOW_SECS
    # Prune old entries
    _failed_attempts[ip] = [t for t in _failed_attempts[ip] if t > window_start]
    if len(_failed_attempts[ip]) >= _MAX_FAILS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again in 15 minutes.",
        )


def _record_failure(ip: str) -> None:
    _failed_attempts[ip].append(time.time())


def _clear_failures(ip: str) -> None:
    _failed_attempts.pop(ip, None)


# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_brute_force(client_ip)

    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, str(user.hashed_password)):
        _record_failure(client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _clear_failures(client_ip)
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    new_user = User(username=req.username, hashed_password=hash_password(req.password), is_admin=False)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = create_access_token({"sub": str(new_user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
