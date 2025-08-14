from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session
from ..auth import hash_password, verify_password, create_token, set_session_cookie, clear_session_cookie, get_db, get_current_user
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterIn(BaseModel):
    email: EmailStr
    password: constr(min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(data: RegisterIn, resp: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email.lower(), password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    token = create_token(user.id)
    set_session_cookie(resp, token)
    return {"ok": True, "user": {"id": user.id, "email": user.email}}

@router.post("/login")
def login(data: LoginIn, resp: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id)
    set_session_cookie(resp, token)
    return {"ok": True, "user": {"id": user.id, "email": user.email}}

@router.post("/logout")
def logout(resp: Response):
    clear_session_cookie(resp)
    return {"ok": True}

@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email}
