import bcrypt
import time
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError("本番環境では、SECRET_KEY 環境変数の設定が必須です")
    import warnings
    SECRET_KEY = "dev-only-secret-key-not-for-production"
    warnings.warn("SECRET_KEY が未設定です。開発用のデフォルト値を使用します。")

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
    except JWTError:
        return None

# --- 共通の認証チェック（各ルーターで使う） ---

def get_current_user(request: Request, response: Response, db: Session = Depends(get_db)):
    """Cookieからトークンを検証して、ログイン中のユーザーを返す。無効なら401エラー。"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="ログインが必要です")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="無効なトークンです")

    # トークンの残り時間が2時間以下なら、新しいトークンでCookieを上書き
    exp = payload.get("exp", 0)
    remaining = exp - time.time()
    if remaining < 2 * 3600:
        new_token = create_access_token({"sub": payload["sub"]})
        is_production = os.getenv("ENVIRONMENT") == "production"
        response.set_cookie(
            key="access_token",
            value=new_token,
            httponly=True,
            samesite="lax",
            secure=is_production,
            max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        )

    from models.user import User  # 循環インポート回避のためここでインポート
    user = db.execute(
        select(User).where(User.email == payload["sub"])
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="アカウントが無効化されています")

    return user

def require_admin(request: Request, response: Response, db: Session = Depends(get_db)):
    """管理者のみ許可。スタッフなら403エラー。"""
    user = get_current_user(request, response, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return user