import bcrypt
from datetime import datetime, timedelta
from jose import jwt
import os

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        return None

# --- 共通の認証チェック（各ルーターで使う） ---

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Cookieからトークンを検証して、ログイン中のユーザーを返す。無効なら401エラー。"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="ログインが必要です")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="無効なトークンです")

    from models.user import User  # 循環インポート回避のためここでインポート
    user = db.execute(
        select(User).where(User.email == payload["sub"])
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")

    return user

def require_admin(request: Request, db: Session = Depends(get_db)):
    """管理者のみ許可。スタッフなら403エラー。"""
    user = get_current_user(request, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return user