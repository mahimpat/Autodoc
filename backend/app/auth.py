
import os
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in ("1","true","yes")
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")  # "none" for cross-site
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")  # optional

from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from .settings import settings
from .db import SessionLocal
from .models import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd_ctx.verify(p, h)

def create_token(user_id: int, expires_seconds: int | None = None) -> str:
    exp = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_seconds or settings.SESSION_MAX_AGE)
    payload = {"sub": str(user_id), "exp": exp}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return int(payload.get("sub"))
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def set_session_cookie(resp: Response, token: str):
    cookie_kwargs = {
        "key": settings.SESSION_COOKIE_NAME,
        "value": token,
        "max_age": settings.SESSION_MAX_AGE,
        "httponly": True,
        "samesite": COOKIE_SAMESITE,
        "secure": COOKIE_SECURE,  # set True when behind HTTPS
        "path": "/",
    }
    if COOKIE_DOMAIN:
        cookie_kwargs["domain"] = COOKIE_DOMAIN
    resp.set_cookie(**cookie_kwargs)

def clear_session_cookie(resp: Response):
    resp.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_token(token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
